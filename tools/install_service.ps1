<#
.SYNOPSIS
    Install the PyInstaller-bundled `python-backend` sidecar as a
    Windows Service that starts at boot, restarts on crash, and never
    displays a terminal window.

.DESCRIPTION
    The Tauri desktop app expects the FastAPI backend to be reachable
    on http://127.0.0.1:8080. There are two ways to provide that
    backend:

      1. Sidecar (current): the Tauri host spawns the sidecar when
         the window opens and kills it when the window closes. Good
         for development, but the backend has to cold-start every
         time the user opens the app.

      2. Windows Service (this script): the backend runs as a system
         service that starts at boot, restarts on crash, and is
         always available on port 8080 — even when the Tauri app is
         not open. The Tauri app just *connects* to it; it does not
         spawn it.

    This script uses NSSM (the Non-Sucking Service Manager) to
    register the sidecar binary as a service. NSSM is a tiny
    (~300KB) free utility that wraps any executable as a Windows
    service. It is bundled with most Windows admin toolkits and can
    also be downloaded from https://nssm.cc/.

    After running this script:
      * `python-backend-x86_64-pc-windows-msvc.exe` will be installed
        at `C:\Program Files\Axeane\Automation\binaries\` and
        registered as the service "AxeaneAutomationBackend".
      * The service will start automatically on boot and run under
        the `LocalSystem` account.
      * The Tauri app, when launched, will simply `connect` to the
        already-running backend on port 8080 — no spawning, no
        waiting for boot.

.PARAMETER InstallDir
    The directory where the sidecar will live. Defaults to
    `C:\Program Files\Axeane\Automation`.

.PARAMETER ServiceName
    The name of the Windows service. Defaults to
    "AxeaneAutomationBackend".

.PARAMETER Port
    The port the backend listens on. Defaults to 8080.

.PARAMETER Uninstall
    Switch — if set, removes the service instead of installing it.

.EXAMPLE
    PS> .\tools\install_service.ps1
    Installs the sidecar as a Windows service.

.EXAMPLE
    PS> .\tools\install_service.ps1 -Uninstall
    Removes the service.
#>

[CmdletBinding()]
param(
    [string]$InstallDir   = 'C:\Program Files\Axeane\Automation',
    [string]$ServiceName  = 'AxeaneAutomationBackend',
    [int]   $Port         = 8080,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

# ----------------------------------------------------------------------
# 0. Resolve paths
# ----------------------------------------------------------------------
$RepoRoot      = Resolve-Path (Join-Path $PSScriptRoot '..')
$BinariesSrc   = Join-Path $RepoRoot 'axeane-automation-runner' 'binaries'
$ServiceExe    = Join-Path $InstallDir 'binaries' 'python-backend.exe'
$NssmExe       = (Get-Command 'nssm' -ErrorAction SilentlyContinue)?.Source

if (-not $NssmExe) {
    throw "NSSM is not on PATH. Download it from https://nssm.cc/ and put nssm.exe in C:\Windows\System32\."
}

# ----------------------------------------------------------------------
# 1. Uninstall
# ----------------------------------------------------------------------
if ($Uninstall) {
    Write-Host "[service] Removing service '$ServiceName' ..." -ForegroundColor Cyan
    & nssm stop   $ServiceName 2>&1 | Out-Null
    & nssm remove $ServiceName confirm 2>&1 | Out-Null
    Write-Host "[service] Removed." -ForegroundColor Green
    return
}

# ----------------------------------------------------------------------
# 2. Install
# ----------------------------------------------------------------------
if (-not (Test-Path $BinariesSrc)) {
    throw "Sidecar source folder not found: $BinariesSrc`nRun tools\build_python_sidecar.ps1 first."
}

# Find the sidecar binary (any triple).
$SidecarSrc = Get-ChildItem -Path $BinariesSrc -Filter 'python-backend*.exe' -ErrorAction SilentlyContinue |
              Select-Object -First 1
if (-not $SidecarSrc) {
    throw "No 'python-backend*.exe' in $BinariesSrc. Run tools\build_python_sidecar.ps1 first."
}

# Stage the binary in the install dir.
$InstallBinDir = Join-Path $InstallDir 'binaries'
if (-not (Test-Path $InstallBinDir)) {
    New-Item -ItemType Directory -Path $InstallBinDir -Force | Out-Null
}
Write-Host "[service] Copying $($SidecarSrc.Name) -> $ServiceExe" -ForegroundColor Cyan
Copy-Item -Path $SidecarSrc.FullName -Destination $ServiceExe -Force

# Stop any existing instance of the service.
& nssm stop $ServiceName 2>&1 | Out-Null

# Install the service.
Write-Host "[service] Installing '$ServiceName' as a Windows service ..." -ForegroundColor Cyan
& nssm install $ServiceName $ServiceExe | Out-Null
& nssm set   $ServiceName AppParameters "--host 127.0.0.1 --port $Port" | Out-Null
& nssm set   $ServiceName DisplayName "Axeane Kompta Automation Backend" | Out-Null
& nssm set   $ServiceName Description "FastAPI backend for the Axeane Kompta Automation desktop app. Listens on 127.0.0.1:$Port." | Out-Null
& nssm set   $ServiceName Start SERVICE_AUTO_START | Out-Null
& nssm set   $ServiceName Type SERVICE_WIN32_OWN_PROCESS | Out-Null
& nssm set   $ServiceName AppStdout (Join-Path $InstallDir 'backend.log') | Out-Null
& nssm set   $ServiceName AppStderr (Join-Path $InstallDir 'backend.err.log') | Out-Null
& nssm set   $ServiceName AppRotateFiles 1 | Out-Null
& nssm set   $ServiceName AppRotateBytes 10485760 | Out-Null  # 10 MB
& nssm set   $ServiceName AppRestartDelay 5000 | Out-Null

# Start the service.
& nssm start $ServiceName | Out-Null

Start-Sleep -Seconds 2

# Verify the backend is reachable.
$HealthUrl = "http://127.0.0.1:$Port/health"
try {
    $resp = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 5
    if ($resp.StatusCode -eq 200) {
        Write-Host "[service] Backend is up and healthy at $HealthUrl" -ForegroundColor Green
    } else {
        Write-Warning "[service] Backend responded with HTTP $($resp.StatusCode)"
    }
} catch {
    Write-Warning "[service] Backend not yet reachable at $HealthUrl. Check $InstallDir\backend.err.log."
}

Write-Host ""
Write-Host "Service management:" -ForegroundColor Cyan
Write-Host "  Get-Service       $ServiceName"
Write-Host "  Stop-Service      $ServiceName"
Write-Host "  Restart-Service   $ServiceName"
Write-Host "  Uninstall:        .\tools\install_service.ps1 -Uninstall"
