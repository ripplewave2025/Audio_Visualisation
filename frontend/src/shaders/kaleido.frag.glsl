// Kaleidoscope mandala — domain fold + noise, pitch shifts hue
precision mediump float;
varying vec2 vUv;
uniform float uTime, uBass808, uOnset808, uHat, uBeatPhase, uSidechain;
uniform float uHueBase, uSaturation, uBloom, uPitchHz, uPitchConf;
uniform float uFxIntensity, uFxScale, uFxDetail, uFxSymmetry, uQuality;
uniform vec2 uResolution;

vec3 hsl2rgb(float h, float s, float l) {
  float c = (1.0 - abs(2.0*l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h*6.0, 2.0) - 1.0));
  vec3 rgb = h < 1./6. ? vec3(c,x,0) : h < 2./6. ? vec3(x,c,0) : h < 3./6. ? vec3(0,c,x)
           : h < 4./6. ? vec3(0,x,c) : h < 5./6. ? vec3(x,0,c) : vec3(c,0,x);
  return rgb + (l - 0.5*c);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float segs = mix(4.0, 12.0, uFxSymmetry);
  float a = atan(uv.y, uv.x);
  float r = length(uv) / max(uFxScale, 0.2);
  float seg = 6.2831853 / segs;
  a = mod(a, seg);
  a = abs(a - seg * 0.5);
  vec2 p = vec2(cos(a), sin(a)) * r;
  p += 0.15 * uBass808 * vec2(sin(uTime), cos(uTime * 1.3));
  float n = noise(p * mix(3.0, 8.0, uFxDetail) + uTime * 0.4);
  n += 0.5 * noise(p * 6.0 - uTime * 0.6 + uHat);
  float rings = sin(r * 14.0 - uTime * 2.0 - uBeatPhase * 6.28) * 0.5 + 0.5;
  float m = n * rings * uFxIntensity * (0.7 + uOnset808);
  m *= max(uSidechain, 0.35);
  float pitchN = uPitchHz > 1.0 ? clamp((uPitchHz-400.0)/1600.0, 0.0, 1.0) : 0.0;
  float hue = fract(uHueBase + pitchN * 0.35 + r * 0.2 + n * 0.15);
  vec3 col = hsl2rgb(hue, uSaturation, 0.35 + m * 0.4) * m * uBloom * 2.0;
  col += hsl2rgb(fract(hue + 0.4), uSaturation, 0.55) * pow(m, 3.0) * 2.0;
  col *= smoothstep(1.3, 0.2, r);
  col = col / (1.0 + col);
  gl_FragColor = vec4(col, 1.0);
}
