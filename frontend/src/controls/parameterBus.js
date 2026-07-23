/**
 * Modular FL Studio–style parameter bus.
 * Single source of truth for DSP, visual modes, camera, export.
 */

const STORAGE_KEY = 'dj-caat-phonk-params-v2';

/** @typedef {'sin'|'square'|'tri'|'abs'} FoldFormula */
/** @typedef {'9:16'|'1:1'|'16:9'} AspectPreset */
/** @typedef {'fractal'|'particles'|'earth'|'tunnel'|'life'|'geometry'} VisualMode */

export const FOLD_MODE_INDEX = { sin: 0, square: 1, tri: 2, abs: 3 };

export const VISUAL_MODES = [
  { id: 'fractal', label: 'Phonk Fractal' },
  { id: 'singularity', label: 'Stable Singularity' },
  { id: 'particles', label: 'Sci-Fi Particles' },
  { id: 'earth', label: 'Dark Earth / Orbital' },
  { id: 'tunnel', label: 'Cyber Tunnel' },
  { id: 'life', label: 'Particle Life' },
  { id: 'geometry', label: 'Geometry Light' },
];

export function createDefaultParams() {
  return {
    // Visual mode
    visualMode: /** @type {VisualMode} */ ('fractal'),

    // Audio Editor & Tempo Optimizer (FL Studio Style)
    tempoSpeed: 1.0,        // Playback speed / stretch (0.5x - 2.0x)
    pitchShift: 0,          // Pitch transposition in semitones (-12 to +12)
    eqBass: 0,              // Low EQ (-12dB to +12dB)
    eqMid: 0,               // Mid EQ (-12dB to +12dB)
    eqHigh: 0,              // High EQ (-12dB to +12dB)
    filterLpf: 20000,       // Lowpass Filter cutoff Hz
    filterHpf: 20,          // Highpass Filter cutoff Hz
    bassBoost: 0.0,         // Phonk 808 Saturator / Boost (0 - 1)
    audioTrimIn: 0,         // Audio trim start (sec)
    audioTrimOut: 0,        // Audio trim end (sec, 0 = full)

    // Filmora Video FX & Text Layers
    videoFilter: 'none',    // 'none' | 'vhs' | 'grain' | 'cyberpunk' | 'retro'
    textTitle: 'DJ CAAT',   // Title overlay
    textSub: 'PHONK DRIFT', // Subtitle overlay
    textStyle: 'glow',      // 'glow' | 'neon' | 'cyber' | 'minimal'
    textAnimation: 'pulse', // 'pulse' | 'bounce' | 'static'
    textFontSize: 42,
    textYPos: 0.82,          // Position relative to height

    // FFT / bands (shared)
    fftSmooth: 0.75,
    crossLow: 60,
    crossMid: 400,
    crossHigh: 6000,
    sidechainDepth: 0.55,
    sidechainAttack: 0.02,
    sidechainRelease: 0.18,

    // Fractal
    foldFormula: /** @type {FoldFormula} */ ('sin'),
    foldStrength: 0.85,
    mandelPower: 8,
    mandelIter: 8,
    warpStrength: 0.35,
    fractalScale: 1.0,

    // Camera (shared-ish)
    fov: 1.2,
    camOrbit: 0.4,
    bpmCamPull: 0.25,
    bpmCamZoom: 0.15,
    shakeAmount: 0.08,

    // Color (shared)
    hueBase: 0.92,
    hueFromPitch: 0.35,
    saturation: 0.85,
    bloomStrength: 1.2,
    chromatic: 0.004,

    // Fluid (fractal mist)
    fluidForce: 1.0,
    fluidDecay: 0.92,
    mistDensity: 0.45,

    // Sci-Fi Particles
    particleDensity: 0.65,
    trailLength: 0.55,
    explosionForce: 1.1,
    turbulence: 0.45,
    colorSpeed: 0.6,
    attractRepel: 0.15,

    // Dark Earth
    atmosphereBase: 0.55,
    atmosphereAudio: 1.0,
    nightLights: 0.85,
    ringEnabled: true,
    ringOpacity: 0.7,
    planetRough: 0.55,
    bpmOrbitLock: false,
    orbitSpeed: 0.85,

    // Cyber Tunnel
    tunnelSpeed: 1.0,
    tunnelDistort: 0.45,
    gridDensity: 1.0,
    wallStyle: /** @type {'grid'|'solid'} */ ('grid'),
    tunnelRadius: 1.0,
    neonIntensity: 1.15,

    // Particle Life (math / physics kit)
    lifeDensity: 0.7,
    lifeForce: 1.0,
    lifeChaos: 0.35,
    lifeSpecies: 4,
    lifeTrail: 0.5,

    // Geometry + light
    geoMorph: 0.35,
    geoWire: 0.75,
    geoLightCount: 12,
    geoSpin: 1.0,
    geoGlow: 1.1,

    // Export
    aspect: /** @type {AspectPreset} */ ('9:16'),
    exportFps: 30,
    exportBitrate: 8_000_000,

    // DSP backend
    useBackendDsp: true,
    backendUrl: '/api',
  };
}

