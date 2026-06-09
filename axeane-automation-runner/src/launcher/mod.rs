//! Compatibility re-exports for the original launcher-style API.
//!
//! Most of the original `launcher::*` helpers have been replaced by the
//! dedicated [`crate::sidecar`] module (which uses `tauri-plugin-shell`
//! to spawn the Python sidecar) and by Tauri's own webview (which
//! replaces the manual `wry` window).
//!
//! This module is kept around so existing examples and the dev-time
//! preview server can still be built. The high-level `spawn_backend`,
//! `open_app_window` etc. are no longer called by `lib::run` but are
//! still useful for unit tests and headless debugging.

pub mod backend;
pub mod browser;
pub mod frontend;
pub mod health;

pub use backend::{spawn_backend, stop_backend};
pub use browser::{launch_kompta_pwa, open_app_window, relaunch_detached};
pub use frontend::serve_frontend;
pub use health::wait_for_backend;
