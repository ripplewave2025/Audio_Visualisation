# DJ Caat — Phonk Hyper-Fluid Fractal

Instagram-ready **Phonk / Drift Phonk** music visualizer with **4 visual modes**:

| Mode | Look |
|------|------|
| **Phonk Fractal** | 4D Mandelbulb + GPU fluid mist |
| **Sci-Fi Particles** | Neon trails, 808 explosions, attract/repel |
| **Dark Earth** | Orbital planet, fresnel atmosphere, night lights, debris ring |
| **Cyber Tunnel** | Infinite neon grid/solid tunnel, BPM speed |
| **Particle Life** | Attraction/repulsion math (from particle-life kit) |
| **Geometry Light** | SDF crystal / knot forms + orbiting light particles |

### Viz kits (for automation)

Cloned open-source assets live in `vendor/` + curated copies in `viz-kits/`:

| Kit | Path | Use |
|-----|------|-----|
| particle-life | `vendor/particle-life` | Force-matrix artificial life |
| three.proton | `vendor/three.proton` | Full 3D particle engine |
| webgl-wind | `vendor/webgl-wind` | GPU field particles |
| three-bas | `vendor/three-bas` | Geometry buffer animation + GLSL eases |

Machine catalog: [`viz-kits/manifest.json`](viz-kits/manifest.json) · playbook: [`viz-kits/recipes/ADD_MODE.md`](viz-kits/recipes/ADD_MODE.md)

```powershell
.\scripts\clone-viz-vendor.ps1   # re-fetch upstream
.\scripts\sync-viz-kits.ps1      # refresh viz-kits/ready
```

Shared across all modes:

- **Python Librosa DSP** (808, pitch, hats, BPM, sidechain) + **WebAudio FFT** fallback
- Upload **audio**, **video**, and **images** with timeline-style controls
- **Modular param panel** — only mode-relevant sliders shown
- Instant mode switch (audio keeps playing)
- Export **9:16** (default) / 1:1 / 16:9 WebM + PNG stills

## Quick start (Windows pwsh)

### Backend (optional but recommended)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL (default [http://localhost:5173](http://localhost:5173)).

The Vite dev server proxies `/api/*` → `http://127.0.0.1:8000/*`.

## How to use

1. **Visual Mode** — pick Fractal / Particles / Earth / Tunnel (left panel or GUI). Switch anytime without stopping audio.
2. **Audio** — upload a Phonk track. Backend DSP if `:8000` is up; else live FFT.
3. **Video / Image** (optional) — underlay + overlays with layer controls.
4. **Transport** — play / pause / seek / volume (audio is the master clock).
5. **Params** — top-right lil-gui shows **only sliders for the active mode** (+ shared FFT/color/camera/export).
6. **Export** — default **9:16 Reels**; **Record WebM** or **Save Still PNG**.

## Audio → visual map

| Source | Visual |
|--------|--------|
| 808 / sub 20–60 Hz | Fractal domain fold, screen shake, chromatic aberration |
| Pitch 400–2000 Hz | HSL hue + bloom emission |
| Hi-hats / highs | Mist / “fluid” velocity bursts |
| BPM beat phase | Camera pull on the 1, zoom on off-beats |
| Sidechain | Fractal scale ducking |

## Project layout

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/PARAMETER_BUS.md](docs/PARAMETER_BUS.md).  
Troubleshooting: [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Stack

Python · Librosa · FastAPI · Three.js · GLSL · Vite · lil-gui
