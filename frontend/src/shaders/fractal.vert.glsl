// Fullscreen quad — standard Three.js ShaderMaterial attributes (position, uv).
// Uses MVP so the plane is always on-screen with OrthographicCamera(-1..1).

varying vec2 vUv;

void main() {
  vUv = uv;
  // PlaneGeometry(2,2) spans -1..1 in XY; ortho camera matches clip space.
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
