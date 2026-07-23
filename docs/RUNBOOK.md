# Runbook — DJ Caat Phonk Visualizer

## Services

| Service | Command | Port |
|---------|---------|------|
| DSP API | `uvicorn app.main:app --reload --port 8000` (from `backend/`) | 8000 |
| UI | `npm run dev` (from `frontend/`) | 5173 |

## Common issues

### Backend DSP fails / CORS

- Vite proxies `/api` → `:8000`. Keep `useBackendDsp` on and `backendUrl` = `/api`.
- If you open the built files without Vite, set `backendUrl` to `http://127.0.0.1:8000` and ensure CORS is open (default `allow_origins=["*"]`).
- Check `GET /health`.

### Librosa install slow / fails on Windows

- Use Python 3.11+ 64-bit.
- Install Visual C++ Build Tools if `llvmlite` / `numba` wheels fail.
- Frontend still works with **live WebAudio FFT** if Python analysis is offline.

### WebGL black screen

- Update GPU drivers.
- Open DevTools console for shader compile errors.
- Lower `mandelIter` in GUI (4–6) on weak GPUs.

### No audio / Autoplay blocked

- Click **Play** after a user gesture (browser policy).
- Ensure volume slider is up.

### Video not showing

- Some codecs (e.g. certain MP4 profiles) fail in browser — try WebM/H.264.
- Raise video **Opacity** in the layer list.
- Video is under the fractal; strong fractal glow can dominate — lower bloom temporarily.

### Recording WebM has no sound

- Start audio first so the AudioContext graph exists.
- Some browsers require the tab to be focused during capture.

### Large audio analyze timeout

- Long tracks produce large JSON (per-frame arrays). Prefer ≤ 5 min for first tests.
- Increase reverse-proxy timeouts if any.

### Aspect letterboxing

- Export presets resize the canvas inside the window. Use fullscreen browser for cleaner captures.

## Manual verify checklist

1. `GET /health` → `{"status":"ok"}`
2. Upload short `.wav` → meters move; console shows BPM if backend path used
3. GUI **Fold formula** `square` → geometry hardens on 808
4. Upload image → overlay controls work
5. Aspect `9:16` → tall canvas; **Save Still PNG** downloads
6. **Record WebM** → file downloads after stop
