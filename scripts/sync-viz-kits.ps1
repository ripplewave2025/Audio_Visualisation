# Copy ready-to-automate assets from vendor/ → viz-kits/ready/
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$dirs = @(
  "viz-kits\ready\lib",
  "viz-kits\ready\shaders\wind",
  "viz-kits\ready\shaders\bas-glsl",
  "viz-kits\ready\textures",
  "viz-kits\ready\examples",
  "viz-kits\data\particle-life-models"
)
foreach ($p in $dirs) { New-Item -ItemType Directory -Force -Path $p | Out-Null }

function Cp($src, $dst) {
  if (Test-Path $src) { Copy-Item $src $dst -Force -Recurse; Write-Host "  $src" }
  else { Write-Warning "missing $src" }
}

Write-Host "Syncing libs..."
Cp "vendor\three.proton\build\three.proton.js" "viz-kits\ready\lib\"
Cp "vendor\three.proton\build\three.proton.min.js" "viz-kits\ready\lib\"
Cp "vendor\three-bas\dist\bas.js" "viz-kits\ready\lib\"
Cp "vendor\three-bas\dist\bas.module.js" "viz-kits\ready\lib\"
Cp "vendor\three-bas\dist\bas.min.js" "viz-kits\ready\lib\"
Cp "vendor\webgl-wind\dist\wind-gl.js" "viz-kits\ready\lib\"

Write-Host "Syncing shaders..."
Cp "vendor\webgl-wind\src\shaders\*" "viz-kits\ready\shaders\wind\"
Cp "vendor\three-bas\src\glsl\*" "viz-kits\ready\shaders\bas-glsl\"

Write-Host "Syncing textures / examples / models..."
Cp "vendor\three.proton\example\img\dot.png" "viz-kits\ready\textures\"
Cp "vendor\three.proton\example\img\snow.png" "viz-kits\ready\textures\"
Cp "vendor\particle-life\particle_life.html" "viz-kits\ready\examples\"
Cp "vendor\particle-life\particle_life_3d.html" "viz-kits\ready\examples\"
Cp "vendor\particle-life\particle_life.py" "viz-kits\ready\examples\"
Cp "vendor\particle-life\particle_life\bin\interesting_models\*" "viz-kits\data\particle-life-models\"

Write-Host "Sync complete → viz-kits/ready"
