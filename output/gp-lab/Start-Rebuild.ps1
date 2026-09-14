param([string]$Destination = '')
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if (-not $Destination) { $Destination = Join-Path $repo 'work\gp-user-lab' }
$lab = [IO.Path]::GetFullPath($Destination)
if (-not $lab.StartsWith($repo + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected lab path.' }
if (-not (Test-Path -LiteralPath "$lab\frontend\package.json")) { throw 'Run New-GpLab.ps1 first.' }
$reference = Join-Path $lab 'reference'
if (Test-Path -LiteralPath $reference) { throw 'Rebuild already started. Your saved reference will not be overwritten.' }
$files = @(
    'lib\prescriber-chart.ts',
    'lib\chart-access.ts', 'lib\chart-db.ts', 'lib\chart-server.ts',
    'app\api\prescriber-chart\route.ts',
    'hooks\use-prescriber-chart.ts',
    'components\gp-medication-table.tsx', 'components\prescriber-signature.tsx',
    'app\medication-charts\page.tsx'
)
foreach ($file in $files) {
    $source = [IO.Path]::GetFullPath((Join-Path "$lab\frontend" $file))
    $destination = [IO.Path]::GetFullPath((Join-Path "$reference\frontend" $file))
    if (-not $source.StartsWith("$lab\frontend\", [StringComparison]::OrdinalIgnoreCase) -or
        -not $destination.StartsWith("$reference\", [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe target.' }
    if (-not (Test-Path -LiteralPath $source)) { throw "Missing scaffold file: $source" }
}
foreach ($file in $files) {
    $source = Join-Path "$lab\frontend" $file
    $destination = Join-Path "$reference\frontend" $file
    New-Item -ItemType Directory -Path (Split-Path $destination) -Force | Out-Null
    Move-Item -LiteralPath $source -Destination $destination
}
Write-Output 'Nine GP implementation files moved into the lab reference folder.'
Write-Output 'Rebuild them in steps (2)-(9). The reference and original project remain available.'
