/**
 * Instagram export presets + WebM recording / PNG stills.
 */

export const ASPECT_PRESETS = {
  '9:16': { w: 1080, h: 1920, label: 'Reels 9:16' },
  '1:1': { w: 1080, h: 1080, label: 'Square 1:1' },
  '16:9': { w: 1920, h: 1080, label: 'Landscape 16:9' },
};

export class InstagramExporter {
  /**
   * @param {object} opts
   * @param {import('../three/renderer.js').FractalRenderer} opts.renderer
   * @param {import('../controls/parameterBus.js').ParameterBus} opts.bus
   * @param {import('../audio/engine.js').AudioEngine} opts.audio
   * @param {(msg: string) => void} [opts.onStatus]
   */
  constructor({ renderer, bus, audio, onStatus }) {
    this.renderer = renderer;
    this.bus = bus;
    this.audio = audio;
    this.onStatus = onStatus || (() => {});
    this.recorder = null;
    this.chunks = [];
    this.recording = false;
  }

  applyAspect(aspectKey) {
    const preset = ASPECT_PRESETS[aspectKey] || ASPECT_PRESETS['9:16'];
    this.bus.set('aspect', aspectKey);
    this.renderer.setAspectLock({ w: preset.w, h: preset.h });
    document.body.classList.add('aspect-lock');
    this.onStatus(`Aspect ${preset.label}`);
    return preset;
  }

  clearAspectLock() {
    this.renderer.setAspectLock(null);
    document.body.classList.remove('aspect-lock');
  }

  saveStill() {
    const canvas = this.renderer.domElement;
    const a = document.createElement('a');
    a.download = `dj-caat-phonk-${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    this.onStatus('Still saved');
  }

  async startRecording() {
    if (this.recording) return;
    const canvas = this.renderer.domElement;
    const fps = this.bus.params.exportFps || 30;
    const bitrate = this.bus.params.exportBitrate || 8_000_000;

    const stream = canvas.captureStream(fps);

    // Mix audio if available
    try {
      if (this.audio.audioCtx && this.audio.gainNode) {
        const dest = this.audio.audioCtx.createMediaStreamDestination();
        this.audio.gainNode.connect(dest);
        for (const track of dest.stream.getAudioTracks()) {
          stream.addTrack(track);
        }
      }
    } catch (err) {
      console.warn('Audio mix for record failed', err);
    }

    const mime = pickMime();
    this.chunks = [];
    this.recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: bitrate,
    });
    this.recorder.ondataavailable = (e) => {
      if (e.data?.size) this.chunks.push(e.data);
    };
    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dj-caat-phonk-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      this.onStatus('Recording saved');
      this.recording = false;
    };
    this.recorder.start(200);
    this.recording = true;
    this.onStatus('Recording…');
  }

  stopRecording() {
    if (this.recorder && this.recording) {
      this.recorder.stop();
      this.onStatus('Finalizing…');
    }
  }

  toggleRecord() {
    if (this.recording) this.stopRecording();
    else this.startRecording();
  }
}

function pickMime() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return 'video/webm';
}
