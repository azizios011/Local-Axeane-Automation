Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ============================================================================
# Axeane Automation — Tauri 2 build pipeline
# ============================================================================
#
# What this script does (end to end):
#   1. Build the Next.js static export (frontend/out/).
#   2. Bundle the Python backend into a single-file PyInstaller binary
#      and place it in axeane-automation-runner/binaries/python-backend-<triple>.exe.
#   3. Run `cargo tauri build` to produce the signed installer for the
#      current host platform.
#   4. Copy the installer to <repo>/dist/ for handoff.
#
# Prerequisites:
#   * Node 18+
#   * Rust stable (with `cargo install tauri-cli --version '^2'`)
#   * Python 3.11+ (a venv at axeane-filler/venv/ is recommended)
#   * For MSI: `dotnet tool install --global wix`
# ============================================================================

$RepoRoot    = Resolve-Path "$PSScriptRoot\..\.."
$RunnerDir   = "$RepoRoot\axeane-automation-runner"
$FrontendDir = "$RepoRoot\frontend"
$OutDir      = "$RepoRoot\dist"

function Log($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Die($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# ---- Step 1: Next.js static export ------------------------------------------
Log "Step 1/4 — Building Next.js frontend (static export)..."
Push-Location $FrontendDir
    npm install
    npm run build
    if (-not (Test-Path "out\index.html")) {
        Die "next build did not produce out/index.html. Make sure output: 'export' is set in next.config.ts"
    }
Pop-Location
Log "Frontend build complete (frontend/out/)"

# ---- Step 2: Python sidecar --------------------------------------------------
Log "Step 2/4 — Bundling Python backend as a Tauri sidecar..."
& "$RepoRoot\tools\build_python_sidecar.ps1"
if ($LASTEXITCODE -ne 0) { Die "Sidecar build failed (exit $LASTEXITCODE)" }

# ---- Step 3: Tauri build -----------------------------------------------------
Log "Step 3/4 — Running cargo tauri build..."
Push-Location $RunnerDir
    cargo tauri build
    if ($LASTEXITCODE -ne 0) { Die "cargo tauri build failed (exit $LASTEXITCODE)" }
Pop-Location
Log "Tauri build complete"

# ---- Step 4: Stage installer -------------------------------------------------
Log "Step 4/4 — Staging installer in $OutDir..."
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# Tauri writes the installer(s) to <RunnerDir>/target/release/bundle/.
$BundleRoot = "$RunnerDir\target\release\bundle"
if (Test-Path $BundleRoot) {
    Get-ChildItem -Path $BundleRoot -Recurse -File -Filter "*.msi" |
        Copy-Item -Destination $OutDir -Force
    Get-ChildItem -Path $BundleRoot -Recurse -File -Filter "*.exe" |
        Copy-Item -Destination $OutDir -Force
    Get-ChildItem -Path $BundleRoot -Recurse -File -Filter "*.deb" |
        Copy-Item -Destination $OutDir -Force
    Get-ChildItem -Path $BundleRoot -Recurse -File -Filter "*.AppImage" |
        Copy-Item -Destination $OutDir -Force
    Get-ChildItem -Path $BundleRoot -Recurse -File -Filter "*.dmg" |
        Copy-Item -Destination $OutDir -Force
}

Log ""
Log "Build complete!"
Get-ChildItem -Path $OutDir -File | Format-Table Name, Length -AutoSize
