# Re-clone upstream math/geometry/physics/particle kits into vendor/
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
New-Item -ItemType Directory -Force -Path "vendor" | Out-Null

$repos = @(
  @{ name = "particle-life"; url = "https://github.com/hunar4321/particle-life.git" },
  @{ name = "three.proton"; url = "https://github.com/drawcall/three.proton.git" },
  @{ name = "webgl-wind"; url = "https://github.com/mapbox/webgl-wind.git" },
  @{ name = "three-bas"; url = "https://github.com/zadvorsky/three.bas.git" }
)

foreach ($r in $repos) {
  $dest = Join-Path "vendor" $r.name
  if (Test-Path $dest) {
    Write-Host "removing old $dest"
    Remove-Item -Recurse -Force $dest
  }
  Write-Host "cloning $($r.name)..."
  git clone --depth 1 --single-branch $r.url $dest
  $gitDir = Join-Path $dest ".git"
  if (Test-Path $gitDir) { Remove-Item -Recurse -Force $gitDir }
  Write-Host "OK $($r.name) (detached snapshot)"
}

& "$PSScriptRoot\sync-viz-kits.ps1"
Write-Host "Done. See vendor/README.md and viz-kits/manifest.json"
