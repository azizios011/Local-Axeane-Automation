mod config; 
mod error; 
mod launcher; 

use config::AppConfig; 
use launcher::{spawn_backend, stop_backend, open_browser, serve_frontend, wait_for_backend}; 
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
    // 1. Load and validate installation config 
    let config = AppConfig::from_exe_dir()?; 
    config.validate()?; 

    info!("Install dir : {}", config.install_dir.display()); 
    info!("Backend     : {}", config.backend_url()); 
    info!("Frontend    : {}", config.frontend_url()); 
 
    // 2. Spawn embedded Python / uvicorn backend 
    let backend_process = spawn_backend(&config)?; 
 
    // 3. Poll health endpoint until backend is ready 
    wait_for_backend(&config.health_url(), config.health_timeout_secs).await 
        .inspect_err(|_| { 
            // Kill the backend if health check fails so we don't leave orphan processes 
            info!("Health check failed — killing backend process"); 
        })?; 
 
    // 4. Serve Next.js static export in a background task 
    let frontend_out = config.frontend_out_dir.clone(); 
    let frontend_port = config.frontend_port; 
    tokio::spawn(async move { 
        if let Err(e) = serve_frontend(frontend_out, frontend_port).await { 
            error!("Frontend server crashed: {}", e); 
        } 
    }); 
 
    // Small pause so frontend server is bound before we open the browser 
    tokio::time::sleep(std::time::Duration::from_millis(300)).await; 
 
    // 5. Open the app in the default browser 
    open_browser(&config.frontend_url()).await?; 

    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"); 
    info!("App is running. Press Ctrl+C to stop."); 
    info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"); 

    // 6. Block until Ctrl+C, then shut down cleanly 
    tokio::signal::ctrl_c() 
        .await 
        .expect("Failed to listen for Ctrl+C"); 

    info!("Shutting down..."); 
    stop_backend(backend_process); 
    info!("Goodbye."); 

    Ok(()) 
} 
