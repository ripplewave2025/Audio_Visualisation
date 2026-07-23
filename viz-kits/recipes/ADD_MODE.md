# Recipe: add a visual mode from a kit

## Checklist

1. **Pick kit** from `viz-kits/manifest.json` (`id`, `ready` paths, `audioHooks`).
2. **Decide path**
   - *GLSL-only* (preferred for Instagram export FPS): implement in `frontend/src/shaders/<mode>.frag.glsl`
   - *Engine* (Proton/BAS): load lib from `viz-kits/ready/lib/` in a dedicated scene module under `frontend/src/three/modes/`
3. **Register**
   - `parameterBus.js` — `visualMode` enum + mode params + `toShaderUniforms`
   - `three/renderer.js` — import frag, add to `MODE_FRAG`
   - `controls/gui.js` — folder + `applyFolderVisibility`
   - `index.html` — mode button
   - `manifest.json` — set `visualModeId` + `status: integrated`
4. **Audio map** — reuse existing sample fields: `bass808`, `onset808`, `pitchHz`, `hat`, `beatPhase`, `bpm`, `sidechain`.
5. **Performance** — keep particle loops ≤ ~80 in fragment, or use Points + BAS for higher counts.
6. **Verify** — `npm run build`, hard-refresh, switch modes without stopping audio.

## Kit-specific notes

### particle-life
Core idea: N species, matrix `M[i][j]` attraction force, integrate velocity.  
Presets in `viz-kits/data/particle-life-models/`.  
Reference: `ready/examples/particle_life.html`.

### three.proton
Classic emitters: Rate → Velocity → Gravity → Color.  
Examples: `vendor/three.proton/example/spriterender-*.html`.  
Needs Three.js; prefer mesh/sprite renders for phonk neon.

### webgl-wind
Ping-pong particle positions in FBO; sample wind texture.  
Shaders: `ready/shaders/wind/*.glsl`.  
Swap wind texture for FFT band texture for audio-reactive fields.

### three-bas
Prefab buffer geometry + timeline GLSL eases in `ready/shaders/bas-glsl/`.  
Best refs: `examples/audio_visual`, `points_animation`, `crystal_triangles`, `gpgpu`.
