// Demoscene-style plasma field
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
  uv *= uFxScale;
  float t = uTime * (0.6 + uBass808 * 0.8);
  float d = mix(2.0, 6.0, uFxDetail);
  float v = sin(uv.x * d + t);
  v += sin(uv.y * d * 1.2 - t * 1.1);
  v += sin((uv.x + uv.y) * d * 0.7 + t * 0.8 + uBeatPhase * 3.14);
  v += sin(length(uv) * d * 2.0 - t * 1.5) * (1.0 + uHat);
  v *= 0.25 * uFxIntensity * (0.8 + uOnset808 * 0.5);
  v *= max(uSidechain, 0.4);
  float hue = fract(uHueBase + v * 0.35 + uBass808 * 0.1);
  vec3 col = hsl2rgb(hue, uSaturation, 0.45 + v * 0.25) * (0.6 + abs(v)) * uBloom;
  col += hsl2rgb(fract(hue + 0.5), 0.9, 0.6) * pow(abs(v), 3.0) * 1.5;
  col = col / (1.0 + col * 0.6);
  gl_FragColor = vec4(col, 1.0);
}
