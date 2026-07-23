/**
 * DJ Caat — multi-mode Phonk visual engine
 * Modes: fractal | particles | earth | tunnel
 * Audio context is never reset on mode switch.
 */

import { ParameterBus, VISUAL_MODES } from './controls/parameterBus.js';
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
    syncModeButtons(mode);
    const el = document.getElementById('recordStatus');
    if (el) {
      const label = VISUAL_MODES.find((m) => m.id === mode)?.label || mode;
      el.textContent = `Mode · ${label}`;
    }
  },
  onPreset: (t) => {
    const el = document.getElementById('recordStatus');
    if (el) el.textContent = `Preset ${t}`;
    visual.setMode(bus.params.visualMode);
    syncModeButtons(bus.params.visualMode);
  },
});

// ── Visual mode UI (left panel) — instant switch, audio untouched ────────────

function syncModeButtons(mode) {
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

function setVisualMode(mode) {
  if (!VISUAL_MODES.some((m) => m.id === mode)) return;
  bus.set('visualMode', mode);
  visual.setMode(mode);
  guiApi.applyFolderVisibility(mode);
  guiApi.refresh();
  syncModeButtons(mode);
}

document.getElementById('modeGrid')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.mode-btn');
  if (!btn?.dataset?.mode) return;
  setVisualMode(btn.dataset.mode);
});

syncModeButtons(bus.params.visualMode || 'fractal');

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

function frame() {
  requestAnimationFrame(frame);
  idleT += 0.016;

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
  updateMeters(sample);
  updateTimeLabel();
  if (audio.playing) {
    drawWaveform(audio);
  }
}

frame();

console.info(
  '%cDJ Caat Visual Engine',
  'color:#ff2d6a;font-weight:bold',
  '\nModes:',
  VISUAL_MODES.map((m) => m.id).join(' | '),
  '\nAspects:',
  Object.keys(ASPECT_PRESETS).join(', '),
);
