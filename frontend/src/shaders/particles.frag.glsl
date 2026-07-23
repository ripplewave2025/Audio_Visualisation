// Sci-Fi Particles — GPU soft-particle field (no geometry points).
// Density-capped loop for stable 30–60fps; 808s explode, pitch/hats drive color & size.

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
uniform float uFov;

// Mode params
uniform float uParticleDensity;   // 0–1 → particle budget
uniform float uTrailLength;
uniform float uExplosionForce;
uniform float uTurbulence;
uniform float uColorSpeed;
uniform float uAttractRepel;      // -1 repel … +1 attract
uniform sampler2D uVideoTex;
uniform float uVideoOpacity;
uniform float uHasVideo;

float hash11(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

vec3 hash13(float n) {
  return fract(sin(vec3(n, n + 19.1, n + 47.3)) * vec3(43758.5453, 22578.1459, 19642.3490));
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

  float shake = uShake * (uOnset808 * 1.2 + uBass808 * 0.4);
  uv += shake * 0.4 * vec2(sin(uTime * 50.0), cos(uTime * 43.0));

  // Dark space background
  vec3 col = vec3(0.004, 0.005, 0.012);
  // faint stars
  float star = step(0.997, hash11(floor(uv.x * 90.0) + floor(uv.y * 90.0) * 17.0));
  col += star * 0.35 * vec3(0.7, 0.85, 1.0);

  float pitchN = uPitchHz > 1.0 ? clamp((uPitchHz - 400.0) / 1600.0, 0.0, 1.0) : 0.0;
  float hue = fract(uHueBase + uHueFromPitch * pitchN * uPitchConf + uTime * uColorSpeed * 0.08);

  // Particle budget: 24 base … 72 max (performance-safe)
  int count = int(mix(24.0, 72.0, clamp(uParticleDensity, 0.0, 1.0)));
  float explode = uOnset808 * uExplosionForce + uBass808 * uExplosionForce * 0.45;
  float sc = max(uSidechain, 0.25);
  float attract = uAttractRepel;

  // Trail layers along motion (cheap multi-sample along velocity)
  int trailSteps = int(clamp(floor(uTrailLength * 5.0) + 1.0, 1.0, 6.0));

  for (int i = 0; i < 72; i++) {
    if (i >= count) break;
    float id = float(i) + 1.0;
    vec3 rnd = hash13(id * 13.7);

    // Orbit / flow in 2D screen space with depth fake
    float z = mix(0.35, 2.2, rnd.z);
    float ang = uTime * (0.25 + rnd.x * 0.9) + id + uBeatPhase * 6.2831853 * 0.15;
    float rad = (0.15 + rnd.y * 1.1) * sc;

    // Turbulence
    vec2 turb = uTurbulence * 0.12 * vec2(
      sin(uTime * 1.7 + id * 0.6 + uHat * 4.0),
      cos(uTime * 1.3 - id * 0.4 + uBass808 * 3.0)
    );

    // Attract / repel toward origin
    float pull = attract * 0.35;
    rad *= (1.0 - pull * 0.5);

    vec2 vel = vec2(-sin(ang), cos(ang)) * (0.4 + explode * 0.5) + turb * 2.0;
    vec2 base = vec2(cos(ang), sin(ang)) * rad;
    // 808 explosion pushes outward
    base *= (1.0 + explode * (0.5 + rnd.x));
    base += turb;
    // Attract residual
    base *= (1.0 - pull * 0.25);
    base /= z * (0.7 + uFov * 0.25);

    // Size: pitch + hats
    float sz = (0.012 + pitchN * 0.018 * uPitchConf + uHat * 0.02) / z;
    sz *= (1.0 + explode * 0.8);

    vec3 neon = hsl2rgb(fract(hue + rnd.y * 0.2 + uHat * 0.05), clamp(uSaturation + 0.1, 0.0, 1.0), 0.55);

    for (int t = 0; t < 6; t++) {
      if (t >= trailSteps) break;
      float ft = float(t) / float(max(trailSteps, 1));
      vec2 p = base - vel * ft * uTrailLength * 0.08;
      float d = length(uv - p);
      float trailFade = 1.0 - ft;
      float glow = smoothstep(sz * (1.0 + ft * 1.5), 0.0, d) * trailFade;
      // Core + halo
      float core = smoothstep(sz * 0.35, 0.0, d);
      col += neon * (glow * 0.55 + core * 1.2) * uBloom * (0.7 + uHat * 0.5);
    }
  }

  // Soft vignette
  col *= smoothstep(1.35, 0.25, length(uv));

  // Chromatic fringe on 808
  float ca = uChromatic * (1.0 + uOnset808 * 4.0);
  col.r *= 1.0 + ca * 8.0;
  col.b *= 1.0 - ca * 4.0;

  if (uHasVideo > 0.5 && uVideoOpacity > 0.001) {
    vec3 vid = texture2D(uVideoTex, gl_FragCoord.xy / res).rgb;
    float cover = smoothstep(0.02, 0.4, max(col.r, max(col.g, col.b)));
    col = mix(vid * uVideoOpacity, col, clamp(0.4 + cover * 0.6, 0.0, 1.0));
  }

  col = col / (1.0 + col * 0.55);
  col = pow(clamp(col, 0.0, 1.0), vec3(0.9));
  gl_FragColor = vec4(col, 1.0);
}
