"""Axeane Kompta Filler — FastAPI backend.

When invoked as a script (e.g. by `python main.py` or by the
PyInstaller-bundled `python-backend` sidecar) it parses `--host` /
`--port` flags and starts uvicorn.

When imported as a module (e.g. by `uvicorn main:app`) it just exposes
the `app` object — useful for development and for the original
launcher's `python -m uvicorn main:app` invocation.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import formulas, extraction, automation, health

log = logging.getLogger("axeane.backend")

app = FastAPI(
    title="Axeane Kompta Filler",
    description="PDF invoice extraction + PWA automation backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(formulas.router)
app.include_router(extraction.router)
app.include_router(automation.router)


@app.get("/")
def root():
    return {"message": "Axeane Automation Backend is running"}


def _parse_args() -> argparse.Namespace:
    """Read --host / --port from the command line.

    Defaults match the Tauri sidecar contract (see
    `axeane-automation-runner/tauri.conf.json` and
    `src/sidecar.rs`).
    """
    p = argparse.ArgumentParser(
        prog="python-backend",
        description="Axeane Kompta Filler — sidecar for the Tauri host",
    )
    p.add_argument("--host", default=os.environ.get("AXEANE_HOST", "127.0.0.1"))
    p.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("AXEANE_PORT", "8080")),
    )
    p.add_argument(
        "--log-level",
        default=os.environ.get("AXEANE_LOG_LEVEL", "info"),
    )
    # PyInstaller onefile extraction: the runtime unpacks the bundle
    # here. Allow overriding the destination for sandboxed environments.
    p.add_argument(
        "--runtime-dir",
        default=os.environ.get("AXEANE_RUNTIME_DIR"),
        help="Optional override for the PyInstaller _MEIPASS extraction dir",
    )
    return p.parse_args()


def main() -> int:
    args = _parse_args()

    # When running as a PyInstaller --onefile bundle the entry-point must
    # switch the CWD to a writable location, otherwise relative imports
    # of `data/formulas.json` and friends fail on a locked-down machine.
    if getattr(sys, "frozen", False):
        # We are inside a PyInstaller bundle.
        runtime_dir = Path(args.runtime_dir) if args.runtime_dir else None
        if runtime_dir is None:
            # Pick a stable, writable location next to the executable.
            runtime_dir = Path(sys.executable).resolve().parent / "python-backend-data"
        runtime_dir.mkdir(parents=True, exist_ok=True)
        os.chdir(runtime_dir)
        log.info("PyInstaller bundle — runtime dir is %s", runtime_dir)
    else:
        # Running as a normal Python script: stay in the backend dir.
        backend_dir = Path(__file__).resolve().parent
        os.chdir(backend_dir)

    try:
        import uvicorn
    except ImportError:
        log.error(
            "uvicorn is not installed. Run `pip install -r requirements.txt` "
            "in the axeane-filler/ venv."
        )
        return 1

    log.info("Starting Axeane Kompta Filler on %s:%d", args.host, args.port)
    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        log_level=args.log_level,
        access_log=False,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
