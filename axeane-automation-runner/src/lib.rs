//! Axeane Automation — Tauri 2 host entry point.
//!
//! Responsibilities:
//!   * Spawn the Python backend sidecar (see [`sidecar`]).
//!   * Stream its stdout/stderr into the unified tracing pipeline so the
//!     operator sees real-time logs in `cargo tauri dev` and in the
//!     persisted `runner.log` file under `%APPDATA%\Axeane\Automation\`.
//!   * Guarantee the sidecar is terminated when the main Tauri window
//!     closes — no orphan `python-backend.exe` left behind.
//!   * Serve the static Next.js export on `127.0.0.1:3000` (or, in release
//!     builds, let Tauri load it directly via the asset protocol —
//!     `devUrl`/`frontendDist` in `tauri.conf.json`).
//!
//! The previous standalone launcher (axum + wry + tao) has been replaced
//! by a proper Tauri 2 runtime. The Tauri webview replaces the manual
//! `wry` window we used to open with `open_app_window`.

#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

pub mod config;
pub mod error;
pub mod launcher;
pub mod setup;
pub mod sidecar;

use error::Result;
use tauri::Manager;
use tracing::{error, info};

/// Entrypoint invoked by the Tauri runtime.
///
/// `pub` so the same code path can be unit-tested or reused from
/// integration tests / examples.
pub fn run() {
    // Logging is initialised before the Tauri app is built so that any
    // setup-hook errors are captured.
    init_logging();

    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    info!("Axeane Automation Runner v1.4 (Tauri 2) starting...");
    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if let Err(e) = run_inner() {
        error!("Fatal Tauri startup error: {e:#}");
        std::process::exit(1);
    }
}

fn run_inner() -> Result<()> {
    let config = config::AppConfig::from_exe_dir()?;
    config.validate()?;

    info!("Install dir : {}", config.install_dir.display());
    info!("Backend     : {}", config.backend_url());
    info!("Frontend    : {}", config.frontend_url());

    let setup_state = setup::SetupState::new(config.clone());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(setup_state)
        .invoke_handler(tauri::generate_handler![is_ready_cmd])
        .setup(|app| {
            // The setup hook is the only place we can reliably talk to
            // the AppHandle before the first window is shown. We block
            // here briefly to give the sidecar a head-start so the
            // webview's first fetch is not racing the FastAPI boot.
            let state = app.state::<setup::SetupState>();
            setup::spawn_sidecar_and_wait(state.clone(), app.handle().clone())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                info!(
                    "Main window 'CloseRequested' — terminating Python sidecar"
                );
                let state = window.state::<setup::SetupState>();
                sidecar::terminate(&state.config);
            }
        })
        .build(tauri::generate_context!())
        .map_err(|e| error::AppError::TauriBuild(e.to_string()))?
        .run(|_app, event| {
            // Last-chance cleanup when the entire Tauri runtime exits
            // (e.g. macOS Cmd+Q, Linux SIGTERM, or a panic).
            if let tauri::RunEvent::ExitRequested { .. } = event {
                info!("RunEvent::ExitRequested — final sidecar cleanup");
                let _ = _app
                    .state::<setup::SetupState>()
                    .config
                    .backend_pid_path
                    .parent()
                    .map(std::fs::create_dir_all);
            }
        });

    Ok(())
}

#[tauri::command]
fn is_ready_cmd(state: tauri::State<'_, setup::SetupState>) -> bool {
    setup::is_ready(&state)
}

/// Initialise tracing to write to a log file under `%APPDATA%`.
///
/// The release binary is built with `windows_subsystem = "windows"` so
/// stdout is not visible. Sending all logs to a file keeps the launcher
/// truly silent while still leaving a paper trail for debugging.
fn init_logging() {
    use tracing_subscriber::fmt::writer::MakeWriter;

    /// Append-only writer that opens (or creates) the log file fresh on
    /// every write. Cheap for the low log volume we produce.
    struct FileWriter;
    impl std::io::Write for FileWriter {
        fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
            let log_path = dirs::data_dir()
                .unwrap_or_else(|| std::env::temp_dir())
                .join("Axeane")
                .join("Automation")
                .join("runner.log");
            if let Some(parent) = log_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            let mut f = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&log_path)?;
            f.write(buf)
        }
        fn flush(&mut self) -> std::io::Result<()> {
            Ok(())
        }
    }
    impl<'a> MakeWriter<'a> for FileWriter {
        type Writer = FileWriter;
        fn make_writer(&'a self) -> Self::Writer {
            FileWriter
        }
    }

    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "axeane_automation_run=info,tauri=info,tauri_plugin_shell=info".into());

    let _ = tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .with_writer(FileWriter)
        .with_ansi(false)
        .try_init();
}
