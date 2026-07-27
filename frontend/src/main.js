/**
 * DJ Caat — multi-mode Phonk visual engine
 * Modes: fractal | particles | earth | tunnel
 * Audio context is never reset on mode switch.
 */

import { ParameterBus } from './controls/parameterBus.js';
import {
  MODE_CATALOG,
  MODE_CATEGORIES,
  getMode,
  getModesByCategory,
} from './modes/catalog.js';
import { buildGui } from './controls/gui.js';
import { AudioEngine } from './audio/engine.js';
import { FractalRenderer } from './three/renderer.js';
import { MediaTimeline } from './media/timeline.js';
import { InstagramExporter, ASPECT_PRESETS } from './export/instagram.js';

const canvas = document.getElementById('c');
const bus = new ParameterBus();
bus.load();

// Ensure aspect stays 9:16 primary default if missing
if (!bus.params.aspect) bus.set('aspect', '9:16');

const audio = new AudioEngine(bus);
const visual = new FractalRenderer(canvas, bus);
const timeline = new MediaTimeline({
  audio,
  renderer: visual,
  layerListEl: document.getElementById('layerList'),
});
const exporter = new InstagramExporter({
  renderer: visual,
  bus,
  audio,
  onStatus: (msg) => {
    const el = document.getElementById('recordStatus');
    if (el) el.textContent = msg;
  },
});

// Default / saved Instagram framing (9:16 primary)
exporter.applyAspect(bus.params.aspect || '9:16');
visual.setMode(bus.params.visualMode || 'fractal');

const guiApi = buildGui(bus, {
  onAspect: (v) => exporter.applyAspect(v),
  onMode: (mode) => {
    visual.setMode(mode);
    syncModeUI(mode);
    const el = document.getElementById('recordStatus');
    if (el) el.textContent = `Mode · ${getMode(mode).label}`;
  },
  onPreset: (t) => {
    const el = document.getElementById('recordStatus');
    if (el) el.textContent = `Preset ${t}`;
    visual.setMode(bus.params.visualMode);
    syncModeUI(bus.params.visualMode);
  },
});

// ── Visual mode dropdown + quick chips ───────────────────────────────────────

const modeSelect = document.getElementById('modeSelect');
const modeCategory = document.getElementById('modeCategory');
const modeMeta = document.getElementById('modeMeta');
const modeQuick = document.getElementById('modeQuick');

const QUICK_IDS = [
  'fractal',
  'singularity',
  'spectrum',
  'kaleido',
  'warp',
  'tunnel',
  'particles',
  'rings',
];

