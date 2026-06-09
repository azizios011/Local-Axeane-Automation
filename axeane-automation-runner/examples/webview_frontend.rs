//! Standalone example: serve the Next.js frontend (`frontend/out/`) over a
//! local HTTP server, then open a native WebView2 window that renders it.
//!
//! Run from the `axeane-automation-runner/` directory:
//!
//! ```bash
//! # 1. Build the Next.js static export (only needed once / after changes)
//! cd ../frontend && npm run build
//!
//! # 2. Run this example
//! cd ../axeane-automation-runner
//! cargo run --example webview_frontend
//! ```
//!
//! A native OS window will pop up showing the frontend. The window uses
//! `public/process.png` as its icon. Close the window (or hit Ctrl+C in
//! the terminal) to exit.

#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

use std::net::SocketAddr;
use std::path::PathBuf;

use axum::Router;
use axum::body::Body;
use axum::extract::Request;
use axum::http::{StatusCode, header};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use mime_guess::mime;
use tao::window::{Icon, WindowBuilder};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

/// Port the embedded static file server listens on.
const FRONTEND_PORT: u16 = 3000;

/// Resolve a path that lives in the `axeane-automation-runner/` crate
/// root (where `Cargo.toml` lives), regardless of where `cargo run` was
/// invoked from.
fn runner_root_path(rel: &str) -> PathBuf {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    PathBuf::from(manifest_dir).join(rel)
}

/// Find the `frontend/out` directory regardless of where `cargo run` is
/// invoked from. We walk up from `CARGO_MANIFEST_DIR` (i.e. the runner
/// crate) and from the current working directory until we find it.
fn locate_frontend_out() -> PathBuf {
    // 1. Try relative to the manifest dir of this crate.
    let candidate = runner_root_path("../frontend/out");
    if candidate.join("index.html").exists() {
        return candidate;
    }

    // 2. Try relative to the current working directory.
    if let Ok(cwd) = std::env::current_dir() {
        for ancestor in cwd.ancestors() {
            let p = ancestor.join("frontend").join("out");
            if p.join("index.html").exists() {
                return p;
            }
        }
    }

    panic!(
        "Could not locate `frontend/out/index.html`. Run `npm run build` inside `frontend/` first."
    );
}

/// Load the application icon from `public/process.png` and decode it into
/// the RGBA buffer that `tao::window::Icon` requires.
///
/// If the icon file is missing or malformed we log a warning and return
/// `None` — the window will then fall back to the OS default icon, which
/// keeps the example runnable in any state.
fn load_app_icon() -> Option<Icon> {
    let icon_path = runner_root_path("public/process.png");
    if !icon_path.exists() {
        eprintln!(
            "Icon not found at {} — falling back to OS default",
            icon_path.display()
        );
        return None;
    }

    let img = match image::open(&icon_path) {
        Ok(img) => img.into_rgba8(),
        Err(e) => {
            eprintln!("Failed to decode {}: {} — falling back to OS default", icon_path.display(), e);
            return None;
        }
    };

    let (width, height) = img.dimensions();
    let rgba = img.into_raw();
    match Icon::from_rgba(rgba, width, height) {
        Ok(icon) => {
            println!("Loaded app icon from {} ({}x{})", icon_path.display(), width, height);
            Some(icon)
        }
        Err(e) => {
            eprintln!("Icon::from_rgba failed: {} — falling back to OS default", e);
            None
        }
    }
}

/// Middleware that sets a correct `Content-Type` on responses served by
/// `ServeDir`. Without this, browsers can guess wrong for some assets
/// (notably `.js` modules and `.json` files), which breaks the SPA.
async fn set_content_type(req: Request, next: Next) -> Response {
    let path = req.uri().path().to_owned();
    let mut resp = next.run(req).await;
    if let Some(ext) = std::path::Path::new(&path)
        .extension()
        .and_then(|s| s.to_str())
    {
        if let Some(mime_type) = mime_guess::from_ext(ext).first_raw() {
            // Only override when the server didn't already set one.
            if !resp.headers().contains_key(header::CONTENT_TYPE) {
                resp.headers_mut().insert(
                    header::CONTENT_TYPE,
                    mime_type.parse().unwrap_or_else(|_| {
                        mime::TEXT_PLAIN
                            .to_string()
                            .parse()
                            .expect("valid header value")
                    }),
                );
            }
        }
    }
    resp
}

