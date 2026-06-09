use std::process::{Child, Command, Stdio};
use tracing::info;

/// Launch the Axeane Automation frontend as a standalone Edge app window.
/// Uses --app= mode so it opens without browser chrome (tabs, address bar, etc.)
pub async fn open_app_window(url: &str) -> crate::error::Result<()> {
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    info!("Opening app window at {}", url);

    let edge_exe = find_edge_exe();

    Command::new(&edge_exe)
        .args([
            &format!("--app={}", url),
            "--new-window",
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| crate::error::AppError::BrowserOpenFailed(
            format!("Failed to launch Edge as app: {}", e)
        ))?;

    Ok(())
}

/// Launch the Axeane Kompta PWA with CDP remote debugging enabled.
/// This is required so Playwright can connect to it for automation.
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
        .map_err(|e| crate::error::AppError::BrowserOpenFailed(
            format!("Failed to launch Kompta PWA: {}", e)
        ))?;

    info!("Kompta PWA launched (pid: {})", child.id());
    Ok(child)
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
    // Fallback: hope it's in PATH
    "msedge".to_string()
}
