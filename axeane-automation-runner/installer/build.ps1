Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ============================================================================
# Axeane Automation — full build pipeline
# ============================================================================
#
# Steps
#   1. Build the Next.js static export  → frontend/out/
#   2. Bundle python-backend via PyInstaller → binaries/python-backend-<triple>.exe
#   3. Run `cargo tauri build`  (produces the MSI/NSIS installer via WiX)
#   4. Stage installer artefacts in <repo>/dist/
#
# The WiX installer produced in step 3 handles:
#   a) Copying all files to Program Files
#   b) Registering + starting the Windows Service (python-backend.exe)
#   c) Polling /health until the service is up
#   d) Launching the Tauri webview app (async, after InstallFinalize)
#
# Prerequisites
#   * Node 18+  (frontend)
#   * Rust stable + `cargo install tauri-cli --version '^2'`
#   * Python 3.11+ with axeane-filler/venv/ initialised
#   * dotnet tool install --global wix   (WiX v4)
# ============================================================================

$RepoRoot    = Resolve-Path "$PSScriptRoot\..\.."
$RunnerDir   = "$RepoRoot\axeane-automation-runner"
$FrontendDir = "$RepoRoot\frontend"
$OutDir      = "$RepoRoot\dist"

function Log  { param($msg) Write-Host "==> $msg" -ForegroundColor Cyan  }
function Step { param($n,$total,$msg) Write-Host "`n[$n/$total] $msg" -ForegroundColor Yellow }
function Die  { param($msg) Write-Host "`nERROR: $msg" -ForegroundColor Red; exit 1 }
function Ok   { param($msg) Write-Host "    OK  $msg" -ForegroundColor Green }

$TotalSteps = 4

# ============================================================================
# Step 1 — Next.js static export
# ============================================================================
Step 1 $TotalSteps "Building Next.js frontend (static export)..."
Push-Location $FrontendDir
    Log "npm install"
    npm install
    if ($LASTEXITCODE -ne 0) { Die "npm install failed" }

    Log "npm run build"
    npm run build
    if ($LASTEXITCODE -ne 0) { Die "npm run build failed" }

    if (-not (Test-Path "out\index.html")) {
        Die "next build did not produce out/index.html.`n" +
            "Make sure output: 'export' is set in next.config.ts"
    }
Pop-Location
Ok "frontend/out/ is ready"

# ============================================================================
# Step 2 — Python sidecar (PyInstaller)
# ============================================================================
Step 2 $TotalSteps "Bundling Python backend as a PyInstaller sidecar..."
Log "Running tools\build_python_sidecar.ps1"
& "$RepoRoot\tools\build_python_sidecar.ps1"
if ($LASTEXITCODE -ne 0) { Die "Sidecar build failed (exit $LASTEXITCODE)" }

# Explicit verification before passing control to Tauri
$rustOut = & rustc -vV
$Triple = ($rustOut | Select-String -Pattern '^host:\s*(\S+)' | ForEach-Object { $_.Matches[0].Groups[1].Value }) | Select-Object -First 1
$SidecarFile = Join-Path $RunnerDir "binaries\python-backend-$Triple.exe"

if (-not (Test-Path $SidecarFile)) {
    Die "Sidecar binary not found at $SidecarFile. WiX will fail to bundle the service."
}
Ok "Sidecar is ready: $(Split-Path $SidecarFile -Leaf)"

# ============================================================================
# Step 3 — Tauri build (MSI generation)
# ============================================================================
Step 3 $TotalSteps "Running cargo tauri build (WiX v4)..."
Push-Location $RunnerDir
    Log "cargo tauri build"
    cargo tauri build
    if ($LASTEXITCODE -ne 0) { Die "cargo tauri build failed" }
Pop-Location
Ok "Tauri build complete"

# ============================================================================
# Step 4 — Stage installers
# ============================================================================
Step 4 $TotalSteps "Staging installer artefacts in $OutDir..."
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

$BundleRoot = "$RunnerDir\target\release\bundle"
if (Test-Path $BundleRoot) {
    Get-ChildItem -Path $BundleRoot -Recurse -File -Include "*.msi", "*.exe", "*.deb", "*.AppImage", "*.dmg" |
        Copy-Item -Destination $OutDir -Force
}

Log ""
Log "Build complete! Staged artefacts:"
Get-ChildItem -Path $OutDir -File | Select-Object Name, @{Name="Size(MB)";Expression={"{0:N2}" -f ($_.Length / 1MB)}} | Format-Table -AutoSize

Log ""
Log "MSI INSTALL ORDER:" -ForegroundColor Green
Log "  1. InstallFiles           (Copy to Program Files)"
Log "  2. CA_InstallService      (sc.exe create AxeaneAutomationBackend)"
Log "  3. CA_StartService        (net start)"
Log "  4. CA_WaitForHealth       (Poll /health for 30s)"
Log "  5. CA_LaunchApp           (Open webview app)"
