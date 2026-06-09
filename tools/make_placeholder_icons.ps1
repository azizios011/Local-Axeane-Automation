Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap 256, 256
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

# Axeane brand-ish blue background
$bg = [System.Drawing.Color]::FromArgb(255, 30, 80, 140)
$g.Clear($bg)

# Big white "A" in the centre
$font = New-Object System.Drawing.Font('Segoe UI', 160, [System.Drawing.FontStyle]::Bold)
$brush = [System.Drawing.Brushes]::White
$fmt   = New-Object System.Drawing.StringFormat
$fmt.Alignment     = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect  = New-Object System.Drawing.RectangleF 0, 0, 256, 256
$g.DrawString('A', $font, $brush, $rect, $fmt)
$g.Dispose()

# Save PNG
$pngPath = Join-Path $PSScriptRoot '..\axeane-automation-runner\icons\icon.png'
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Wrote $pngPath" -ForegroundColor Green

# Save ICO
$icoPath = Join-Path $PSScriptRoot '..\axeane-automation-runner\icons\icon.ico'
$ico = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$fs  = [System.IO.File]::Create($icoPath)
$ico.Save($fs)
$fs.Close()
Write-Host "Wrote $icoPath" -ForegroundColor Green

# Save a few extra PNG sizes that Tauri 2 picks up automatically
foreach ($size in @(32, 128)) {
    $resized = New-Object System.Drawing.Bitmap $size, $size
    $rg = [System.Drawing.Graphics]::FromImage($resized)
    $rg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $rg.DrawImage($bmp, 0, 0, $size, $size)
    $rg.Dispose()
    $extraPath = Join-Path $PSScriptRoot "..\axeane-automation-runner\icons\${size}x${size}.png"
    $resized.Save($extraPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Wrote $extraPath" -ForegroundColor Green
}

$bmp.Dispose()
Write-Host "Done." -ForegroundColor Cyan
