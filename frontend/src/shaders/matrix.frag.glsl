// Digital rain cascade
precision mediump float;
varying vec2 vUv;
uniform float uTime, uBass808, uOnset808, uHat, uBeatPhase, uSidechain;
uniform float uHueBase, uSaturation, uBloom;
uniform float uFxIntensity, uFxScale, uFxDetail, uQuality;
uniform vec2 uResolution;

float hash(float n) { return fract(sin(n) * 43758.5453); }

vec3 hsl2rgb(float h, float s, float l) {
  float c = (1.0 - abs(2.0*l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h*6.0, 2.0) - 1.0));
  vec3 rgb = h < 1./6. ? vec3(c,x,0) : h < 2./6. ? vec3(x,c,0) : h < 3./6. ? vec3(0,c,x)
           : h < 4./6. ? vec3(0,x,c) : h < 5./6. ? vec3(x,0,c) : vec3(c,0,x);
  return rgb + (l - 0.5*c);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float cols = mix(20.0, 48.0, uFxDetail) * uFxScale;
  float colId = floor(uv.x * cols);
  float x = fract(uv.x * cols);
  float speed = 0.4 + hash(colId) * 1.2;
  speed *= 1.0 + uBass808 * 1.5;
  float y = fract(uv.y + uTime * speed + hash(colId * 3.1));
  // Glyph blocks
  float gy = floor(y * mix(12.0, 24.0, uFxDetail));
  float glyph = step(0.55, hash(colId * 17.0 + gy + floor(uTime * 8.0)));
  float head = smoothstep(0.15, 0.0, y) * (1.0 + uOnset808 * 2.0);
  float trail = (1.0 - y) * glyph * uFxIntensity;
  float hue = fract(uHueBase + hash(colId) * 0.15 + uHat * 0.1);
  // default matrix green-ish with phonk magenta option via hue
  vec3 neon = hsl2rgb(hue, uSaturation, 0.55);
  vec3 col = neon * trail * 0.7 * uBloom;
  col += vec3(1.0) * head * glyph * 1.2;
  col *= smoothstep(0.0, 0.15, x) * smoothstep(1.0, 0.85, x);
  col *= max(uSidechain, 0.35);
  col = col / (1.0 + col);
  gl_FragColor = vec4(col, 1.0);
}
