/**
 * Multi-mode visual renderer.
 * Instant mode switch via material swap — AudioContext is never touched.
 * Modes: fractal | particles | earth | tunnel
 */

import * as THREE from 'three';
import vert from '../shaders/fractal.vert.glsl';
import fragFractal from '../shaders/fractal.frag.glsl';
import fragSingularity from '../shaders/singularity.frag.glsl';
import fragParticles from '../shaders/particles.frag.glsl';
import fragEarth from '../shaders/earth.frag.glsl';
import fragTunnel from '../shaders/tunnel.frag.glsl';
import fragLife from '../shaders/life.frag.glsl';
import fragGeometry from '../shaders/geometry.frag.glsl';

const MODE_FRAG = {
  fractal: fragFractal,
  singularity: fragSingularity,
  particles: fragParticles,
  earth: fragEarth,
  tunnel: fragTunnel,
  life: fragLife,
  geometry: fragGeometry,
};

/** Emergency fullscreen color — used if a mode's GLSL fails to compile. */
const FALLBACK_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uBass808;
uniform float uHueBase;
varying vec2 vUv;
void main() {
  vec2 uv = vUv;
  float pulse = 0.35 + 0.25 * sin(uTime * 2.0 + uBass808 * 6.0);
  vec3 col = vec3(0.6, 0.05, 0.35) * pulse
           + vec3(0.05, 0.4, 0.55) * (1.0 - uv.y) * 0.5;
  col += 0.15 * sin(uTime + uv.x * 10.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

function makeSharedUniforms(dummyTex) {
  return {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
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
    uMandelIter: { value: 8 },
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
    uParticleDensity: { value: 0.65 },
    uTrailLength: { value: 0.55 },
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
    uLifeDensity: { value: 0.7 },
    uLifeForce: { value: 1.0 },
    uLifeChaos: { value: 0.35 },
    uLifeSpecies: { value: 4 },
    uLifeTrail: { value: 0.5 },
    uGeoMorph: { value: 0.35 },
    uGeoWire: { value: 0.75 },
    uGeoLightCount: { value: 12 },
    uGeoSpin: { value: 1.0 },
    uGeoGlow: { value: 1.1 },
  };
}

function makeMaterial(vertexShader, fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
    // Avoid transparent black clears looking "empty"
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

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      // Prefer WebGL2 but fall back cleanly
      failIfMajorPerformanceCaveat: false,
    });
    this._maxDpr = 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this._maxDpr));
    // Not pure black — if anything draws clear color you still see the frame is alive
    this.renderer.setClearColor(0x0a0614, 1);
    this.renderer.autoClear = true;

    this.scene = new THREE.Scene();
    // near < 0 so z=0 plane is safely inside the frustum
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

    this.videoTexture = null;
    this._dummyTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this._dummyTex.needsUpdate = true;
    this._dummyTex.colorSpace = THREE.NoColorSpace;

    this.uniforms = makeSharedUniforms(this._dummyTex);

    // Ensure GLSL imports are strings (vite-plugin-glsl / ?raw)
    const vertSrc = typeof vert === 'string' ? vert : String(vert ?? '');
    if (!vertSrc || vertSrc.length < 20) {
      console.error('[VisualRenderer] Vertex shader failed to load', vert);
    }

    const geo = new THREE.PlaneGeometry(2, 2);
    this.materials = {};
    for (const [id, frag] of Object.entries(MODE_FRAG)) {
      const fragSrc = typeof frag === 'string' ? frag : String(frag ?? '');
      if (!fragSrc || fragSrc.length < 50) {
        console.error(`[VisualRenderer] Fragment shader missing for mode "${id}"`, frag);
        this.materials[id] = makeMaterial(vertSrc, FALLBACK_FRAG, this.uniforms);
        continue;
      }
      this.materials[id] = makeMaterial(vertSrc, fragSrc, this.uniforms);
    }
    this._fallbackMat = makeMaterial(vertSrc, FALLBACK_FRAG, this.uniforms);

    const startMode = this.materials[this.mode] ? this.mode : 'fractal';
    this.mode = startMode;
    this.material = this.materials[startMode];
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    this._aspectLock = null;
    this._shaderChecked = false;

    // Host layout for letterboxing (see styles: #stage)
    this._stage = document.getElementById('stage');

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // First-frame probe after WebGL program link
    queueMicrotask(() => this._validateActiveProgram());
  }

  _validateActiveProgram() {
    // Force a compile/link by rendering once
    try {
      this.renderer.compile(this.scene, this.camera);
      const prog = this.renderer.properties.get(this.material);
      if (prog?.program?.diagnostics?.runnable === false) {
        console.error('[VisualRenderer] Shader not runnable — using fallback', prog.program.diagnostics);
        this.mesh.material = this._fallbackMat;
        this.material = this._fallbackMat;
      }
    } catch (err) {
      console.error('[VisualRenderer] compile failed', err);
      this.mesh.material = this._fallbackMat;
      this.material = this._fallbackMat;
    }
    this._shaderChecked = true;
  }

  /**
   * Instant visual mode switch — does not touch AudioContext.
   * @param {string} mode
   */
  setMode(mode) {
    if (!this.materials[mode]) mode = 'fractal';
    if (mode === this.mode && this.mesh.material === this.materials[mode]) return;
    this.mode = mode;
    this.material = this.materials[mode];
    this.mesh.material = this.material;
    if (mode === 'particles' || mode === 'tunnel' || mode === 'life') this._maxDpr = 1.75;
    else if (mode === 'earth' || mode === 'geometry') this._maxDpr = 1.5;
    else this._maxDpr = 1.35;
    this.resize();
    this._validateActiveProgram();
  }

  /**
   * @param {{ w: number, h: number } | null} size
   */
  setAspectLock(size) {
    this._aspectLock = size;
    this.resize();
  }

  resize() {
    const vw = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const vh = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);

    let w;
    let h;
    if (this._aspectLock) {
      const aw = this._aspectLock.w;
      const ah = this._aspectLock.h;
      const ar = aw / ah;
      const wr = vw / vh;
      if (wr > ar) {
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

    // Style canvas to exact letterbox size; parent #stage centers it
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.style.display = 'block';
    this.canvas.style.position = 'relative';
    this.canvas.style.inset = 'auto';
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

  /**
   * @param {HTMLVideoElement | null} video
   * @param {number} opacity
   */
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
    this.videoTexture.colorSpace = THREE.SRGBColorSpace;
    this.uniforms.uVideoTex.value = this.videoTexture;
    this.uniforms.uHasVideo.value = 1;
    this.uniforms.uVideoOpacity.value = opacity;
  }

  setVideoOpacity(opacity) {
    this.uniforms.uVideoOpacity.value = opacity;
  }

  updateUniforms(u) {
    for (const [k, v] of Object.entries(u)) {
      if (this.uniforms[k]) this.uniforms[k].value = v;
    }
  }

  /**
   * @param {object} audioSample
   * @param {number} [timeScale]
   */
  render(audioSample, timeScale = 1) {
    const desired = this.bus.params.visualMode || 'fractal';
    if (desired !== this.mode) this.setMode(desired);

    // Guard zero-size canvas (hidden tab / first layout)
    if (this.canvas.clientWidth < 2 || this.canvas.clientHeight < 2) {
      this.resize();
    }

    const t = this.clock.getElapsedTime() * timeScale;
    const bpm = audioSample?.bpm || 0;
    const beatBoost = bpm > 0 ? 1 + 0.05 * Math.sin((audioSample.beatPhase || 0) * Math.PI * 2) : 1;
    this.uniforms.uTime.value = t * beatBoost;

    const u = this.bus.toShaderUniforms(audioSample);
    this.updateUniforms(u);

    if (this.videoTexture) this.videoTexture.needsUpdate = true;

    // If program failed at runtime, swap fallback once
    const mat = this.mesh.material;
    if (mat?.program?.diagnostics && mat.program.diagnostics.runnable === false) {
      console.warn('[VisualRenderer] Active shader failed — fallback neon');
      this.mesh.material = this._fallbackMat;
    }

    this.renderer.render(this.scene, this.camera);
  }

  get domElement() {
    return this.renderer.domElement;
  }
}

export { FractalRenderer as VisualRenderer };
