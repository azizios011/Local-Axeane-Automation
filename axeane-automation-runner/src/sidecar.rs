//! Python backend sidecar lifecycle.
//!
//! The PyInstaller-bundled `python-backend(.exe)` is launched as a child
//! process of the Tauri host. We support two spawn paths:
//!
//!   1. **Tauri's resource path** (`app.shell().sidecar(...)`) — used in
//!      production MSI/NSIS bundles where Tauri has staged the sidecar
//!      into the installer payload.
//!   2. **Direct `std::process::Command`** with the absolute path —
//!      used in dev / `cargo tauri build --no-bundle` mode where the
//!      sidecar sits next to the host executable but Tauri's resource
//!      resolver has not been populated.
//!
//! We then:
//!   * Stream `stdout` lines through `tracing::info!`.
//!   * Stream `stderr` lines through `tracing::warn!`.
//!   * Persist the child PID to `backend_pid_path` so a stale instance
//!     from a previous run can be cleaned up on startup.
//!   * Kill the child on `WindowEvent::CloseRequested` to guarantee
//!     no orphan service is left running.

use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::OnceLock;

use parking_lot::Mutex;
use serde::Serialize;
use tauri::async_runtime::{self, JoinHandle};
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tracing::{error, info, warn};

use crate::config::AppConfig;
use crate::error::{AppError, Result};

/// Name of the external binary in `tauri.conf.json` → `bundle.externalBin`.
pub const SIDECAR_NAME: &str = "binaries/python-backend";

/// Globally-registered handle to the running sidecar so we can kill it
/// from event hooks (e.g. `WindowEvent::CloseRequested`).
static SIDECAR: OnceLock<Mutex<Option<SidecarHandle>>> = OnceLock::new();

/// A running sidecar process. We abstract over the two spawn paths
/// (Tauri-managed vs direct Command) so the rest of the code can be
/// agnostic to how the child was launched.
pub struct SidecarHandle {
    /// Handle to a Tauri-managed child (path #1).
    tauri_child: Option<tauri_plugin_shell::process::CommandChild>,
    /// Direct child (path #2).
    direct_child: Option<std::process::Child>,
    pub reader: Option<JoinHandle<()>>,
}

impl Default for SidecarHandle {
    fn default() -> Self {
        Self {
            tauri_child: None,
            direct_child: None,
            reader: None,
        }
    }
}

impl SidecarHandle {
    pub fn global() -> &'static Mutex<Option<SidecarHandle>> {
        SIDECAR.get_or_init(|| Mutex::new(None))
    }
}

/// Payload emitted on the `sidecar://log` event for the front-end.
#[derive(Debug, Clone, Serialize)]
pub struct LogLine {
    pub stream: &'static str,
    pub line: String,
}

/// Spawn the Python sidecar and wait until the FastAPI `/health`
/// endpoint responds OK (or the configured timeout elapses).
pub fn spawn_and_wait(app: &AppHandle, config: &AppConfig) -> Result<()> {
    // Kill any previous instance whose PID file we still have on disk.
    cleanup_stale_pid(&config.backend_pid_path);

    info!(
        "Spawning Python sidecar: {} --host 127.0.0.1 --port {}",
        SIDECAR_NAME, config.backend_port
    );

    // -------- Path 1: try Tauri's resource resolver first --------
    let tauri_attempt = spawn_via_tauri(app, config);

    // -------- Path 2: if that fails, fall back to direct Command --------
    let (rx, child_pid, tauri_child, direct_child) = match tauri_attempt {
        Ok(ok) => ok,
        Err(e) => {
            warn!(
                "Tauri shell.sidecar() failed ({}), falling back to direct Command",
                e
            );
            spawn_via_command(config)?
        }
    };

    info!("Python sidecar started (pid: {})", child_pid);

    // Persist PID for orphan cleanup on next launch.
    if let Some(parent) = config.backend_pid_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(&config.backend_pid_path, child_pid.to_string());

    // Fan out the stdout/stderr event stream into the tracing pipeline.
    let reader = async_runtime::spawn(stream_logs(app.clone(), rx));

    *SidecarHandle::global().lock() = Some(SidecarHandle {
        tauri_child,
        direct_child,
        reader: Some(reader),
    });

    // Block (within the Tauri setup hook, which runs on a worker
    // thread) until the FastAPI health probe succeeds.
    wait_for_health(&config.health_url(), config.health_timeout_secs)?;

    info!("Python sidecar is healthy and serving on {}", config.backend_url());
    Ok(())
}

