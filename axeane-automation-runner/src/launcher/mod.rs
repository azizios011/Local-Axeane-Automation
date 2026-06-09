pub mod backend;
pub mod browser;
pub mod frontend;
pub mod health;

pub use backend::{spawn_backend, stop_backend};
pub use browser::{open_app_window, launch_kompta_pwa};
pub use frontend::serve_frontend;
pub use health::wait_for_backend;
