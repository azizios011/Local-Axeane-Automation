//! Glue between the Tauri `setup` hook and the Python sidecar.
//!
//! Tauri runs the `setup` closure on a worker thread before the first
//! window is shown. We use that window to spawn the sidecar and wait
//! for its health probe to come up green — by the time the webview
//! opens, `http://127.0.0.1:8080/health` already returns 200 OK.

use std::sync::Arc;

use parking_lot::Mutex;
use tauri::AppHandle;
use tracing::{error, info};

use crate::config::AppConfig;
use crate::sidecar;

/// Snapshot of the runtime configuration shared with every Tauri hook.
///
/// `SetupState` is registered on the `AppHandle` via `.manage()` so any
/// future event handler can resolve the sidecar config without
/// re-reading the install directory.
#[derive(Clone)]
pub struct SetupState {
    pub config: AppConfig,
    /// Optional lock so the very first webview-load can wait for the
    /// sidecar to be ready (avoids a flash of "Backend offline" UI).
    pub ready: Arc<Mutex<bool>>,
}

impl SetupState {
    pub fn new(config: AppConfig) -> Self {
        Self {
            config,
            ready: Arc::new(Mutex::new(false)),
        }
    }
}

/// Entrypoint used by `lib::run` → `tauri::Builder::setup()`.
///
/// `state` is the `tauri::State<SetupState>` we `.manage()`-d earlier.
/// `app` is the live `AppHandle`.
pub fn spawn_sidecar_and_wait(
    state: tauri::State<'_, SetupState>,
    app: AppHandle,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let config = state.config.clone();

    // Run the blocking sidecar spawn on a dedicated thread so the
    // Tauri setup thread is not held up longer than necessary.
    let app_clone = app.clone();
    let ready_handle = state.ready.clone();
    std::thread::Builder::new()
        .name("axeane-sidecar-spawn".into())
        .spawn(move || match sidecar::spawn_and_wait(&app_clone, &config) {
            Ok(()) => {
                *ready_handle.lock() = true;
                info!("Setup: sidecar is ready, webview may now load data");
            }
            Err(e) => {
                error!("Setup: sidecar failed to start: {e:#}");
                // We deliberately do not bail out: the UI should still
                // open so the user can see a meaningful error toast.
            }
        })?;

    Ok(())
}

/// Helper used by the (optional) JS bridge to know when the sidecar is
/// up. The Tauri command is registered in `lib::run`.
pub fn is_ready(state: &tauri::State<'_, SetupState>) -> bool {
    *state.ready.lock()
}
