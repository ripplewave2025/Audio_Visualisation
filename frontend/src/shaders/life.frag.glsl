// Particle Life (math/physics) — GPU approximation of hunar4321/particle-life.
// Species attract/repel via a force matrix; audio modulates forces & chaos.
// Performance: fixed soft-particle count (not full N² agent sim).

precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uResolution;
uniform float uBass808;
uniform float uOnset808;
uniform float uPitchHz;
uniform float uPitchConf;
uniform float uHat;
uniform float uBeatPhase;
uniform float uBpm;
uniform float uSidechain;
uniform float uHueBase;
uniform float uHueFromPitch;
uniform float uSaturation;
uniform float uBloom;
uniform float uChromatic;
uniform float uShake;

uniform float uLifeDensity;
uniform float uLifeForce;
uniform float uLifeChaos;
uniform float uLifeSpecies; // 3–6 visual species
uniform float uLifeTrail;

uniform sampler2D uVideoTex;
uniform float uVideoOpacity;
uniform float uHasVideo;

float hash11(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

vec2 hash12(float n) {
  return fract(sin(vec2(n, n + 19.19)) * vec2(43758.5453, 22578.1459));
}

// Force matrix entry for species a → b (periodic phonk-friendly rules)
float rule(float a, float b, float t) {
  float k = a * 7.0 + b * 3.1;
  float base = sin(k * 1.7 + t * 0.05) * 0.55 + cos(k * 0.9) * 0.35;
  // 808 strengthens attraction magnitude
  base *= (0.65 + uLifeForce * (0.5 + uBass808 * 0.9));
  // hats inject chaos / sign flips
  base += (hash11(k + floor(t * 2.0)) - 0.5) * uLifeChaos * uHat * 1.5;
  return base;
}

vec3 hsl2rgb(float h, float s, float l) {
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float hp = mod(h, 1.0) * 6.0;
  float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));
  vec3 rgb;
  if (hp < 1.0) rgb = vec3(c, x, 0);
  else if (hp < 2.0) rgb = vec3(x, c, 0);
  else if (hp < 3.0) rgb = vec3(0, c, x);
  else if (hp < 4.0) rgb = vec3(0, x, c);
  else if (hp < 5.0) rgb = vec3(x, 0, c);
  else rgb = vec3(c, 0, x);
  return rgb + (l - 0.5 * c);
}

void main() {
  vec2 res = uResolution;
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;
  uv += uShake * (uOnset808 + uBass808 * 0.4) * 0.25 * vec2(sin(uTime * 40.0), cos(uTime * 36.0));

  vec3 col = vec3(0.015, 0.012, 0.03);
  float sc = max(uSidechain, 0.3);

  int nSpecies = int(clamp(uLifeSpecies, 3.0, 6.0));
  int count = int(mix(28.0, 70.0, clamp(uLifeDensity, 0.0, 1.0)));
  float t = uTime * (0.35 + (max(uBpm, 100.0) / 140.0) * 0.25);
  t += uBeatPhase * 0.4;

  float pitchN = uPitchHz > 1.0 ? clamp((uPitchHz - 400.0) / 1600.0, 0.0, 1.0) : 0.0;
  float hue0 = fract(uHueBase + uHueFromPitch * pitchN * 0.5);

  // Pseudo particle-life: each particle orbits under summed forces from species centroids
  for (int i = 0; i < 70; i++) {
    if (i >= count) break;
    float id = float(i) + 1.0;
    float sp = mod(id, float(nSpecies));
    vec2 seed = hash12(id * 3.1);

    // Base path from integrated force field (analytic stand-in for N-body)
    float fSelf = rule(sp, sp, t);
    float fNext = rule(sp, mod(sp + 1.0, float(nSpecies)), t);
    float fPrev = rule(sp, mod(sp + 2.0, float(nSpecies)), t);

    float ang = t * (0.4 + seed.x) + id + fSelf * 2.0 + uBass808 * 1.5;
    float rad = (0.2 + seed.y * 0.95) * sc;
    rad *= 1.0 + fNext * 0.25 - fPrev * 0.12;
    rad *= 1.0 + uOnset808 * uLifeForce * 0.35;

    vec2 pos = vec2(cos(ang), sin(ang * (1.0 + fNext * 0.1))) * rad;
    // Secondary species cluster offset
    float a2 = t * 0.2 + sp * 1.7;
    pos += 0.25 * vec2(cos(a2), sin(a2)) * (0.5 + fSelf * 0.5);
    pos += uLifeChaos * 0.08 * vec2(sin(t * 3.0 + id), cos(t * 2.5 - id));

    float sz = (0.014 + pitchN * 0.012 + uHat * 0.01) * (1.0 + uOnset808 * 0.5);
    vec3 neon = hsl2rgb(fract(hue0 + sp / float(nSpecies) * 0.45), clamp(uSaturation, 0.0, 1.0), 0.55);

    int trails = int(clamp(floor(uLifeTrail * 4.0) + 1.0, 1.0, 5.0));
    vec2 vel = vec2(-sin(ang), cos(ang)) * (0.3 + abs(fSelf));
    for (int k = 0; k < 5; k++) {
      if (k >= trails) break;
      float fk = float(k) / float(max(trails, 1));
      vec2 p = pos - vel * fk * uLifeTrail * 0.1;
      float d = length(uv - p);
      float g = smoothstep(sz * (1.0 + fk), 0.0, d) * (1.0 - fk);
      float core = smoothstep(sz * 0.4, 0.0, d);
      col += neon * (g * 0.5 + core * 1.1) * uBloom * (0.7 + uBass808 * 0.4);
    }
  }

  // Soft force-field haze
  float haze = exp(-length(uv) * 1.2) * (0.08 + uBass808 * 0.1);
  col += hsl2rgb(hue0, uSaturation, 0.4) * haze * uBloom;

  col *= smoothstep(1.4, 0.2, length(uv));
  float ca = uChromatic * (1.0 + uOnset808 * 3.0);
  col.r *= 1.0 + ca * 6.0;
  col.b *= 1.0 - ca * 3.0;

  if (uHasVideo > 0.5 && uVideoOpacity > 0.001) {
    vec3 vid = texture2D(uVideoTex, gl_FragCoord.xy / res).rgb;
    float cover = smoothstep(0.02, 0.4, max(col.r, max(col.g, col.b)));
    col = mix(vid * uVideoOpacity, col, clamp(0.4 + cover * 0.6, 0.0, 1.0));
  }

  col = col / (1.0 + col * 0.55);
  col = pow(clamp(col, 0.0, 1.0), vec3(0.9));
  gl_FragColor = vec4(col, 1.0);
}
