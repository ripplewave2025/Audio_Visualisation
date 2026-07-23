# DJ Caat — Phonk Hyper-Fluid Fractal Visualizer

## Concept

Instagram-ready Phonk / Drift Phonk music visualizer: a mathematically driven
**4D Mandelbulb** raymarched in GLSL, living inside a **GPU fluid / neon mist**
void. Audio analysis (Python Librosa + browser WebAudio fallback) drives every
major visual channel. Users upload **audio**, **video**, and **images**, control
them on a simple multi-track timeline, and export **9:16 / 1:1 / 16:9** for Reels.

## Stack

| Layer | Tech |
|-------|------|
| DSP backend | Python 3.11+, Librosa, NumPy, SciPy, SoundFile, FastAPI, Uvicorn |
| Frontend | Vite, Three.js r160+, lil-gui |
| Shaders | Raw GLSL fragment (raymarch SDF + fluid density) |
| Media | Web Audio API, HTMLVideoElement → texture, image textures |
| Export | canvas + MediaRecorder (WebM) with aspect letterboxing |

## Directory tree

```
Music_Visualisation/
  docs/
    ARCHITECTURE.md
    PARAMETER_BUS.md
    RUNBOOK.md
  backend/
    requirements.txt
    app/
      main.py              # FastAPI: health, upload, analyze
      dsp/
        engine.py          # Librosa DSP core
        __init__.py
  frontend/
    package.json
    index.html
    vite.config.js
    src/
      main.js              # App bootstrap
      styles.css
      shaders/
        fractal.frag.glsl  # Mandelbulb DE + lighting + CA
        fractal.vert.glsl
        fluid.frag.glsl    # Curl-noise mist density (optional pass)
      three/
        renderer.js        # WebGLRenderer + full-screen quad
        post.js            # Bloom / simple post stack
      audio/
        engine.js          # Transport + analyser + DSP metrics blend
      media/
        timeline.js        # Audio / video / image layers + UI
        compositor.js      # Layer order: video → fractal → overlays
      controls/
        parameterBus.js    # Single source of truth (FL-style)
        gui.js             # lil-gui binding
      export/
        instagram.js       # Aspect presets + capture
  README.md
```

## DSP → visual pipeline

```
Audio file
  ├─ Browser: WebAudio AnalyserNode (live FFT, fallback)
  └─ Python: POST /analyze → frame-synced JSON metrics
        bands: bass808, mid, high, pitchHz, bpm, beatPhase,
               onset808, hatTransient, sidechain
              │
              ▼
        AudioEngine.uniforms  ──►  ParameterBus smooth/scale
              │
              ▼
        GLSL uniforms (u_bass808, u_pitch, u_hat, u_bpmPhase, …)
              │
              ▼
        Raymarch DE morph + HSL + fluid force + camera groove
```

### Frequency maps (product contract)

| Band | Hz | Visual |
|------|-----|--------|
| 808 sub | 20–60 | Fractal fold / space bend, screen shake, chromatic aberration |
| Melody / cowbell | 400–2000 | HSL hue shift, bloom emission |
| Hi-hat / transients | > ~6 kHz | Fluid velocity / mist burst |
| BPM | global | `u_time` phase lock, camera pull on 1/4, zoom off-beat |

## Media timeline

Tracks (bottom → top composite):

1. **Video** background (optional) — opacity, blend, trim, mute, speed  
2. **Fractal** WebGL pass (always) — full canvas  
3. **Image overlays** — position, scale, opacity, multiple layers  

Audio is the master clock for transport when present.

## Instagram export

- Presets: `9:16` (1080×1920), `1:1` (1080×1080), `16:9` (1920×1080)  
- Canvas is letterboxed to preset; MediaRecorder captures canvas stream (+ optional audio mix)  
- Fallback: frame dump via `canvas.toDataURL` for stills  

## Run (Windows pwsh)

```powershell
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000

# Frontend (second terminal)
cd frontend
npm install
npm run dev
```

Open the Vite URL (default `http://localhost:5173`). Backend CORS allows the Vite origin.
