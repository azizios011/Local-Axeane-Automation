pub mod backend;
pub mod browser;
pub mod frontend;
pub mod health;

pub use backend::{spawn_backend, stop_backend};
pub use browser::{launch_kompta_pwa, open_app_window, relaunch_detached};
pub use frontend::serve_frontend;
pub use health::wait_for_backend;
