// Hyperspace star warp streaks
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
  float speed = (1.2 + uBass808 * 3.0 + uOnset808 * 2.0) * uFxIntensity;
  float t = uTime * speed;
  vec3 col = vec3(0.01, 0.01, 0.03);
  int stars = int(mix(24.0, 48.0, uFxDetail * uQuality));
  for (int i = 0; i < 48; i++) {
    if (i >= stars) break;
    float id = float(i);
    float a = hash(id * 3.1) * 6.28318;
    float z0 = hash(id * 7.7);
    float z = fract(z0 + t * 0.15);
    float r = (0.05 + hash(id) * 1.2) * uFxScale / (z + 0.05);
    vec2 p = vec2(cos(a), sin(a)) * r;
    // Streak along radial
    vec2 dir = normalize(p + 1e-4);
    float streak = uBass808 * 0.08 + 0.02;
    float d = length(uv - p);
    float along = abs(dot(uv - p, dir));
    float across = length((uv - p) - dir * dot(uv - p, dir));
    float star = smoothstep(0.02 / z, 0.0, across) * smoothstep(streak + 0.05, 0.0, along);
    star *= (1.0 - z);
    float hue = fract(uHueBase + hash(id + 2.0) * 0.3 + uHat * 0.1);
    col += hsl2rgb(hue, uSaturation, 0.65) * star * uBloom * (1.2 + uOnset808);
  }
  // Center tunnel glow
  col += hsl2rgb(uHueBase, uSaturation, 0.5) * exp(-length(uv) * 3.0) * 0.15 * (0.5 + uBass808);
  col *= max(uSidechain, 0.4);
  col = col / (1.0 + col);
  gl_FragColor = vec4(col, 1.0);
}
