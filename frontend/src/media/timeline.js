/**
 * Multi-track media control: audio (master clock), video layer, image overlays.
 * Timeline-style trim / opacity / transform for Instagram-style edits.
 */

export class MediaTimeline {
  /**
   * @param {object} opts
   * @param {import('../audio/engine.js').AudioEngine} opts.audio
   * @param {import('../three/renderer.js').FractalRenderer} opts.renderer
   * @param {HTMLElement} opts.layerListEl
   * @param {(layers: object) => void} [opts.onChange]
   */
  constructor({ audio, renderer, layerListEl, onChange }) {
    this.audio = audio;
    this.renderer = renderer;
    this.layerListEl = layerListEl;
    this.onChange = onChange || (() => {});

    /** @type {HTMLVideoElement | null} */
    this.video = null;
    this.videoUrl = null;
    this.videoMeta = {
      name: '',
      opacity: 0.55,
      muted: true,
      speed: 1,
      trimIn: 0,
      trimOut: 0, // 0 = full
    };

    /** @type {{ id: string, name: string, url: string, img: HTMLImageElement, x: number, y: number, scale: number, opacity: number, el: HTMLDivElement }[]} */
    this.images = [];
    this._overlayRoot = null;
    this._textRoot = null;
    this._ensureOverlayRoot();
    this._ensureTextOverlay();
  }

  _ensureOverlayRoot() {
    let root = document.getElementById('imageOverlays');
    if (!root) {
      root = document.createElement('div');
      root.id = 'imageOverlays';
      Object.assign(root.style, {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
        zIndex: '5',
        overflow: 'hidden',
      });
      const host = document.getElementById('stage') || document.getElementById('app');
      host?.appendChild(root);
    }
    this._overlayRoot = root;
  }

  _ensureTextOverlay() {
    let textRoot = document.getElementById('textOverlayContainer');
    if (!textRoot) {
      textRoot = document.createElement('div');
      textRoot.id = 'textOverlayContainer';
      Object.assign(textRoot.style, {
        position: 'absolute',
        left: '50%',
        bottom: '12%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: '10',
        textAlign: 'center',
        width: '90%',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        transition: 'transform 0.05s ease-out',
      });
      textRoot.innerHTML = `
        <div id="textTitleEl" style="font-size: 2.2rem; font-weight: 900; color: #fff; text-shadow: 0 0 20px #ff2d6a, 0 0 40px #00f3ff;"></div>
        <div id="textSubEl" style="font-size: 0.95rem; font-weight: 600; color: #00f3ff; margin-top: 6px; letter-spacing: 0.3em; opacity: 0.9;"></div>
      `;
      this._overlayRoot.appendChild(textRoot);
    }
    this._textRoot = textRoot;
  }

  updateTextOverlay(sample = {}) {
    const bus = this.renderer.bus;
    if (!bus) return;
    const p = bus.params;
    const titleEl = document.getElementById('textTitleEl');
    const subEl = document.getElementById('textSubEl');
    if (!titleEl || !subEl || !this._textRoot) return;

    titleEl.textContent = p.textTitle || '';
    subEl.textContent = p.textSub || '';

    this._textRoot.style.bottom = `${(1 - (p.textYPos || 0.82)) * 100}%`;
    titleEl.style.fontSize = `${(p.textFontSize || 42) / 16}rem`;

    // Audio animation reactivity
    const bass = sample.bass808 || 0;
    const beat = sample.beatPhase || 0;
    let scale = 1.0;

    if (p.textAnimation === 'pulse') {
      scale = 1.0 + bass * 0.18;
    } else if (p.textAnimation === 'bounce') {
      scale = 1.0 + 0.15 * Math.abs(Math.sin(beat * Math.PI));
    }
    this._textRoot.style.transform = `translateX(-50%) scale(${scale})`;

    // Style presets
    if (p.textStyle === 'glow') {
      titleEl.style.textShadow = '0 0 20px #ff2d6a, 0 0 40px #00f3ff, 0 0 60px #ff2d6a';
      titleEl.style.color = '#ffffff';
    } else if (p.textStyle === 'neon') {
      titleEl.style.textShadow = '0 0 10px #00f3ff, 0 0 30px #00f3ff';
      titleEl.style.color = '#00f3ff';
    } else if (p.textStyle === 'cyber') {
      titleEl.style.textShadow = '3px 3px 0px #ff2d6a, -3px -3px 0px #00f3ff';
      titleEl.style.color = '#ffffff';
    } else {
      titleEl.style.textShadow = 'none';
      titleEl.style.color = '#ffffff';
    }

    // Video Filter overlay
    const stage = document.getElementById('stage');
    if (stage) {
      stage.classList.remove('filter-vhs', 'filter-grain', 'filter-cyberpunk', 'filter-retro');
      if (p.videoFilter && p.videoFilter !== 'none') {
        stage.classList.add(`filter-${p.videoFilter}`);
      }
    }
  }

  async loadVideo(file) {
    this.clearVideo();
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.playsInline = true;
    video.loop = true;
    video.muted = this.videoMeta.muted;
    video.crossOrigin = 'anonymous';
    await video.play().catch(() => {});
    video.pause();
    video.currentTime = 0;

    this.video = video;
    this.videoUrl = url;
    this.videoMeta.name = file.name;
    this.videoMeta.trimOut = 0;
    this.renderer.setVideo(video, this.videoMeta.opacity);
    this.renderLayerList();
    this.onChange(this.snapshot());
  }

  clearVideo() {
    if (this.video) {
      this.video.pause();
      this.video.src = '';
    }
    if (this.videoUrl) URL.revokeObjectURL(this.videoUrl);
    this.video = null;
    this.videoUrl = null;
    this.renderer.setVideo(null);
    this.renderLayerList();
  }

