// Lissajous / vector oscilloscope
precision mediump float;
varying vec2 vUv;
uniform float uTime, uBass808, uOnset808, uHat, uBeatPhase, uSidechain, uBpm;
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
  float t = uTime * (1.0 + uBass808 * 0.5);
  float a = 2.0 + floor(uFxDetail * 3.0);
  float b = 3.0 + floor(uFxDetail * 2.0);
  float ph = uBeatPhase * 6.28318 + uHat * 0.5;
  // Sample curve density along parameter
  float dmin = 1e5;
  int steps = int(mix(32.0, 64.0, uQuality));
  for (int i = 0; i < 64; i++) {
    if (i >= steps) break;
    float s = float(i) / float(steps) * 6.28318 * 2.0 + t;
    vec2 q = uFxScale * 0.55 * vec2(
      sin(a * s + ph) * (0.8 + uBass808 * 0.4),
      sin(b * s) * (0.8 + uOnset808 * 0.3)
    );
    dmin = min(dmin, length(uv - q));
  }
  float line = smoothstep(0.025 * uFxIntensity, 0.0, dmin);
  float glow = exp(-dmin * 25.0) * 0.5;
  float hue = fract(uHueBase + uTime * 0.05);
  vec3 neon = hsl2rgb(hue, uSaturation, 0.55);
  vec3 col = neon * (line * 1.5 + glow) * uBloom * (1.0 + uOnset808);
  // Grid
  float g = abs(fract(uv.x * 4.0) - 0.5) * abs(fract(uv.y * 4.0) - 0.5);
  col += neon * smoothstep(0.02, 0.0, g) * 0.08;
  col *= max(uSidechain, 0.4);
  col = col / (1.0 + col);
  gl_FragColor = vec4(col, 1.0);
}
