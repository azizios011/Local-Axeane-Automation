// Tiny placeholder sidecar. Real builds use PyInstaller to bundle
// `axeane-filler/main.py` and replace this binary.

fn main() {
    eprintln!(
        "[axeane-sidecar-stub] No Python backend bundled with this build.\n\
         Run `tools\\build_python_sidecar.ps1` to produce a real sidecar,\n\
         then replace `binaries\\python-backend-<triple>.exe`."
    );
    std::process::exit(1);
}
