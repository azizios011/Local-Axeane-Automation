use std::net::SocketAddr; 
use std::path::PathBuf; 
use axum::Router; 
use tower_http::services::ServeDir; 
use tower_http::cors::CorsLayer; 
use tracing::info; 
 
/// Start an axum static file server serving the Next.js export output. 
pub async fn serve_frontend( 
    out_dir: PathBuf, 
    port: u16, 
) -> crate::error::Result<()> { 
    let addr = SocketAddr::from(([127, 0, 0, 1], port)); 
 
    let app = Router::new() 
        .nest_service("/", ServeDir::new(&out_dir).append_index_html_on_directories(true)) 
        .layer(CorsLayer::permissive()); 
 
    info!("Serving frontend from {} on {}", out_dir.display(), addr); 
 
    let listener = tokio::net::TcpListener::bind(addr) 
        .await 
        .map_err(|e| crate::error::AppError::FrontendStartFailed(e.to_string()))?; 
 
    axum::serve(listener, app) 
        .await 
        .map_err(|e| crate::error::AppError::FrontendStartFailed(e.to_string()))?; 
 
    Ok(()) 
} 
