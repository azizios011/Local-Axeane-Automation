use tracing::info; 
 
/// Open the frontend URL in the user's default browser. 
/// Retries a few times in case the server isn't quite ready. 
pub async fn open_browser(url: &str) -> crate::error::Result<()> { 
    info!("Opening browser at {}", url); 
 
    // Small delay to let the frontend server fully bind 
    tokio::time::sleep(std::time::Duration::from_millis(500)).await; 
 
    open::that(url) 
        .map_err(|e| crate::error::AppError::BrowserOpenFailed(e.to_string()))?; 
 
    Ok(()) 
} 
