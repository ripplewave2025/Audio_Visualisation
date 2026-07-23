# Viz kits — math · geometry · physics · particles · light

Curated **ready/** assets + **manifest.json** so you (or an agent) can automate new visual modes without hunting the full vendor trees.

```
viz-kits/
  manifest.json          ← machine catalog (ids, paths, audio hooks)
  recipes/               ← human + agent playbooks
  ready/
    lib/                 ← drop-in JS (proton, bas, wind-gl)
    shaders/             ← GLSL chunks (wind, bas eases/splines)
    textures/            ← particle sprites
    examples/            ← particle-life HTML/Python demos
  data/
    particle-life-models/← attraction-matrix presets (DNA, worm, …)
```

Full upstream sources live in `../vendor/` (same kits, complete trees).

## Quick use

| Goal | Start here |
|------|------------|
| Particle life math | `ready/examples/particle_life*.html` + mode **`life`** in the app |
| Emitters / gravity / zones | `ready/lib/three.proton*.js` + `vendor/three.proton/example/` |
| Field advection particles | `ready/shaders/wind/` + `ready/lib/wind-gl.js` |
| Geometry buffer animation | `ready/lib/bas.module.js` + `ready/shaders/bas-glsl/` |
| Crystal / GPGPU / audio-visual demos | `vendor/three-bas/examples/*` |

## App modes wired today

- **`life`** — GPU particle-life style forces (from particle-life math), audio-reactive  
- **`geometry`** — light 3D SDF geometry + orbiting neon particles (BAS-inspired look)

## Automate a new mode

See [recipes/ADD_MODE.md](recipes/ADD_MODE.md). Agents should:

1. Read `manifest.json`  
2. Pick a kit with `status: library-ready`  
3. Copy GLSL/JS patterns into `frontend/src/shaders/` + register in `parameterBus` / `renderer` / `gui`  

## Re-sync after editing vendor

```powershell
.\scripts\sync-viz-kits.ps1
```
