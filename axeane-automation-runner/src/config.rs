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
            backend_port: std::env::var("AXEANE_PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(8080),
            health_timeout_secs: std::env::var("AXEANE_HEALTH_TIMEOUT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(60), // was 5 — PyInstaller cold-start needs ~10-20s
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

    /// Locate the `binaries/` folder that contains the PyInstaller-built
    /// `python-backend[-<triple>](.exe)` sidecar.
    ///
    /// Looks in two places, in order:
    ///   1. `<install_dir>/binaries/` — Tauri places `externalBin` files
    ///      here when the host is launched from `target\release\`.
    ///   2. `<install_dir>/../binaries/` — the source-tree location, used
    ///      when the host is launched from `cargo tauri dev` (where
    ///      `install_dir` is `target\debug\` and the real folder is one
    ///      level up, next to `Cargo.toml`).
    ///
    /// Returns the first directory that contains a `python-backend*`
    /// file. Returns `None` if no candidate folder has the sidecar.
    pub fn find_binaries_dir(&self) -> Option<PathBuf> {
        // (1) Bundled layout: target/release/binaries/
        let bundled = self.install_dir.join("binaries");
        if has_sidecar(&bundled) {
            return Some(bundled);
        }

        // (2) Dev layout: <source>/binaries/  (one level up from
        //     target/debug/)
        let dev = self.install_dir.parent()?.join("binaries");
        if has_sidecar(&dev) {
            return Some(dev);
        }

        None
    }

    /// Validate the install layout. Emits a **warning** (not an error)
    /// if the sidecar is missing — the Tauri window should still open
    /// so the user can see a useful error toast.
    pub fn validate(&self) -> crate::error::Result<()> {
        if self.find_binaries_dir().is_none() {
            tracing::warn!(
                "No 'python-backend' sidecar found. Looked in: {}/binaries/ and \
                 {}/../binaries/. Run tools/build_python_sidecar.ps1 to build it.",
                self.install_dir.display(),
                self.install_dir.display()
            );
        }
        Ok(())
    }
}

fn has_sidecar(dir: &std::path::Path) -> bool {
    if !dir.exists() {
        return false;
    }
    std::fs::read_dir(dir)
        .ok()
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .any(|entry| {
            entry
                .file_name()
                .to_string_lossy()
                .starts_with("python-backend")
        })
}
