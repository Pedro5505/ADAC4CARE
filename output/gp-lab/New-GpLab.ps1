param([string]$Destination = '')
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if (-not $Destination) { $Destination = Join-Path $repo 'work\gp-user-lab' }
$target = [IO.Path]::GetFullPath($Destination)
if (-not $target.StartsWith($repo + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Choose a new directory inside this ADAC4CARE workspace.'
}
if (Test-Path -LiteralPath $target) { throw "Destination already exists: $target. Choose a new folder; existing work is never overwritten." }
New-Item -ItemType Directory -Path "$target\frontend", "$target\backend" | Out-Null
$frontendFolders = 'app','components','data','db','docs','drizzle','hooks','lib','public','tests','types'
foreach ($folder in $frontendFolders) {
    Copy-Item -LiteralPath (Join-Path "$repo\frontend" $folder) -Destination "$target\frontend" -Recurse
}
$frontendFiles = 'package.json','package-lock.json','tsconfig.json','vite.config.ts','vite-env.d.ts','next.config.ts','components.json','.oxlintrc.json','.oxfmtrc.json','.env.example'
foreach ($file in $frontendFiles) {
    Copy-Item -LiteralPath (Join-Path "$repo\frontend" $file) -Destination "$target\frontend"
}
New-Item -ItemType Directory -Path "$target\frontend\.openai" | Out-Null
Copy-Item -LiteralPath "$repo\frontend\.openai\hosting.json" -Destination "$target\frontend\.openai\hosting.json"
Copy-Item -LiteralPath "$PSScriptRoot\wrangler.lab.json" -Destination "$target\frontend\wrangler.lab.json"
Copy-Item -LiteralPath "$repo\frontend\.env.example" -Destination "$target\frontend\.env.local"
foreach ($folder in 'apps','config','requirements','tests') {
    $source = Join-Path "$repo\backend" $folder
    foreach ($file in Get-ChildItem -LiteralPath $source -File -Recurse) {
        if ($file.FullName -match '\\__pycache__\\') { continue }
        $relative = $file.FullName.Substring(("$repo\backend\").Length)
        $out = Join-Path "$target\backend" $relative
        New-Item -ItemType Directory -Path (Split-Path $out) -Force | Out-Null
        Copy-Item -LiteralPath $file.FullName -Destination $out
    }
}
foreach ($file in 'manage.py','pytest.ini','.env.example') {
    Copy-Item -LiteralPath (Join-Path "$repo\backend" $file) -Destination "$target\backend"
}
Copy-Item -LiteralPath "$repo\backend\.env.example" -Destination "$target\backend\.env"
Write-Output "Created isolated lab scaffold: $target"
Write-Output 'No installed dependencies, existing environment secrets, database records or Git metadata were copied.'
