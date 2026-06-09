Set-StrictMode -Version Latest 
$ErrorActionPreference = "Stop" 
 
$RepoRoot       = Resolve-Path "$PSScriptRoot\..\.." 
$RunnerDir      = "$RepoRoot\axeane-automation-runner" 
$FrontendDir    = "$RepoRoot\frontend" 
$BackendDir     = "$RepoRoot\axeane-filler" 
$BuildDir       = "$RunnerDir\build" 
$PythonDir      = "$BuildDir\python" 
$ReleaseExe     = "$RunnerDir\target\release\axeane-automation.exe" 
$OutDir         = "$RepoRoot\dist" 
 
$PythonVersion  = "3.11.9" 
$PythonZipUrl   = "https://www.python.org/ftp/python/$PythonVersion/python-$PythonVersion-embed-amd64.zip" 
$PythonZipPath  = "$BuildDir\python-embed.zip" 
$PipUrl         = "https://bootstrap.pypa.io/get-pip.py" 
 
function Log($msg) { Write-Host "==> $msg" -ForegroundColor Cyan } 
function Die($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 } 
 
# Step 1: Build Next.js static export 
Log "Building Next.js frontend (static export)..." 
Push-Location $FrontendDir 
    npm ci 
    npm run build 
    if (-not (Test-Path "out\index.html")) { 
        Die "next build did not produce out/index.html. Make sure output: export is set in next.config.js" 
    } 
Pop-Location 
Log "Frontend build complete" 
 
# Step 2: Build Rust binary 
Log "Building Rust binary (release)..." 
Push-Location $RunnerDir 
    cargo build --release 
    if (-not (Test-Path $ReleaseExe)) { 
        Die "Rust build failed - exe not found at $ReleaseExe" 
    } 
Pop-Location 
Log "Rust build complete" 
 
# Step 3: Download + prepare embedded Python 
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null 
 
if (-not (Test-Path "$PythonDir\python.exe")) { 
    Log "Downloading Python $PythonVersion embeddable..." 
    Invoke-WebRequest -Uri $PythonZipUrl -OutFile $PythonZipPath 
    Expand-Archive -Path $PythonZipPath -DestinationPath $PythonDir -Force 
    Remove-Item $PythonZipPath 
 
    $pthFile = Get-ChildItem "$PythonDir\*._pth" | Select-Object -First 1 
    if ($pthFile) { 
        $content = Get-Content $pthFile.FullName -Raw 
        $content = $content -replace '#import site', 'import site' 
        Set-Content $pthFile.FullName $content 
        Log "Patched $($pthFile.Name) to enable site-packages" 
    } 
 
    Log "Installing pip into embedded Python..." 
    Invoke-WebRequest -Uri $PipUrl -OutFile "$BuildDir\get-pip.py" 
    & "$PythonDir\python.exe" "$BuildDir\get-pip.py" --no-warn-script-location 
    Remove-Item "$BuildDir\get-pip.py" 
} 
Log "Python ready at $PythonDir" 
 
# Step 4: Install backend dependencies 
Log "Installing Python dependencies into embedded Python..." 
$pipArgs = @(
    "-m", "pip", "install",
    "-r", "$BackendDir\requirements.txt",
    "--target", "$PythonDir\Lib\site-packages",
    "--no-warn-script-location",
    "--quiet"
)
& "$PythonDir\python.exe" @pipArgs
 
Log "Installing Playwright browser (chromium)..." 
& "$PythonDir\python.exe" -m playwright install chromium 
Log "Dependencies installed" 
 
# Step 5: Build MSI with WiX v4 
Log "Building MSI installer..." 
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null 
 
$wixArgs = @(
    "build", "$RunnerDir\installer\axeane.wxs",
    "-o", "$OutDir\Axeane-Automation-Setup.msi",
    "-ext", "WixToolset.UI.wixext"
)
wix @wixArgs
 
if (-not (Test-Path "$OutDir\Axeane-Automation-Setup.msi")) { 
    Die "WiX build failed - MSI not produced" 
} 
 
Log "Build complete!" 
Log "Installer: $OutDir\Axeane-Automation-Setup.msi" 
