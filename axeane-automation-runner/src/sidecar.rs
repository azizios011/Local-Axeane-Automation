//! Python backend sidecar lifecycle.
//!
//! The PyInstaller-bundled `python-backend(.exe)` is launched as a child
//! process of the Tauri host via the official `tauri-plugin-shell`
//! `Command::sidecar()` API. We then:
//!
//!   * Stream `stdout` lines through `tracing::info!`.
//!   * Stream `stderr` lines through `tracing::warn!`.
//!   * Persist the child PID to `backend_pid_path` so a stale instance
//!     from a previous run can be cleaned up on startup.
//!   * Kill the child on `WindowEvent::CloseRequested` to guarantee
//!     no orphan service is left running.

use std::path::Path;
use std::process::Stdio;
use std::sync::OnceLock;

use serde::Serialize;
use tauri::async_runtime::{self, JoinHandle};
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tracing::{error, info, warn};

use crate::config::AppConfig;
use crate::error::{AppError, Result};

/// Name of the external binary in `tauri.conf.json` → `bundle.externalBin`.
pub const SIDECAR_NAME: &str = "binaries/python-backend";

/// Globally-registered handle to the running sidecar so we can kill it
/// from event hooks (e.g. `WindowEvent::CloseRequested`).
///
/// We hold the `Option<SidecarHandle>` behind a `parking_lot::Mutex` so
/// the inner fields can be mutated through `DerefMut`. Be careful: the
/// lock guard is `MutexGuard<Option<SidecarHandle>>` — to reach the
/// inner struct you must deref once: `(*guard).child`.
static SIDECAR: OnceLock<parking_lot::Mutex<Option<SidecarHandle>>> = OnceLock::new();

/// Light wrapper around the `CommandChild` so we keep both the child and
/// the abort-handle of the stdout/stderr reader task in one place.
#[derive(Default)]
pub struct SidecarHandle {
    pub child: Option<CommandChild>,
    pub reader: Option<JoinHandle<()>>,
}

impl SidecarHandle {
    pub fn global() -> &'static parking_lot::Mutex<Option<SidecarHandle>> {
        SIDECAR.get_or_init(|| parking_lot::Mutex::new(None))
    }
}

/// Payload emitted on the `sidecar://log` event for the front-end (a
/// future Tauri feature — kept here for completeness).
#[derive(Debug, Clone, Serialize)]
pub struct LogLine {
    pub stream: &'static str, // "stdout" | "stderr"
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

    let shell = app.shell();
    let sidecar_command = shell
        .sidecar(SIDECAR_NAME)
        .map_err(|e| AppError::Sidecar(format!("sidecar command not found: {e}")))?
        .args([
            "--host",
            "127.0.0.1",
            "--port",
            &config.backend_port.to_string(),
        ]);

    // `rx` does not need to be `mut` because the consumer takes
    // ownership via the spawned task. `child` is the only thing we
    // need to keep around for the lifetime of the sidecar.
    let (rx, child) = sidecar_command
        .spawn()
        .map_err(|e| AppError::Sidecar(format!("failed to spawn sidecar: {e}")))?;

    let pid = child.pid();
    info!("Python sidecar started (pid: {})", pid);

    // Persist PID for orphan cleanup on next launch.
    if let Some(parent) = config.backend_pid_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(&config.backend_pid_path, pid.to_string());

    // Fan out the stdout/stderr event stream into the tracing pipeline
    // and into Tauri's event system so the front-end can optionally
    // listen via `tauri::listen("sidecar://log", ...)`.
    let reader = async_runtime::spawn(stream_logs(app.clone(), rx));

    // Register the handle so the window-close hook can kill it.
    *SidecarHandle::global().lock() = Some(SidecarHandle {
        child: Some(child),
        reader: Some(reader),
    });

    // Block (within the Tauri setup hook, which runs on a worker
    // thread) until the FastAPI health probe succeeds.
    wait_for_health(&config.health_url(), config.health_timeout_secs)?;

    info!("Python sidecar is healthy and serving on {}", config.backend_url());
    Ok(())
}

/// Drain the sidecar's event stream into the tracing pipeline.
async fn stream_logs(
    app: AppHandle,
    mut rx: tauri::async_runtime::Receiver<CommandEvent>,
) {
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes).trim_end().to_string();
                if !line.is_empty() {
                    info!(target: "sidecar.stdout", "{}", line);
                    let _ = app.emit("sidecar://log", LogLine {
                        stream: "stdout",
                        line: line.clone(),
                    });
                }
            }
            CommandEvent::Stderr(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes).trim_end().to_string();
                if !line.is_empty() {
                    warn!(target: "sidecar.stderr", "{}", line);
                    let _ = app.emit("sidecar://log", LogLine {
                        stream: "stderr",
                        line,
                    });
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
                // The sidecar exited on its own — clear the global
                // handle so we don't try to kill a dead process.
                if let Some(slot) = SIDECAR.get() {
                    if let Some(handle) = slot.lock().as_mut() {
                        handle.child = None;
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
///
/// Called from:
///   * `WindowEvent::CloseRequested` (user closed the main window)
///   * `RunEvent::ExitRequested` (Tauri runtime shutting down)
///   * Process termination (e.g. `Drop` of the global handle)
pub fn terminate(config: &AppConfig) {
    let Some(slot) = SIDECAR.get() else { return };
    let mut guard = slot.lock();

    // `guard` is `MutexGuard<Option<SidecarHandle>>`. Deref once to get
    // `&mut Option<SidecarHandle>`, then `as_mut()` to reach the inner
    // struct.
    let Some(handle) = guard.as_mut() else {
        info!("terminate() called but sidecar is already gone");
        return;
    };

    if let Some(child) = handle.child.take() {
        // CommandChild in tauri-plugin-shell 2 has only `kill()` — no
        // `wait()`. The OS reaps the process; the reader task gets
        // the Terminated event when it happens.
        info!("Terminating Python sidecar (pid: {})", child.pid());
        if let Err(e) = child.kill() {
            error!("Failed to kill sidecar: {}", e);
        }
    } else {
        info!("terminate() called but sidecar is already gone");
    }

    if let Some(reader) = handle.reader.take() {
        reader.abort();
    }

    drop(guard);

    // Remove the PID file so the next launch does not see a stale entry.
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
    // taskkill /F /T  →  force-kill process tree
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
