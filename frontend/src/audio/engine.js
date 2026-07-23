/**
 * Audio transport + dual analysis path:
 *  1) Offline Python DSP metrics (frame-accurate, preferred for Phonk maps)
 *  2) Live WebAudio AnalyserNode fallback
 */

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function expSmooth(prev, next, alpha) {
  return alpha * prev + (1 - alpha) * next;
}

export class AudioEngine {
  /**
   * @param {import('../controls/parameterBus.js').ParameterBus} bus
   */
  constructor(bus) {
    this.bus = bus;
    this.audioCtx = null;
    this.element = null; // HTMLAudioElement
    this.sourceNode = null;
    this.analyser = null;
    this.gainNode = null;
    this.metrics = null; // backend analysis payload
    this.playing = false;
    this._freqData = null;
    this._smoothed = {
      bass808: 0,
      onset808: 0,
      pitchHz: 0,
      pitchConf: 0,
      hat: 0,
      beatPhase: 0,
      bpm: 0,
      sidechain: 1,
    };
    this._lastOnset = 0;
    this._beatPhaseClock = 0;
    this._listeners = new Set();
  }

  async ensureContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Load a local audio File into an HTMLAudioElement graph.
   * Optionally POST to backend /analyze for rich metrics.
   */
  async loadFile(file) {
    await this.ensureContext();
    this.stop();

    if (this.element) {
      this.element.pause();
      URL.revokeObjectURL(this.element.src);
    }

    const url = URL.createObjectURL(file);
    const el = new Audio();
    el.src = url;
    el.crossOrigin = 'anonymous';
    el.loop = true;
    await el.play().catch(() => {});
    el.pause();
    el.currentTime = 0;

    // Rebuild graph
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        /* already disconnected */
      }
    }

    this.element = el;
    this.sourceNode = this.audioCtx.createMediaElementSource(el);

    // 3-Band Equalizer
    this.eqLow = this.audioCtx.createBiquadFilter();
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.value = 100;

    this.eqMid = this.audioCtx.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1000;
    this.eqMid.Q.value = 1.0;

    this.eqHigh = this.audioCtx.createBiquadFilter();
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.value = 5000;

    // Filters (Lowpass & Highpass)
    this.lpf = this.audioCtx.createBiquadFilter();
    this.lpf.type = 'lowpass';

    this.hpf = this.audioCtx.createBiquadFilter();
    this.hpf.type = 'highpass';

    // Phonk 808 Saturator / Distortion
    this.saturator = this.audioCtx.createWaveShaper();
    this.saturator.curve = this._makeDistortionCurve(0);

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = this.bus.params.fftSmooth;

    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = 0.9;

    // Chain: Source -> LPF -> HPF -> LowEQ -> MidEQ -> HighEQ -> Saturator -> Analyser -> Gain -> Destination
    this.sourceNode.connect(this.lpf);
    this.lpf.connect(this.hpf);
    this.hpf.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.saturator);
    this.saturator.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);

    this._freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.metrics = null;
    this.waveformPeaks = null;

    // Decode AudioBuffer for visual waveform display
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
      this.waveformPeaks = this._extractWaveformPeaks(decodedBuffer, 300);
    } catch (err) {
      console.warn('[AudioEngine] Waveform decoding skipped/failed', err);
    }

    this.applyDspParams();

    // Listen for bus changes to update DSP in real-time
    this.bus.onChange(() => this.applyDspParams());

    // Backend DSP (optional)
    if (this.bus.params.useBackendDsp) {
      try {
        this.metrics = await this._analyzeBackend(file);
        if (this.metrics?.bpm) this._smoothed.bpm = this.metrics.bpm;
      } catch (err) {
        console.warn('[AudioEngine] backend DSP unavailable, using WebAudio FFT', err);
      }
    }

    this._emit('loaded', { duration: el.duration, hasMetrics: !!this.metrics, waveform: this.waveformPeaks });
    return el;
  }

  applyDspParams() {
    const p = this.bus.params;
    if (this.element) {
      this.element.playbackRate = p.tempoSpeed || 1.0;
    }
    if (this.eqLow) this.eqLow.gain.value = p.eqBass || 0;
    if (this.eqMid) this.eqMid.gain.value = p.eqMid || 0;
    if (this.eqHigh) this.eqHigh.gain.value = p.eqHigh || 0;
    if (this.lpf) this.lpf.frequency.value = p.filterLpf ?? 20000;
    if (this.hpf) this.hpf.frequency.value = p.filterHpf ?? 20;
    if (this.saturator) {
      this.saturator.curve = this._makeDistortionCurve(p.bassBoost || 0);
    }
  }

  _makeDistortionCurve(amount) {
    const k = amount * 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    return curve;
  }

  _extractWaveformPeaks(audioBuffer, numPeaks = 300) {
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.floor(channelData.length / numPeaks);
    const peaks = new Float32Array(numPeaks);
    for (let i = 0; i < numPeaks; i++) {
      let max = 0;
      const start = i * step;
      for (let j = 0; j < step; j++) {
        const val = Math.abs(channelData[start + j] || 0);
        if (val > max) max = val;
      }
      peaks[i] = max;
    }
    return peaks;
  }

  async _analyzeBackend(file) {
    const p = this.bus.params;
    const fd = new FormData();
    fd.append('file', file);
    const qs = new URLSearchParams({
      fft_smooth: String(p.fftSmooth),
      cross_low: String(p.crossLow),
      cross_mid: String(p.crossMid),
      cross_high: String(p.crossHigh),
      sidechain_depth: String(p.sidechainDepth),
      sidechain_attack: String(p.sidechainAttack),
      sidechain_release: String(p.sidechainRelease),
    });
    const base = p.backendUrl.replace(/\/$/, '');
    const res = await fetch(`${base}/analyze?${qs}`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`analyze ${res.status}`);
    return res.json();
  }

  setVolume(v) {
    if (this.gainNode) this.gainNode.gain.value = v;
    if (this.element) this.element.volume = v;
  }

  async play() {
    await this.ensureContext();
    if (!this.element) return;
    await this.element.play();
    this.playing = true;
    this._emit('play');
  }

  pause() {
    if (this.element) this.element.pause();
    this.playing = false;
    this._emit('pause');
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  stop() {
    if (this.element) {
      this.element.pause();
      this.element.currentTime = 0;
    }
    this.playing = false;
    this._emit('stop');
  }

  seek(t) {
    if (this.element && Number.isFinite(t)) {
      this.element.currentTime = Math.max(0, Math.min(t, this.element.duration || t));
    }
  }

  get currentTime() {
    return this.element?.currentTime ?? 0;
  }

  get duration() {
    return this.element?.duration ?? 0;
  }

  on(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _emit(type, data) {
    for (const fn of this._listeners) fn(type, data);
  }

  /**
   * Sample analysis at current transport time.
   * Prefer backend frame arrays; else live FFT bands.
   */
  sample() {
    const p = this.bus.params;
    const alpha = p.fftSmooth;
    let bass = 0;
    let mid = 0;
    let high = 0;
    let onset = 0;
    let pitchHz = 0;
    let pitchConf = 0;
    let hat = 0;
    let beatPhase = this._smoothed.beatPhase;
    let bpm = this._smoothed.bpm;
    let sidechain = 1;

    const t = this.currentTime;

    if (this.metrics?.frames && this.metrics.times?.length) {
      const frames = this.metrics.frames;
      const times = this.metrics.times;
      // Binary search frame index
      let i = this._frameIndex(times, t);
      i = Math.max(0, Math.min(i, frames.bass808.length - 1));
      bass = frames.bass808[i] ?? 0;
      mid = frames.mid[i] ?? 0;
      high = frames.high[i] ?? 0;
      onset = frames.onset808[i] ?? 0;
      pitchHz = frames.pitchHz[i] ?? 0;
      pitchConf = frames.pitchConf[i] ?? 0;
      hat = frames.hatTransient[i] ?? 0;
      beatPhase = frames.beatPhase[i] ?? 0;
      sidechain = frames.sidechain[i] ?? 1;
      bpm = this.metrics.bpm ?? bpm;
    } else if (this.analyser && this._freqData) {
      this.analyser.smoothingTimeConstant = p.fftSmooth;
      this.analyser.getByteFrequencyData(this._freqData);
      const sr = this.audioCtx?.sampleRate ?? 44100;
      const binHz = sr / this.analyser.fftSize;
      bass = this._band(this._freqData, binHz, 20, p.crossLow);
      mid = this._band(this._freqData, binHz, p.crossMid, Math.min(2000, p.crossHigh));
      high = this._band(this._freqData, binHz, p.crossHigh, sr * 0.45);
      // Pseudo onset: bass rising edge
      onset = clamp01((bass - this._lastOnset) * 4 + bass * 0.3);
      this._lastOnset = bass;
      // Pseudo pitch from spectral peak in melody band
      const peak = this._peakHz(this._freqData, binHz, 400, 2000);
      pitchHz = peak.hz;
      pitchConf = peak.conf;
      hat = clamp01(high * 0.7 + Math.max(0, high - mid) * 0.5);
      // Synthetic beat phase from BPM estimate
      if (bpm <= 0) bpm = 140;
      if (this.playing) {
        this._beatPhaseClock = (t * (bpm / 60)) % 1;
      }
      beatPhase = this._beatPhaseClock;
      // Sidechain from bass
      const target = 1 - p.sidechainDepth * clamp01(bass * 1.2);
      sidechain = expSmooth(this._smoothed.sidechain, target, 0.6);
    }

    const s = this._smoothed;
    s.bass808 = expSmooth(s.bass808, bass, alpha);
    s.onset808 = expSmooth(s.onset808, onset, Math.max(0.2, alpha - 0.35));
    s.pitchHz = expSmooth(s.pitchHz, pitchHz, alpha);
    s.pitchConf = expSmooth(s.pitchConf, pitchConf, alpha);
    s.hat = expSmooth(s.hat, hat, Math.max(0.25, alpha - 0.3));
    s.beatPhase = beatPhase;
    s.bpm = bpm;
    s.sidechain = expSmooth(s.sidechain, sidechain, 0.5);
    // Apply fluidDecay as hat persistence when idle
    if (!this.playing) {
      s.hat *= p.fluidDecay;
      s.bass808 *= 0.98;
    }

    return { ...s };
  }

  _frameIndex(times, t) {
    let lo = 0;
    let hi = times.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (times[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0 && Math.abs(times[lo - 1] - t) < Math.abs(times[lo] - t)) return lo - 1;
    return lo;
  }

  _band(data, binHz, lo, hi) {
    const i0 = Math.max(0, Math.floor(lo / binHz));
    const i1 = Math.min(data.length - 1, Math.ceil(hi / binHz));
    if (i1 <= i0) return 0;
    let sum = 0;
    for (let i = i0; i <= i1; i++) sum += data[i];
    return clamp01(sum / ((i1 - i0 + 1) * 255));
  }

  _peakHz(data, binHz, lo, hi) {
    const i0 = Math.max(0, Math.floor(lo / binHz));
    const i1 = Math.min(data.length - 1, Math.ceil(hi / binHz));
    let best = 0;
    let bestI = i0;
    for (let i = i0; i <= i1; i++) {
      if (data[i] > best) {
        best = data[i];
        bestI = i;
      }
    }
    return { hz: bestI * binHz, conf: clamp01(best / 255) };
  }
}
