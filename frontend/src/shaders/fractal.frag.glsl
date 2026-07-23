// =============================================================================
// Phonk Hyper-Fluid Fractal — Fragment Shader
// =============================================================================
// Audio-reactive 4D-ish Mandelbulb SDF raymarcher inside a curl-noise mist void.
//
// Uniform maps (DSP engine → ParameterBus → here):
//   uBass808 / uOnset808  → domain fold + space bend + shake + chromatic aberration
//   uPitchHz / uPitchConf → HSL hue + emission / bloom drive
//   uHat                  → mist velocity / density bursts
//   uBeatPhase / uBpm     → kinematic camera groove
//   uSidechain            → scale ducking (kick compressor visual)
//
// Fold formulas (uFoldMode): 0=sin 1=square 2=tri 3=abs
// =============================================================================

precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uResolution;
uniform float uBass808;
uniform float uOnset808;
uniform float uPitchHz;
uniform float uPitchConf;
uniform float uHat;
uniform float uBeatPhase;   // [0,1) within beat
uniform float uBpm;
uniform float uSidechain;   // gain ~[1-depth, 1]
uniform float uFov;
uniform float uWarp;
uniform float uFoldStrength;
uniform float uFoldMode;    // 0..3
uniform float uMandelPower;
uniform float uMandelIter;
uniform float uHueBase;
uniform float uHueFromPitch;
uniform float uSaturation;
uniform float uBloom;
uniform float uChromatic;
uniform float uShake;
uniform float uCamOrbit;
uniform float uBpmPull;
uniform float uBpmZoom;
uniform float uFluidForce;
uniform float uMistDensity;
uniform float uFractalScale;
uniform sampler2D uVideoTex;
uniform float uVideoOpacity;
uniform float uHasVideo;    // 0 or 1

// ── helpers ──────────────────────────────────────────────────────────────────

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// Classic 3D value noise
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash(i + vec3(0,0,0));
  float n100 = hash(i + vec3(1,0,0));
  float n010 = hash(i + vec3(0,1,0));
  float n110 = hash(i + vec3(1,1,0));
  float n001 = hash(i + vec3(0,0,1));
  float n101 = hash(i + vec3(1,0,1));
  float n011 = hash(i + vec3(0,1,1));
  float n111 = hash(i + vec3(1,1,1));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

// Curl-ish pseudo fluid field: ∇× noise as a cheap stand-in for NS velocity.
// Full Navier-Stokes is multipass; this gives hat-driven swirling mist.
vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  float n1 = vnoise(p + vec3(0.0, e, 0.0));
  float n2 = vnoise(p - vec3(0.0, e, 0.0));
  float n3 = vnoise(p + vec3(e, 0.0, 0.0));
  float n4 = vnoise(p - vec3(e, 0.0, 0.0));
  float n5 = vnoise(p + vec3(0.0, 0.0, e));
  float n6 = vnoise(p - vec3(0.0, 0.0, e));
  return normalize(vec3(n1 - n2, n5 - n6, n4 - n3) + 1e-5);
}

// Fold modifiers applied to domain coords before DE.
// square: sgn(sin) style hard fold — aggressive Phonk look
// tri:    triangle wave fold
// abs:    classic kaleidoscopic fold
float foldWave(float x, float mode) {
  if (mode < 0.5) {
    return sin(x);
  } else if (mode < 1.5) {
    return sign(sin(x)); // square
  } else if (mode < 2.5) {
    // triangle in [-1,1]
    float p = fract(x / 6.2831853 + 0.25);
    return 1.0 - 4.0 * abs(p - 0.5);
  } else {
    return abs(fract(x * 0.1591549) * 2.0 - 1.0) * 2.0 - 1.0;
  }
}

vec3 domainFold(vec3 p, float strength, float mode, float bass) {
  // Trigonometric modifier on the raymarching domain estimator input.
  // When 808 hits, strength*bass spikes → violent geometric fold.
  float amp = strength * (0.15 + bass * 1.4);
  float t = uTime * 0.7;
  p.xy += amp * 0.25 * vec2(
    foldWave(p.z * 2.0 + t, mode),
    foldWave(p.x * 2.0 - t * 1.3, mode)
  );
  p.xz += amp * 0.2 * vec2(
    foldWave(p.y * 3.0 + uOnset808 * 6.0, mode),
    foldWave(p.z * 2.5 - bass * 4.0, mode)
  );
  // Non-Euclidean warp: radial twist proportional to uWarp
  float r = length(p.xy) + 1e-4;
  float ang = uWarp * 0.8 * sin(r * 2.0 - uTime + bass * 3.0);
  float ca = cos(ang), sa = sin(ang);
  p.xy = mat2(ca, -sa, sa, ca) * p.xy;
  return p;
}

