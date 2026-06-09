mod src { 
    pub mod config; 
    pub mod error; 
    pub mod launcher; 
} 
 
use src::config::AppConfig; 
use src::launcher::{backend, browser, frontend, health}; 
use tracing::{error, info}; 
 
#[tokio::main] 
async fn main() { 
    // Init logging 
    tracing_subscriber::fmt() 
        .with_env_filter( 
            tracing_subscriber::EnvFilter::try_from_default_env() 
                .unwrap_or_else(|_| "axeane_automation=info".into()), 
        ) 
        .init(); 
 
    info!("Axeane Automation Runner starting..."); 
 
    if let Err(e) = run().await { 
        error!("Fatal error: {}", e); 
        std::process::exit(1); 
    } 
} 
 
async fn run() -> src::error::Result<()> { 
    // 1. Load and validate config 
    let config = AppConfig::from_exe_dir()?; 
    config.validate()?; 
    info!("Install dir: {}", config.install_dir.display()); 
 
    // 2. Spawn Python backend 
    let backend_process = backend::spawn_backend(&config)?; 
 
    // 3. Wait for backend to be healthy 
    health::wait_for_backend(&config.health_url(), config.health_timeout_secs).await?; 
 
    // 4. Spawn frontend static server in background task 
    let frontend_out = config.frontend_out_dir.clone(); 
    let frontend_port = config.frontend_port; 
    tokio::spawn(async move { 
        if let Err(e) = frontend::serve_frontend(frontend_out, frontend_port).await { 
            error!("Frontend server error: {}", e); 
        } 
    }); 
 
    // 5. Open browser 
    browser::open_browser(&config.frontend_url()).await?; 
 
    info!("Axeane Automation is running."); 
    info!("  Frontend: {}", config.frontend_url()); 
    info!("  Backend:  {}", config.backend_url()); 
 
    // 6. Wait for Ctrl+C then shut down cleanly 
    tokio::signal::ctrl_c() 
        .await 
        .expect("Failed to listen for Ctrl+C"); 
 
    info!("Shutting down..."); 
    backend::stop_backend(backend_process); 
    info!("Done."); 
 
    Ok(()) 
} 
