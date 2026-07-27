// Concentric bass shockwave rings
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
  float r = length(uv) / max(uFxScale, 0.2);
  float t = uTime * (1.0 + uBass808);
  float dens = mix(4.0, 12.0, uFxDetail);
  float wave = sin(r * dens - t * 3.0 - uBeatPhase * 6.28) * 0.5 + 0.5;
  float ring = pow(wave, mix(4.0, 12.0, 1.0 - uOnset808 * 0.5));
  ring *= exp(-r * 1.2) * uFxIntensity * (0.5 + uBass808 + uOnset808);
  ring += uHat * exp(-abs(r - fract(t * 2.0)) * 20.0) * 0.5;
  float hue = fract(uHueBase + r * 0.15 + uOnset808 * 0.1);
  vec3 col = hsl2rgb(hue, uSaturation, 0.55) * ring * uBloom * 2.0;
  col += hsl2rgb(fract(hue + 0.4), 0.9, 0.6) * pow(ring, 2.0);
  // Center core
  col += hsl2rgb(hue, 1.0, 0.7) * exp(-r * 8.0) * uBass808 * uBloom;
  col *= max(uSidechain, 0.35);
  col = col / (1.0 + col);
  gl_FragColor = vec4(col, 1.0);
}
