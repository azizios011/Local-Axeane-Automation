# `binaries/` — Tauri External Binaries (Sidecars)

This folder is the drop-zone for the **PyInstaller-bundled Python backend** that
Tauri ships as an external sidecar.

When `tauri build` runs, it scans `tauri.conf.json` → `bundle.externalBin` and
copies any matching file in this folder (after appending the target triple)
into the final installer:

```
binaries/
└── python-backend-x86_64-pc-windows-msvc.exe   ← drop your PyInstaller build here
```

The naming convention is **`<name>-<triple>[.exe]`** where `<triple>` matches
the Rust target you are building for. Run `rustc -vV` to discover your host
triple.

---

## How to produce the binary

From the repo root:

```powershell
# 1. (One-time) install PyInstaller in the Python venv you use for the backend
pip install pyinstaller

# 2. Build the single-file backend bundle
.\tools\build_python_sidecar.ps1
```

The script will:

1. Resolve the host triple (e.g. `x86_64-pc-windows-msvc`).
2. Run `pyinstaller tools/axeane-filler.spec` against the `axeane-filler/`
   directory (which contains `main.py` and the FastAPI app).
3. Copy the resulting `dist/python-backend(.exe)` into this folder, renamed
   to `python-backend-<triple>(.exe)`.
4. Verify the file exists and is non-empty.

After the copy you can launch the Tauri app in dev or build a release
installer — Tauri will pick the file up automatically because the file
name pattern matches `externalBin`.

---

## Why a sidecar and not `python -m`?

- **Single binary, no installer Python dance.** End-users don't need Python
  on their machine.
- **Clean process lifetime.** The Tauri host owns the child and can
  guarantee it dies when the window closes (no orphan uvicorn workers).
- **Code signing.** The bundle can sign the sidecar the same way it signs
  the Tauri binary.

See `tools/axeane-filler.spec` and `tools/build_python_sidecar.ps1` for the
exact build pipeline.