/// 404 page so the SPA's client-side router doesn't blow up.
async fn not_found() -> Response {
    (
        StatusCode::NOT_FOUND,
        [(header::CONTENT_TYPE, mime::TEXT_HTML_UTF_8.to_string())],
        Body::from("<h1>404</h1>"),
    )
        .into_response()
}

/// Start the static file server bound to `127.0.0.1:FRONTEND_PORT` in the
/// background. Returns once the listener is bound and serving.
fn start_static_server(frontend_dir: PathBuf) {
    let serve_dir = ServeDir::new(&frontend_dir)
        .append_index_html_on_directories(true)
        .not_found_service(tower::service_fn(|_req| async {
            Ok::<_, std::convert::Infallible>(not_found().await)
        }));

    let app = Router::new()
        .fallback_service(serve_dir)
        .layer(middleware::from_fn(set_content_type))
        .layer(CorsLayer::permissive());

    let addr = SocketAddr::from(([127, 0, 0, 1], FRONTEND_PORT));
    let listener =
        std::net::TcpListener::bind(addr).expect("Failed to bind static server socket");
    // Put the listener into non-blocking mode so tokio can drive it.
    listener
        .set_nonblocking(true)
        .expect("Failed to set non-blocking");
    let listener =
        tokio::net::TcpListener::from_std(listener).expect("Failed to convert TcpListener");
    println!(
        "Serving frontend from {} on http://{}",
        frontend_dir.display(),
        addr
    );

    // Spawn the server on the current runtime. It lives for the lifetime
    // of the process because the runtime is converted to background below.
    tokio::spawn(async move {
        if let Err(e) = axum::serve(listener, app).await {
            eprintln!("Static server crashed: {}", e);
        }
    });
}

fn main() {
    // Resolve the frontend directory once at startup so we fail fast with
    // a clear error message if it has not been built yet.
    let frontend_dir = locate_frontend_out();
    println!("Frontend directory: {}", frontend_dir.display());

    // Load the app icon (from public/process.png) once at startup.
    let app_icon = load_app_icon();

    // Build a small multi-threaded tokio runtime to host the HTTP server.
    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .worker_threads(2)
        .build()
        .expect("Failed to build tokio runtime");

    // Start the static server from within the runtime so `tokio::spawn` works.
    rt.block_on(async {
        start_static_server(frontend_dir);
        // Yield so the spawned task gets a chance to start listening
        // before the webview fires its first HTTP request.
        tokio::task::yield_now().await;
    });
    // Convert the runtime to a background runtime so the server task
    // continues running for the lifetime of the process (the webview
    // event loop is now driving the main thread).
    rt.shutdown_background();

    // The `tao` event loop must run on the *main* thread on macOS / Windows.
    // We open the webview there and keep it alive until the user closes
    // the window.
    use tao::event::{Event, WindowEvent};
    use tao::event_loop::{ControlFlow, EventLoop};

    let event_loop = EventLoop::new();
    let mut window_builder = WindowBuilder::new()
        .with_title("Axeane Automation Bridge — Frontend in WebView")
        .with_inner_size(tao::dpi::LogicalSize::new(1280.0, 800.0));
    if let Some(ref icon) = app_icon {
        // `with_window_icon` is only available with the `rwh_06` feature
        // (already enabled in Cargo.toml). It sets the taskbar / window
        // icon on Windows and Linux; macOS uses the bundled .icns file
        // for the app icon and the window icon for the title bar.
        window_builder = window_builder.with_window_icon(Some(icon.clone()));
    }
    let window = window_builder
        .build(&event_loop)
        .expect("Failed to build window");

    let url = format!("http://localhost:{}", FRONTEND_PORT);
    let _webview = wry::WebViewBuilder::new()
        .with_url(&url)
        .build(&window)
        .expect("Failed to build webview");

    println!("WebView opened at {}. Close the window to exit.", url);

    event_loop.run(move |event, _target, control_flow| {
        *control_flow = ControlFlow::Wait;
        if let Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
        } = event
        {
            println!("Window closed — exiting.");
            *control_flow = ControlFlow::ExitWithCode(0);
        }
    });
}
