# Vendor source kits (cloned snapshots)

Shallow clones of open-source **math · geometry · particles · physics · light** WebGL projects.  
Nested `.git` folders were removed so this is a plain asset tree (easy to zip/automate).

| Folder | Upstream | License | Best for |
|--------|----------|---------|----------|
| `particle-life/` | [hunar4321/particle-life](https://github.com/hunar4321/particle-life) | MIT | Attraction/repulsion “artificial life” particle math |
| `three.proton/` | [drawcall/three.proton](https://github.com/drawcall/three.proton) | MIT | Full 3D particle engine (emitters, forces, zones, meshes) |
| `webgl-wind/` | [mapbox/webgl-wind](https://github.com/mapbox/webgl-wind) | ISC | GPU particle field advection + light trails (field physics) |
| `three-bas/` | [zadvorsky/three.bas](https://github.com/zadvorsky/three.bas) | MIT | Buffer geometry animation, prefabs, GPGPU, audio-visual examples |

## Automation path

Prefer the curated copies under **`../viz-kits/`** (libs, shaders, textures, recipes, manifest).  
Re-sync anytime with:

```powershell
.\scripts\sync-viz-kits.ps1
```

Re-clone from GitHub:

```powershell
.\scripts\clone-viz-vendor.ps1
```

## Attribution

Keep upstream LICENSE/LICENCE files when redistributing. See each folder’s README.
