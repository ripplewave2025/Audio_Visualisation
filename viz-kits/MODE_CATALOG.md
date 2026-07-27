# Visual mode catalog — sources & how to grow

The app uses a **fullscreen GLSL** architecture (Shadertoy-style), not heavy Three.js scene graphs. That keeps Instagram 9:16 export at 30–60 FPS.

## Best upstream ecosystems (what we studied)

| Source | Why it matters | How we use it |
|--------|----------------|---------------|
| [Shadertoy](https://www.shadertoy.com/) | Best-in-class full-screen math art | Patterns: plasma, warp, kaleido, voronoi |
| [three.js examples](https://threejs.org/examples/) | Particles, post, compute | Inspiration; we keep pure fragment for perf |
| [The Book of Shaders](https://thebookofshaders.com/) | Domain fold, noise, cells | Kaleido / voronoi / noise helpers |
| [hunar4321/particle-life](https://github.com/hunar4321/particle-life) | Force-matrix artificial life | Mode `life` + vendor snapshot |
| [drawcall/three.proton](https://github.com/drawcall/three.proton) | Emitter particle engine | `vendor/three.proton` for future emitter mode |
| [mapbox/webgl-wind](https://github.com/mapbox/webgl-wind) | GPU field advection | `vendor/webgl-wind` shaders for future wind mode |
| [zadvorsky/three.bas](https://github.com/zadvorsky/three.bas) | Buffer geometry animation | Geometry mode + `viz-kits/ready/shaders/bas-glsl` |

Full trees: `vendor/`. Ready copies: `viz-kits/ready/`.

## Modes in the app (dropdown)

See `frontend/src/modes/catalog.js` — single source of truth.

### Signature / Space
- fractal, singularity, earth

### Particles / Math
- particles, life, geometry, scope, voronoi

### Classic / Abstract
- tunnel, spectrum, lattice, rings, matrix, ripple
- kaleido, plasma, warp, aurora, liquid

## Add a new mode (5 minutes)

1. Create `frontend/src/shaders/my_mode.frag.glsl`  
   Use shared uniforms: `uTime, uResolution, uQuality, uBass808, uOnset808, uHat, uBeatPhase, uSidechain, uHueBase, uSaturation, uBloom, uFxIntensity, uFxScale, uFxDetail, uFxSymmetry`
2. Register in `frontend/src/modes/catalog.js`
3. Import + map in `frontend/src/three/renderer.js` → `MODE_FRAG`
4. If it needs unique knobs, add params + a gui folder; else set `guiFolder: 'fx'`

Audio context is never recreated on switch. Lazy compile keeps startup fast.
