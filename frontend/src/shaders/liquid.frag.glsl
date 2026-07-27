// Liquid metal / mercury metaball-ish field
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
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  uv /= max(uFxScale, 0.3);
  float t = uTime * 0.7;
  float field = 0.0;
  int n = int(mix(4.0, 8.0, uFxDetail * uQuality));
  for (int i = 0; i < 8; i++) {
    if (i >= n) break;
    float id = float(i);
    vec2 c = 0.55 * vec2(sin(t * (0.6 + id * 0.15) + id), cos(t * (0.5 + id * 0.12) - id * 1.3));
    c *= 1.0 + uBass808 * 0.35;
    float r = 0.12 + 0.06 * sin(id + t) + uOnset808 * 0.08;
    field += r * r / (dot(uv - c, uv - c) + 0.001);
  }
  field *= uFxIntensity;
  float edge = smoothstep(0.9, 1.15, field) - smoothstep(1.15, 1.6, field);
  float body = smoothstep(0.85, 1.3, field);
  // Fake chrome
  vec2 nrm = normalize(uv + 0.001);
  float spec = pow(max(dot(nrm, normalize(vec2(0.4, 0.7))), 0.0), 8.0);
  float hue = fract(uHueBase + uHat * 0.1 + field * 0.05);
  vec3 metal = mix(vec3(0.15, 0.16, 0.2), hsl2rgb(hue, uSaturation * 0.6, 0.55), 0.5);
  vec3 col = metal * body * (0.5 + spec * 1.5) * uBloom;
  col += hsl2rgb(fract(hue + 0.5), 0.9, 0.6) * edge * 2.0 * (1.0 + uOnset808);
  col *= max(uSidechain, 0.4);
  col = col / (1.0 + col);
  gl_FragColor = vec4(col, 1.0);
}
