Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$FrontendDir = Join-Path $RepoRoot 'frontend'

Write-Host "[frontend] Building Next.js static export in $FrontendDir ..." -ForegroundColor Cyan
Push-Location $FrontendDir
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
    if (-not (Test-Path "out\index.html")) {
        throw "next build did not produce out/index.html. Make sure output: 'export' is set in next.config.ts"
    }
} finally {
    Pop-Location
}
Write-Host "[frontend] Build complete: frontend/out/" -ForegroundColor Green
