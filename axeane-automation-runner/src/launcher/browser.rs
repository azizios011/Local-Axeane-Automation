use std::process::{Child, Command, Stdio};
use tracing::info;

/// When the launcher is invoked by the Start Menu / Desktop shortcut, we
/// re-spawn ourselves as a detached background process (no terminal) and
/// exit the parent immediately. The detached child has this env var set to
/// `1` so it knows it is the long-running instance and should NOT re-launch.
pub const AUTO_LAUNCHED_ENV: &str = "AXEANE_AUTO_LAUNCHED";

/// Launch the Automation Bridge frontend as a **native WebView2 window**.
///
/// This is a real OS window (not a browser tab, not Edge app mode).
/// Powered by `wry` + `tao`, which embed the Microsoft Edge WebView2 runtime
/// that is pre-installed on Windows 10/11.
pub async fn open_app_window(url: &str) -> crate::error::Result<()> {
    info!("Opening Automation Bridge as a native WebView2 window at {}", url);

    // `wry::WebViewBuilder` and `tao::EventLoop` must be used on a thread that
    // is allowed to drive a windowing event loop. The launcher exe is a GUI
    // subsystem (windows_subsystem = "windows") so there is no console — the
    // OS treats us as a GUI process. We pump the event loop on a dedicated
    // OS thread.
    let url = url.to_string();
    std::thread::spawn(move || {
        use tao::event::{Event, WindowEvent};
        use tao::event_loop::{ControlFlow, EventLoop};
        use tao::window::WindowBuilder;
        use wry::WebViewBuilder;

        let event_loop = EventLoop::new();

        let window = WindowBuilder::new()
            .with_title("Axeane Automation Bridge")
            .with_inner_size(tao::dpi::LogicalSize::new(1280.0, 800.0))
            .build(&event_loop)
            .expect("Failed to build Automation Bridge window");

        let _webview = WebViewBuilder::new()
            .with_url(&url)
            .build(&window)
            .expect("Failed to build Automation Bridge WebView2");

        info!("Automation Bridge window is live");

        // tao 0.35 run() takes a 3-arg closure: (event, target, control_flow).
        // `ControlFlow` is a plain enum — assigned via dereference, not a setter.
        event_loop.run(move |event, _target, control_flow| {
            *control_flow = ControlFlow::Wait;

            match event {
                Event::WindowEvent {
                    event: WindowEvent::CloseRequested,
                    ..
                } => {
                    info!("Automation Bridge window closed by user — exiting process");
                    *control_flow = ControlFlow::ExitWithCode(0);
                }
                _ => {}
            }
        });
    });

    // Give the window a moment to materialise before we return.
    tokio::time::sleep(std::time::Duration::from_millis(800)).await;
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

/// Re-launch the current executable as a fully detached background process
/// (no console window, no parent). Returns immediately after spawning the
/// detached child. The original (parent) process exits.
///
/// The child is launched with the `AXEANE_AUTO_LAUNCHED=1` env var so it
/// knows it is the long-running instance and should NOT re-launch itself.
pub fn relaunch_detached() -> crate::error::Result<()> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;

        let exe = std::env::current_exe()
            .map_err(|e| crate::error::AppError::ProcessError(e))?;

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
        let _ = AUTO_LAUNCHED_ENV; // silence unused
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
    // Fallback: hope it's in PATH
    "msedge".to_string()
}
