/**
 * lil-gui binding — modular folders shown only for the active visual mode.
 * Shared: FFT/Sidechain, Color, Camera (subset), Export.
 */

import GUI from 'lil-gui';
import { VISUAL_MODES } from './parameterBus.js';

/**
 * @param {import('./parameterBus.js').ParameterBus} bus
 * @param {{ onAspect?: Function, onPreset?: Function, onMode?: Function }} [hooks]
 */
export function buildGui(bus, hooks = {}) {
  const { onAspect, onPreset, onMode } = hooks;
  const gui = new GUI({ title: 'DJ Caat · Params' });
  const p = bus.params;

  const modeLabels = Object.fromEntries(VISUAL_MODES.map((m) => [m.id, m.label]));
  // lil-gui dropdown: map display labels → ids is awkward; use ids with names
  const modeOptions = VISUAL_MODES.map((m) => m.id);

  const rootMode = gui
    .add(p, 'visualMode', modeOptions)
    .name('Visual Mode')
    .onChange((v) => {
      bus.set('visualMode', v);
      applyFolderVisibility(v);
      onMode?.(v);
    });
  // Friendly names via _names if available
  try {
    rootMode._names = VISUAL_MODES.map((m) => m.label);
  } catch {
    /* ignore */
  }

  // ── Always visible ─────────────────────────────────────────────────────────
  const fft = gui.addFolder('FFT / Sidechain');
  fft.add(p, 'fftSmooth', 0, 0.99, 0.01).name('FFT smooth').onChange((v) => bus.set('fftSmooth', v));
  fft.add(p, 'crossLow', 20, 200, 1).name('Cross low Hz').onChange((v) => bus.set('crossLow', v));
  fft.add(p, 'crossMid', 200, 1000, 1).name('Cross mid Hz').onChange((v) => bus.set('crossMid', v));
  fft.add(p, 'crossHigh', 2000, 12000, 10).name('Cross high Hz').onChange((v) => bus.set('crossHigh', v));
  fft.add(p, 'sidechainDepth', 0, 1, 0.01).name('Sidechain depth').onChange((v) => bus.set('sidechainDepth', v));
  fft.add(p, 'sidechainAttack', 0.001, 0.2, 0.001).name('SC attack').onChange((v) => bus.set('sidechainAttack', v));
  fft.add(p, 'sidechainRelease', 0.05, 1, 0.01).name('SC release').onChange((v) => bus.set('sidechainRelease', v));

  const col = gui.addFolder('Color / Light');
  col.add(p, 'hueBase', 0, 1, 0.001).name('Hue base').onChange((v) => bus.set('hueBase', v));
  col.add(p, 'hueFromPitch', 0, 1, 0.01).name('Hue←pitch').onChange((v) => bus.set('hueFromPitch', v));
  col.add(p, 'saturation', 0, 1, 0.01).name('Saturation').onChange((v) => bus.set('saturation', v));
  col.add(p, 'bloomStrength', 0, 3, 0.01).name('Bloom').onChange((v) => bus.set('bloomStrength', v));
  col.add(p, 'chromatic', 0, 0.03, 0.0005).name('Chromatic').onChange((v) => bus.set('chromatic', v));

  const cam = gui.addFolder('Camera');
  cam.add(p, 'fov', 0.5, 2.5, 0.01).name('FOV').onChange((v) => bus.set('fov', v));
  cam.add(p, 'camOrbit', 0, 2, 0.01).name('Orbit').onChange((v) => bus.set('camOrbit', v));
  cam.add(p, 'bpmCamPull', 0, 1, 0.01).name('BPM pull').onChange((v) => bus.set('bpmCamPull', v));
  cam.add(p, 'bpmCamZoom', 0, 1, 0.01).name('BPM zoom').onChange((v) => bus.set('bpmCamZoom', v));
  cam.add(p, 'shakeAmount', 0, 0.4, 0.001).name('Shake').onChange((v) => bus.set('shakeAmount', v));

  // ── Mode-specific ──────────────────────────────────────────────────────────
  const singularity = gui.addFolder('Stable Singularity');
  singularity.add(p, 'mandelPower', 2, 16, 0.1).name('Lensing Power').onChange((v) => bus.set('mandelPower', v));
  singularity.add(p, 'warpStrength', 0, 1.5, 0.01).name('Disk Turbulence').onChange((v) => bus.set('warpStrength', v));
  singularity.add(p, 'camOrbit', 0, 2, 0.01).name('Orbital Velocity').onChange((v) => bus.set('camOrbit', v));

  const frac = gui.addFolder('Fractal');
  frac
    .add(p, 'foldFormula', ['sin', 'square', 'tri', 'abs'])
    .name('Fold formula')
    .onChange((v) => bus.set('foldFormula', v));
  frac.add(p, 'foldStrength', 0, 2, 0.01).name('Fold strength').onChange((v) => bus.set('foldStrength', v));
  frac.add(p, 'mandelPower', 2, 16, 0.1).name('Mandel power').onChange((v) => bus.set('mandelPower', v));
  frac.add(p, 'mandelIter', 4, 16, 1).name('Iterations').onChange((v) => bus.set('mandelIter', v));
  frac.add(p, 'warpStrength', 0, 1.5, 0.01).name('Warp').onChange((v) => bus.set('warpStrength', v));
  frac.add(p, 'fractalScale', 0.2, 2, 0.01).name('Scale').onChange((v) => bus.set('fractalScale', v));

  const fluid = gui.addFolder('Fluid / Mist');
  fluid.add(p, 'fluidForce', 0, 3, 0.01).name('Hat force').onChange((v) => bus.set('fluidForce', v));
  fluid.add(p, 'fluidDecay', 0.5, 0.99, 0.01).name('Decay').onChange((v) => bus.set('fluidDecay', v));
  fluid.add(p, 'mistDensity', 0, 1.5, 0.01).name('Mist').onChange((v) => bus.set('mistDensity', v));

  const particles = gui.addFolder('Sci-Fi Particles');
  particles.add(p, 'particleDensity', 0, 1, 0.01).name('Density / count').onChange((v) => bus.set('particleDensity', v));
  particles.add(p, 'trailLength', 0, 1, 0.01).name('Trail length').onChange((v) => bus.set('trailLength', v));
  particles.add(p, 'explosionForce', 0, 3, 0.01).name('Explosion force').onChange((v) => bus.set('explosionForce', v));
  particles.add(p, 'turbulence', 0, 2, 0.01).name('Turbulence').onChange((v) => bus.set('turbulence', v));
  particles.add(p, 'colorSpeed', 0, 2, 0.01).name('Color speed').onChange((v) => bus.set('colorSpeed', v));
  particles.add(p, 'attractRepel', -1, 1, 0.01).name('Attract / repel').onChange((v) => bus.set('attractRepel', v));

  const earth = gui.addFolder('Dark Earth');
  earth.add(p, 'atmosphereBase', 0, 2, 0.01).name('Atmosphere base').onChange((v) => bus.set('atmosphereBase', v));
  earth.add(p, 'atmosphereAudio', 0, 2, 0.01).name('Atmosphere←808').onChange((v) => bus.set('atmosphereAudio', v));
  earth.add(p, 'nightLights', 0, 2, 0.01).name('Night lights').onChange((v) => bus.set('nightLights', v));
  earth.add(p, 'ringEnabled').name('Debris ring').onChange((v) => bus.set('ringEnabled', v));
  earth.add(p, 'ringOpacity', 0, 1, 0.01).name('Ring opacity').onChange((v) => bus.set('ringOpacity', v));
  earth.add(p, 'planetRough', 0, 1, 0.01).name('Surface detail').onChange((v) => bus.set('planetRough', v));
  earth.add(p, 'bpmOrbitLock').name('BPM orbit lock').onChange((v) => bus.set('bpmOrbitLock', v));
  earth.add(p, 'orbitSpeed', 0, 2, 0.01).name('Orbit speed').onChange((v) => bus.set('orbitSpeed', v));

  const tunnel = gui.addFolder('Cyber Tunnel');
  tunnel.add(p, 'tunnelSpeed', 0.1, 3, 0.01).name('Speed').onChange((v) => bus.set('tunnelSpeed', v));
  tunnel.add(p, 'tunnelDistort', 0, 2, 0.01).name('Distortion').onChange((v) => bus.set('tunnelDistort', v));
  tunnel.add(p, 'gridDensity', 0.25, 3, 0.01).name('Grid density').onChange((v) => bus.set('gridDensity', v));
  tunnel
    .add(p, 'wallStyle', ['grid', 'solid'])
    .name('Wall style')
    .onChange((v) => bus.set('wallStyle', v));
  tunnel.add(p, 'tunnelRadius', 0.4, 2, 0.01).name('Radius').onChange((v) => bus.set('tunnelRadius', v));
  tunnel.add(p, 'neonIntensity', 0, 3, 0.01).name('Neon intensity').onChange((v) => bus.set('neonIntensity', v));

  const life = gui.addFolder('Particle Life (math)');
  life.add(p, 'lifeDensity', 0, 1, 0.01).name('Density').onChange((v) => bus.set('lifeDensity', v));
  life.add(p, 'lifeForce', 0, 2, 0.01).name('Force scale').onChange((v) => bus.set('lifeForce', v));
  life.add(p, 'lifeChaos', 0, 2, 0.01).name('Chaos').onChange((v) => bus.set('lifeChaos', v));
  life.add(p, 'lifeSpecies', 3, 6, 1).name('Species').onChange((v) => bus.set('lifeSpecies', v));
  life.add(p, 'lifeTrail', 0, 1, 0.01).name('Trail').onChange((v) => bus.set('lifeTrail', v));

  const geometry = gui.addFolder('Geometry Light');
  geometry.add(p, 'geoMorph', 0, 1, 0.01).name('Morph form').onChange((v) => bus.set('geoMorph', v));
  geometry.add(p, 'geoWire', 0, 1, 0.01).name('Wire / edge').onChange((v) => bus.set('geoWire', v));
  geometry.add(p, 'geoLightCount', 4, 24, 1).name('Light particles').onChange((v) => bus.set('geoLightCount', v));
  geometry.add(p, 'geoSpin', 0, 2, 0.01).name('Spin').onChange((v) => bus.set('geoSpin', v));
  geometry.add(p, 'geoGlow', 0, 2, 0.01).name('Glow').onChange((v) => bus.set('geoGlow', v));

  // ── FL Studio Audio Editor Folder ───────────────────────────────────────────
  const audioEd = gui.addFolder('FL Studio · Audio DSP');
  audioEd.add(p, 'tempoSpeed', 0.5, 2.0, 0.01).name('Tempo Speed').onChange((v) => bus.set('tempoSpeed', v));
  audioEd.add(p, 'eqBass', -12, 12, 0.5).name('EQ Bass (dB)').onChange((v) => bus.set('eqBass', v));
  audioEd.add(p, 'eqMid', -12, 12, 0.5).name('EQ Mid (dB)').onChange((v) => bus.set('eqMid', v));
  audioEd.add(p, 'eqHigh', -12, 12, 0.5).name('EQ High (dB)').onChange((v) => bus.set('eqHigh', v));
  audioEd.add(p, 'filterLpf', 500, 20000, 100).name('Lowpass Filter').onChange((v) => bus.set('filterLpf', v));
  audioEd.add(p, 'filterHpf', 20, 4000, 10).name('Highpass Filter').onChange((v) => bus.set('filterHpf', v));
  audioEd.add(p, 'bassBoost', 0, 1, 0.02).name('808 Saturator').onChange((v) => bus.set('bassBoost', v));

  // ── Filmora Video & Text FX ───────────────────────────────────────────────
  const filmora = gui.addFolder('Filmora · Video & Titles');
  filmora
    .add(p, 'videoFilter', ['none', 'vhs', 'grain', 'cyberpunk', 'retro'])
    .name('Video FX Filter')
    .onChange((v) => bus.set('videoFilter', v));
  filmora.add(p, 'textTitle').name('Title Text').onChange((v) => bus.set('textTitle', v));
  filmora.add(p, 'textSub').name('Subtitle Text').onChange((v) => bus.set('textSub', v));
  filmora
    .add(p, 'textStyle', ['glow', 'neon', 'cyber', 'minimal'])
    .name('Text Style')
    .onChange((v) => bus.set('textStyle', v));
  filmora
    .add(p, 'textAnimation', ['pulse', 'bounce', 'static'])
    .name('Beat Anim')
    .onChange((v) => bus.set('textAnimation', v));
  filmora.add(p, 'textYPos', 0.1, 0.95, 0.01).name('Text Y Position').onChange((v) => bus.set('textYPos', v));

  const exp = gui.addFolder('Export / DSP');
  exp
    .add(p, 'aspect', ['9:16', '1:1', '16:9'])
    .name('Aspect')
    .onChange((v) => {
      bus.set('aspect', v);
      onAspect?.(v);
    });
  exp.add(p, 'exportFps', 24, 60, 1).name('FPS').onChange((v) => bus.set('exportFps', v));
  exp.add(p, 'useBackendDsp').name('Backend DSP').onChange((v) => bus.set('useBackendDsp', v));

  const preset = {
    save: () => {
      bus.save();
      onPreset?.('saved');
    },
    load: () => {
      bus.load();
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      applyFolderVisibility(bus.params.visualMode);
      onMode?.(bus.params.visualMode);
      onPreset?.('loaded');
    },
    reset: () => {
      bus.reset();
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      applyFolderVisibility(bus.params.visualMode);
      onMode?.(bus.params.visualMode);
      onPreset?.('reset');
    },
  };
  gui.add(preset, 'save').name('Save preset');
  gui.add(preset, 'load').name('Load preset');
  gui.add(preset, 'reset').name('Reset defaults');

  function setFolderVisible(folder, visible) {
    folder.domElement.style.display = visible ? '' : 'none';
  }

  function applyFolderVisibility(mode) {
    setFolderVisible(singularity, mode === 'singularity');
    setFolderVisible(frac, mode === 'fractal');
    setFolderVisible(fluid, mode === 'fractal');
    setFolderVisible(particles, mode === 'particles');
    setFolderVisible(earth, mode === 'earth');
    setFolderVisible(tunnel, mode === 'tunnel');
    setFolderVisible(life, mode === 'life');
    setFolderVisible(geometry, mode === 'geometry');
  }

  applyFolderVisibility(p.visualMode || 'fractal');

  return {
    gui,
    applyFolderVisibility,
    modeLabels,
    refresh() {
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      applyFolderVisibility(bus.params.visualMode);
    },
  };
}