// ── Mandelbulb distance estimator ────────────────────────────────────────────
// Power-n spherical mandelbulb (White / Nylander style).
// z → z^n + c in 3D spherical coords; DE ≈ 0.5 |z| log|z| / |dz|

float mandelbulbDE(vec3 pos, float power, int iters, out float trap) {
  vec3 z = pos;
  float dr = 1.0;
  float r = 0.0;
  trap = 1e10;

  for (int i = 0; i < 16; i++) {
    if (i >= iters) break;
    r = length(z);
    if (r > 2.0) break;

    // Orbit trap for coloring (min radius along orbit)
    trap = min(trap, r);

    // Convert to polar
    float theta = acos(clamp(z.z / r, -1.0, 1.0));
    float phi = atan(z.y, z.x);
    dr = pow(r, power - 1.0) * power * dr + 1.0;

    // Scale & rotate
    float zr = pow(r, power);
    theta *= power;
    phi *= power;

    z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
    z += pos;
  }

  // Distance estimate
  return 0.5 * log(r) * r / max(dr, 1e-6);
}

float mapScene(vec3 p, out float trap) {
  // Sidechain ducking: shrink fractal when kick hits (gain < 1)
  float sc = max(uSidechain, 0.15);
  float scale = uFractalScale * sc;
  vec3 q = p / scale;

  // 808-driven domain fold / space bend
  q = domainFold(q, uFoldStrength, uFoldMode, max(uBass808, uOnset808));

  int iters = int(clamp(uMandelIter, 4.0, 16.0));
  float d = mandelbulbDE(q, uMandelPower, iters, trap);
  return d * scale;
}

vec3 calcNormal(vec3 p) {
  const float e = 0.0015;
  float t;
  float d = mapScene(p, t);
  return normalize(vec3(
    mapScene(p + vec3(e, 0, 0), t) - d,
    mapScene(p + vec3(0, e, 0), t) - d,
    mapScene(p + vec3(0, 0, e), t) - d
  ));
}

// HSL → RGB (pitch drives hue)
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
  float m = l - 0.5 * c;
  return rgb + m;
}

// Mist density along ray — hat forces push curl field
float mistSample(vec3 p) {
  vec3 flow = curlNoise(p * 0.55 + vec3(0.0, uTime * 0.15, uTime * 0.08));
  // Hi-hat transient = explosive outward velocity (radial + curl)
  flow += uHat * uFluidForce * normalize(p + 1e-3) * 1.5;
  vec3 q = p + flow * (0.4 + uHat * uFluidForce);
  float n = vnoise(q * 1.3 + uTime * 0.25);
  n += 0.5 * vnoise(q * 2.7 - uTime * 0.4);
  return uMistDensity * n * (0.35 + uHat * 1.8 + uBass808 * 0.4);
}

