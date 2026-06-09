# `binaries/python-backend-<triple>.exe` placeholder

The file is *intentionally missing*. Run `tools/build_python_sidecar.ps1`
to produce the real PyInstaller-bundled sidecar. The host build will fail
with:

```
resource path `binaries\python-backend-x86_64-pc-windows-msvc.exe` doesn't exist
```

until the sidecar is in place — this is by design (Tauri refuses to
ship a build that does not include every declared `externalBin`).

For quick local sanity-checks you can drop a tiny dummy `python-backend-x86_64-pc-windows-msvc.exe`
into this folder, e.g.:

```powershell
"echo axeane sidecar stub" | Out-File binaries\python-backend-x86_64-pc-windows-msvc.exe
```

This is **not** a real backend and must be replaced by the PyInstaller
artefact before `cargo tauri dev` or `cargo tauri build` is run for
real.
