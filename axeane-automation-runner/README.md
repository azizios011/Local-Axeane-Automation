# Axeane Automation Runner 

Rust binary that bootstraps the full Axeane Kompta Automation stack into a single self-contained Windows process. 

## What it does 

1. Spawns the embedded Python (uvicorn) backend on port 8000 
2. Waits for the backend to be healthy 
3. Serves the Next.js static export on port 3000 via axum 
4. Opens `http://localhost:3000` in the default browser 
5. On Ctrl+C — kills the backend cleanly 

## Project structure 

``` 
axeane-automation-runner/ 
├── main.rs              ← entry point 
├── Cargo.toml 
├── src/ 
│   ├── config.rs        ← install dir resolution + path validation 
│   ├── error.rs         ← unified error type 
│   └── launcher/ 
│       ├── mod.rs 
│       ├── backend.rs   ← spawn/stop Python uvicorn 
│       ├── frontend.rs  ← axum static file server 
│       ├── browser.rs   ← open default browser 
│       └── health.rs    ← HTTP health polling 
├── bin/                 ← reserved for future CLI tools 
└── installer/ 
    ├── axeane.wxs       ← WiX v4 MSI definition 
    └── build.ps1        ← full build pipeline script 
``` 

## Building 

```powershell 
# From repo root: 
.\axeane-automation-runner\installer\build.ps1 
``` 

Output: `dist\Axeane-Automation-Setup.msi` 

## Requirements (build machine only) 

- Rust stable (`rustup`) 
- Node.js 18+ 
- WiX v4: `dotnet tool install --global wix` 
- Internet access on first build (downloads Python 3.11 embeddable) 

## Runtime requirements (end user machine) 

None. Everything is bundled in the MSI. 
