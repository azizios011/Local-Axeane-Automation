# Axeane Automation Runner — Tauri 2 host

This crate is the **Tauri 2 desktop host** of the Axeane Kompta
Automation platform. It bundles:

* the Next.js static export (UI) as a `asset://`-loaded webview, and
* a Python FastAPI sidecar (`binaries/python-backend-<triple>.exe`)
  spawned by `tauri-plugin-shell` and killed on window close.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Tauri 2 host (this crate, axeane-automation-runner.exe)            │
│                                                                      │
│   ┌──────────────────┐      HTTP localhost:8080                       │
│   │  Tauri webview   │  ◀────────────────────────▶  python-backend.exe │
│   │  (Next.js SPA)   │                                  (sidecar)    │
│   └──────────────────┘                                                │
│           ▲                                                            │
│           │  WindowEvent::CloseRequested                              │
│           ▼                                                            │
│   sidecar::terminate()  ── kills python-backend.exe (no orphans)     │
└──────────────────────────────────────────────────────────────────────┘
```

The frontend (Next.js) **never** spawns Python and **never** opens a
browser — it only talks HTTP to `http://127.0.0.1:8080`.

---

## Source layout

```
src/
├── main.rs              ← tiny entry point, calls lib::run
├── lib.rs               ← tauri::Builder, window event hooks
├── config.rs            ← install dir + port resolution
├── error.rs             ← unified AppError enum
├── sidecar.rs           ← Python sidecar lifecycle + log capture
├── setup.rs             ← glue between tauri::Builder::setup() and sidecar
└── launcher/            ← legacy launcher-style helpers (kept for tests)
    ├── backend.rs       ← deprecated — raw `python -m uvicorn` (dev only)
    ├── frontend.rs      ← axum static file server (dev preview)
    ├── health.rs        ← FastAPI /health poller
    └── browser.rs       ← Edge --app= launcher (still used for PWA CDP)
```

## Tauri configuration files

```
tauri.conf.json         ← product metadata, window, externalBin, frontendDist
capabilities/default.json  ← shell:allow-execute scope for the sidecar
build.rs                ← calls tauri_build::build()
icons/                  ← window / installer icons
binaries/               ← sidecar drop zone (see binaries/README.md)
```

## Building

### One-time setup

```powershell
# 1. Install Tauri CLI
cargo install tauri-cli --version "^2"

# 2. Install PyInstaller into the backend venv
cd axeane-filler
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install pyinstaller
deactivate
cd ..
```

### Build the sidecar

```powershell
.\tools\build_python_sidecar.ps1
```

This produces `axeane-automation-runner/binaries/python-backend-<triple>.exe`.

### Run in dev mode

```powershell
cd axeane-automation-runner
cargo tauri dev
```

The webview opens against the live Next.js HMR server. Hot-reload works
for the frontend. Rust changes trigger a host rebuild.

### Build a release installer

```powershell
# From the repo root — this orchestrates every step
.\axeane-automation-runner\installer\build.ps1
```

Output goes to `dist/`:
* Windows → `.msi` (and an unsigned `.exe` for portability)
* macOS   → `.dmg` / `.app`
* Linux   → `.deb` / `.AppImage`

---

## Why a sidecar (and not `python -m`)

* **Single binary distribution.** End-users do not need Python on
  their machine.
* **Clean process lifetime.** The Tauri host *owns* the child and
  guarantees it is killed on `WindowEvent::CloseRequested` and on
  `RunEvent::ExitRequested` (see `src/sidecar.rs::terminate`).
* **Code signing.** The sidecar is signed the same way as the host
  binary, so AV/EDR software does not flag it.
* **Hermetic state.** `main.py` switches its CWD to a stable,
  writable directory inside the bundle so the FastAPI app can read
  `data/formulas.json` etc. without depending on the user's working
  directory.

---

## How the front-end ↔ sidecar bridge works

* The Tauri webview loads the static export from
  `frontendDist: "../frontend/out"` (see `tauri.conf.json`).
* `NEXT_PUBLIC_API_URL` defaults to `http://localhost:8080`
  (see `frontend/.env.example`).
* The Rust `setup` hook calls
  `sidecar::spawn_and_wait(&app, &config)` which:
    1. Invokes `app.shell().sidecar("binaries/python-backend")`.
    2. Streams `stdout`/`stderr` into the `tracing` pipeline.
    3. Polls `http://127.0.0.1:8080/health` until OK.
* On `WindowEvent::CloseRequested` the host calls
  `sidecar::terminate(&config)` which calls `child.kill()` and removes
  the PID file. **No orphan `python-backend.exe` is left behind.**