  async addImage(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode().catch(() => {});

    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%) scale(1)',
      opacity: '1',
      pointerEvents: 'none',
    });
    const tag = document.createElement('img');
    tag.src = url;
    tag.alt = file.name;
    Object.assign(tag.style, {
      maxWidth: '40vw',
      maxHeight: '40vh',
      display: 'block',
      filter: 'drop-shadow(0 0 12px rgba(255,45,106,0.45))',
    });
    el.appendChild(tag);
    this._overlayRoot.appendChild(el);

    const layer = {
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      url,
      img,
      x: 0.5,
      y: 0.5,
      scale: 1,
      opacity: 1,
      el,
    };
    this.images.push(layer);
    this._applyImageTransform(layer);
    this.renderLayerList();
    this.onChange(this.snapshot());
  }

  removeImage(id) {
    const i = this.images.findIndex((l) => l.id === id);
    if (i < 0) return;
    const layer = this.images[i];
    layer.el.remove();
    URL.revokeObjectURL(layer.url);
    this.images.splice(i, 1);
    this.renderLayerList();
    this.onChange(this.snapshot());
  }

  _applyImageTransform(layer) {
    const { el, x, y, scale, opacity } = layer;
    el.style.left = `${x * 100}%`;
    el.style.top = `${y * 100}%`;
    el.style.transform = `translate(-50%, -50%) scale(${scale})`;
    el.style.opacity = String(opacity);
  }

  /**
   * Sync video clock to audio master when both present.
   */
  syncFromAudio() {
    if (!this.video || !this.audio.element) return;
    const a = this.audio.currentTime;
    const v = this.video;
    // Trim window
    const trimIn = this.videoMeta.trimIn || 0;
    let trimOut = this.videoMeta.trimOut;
    if (!trimOut || trimOut <= trimIn) trimOut = v.duration || 0;

    const span = Math.max(0.01, trimOut - trimIn);
    const local = trimIn + (a % span);

    if (this.audio.playing) {
      if (v.paused) v.play().catch(() => {});
      // Soft resync if drift > 80ms
      if (Math.abs(v.currentTime - local) > 0.08) {
        v.currentTime = local;
      }
      v.playbackRate = this.videoMeta.speed || 1;
    } else if (!v.paused) {
      v.pause();
      v.currentTime = local;
    }
  }

  setVideoOpacity(v) {
    this.videoMeta.opacity = v;
    this.renderer.setVideoOpacity(v);
  }

  snapshot() {
    return {
      video: this.video
        ? { name: this.videoMeta.name, ...this.videoMeta }
        : null,
      images: this.images.map(({ id, name, x, y, scale, opacity }) => ({
        id,
        name,
        x,
        y,
        scale,
        opacity,
      })),
    };
  }

  renderLayerList() {
    if (!this.layerListEl) return;
    this.layerListEl.innerHTML = '';

    if (this.video) {
      const item = document.createElement('div');
      item.className = 'layer-item';
      item.innerHTML = `
        <div class="name">🎬 ${escapeHtml(this.videoMeta.name)}</div>
        <label>Opacity <input type="range" min="0" max="1" step="0.01" value="${this.videoMeta.opacity}" data-vop /></label>
        <label>Speed <input type="range" min="0.25" max="2" step="0.05" value="${this.videoMeta.speed}" data-vsp /></label>
        <label><input type="checkbox" data-vmute ${this.videoMeta.muted ? 'checked' : ''}/> Mute</label>
        <button type="button" data-vrm>Remove</button>
      `;
      item.querySelector('[data-vop]').addEventListener('input', (e) => {
        this.setVideoOpacity(parseFloat(e.target.value));
      });
      item.querySelector('[data-vsp]').addEventListener('input', (e) => {
        this.videoMeta.speed = parseFloat(e.target.value);
        if (this.video) this.video.playbackRate = this.videoMeta.speed;
      });
      item.querySelector('[data-vmute]').addEventListener('change', (e) => {
        this.videoMeta.muted = e.target.checked;
        if (this.video) this.video.muted = this.videoMeta.muted;
      });
      item.querySelector('[data-vrm]').addEventListener('click', () => this.clearVideo());
      this.layerListEl.appendChild(item);
    }

    for (const layer of this.images) {
      const item = document.createElement('div');
      item.className = 'layer-item';
      item.innerHTML = `
        <div class="name">🖼 ${escapeHtml(layer.name)}</div>
        <label>Opacity <input type="range" min="0" max="1" step="0.01" value="${layer.opacity}" data-op /></label>
        <label>Scale <input type="range" min="0.1" max="3" step="0.05" value="${layer.scale}" data-sc /></label>
        <label>X <input type="range" min="0" max="1" step="0.01" value="${layer.x}" data-x /></label>
        <label>Y <input type="range" min="0" max="1" step="0.01" value="${layer.y}" data-y /></label>
        <button type="button" data-rm>Remove</button>
      `;
      item.querySelector('[data-op]').addEventListener('input', (e) => {
        layer.opacity = parseFloat(e.target.value);
        this._applyImageTransform(layer);
      });
      item.querySelector('[data-sc]').addEventListener('input', (e) => {
        layer.scale = parseFloat(e.target.value);
        this._applyImageTransform(layer);
      });
      item.querySelector('[data-x]').addEventListener('input', (e) => {
        layer.x = parseFloat(e.target.value);
        this._applyImageTransform(layer);
      });
      item.querySelector('[data-y]').addEventListener('input', (e) => {
        layer.y = parseFloat(e.target.value);
        this._applyImageTransform(layer);
      });
      item.querySelector('[data-rm]').addEventListener('click', () => this.removeImage(layer.id));
      this.layerListEl.appendChild(item);
    }
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
