<#
.SYNOPSIS
    Bundle the FastAPI backend into a single-file PyInstaller executable
    and place it where the Tauri host expects to find its sidecar.

.DESCRIPTION
    The Tauri host (axeane-automation-runner/) declares the Python
    backend in `tauri.conf.json` under `bundle.externalBin` as
    `binaries/python-backend`. Tauri resolves this at build time by
    looking for a file named `python-backend-<host-triple>.exe` (or
    `.exe` on Windows, no extension on Linux/macOS) inside that folder.

    This script:
        1. Resolves the host target triple from `rustc -vV`.
        2. Activates the Python virtual environment in `axeane-filler/`
           if one is present.
        3. Runs `pyinstaller tools/axeane-filler.spec` to produce
           `dist/python-backend(.exe)`.
        4. Copies the artefact to
              axeane-automation-runner/binaries/python-backend-<triple>(.exe)
        5. Verifies the file exists and is non-empty.

.PARAMETER Triple
    Override the host triple. Defaults to the value of `rustc -vV | host:`.

.PARAMETER Clean
    Pass `-Clean` to wipe the `axeane-filler/build/` and
    `axeane-filler/dist/` directories before building.

.EXAMPLE
    PS> .\tools\build_python_sidecar.ps1
    Builds and copies the sidecar for the current host triple.

.EXAMPLE
    PS> .\tools\build_python_sidecar.ps1 -Clean
    Wipes the build artefacts first.
#>

[CmdletBinding()]
param(
    [string]$Triple,
    [switch]$Clean
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# 0. Resolve paths
# ---------------------------------------------------------------------------
$RepoRoot     = Resolve-Path (Join-Path $PSScriptRoot '..')
$BackendDir   = Join-Path $RepoRoot 'axeane-filler'
$SpecFile     = Join-Path (Join-Path $RepoRoot 'tools') 'axeane-filler.spec'
$BinariesDir  = Join-Path (Join-Path $RepoRoot 'axeane-automation-runner') 'binaries'
$DistDir      = Join-Path $BackendDir 'dist'
$BuildDir     = Join-Path $BackendDir 'build'

if (-not (Test-Path $SpecFile)) {
    throw "PyInstaller spec not found: $SpecFile"
}
if (-not (Test-Path $BackendDir)) {
    throw "Backend directory not found: $BackendDir"
}

# ---------------------------------------------------------------------------
# 1. Resolve host triple (rustc -vV | Select-String 'host:')
# ---------------------------------------------------------------------------
if (-not $Triple) {
    $rustc = (Get-Command rustc -ErrorAction SilentlyContinue)
    if (-not $rustc) {
        throw "rustc is not on PATH. Install Rust or pass -Triple explicitly."
    }
    $rustOut = & rustc -vV
    $Triple = ($rustOut | Select-String -Pattern '^host:\s*(\S+)' |
        ForEach-Object { $_.Matches[0].Groups[1].Value }) | Select-Object -First 1
    if (-not $Triple) {
        throw "Could not parse `rustc -vV` output for the host triple."
    }
}
Write-Host "[sidecar] Host triple = $Triple" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# 2. Optional clean
# ---------------------------------------------------------------------------
if ($Clean) {
    foreach ($d in @($BuildDir, $DistDir)) {
        if (Test-Path $d) {
            Write-Host "[sidecar] Removing $d" -ForegroundColor DarkYellow
            Remove-Item -Recurse -Force $d
        }
    }
}

# ---------------------------------------------------------------------------
# 3. Activate the venv (or fall back to system python)
# ---------------------------------------------------------------------------
$Venv = Join-Path $BackendDir 'venv'
$VenvActivate = Join-Path (Join-Path $Venv 'Scripts') 'Activate.ps1'
if (Test-Path $VenvActivate) {
    Write-Host "[sidecar] Activating venv at $Venv" -ForegroundColor Cyan
    . $VenvActivate
} else {
    Write-Host "[sidecar] No venv found, using system Python" -ForegroundColor Yellow
}

# Make sure PyInstaller is installed
$pyinst = python -c "import PyInstaller" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[sidecar] PyInstaller not found - installing..." -ForegroundColor Yellow
    python -m pip install --upgrade pip | Out-Null
    python -m pip install pyinstaller | Out-Null
}

# Make sure the backend runtime requirements are installed (FastAPI,
# uvicorn, etc.). We do not run the dev-only requirements like
# `playwright install` here — that is a runtime step.
if (Test-Path (Join-Path $BackendDir 'requirements.txt')) {
    Write-Host "[sidecar] Installing backend requirements..." -ForegroundColor Cyan
    python -m pip install -r (Join-Path $BackendDir 'requirements.txt')
}

# ---------------------------------------------------------------------------
# 4. Run PyInstaller
# ---------------------------------------------------------------------------
Write-Host "[sidecar] Running pyinstaller..." -ForegroundColor Cyan
Push-Location $BackendDir
try {
    python -m PyInstaller --noconfirm --clean $SpecFile
    if ($LASTEXITCODE -ne 0) {
        throw "pyinstaller exited with code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

# ---------------------------------------------------------------------------
# 5. Locate the produced binary and copy it to binaries/
# ---------------------------------------------------------------------------
$ExeExt = if ($IsWindows -or $env:OS -eq 'Windows_NT') { '.exe' } else { '' }
$SourceExe = Join-Path $DistDir "python-backend$ExeExt"

if (-not (Test-Path $SourceExe)) {
    throw "PyInstaller did not produce the expected artefact: $SourceExe"
}

if (-not (Test-Path $BinariesDir)) {
    New-Item -ItemType Directory -Path $BinariesDir -Force | Out-Null
}

# Tauri requires the file to be named <name>-<triple>[.exe]. Strip the
# .exe before appending the triple, then add the extension back.
$TargetName = "python-backend-$Triple$ExeExt"
$TargetPath = Join-Path $BinariesDir $TargetName

Write-Host "[sidecar] Copying $SourceExe -> $TargetPath" -ForegroundColor Cyan
Copy-Item -Path $SourceExe -Destination $TargetPath -Force

# ---------------------------------------------------------------------------
# 6. Verify
# ---------------------------------------------------------------------------
$size = (Get-Item $TargetPath).Length
if ($size -lt 1MB) {
    Write-Warning "[sidecar] Output file is suspiciously small ($size bytes) - inspect the build log."
}
Write-Host "[sidecar] Done. $TargetName is $('{0:N2}' -f ($size / 1MB)) MB." -ForegroundColor Green

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1. Open axeane-automation-runner/ in your editor."
Write-Host "  2. Run:    cargo tauri dev     (development)"
Write-Host "  3. Run:    cargo tauri build   (release installer)"