vec3 renderRay(vec2 uv) {
  // Screen shake from 808
  float shake = uShake * (uOnset808 * 1.2 + uBass808 * 0.5);
  vec2 sh = shake * vec2(
    sin(uTime * 55.0 + uOnset808 * 20.0),
    cos(uTime * 47.0 - uBass808 * 15.0)
  );
  uv += sh;

  // BPM kinematic camera:
  //   beatPhase 0 on the 1 → pull back (uBpmPull)
  //   off-beat (phase ~0.5) → zoom in (uBpmZoom)
  float phase = uBeatPhase;
  float pull = cos(phase * 6.2831853) * 0.5 + 0.5; // 1 on beat
  float zoom = sin(phase * 6.2831853) * 0.5 + 0.5; // 1 off-beat mid
  float camZ = 2.6 + uBpmPull * pull * 0.55 - uBpmZoom * zoom * 0.45;
  camZ += uCamOrbit * 0.15 * sin(uTime * 0.2);

  // Orbit slightly with time / bass
  float ang = uTime * 0.12 + uBass808 * 0.4;
  vec3 ro = vec3(sin(ang) * uCamOrbit * 0.35, 0.15 * sin(uTime * 0.17), camZ);
  vec3 ta = vec3(0.0, 0.0, 0.0);
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);

  float fov = uFov * (1.0 - uBpmZoom * zoom * 0.12);
  vec3 rd = normalize(uv.x * uu * fov + uv.y * vv * fov + 1.5 * ww);

  // Raymarch
  float t = 0.0;
  float trap = 1.0;
  float hit = 0.0;
  vec3 p = ro;
  for (int i = 0; i < 96; i++) {
    p = ro + rd * t;
    float d = mapScene(p, trap);
    if (d < 0.0015 * t || t > 12.0) {
      hit = d < 0.02 ? 1.0 : 0.0;
      break;
    }
    t += clamp(d, 0.002, 0.25);
  }

  // Pitch → hue (map 400–2000 Hz into cyclic hue offset)
  float pitchN = 0.0;
  if (uPitchHz > 1.0) {
    pitchN = clamp((uPitchHz - 400.0) / 1600.0, 0.0, 1.0);
  }
  float hue = fract(uHueBase + uHueFromPitch * pitchN * uPitchConf + uBass808 * 0.05);
  float sat = clamp(uSaturation + uHat * 0.1, 0.0, 1.0);

  vec3 col = vec3(0.01, 0.005, 0.02); // void

  // Volumetric mist integration (cheap step march)
  float mt = 0.0;
  float mistAcc = 0.0;
  vec3 mistCol = vec3(0.0);
  for (int i = 0; i < 24; i++) {
    vec3 mp = ro + rd * mt;
    float dens = mistSample(mp);
    float a = dens * 0.08;
    vec3 mc = hsl2rgb(fract(hue + 0.15 + dens * 0.2), sat, 0.45 + uHat * 0.2);
    mistCol += (1.0 - mistAcc) * a * mc * (0.6 + uBloom * 0.5);
    mistAcc += (1.0 - mistAcc) * a;
    mt += 0.22 + uHat * 0.05;
    if (mistAcc > 0.95 || mt > min(t, 10.0)) break;
  }

  if (hit > 0.5 && t < 12.0) {
    vec3 n = calcNormal(p);
    vec3 light = normalize(vec3(0.4, 0.7, 0.5));
    float diff = max(dot(n, light), 0.0);
    float fre = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

    // Orbit trap coloring + pitch luminescence
    float trapCol = clamp(1.0 - trap, 0.0, 1.0);
    float lum = 0.25 + diff * 0.55 + fre * 0.45;
    lum *= 0.7 + uBloom * (0.5 + uPitchConf * pitchN);
    lum *= 0.85 + uOnset808 * 0.5;

    vec3 albedo = hsl2rgb(hue + trapCol * 0.08, sat, 0.35 + trapCol * 0.25);
    vec3 emission = hsl2rgb(fract(hue + 0.5), sat * 0.9, 0.55) * uBloom * (0.15 + uPitchConf * 0.5);

    col = albedo * lum + emission;
    // AO-ish from trap
    col *= 0.55 + 0.45 * trapCol;
  }

  // Composite mist
  col = mix(col, mistCol, clamp(mistAcc * 1.1, 0.0, 0.85));

  // Soft vignette
  float vig = smoothstep(1.4, 0.2, length(uv));
  col *= vig;

  return col;
}

void main() {
  // Aspect-correct uv centered at 0
  vec2 res = uResolution;
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;

  // Chromatic aberration: offset R/B by 808-scaled amount
  float ca = uChromatic * (1.0 + uOnset808 * 3.5 + uBass808 * 1.5);
  vec2 dir = normalize(uv + 1e-5);

  vec3 col;
  col.r = renderRay(uv + dir * ca).r;
  col.g = renderRay(uv).g;
  col.b = renderRay(uv - dir * ca).b;

  // Optional video underlay (sampled in screen uv)
  if (uHasVideo > 0.5 && uVideoOpacity > 0.001) {
    vec2 suv = gl_FragCoord.xy / res;
    // Cover-fit-ish
    vec3 vid = texture2D(uVideoTex, suv).rgb;
    // Fractal sits on top: use luminance of fractal as soft mask
    float cover = smoothstep(0.02, 0.35, max(col.r, max(col.g, col.b)));
    col = mix(vid * uVideoOpacity + col * (1.0 - uVideoOpacity * 0.5), col, cover);
    col = mix(vid, col, clamp(0.35 + cover * 0.65, 0.0, 1.0));
  }

  // Tonemap + gamma
  col = col / (1.0 + col * 0.65);
  col = pow(clamp(col, 0.0, 1.0), vec3(0.92));

  gl_FragColor = vec4(col, 1.0);
}
