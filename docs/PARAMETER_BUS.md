# Parameter Bus — FL Studio-style modular controls

Single source of truth: `frontend/src/controls/parameterBus.js` → object `params`.
Every uniform / DSP tweak reads from here. lil-gui binds two-way.

## Visual Mode (`visualMode`)

| Id | Label | Shader |
|----|-------|--------|
| `fractal` | Phonk Fractal | `fractal.frag.glsl` |
| `particles` | Sci-Fi Particles | `particles.frag.glsl` |
| `earth` | Dark Earth / Orbital | `earth.frag.glsl` |
| `tunnel` | Cyber Tunnel | `tunnel.frag.glsl` |

Mode switch is instant (material swap). AudioContext is never recreated.
GUI folders for inactive modes are hidden.

## Audio / FFT

| Key | Type | Default | Range | Meaning |
|-----|------|---------|-------|---------|
| `fftSmooth` | float | 0.75 | 0–0.99 | Exponential smoothing time-constant for band energies |
| `crossLow` | float | 60 | 20–200 | Low/mid crossover (Hz) — end of 808 band |
| `crossMid` | float | 400 | 200–1000 | Mid start for melody window |
| `crossHigh` | float | 6000 | 2000–12000 | High-band start (hats/transients) |
| `sidechainDepth` | float | 0.55 | 0–1 | Kick/808 ducking of fractal scale |
| `sidechainAttack` | float | 0.02 | 0.001–0.2 | Duck attack (s) |
| `sidechainRelease` | float | 0.18 | 0.05–1 | Duck release (s) |

## Fractal / raymarch

| Key | Type | Default | Range | Meaning |
|-----|------|---------|-------|---------|
| `foldFormula` | enum | `sin` | `sin` \| `square` \| `tri` \| `abs` | Fold modifier on DE domain |
| `foldStrength` | float | 0.85 | 0–2 | Amplitude of fold when 808 hits |
| `mandelPower` | float | 8 | 2–16 | Mandelbulb power |
| `mandelIter` | int | 8 | 4–16 | DE iterations |
| `warpStrength` | float | 0.35 | 0–1.5 | Non-Euclidean domain warp |
| `fractalScale` | float | 1.0 | 0.2–2 | Base scale (pre-sidechain) |

## Camera

| Key | Type | Default | Range | Meaning |
|-----|------|---------|-------|---------|
| `fov` | float | 1.2 | 0.5–2.5 | Ray FOV scale |
| `camOrbit` | float | 0.4 | 0–2 | Orbit radius modulation |
| `bpmCamPull` | float | 0.25 | 0–1 | Pull-back on quarter-note phase |
| `bpmCamZoom` | float | 0.15 | 0–1 | Zoom on off-beat |
| `shakeAmount` | float | 0.08 | 0–0.4 | Screen shake on 808 |

## Color / light

| Key | Type | Default | Range | Meaning |
|-----|------|---------|-------|---------|
| `hueBase` | float | 0.92 | 0–1 | Base HSL hue (phonk magenta/cyan) |
| `hueFromPitch` | float | 0.35 | 0–1 | How much pitch shifts hue |
| `saturation` | float | 0.85 | 0–1 | Color saturation |
| `bloomStrength` | float | 1.2 | 0–3 | Emission / bloom drive |
| `chromatic` | float | 0.004 | 0–0.03 | RGB split base; scaled by 808 |

## Fluid / mist (fractal mode)

| Key | Type | Default | Range | Meaning |
|-----|------|---------|-------|---------|
| `fluidForce` | float | 1.0 | 0–3 | Hi-hat velocity force scale |
| `fluidDecay` | float | 0.92 | 0.5–0.99 | Mist persistence |
| `mistDensity` | float | 0.45 | 0–1.5 | Base mist amount |

## Sci-Fi Particles

| Key | Type | Default | Range | Meaning |
|-----|------|---------|-------|---------|
| `particleDensity` | float | 0.65 | 0–1 | Particle budget (24–72 GPU sprites) |
| `trailLength` | float | 0.55 | 0–1 | Neon trail steps |
| `explosionForce` | float | 1.1 | 0–3 | 808 outward burst |
| `turbulence` | float | 0.45 | 0–2 | Flow noise |
| `colorSpeed` | float | 0.6 | 0–2 | Hue cycle rate |
| `attractRepel` | float | 0.15 | -1–1 | Pull toward / push from center |

## Dark Earth / Orbital

| Key | Type | Default | Range | Meaning |
|-----|------|---------|-------|---------|
| `atmosphereBase` | float | 0.55 | 0–2 | Fresnel atmosphere base |
| `atmosphereAudio` | float | 1.0 | 0–2 | 808 → atmosphere bloom |
| `nightLights` | float | 0.85 | 0–2 | Surface city lights (hat flicker) |
| `ringEnabled` | bool | true | | Debris ring |
| `ringOpacity` | float | 0.7 | 0–1 | Ring density |
| `planetRough` | float | 0.55 | 0–1 | Terrain fBm detail |
| `bpmOrbitLock` | bool | false | | Orbit steps locked to BPM |
| `orbitSpeed` | float | 0.85 | 0–2 | Camera orbit rate |

## Cyber Tunnel

| Key | Type | Default | Range | Meaning |
|-----|------|---------|-------|---------|
| `tunnelSpeed` | float | 1.0 | 0.1–3 | Base forward speed |
| `tunnelDistort` | float | 0.45 | 0–2 | Audio warp / swirl |
| `gridDensity` | float | 1.0 | 0.25–3 | Rings / spokes density |
| `wallStyle` | enum | `grid` | `grid` \| `solid` | Wall look |
| `tunnelRadius` | float | 1.0 | 0.4–2 | Perspective scale |
| `neonIntensity` | float | 1.15 | 0–3 | Neon line strength |

## Export

| Key | Type | Default | Meaning |
|-----|------|---------|---------|
| `aspect` | enum | `9:16` | Instagram preset |
| `exportFps` | int | 30 | Capture frame rate |
| `exportBitrate` | int | 8e6 | MediaRecorder bits/s |

## Presets

`localStorage` key: `dj-caat-phonk-params`. GUI has Save / Load / Reset.
