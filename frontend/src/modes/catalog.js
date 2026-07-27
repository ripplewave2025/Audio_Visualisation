/**
 * Expandable visual mode catalog.
 * Inspired by techniques from Shadertoy, three.js examples, Book of Shaders,
 * particle-life, three.proton, webgl-wind — reimplemented as audio-reactive GLSL.
 *
 * Add a mode:
 *  1. Write frontend/src/shaders/<id>.frag.glsl
 *  2. Add entry here
 *  3. Import frag in three/renderer.js MODE_FRAG
 *  4. Optional: gui folder key in `guiFolder`
 */

/** @typedef {'Signature'|'Space'|'Particles'|'Math'|'Classic'|'Abstract'} ModeCategory */

/**
 * @typedef {object} ModeDef
 * @property {string} id
 * @property {string} label
 * @property {ModeCategory} category
 * @property {string} desc
 * @property {number} [dpr]
 * @property {string} [guiFolder] which lil-gui folder group to show
 * @property {string} [inspired] short credit / technique source
 */

/** @type {ModeDef[]} */
export const MODE_CATALOG = [
  // ── Signature ────────────────────────────────────────────────────────────
  {
    id: 'fractal',
    label: 'Phonk Fractal',
    category: 'Signature',
    desc: '4D Mandelbulb · fluid mist',
    dpr: 1.1,
    guiFolder: 'fractal',
    inspired: 'SDF raymarching / Mandelbulb',
  },
  {
    id: 'singularity',
    label: 'Singularity',
    category: 'Space',
    desc: 'Black hole · accretion disk',
    dpr: 1.35,
    guiFolder: 'singularity',
    inspired: 'Gravitational lensing stylization',
  },
  {
    id: 'earth',
    label: 'Dark Earth',
    category: 'Space',
    desc: 'Planet · atmosphere · ring',
    dpr: 1.25,
    guiFolder: 'earth',
    inspired: 'Fresnel atmosphere / orbital camera',
  },

  // ── Particles ────────────────────────────────────────────────────────────
  {
    id: 'particles',
    label: 'Sci-Fi Particles',
    category: 'Particles',
    desc: 'Neon trails · 808 explosions',
    dpr: 1.5,
    guiFolder: 'particles',
    inspired: 'GPU soft particles (Proton-style)',
  },
  {
    id: 'life',
    label: 'Particle Life',
    category: 'Math',
    desc: 'Attraction · species forces',
    dpr: 1.45,
    guiFolder: 'life',
    inspired: 'hunar4321/particle-life',
  },

  // ── Structure ────────────────────────────────────────────────────────────
  {
    id: 'tunnel',
    label: 'Cyber Tunnel',
    category: 'Classic',
    desc: 'Infinite neon · BPM speed',
    dpr: 1.5,
    guiFolder: 'tunnel',
    inspired: 'Classic demoscene tunnel',
  },
  {
    id: 'geometry',
    label: 'Geometry Light',
    category: 'Math',
    desc: 'SDF forms · orbit sparks',
    dpr: 1.25,
    guiFolder: 'geometry',
    inspired: 'three-bas crystal / SDF kit',
  },

  // ── New pack (expandable) ────────────────────────────────────────────────
  {
    id: 'spectrum',
    label: 'Spectrum Bars',
    category: 'Classic',
    desc: 'Neon EQ bars · beat punch',
    dpr: 1.6,
    guiFolder: 'fx',
    inspired: 'Classic audio spectrum visualizer',
  },
  {
    id: 'kaleido',
    label: 'Kaleidoscope',
    category: 'Abstract',
    desc: 'Mirror mandala · pitch hue',
    dpr: 1.55,
    guiFolder: 'fx',
    inspired: 'Book of Shaders domain fold / kaleido',
  },
  {
    id: 'plasma',
    label: 'Plasma Field',
    category: 'Abstract',
    desc: 'Interference plasma · hats',
    dpr: 1.55,
    guiFolder: 'fx',
    inspired: 'Demoscene plasma (Shadertoy family)',
  },
  {
    id: 'warp',
    label: 'Hyperspace Warp',
    category: 'Space',
    desc: 'Star streaks · 808 zoom',
    dpr: 1.5,
    guiFolder: 'fx',
    inspired: 'three.js starfield / warp tunnels',
  },
  {
    id: 'aurora',
    label: 'Aurora Ribbons',
    category: 'Abstract',
    desc: 'Flowing ribbons · bloom',
    dpr: 1.45,
    guiFolder: 'fx',
    inspired: 'Noise ribbons / aurora stylization',
  },
  {
    id: 'liquid',
    label: 'Liquid Metal',
    category: 'Abstract',
    desc: 'Chrome fluid · reflections',
    dpr: 1.35,
    guiFolder: 'fx',
    inspired: 'SDF metaballs / liquid metal looks',
  },
  {
    id: 'lattice',
    label: 'Neon Lattice',
    category: 'Classic',
    desc: 'Infinite cyber grid',
    dpr: 1.55,
    guiFolder: 'fx',
    inspired: 'Tron / cyberpunk grid floors',
  },
  {
    id: 'rings',
    label: 'Bass Rings',
    category: 'Classic',
    desc: 'Concentric shockwaves',
    dpr: 1.6,
    guiFolder: 'fx',
    inspired: 'Radial beat visualizers',
  },
  {
    id: 'scope',
    label: 'Lissajous Scope',
    category: 'Math',
    desc: 'Oscilloscope · phase curves',
    dpr: 1.6,
    guiFolder: 'fx',
    inspired: 'Vector scope / lissajous audio',
  },
  {
    id: 'voronoi',
    label: 'Voronoi Cells',
    category: 'Math',
    desc: 'Living cells · hat crackle',
    dpr: 1.4,
    guiFolder: 'fx',
    inspired: 'Worley/Voronoi noise (BoS)',
  },
  {
    id: 'matrix',
    label: 'Digital Rain',
    category: 'Classic',
    desc: 'Code cascade · green/magenta',
    dpr: 1.55,
    guiFolder: 'fx',
    inspired: 'Matrix rain / digital cascade',
  },
  {
    id: 'ripple',
    label: 'Sonic Ripple',
    category: 'Classic',
    desc: 'Pond ripples · multi-808',
    dpr: 1.55,
    guiFolder: 'fx',
    inspired: 'Wave interference / ripple maps',
  },
];

export const MODE_CATEGORIES = [
  'Signature',
  'Space',
  'Particles',
  'Math',
  'Classic',
  'Abstract',
];

export function getMode(id) {
  return MODE_CATALOG.find((m) => m.id === id) || MODE_CATALOG[0];
}

export function getModeIds() {
  return MODE_CATALOG.map((m) => m.id);
}

export function getModesByCategory(category) {
  if (!category || category === 'All') return MODE_CATALOG;
  return MODE_CATALOG.filter((m) => m.category === category);
}

/** For lil-gui dropdown options */
export function modeOptionsMap() {
  const o = {};
  for (const m of MODE_CATALOG) o[m.label] = m.id;
  return o;
}

/** Labels for GUI */
export function modeIdToLabel(id) {
  return getMode(id).label;
}
