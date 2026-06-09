use std::path::PathBuf;

/// Runtime configuration resolved from the install directory of the
/// Tauri host (`axeane-automation-runner.exe`).
///
/// In the Tauri 2 architecture the *only* responsibility of the host is
/// to spawn the Python sidecar on a localhost port and to keep the
/// webview pointed at the static Next.js export. Everything else
/// (HTTP server for the SPA, the Edge window) is handled by Tauri
/// itself.
#[derive(Debug, Clone)]
pub struct AppConfig {
    /// Directory containing the host executable.
    pub install_dir: PathBuf,

    /// Port on which the Python sidecar listens (FastAPI/uvicorn).
    pub backend_port: u16,

    /// Seconds to wait for the sidecar's `/health` endpoint to come up
    /// before giving up.
    pub health_timeout_secs: u64,

    /// Path to the persisted PID file of the running sidecar.
    /// Used to kill stale instances on next launch.
    pub backend_pid_path: PathBuf,

    /// Port on which the dev/preview static frontend is served by axum.
    /// In production Tauri loads `frontendDist` directly so this is
    /// mostly informational.
    pub frontend_port: u16,
}

impl AppConfig {
    /// Build config from the directory where the executable lives.
    pub fn from_exe_dir() -> crate::error::Result<Self> {
        let install_dir = std::env::current_exe()
            .map_err(|e| crate::error::AppError::ConfigError(e.to_string()))?
            .parent()
            .ok_or_else(|| crate::error::AppError::ConfigError(
                "Cannot determine install directory".into(),
            ))?
            .to_path_buf();

        // Persist the sidecar PID under %APPDATA%\Axeane\Automation\
        let backend_pid_path = dirs::data_dir()
            .unwrap_or_else(|| std::env::temp_dir())
            .join("Axeane")
            .join("Automation")
            .join("backend.pid");

        Ok(Self {
            install_dir,
            backend_port: 8080,
            health_timeout_secs: 60,
            backend_pid_path,
            frontend_port: 3000,
        })
    }

    pub fn backend_url(&self) -> String {
        format!("http://127.0.0.1:{}", self.backend_port)
    }

    pub fn frontend_url(&self) -> String {
        format!("http://127.0.0.1:{}", self.frontend_port)
    }

    pub fn health_url(&self) -> String {
        format!("{}/health", self.backend_url())
    }

    /// Validate that the Tauri install layout is sane.
    ///
    /// In the Tauri 2 layout:
    ///   * The Python sidecar must live at `<install>/binaries/python-backend[-<triple>].exe`
    ///   * The static frontend is bundled into the Tauri app and does
    ///     not need to exist on disk next to the host binary at
    ///     runtime (Tauri reads it from `frontendDist`).
    pub fn validate(&self) -> crate::error::Result<()> {
        // Look for the sidecar binary (any triple) so we can give a
        // helpful error if it has not been built.
        let binaries_dir = self.install_dir.join("binaries");
        if !binaries_dir.exists() {
            return Err(crate::error::AppError::ConfigError(format!(
                "Sidecar folder not found: {} - build it with tools/build_python_sidecar.ps1",
                binaries_dir.display()
            )));
        }

        let has_sidecar = std::fs::read_dir(&binaries_dir)
            .map_err(|e| crate::error::AppError::ConfigError(e.to_string()))?
            .filter_map(Result::ok)
            .any(|entry| {
                let name = entry.file_name().to_string_lossy().into_owned();
                name.starts_with("python-backend")
            });

        if !has_sidecar {
            return Err(crate::error::AppError::ConfigError(format!(
                "No 'python-backend' sidecar found in {}. Run tools/build_python_sidecar.ps1",
                binaries_dir.display()
            )));
        }

        Ok(())
    }
}
