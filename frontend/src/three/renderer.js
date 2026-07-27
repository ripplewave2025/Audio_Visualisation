/**
 * Multi-mode visual renderer — performance first for Vercel / mobile / export.
 * Instant mode switch (lazy-compile materials). Adaptive DPR + quality.
 */

import * as THREE from 'three';
import { MODE_CATALOG, getMode } from '../modes/catalog.js';
import vert from '../shaders/fractal.vert.glsl';
import fragFractal from '../shaders/fractal.frag.glsl';
import fragSingularity from '../shaders/singularity.frag.glsl';
import fragParticles from '../shaders/particles.frag.glsl';
import fragEarth from '../shaders/earth.frag.glsl';
import fragTunnel from '../shaders/tunnel.frag.glsl';
import fragLife from '../shaders/life.frag.glsl';
import fragGeometry from '../shaders/geometry.frag.glsl';
import fragSpectrum from '../shaders/spectrum.frag.glsl';
import fragKaleido from '../shaders/kaleido.frag.glsl';
import fragPlasma from '../shaders/plasma.frag.glsl';
import fragWarp from '../shaders/warp.frag.glsl';
import fragAurora from '../shaders/aurora.frag.glsl';
import fragLiquid from '../shaders/liquid.frag.glsl';
import fragLattice from '../shaders/lattice.frag.glsl';
import fragRings from '../shaders/rings.frag.glsl';
import fragScope from '../shaders/scope.frag.glsl';
import fragVoronoi from '../shaders/voronoi.frag.glsl';
import fragMatrix from '../shaders/matrix.frag.glsl';
import fragRipple from '../shaders/ripple.frag.glsl';

/** id → fragment source (lazy materials still compile on first use) */
const MODE_FRAG = {
  fractal: fragFractal,
  singularity: fragSingularity,
  particles: fragParticles,
  earth: fragEarth,
  tunnel: fragTunnel,
  life: fragLife,
  geometry: fragGeometry,
  spectrum: fragSpectrum,
  kaleido: fragKaleido,
  plasma: fragPlasma,
  warp: fragWarp,
  aurora: fragAurora,
  liquid: fragLiquid,
  lattice: fragLattice,
  rings: fragRings,
  scope: fragScope,
  voronoi: fragVoronoi,
  matrix: fragMatrix,
  ripple: fragRipple,
};

/** DPR budget from catalog (fallback 1.35) */
function modeDpr(mode) {
  return getMode(mode).dpr ?? 1.35;
}

// Validate catalog vs shaders at boot
for (const m of MODE_CATALOG) {
  if (!MODE_FRAG[m.id]) {
    console.warn(`[VisualRenderer] Catalog mode "${m.id}" has no shader import`);
  }
}

const FALLBACK_FRAG = /* glsl */ `
precision mediump float;
uniform float uTime;
uniform float uBass808;
uniform float uHueBase;
varying vec2 vUv;
void main() {
  float pulse = 0.4 + 0.3 * sin(uTime * 2.5 + uBass808 * 5.0);
  vec3 col = vec3(0.55, 0.04, 0.32) * pulse + vec3(0.04, 0.35, 0.5) * (1.0 - vUv.y) * 0.55;
  gl_FragColor = vec4(col, 1.0);
}
`;

