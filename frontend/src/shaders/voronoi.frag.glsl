// Voronoi / Worley cells — living geometry
precision mediump float;
varying vec2 vUv;
uniform float uTime, uBass808, uOnset808, uHat, uBeatPhase, uSidechain;
uniform float uHueBase, uSaturation, uBloom;
uniform float uFxIntensity, uFxScale, uFxDetail, uQuality;
uniform vec2 uResolution;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
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
  float scale = mix(3.0, 8.0, uFxDetail) * uFxScale;
  vec2 p = uv * scale;
  p += uTime * 0.15 * (1.0 + uBass808);
  vec2 i = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = hash2(i + g);
    o = 0.5 + 0.5 * sin(uTime * (1.0 + uHat) + 6.2831 * o);
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; }
    else if (d < d2) d2 = d;
  }
  float edge = sqrt(d2) - sqrt(d1);
  float cell = smoothstep(0.0, 0.15, edge);
  float pulse = 1.0 - smoothstep(0.0, 0.4, sqrt(d1));
  pulse *= uFxIntensity * (0.5 + uOnset808 + uBass808 * 0.5);
  float hue = fract(uHueBase + hash2(i).x * 0.3 + uBeatPhase * 0.1);
  vec3 col = hsl2rgb(hue, uSaturation, 0.45) * pulse * uBloom;
  col += hsl2rgb(fract(hue + 0.45), 0.9, 0.6) * (1.0 - cell) * 1.2 * uFxIntensity;
  col *= max(uSidechain, 0.4);
  col = col / (1.0 + col);
  gl_FragColor = vec4(col, 1.0);
}
