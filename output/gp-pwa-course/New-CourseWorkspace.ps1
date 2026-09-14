param([ValidateRange(1,8)][int]$Week = 1, [string]$Destination = '')
$ErrorActionPreference = 'Stop'
if (-not $Destination) { $Destination = Join-Path (Get-Location) "work\gp-pwa-week-$Week" }
$target = [IO.Path]::GetFullPath($Destination)
if (Test-Path -LiteralPath $target) { throw "Folder exists: $target. Choose a new folder to preserve your work." }
New-Item -ItemType Directory -Path $target | Out-Null
Copy-Item -LiteralPath "$PSScriptRoot\source\frontend" -Destination $target -Recurse
Copy-Item -LiteralPath "$PSScriptRoot\source\backend" -Destination $target -Recurse
foreach ($n in 2,6,7) {
  if ($n -gt $Week) { continue }
  $overlay = Join-Path $PSScriptRoot ('extensions\week-{0:D2}' -f $n)
  foreach ($file in Get-ChildItem -LiteralPath $overlay -Recurse -File) {
    $out = Join-Path $target $file.FullName.Substring($overlay.Length + 1)
    New-Item -ItemType Directory -Path (Split-Path $out) -Force | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $out -Force
  }
}
Copy-Item -LiteralPath "$PSScriptRoot\wrangler.lab.json" -Destination "$target\frontend\wrangler.lab.json"
Copy-Item -LiteralPath "$target\frontend\.env.example" -Destination "$target\frontend\.env.local"
Copy-Item -LiteralPath "$target\backend\.env.example" -Destination "$target\backend\.env"
Write-Output "Created week $Week reference checkpoint at $target"
Write-Output 'Install dependencies and apply local D1 migrations as described in Week 1.'
