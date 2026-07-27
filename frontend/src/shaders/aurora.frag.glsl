// Aurora / ribbon curtains
precision mediump float;
varying vec2 vUv;
uniform float uTime, uBass808, uOnset808, uHat, uBeatPhase, uSidechain;
uniform float uHueBase, uSaturation, uBloom;
uniform float uFxIntensity, uFxScale, uFxDetail, uQuality;
uniform vec2 uResolution;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.05; a *= 0.5; }
  return v;
}

vec3 hsl2rgb(float h, float s, float l) {
  float c = (1.0 - abs(2.0*l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h*6.0, 2.0) - 1.0));
  vec3 rgb = h < 1./6. ? vec3(c,x,0) : h < 2./6. ? vec3(x,c,0) : h < 3./6. ? vec3(0,c,x)
           : h < 4./6. ? vec3(0,x,c) : h < 5./6. ? vec3(x,0,c) : vec3(c,0,x);
  return rgb + (l - 0.5*c);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  uv.y += 0.15;
  float t = uTime * 0.25;
  float n = fbm(vec2(uv.x * mix(1.5, 4.0, uFxDetail) * uFxScale + t,
                     uv.y * 2.0 - t * 0.5 + uBass808));
  float curtain = sin(uv.x * 3.0 + n * 4.0 + uBeatPhase * 2.0) * 0.5 + 0.5;
  float band = smoothstep(0.9, 0.1, abs(uv.y - n * 0.6 + 0.1));
  float m = curtain * band * uFxIntensity * (0.6 + uBass808 * 0.8 + uHat * 0.4);
  m *= max(uSidechain, 0.4);
  float hue = fract(uHueBase + uv.x * 0.15 + n * 0.2 + uOnset808 * 0.1);
  vec3 col = hsl2rgb(hue, uSaturation, 0.5) * m * uBloom * 1.8;
  col += hsl2rgb(fract(hue + 0.35), uSaturation, 0.6) * pow(m, 2.0) * 1.2;
  // stars
  float s = step(0.997, hash(floor(uv * 80.0)));
  col += s * 0.4;
  col = col / (1.0 + col);
  gl_FragColor = vec4(col, 1.0);
}