/// Spawn via `tauri-plugin-shell` and obtain an event receiver.
fn spawn_via_tauri(
    app: &AppHandle,
    config: &AppConfig,
) -> Result<(
    tauri::async_runtime::Receiver<CommandEvent>,
    u32,
    Option<tauri_plugin_shell::process::CommandChild>,
    Option<std::process::Child>,
)> {
    let shell = app.shell();
    let cmd = shell
        .sidecar(SIDECAR_NAME)
        .map_err(|e| AppError::Sidecar(format!("sidecar command not found: {e}")))?
        .args([
            "--host",
            "127.0.0.1",
            "--port",
            &config.backend_port.to_string(),
        ]);
    let (rx, child) = cmd
        .spawn()
        .map_err(|e| AppError::Sidecar(format!("failed to spawn sidecar: {e}")))?;
    let pid = child.pid();
    Ok((rx, pid, Some(child), None))
}

/// Spawn via a plain `std::process::Command` against the absolute
/// path of the sidecar. Stdout/stderr are read on dedicated OS
/// threads and bridged into the async `CommandEvent` stream.
fn spawn_via_command(
    config: &AppConfig,
) -> Result<(
    tauri::async_runtime::Receiver<CommandEvent>,
    u32,
    Option<tauri_plugin_shell::process::CommandChild>,
    Option<std::process::Child>,
)> {
    let path = resolve_sidecar_path(config).ok_or_else(|| {
        AppError::Sidecar("No sidecar binary found. Run tools/build_python_sidecar.ps1".into())
    })?;

    info!("Launching sidecar directly: {}", path.display());

    let mut child = std::process::Command::new(&path)
        .args([
            "--host",
            "127.0.0.1",
            "--port",
            &config.backend_port.to_string(),
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null())
        .spawn()
        .map_err(|e| AppError::Sidecar(format!("Command::new failed: {e}")))?;

    let pid = child.id();

    // Bridge: read stdout/stderr synchronously on dedicated threads
    // and forward each line as a `CommandEvent` into the async channel.
    let (tx, rx) = tauri::async_runtime::channel::<CommandEvent>(64);

    if let Some(stdout) = child.stdout.take() {
        let tx = tx.clone();
        std::thread::Builder::new()
            .name("axeane-sidecar-stdout".into())
            .spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines().filter_map(|l| l.ok()) {
                    // Best-effort: if the channel is closed, the
                    // receiver has been dropped, so we exit.
                    if tx
                        .blocking_send(CommandEvent::Stdout(line.into_bytes()))
                        .is_err()
                    {
                        break;
                    }
                }
            })
            .map_err(|e| AppError::Sidecar(format!("thread spawn failed: {e}")))?;
    }

    if let Some(stderr) = child.stderr.take() {
        let tx = tx.clone();
        std::thread::Builder::new()
            .name("axeane-sidecar-stderr".into())
            .spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines().filter_map(|l| l.ok()) {
                    if tx
                        .blocking_send(CommandEvent::Stderr(line.into_bytes()))
                        .is_err()
                    {
                        break;
                    }
                }
            })
            .map_err(|e| AppError::Sidecar(format!("thread spawn failed: {e}")))?;
    }

    Ok((rx, pid, None, Some(child)))
}

/// Locate the sidecar binary on disk. We look in every plausible
/// location and return the first one that exists.
fn resolve_sidecar_path(config: &AppConfig) -> Option<PathBuf> {
    let install = &config.install_dir;
    let install_parent = install.parent();

    let mut candidates: Vec<PathBuf> = Vec::new();

    // 1) install_dir/binaries/python-backend.exe (bundled, no triple)
    candidates.push(install.join("binaries").join("python-backend.exe"));
    candidates.push(install.join("binaries").join("python-backend"));

    // 2) install_dir/binaries/python-backend-<triple>.exe (bundled with triple)
    if let Some(dir) = config.find_binaries_dir() {
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for e in entries.flatten() {
                let name = e.file_name().to_string_lossy().into_owned();
                if name.starts_with("python-backend") {
                    candidates.push(e.path());
                }
            }
        }
    }

    // 3) install_dir/python-backend.exe (next to the .exe)
    candidates.push(install.join("python-backend.exe"));
    candidates.push(install.join("python-backend"));

    // 4) parent/binaries/ (dev mode)
    if let Some(p) = install_parent {
        candidates.push(p.join("binaries").join("python-backend.exe"));
        candidates.push(p.join("binaries").join("python-backend"));
    }

    for c in candidates {
        if c.exists() {
            return Some(c);
        }
    }
    None
}

