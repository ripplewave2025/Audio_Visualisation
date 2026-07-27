// Infinite neon lattice / Tron grid
precision mediump float;
varying vec2 vUv;
uniform float uTime, uBass808, uOnset808, uHat, uBeatPhase, uSidechain;
uniform float uHueBase, uSaturation, uBloom;
uniform float uFxIntensity, uFxScale, uFxDetail, uQuality;
uniform vec2 uResolution;

vec3 hsl2rgb(float h, float s, float l) {
  float c = (1.0 - abs(2.0*l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h*6.0, 2.0) - 1.0));
  vec3 rgb = h < 1./6. ? vec3(c,x,0) : h < 2./6. ? vec3(x,c,0) : h < 3./6. ? vec3(0,c,x)
           : h < 4./6. ? vec3(0,x,c) : h < 5./6. ? vec3(x,0,c) : vec3(c,0,x);
  return rgb + (l - 0.5*c);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  // Perspective floor
  float y = uv.y + 0.35;
  if (y < 0.02) { gl_FragColor = vec4(0.01, 0.01, 0.03, 1.0); return; }
  vec2 p = vec2(uv.x / y, uTime * (0.8 + uBass808 * 1.5) + 1.0 / y);
  p *= uFxScale * mix(1.0, 2.5, uFxDetail);
  float gx = abs(fract(p.x) - 0.5);
  float gz = abs(fract(p.y) - 0.5);
  float grid = smoothstep(0.06, 0.0, gx) + smoothstep(0.06, 0.0, gz);
  grid *= uFxIntensity * (0.6 + uOnset808 * 0.8 + uHat * 0.3);
  float fog = exp(-y * 2.5);
  float hue = fract(uHueBase + p.y * 0.02 + uBeatPhase * 0.1);
  vec3 neon = hsl2rgb(hue, uSaturation, 0.55);
  vec3 col = neon * grid * fog * uBloom * 1.5;
  // Horizon glow
  col += neon * exp(-abs(y - 0.05) * 30.0) * 0.4 * (0.5 + uBass808);
  col *= max(uSidechain, 0.35);
  col = col / (1.0 + col);
  gl_FragColor = vec4(col, 1.0);
}
