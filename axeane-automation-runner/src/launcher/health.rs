use std::time::{Duration, Instant}; 
use tracing::{info, warn}; 
 
/// Poll the backend health endpoint until it responds OK or timeout is reached. 
pub async fn wait_for_backend(health_url: &str, timeout_secs: u64) -> crate::error::Result<()> { 
    let client = reqwest::Client::builder() 
        .timeout(Duration::from_secs(3)) 
        .build()?; 
 
    let deadline = Instant::now() + Duration::from_secs(timeout_secs); 
    let mut attempt = 0u32; 
 
    info!("Waiting for backend at {} ...", health_url); 
 
    while Instant::now() < deadline { 
        attempt += 1; 
        match client.get(health_url).send().await { 
            Ok(resp) if resp.status().is_success() => { 
                info!("Backend is ready after {} attempt(s)", attempt); 
                return Ok(()); 
            } 
            Ok(resp) => { 
                warn!("Health check attempt {}: HTTP {}", attempt, resp.status()); 
            } 
            Err(e) => { 
                warn!("Health check attempt {}: {}", attempt, e); 
            } 
        } 
        tokio::time::sleep(Duration::from_millis(800)).await; 
    } 
 
    Err(crate::error::AppError::BackendHealthTimeout(timeout_secs)) 
} 