function fillModeSelect(category = 'All', keepId) {
  if (!modeSelect) return;
  const list = getModesByCategory(category);
  modeSelect.innerHTML = '';
  for (const m of list) {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.label}`;
    modeSelect.appendChild(opt);
  }
  const prefer = keepId && list.some((m) => m.id === keepId) ? keepId : list[0]?.id;
  if (prefer) modeSelect.value = prefer;
}

function updateModeMeta(mode) {
  const m = getMode(mode);
  if (modeMeta) {
    modeMeta.textContent = `${m.category} · ${m.desc}${m.inspired ? ` · ${m.inspired}` : ''}`;
  }
}

function syncModeUI(mode) {
  const m = getMode(mode);
  if (modeCategory && modeCategory.value !== 'All' && modeCategory.value !== m.category) {
    // keep filter; if mode not in filter, switch to All
    const inFilter = getModesByCategory(modeCategory.value).some((x) => x.id === mode);
    if (!inFilter) {
      modeCategory.value = 'All';
      fillModeSelect('All', mode);
    }
  } else if (modeSelect && ![...modeSelect.options].some((o) => o.value === mode)) {
    fillModeSelect(modeCategory?.value || 'All', mode);
  }
  if (modeSelect) modeSelect.value = mode;
  updateModeMeta(mode);
  modeQuick?.querySelectorAll('.mode-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.mode === mode);
  });
}

function setVisualMode(mode) {
  if (!MODE_CATALOG.some((m) => m.id === mode)) return;
  bus.set('visualMode', mode);
  visual.setMode(mode);
  guiApi.applyFolderVisibility(mode);
  guiApi.refresh();
  syncModeUI(mode);
}

// Build category select extras (already in HTML) + mode list
if (modeCategory) {
  // Ensure all categories present
  for (const c of MODE_CATEGORIES) {
    if (![...modeCategory.options].some((o) => o.value === c)) {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = c;
      modeCategory.appendChild(o);
    }
  }
  modeCategory.addEventListener('change', () => {
    fillModeSelect(modeCategory.value, bus.params.visualMode);
    const next = modeSelect?.value;
    if (next) setVisualMode(next);
  });
}

fillModeSelect('All', bus.params.visualMode || 'fractal');
modeSelect?.addEventListener('change', () => setVisualMode(modeSelect.value));

// Quick-pick chips
if (modeQuick) {
  modeQuick.innerHTML = '';
  for (const id of QUICK_IDS) {
    const m = getMode(id);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'mode-chip';
    chip.dataset.mode = id;
    chip.textContent = m.label.replace('Phonk ', '').split(' ')[0];
    chip.title = m.label;
    chip.addEventListener('click', () => setVisualMode(id));
    modeQuick.appendChild(chip);
  }
}

syncModeUI(bus.params.visualMode || 'fractal');

// ── DOM wiring ───────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

$('audioFile')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  $('recordStatus').textContent = 'Loading audio…';
  try {
    await audio.loadFile(file);
    $('recordStatus').textContent = audio.metrics
      ? `DSP ready · ${audio.metrics.bpm?.toFixed?.(1) ?? '—'} BPM`
      : 'Audio ready (live FFT)';
    updateTimeLabel();
    drawWaveform(audio);
  } catch (err) {
    console.error(err);
    $('recordStatus').textContent = `Audio error: ${err.message}`;
  }
});

// FL Studio Tempo & DSP UI Wiring
const setTempo = (val) => {
  bus.set('tempoSpeed', val);
  const slider = $('tempoSlider');
  const label = $('tempoVal');
  if (slider) slider.value = String(val);
  if (label) label.textContent = `${val.toFixed(2)}x`;
};

$('presetSlowed')?.addEventListener('click', () => setTempo(0.85));
$('presetDrift')?.addEventListener('click', () => setTempo(0.92));
$('presetNormal')?.addEventListener('click', () => setTempo(1.0));
$('presetNightcore')?.addEventListener('click', () => setTempo(1.25));

$('tempoSlider')?.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  setTempo(val);
});

$('satSlider')?.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  bus.set('bassBoost', val);
  const label = $('satVal');
  if (label) label.textContent = val.toFixed(2);
});

$('eqLow')?.addEventListener('input', (e) => bus.set('eqBass', parseFloat(e.target.value)));
$('eqMid')?.addEventListener('input', (e) => bus.set('eqMid', parseFloat(e.target.value)));
$('eqHigh')?.addEventListener('input', (e) => bus.set('eqHigh', parseFloat(e.target.value)));
$('lpfSlider')?.addEventListener('input', (e) => bus.set('filterLpf', parseFloat(e.target.value)));

// Filmora Title & Filter FX Wiring
$('inputTitle')?.addEventListener('input', (e) => bus.set('textTitle', e.target.value));
$('inputSub')?.addEventListener('input', (e) => bus.set('textSub', e.target.value));
$('selectVideoFilter')?.addEventListener('change', (e) => bus.set('videoFilter', e.target.value));
$('selectTextAnim')?.addEventListener('change', (e) => bus.set('textAnimation', e.target.value));

$('videoFile')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  await timeline.loadVideo(file);
  $('recordStatus').textContent = 'Video layer loaded';
});

$('imageFile')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  await timeline.addImage(file);
  $('recordStatus').textContent = 'Image overlay added';
});

$('btnPlay')?.addEventListener('click', async () => {
  await audio.toggle();
  $('btnPlay').textContent = audio.playing ? '❚❚' : '▶';
  if (timeline.video) {
    if (audio.playing) timeline.video.play().catch(() => {});
    else timeline.video.pause();
  }
});

$('btnStop')?.addEventListener('click', () => {
  audio.stop();
  if (timeline.video) {
    timeline.video.pause();
    timeline.video.currentTime = timeline.videoMeta.trimIn || 0;
  }
  $('btnPlay').textContent = '▶';
  updateTimeLabel();
});

$('seek')?.addEventListener('input', (e) => {
  const d = audio.duration || 0;
  if (d > 0) {
    audio.seek((parseFloat(e.target.value) / 1000) * d);
    updateTimeLabel();
  }
});

$('volume')?.addEventListener('input', (e) => {
  audio.setVolume(parseFloat(e.target.value));
});

$('aspect')?.addEventListener('change', (e) => {
  exporter.applyAspect(e.target.value);
});

$('btnRecord')?.addEventListener('click', () => {
  exporter.toggleRecord();
  $('btnRecord').textContent = exporter.recording ? 'Stop Recording' : 'Record WebM';
});

$('btnStill')?.addEventListener('click', () => exporter.saveStill());

function drawWaveform(audio) {
  const cvs = document.getElementById('waveformCanvas');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const w = cvs.width;
  const h = cvs.height;
  ctx.clearRect(0, 0, w, h);

  const peaks = audio.waveformPeaks;
  if (!peaks || !peaks.length) {
    ctx.fillStyle = 'rgba(255, 45, 106, 0.3)';
    ctx.fillRect(0, h / 2 - 1, w, 2);
    return;
  }

  const progress = audio.duration ? audio.currentTime / audio.duration : 0;
  const barWidth = w / peaks.length;

  for (let i = 0; i < peaks.length; i++) {
    const peak = peaks[i];
    const barHeight = Math.max(2, peak * h);
    const x = i * barWidth;
    const y = (h - barHeight) / 2;

    if (i / peaks.length <= progress) {
      ctx.fillStyle = '#00f3ff';
    } else {
      ctx.fillStyle = 'rgba(255, 45, 106, 0.4)';
    }
    ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
  }
}

function fmt(t) {
  if (!Number.isFinite(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateTimeLabel() {
  const cur = audio.currentTime;
  const dur = audio.duration || 0;
  const label = $('timeLabel');
  if (label) label.textContent = `${fmt(cur)} / ${fmt(dur)}`;
  const seek = $('seek');
  if (seek && dur > 0 && document.activeElement !== seek) {
    seek.value = String(Math.floor((cur / dur) * 1000));
  }
}

function updateMeters(sample) {
  const setW = (id, v) => {
    const el = $(id);
    if (el) el.style.width = `${Math.round(clamp01(v) * 100)}%`;
  };
  setW('mBass', sample.bass808);
  setW('mPitch', sample.pitchConf * (sample.pitchHz > 0 ? 1 : 0.2));
  setW('mHat', sample.hat);
  const bpmEl = $('mBpm');
  if (bpmEl) bpmEl.textContent = sample.bpm ? sample.bpm.toFixed(1) : '—';
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

let idleT = 0;
let lastFrameT = performance.now();
let waveFrame = 0;
let lastMeterT = 0;

// Quality slider → renderer
window.addEventListener('dj-caat-quality', (e) => {
  visual.setQuality(e.detail);
});
// Apply saved quality once
visual.setQuality(bus.params.renderQuality ?? 0.7);

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastFrameT) / 1000);
  lastFrameT = now;
  idleT += dt;

  visual.tickAdaptive(dt);

  let sample = audio.sample();
  if (!audio.element) {
    sample = {
      bass808: 0.25 + 0.15 * Math.sin(idleT * 2.2),
      onset808: Math.max(0, Math.sin(idleT * 4.0)) ** 8,
      pitchHz: 800 + 200 * Math.sin(idleT * 0.4),
      pitchConf: 0.4,
      hat: 0.1 + 0.5 * Math.max(0, Math.sin(idleT * 12.0)) ** 4,
      beatPhase: (idleT * 2.3) % 1,
      bpm: 140,
      sidechain: 1 - 0.2 * Math.max(0, Math.sin(idleT * 2.2)) ** 6,
    };
  }

  timeline.syncFromAudio();
  timeline.updateTextOverlay(sample);
  visual.render(sample);

  // UI meters ~15fps is enough
  if (now - lastMeterT > 66) {
    updateMeters(sample);
    updateTimeLabel();
    const fpsEl = $('mFps');
    if (fpsEl) fpsEl.textContent = `${Math.round(visual.fps)}·Q${visual._quality.toFixed(2)}`;
    lastMeterT = now;
  }

  // Waveform ~10fps while playing
  if (audio.playing && ++waveFrame % 6 === 0) {
    drawWaveform(audio);
  }
}

requestAnimationFrame(frame);

console.info(
  '%cDJ Caat Visual Engine',
  'color:#ff2d6a;font-weight:bold',
  `\n${MODE_CATALOG.length} modes:`,
  MODE_CATALOG.map((m) => m.id).join(' | '),
  '\nAspects:',
  Object.keys(ASPECT_PRESETS).join(', '),
);
