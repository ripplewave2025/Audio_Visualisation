// Cyber Tunnel — infinite perspective neon tunnel.
// Speed/distortion from energy + BPM; grid or solid walls.

precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uResolution;
uniform float uBass808;
uniform float uOnset808;
uniform float uPitchHz;
uniform float uPitchConf;
uniform float uHat;
uniform float uBeatPhase;
uniform float uBpm;
uniform float uSidechain;
uniform float uHueBase;
uniform float uHueFromPitch;
uniform float uSaturation;
uniform float uBloom;
uniform float uChromatic;
uniform float uShake;
uniform float uFov;
uniform float uBpmPull;
uniform float uBpmZoom;

// Mode params
uniform float uTunnelSpeed;
uniform float uTunnelDistort;
uniform float uGridDensity;
uniform float uWallStyle;     // 0 grid, 1 solid
uniform float uTunnelRadius;
uniform float uNeonIntensity;
uniform sampler2D uVideoTex;
uniform float uVideoOpacity;
uniform float uHasVideo;

vec3 hsl2rgb(float h, float s, float l) {
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float hp = mod(h, 1.0) * 6.0;
  float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));
  vec3 rgb;
  if (hp < 1.0) rgb = vec3(c, x, 0);
  else if (hp < 2.0) rgb = vec3(x, c, 0);
  else if (hp < 3.0) rgb = vec3(0, c, x);
  else if (hp < 4.0) rgb = vec3(0, x, c);
  else if (hp < 5.0) rgb = vec3(x, 0, c);
  else rgb = vec3(c, 0, x);
  return rgb + (l - 0.5 * c);
}

void main() {
  vec2 res = uResolution;
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;

  float shake = uShake * (uOnset808 + uBass808 * 0.5) * 0.35;
  uv += shake * vec2(sin(uTime * 55.0), cos(uTime * 48.0));

  // Energy + BPM drive forward motion
  float energy = clamp(uBass808 * 0.7 + uOnset808 * 0.5 + uHat * 0.25, 0.0, 1.5);
  float bpmFactor = max(uBpm, 100.0) / 140.0;
  float beatPulse = cos(uBeatPhase * 6.2831853) * 0.5 + 0.5; // 1 on beat
  float speed = uTunnelSpeed * (0.55 + energy * 0.9) * bpmFactor;
  speed *= (1.0 + uBpmPull * beatPulse * 0.15);
  // off-beat zoom feel
  float zoomOff = sin(uBeatPhase * 6.2831853) * 0.5 + 0.5;
  uv *= 1.0 - uBpmZoom * zoomOff * 0.08;

  // Perspective tunnel coords
  float r = length(uv) + 1e-4;
  float a = atan(uv.y, uv.x);

  // Distortion (audio-reactive swirl + warp)
  float distAmt = uTunnelDistort * (0.3 + energy);
  a += distAmt * 0.35 * sin(r * 6.0 - uTime * 2.0 + uBass808 * 4.0);
  r += distAmt * 0.05 * sin(a * 5.0 + uTime + uHat * 6.0);

  // Forward travel: depth from inverse radius
  float z = uTime * speed * 2.2;
  float depth = 1.0 / (r * (0.85 + uTunnelRadius * 0.4) * (0.9 + uFov * 0.15));
  float tunnelZ = depth + z;

  // Sidechain slight scale
  float sc = max(uSidechain, 0.3);
  float wallR = mix(0.55, 1.35, r) / sc;

  float pitchN = uPitchHz > 1.0 ? clamp((uPitchHz - 400.0) / 1600.0, 0.0, 1.0) : 0.0;
  float hue = fract(uHueBase + uHueFromPitch * pitchN * uPitchConf + tunnelZ * 0.02);
  vec3 neon = hsl2rgb(hue, clamp(uSaturation + 0.05, 0.0, 1.0), 0.55);
  vec3 neon2 = hsl2rgb(fract(hue + 0.35), uSaturation, 0.5);

  float gd = max(uGridDensity, 0.25);
  // Angular and depth grid
  float rings = abs(fract(tunnelZ * gd) - 0.5);
  float spokes = abs(fract((a / 6.2831853) * (6.0 + gd * 6.0)) - 0.5);
  float gridLine = smoothstep(0.06, 0.0, rings) + smoothstep(0.04, 0.0, spokes);

  vec3 col = vec3(0.02, 0.01, 0.04);

  if (uWallStyle < 0.5) {
    // Neon grid
    float wall = smoothstep(0.15, 0.85, r);
    col += neon * gridLine * wall * uNeonIntensity * uBloom * (0.7 + energy * 0.6);
    // center void glow
    col += neon2 * exp(-r * 3.5) * 0.25 * uNeonIntensity;
  } else {
    // Solid walls with panel edges
    float wall = smoothstep(0.05, 0.5, r);
    float panels = smoothstep(0.12, 0.0, rings) * 0.5 + 0.15;
    col += neon * wall * panels * uNeonIntensity * 0.85 * uBloom;
    col += neon2 * gridLine * wall * 0.35 * uNeonIntensity;
    col += neon * exp(-r * 2.0) * 0.2;
  }

  // 808 flash down the tunnel
  col += neon * uOnset808 * exp(-r * 1.5) * 0.8 * uBloom;
  // Hats sparkle on spokes
  col += neon2 * uHat * smoothstep(0.03, 0.0, spokes) * 0.5;

  // Fog into distance
  float fog = clamp(depth * 0.08, 0.0, 1.0);
  col = mix(col, vec3(0.01, 0.005, 0.02), fog * 0.35);

  // Chromatic
  float ca = uChromatic * (1.0 + energy);
  vec2 dir = normalize(uv + 1e-5);
  // cheap CA: tint edges
  col.r += length(uv + dir * ca * 20.0) * ca * 2.0 * neon.r;
  col.b += length(uv - dir * ca * 20.0) * ca * 2.0 * neon.b;

  if (uHasVideo > 0.5 && uVideoOpacity > 0.001) {
    vec3 vid = texture2D(uVideoTex, gl_FragCoord.xy / res).rgb;
    float cover = smoothstep(0.02, 0.4, max(col.r, max(col.g, col.b)));
    col = mix(vid * uVideoOpacity, col, clamp(0.4 + cover * 0.6, 0.0, 1.0));
  }

  col = col / (1.0 + col * 0.55);
  col = pow(clamp(col, 0.0, 1.0), vec3(0.9));
  gl_FragColor = vec4(col, 1.0);
}
