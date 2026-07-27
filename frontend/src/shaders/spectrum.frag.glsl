// Classic neon spectrum bars — audio reactive, high FPS
precision mediump float;
varying vec2 vUv;
uniform float uTime, uBass808, uOnset808, uHat, uBeatPhase, uSidechain;
uniform float uHueBase, uSaturation, uBloom, uPitchHz, uPitchConf;
uniform float uFxIntensity, uFxScale, uFxDetail, uQuality;
uniform vec2 uResolution;

vec3 hsl2rgb(float h, float s, float l) {
  float c = (1.0 - abs(2.0*l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h*6.0, 2.0) - 1.0));
  vec3 rgb = h < 1./6. ? vec3(c,x,0) : h < 2./6. ? vec3(x,c,0) : h < 3./6. ? vec3(0,c,x)
           : h < 4./6. ? vec3(0,x,c) : h < 5./6. ? vec3(x,0,c) : vec3(c,0,x);
  return rgb + (l - 0.5*c);
}

float barH(float i, float n) {
  // Pseudo-spectrum from band meters + position
  float t = i / n;
  float b = mix(uBass808, uHat, t);
  float mid = sin(i * 1.7 + uTime * 2.0 + uBeatPhase * 6.28) * 0.15 + 0.35;
  float h = b * (0.55 + mid) * uFxIntensity;
  h *= 0.7 + uOnset808 * 0.6;
  h *= max(uSidechain, 0.4);
  return clamp(h * uFxScale, 0.0, 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  vec2 p = gl_FragCoord.xy / uResolution;
  float n = mix(16.0, 40.0, uFxDetail * uQuality);
  float x = p.x;
  float i = floor(x * n);
  float f = fract(x * n);
  float h = barH(i, n);
  float bar = smoothstep(0.0, 0.02, h - (1.0 - p.y));
  bar *= smoothstep(0.0, 0.08, f) * smoothstep(1.0, 0.92, f);

  float hue = fract(uHueBase + i / n * 0.25 + uPitchConf * 0.1);
  vec3 neon = hsl2rgb(hue, uSaturation, 0.55);
  vec3 col = vec3(0.02, 0.01, 0.04);
  col += neon * bar * uBloom * (1.0 + uOnset808);
  // Reflection
  col += neon * bar * 0.25 * smoothstep(0.55, 0.0, abs(p.y - 0.5)) * (1.0 - p.y);
  // Floor glow
  col += neon * exp(-abs(p.y - (1.0 - h)) * 20.0) * bar * 0.4;
  col = col / (1.0 + col * 0.5);
  gl_FragColor = vec4(col, 1.0);
}