function makeSharedUniforms(dummyTex) {
  return {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uQuality: { value: 0.65 }, // 0..1 adaptive quality
    uBass808: { value: 0 },
    uOnset808: { value: 0 },
    uPitchHz: { value: 0 },
    uPitchConf: { value: 0 },
    uHat: { value: 0 },
    uBeatPhase: { value: 0 },
    uBpm: { value: 0 },
    uSidechain: { value: 1 },
    uFov: { value: 1.2 },
    uWarp: { value: 0.35 },
    uFoldStrength: { value: 0.85 },
    uFoldMode: { value: 0 },
    uMandelPower: { value: 8 },
    uMandelIter: { value: 7 },
    uHueBase: { value: 0.92 },
    uHueFromPitch: { value: 0.35 },
    uSaturation: { value: 0.85 },
    uBloom: { value: 1.2 },
    uChromatic: { value: 0.004 },
    uShake: { value: 0.08 },
    uCamOrbit: { value: 0.4 },
    uBpmPull: { value: 0.25 },
    uBpmZoom: { value: 0.15 },
    uFluidForce: { value: 1.0 },
    uMistDensity: { value: 0.45 },
    uFractalScale: { value: 1.0 },
    uVideoTex: { value: dummyTex },
    uVideoOpacity: { value: 0 },
    uHasVideo: { value: 0 },
    uParticleDensity: { value: 0.55 },
    uTrailLength: { value: 0.45 },
    uExplosionForce: { value: 1.1 },
    uTurbulence: { value: 0.45 },
    uColorSpeed: { value: 0.6 },
    uAttractRepel: { value: 0.15 },
    uAtmosphereBase: { value: 0.55 },
    uAtmosphereAudio: { value: 1.0 },
    uNightLights: { value: 0.85 },
    uRingEnabled: { value: 1 },
    uRingOpacity: { value: 0.7 },
    uPlanetRough: { value: 0.55 },
    uBpmOrbitLock: { value: 0 },
    uOrbitSpeed: { value: 0.85 },
    uTunnelSpeed: { value: 1.0 },
    uTunnelDistort: { value: 0.45 },
    uGridDensity: { value: 1.0 },
    uWallStyle: { value: 0 },
    uTunnelRadius: { value: 1.0 },
    uNeonIntensity: { value: 1.15 },
    uLifeDensity: { value: 0.55 },
    uLifeForce: { value: 1.0 },
    uLifeChaos: { value: 0.35 },
    uLifeSpecies: { value: 4 },
    uLifeTrail: { value: 0.4 },
    uGeoMorph: { value: 0.35 },
    uGeoWire: { value: 0.75 },
    uGeoLightCount: { value: 10 },
    uGeoSpin: { value: 1.0 },
    uGeoGlow: { value: 1.1 },
    // Shared FX pack (spectrum/kaleido/plasma/…)
    uFxIntensity: { value: 1.0 },
    uFxScale: { value: 1.0 },
    uFxDetail: { value: 0.55 },
    uFxSymmetry: { value: 0.5 },
  };
}

function makeMaterial(vertexShader, fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
    transparent: false,
  });
}

