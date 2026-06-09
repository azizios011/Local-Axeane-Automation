//! Standalone static file server for the Next.js export.
//!
//! **Production:** Tauri loads the static export via the
//! `asset://` protocol directly (see `frontendDist` in
//! `tauri.conf.json`). This module is therefore a fallback for the
//! dev-time `examples/webview_frontend.rs` preview and for any future
//! scenario where we want to serve the UI outside of Tauri.

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