export class ParameterBus {
  constructor(initial = createDefaultParams()) {
    this.params = { ...createDefaultParams(), ...initial };
    this._listeners = new Set();
  }

  get() {
    return this.params;
  }

  set(key, value) {
    if (!(key in this.params)) return;
    this.params[key] = value;
    this._emit(key, value);
  }

  patch(obj) {
    for (const [k, v] of Object.entries(obj)) {
      if (k in this.params) this.params[k] = v;
    }
    this._emit('*', this.params);
  }

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _emit(key, value) {
    for (const fn of this._listeners) fn(key, value, this.params);
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.params));
      return true;
    } catch {
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.patch(data);
      return true;
    } catch {
      return false;
    }
  }

  reset() {
    this.params = createDefaultParams();
    this._emit('*', this.params);
  }

  /** Values ready to push into GLSL uniforms (union of all modes). */
  toShaderUniforms(audio) {
    const p = this.params;
    const a = audio || {};
    return {
      // shared audio / look
      uFov: p.fov,
      uWarp: p.warpStrength,
      uFoldStrength: p.foldStrength,
      uFoldMode: FOLD_MODE_INDEX[p.foldFormula] ?? 0,
      uMandelPower: p.mandelPower,
      uMandelIter: p.mandelIter,
      uHueBase: p.hueBase,
      uHueFromPitch: p.hueFromPitch,
      uSaturation: p.saturation,
      uBloom: p.bloomStrength,
      uChromatic: p.chromatic,
      uShake: p.shakeAmount,
      uCamOrbit: p.camOrbit,
      uBpmPull: p.bpmCamPull,
      uBpmZoom: p.bpmCamZoom,
      uFluidForce: p.fluidForce,
      uMistDensity: p.mistDensity,
      uFractalScale: p.fractalScale,
      uBass808: a.bass808 ?? 0,
      uOnset808: a.onset808 ?? 0,
      uPitchHz: a.pitchHz ?? 0,
      uPitchConf: a.pitchConf ?? 0,
      uHat: a.hat ?? 0,
      uBeatPhase: a.beatPhase ?? 0,
      uBpm: a.bpm ?? 0,
      uSidechain: a.sidechain ?? 1,

      // particles
      uParticleDensity: p.particleDensity,
      uTrailLength: p.trailLength,
      uExplosionForce: p.explosionForce,
      uTurbulence: p.turbulence,
      uColorSpeed: p.colorSpeed,
      uAttractRepel: p.attractRepel,

      // earth
      uAtmosphereBase: p.atmosphereBase,
      uAtmosphereAudio: p.atmosphereAudio,
      uNightLights: p.nightLights,
      uRingEnabled: p.ringEnabled ? 1 : 0,
      uRingOpacity: p.ringOpacity,
      uPlanetRough: p.planetRough,
      uBpmOrbitLock: p.bpmOrbitLock ? 1 : 0,
      uOrbitSpeed: p.orbitSpeed,

      // tunnel
      uTunnelSpeed: p.tunnelSpeed,
      uTunnelDistort: p.tunnelDistort,
      uGridDensity: p.gridDensity,
      uWallStyle: p.wallStyle === 'solid' ? 1 : 0,
      uTunnelRadius: p.tunnelRadius,
      uNeonIntensity: p.neonIntensity,

      // life
      uLifeDensity: p.lifeDensity,
      uLifeForce: p.lifeForce,
      uLifeChaos: p.lifeChaos,
      uLifeSpecies: p.lifeSpecies,
      uLifeTrail: p.lifeTrail,

      // geometry
      uGeoMorph: p.geoMorph,
      uGeoWire: p.geoWire,
      uGeoLightCount: p.geoLightCount,
      uGeoSpin: p.geoSpin,
      uGeoGlow: p.geoGlow,
    };
  }
}
