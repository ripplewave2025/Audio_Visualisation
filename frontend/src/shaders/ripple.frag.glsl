// Sonic multi-source ripples
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
  uv /= max(uFxScale, 0.3);
  float t = uTime * (1.2 + uBass808);
  float wave = 0.0;
  // Multi emitters
  vec2 c0 = vec2(0.0);
  vec2 c1 = 0.4 * vec2(sin(t * 0.3), cos(t * 0.25));
  vec2 c2 = 0.35 * vec2(cos(t * 0.2 + 1.0), sin(t * 0.22));
  float dens = mix(8.0, 18.0, uFxDetail);
  wave += sin(length(uv - c0) * dens - t * 4.0 - uBeatPhase * 6.28);
  wave += 0.7 * sin(length(uv - c1) * dens * 1.1 - t * 3.5) * (0.5 + uHat);
  wave += 0.5 * sin(length(uv - c2) * dens * 0.9 - t * 5.0) * (0.5 + uOnset808);
  wave *= 0.35 * uFxIntensity;
  float m = abs(wave);
  float hue = fract(uHueBase + wave * 0.1 + uBass808 * 0.05);
  vec3 col = hsl2rgb(hue, uSaturation, 0.45 + m * 0.2) * m * uBloom * 1.8;
  col += hsl2rgb(fract(hue + 0.4), 0.9, 0.6) * pow(m, 3.0) * 2.0 * (1.0 + uOnset808);
  col *= max(uSidechain, 0.4);
  col = col / (1.0 + col);
  gl_FragColor = vec4(col, 1.0);
}
