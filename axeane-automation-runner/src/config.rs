use std::path::{Path, PathBuf};

/// Runtime configuration resolved from the installation directory.
#[derive(Debug, Clone)]
pub struct AppConfig {
    /// Root install dir: where axeane-automation.exe lives
    pub install_dir: PathBuf,

    /// Embedded Python executable
    pub python_exe: PathBuf,

    /// Python backend source directory (contains main.py)
    pub backend_dir: PathBuf,

    /// Next.js static export directory (contains index.html)
    pub frontend_out_dir: PathBuf,

    /// Port for the FastAPI backend
    pub backend_port: u16,

    /// Port for the static frontend server
    pub frontend_port: u16,

    /// Seconds to wait for backend health check before giving up
    pub health_timeout_secs: u64,

    /// URL of the Axeane Kompta PWA to launch with CDP
    pub kompta_pwa_url: String,

    /// CDP port to use when launching the Kompta PWA
    pub kompta_cdp_port: u16,
}

impl AppConfig {
    /// Build config from the directory where the executable lives.
    pub fn from_exe_dir() -> crate::error::Result<Self> {
        let install_dir = std::env::current_exe()
            .map_err(|e| crate::error::AppError::ConfigError(e.to_string()))?
            .parent()
            .ok_or_else(|| crate::error::AppError::ConfigError(
                "Cannot determine install directory".into()
            ))?
            .to_path_buf();

        Ok(Self {
            python_exe: install_dir.join("python").join("python.exe"),
            backend_dir: install_dir.join("backend"),
            frontend_out_dir: install_dir.join("frontend").join("out"),
            backend_port: 8080,
            frontend_port: 3000,
            health_timeout_secs: 60,
            kompta_pwa_url: "https://kompta.axeane.com".to_string(),
            kompta_cdp_port: 9222,
            install_dir,
        })
    }

    pub fn backend_url(&self) -> String {
        format!("http://localhost:{}", self.backend_port)
    }

    pub fn frontend_url(&self) -> String {
        format!("http://localhost:{}", self.frontend_port)
    }

    pub fn health_url(&self) -> String {
        format!("{}/health", self.backend_url())
    }

    /// Validate that all required paths exist.
    pub fn validate(&self) -> crate::error::Result<()> {
        let required: &[(&Path, &str)] = &[
            (&self.python_exe, "python/python.exe"),
            (&self.backend_dir, "backend/"),
            (&self.backend_dir.join("main.py"), "backend/main.py"),
            (&self.frontend_out_dir, "frontend/out/"),
        ];
        for (path, label) in required {
            if !path.exists() {
                return Err(crate::error::AppError::ConfigError(
                    format!("Required path not found: {} ({})", label, path.display())
                ));
            }
        }
        Ok(())
    }
}
