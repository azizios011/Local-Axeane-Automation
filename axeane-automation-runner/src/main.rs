// Hide the Windows console window in release — this is a GUI subsystem
// application. All logs are written to a file in %APPDATA% so users can
// still diagnose issues.
//
// The whole Tauri lifecycle lives in `lib::run` so it can also be
// reused from examples / integration tests.

#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

fn main() {
    axeane_automation_runner::run();
}
