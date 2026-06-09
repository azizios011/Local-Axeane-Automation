use std::process::{Child, Command, Stdio}; 
use tracing::info; 
use crate::config::AppConfig; 
 
/// Spawn the FastAPI backend using the embedded Python. 
pub fn spawn_backend(config: &AppConfig) -> crate::error::Result<Child> { 
    info!( 
        "Spawning backend: {} -m uvicorn main:app --host 127.0.0.1 --port {}", 
        config.python_exe.display(), 
        config.backend_port 
    ); 
 
    let child = Command::new(&config.python_exe) 
        .args([ 
            "-m", "uvicorn", 
            "main:app", 
            "--host", "127.0.0.1", 
            "--port", &config.backend_port.to_string(), 
            "--no-access-log", 
        ]) 
        .current_dir(&config.backend_dir) 
        // Set PYTHONPATH so uvicorn finds the backend modules 
        .env("PYTHONPATH", &config.backend_dir) 
        // Prevent console window on Windows 
        .stdout(Stdio::null()) 
        .stderr(Stdio::null()) 
        .spawn() 
        .map_err(|e| crate::error::AppError::BackendStartFailed(e.to_string()))?; 
 
    info!("Backend process spawned (pid: {})", child.id()); 
    Ok(child) 
} 
 
/// Gracefully kill the backend process. 
pub fn stop_backend(mut child: Child) { 
    info!("Stopping backend process (pid: {})", child.id()); 
    let _ = child.kill(); 
    let _ = child.wait(); 
} 
