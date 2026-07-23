# Verification report — DJ Caat Phonk Visualizer

Date: 2026-07-22  
Mode: full build + verify

## Runtime checks

| Check | Result | Evidence |
|-------|--------|----------|
| Frontend Vite production build | **PASS** | `npm run build` → exit 0, `dist/` emitted |
| Python DSP analyze (synthetic 2s Phonk-ish WAV) | **PASS** | `bpm≈161.5`, frames include `bass808,onset808,pitchHz,hatTransient,sidechain,beatPhase` |
| FastAPI `GET /health` | **PASS** | `{"status":"ok","service":"dj-caat-phonk-dsp"}` |
| FastAPI `POST /analyze` | **PASS** | returned `analysis_id`, `n_frames=87`, full frame keys |

## Requirement checks (code evidence)

### 1. `dsp-808-pitch-bpm` — PASS

- `backend/app/dsp/engine.py`: band energy 20–`cross_low`, `librosa.onset.onset_strength` on sub, `librosa.pyin` 400–2000 Hz, high-band flux hats, `librosa.beat.beat_track` + beat phase, sidechain envelope.
- Exposed via `POST /analyze` (`backend/app/main.py`) and consumed in `frontend/src/audio/engine.js` (backend metrics + WebAudio fallback).

### 2. `glsl-mandelbulb-fluid` — PASS

- `frontend/src/shaders/fractal.frag.glsl`: `mandelbulbDE`, `domainFold` (sin/square/tri/abs), `curlNoise` mist, chromatic aberration, 808 shake, pitch HSL, BPM camera, sidechain scale.
- Deep math comments in-shader.

### 3. `threejs-wrapper` — PASS

- `frontend/src/three/renderer.js`: WebGLRenderer, fullscreen quad, ShaderMaterial, per-frame `toShaderUniforms` + video texture underlay.

### 4. `media-audio-video-images` — PASS

- Audio: `AudioEngine.loadFile` + transport in `main.js`.
- Video: `MediaTimeline.loadVideo` + opacity/speed/mute.
- Images: `addImage` overlays with x/y/scale/opacity.
- Audio master clock sync for video (`syncFromAudio`).

### 5. `parameter-bus` — PASS

- `frontend/src/controls/parameterBus.js` + `gui.js` + `docs/PARAMETER_BUS.md`.
- FFT smooth, crossovers, sidechain, fold formula, FOV, warp, presets in localStorage.

### 6. `instagram-export` — PASS

- `frontend/src/export/instagram.js`: `ASPECT_PRESETS` 9:16 / 1:1 / 16:9, aspect-locked canvas, MediaRecorder WebM, PNG still.

## Score

**6 / 6 requirements passed** (pre- and post-runtime).

## How to run

```powershell
# Terminal 1
cd backend
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend
npm run dev
```

Open http://localhost:5173 — fractal idles with a demo pulse until you upload audio.
