// Geometry + light particles — light 3D math forms (torus knot / icosa vibe)
// Inspired by three-bas crystal/points demos: hard edges, neon rims, orbit sparks.

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
uniform float uCamOrbit;
uniform float uBpmPull;
uniform float uBpmZoom;

uniform float uGeoMorph;       // 0 torus-ish … 1 box crystal
uniform float uGeoWire;        // edge emphasis
uniform float uGeoLightCount;  // orbiting point lights / sparks
uniform float uGeoSpin;
uniform float uGeoGlow;

uniform sampler2D uVideoTex;
uniform float uVideoOpacity;
uniform float uHasVideo;

float hash11(float n) { return fract(sin(n * 127.1) * 43758.5453); }

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

// SDF ops
float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdOctahedron(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
}

// cheap torus knot path distance
float sdTorusknot(vec3 p, float ra, float rb) {
  // approximate via angular sweep samples
  float d = 1e5;
  for (int i = 0; i < 24; i++) {
    float a = float(i) / 24.0 * 6.2831853;
    float ca = cos(a), sa = sin(a);
    // (3,2) knot
    float r = ra + 0.35 * cos(3.0 * a);
    vec3 q = vec3(r * cos(2.0 * a), 0.35 * sin(3.0 * a), r * sin(2.0 * a));
    d = min(d, length(p - q) - rb);
  }
  return d;
}

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float mapScene(vec3 p, float morph) {
  float sc = max(uSidechain, 0.35);
  p /= sc;
  float spin = uTime * uGeoSpin * 0.4 + uBass808 * 0.5;
  p.xy = rot(spin) * p.xy;
  p.xz = rot(spin * 0.7 + uBeatPhase * 1.5) * p.xz;

  float d1 = sdTorusknot(p, 0.85, 0.14 + uBass808 * 0.05);
  float d2 = sdOctahedron(p * 1.1, 0.95);
  float d3 = sdBox(p, vec3(0.55 + uHat * 0.1));
  float d4 = sdTorus(p.xzy, vec2(0.75, 0.12));

  float d = mix(d1, d2, clamp(morph * 1.2, 0.0, 1.0));
  d = mix(d, min(d3, d4), clamp(morph - 0.35, 0.0, 1.0));
  // 808 pulse thickness
  d -= uOnset808 * 0.04;
  return d * sc;
}

vec3 calcNormal(vec3 p, float morph) {
  float e = 0.0015;
  float d = mapScene(p, morph);
  return normalize(vec3(
    mapScene(p + vec3(e, 0, 0), morph) - d,
    mapScene(p + vec3(0, e, 0), morph) - d,
    mapScene(p + vec3(0, 0, e), morph) - d
  ));
}

