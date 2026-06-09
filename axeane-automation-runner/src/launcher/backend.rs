//! DEPRECATED — kept for backward compatibility with the original
//! launcher-style API.
//!
//! In the Tauri 2 host the Python backend is no longer spawned via
//! `python -m uvicorn`. Instead the PyInstaller-bundled single-file
//! binary at `binaries/python-backend[-<triple>].exe` is launched
//! through `tauri-plugin-shell` by [`crate::sidecar`].
//!
//! The helpers in this module are still useful for:
//!   * headless integration tests (`cargo test`)
//!   * the `examples/webview_frontend.rs` dev preview
//!
//! Production launches always go through the Tauri `setup` hook.

use std::process::{Child, Command, Stdio};
use tracing::info;
use crate::config::AppConfig;

/// Spawn the FastAPI backend using a raw `Command`.
///
/// In the original launcher this called `<embedded>/python/python.exe
/// -m uvicorn main:app --host 127.0.0.1 --port <N>`. In the Tauri host
/// this is rarely needed — the sidecar is launched by Tauri's
/// `shell.sidecar()` API. The implementation here is kept as a
/// reference and is used by the example dev preview.
pub fn spawn_backend(config: &AppConfig) -> crate::error::Result<Child> {
    info!(
        "spawn_backend() called — this path is deprecated. Use crate::sidecar in production."
    );

    // Best-effort: fall back to the raw Python executable if it is
    // present (e.g. dev mode). The Tauri 2 path uses the sidecar
    // binary instead and never goes through this function.
    let python_exe = config.install_dir.join("python").join("python.exe");
    if !python_exe.exists() {
        return Err(crate::error::AppError::BackendStartFailed(
            "No embedded Python and no sidecar in PATH. Build the sidecar with tools/build_python_sidecar.ps1".into(),
        ));
    }

    let child = Command::new(&python_exe)
        .args([
            "-m", "uvicorn",
            "main:app",
            "--host", "127.0.0.1",
            "--port", &config.backend_port.to_string(),
            "--no-access-log",
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| crate::error::AppError::BackendStartFailed(e.to_string()))?;

    info!("Backend process spawned (pid: {})", child.id());
    Ok(child)
}

/// Gracefully kill the backend process (used by the deprecated
/// `spawn_backend` path only).
pub fn stop_backend(mut child: Child) {
    info!("Stopping backend process (pid: {})", child.id());
    let _ = child.kill();
    let _ = child.wait();
}
