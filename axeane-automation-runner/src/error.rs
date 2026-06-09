use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Backend failed to start: {0}")]
    BackendStartFailed(String),

    #[error("Backend health check timed out after {0}s")]
    BackendHealthTimeout(u64),

    #[error("Frontend server failed to start: {0}")]
    FrontendStartFailed(String),

    #[error("Process error: {0}")]
    ProcessError(#[from] std::io::Error),

    #[error("HTTP error: {0}")]
    HttpError(#[from] reqwest::Error),

    #[error("Config error: {0}")]
    ConfigError(String),

    #[error("Tauri build/runtime error: {0}")]
    TauriBuild(String),

    #[error("Sidecar error: {0}")]
    Sidecar(String),
}

pub type Result<T> = std::result::Result<T, AppError>;
