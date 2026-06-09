# -*- mode: python ; coding: utf-8 -*-
# =============================================================================
# PyInstaller spec file for the Axeane Kompta Filler backend.
#
# Used by `tools/build_python_sidecar.ps1` to produce the single-file
# executable that `tauri-plugin-shell` launches as an external sidecar.
#
# The output is renamed to `python-backend[-<triple>].exe` and dropped
# into `axeane-automation-runner/binaries/`, which is exactly what the
# `bundle.externalBin` entry in `tauri.conf.json` expects.
# =============================================================================

import sys
from pathlib import Path

block_cipher = None

# -- Onefile / onedir switch ----------------------------------------------------
# Onefile is preferred for a Tauri sidecar (single .exe next to the host
# binary), but if you want faster startup you can flip to COLLECT instead
# of EXE and ship the resulting directory.
ONEFILE = True

# -- Source root ----------------------------------------------------------------
# This .spec file lives in <repo>/tools/ and the Python source lives in
# <repo>/axeane-filler/.
ROOT = Path(SPECPATH).resolve().parent  # <repo>
SRC = ROOT / "axeane-filler"

# Hidden imports — anything imported dynamically (string-based imports,
# plugin discovery, etc.) must be listed explicitly so PyInstaller can
# find it. Add to this list as you add new services.
HIDDEN_IMPORTS = [
    "routers",
    "routers.health",
    "routers.formulas",
    "routers.extraction",
    "routers.automation",
    "services",
    "services.csv_importer",
    "services.formula_engine",
    "services.llm_client",
    "services.pdf_extractor",
    "services.pwa_filler",
    "models",
    "storage",
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "fastapi",
    "starlette",
    "pydantic",
    "pydantic_settings",
    "httpx",
    "pdfplumber",
    "playwright",
    "playwright.sync_api",
    "playwright.async_api",
    # multipart for file uploads
    "python_multipart",
]

# Data files (relative to SRC). These are bundled next to the binary so
# that `Path("data/formulas.json").exists()` works inside the PyInstaller
# runtime.
datas = [
    (str(SRC / "data"),    "data"),
    (str(SRC / "storage"), "storage"),
]

# Optional: include the prompt / config files that the LLM client reads.
for optional in ("config.py", "DOM_SELECTORS.md", "SELECTOR_UPDATE.md"):
    p = SRC / optional
    if p.exists():
        datas.append((str(p), "."))

# -- Analysis (PyInstaller collects the imports) -------------------------------
a = Analysis(
    [str(SRC / "main.py")],
    pathex=[str(SRC)],
    binaries=[],
    datas=datas,
    hiddenimports=HIDDEN_IMPORTS,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Things we definitely do not need in a 100MB+ already bundle.
        "tkinter",
        "matplotlib",
        "numpy.tests",
        "scipy",
        "pandas",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# -- Build ----------------------------------------------------------------------
if ONEFILE:
    exe = EXE(
        pyz,
        a.scripts,
        a.binaries,
        a.zipfiles,
        a.datas,
        [],
        name="python-backend",
        debug=False,
        bootloader_ignore_signals=False,
        strip=False,
        upx=True,
        upx_exclude=[],
        runtime_tmpdir=None,
        console=True,           # show stdout in the log file
        disable_windowed_traceback=False,
        argv_emulation=False,
        target_arch=None,
        codesign_identity=None,
        entitlements_file=None,
    )
else:
    exe = COLLECT(
        pyz,
        a.scripts,
        a.binaries,
        a.zipfiles,
        a.datas,
        strip=False,
        upx=True,
        upx_exclude=[],
        name="python-backend",
    )
