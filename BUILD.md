# Building the Tauri Desktop App

This document is the **end-to-end build guide** for the Axeane Kompta
Automation **Tauri 2 desktop application**. It supersedes the old
README.md references to `axeane-automation-runner` being a standalone
launcher — that crate is now a proper Tauri host.

```
┌──────────────────────┐         ┌──────────────────────┐
│   Next.js SPA        │         │  Python sidecar      │
│  (frontend/out/)     │         │  (PyInstaller onefile)│
│  Next.js 15 + RSC    │         │  FastAPI + Playwright│
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           │  Tauri asset:// protocol       │  localhost:8080
           │                                │
           ▼                                ▼
     ┌────────────────────────────────────────────┐
     │  Tauri 2 host (axeane-automation-runner)   │
     │  ┌──────────────┐   ┌──────────────────┐   │
     │  │ webview      │   │ tauri-plugin-    │   │
     │  │ (WebView2)   │   │ shell sidecar()  │   │
     │  └──────────────┘   └──────────────────┘   │
     └────────────────────────────────────────────┘
```

The frontend **never** spawns Python or opens a browser — it only
issues HTTP requests to the sidecar on `http://127.0.0.1:8080`.

---

## Prerequisites

| Tool         | Version | Why                                      |
|--------------|---------|------------------------------------------|
| Node.js      | 18+     | Build the Next.js static export          |
| Rust stable  | latest  | Build the Tauri host                     |
| Python       | 3.11+   | Run the FastAPI backend before bundling  |
| PyInstaller  | 6+      | Bundle Python into a single .exe         |
| Tauri CLI    | 2.x     | `cargo install tauri-cli --version "^2"` |
| WiX          | 4       | (Windows only) MSI packaging             |

---

## One-time setup

```powershell
# 1. Install Tauri CLI
cargo install tauri-cli --version "^2"

# 2. Create the Python venv and install runtime + build deps
cd axeane-filler
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install pyinstaller
deactivate
cd ..

# 3. Install frontend deps
cd frontend
npm install
cd ..
```

---

## Development

```powershell
# Step 1: bundle the Python sidecar (one-time, then re-run on backend changes)
.\tools\build_python_sidecar.ps1

# Step 2: launch the Tauri host in dev mode
cd axeane-automation-runner
cargo tauri dev
```

* The Tauri window opens, the Python sidecar starts on
  `http://127.0.0.1:8080`, and the frontend connects to it.
* Frontend hot-reload works out of the box (Tauri reloads the webview
  on file changes).
* Logs from the sidecar stream into the same console as the Rust host
  thanks to `tauri::tracing`.

---

## Production build

```powershell
# From the repo root
.\axeane-automation-runner\installer\build.ps1
```

This runs:

1. `npm run build`  →  `frontend/out/`
2. `tools/build_python_sidecar.ps1`  →  `axeane-automation-runner/binaries/python-backend-<triple>.exe`
3. `cargo tauri build`  →  installers in `axeane-automation-runner/target/release/bundle/`
4. Copies the installers to `dist/` for handoff.

---

## Frontend ↔ Sidecar contract

* The frontend reads `NEXT_PUBLIC_API_URL` (default `http://localhost:8080`)
  and calls it via the existing `ApiClient` in `frontend/lib/api.ts`.
* The sidecar binds to `127.0.0.1:8080` (configured in
  `src/sidecar.rs::spawn_and_wait`).
* CORS is wide-open on the FastAPI side (see `axeane-filler/main.py`)
  because the webview is a local origin and the Tauri asset protocol
  is treated as `null`.

---

## What happens when the user closes the window

`src/sidecar.rs::terminate` is called from the Tauri
`on_window_event` hook on `WindowEvent::CloseRequested` and from the
`RunEvent::ExitRequested` hook. It:

1. `child.kill()`s the Python process.
2. `child.wait()`s for it to actually exit.
3. Aborts the stdout/stderr reader task.
4. Removes the `%APPDATA%\Axeane\Automation\backend.pid` file.

**No orphan `python-backend.exe` is left behind**, and any pre-existing
PID from a previous crash is reaped on the next launch.

---

## File map

| Path                                              | Purpose                                  |
|---------------------------------------------------|------------------------------------------|
| `frontend/next.config.ts`                         | SSG config (`output: 'export'`, ...)     |
| `frontend/.env.example`                           | `NEXT_PUBLIC_API_URL` default            |
| `axeane-filler/main.py`                           | FastAPI entry point with `--host/--port` |
| `tools/axeane-filler.spec`                        | PyInstaller spec                         |
| `tools/build_python_sidecar.ps1`                  | PyInstaller build + copy                 |
| `axeane-automation-runner/Cargo.toml`             | Tauri 2 + plugin-shell                   |
| `axeane-automation-runner/tauri.conf.json`        | Window / externalBin / frontendDist      |
| `axeane-automation-runner/capabilities/default.json` | shell:allow-execute scope             |
| `axeane-automation-runner/build.rs`               | Tauri build hook                         |
| `axeane-automation-runner/src/main.rs`            | Binary entry                             |
| `axeane-automation-runner/src/lib.rs`             | Tauri runtime + window event hooks       |
| `axeane-automation-runner/src/sidecar.rs`         | Sidecar spawn / log / terminate          |
| `axeane-automation-runner/src/setup.rs`           | Tauri `setup` hook glue                  |
| `axeane-automation-runner/src/config.rs`          | Install dir / port resolution            |
| `axeane-automation-runner/src/error.rs`           | Unified `AppError` enum                  |
| `axeane-automation-runner/binaries/README.md`     | Sidecar drop-zone docs                   |
| `axeane-automation-runner/icons/README.md`        | Icon drop-zone docs                      |
| `axeane-automation-runner/installer/build.ps1`    | End-to-end installer build               |
