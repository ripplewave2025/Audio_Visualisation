// Dark Earth / Orbital — dark planet + neon atmosphere (fresnel), night lights, debris ring.
// 808 → atmosphere bloom; hats → surface flicker; optional BPM-locked orbit.

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

// Mode params
uniform float uAtmosphereBase;
uniform float uAtmosphereAudio;   // 808 drive amount
uniform float uNightLights;
uniform float uRingEnabled;       // 0/1
uniform float uRingOpacity;
uniform float uPlanetRough;
uniform float uBpmOrbitLock;      // 0/1
uniform float uOrbitSpeed;
uniform sampler2D uVideoTex;
uniform float uVideoOpacity;
uniform float uHasVideo;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1, 0));
  float c = hash21(i + vec2(0, 1));
  float d = hash21(i + vec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p *= 2.05;
    a *= 0.5;
  }
  return v;
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

// Sphere intersection
bool hitSphere(vec3 ro, vec3 rd, float r, out float t) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r * r;
  float h = b * b - c;
  if (h < 0.0) return false;
  h = sqrt(h);
  t = -b - h;
  if (t < 0.0) t = -b + h;
  return t > 0.0;
}

void main() {
  vec2 res = uResolution;
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;

  float shake = uShake * (uOnset808 * 0.6 + uBass808 * 0.25) * 0.5;
  uv += shake * vec2(sin(uTime * 40.0), cos(uTime * 37.0));

  // Orbit camera
  float orbit = uOrbitSpeed * uTime * 0.15;
  if (uBpmOrbitLock > 0.5) {
    // lock angular steps to beat phase
    orbit = uOrbitSpeed * (floor(uTime * max(uBpm, 60.0) / 60.0) * 0.35 + uBeatPhase * 0.5);
  }
  orbit += uCamOrbit * 0.4;

  float pull = cos(uBeatPhase * 6.2831853) * 0.5 + 0.5;
  float zoom = sin(uBeatPhase * 6.2831853) * 0.5 + 0.5;
  float camDist = 3.2 + uBpmPull * pull * 0.4 - uBpmZoom * zoom * 0.25;
  camDist /= max(uSidechain, 0.35);

  vec3 ro = vec3(sin(orbit) * camDist, 0.35 + 0.1 * sin(uTime * 0.1), cos(orbit) * camDist);
  vec3 ta = vec3(0.0, 0.0, 0.0);
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);
  float fov = uFov * 0.9;
  vec3 rd = normalize(uv.x * uu * fov + uv.y * vv * fov + 1.6 * ww);

  // Space
  vec3 col = vec3(0.01, 0.012, 0.03);
  float stars = step(0.9965, hash21(floor(rd.xy * 200.0 + rd.z * 50.0)));
  col += stars * 0.5;

  float planetR = 1.0;
  float tHit;
  bool hit = hitSphere(ro, rd, planetR, tHit);

  float pitchN = uPitchHz > 1.0 ? clamp((uPitchHz - 400.0) / 1600.0, 0.0, 1.0) : 0.0;
  float hue = fract(uHueBase + uHueFromPitch * pitchN * 0.5);
  vec3 neon = hsl2rgb(hue, clamp(uSaturation, 0.0, 1.0), 0.55);
  vec3 neon2 = hsl2rgb(fract(hue + 0.45), uSaturation, 0.5);

  // Debris ring (cheap disk with noise gaps)
  if (uRingEnabled > 0.5) {
    // intersect y≈0 plane ring
    if (abs(rd.y) > 1e-4) {
      float tr = -ro.y / rd.y;
      if (tr > 0.0) {
        vec3 rp = ro + rd * tr;
        float rr = length(rp.xz);
        if (rr > 1.35 && rr < 2.15) {
          float dens = smoothstep(1.35, 1.5, rr) * smoothstep(2.15, 1.95, rr);
          dens *= 0.55 + 0.45 * fbm(rp.xz * 3.0 + uTime * 0.05);
          dens *= uRingOpacity * (0.7 + uHat * 0.5 + uBass808 * 0.3);
          col = mix(col, neon2 * (0.4 + uBloom * 0.3), dens * 0.85);
        }
      }
    }
  }

  if (hit) {
    vec3 p = ro + rd * tHit;
    vec3 n = normalize(p);

    // Surface coords
    float lat = asin(clamp(n.y, -1.0, 1.0));
    float lon = atan(n.z, n.x);
    vec2 sp = vec2(lon, lat) * vec2(1.8, 2.2);

    // Dark terrain
    float land = fbm(sp * (2.0 + uPlanetRough * 2.0));
    float ocean = smoothstep(0.42, 0.55, land);
    vec3 surface = mix(vec3(0.02, 0.03, 0.06), vec3(0.05, 0.06, 0.08), ocean);
    surface *= 0.35 + 0.65 * land;

    // Night lights flicker with hats
    float cityMask = smoothstep(0.55, 0.75, land) * (1.0 - ocean);
    float cities = cityMask * step(0.72, fbm(sp * 12.0 + vec2(uTime * 0.02, 0.0)));
    float flicker = 0.7 + 0.3 * sin(uTime * 18.0 + hash21(floor(sp * 40.0)) * 40.0 + uHat * 20.0);
    cities *= uNightLights * flicker * (0.5 + uHat * 1.2);
    surface += neon * cities * 1.4 * uBloom;

    // Lighting
    vec3 lightDir = normalize(vec3(0.6, 0.4, 0.5));
    float ndl = max(dot(n, lightDir), 0.0);
    float wrap = ndl * 0.55 + 0.15;
    surface *= wrap;

    // Fresnel atmosphere
    vec3 view = normalize(ro - p);
    float fres = pow(1.0 - max(dot(n, view), 0.0), 3.0);
    float atmo = uAtmosphereBase + uAtmosphereAudio * (uBass808 * 0.9 + uOnset808 * 1.1);
    atmo *= (0.85 + 0.15 * uSidechain);
    vec3 atmoCol = mix(neon, neon2, 0.35 + uBass808 * 0.3) * fres * atmo * uBloom;
    // limb glow rim
    atmoCol += neon * fres * fres * atmo * 0.8;

    col = surface + atmoCol;

    // Soft atmosphere shell (second sphere)
    float tOut;
    if (hitSphere(ro, rd, planetR * 1.08, tOut)) {
      float depth = max(tOut - tHit, 0.0);
      float shell = exp(-depth * 2.5) * fres * atmo * 0.35;
      col += neon * shell * uBloom;
    }
  } else {
    // Looking past planet: thin atmospheric halo if ray grazes
    float b = dot(ro, rd);
    float c = dot(ro, ro) - (planetR * 1.12) * (planetR * 1.12);
    float h = b * b - c;
    if (h > 0.0) {
      float fresLike = exp(-abs(sqrt(max(h, 0.0))) * 2.0);
      float atmo = uAtmosphereBase + uAtmosphereAudio * uBass808;
      col += neon * fresLike * atmo * 0.25 * uBloom;
    }
  }

  // Chromatic on bass
  float ca = uChromatic * (1.0 + uOnset808 * 2.5);
  col.r *= 1.0 + ca * 6.0;
  col.b *= 1.0 - ca * 3.0;

  if (uHasVideo > 0.5 && uVideoOpacity > 0.001) {
    vec3 vid = texture2D(uVideoTex, gl_FragCoord.xy / res).rgb;
    float cover = smoothstep(0.02, 0.35, max(col.r, max(col.g, col.b)));
    col = mix(vid * uVideoOpacity, col, clamp(0.45 + cover * 0.55, 0.0, 1.0));
  }

  col = col / (1.0 + col * 0.5);
  col = pow(clamp(col, 0.0, 1.0), vec3(0.92));
  gl_FragColor = vec4(col, 1.0);
}
