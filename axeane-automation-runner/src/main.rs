mod config;
mod error;
mod launcher;

use launcher::{
    launch_kompta_pwa, open_app_window, serve_frontend, spawn_backend, stop_backend,
    wait_for_backend,
};
use tracing::{error, info};

#[tokio::main]
async fn main() {
    // Init logging — respects RUST_LOG env var, defaults to info
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "axeane_automation=info,tower_http=warn".into()),
        )
        .init();

    info!("╔══════════════════════════════════════╗");
    info!("║     Axeane Automation Runner v1.0    ║");
    info!("╚══════════════════════════════════════╝");

    if let Err(e) = run().await {
        error!("Fatal: {}", e);
        // On Windows, keep the window open so user can read the error
        #[cfg(target_os = "windows")]
        {
            eprintln!("\nPress Enter to exit...");
            let mut input = String::new();
            let _ = std::io::stdin().read_line(&mut input);
        }
        std::process::exit(1);
    }
}

async fn run() -> error::Result<()> {
    let config = config::AppConfig::from_exe_dir()?;
    config.validate()?;

    info!("Install dir : {}", config.install_dir.display());
    info!("Backend     : {}", config.backend_url());
    info!("Frontend    : {}", config.frontend_url());

    // 1. Launch Axeane Kompta PWA with CDP port open
    // This replaces manually opening it — the user no longer needs to do this
    let _kompta_process =
        launch_kompta_pwa(&config.kompta_pwa_url, config.kompta_cdp_port)?;

    // Small pause for PWA to initialize before backend starts
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    // 2. Spawn Python backend
    let backend_process = spawn_backend(&config)?;

    // 3. Wait for backend health
    wait_for_backend(&config.health_url(), config.health_timeout_secs).await?;

    // 4. Serve frontend static files in background
    let frontend_out = config.frontend_out_dir.clone();
    let frontend_port = config.frontend_port;
    tokio::spawn(async move {
        if let Err(e) = serve_frontend(frontend_out, frontend_port).await {
            tracing::error!("Frontend server crashed: {}", e);
        }
    });

    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    // 5. Open the Automation Bridge as a standalone Edge app window
    open_app_window(&config.frontend_url()).await?;

    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    info!("App is running. Press Ctrl+C to stop.");
    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    tokio::signal::ctrl_c().await.expect("Failed to listen for Ctrl+C");

    info!("Shutting down...");
    stop_backend(backend_process);
    info!("Goodbye.");

    Ok(())
}
