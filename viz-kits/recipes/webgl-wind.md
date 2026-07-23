# Kit: webgl-wind

**Upstream:** `vendor/webgl-wind` (ISC)  
**Ready:** `viz-kits/ready/lib/wind-gl.js`, `viz-kits/ready/shaders/wind/`

## Idea
GPU particles advected by a vector field texture (ping-pong FBO). Beautiful trails.

## Automate
1. Use `update.frag.glsl` + `draw.frag.glsl` as template.
2. Replace wind PNG with a 1D/2D texture packed from FFT bands.
3. 808 → speed uniform, hats → drop rate / noise.