export class FractalRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../controls/parameterBus.js').ParameterBus} bus
   */
  constructor(canvas, bus) {
    this.canvas = canvas;
    this.bus = bus;
    this.clock = new THREE.Clock();
    this.mode = bus.params.visualMode || 'fractal';
    this.visible = true;
    this._recording = false;

    // Mobile / low-power hint
    this._isMobile =
      typeof navigator !== 'undefined' &&
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '');

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      // Only needed while capturing — toggled by setRecording()
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
    });

    this._quality = bus.params.renderQuality ?? 0.65; // 0..1
    this._adaptive = bus.params.adaptiveQuality !== false;
    this._maxDpr = this._baseDprFor(this.mode);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this._maxDpr));
    this.renderer.setClearColor(0x0a0614, 1);
    this.renderer.autoClear = true;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

    this.videoTexture = null;
    this._dummyTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this._dummyTex.needsUpdate = true;
    this._dummyTex.colorSpace = THREE.NoColorSpace;

    this.uniforms = makeSharedUniforms(this._dummyTex);
    this.uniforms.uQuality.value = this._quality;

    this._vertSrc = typeof vert === 'string' ? vert : String(vert ?? '');
    this.materials = Object.create(null); // lazy
    this._fallbackMat = makeMaterial(this._vertSrc, FALLBACK_FRAG, this.uniforms);

    const geo = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geo, this._getMaterial(this.mode));
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.material = this.mesh.material;

    this._aspectLock = null;
    this._stage = document.getElementById('stage');

    // FPS adaptive controller
    this._fpsEma = 60;
    this._frameCount = 0;
    this._lastFpsT = performance.now();
    this._lastResizeW = 0;
    this._lastResizeH = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    document.addEventListener('visibilitychange', () => {
      this.visible = document.visibilityState === 'visible';
      if (this.visible) this.clock.getDelta(); // reset delta spike
    });
  }

  _baseDprFor(mode) {
    let d = modeDpr(mode);
    if (this._isMobile) d = Math.min(d, 1.15);
    const q = this._quality;
    return Math.max(0.75, d * (0.55 + 0.45 * q));
  }

  /**
   * Lazy-compile only the active mode (huge startup win vs 7 programs).
   * @param {string} mode
   */
  _getMaterial(mode) {
    if (!MODE_FRAG[mode]) mode = 'fractal';
    if (this.materials[mode]) return this.materials[mode];

    const frag = MODE_FRAG[mode];
    const fragSrc = typeof frag === 'string' ? frag : String(frag ?? '');
    if (!fragSrc || fragSrc.length < 40) {
      console.error(`[VisualRenderer] Missing shader: ${mode}`);
      this.materials[mode] = this._fallbackMat;
      return this._fallbackMat;
    }
    const mat = makeMaterial(this._vertSrc, fragSrc, this.uniforms);
    this.materials[mode] = mat;
    // Compile on first use
    try {
      this.mesh.material = mat;
      this.renderer.compile(this.scene, this.camera);
    } catch (err) {
      console.error(`[VisualRenderer] Compile failed (${mode})`, err);
      this.materials[mode] = this._fallbackMat;
      return this._fallbackMat;
    }
    return mat;
  }

  /** @param {boolean} on */
  setRecording(on) {
    this._recording = !!on;
    // Re-create is heavy; Three doesn't expose preserveDrawingBuffer toggle.
    // Capture still works if we call toDataURL after render with readPixels path —
    // MediaRecorder uses canvas stream and does NOT need preserveDrawingBuffer.
    // For stills we render then read immediately same frame — also fine without flag
    // on most browsers if read in same event. Keep flag false for perf.
  }

  setQuality(q) {
    this._quality = Math.max(0.25, Math.min(1, q));
    this.uniforms.uQuality.value = this._quality;
    this._maxDpr = this._baseDprFor(this.mode);
    this.resize(true);
  }

  /**
   * @param {string} mode
   */
  setMode(mode) {
    if (!MODE_FRAG[mode]) mode = 'fractal';
    if (mode === this.mode && this.mesh.material === this.materials[mode]) return;
    this.mode = mode;
    const mat = this._getMaterial(mode);
    this.material = mat;
    this.mesh.material = mat;
    this._maxDpr = this._baseDprFor(mode);
    this.resize(true);
  }

  /**
   * @param {{ w: number, h: number } | null} size
   */
  setAspectLock(size) {
    this._aspectLock = size;
    this.resize(true);
  }

  /**
   * @param {boolean} [force]
   */
  resize(force = false) {
    const vw = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const vh = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);

    let w;
    let h;
    if (this._aspectLock) {
      const ar = this._aspectLock.w / this._aspectLock.h;
      if (vw / vh > ar) {
        h = vh;
        w = Math.max(1, Math.floor(h * ar));
      } else {
        w = vw;
        h = Math.max(1, Math.floor(w / ar));
      }
    } else {
      w = vw;
      h = vh;
    }

    // Cap canvas CSS size for GPU (export still letterboxed)
    const maxEdge = this._isMobile ? 900 : 1400;
    if (Math.max(w, h) > maxEdge) {
      const s = maxEdge / Math.max(w, h);
      w = Math.max(1, Math.floor(w * s));
      h = Math.max(1, Math.floor(h * s));
    }

    if (!force && w === this._lastResizeW && h === this._lastResizeH) {
      // only dpr may change
    }
    this._lastResizeW = w;
    this._lastResizeH = h;

    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.style.display = 'block';
    this.canvas.style.position = 'relative';
    this.canvas.style.margin = '0';
    this.canvas.style.maxWidth = '100%';
    this.canvas.style.maxHeight = '100%';

    if (this._stage) {
      this._stage.style.display = 'flex';
      this._stage.style.alignItems = 'center';
      this._stage.style.justifyContent = 'center';
      this._stage.style.width = '100%';
      this._stage.style.height = '100%';
    }

    const pr = Math.min(window.devicePixelRatio || 1, this._maxDpr);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);

    const rw = Math.max(1, Math.floor(w * pr));
    const rh = Math.max(1, Math.floor(h * pr));
    this.uniforms.uResolution.value.set(rw, rh);
  }

  setVideo(video, opacity = 0.55) {
    if (this.videoTexture) {
      this.videoTexture.dispose();
      this.videoTexture = null;
    }
    if (!video) {
      this.uniforms.uVideoTex.value = this._dummyTex;
      this.uniforms.uHasVideo.value = 0;
      this.uniforms.uVideoOpacity.value = 0;
      return;
    }
    this.videoTexture = new THREE.VideoTexture(video);
    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;
    this.videoTexture.generateMipmaps = false;
    this.videoTexture.colorSpace = THREE.SRGBColorSpace;
    this.uniforms.uVideoTex.value = this.videoTexture;
    this.uniforms.uHasVideo.value = 1;
    this.uniforms.uVideoOpacity.value = opacity;
  }

  setVideoOpacity(opacity) {
    this.uniforms.uVideoOpacity.value = opacity;
  }

  updateUniforms(u) {
    const U = this.uniforms;
    for (const k in u) {
      if (U[k]) U[k].value = u[k];
    }
  }

  /** Call once per frame from main loop with dt seconds. */
  tickAdaptive(dt) {
    this._adaptive = this.bus.params.adaptiveQuality !== false;
    if (!this._adaptive) return;
    if (dt <= 0 || dt > 0.5) return;
    const fps = 1 / dt;
    this._fpsEma = this._fpsEma * 0.9 + fps * 0.1;
    this._frameCount++;
    // Adjust every ~20 frames
    if (this._frameCount % 20 !== 0) return;

    let q = this._quality;
    if (this._fpsEma < 28) q -= 0.06;
    else if (this._fpsEma < 40) q -= 0.02;
    else if (this._fpsEma > 55 && q < (this.bus.params.renderQuality ?? 0.65)) q += 0.02;
    q = Math.max(0.3, Math.min(this.bus.params.renderQuality ?? 0.75, q));
    if (Math.abs(q - this._quality) > 0.015) {
      this._quality = q;
      this.uniforms.uQuality.value = q;
      const nextDpr = this._baseDprFor(this.mode);
      if (Math.abs(nextDpr - this._maxDpr) > 0.05) {
        this._maxDpr = nextDpr;
        this.resize(true);
      }
    }
  }

  get fps() {
    return this._fpsEma;
  }

  /**
   * @param {object} audioSample
   * @param {number} [timeScale]
   */
  render(audioSample, timeScale = 1) {
    if (!this.visible && !this._recording) return;

    const desired = this.bus.params.visualMode || 'fractal';
    if (desired !== this.mode) this.setMode(desired);

    if (this.canvas.clientWidth < 2 || this.canvas.clientHeight < 2) {
      this.resize(true);
    }

    const t = this.clock.getElapsedTime() * timeScale;
    const bpm = audioSample?.bpm || 0;
    const beatBoost =
      bpm > 0 ? 1 + 0.04 * Math.sin((audioSample.beatPhase || 0) * Math.PI * 2) : 1;
    this.uniforms.uTime.value = t * beatBoost;
    this.uniforms.uQuality.value = this._quality;

    this.updateUniforms(this.bus.toShaderUniforms(audioSample));

    // Video texture: only mark dirty when playing
    if (this.videoTexture && audioSample) {
      this.videoTexture.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  get domElement() {
    return this.renderer.domElement;
  }
}

export { FractalRenderer as VisualRenderer };
