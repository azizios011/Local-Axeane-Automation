// Hide the Windows console window — this is a GUI subsystem application.
// All logs are written to a file in %APPDATA% so users can still diagnose issues.
#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

mod config;
mod error;
mod launcher;

use launcher::{
    launch_kompta_pwa, open_app_window, relaunch_detached, serve_frontend, spawn_backend,
    stop_backend, wait_for_backend,
};
use launcher::browser::AUTO_LAUNCHED_ENV;
use std::sync::atomic::{AtomicBool, Ordering};
use tracing::{error, info};

/// Path to the single-instance lock file inside %APPDATA%.
/// Only one process on the system may hold this file open at a time, so it
/// doubles as a coarse mutex for enforcing a single instance of the launcher.
static LOCK_PATH: std::sync::OnceLock<std::path::PathBuf> = std::sync::OnceLock::new();

static IS_SINGLE_INSTANCE: AtomicBool = AtomicBool::new(false);

#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() {
    init_logging();

    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    info!("Axeane Automation Runner v1.3 starting...");
    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // ---- Single-instance enforcement ----
    if !acquire_single_instance_lock() {
        info!("Another instance is already running — exiting silently");
        return;
    }

    // ---- Detach pattern ----
    // If we were NOT spawned by ourselves already, re-launch detached and exit
    // the parent. This way the Start Menu / Desktop shortcut click returns
    // immediately, and the actual work runs in a child with no console.
    let already_auto_launched = std::env::var(AUTO_LAUNCHED_ENV)
        .map(|v| v == "1")
        .unwrap_or(false);

    if !already_auto_launched {
        match relaunch_detached() {
            Ok(()) => {
                // Parent exits immediately, child continues in the background.
                return;
            }
            Err(e) => {
                error!("Failed to relaunch detached: {} — running inline", e);
                // Fall through and run inline if detach fails
            }
        }
    }

    if let Err(e) = run().await {
        error!("Fatal: {}", e);
    }
}

async fn run() -> error::Result<()> {
    let config = config::AppConfig::from_exe_dir()?;
    config.validate()?;

    info!("Install dir : {}", config.install_dir.display());
    info!("Backend     : {}", config.backend_url());
    info!("Frontend    : {}", config.frontend_url());

    // 1. Launch Axeane Kompta PWA with CDP port open
    // This replaces manually opening it — the user no longer needs to do this
    let _kompta_process =
        launch_kompta_pwa(&config.kompta_pwa_url, config.kompta_cdp_port)?;

    // Small pause for PWA to initialize before backend starts
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    // 2. Spawn Python backend
    let backend_process = spawn_backend(&config)?;

    // 3. Wait for backend health
    wait_for_backend(&config.health_url(), config.health_timeout_secs).await?;

    // 4. Serve frontend static files in background
    let frontend_out = config.frontend_out_dir.clone();
    let frontend_port = config.frontend_port;
    tokio::spawn(async move {
        if let Err(e) = serve_frontend(frontend_out, frontend_port).await {
            tracing::error!("Frontend server crashed: {}", e);
        }
    });

    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    // 5. Open the Automation Bridge as a native WebView2 window
    // (replaces the previous Edge --app= mode — now it's a real OS window)
    open_app_window(&config.frontend_url()).await?;

    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    info!("App is running. Press Ctrl+C to stop.");
    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    tokio::signal::ctrl_c().await.expect("Failed to listen for Ctrl+C");

    info!("Shutting down...");
    stop_backend(backend_process);
    info!("Goodbye.");

    Ok(())
}

/// Initialise tracing to write to a log file under %APPDATA%.
///
/// Because the binary is built with `windows_subsystem = "windows"`, stdout is
/// not visible. Sending all logs to a file keeps the launcher truly silent
/// while still leaving a paper trail for debugging.
fn init_logging() {
    use tracing_subscriber::fmt::writer::MakeWriter;

    // Opens (or creates) the log file fresh on every write. Cheap for the
    // low log volume we produce.
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
        .unwrap_or_else(|_| "axeane_automation=info,tower_http=warn".into());

    let _ = tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .with_writer(FileWriter)
        .with_ansi(false)
        .try_init();
}

/// Try to acquire the single-instance lock file. Returns true on first
/// instance, false if another instance already holds it.
///
/// We hold an open file handle to `%APPDATA%\Axeane\Automation\runner.lock`
/// for the lifetime of the process. Only one process on the system may hold
/// it, so it doubles as a coarse mutex.
fn acquire_single_instance_lock() -> bool {
    let lock_path = LOCK_PATH.get_or_init(|| {
        dirs::data_dir()
            .unwrap_or_else(|| std::env::temp_dir())
            .join("Axeane")
            .join("Automation")
            .join("runner.lock")
    });

    if let Some(parent) = lock_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    // `create_new(true)` will fail with `AlreadyExists` if another process
    // is already holding the lock file. We then probe the existing file to
    // make sure we can read it (sanity check).
    match std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(lock_path)
    {
        Ok(_f) => {
            IS_SINGLE_INSTANCE.store(true, Ordering::SeqCst);
            true
        }
        Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => false,
        Err(e) => {
            error!("Could not acquire single-instance lock: {} — assuming first instance", e);
            IS_SINGLE_INSTANCE.store(true, Ordering::SeqCst);
            true
        }
    }
}