/// Drain the sidecar's event stream into the tracing pipeline.
async fn stream_logs(app: AppHandle, mut rx: tauri::async_runtime::Receiver<CommandEvent>) {
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes).trim_end().to_string();
                if !line.is_empty() {
                    info!(target: "sidecar.stdout", "{}", line);
                    let _ = app.emit(
                        "sidecar://log",
                        LogLine {
                            stream: "stdout",
                            line: line.clone(),
                        },
                    );
                }
            }
            CommandEvent::Stderr(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes).trim_end().to_string();
                if !line.is_empty() {
                    warn!(target: "sidecar.stderr", "{}", line);
                    let _ = app.emit(
                        "sidecar://log",
                        LogLine {
                            stream: "stderr",
                            line,
                        },
                    );
                }
            }
            CommandEvent::Error(err) => {
                error!(target: "sidecar", "process error: {}", err);
            }
            CommandEvent::Terminated(payload) => {
                info!(
                    target: "sidecar",
                    "process terminated (code={:?}, signal={:?})",
                    payload.code, payload.signal
                );
                if let Some(slot) = SIDECAR.get() {
                    if let Some(handle) = slot.lock().as_mut() {
                        handle.tauri_child = None;
                        handle.direct_child = None;
                    }
                }
                break;
            }
            _ => {}
        }
    }
}

/// Poll the FastAPI health endpoint until it returns 200 OK.
fn wait_for_health(health_url: &str, timeout_secs: u64) -> Result<()> {
    use std::time::{Duration, Instant};

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(AppError::from)?;

    let deadline = Instant::now() + Duration::from_secs(timeout_secs);
    let mut attempt = 0u32;
    info!("Waiting for Python sidecar at {} ...", health_url);

    while Instant::now() < deadline {
        attempt += 1;
        match client.get(health_url).send() {
            Ok(resp) if resp.status().is_success() => {
                info!("Sidecar is ready after {} attempt(s)", attempt);
                return Ok(());
            }
            Ok(resp) => warn!("Health check {}: HTTP {}", attempt, resp.status()),
            Err(e) => warn!("Health check {}: {}", attempt, e),
        }
        std::thread::sleep(Duration::from_millis(800));
    }
    Err(AppError::BackendHealthTimeout(timeout_secs))
}

/// Terminate the Python sidecar (best-effort, idempotent).
pub fn terminate(config: &AppConfig) {
    let Some(slot) = SIDECAR.get() else { return };
    let mut guard = slot.lock();

    let Some(handle) = guard.as_mut() else {
        info!("terminate() called but sidecar is already gone");
        return;
    };

    if let Some(child) = handle.tauri_child.take() {
        info!("Terminating Tauri-managed sidecar (pid: {})", child.pid());
        let _ = child.kill();
    }
    if let Some(mut child) = handle.direct_child.take() {
        let pid = child.id();
        info!("Terminating direct-Command sidecar (pid: {})", pid);
        let _ = child.kill();
        let _ = child.wait();
    }
    if handle.tauri_child.is_none() && handle.direct_child.is_none() {
        info!("terminate() called but sidecar is already gone");
    }

    if let Some(reader) = handle.reader.take() {
        reader.abort();
    }

    drop(guard);

    let _ = std::fs::remove_file(&config.backend_pid_path);
}

/// Read a leftover PID file from a previous (unclean) run and try to
/// kill that process. Best-effort.
fn cleanup_stale_pid(path: &Path) {
    let Ok(s) = std::fs::read_to_string(path) else {
        return;
    };
    let Ok(pid) = s.trim().parse::<u32>() else {
        let _ = std::fs::remove_file(path);
        return;
    };
    info!("Found stale sidecar pid file ({}), cleaning up", pid);
    kill_pid(pid);
    let _ = std::fs::remove_file(path);
}

#[cfg(windows)]
fn kill_pid(pid: u32) {
    let _ = std::process::Command::new("taskkill")
        .args(["/F", "/T", "/PID", &pid.to_string()])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
}

#[cfg(not(windows))]
fn kill_pid(pid: u32) {
    let _ = std::process::Command::new("kill")
        .args(["-9", &pid.to_string()])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
}
