//! Helpers for spawning the Axeane Kompta PWA (CDP-enabled Edge window)
//! and a manual `wry`/`tao` webview window.
//!
//! In the **Tauri 2** host the manual webview is **no longer used** —
//! the Tauri runtime itself owns the only window. The
//! `open_app_window` helper is kept here as a thin shim that returns
//! an explanatory error so legacy callers fail fast. The Kompta PWA
//! launcher is preserved unchanged for backwards compatibility with
//! the original flow.

use std::process::{Child, Command, Stdio};
use tracing::info;

/// When the launcher is invoked by the Start Menu / Desktop shortcut, we
/// re-spawn ourselves as a detached background process (no terminal) and
/// exit the parent immediately.
pub const AUTO_LAUNCHED_ENV: &str = "AXEANE_AUTO_LAUNCHED";

/// Open a manual `wry` + `tao` WebView2 window.
///
/// In the Tauri 2 host this is **no longer the production path** —
/// the Tauri runtime itself creates the only webview window. Calling
/// this function will log a warning and return successfully without
/// opening a window; the Tauri webview is already showing the UI.
pub async fn open_app_window(_url: &str) -> crate::error::Result<()> {
    info!(
        "open_app_window() is a no-op in the Tauri 2 host — the Tauri webview is already open"
    );
    Ok(())
}

/// Launch the Axeane Kompta PWA with CDP remote debugging enabled.
/// Returns the child process so the caller can manage its lifetime.
pub fn launch_kompta_pwa(pwa_url: &str, cdp_port: u16) -> crate::error::Result<Child> {
    info!("Launching Axeane Kompta PWA with CDP on port {}", cdp_port);

    let edge_exe = find_edge_exe();

    let child = Command::new(&edge_exe)
        .args([
            &format!("--app={}", pwa_url),
            &format!("--remote-debugging-port={}", cdp_port),
            "--new-window",
            "--no-first-run",
            "--no-default-browser-check",
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| crate::error::AppError::ConfigError(
            format!("Failed to launch Kompta PWA: {}", e)
        ))?;

    info!("Kompta PWA launched (pid: {})", child.id());
    Ok(child)
}

/// Re-launch the current executable as a fully detached background
/// process. No-op in the Tauri 2 host (kept for binary compatibility
/// with the original installer scripts).
pub fn relaunch_detached() -> crate::error::Result<()> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;

        let exe = std::env::current_exe()
            .map_err(crate::error::AppError::ProcessError)?;

        Command::new(&exe)
            .env(AUTO_LAUNCHED_ENV, "1")
            .creation_flags(DETACHED_PROCESS | CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(crate::error::AppError::ProcessError)?;

        info!("Detached background process spawned, parent exiting");
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = AUTO_LAUNCHED_ENV;
        Ok(())
    }
}

/// Find the Microsoft Edge executable path on Windows.
fn find_edge_exe() -> String {
    let candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ];
    for path in &candidates {
        if std::path::Path::new(path).exists() {
            return path.to_string();
        }
    }
    "msedge".to_string()
}