void main() {
  vec2 res = uResolution;
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;
  uv += uShake * uOnset808 * 0.2 * vec2(sin(uTime * 50.0), cos(uTime * 44.0));

  float pull = cos(uBeatPhase * 6.2831853) * 0.5 + 0.5;
  float zoom = sin(uBeatPhase * 6.2831853) * 0.5 + 0.5;
  float camZ = 2.8 + uBpmPull * pull * 0.35 - uBpmZoom * zoom * 0.25;
  float orbit = uTime * 0.12 * uGeoSpin + uCamOrbit * 0.5;
  vec3 ro = vec3(sin(orbit) * 0.4, 0.25, camZ);
  vec3 ta = vec3(0.0);
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(uv.x * uu * uFov + uv.y * vv * uFov + 1.55 * ww);

  float morph = clamp(uGeoMorph + uBass808 * 0.15, 0.0, 1.0);
  float t = 0.0;
  float hit = 0.0;
  vec3 p;
  for (int i = 0; i < 80; i++) {
    p = ro + rd * t;
    float d = mapScene(p, morph);
    if (d < 0.0015 * t || t > 10.0) {
      hit = d < 0.03 ? 1.0 : 0.0;
      break;
    }
    t += clamp(d, 0.002, 0.3);
  }

  float pitchN = uPitchHz > 1.0 ? clamp((uPitchHz - 400.0) / 1600.0, 0.0, 1.0) : 0.0;
  float hue = fract(uHueBase + uHueFromPitch * pitchN * uPitchConf);
  vec3 neon = hsl2rgb(hue, clamp(uSaturation, 0.0, 1.0), 0.55);
  vec3 neon2 = hsl2rgb(fract(hue + 0.4), uSaturation, 0.5);

  vec3 col = vec3(0.02, 0.015, 0.04);
  // subtle grid floor for geometry lab feel
  float floorY = (0.0 - ro.y) / rd.y;
  if (floorY > 0.0 && hit < 0.5) {
    vec3 fp = ro + rd * floorY;
    if (length(fp.xz) < 4.0) {
      float g = abs(fract(fp.x * 2.0) - 0.5) * abs(fract(fp.z * 2.0) - 0.5);
      col += neon2 * smoothstep(0.08, 0.0, g) * 0.15 * exp(-length(fp.xz) * 0.4);
    }
  }

  if (hit > 0.5) {
    vec3 n = calcNormal(p, morph);
    vec3 light1 = normalize(vec3(0.5, 0.8, 0.3));
    vec3 light2 = normalize(vec3(-0.6, 0.2, 0.5));
    float diff = max(dot(n, light1), 0.0) * 0.7 + max(dot(n, light2), 0.0) * 0.35;
    float fre = pow(1.0 - max(dot(n, -rd), 0.0), 2.5);
    // wire / edge
    float edge = pow(fre, mix(1.0, 0.35, uGeoWire)) * uGeoWire;
    col = neon * (0.15 + diff * 0.55) * (0.7 + uGeoGlow * 0.5);
    col += neon2 * fre * uGeoGlow * uBloom * (0.5 + uBass808);
    col += vec3(1.0) * edge * 0.8 * uBloom;
    col += neon * uOnset808 * 0.5;
  }

  // Orbiting light particles (spark constellation)
  int lights = int(clamp(uGeoLightCount, 4.0, 24.0));
  for (int i = 0; i < 24; i++) {
    if (i >= lights) break;
    float id = float(i);
    float a = uTime * (0.5 + hash11(id) * 0.8) + id * 0.9 + uBeatPhase * 2.0;
    float r = 1.1 + 0.35 * sin(id + uTime);
    vec3 lp = vec3(cos(a) * r, 0.4 * sin(a * 1.3 + id), sin(a) * r);
    // project light roughly to screen via camera basis
    vec3 rel = lp - ro;
    float z = dot(rel, ww);
    if (z > 0.2) {
      vec2 su = vec2(dot(rel, uu), dot(rel, vv)) / z * 1.55;
      float d = length(uv - su);
      float sz = 0.02 / z * (1.0 + uHat * 0.8 + uOnset808);
      float g = smoothstep(sz, 0.0, d);
      col += mix(neon, neon2, hash11(id + 2.0)) * g * 1.4 * uBloom * uGeoGlow;
    }
  }

  float ca = uChromatic * (1.0 + uOnset808 * 2.5);
  col.r *= 1.0 + ca * 5.0;
  col.b *= 1.0 - ca * 2.5;

  if (uHasVideo > 0.5 && uVideoOpacity > 0.001) {
    vec3 vid = texture2D(uVideoTex, gl_FragCoord.xy / res).rgb;
    float cover = smoothstep(0.02, 0.35, max(col.r, max(col.g, col.b)));
    col = mix(vid * uVideoOpacity, col, clamp(0.45 + cover * 0.55, 0.0, 1.0));
  }

  col = col / (1.0 + col * 0.5);
  col = pow(clamp(col, 0.0, 1.0), vec3(0.92));
  gl_FragColor = vec4(col, 1.0);
}
