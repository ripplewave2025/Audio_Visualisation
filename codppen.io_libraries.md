<style>
    body {
        margin: 0;
        overflow: hidden;
        background-color: #010103;
        font-family: 'Inter', -apple-system, sans-serif;
        color: #fff;
    }
    canvas { display: block; }
    #overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 40px;
        background: radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.5) 100%);
        z-index: 10;
    }
    .header { text-align: center; }
    .title {
        font-size: 1.2rem;
        letter-spacing: 0.8em;
        text-transform: uppercase;
        color: #fff;
        margin-bottom: 12px;
        font-weight: 300;
        opacity: 0.9;
    }
    .status-pill {
        display: inline-block;
        padding: 6px 20px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 30px;
        font-size: 0.65rem;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .hud-bottom {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        opacity: 0.6;
        letter-spacing: 1px;
    }
    .metric { margin-bottom: 6px; }
    .val { color: #00f3ff; font-weight: bold; transition: color 1.5s ease; }
    #vignette {
        position: fixed;
        inset: 0;
        background: radial-gradient(circle, transparent 50%, black 150%);
        pointer-events: none;
        z-index: 5;
    }
</style>

<script async src="https://unpkg.com/es-module-shims@1.8.0/dist/es-module-shims.js"></script>
<script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/",
            "gsap": "https://unpkg.com/gsap@3.12.5/index.js"
        }
    }
</script>

<div id="vignette"></div>
<div id="overlay">
    <div class="header">
        <div class="title" id="main-title">Stable Singularity</div>
        <div class="status-pill" id="status-text">Topology: Nominal</div>
    </div>
    <div class="hud-bottom">
        <div>
            <div class="metric">MASS_INDEX: <span class="val">4.2M SOL</span></div>
            <div class="metric">LENSING: <span class="val" id="lensing-val">SCHWARZSCHILD</span></div>
        </div>
        <div style="text-align: right">
            <div class="metric">RELATIVITY: <span class="val" id="vel-val">0.45c</span></div>
            <div class="metric">RADIATION: <span class="val">DETECTION ON</span></div>
        </div>
    </div>
</div>

<script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import gsap from 'gsap';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(60, 30, 60);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;

    const noiseChunk = `
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
            const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
            const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy) );
            vec3 x0 = v - i + dot(i, C.xxx) ;
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i);
            vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
            float n_ = 0.142857142857;
            vec3  ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_ );
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4( x.xy, y.xy );
            vec4 b1 = vec4( x.zw, y.zw );
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
            p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
        }
    `;

    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const bhGeo = new THREE.SphereGeometry(4, 64, 64);
    coreGroup.add(new THREE.Mesh(bhGeo, bhMat));

    const auraMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uIntensity: { value: 1.0 } },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vView;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vView = normalize(-(modelViewMatrix * vec4(position, 1.0)).xyz);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uIntensity;
            varying vec3 vNormal;
            varying vec3 vView;
            void main() {
                float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 4.0);
                gl_FragColor = vec4(vec3(1.0, 0.45, 0.1) * rim * uIntensity * 5.0, 1.0);
            }
        `,
        side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending
    });
    coreGroup.add(new THREE.Mesh(new THREE.SphereGeometry(4.25, 64, 64), auraMat));

    const instanceCount = 5000;
    const streakGeo = new THREE.CylinderGeometry(0.01, 0.12, 2.2, 3);
    streakGeo.rotateX(Math.PI / 2);
    
    const diskMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uMorph: { value: 0.1 },
            uCompression: { value: 1.0 },
            uIntensity: { value: 1.0 },
            uOrbitScale: { value: 1.0 }
        },
        vertexShader: `
            ${noiseChunk}
            uniform float uTime;
            uniform float uMorph;
            uniform float uCompression;
            uniform float uIntensity;
            uniform float uOrbitScale;
            varying vec3 vColor;
            varying float vOpacity;
            void main() {
                vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                float rOriginal = length(instPos.xz);
                float r = rOriginal * uCompression;
                float initialAngle = atan(instPos.z, instPos.x);
                float orbitalVelocity = (1.5 / sqrt(rOriginal)) * uOrbitScale;
                float currentAngle = initialAngle + (uTime * orbitalVelocity);
                vec3 morphedWorldPos = vec3(cos(currentAngle) * r, instPos.y, sin(currentAngle) * r);
                float noise = snoise(vec3(morphedWorldPos.x * 0.08, morphedWorldPos.z * 0.08, uTime * 0.3));
                morphedWorldPos.y += noise * uMorph * 4.0;
                vec3 viewDir = normalize(cameraPosition - morphedWorldPos);
                vec3 orbitDir = normalize(vec3(-sin(currentAngle), 0.0, cos(currentAngle)));
                float doppler = dot(orbitDir, viewDir);
                vec3 hot = vec3(1.0, 0.95, 0.9);
                vec3 warm = vec3(1.0, 0.45, 0.1);
                vec3 cool = vec3(0.1, 0.35, 1.0);
                vec3 color = mix(cool, warm, smoothstep(45.0, 12.0, r));
                color = mix(color, hot, smoothstep(10.0, 4.0, r));
                vColor = color * (1.3 + doppler * 0.7) * uIntensity;
                vOpacity = (smoothstep(3.8, 5.5, r) * (1.0 - smoothstep(38.0, 48.0, r))) * 0.8;
                float deltaAngle = currentAngle - initialAngle;
                float c = cos(deltaAngle);
                float s = sin(deltaAngle);
                mat3 rotY = mat3(
                    c, 0, s,
                    0, 1, 0,
                   -s, 0, c
                );
                vec3 localPos = (instanceMatrix * vec4(position, 0.0)).xyz;
                vec3 rotatedLocalPos = rotY * localPos;
                gl_Position = projectionMatrix * viewMatrix * vec4(morphedWorldPos + rotatedLocalPos, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vOpacity;
            void main() {
                gl_FragColor = vec4(vColor, vOpacity);
            }
        `,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });

    const instancedDisk = new THREE.InstancedMesh(streakGeo, diskMaterial, instanceCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < instanceCount; i++) {
        const r = 5 + Math.pow(Math.random(), 1.3) * 40;
        const angle = Math.random() * Math.PI * 2;
        dummy.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * (8 / r), Math.sin(angle) * r);
        dummy.lookAt(dummy.position.x + Math.sin(angle), dummy.position.y, dummy.position.z - Math.cos(angle));
        dummy.updateMatrix();
        instancedDisk.setMatrixAt(i, dummy.matrix);
    }
    scene.add(instancedDisk);

    const config = [
        { 
            title: "Stable Singularity", status: "Topology: Nominal", 
            morph: 0.1, compress: 1.0, intensity: 1.0, rotate: 0.4, camY: 25, camDist: 85, orbit: 1.0,
            color: "#00f3ff", vel: "0.45c"
        },
        { 
            title: "Accretion Turbulence", status: "Topology: Fluctuating", 
            morph: 4.5, compress: 1.15, intensity: 1.4, rotate: 1.5, camY: 45, camDist: 95, orbit: 1.8,
            color: "#ffaa00", vel: "0.78c"
        },
        { 
            title: "Relativistic Collapse", status: "Topology: Critical", 
            morph: 0.8, compress: 0.38, intensity: 3.5, rotate: 5.0, camY: 12, camDist: 55, orbit: 4.5,
            color: "#ff0044", vel: "0.99c"
        }
    ];

    let stateIdx = 0;
    const mainTitle = document.getElementById('main-title');
    const statusText = document.getElementById('status-text');
    const velVal = document.getElementById('vel-val');
    const camControl = { distance: 85 };

    function transition() {
        stateIdx = (stateIdx + 1) % config.length;
        con
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        st s = config[stateIdx];
        const tl = gsap.timeline({ defaults: { duration: 4.0, ease: "power2.inOut" } });
        tl.to(diskMaterial.uniforms.uMorph, { value: s.morph }, 0);
        tl.to(diskMaterial.uniforms.uCompression, { value: s.compress }, 0);
        tl.to(diskMaterial.uniforms.uIntensity, { value: s.intensity }, 0);
        tl.to(diskMaterial.uniforms.uOrbitScale, { value: s.orbit }, 0);
        tl.to(auraMat.uniforms.uIntensity, { value: s.intensity }, 0);
        tl.to(controls, { autoRotateSpeed: s.rotate }, 0);
        tl.to(camera.position, { y: s.camY }, 0);
        tl.to(camControl, { distance: s.camDist }, 0);
        gsap.to([mainTitle, statusText, '.val'], { opacity: 0, duration: 0.8, onComplete: () => {
            mainTitle.innerText = s.title;
            statusText.innerText = s.status;
            statusText.style.color = s.color;
            statusText.style.borderColor = s.color;
            velVal.innerText = s.vel;
            velVal.style.color = s.color;
            gsap.to([mainTitle, statusText, '.val'], { opacity: 1, duration: 1.2 });
        }});
    }

    setInterval(transition, 10000);

    const clock = new THREE.Clock();
    function animate() {
        const time = clock.getElapsedTime();
        diskMaterial.uniforms.uTime.value = time;
        auraMat.uniforms.uTime.value = time;
        instancedDisk.rotation.y += 0.0005;
        const currentDir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
        camera.position.x = controls.target.x + currentDir.x * camControl.distance;
        camera.position.z = controls.target.z + currentDir.z * camControl.distance;
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
</script>






<canvas id="canvas"></canvas>
<textarea id="codeEditor" class="editor" spellcheck="false" autocorrect="off" autocapitalize="off" translate="no" oninput="render()"></textarea>
<pre id="error"></pre>
<div id="indicator"></div>
<div id="controls">
  <div class="controls">
    <input id="btnToggleView" class="icon" type="checkbox" name="toggleView" onclick="toggleView()">
    <input id="btnToggleResolution" class="icon" type="checkbox" name="toggleResolution" onchange="toggleResolution()">
    <input id="btnReset" class="icon" type="checkbox" name="reset" onclick="reset()">
    <input id="btnPlayStop" class="icon" type="checkbox" name="playStop" onclick="togglePlayStop()">
  </div>
</div>
<script type="x-shader/x-fragment">#version 300 es
/*********
* made by Matthias Hurrle (@atzedent)
*/
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec2 move;
uniform vec2 wheel;
#define FC gl_FragCoord.xy
#define R resolution
#define T (time+wheel.y/1e3)
#define S smoothstep
#define N normalize 
#define MN min(R.x,R.y)
#define PI radians(180.)
#define rot(a) mat2(cos((a)-vec4(0,11,33,0)))
#define hue(a) (.5+.5*sin(6.3*(a)+vec3(1,2,3)))
float box(vec3 p, vec3 s, float r) {
	p=abs(p)-s+r;
	return length(max(p,.0))+min(.0,max(max(p.x,p.y),p.z))-r;
}
float smin(float a, float b, float k) {
	float h=clamp(.5+.5*(b-a)/k,.0,1.);
	return mix(b,a,h)-k*h*(1.-h);
}
float cuts(vec3 p, float k, float f) {
	return min(
		box(p,vec3(k,k,f),.05),
		box(p.zyx,vec3(k,k,f),.05)
	);
}
float map(vec3 p) {
	float r=2.8, a=atan(p.x,p.z);
	vec2 q=vec2(length(p.xz)-r,p.y);
	q*=rot(.5*a+T);
	q.y=abs(q.y)-.2;
	q.y=abs(q.y)-.2;
	float d=box(q.xyy,vec3(.7,.05,1.+sin(a)*.5+.5),.05);
	return smin(-cuts(p,5.,.2),d,-.05);
}
vec3 norm(vec3 p) {
	float h=1e-3; vec2 k=vec2(-1,1);
	return N(
		k.xyy*map(p+k.xyy*h)+
		k.yxy*map(p+k.yxy*h)+
		k.yyx*map(p+k.yyx*h)+
		k.xxx*map(p+k.xxx*h)
	);
}
bool march(inout vec3 p, vec3 rd, out float dd) {
	for (float i; i++<400.;) {
		float d=map(p);
		if (abs(d)<1e-3) return true;
		if (d>100.) return false;
		p+=rd*d*.5;
		dd+=d*.5;
	}
}
float calcAO(vec3 p, vec3 n) {
	float occ=.0, sca=1.;
	for (float i=.0; i<5.; i++) {
		float
		h=.01+i*.05,
		d=map(p+h*n);
		occ+=(h-d)*sca;
		sca*=.95;
		if (occ>.35) break;
	}
	return clamp(1.-3.*occ,.0,1.)*(.5+.5*n.y);
}
float shadow(vec3 p, vec3 lp) {
	float shd=1., maxd=distance(lp,p);
	vec3 l=N(lp-p);
	for (float i=1e-3; i<maxd;) {
		float d=map(p+l*i);
		if (d<1e-3) {
			shd=.0;
			break;
		}
		shd=min(shd,16.*d/i);
		i+=d;
	}
	return shd;
}
vec3 org(inout vec3 t) {
	vec3 p=t-vec3(0,-.5,12);
	p.yz*=rot(.78-.5*sin(move.y*6.3/MN));
	p.xz*=rot(.78-move.x*6.3/MN);
	return p;
}
vec3 dir(vec2 uv, vec3 p, vec3 t, float z) {
	vec3 up=vec3(0,1,0),
	f=N(t-p),
	r=N(cross(up,f)),
	u=N(cross(f,r));
	return mat3(r,u,f)*N(vec3(uv,z));
}
vec3 render(vec2 uv) {
	vec3 col=vec3(0),
	t=vec3(0,-.5,0), p=org(t), ro=p,
	rd=dir(uv,p,t,2.);
	float dd;
	if (march(p,rd,dd)) {
		vec3 n=norm(p), lp=vec3(0,3,0), l=N(lp-p),
		e=N(ro-p), r=reflect(-l,n);
		float ao=calcAO(p,n), amb=1.+10.*n.y, ld=distance(ro,p),
		dif=clamp(dot(l,n),.0,1.), atten=1./(1.+ld*.25+ld*ld*.125),
		shd=shadow(p+n*5e-2,lp), ref=pow(clamp(dot(r,e),.0,1.),8.);
		col+=dif*shd;
		col+=clamp(dot(-rd,l),.0,1.)*atten;
		col+=ref;
		col*=hue(T*.2-.4*length(p))+amb*ao*atten;
		col=col*2./(2.+col);
	}
	return col;
}
void main() {
	vec2 uv=(FC-.5*R)/MN;
	vec3 col=render(uv);
  O=vec4(col,1);
}</script>




css

::-webkit-scrollbar {
  width: 0.625rem;
  height: 0.625rem;
}

::-webkit-scrollbar-thumb {
  background: #111;
  border-radius: 0.3125rem;
  box-shadow: inset 0.125rem 0.125rem 0.125rem rgba(255, 255, 255, 0.25),
    inset -0.125rem -0.125rem 0.125rem rgba(0, 0, 0, 0.25);
  cursor: default;
}

::-webkit-scrollbar-track {
  background: #333;
}

::selection {
  background: #fff;
  color: #333;
}

html,
body {
  height: 100vh;
  height: 100dvh;
  margin: 0;
  overflow: hidden;
}

body {
  display: grid;
  grid-template-rows: calc(100dvh - 4rem) 4rem;
  font-family: system-ui, sans-serif;
}

canvas,
.editor,
#controls {
  grid-row: 1;
  grid-column: 1;
}

canvas {
  --canvas-z-index: -1;
  width: 100%;
  height: auto;
  object-fit: contain;
  background: black;
  touch-action: none;
  z-index: var(--canvas-z-index);
}

.editor,
.overlay,
#error {
  font-family: 'Courier New', Courier, monospace;
  background: repeating-linear-gradient(0deg, #000a, #1119, #000a .25rem);
  padding: 1em;
}

.editor {
  color: #fefefe;
  tab-size: 2;
  border: none;
  resize: none;
}

.editor:focus {
  outline: none;
}

#error {
  grid-row: 2;
  grid-column: 1;
  margin: 0;
  padding-block: 0;
  padding-top: .5em;
  color: firebrick;
  overflow: auto;
  text-wrap: pretty;
}

#indicator {
  visibility: hidden;
  position: absolute;
  top: calc(var(--top, 0px) - var(--scroll-top, 0px));
  width: 0;
  height: 0;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-left: 10px solid firebrick;
  transform: translateY(-25%);
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  margin: 0;
}

.editor,
.overlay {
  font-size: 1rem;
  line-height: 1.2;
  white-space: pre;
}

#controls {
  position: fixed;
  top: 1em;
  right: 2em;
}

.controls {
  position: relative;
  display: flex;
  gap: 1.5em;
  padding: .5em 1.25em;
  background: #1111;
  border-radius: 4px;
}

.controls::before,
.controls::after {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  transform: scale(.95);
  border-radius: inherit;
  opacity: 0;
}

.controls::before {
  background: #aef;
  animation: pulse 2s infinite;
}

.controls::after {
  background: #fefefe66;
  transition: transform 200ms ease-in-out;
}

.controls:hover::before,
.controls:hover::after {
  opacity: 1;
}

.controls:hover::before {
  transform: scale(.98);
  filter: blur(2px);
}

.controls:hover::after {
  transform: scale(1.025, 1.1);
}

.controls:hover {
  background: #111f;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.0125);
  }

  100% {
    transform: scale(1);
  }
}

.hidden {
  display: none !important;
}

.opaque {
  opacity: 1 !important;
  background: #111 !important;
}

input {
  all: unset;
  opacity: .2;
  filter: saturate(0) invert(1);
  cursor: pointer;
  transition: opacity 200ms ease-in-out;
  padding: .25em .5em;
}

input:hover {
  opacity: 1;
}

.icon {
  text-align: center;
  line-height: 1;
}

#btnToggleView {
  width: 1.25em;
}

#btnToggleView::after {
  content: '👁';
}

#btnToggleView:checked::after {
  content: '✏️';
}

#btnToggleResolution::after {
  content: '1️⃣';
}

#btnToggleResolution:checked::after {
  content: '2️⃣';
}

#btnReset::after {
  content: '⏮️';
}

#btnPlayStop::after {
  content: '▶️';
}

#btnPlayStop:checked::after {
  content: '⏸️';
}





JS:
/*********
 * made by Matthias Hurrle (@atzedent)
 */
let editMode = false // set to false to hide the code editor on load
let playOnLoad = true // set to true to start the shader automatically on load, otherwise click the play button
let resolution = .5 // set 1 for full resolution or to .5 to start with half resolution on load
let renderDelay = 1000 // delay in ms before rendering the shader after a change
let startTime = 0
let elapsedTime = 0
let interactionFrameRequested = false
let dpr = Math.max(1, resolution * window.devicePixelRatio)
let frm, source, editor, renderer, pointers
window.onload = init

function resize() {
  const { innerWidth: width, innerHeight: height } = window

  canvas.width = width * dpr
  canvas.height = height * dpr

  if (renderer) {
    renderer.updateScale(dpr)
    renderInteractionFrame()
  }
}
function toggleView() {
  editor.hidden = btnToggleView.checked
  canvas.style.setProperty('--canvas-z-index', btnToggleView.checked ? 0 : -1)
}
function reset() {
  let shader = source
  editor.text = shader ? shader.textContent : renderer.defaultSource
  renderThis()
}
function toggleResolution() {
  resolution = btnToggleResolution.checked ? .5 : 1
  dpr = Math.max(1, resolution * window.devicePixelRatio)
  pointers.updateScale(dpr)
  resize()
}
function update() {
  renderer.updateMouse(pointers.first)
  renderer.updatePointerCount(pointers.count)
  renderer.updatePointerCoords(pointers.coords)
  renderer.updateMove(pointers.move)
  renderer.updateZoom(pointers.zoomed)
  renderer.updateWheel(pointers.wheel)
}
function loop(now) {
  elapsedTime = now - startTime
  update()
  renderer.render(elapsedTime)
  frm = requestAnimationFrame(loop)
}
async function renderThis() {
  editor.clearError()
  const result = renderer.test(editor.text)

  if (result) {
    editor.setError(result)
  } else {
    renderer.updateShader(editor.text)
  }
  const wasPlaying = !!frm
  cancelAnimationFrame(frm) // Always cancel the previous frame!
  frm = null

  if (wasPlaying || playOnLoad) {
    play()
  } else {
    renderer.render(elapsedTime)
  }
}
const play = () => {
  if (frm) return
  startTime = performance.now() - elapsedTime
  loop(performance.now())
  btnPlayStop.checked = true
}
const stop = () => {
  if (frm) {
    elapsedTime = performance.now() - startTime
  }
  cancelAnimationFrame(frm)
  frm = null
  btnPlayStop.checked = false
}
function togglePlayStop() {
  if (btnPlayStop.checked) {
    playOnLoad = true
    play()
  } else {
    playOnLoad = false
    stop()
  }
}
const debounce = (fn, delay) => {
  let timerId
  return (...args) => {
    clearTimeout(timerId)
    timerId = setTimeout(() => fn.apply(this, args), delay)
  }
}
const render = debounce(renderThis, renderDelay)
function renderInteractionFrame() {
  if (frm || interactionFrameRequested || !renderer || !pointers) return
  interactionFrameRequested = true
  requestAnimationFrame(() => {
    interactionFrameRequested = false
    if (frm) return
    update()
    renderer.render(elapsedTime)
  })
}
function init() {
  source = document.querySelector("script[type='x-shader/x-fragment']")

  document.title = "Elevator Visual"

  renderer = new Renderer(canvas, dpr)
  pointers = new PointerHandler(canvas, dpr)
  editor   = new Editor(codeEditor, error, indicator)
  editor.text = source.textContent
  renderer.setup()
  renderer.init()

  if (!editMode) {
    btnToggleView.checked = true
    toggleView()
  }
  if (resolution === .5) {
    btnToggleResolution.checked = true
    toggleResolution()
  }
  canvas.addEventListener('shader-error', e => editor.setError(e.detail))
  pointers.onchange = renderInteractionFrame
  resize()

  if (renderer.test(source.textContent) === null) {
    renderer.updateShader(source.textContent)
  }
  elapsedTime = 0
  startTime = performance.now()
  renderThis()
  window.onresize = resize
  window.addEventListener("keydown", e => {
    if (e.key === "L" && e.ctrlKey) {
      e.preventDefault()
      btnToggleView.checked = !btnToggleView.checked
      toggleView()
    } else if (e.key === " " && editor.hidden) {
      e.preventDefault()
      btnPlayStop.checked = !btnPlayStop.checked
      togglePlayStop()
    }
  })
}
class Renderer {
  #vertexSrc = "#version 300 es\nprecision highp float;\nin vec4 position;\nvoid main(){gl_Position=position;}"
  #fragmtSrc = "#version 300 es\nprecision highp float;\nout vec4 O;\nuniform float time;\nuniform vec2 resolution;\nvoid main() {\n\tvec2 uv=gl_FragCoord.xy/resolution;\n\tO=vec4(uv,sin(time)*.5+.5,1);\n}"
  #vertices = [-1, 1, -1, -1, 1, 1, 1, -1]
  constructor(canvas, scale) {
    this.canvas = canvas
    this.scale = scale
    this.gl = canvas.getContext("webgl2")
    this.gl.viewport(0, 0, canvas.width * scale, canvas.height * scale)
    this.shaderSource = this.#fragmtSrc
    this.mouseMove = [0, 0]
    this.mouseCoords = [0, 0]
    this.pointerCoords = [0, 0]
    this.nbrOfPointers = 0
    this.zoom = 0
    this.wheel = [0, 0]
    this.startRandom = Math.random()
  }
  get defaultSource() { return this.#fragmtSrc }
  updateShader(source) {
    this.reset()
    this.shaderSource = source
    this.setup()
    this.init()
  }
  updateMove(deltas) {
    this.mouseMove = deltas
  }
  updateZoom(zoom) {
    this.zoom = zoom
  }
  updateWheel(wheel) {
    this.wheel = wheel
  }
  updateMouse(coords) {
    this.mouseCoords = coords
  }
  updatePointerCoords(coords) {
    this.pointerCoords = coords
  }
  updatePointerCount(nbr) {
    this.nbrOfPointers = nbr
  }
  updateScale(scale) {
    this.scale = scale
    this.gl.viewport(0, 0, this.canvas.width * scale, this.canvas.height * scale)
  }
  compile(shader, source) {
    const gl = this.gl
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader))
      this.canvas.dispatchEvent(new CustomEvent('shader-error', { detail: gl.getShaderInfoLog(shader) }))
    }
  }
  test(source) {
    let result = null
    const gl = this.gl
    const shader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      result = gl.getShaderInfoLog(shader)
    }
    if (!gl.getShaderParameter(shader, gl.DELETE_STATUS)) {
      gl.deleteShader(shader)
    }
    return result
  }
  reset() {
    const { gl, program, vs, fs } = this
    if (!program || gl.getProgramParameter(program, gl.DELETE_STATUS)) return
    if (!gl.getShaderParameter(vs, gl.DELETE_STATUS)) {
      gl.detachShader(program, vs)
      gl.deleteShader(vs)
    }
    if (!gl.getShaderParameter(fs, gl.DELETE_STATUS)) {
      gl.detachShader(program, fs)
      gl.deleteShader(fs)
    }
    gl.deleteProgram(program)
  }
  setup() {
    const gl = this.gl
    this.vs = gl.createShader(gl.VERTEX_SHADER)
    this.fs = gl.createShader(gl.FRAGMENT_SHADER)
    this.compile(this.vs, this.#vertexSrc)
    this.compile(this.fs, this.shaderSource)
    this.program = gl.createProgram()
    gl.attachShader(this.program, this.vs)
    gl.attachShader(this.program, this.fs)
    gl.linkProgram(this.program)

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(this.program))
    }
  }
  init() {
    const { gl, program } = this
    this.buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.#vertices), gl.STATIC_DRAW)

    const position = gl.getAttribLocation(program, "position")

    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    program.resolution = gl.getUniformLocation(program, "resolution")
    program.time = gl.getUniformLocation(program, "time")
    program.daytime = gl.getUniformLocation(program, "daytime")
    program.move = gl.getUniformLocation(program, "move")
    program.touch = gl.getUniformLocation(program, "touch")
    program.pointerCount = gl.getUniformLocation(program, "pointerCount")
    program.pointers = gl.getUniformLocation(program, "pointers")
    program.zoom = gl.getUniformLocation(program, "zoom")
    program.wheel = gl.getUniformLocation(program, "wheel") 
    program.startRandom = gl.getUniformLocation(program, "startRandom")
  }
  render(now = 0) {
    const { gl, program, buffer, canvas, mouseMove, mouseCoords, pointerCoords, nbrOfPointers, zoom, wheel, startRandom } = this
    const daytime = new Date()
    if (!program || gl.getProgramParameter(program, gl.DELETE_STATUS)) return

    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.uniform2f(program.resolution, canvas.width, canvas.height)
    gl.uniform1f(program.time, now * 1e-3)
    gl.uniform4f(program.daytime, daytime.getHours(), daytime.getMinutes(), daytime.getSeconds(), daytime.getMilliseconds())
    gl.uniform2f(program.move, ...mouseMove)
    gl.uniform2f(program.touch, ...mouseCoords)
    gl.uniform1i(program.pointerCount, nbrOfPointers)
    gl.uniform2fv(program.pointers, pointerCoords)
    gl.uniform1f(program.zoom, zoom)
    gl.uniform2f(program.wheel, ...wheel)
    gl.uniform1f(program.startRandom, startRandom)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  clear() {
    const { gl } = this
    gl.clear(gl.COLOR_BUFFER_BIT)
  }
}
class PointerHandler {
  constructor(element, scale) {
    this.scale = scale
    this.active = false
    this.onchange = null
    this.pointers = new Map()
    this.lastCoords = [0, 0]
    this.moves = [0, 0]
    this.zoom = 0
    this.wheelDelta = 0
    this.wheelOffset = 0
    this.ex = 0
    this.ey = 0
    const emit = () => {
      if (typeof this.onchange === 'function') {
        this.onchange()
      }
    }
    const map = (element, scale, x, y) => [x * scale, element.height - y * scale]
    element.addEventListener("pointerdown", (e) => {
      this.active = true
      this.pointers.set(e.pointerId, map(element, this.getScale(), e.clientX, e.clientY))
      this.ex = e.clientX
      this.ey = e.clientY
      emit()
    })
    element.addEventListener("pointerup", (e) => {
      if (this.count === 1) {
        this.lastCoords = this.first
      }
      this.pointers.delete(e.pointerId)
      this.active = this.pointers.size > 0
      emit()
    })
    element.addEventListener("pointerleave", (e) => {
      if (this.count === 1) {
        this.lastCoords = this.first
      }
      this.pointers.delete(e.pointerId)
      this.active = this.pointers.size > 0
      emit()
    })
    element.addEventListener("pointermove", (e) => {
      if (!this.active) return
      const mapped = map(element, this.getScale(), e.clientX, e.clientY)
      this.lastCoords = mapped
      this.pointers.set(e.pointerId, mapped)
      this.moves = [this.moves[0] + (e.clientX - this.ex), this.moves[1] + (this.ey - e.clientY)]
      this.ex = e.clientX
      this.ey = e.clientY
      emit()
    })
    element.addEventListener("wheel", (e) => {
      this.zoom = lerp(this.zoom, Math.max(-1, Math.min(1, this.zoom + e.deltaY)), .05)
      if (this.wheelDelta * e.deltaY < 0) {
        this.wheelDelta = e.deltaY
      } else {
        this.wheelDelta = lerp(this.wheelDelta, e.deltaY, .05)
      }
      this.wheelOffset += this.wheelDelta
      emit()
    }, { passive: true })
  }
  getScale() {
    return this.scale
  }
  updateScale(scale) { this.scale = scale }
  reset() {
    this.pointers.clear()
    this.active = false
    this.lastCoords = [0, 0]
    this.moves = [0, 0]
    this.zoom = 0
    this.wheelDelta = 0
    this.wheelOffset = 0
  }
  get count() {
    return this.pointers.size
  }
  get move() {
    return this.moves
  }
  get zoomed() {
    return this.zoom
  }
  get wheel() {
    return [this.wheelDelta, this.wheelOffset] || [0, 0]
  }
  get coords() {
    return this.pointers.size > 0 ? Array.from(this.pointers.values()).map((p) => [...p]).flat() : [0, 0]
  }
  get first() {
    return this.pointers.values().next().value || this.lastCoords
  }
}
function lerp(a, b, t) {
  return a + (b - a) * t
}
class Editor {
  constructor(textarea, errorfield, errorindicator) {
    this.textarea = textarea
    this.errorfield = errorfield
    this.errorindicator = errorindicator
    textarea.addEventListener('keydown', this.handleKeydown.bind(this))
    textarea.addEventListener('scroll', this.handleScroll.bind(this))
  }
  get hidden() { return this.textarea.classList.contains('hidden') }
  set hidden(value) { value ? this.#hide() : this.#show() }
  get text() { return this.textarea.value }
  set text(value) { this.textarea.value = value }
  get scrollTop() { return this.textarea.scrollTop }
  set scrollTop(value) { this.textarea.scrollTop = value }
  setError(message) {
    this.errorfield.innerHTML = message
    this.errorfield.classList.add('opaque')
    const match = message.match(/ERROR: \d+:(\d+):/)
    const lineNumber = match ? parseInt(match[1]) : 0
    const overlay = document.createElement('pre')

    overlay.classList.add('overlay')
    overlay.textContent = '\n'.repeat(lineNumber)

    document.body.appendChild(overlay)

    const offsetTop = parseInt(getComputedStyle(overlay).height)

    this.errorindicator.style.setProperty('--top', offsetTop + 'px')
    this.errorindicator.style.visibility = 'visible'

    document.body.removeChild(overlay)
  }
  clearError() {
    this.errorfield.textContent = ''
    this.errorfield.classList.remove('opaque')
    this.errorfield.blur()
    this.errorindicator.style.visibility = 'hidden'
  }
  focus() {
    this.textarea.focus()
  }
  #hide() {
    for (const el of [this.errorindicator, this.errorfield, this.textarea]) {
      el.classList.add('hidden')
    }
  }
  #show() {
    for (const el of [this.errorindicator, this.errorfield, this.textarea]) {
      el.classList.remove('hidden')
    }
    this.focus()
  }
  handleScroll() {
    this.errorindicator.style.setProperty('--scroll-top', `${this.textarea.scrollTop}px`)
  }
  handleKeydown(event) {
    if (event.key === "Tab") {
      event.preventDefault()
      this.handleTabKey(event.shiftKey)
    } else if (event.key === "Enter") {
      event.preventDefault()
      this.handleEnterKey()
    }
  }
  handleTabKey(shiftPressed) {
    if (this.#getSelectedText() !== "") {
      if (shiftPressed) {
        this.#unindentSelectedText()
        return
      }
      this.#indentSelectedText()
    } else {
      this.#indentAtCursor()
    }
  }
  #getSelectedText() {
    const editor = this.textarea
    const start = editor.selectionStart
    const end = editor.selectionEnd
    return editor.value.substring(start, end)
  }
  #indentAtCursor() {
    const editor = this.textarea
    const cursorPos = editor.selectionStart

    document.execCommand('insertText', false, '\t')
    editor.selectionStart = editor.selectionEnd = cursorPos + 1
  }
  #indentSelectedText() {
    const editor = this.textarea
    const cursorPos = editor.selectionStart
    const selectedText = this.#getSelectedText()
    const lines = selectedText.split('\n')
    const indentedText = lines.map(line => '\t' + line).join('\n')

    document.execCommand('insertText', false, indentedText)
    editor.selectionStart = cursorPos
  }
  #unindentSelectedText() {
    const editor = this.textarea
    const cursorPos = editor.selectionStart
    const selectedText = this.#getSelectedText()
    const lines = selectedText.split('\n')
    const indentedText = lines.map(line => line.replace(/^\t/, '').replace(/^ /, '')).join('\n')

    document.execCommand('insertText', false, indentedText)
    editor.selectionStart = cursorPos
  }
  handleEnterKey() {
    const editor = this.textarea
    const visibleTop = editor.scrollTop
    const cursorPosition = editor.selectionStart

    let start = cursorPosition - 1
    while (start >= 0 && editor.value[start] !== '\n') {
      start--
    }

    let newLine = ''
    while (start < cursorPosition - 1 && (editor.value[start + 1] === ' ' || editor.value[start + 1] === '\t')) {
      newLine += editor.value[start + 1]
      start++
    }

    document.execCommand('insertText', false, '\n' + newLine)
    editor.selectionStart = editor.selectionEnd = cursorPosition + 1 + newLine.length
    editor.scrollTop = visibleTop // Prevent the editor from scrolling
    const lineHeight = editor.scrollHeight / editor.value.split('\n').length
    const line = editor.value.substring(0, cursorPosition).split('\n').length

    // Do the actual layout calculation in order to get the correct scroll position
    const visibleBottom = editor.scrollTop + editor.clientHeight
    const lineTop = lineHeight * (line - 1)
    const lineBottom = lineHeight * (line + 2)

    // If the cursor is outside the visible range, scroll the editor
    if (lineTop < visibleTop) editor.scrollTop = lineTop
    if (lineBottom > visibleBottom) editor.scrollTop = lineBottom - editor.clientHeight
  }
}

<!doctype html>
<!--
  Event Horizon Orbit: interactive local-time observatory around a lensed black hole.
  Hour (gold), minute (pink), and second (cyan) light waves plus orbiting beacons
  and debris on Canvas 2D.

  A clock by Luke Steuber: https://datapoems.io/clocks/
  MIT License. Reuse freely, keep this credit.
  Visual premise inspired by browser black-hole and accretion-disk experiments.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Event Horizon Orbit</title>
<meta name="description" content="Gold hour and pink minute hands with beacons bend through stronger gravitational lensing around a black hole; cyan seconds stay light while exact local time remains clear.">
<style>
  :root {
    color-scheme: dark;
    --ink: #010108;
    --text: #f7f1ff;
    --amber: #ffb35c;
    --ice: #79e7ff;
    --pink: #ff4fc8;
    --violet: #8d6bff;
    --lime: #b7ff72;
    --coral: #ff6b6b;
  }
  * { box-sizing: border-box; }
  html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: var(--ink); }
  body { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: var(--text); }
  canvas {
    position: fixed; inset: 0; width: 100%; height: 100%;
    display: block; touch-action: none; cursor: grab; outline: none;
  }
  canvas:active { cursor: grabbing; }
  canvas:focus-visible { box-shadow: inset 0 0 0 3px var(--ice); }
  .readout {
    position: fixed; z-index: 2;
    left: max(18px, env(safe-area-inset-left));
    top: max(18px, env(safe-area-inset-top));
    padding: 10px 12px 10px 10px;
    border-left: 2px solid rgba(121, 231, 255, 0.55);
    pointer-events: none;
    text-shadow: 0 2px 12px #000;
    background: linear-gradient(90deg, rgba(8, 8, 24, 0.75), transparent);
  }
  .time {
    display: block;
    color: rgba(247, 241, 255, 0.88);
    font-size: clamp(15px, 1.9vw, 22px);
    line-height: 1;
    font-weight: 600;
    letter-spacing: 0.12em;
    font-variant-numeric: tabular-nums;
  }
  .legend {
    display: flex; gap: 0.85rem; margin-top: 7px;
    font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
    color: rgba(247, 241, 255, 0.42);
  }
  .legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
  .legend i {
    width: 7px; height: 7px; border-radius: 50%;
    box-shadow: 0 0 8px currentColor; background: currentColor;
  }
  .legend .h { color: var(--amber); }
  .legend .m { color: var(--pink); }
  .legend .s { color: var(--ice); }
  .sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
  @media (max-width: 560px) {
    .time { font-size: 14px; }
    .legend { font-size: 9px; gap: 0.55rem; }
  }
  @media (max-height: 480px) { .legend { display: none; } }
  @media (prefers-reduced-motion: reduce) { canvas { cursor: default; } }
  @media (forced-colors: active) {
    canvas:focus-visible { outline: 3px solid Highlight; }
  }
</style>
</head>
<body>
<main>
  <canvas id="orbit" tabindex="0" role="img" aria-label="Event Horizon Orbit is loading local time."></canvas>
  <div class="readout" aria-hidden="true">
    <time id="display" class="time">--:--:--</time>
    <p class="legend">
      <span class="h"><i></i>hour</span>
      <span class="m"><i></i>minute</span>
      <span class="s"><i></i>second</span>
    </p>
  </div>
</main>
<p id="status" class="sr-only" aria-live="polite">Loading local time.</p>
<script>
(function () {
  "use strict";

  var canvas = document.getElementById("orbit");
  var ctx = canvas.getContext && canvas.getContext("2d");
  var display = document.getElementById("display");
  var status = document.getElementById("status");
  if (!ctx) {
    status.textContent = "Canvas is unavailable. The local time remains visible.";
    updateClock();
    setInterval(updateClock, 1000);
    return;
  }

  var motion = matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = motion.matches;
  var W = 1, H = 1, DPR = 1, raf = 0;
  var yaw = -0.38, pitch = 0.22, targetYaw = yaw, targetPitch = pitch;
  var auto = !reduced;
  var lastMinute = "", clockStamp = "--:--:--";
  var pointer = { down: false, x: 0, y: 0, id: null };
  var TAU = Math.PI * 2;
  var stars = [], dust = [], sparks = [], streamers = [];

  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function seeded(i) {
    var x = Math.sin(i * 1297.31 + 23.9) * 43758.5453;
    return x - Math.floor(x);
  }
  function mix(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function rebuildField() {
    stars = [];
    dust = [];
    sparks = [];
    streamers = [];
    var i, u, v, r, a, z, q;

    /* Dense star field */
    for (i = 0; i < 1400; i += 1) {
      u = seeded(i * 4);
      v = seeded(i * 4 + 1);
      r = 3 + seeded(i * 4 + 2) * 26;
      a = u * TAU;
      z = (v * 2 - 1) * r;
      q = Math.sqrt(Math.max(0, r * r - z * z));
      stars.push({
        x: Math.cos(a) * q,
        y: z,
        z: Math.sin(a) * q,
        s: 0.3 + seeded(i * 4 + 3) * 1.5,
        w: seeded(i * 7) > 0.78,
        c: seeded(i * 11)
      });
    }

    /* Accretion / halo dust particles (screen-space orbit helpers rebuilt each frame via angles) */
    for (i = 0; i < 420; i += 1) {
      dust.push({
        phase: seeded(i * 3) * TAU,
        radius: 1.15 + seeded(i * 3 + 1) * 2.35,
        speed: 0.35 + seeded(i * 3 + 2) * 1.4,
        size: 0.4 + seeded(i * 5) * 1.8,
        hue: seeded(i * 9),
        tilt: 0.7 + seeded(i * 13) * 0.5
      });
    }

    /* Fast inner sparks */
    for (i = 0; i < 180; i += 1) {
      sparks.push({
        phase: seeded(i * 6 + 1) * TAU,
        radius: 1.05 + seeded(i * 6 + 2) * 0.55,
        speed: 1.8 + seeded(i * 6 + 3) * 3.2,
        size: 0.5 + seeded(i * 6 + 4) * 1.4,
        warm: seeded(i * 8) > 0.45
      });
    }

    /* Long colorful streamer seeds for ambient jets */
    for (i = 0; i < 24; i += 1) {
      streamers.push({
        phase: seeded(i * 17) * TAU,
        length: 0.35 + seeded(i * 17 + 1) * 1.1,
        radius: 1.4 + seeded(i * 17 + 2) * 1.8,
        hue: seeded(i * 17 + 3) * 360,
        speed: 0.08 + seeded(i * 17 + 4) * 0.2
      });
    }
  }

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 1.75);
    W = innerWidth;
    H = innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    rebuildField();
    draw(performance.now());
  }

  function project(x, y, z) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var x1 = x * cy - z * sy;
    var z1 = x * sy + z * cy;
    var y1 = y * cp - z1 * sp;
    var z2 = y * sp + z1 * cp;
    var depth = 28 + z2;
    var scale = Math.min(W, H) * 0.58 / Math.max(8, depth);
    return { x: W / 2 + x1 * scale, y: H / 2 + y1 * scale, s: scale, z: z2 };
  }

  function ellipse(cx, cy, rx, ry, rotation, color, width, blur) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.scale(1, ry / rx);
    ctx.strokeStyle = color;
    ctx.lineWidth = width * rx / ry;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function lensArc(cx, cy, hole, angle, color, width, length, alpha, weight) {
    weight = weight == null ? 1 : weight;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = width * (3.2 + weight * 1.4);
    var echoes = weight > 0.85 ? 7 : 5;
    for (var echo = 0; echo < echoes; echo += 1) {
      var radius = hole * (1.1 + echo * (0.024 + weight * 0.01));
      var spread = length * (1 + echo * 0.12);
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * weight / (echo * 0.85 + 1);
      ctx.lineWidth = Math.max(0.7, width * (1 - echo * 0.11) * weight);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, angle - spread, angle + spread * 0.22);
      ctx.stroke();
    }
    /* Stronger lensed echo + Einstein-ring ghosts on far side */
    ctx.globalAlpha = alpha * (0.32 + weight * 0.18);
    ctx.lineWidth = Math.max(0.5, width * (0.55 + weight * 0.2));
    ctx.beginPath();
    ctx.arc(cx, cy, hole * 1.22, angle + Math.PI - length * 0.4, angle + Math.PI + length * 0.18);
    ctx.stroke();
    if (weight > 0.85) {
      ctx.globalAlpha = alpha * 0.22;
      ctx.lineWidth = Math.max(0.4, width * 0.35);
      ctx.beginPath();
      ctx.arc(cx, cy, hole * 1.34, angle + Math.PI - length * 0.22, angle + Math.PI + length * 0.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* Radial hand spoke from photon ring to orbiting beacon — H/M emphasis */
  function handSpoke(cx, cy, hole, angle, color, length, width) {
    var yScale = 0.42 + Math.abs(Math.sin(pitch)) * 0.28;
    var r0 = hole * 1.14;
    var r1 = hole * length;
    var x0 = cx + Math.cos(angle) * r0;
    var y0 = cy + Math.sin(angle) * r0 * yScale;
    var x1 = cx + Math.cos(angle) * r1;
    var y1 = cy + Math.sin(angle) * r1 * yScale;
    ctx.save();
    ctx.lineCap = "round";
    /* Dark understroke for contrast against accretion glow */
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(0,0,4,0.72)";
    ctx.lineWidth = width * 2.4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = color;
    ctx.shadowBlur = width * 3.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.shadowBlur = width * 1.2;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = Math.max(1, width * 0.28);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }

  function beacon(cx, cy, hole, angle, color, size, orbitR) {
    var r = hole * (orbitR == null ? 1.55 : orbitR);
    var yScale = 0.42 + Math.abs(Math.sin(pitch)) * 0.28;
    var x = cx + Math.cos(angle) * r;
    var y = cy + Math.sin(angle) * r * yScale;
    /* Lensed secondary image on the far side of the photon ring */
    var gx = cx + Math.cos(angle + Math.PI) * hole * 1.18;
    var gy = cy + Math.sin(angle + Math.PI) * hole * 1.18 * yScale;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    var ghost = ctx.createRadialGradient(gx, gy, 0, gx, gy, size * 2.2);
    ghost.addColorStop(0, "rgba(255,255,255,0.35)");
    ghost.addColorStop(0.3, color);
    ghost.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = ghost;
    ctx.beginPath();
    ctx.arc(gx, gy, size * 2.2, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    var g = ctx.createRadialGradient(x, y, 0, x, y, size * 5.2);
    g.addColorStop(0, "rgba(255,255,255,0.98)");
    g.addColorStop(0.18, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, size * 5.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 2.4;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.62, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* Einstein-ring optical depth: warped glow + chromatic shear around the hole */
  function drawGravitationalLensing(cx, cy, hole, t) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    var pulse = reduced ? 0.55 : 0.48 + 0.12 * Math.sin(t * 0.0008);
    /* Soft warped corona just outside the event shadow */
    var warp = ctx.createRadialGradient(cx, cy, hole * 0.92, cx, cy, hole * 2.85);
    warp.addColorStop(0, "rgba(255,200,255,0)");
    warp.addColorStop(0.18, "rgba(255,120,200," + (0.1 * pulse) + ")");
    warp.addColorStop(0.32, "rgba(120,220,255," + (0.14 * pulse) + ")");
    warp.addColorStop(0.48, "rgba(255,180,90," + (0.08 * pulse) + ")");
    warp.addColorStop(0.7, "rgba(140,100,255,0.04)");
    warp.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = warp;
    ctx.beginPath();
    ctx.arc(cx, cy, hole * 2.85, 0, TAU);
    ctx.fill();

    /* Concentric Einstein-ring arcs with chromatic offset */
    var rings = [
      { r: 1.32, a: 0.22, w: 2.4, c: "rgba(121,231,255," },
      { r: 1.48, a: 0.16, w: 1.8, c: "rgba(255,79,200," },
      { r: 1.68, a: 0.1, w: 1.3, c: "rgba(255,179,92," },
      { r: 1.95, a: 0.06, w: 1, c: "rgba(141,107,255," }
    ];
    var i, ring, phase, spread;
    for (i = 0; i < rings.length; i += 1) {
      ring = rings[i];
      phase = yaw * (0.35 + i * 0.08) + (reduced ? 0 : t * 0.00015 * (1 - i * 0.15));
      spread = 0.55 + i * 0.12;
      ctx.strokeStyle = ring.c + (ring.a * pulse) + ")";
      ctx.lineWidth = ring.w;
      ctx.shadowColor = ring.c + "0.5)";
      ctx.shadowBlur = 10 - i * 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, hole * ring.r, phase, phase + spread);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, hole * ring.r, phase + Math.PI, phase + Math.PI + spread * 0.85);
      ctx.stroke();
      /* Chromatic shear twin */
      ctx.strokeStyle = rings[(i + 1) % rings.length].c + (ring.a * 0.45 * pulse) + ")";
      ctx.lineWidth = Math.max(0.6, ring.w * 0.55);
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(cx + 1.2, cy - 0.8, hole * (ring.r + 0.018), phase + 0.08, phase + spread * 0.9);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawDiskParticles(cx, cy, hole, t, tilt, rotation) {
    var time = reduced ? 0 : t * 0.001;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.scale(1, tilt);

    var i, p, ang, rr, px, py, hue, alpha, sz;

    for (i = 0; i < dust.length; i += 1) {
      p = dust[i];
      ang = p.phase + time * p.speed * (p.radius > 2 ? 0.55 : 1.1);
      rr = hole * p.radius;
      px = Math.cos(ang) * rr;
      py = Math.sin(ang) * rr;
      hue = (280 + p.hue * 140 + Math.sin(ang + yaw) * 40) % 360;
      alpha = 0.12 + (1 - (p.radius - 1.15) / 2.35) * 0.38;
      sz = p.size * (0.7 + (1 / p.radius) * 0.5);
      ctx.fillStyle = "hsla(" + hue + ",95%," + (58 + p.hue * 20) + "%," + alpha + ")";
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, TAU);
      ctx.fill();
    }

    for (i = 0; i < sparks.length; i += 1) {
      p = sparks[i];
      ang = p.phase - time * p.speed;
      rr = hole * p.radius;
      px = Math.cos(ang) * rr;
      py = Math.sin(ang) * rr;
      if (p.warm) {
        ctx.fillStyle = "rgba(255," + Math.floor(140 + seeded(i) * 80) + ",80," + (0.45 + Math.sin(time * 4 + i) * 0.2) + ")";
      } else {
        ctx.fillStyle = "rgba(120,220,255," + (0.4 + Math.sin(time * 5 + i) * 0.2) + ")";
      }
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, TAU);
      ctx.fill();
    }

    /* Streamer arcs along disk */
    if (!reduced) {
      for (i = 0; i < streamers.length; i += 1) {
        p = streamers[i];
        ang = p.phase + time * p.speed;
        rr = hole * p.radius;
        ctx.strokeStyle = "hsla(" + ((p.hue + time * 20) % 360) + ",95%,65%," + 0.14 + ")";
        ctx.lineWidth = 1.2 + (3 - p.radius) * 0.8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 0, rr, ang, ang + p.length);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /* Particle spray along each time wave */
  function waveParticles(cx, cy, hole, angle, color, count, length, t, seed0) {
    if (reduced) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < count; i += 1) {
      var u = (i + 0.5) / count;
      var a = angle - length * (1 - u) + Math.sin(t * 0.004 + seed0 + i) * 0.03;
      var r = hole * (1.14 + u * 0.22 + seeded(seed0 + i * 3) * 0.08);
      var x = cx + Math.cos(a) * r;
      var y = cy + Math.sin(a) * r;
      var sz = 0.6 + (1 - u) * 2.2;
      var alpha = 0.15 + (1 - u) * 0.55;
      ctx.fillStyle = color.replace("ALPHA", String(alpha));
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHourTicks(cx, cy, hole, lensTurn) {
    var yScale = 0.55;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < 12; i += 1) {
      var a = (i / 12) * TAU - Math.PI / 2 + lensTurn;
      var major = i % 3 === 0;
      var r0 = hole * 1.78;
      var r1 = hole * (major ? 2.05 : 1.9);
      var x0 = cx + Math.cos(a) * r0;
      var y0 = cy + Math.sin(a) * r0 * yScale;
      var x1 = cx + Math.cos(a) * r1;
      var y1 = cy + Math.sin(a) * r1 * yScale;
      ctx.strokeStyle = major
        ? "rgba(255,220,160,0.55)"
        : "rgba(190,210,255,0.28)";
      ctx.lineWidth = major ? 2 : 1.1;
      ctx.shadowColor = major ? "rgba(255,180,100,0.7)" : "rgba(160,200,255,0.35)";
      ctx.shadowBlur = major ? 8 : 3;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function draw(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H / 2;
    var unit = Math.min(W, H);
    var hole = unit * 0.125;

    /* Deep sky */
    var bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75);
    bg.addColorStop(0, "#2a1450");
    bg.addColorStop(0.14, "#141a48");
    bg.addColorStop(0.36, "#0a0c28");
    bg.addColorStop(0.62, "#050612");
    bg.addColorStop(1, "#010107");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* Multi-color nebulae */
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    var n1 = ctx.createRadialGradient(cx - hole * 2.8, cy - hole * 0.8, 0, cx - hole * 2.8, cy - hole * 0.8, unit * 0.62);
    n1.addColorStop(0, "rgba(255,48,183,0.2)");
    n1.addColorStop(0.4, "rgba(90,70,255,0.1)");
    n1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = n1;
    ctx.fillRect(0, 0, W, H);
    var n2 = ctx.createRadialGradient(cx + hole * 2.4, cy + hole * 1.1, 0, cx + hole * 2.4, cy + hole * 1.1, unit * 0.5);
    n2.addColorStop(0, "rgba(80,220,255,0.12)");
    n2.addColorStop(0.45, "rgba(120,255,160,0.05)");
    n2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = n2;
    ctx.fillRect(0, 0, W, H);
    var n3 = ctx.createRadialGradient(cx + hole * 0.5, cy - hole * 2.2, 0, cx + hole * 0.5, cy - hole * 2.2, unit * 0.4);
    n3.addColorStop(0, "rgba(255,180,80,0.1)");
    n3.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = n3;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    /* Stars with stronger gravitational lensing + color variety */
    stars.slice().sort(function (a, b) { return a.z - b.z; }).forEach(function (star) {
      var p = project(star.x, star.y, star.z);
      var dx = p.x - cx, dy = p.y - cy;
      var d = Math.hypot(dx, dy);
      var angle = Math.atan2(dy, dx);
      /* Stronger radial stretch near the photon sphere */
      var bend = 1 + hole * hole / Math.max(hole * hole * 0.42, d * d) * 0.42;
      var tang = hole * hole / Math.max(hole * hole * 0.9, d * d) * 0.18;
      var x = cx + dx * bend - dy * tang * 0.35;
      var y = cy + dy * bend + dx * tang * 0.35;
      var tw = reduced ? 0.68 : 0.48 + 0.32 * Math.sin(t * 0.0011 + star.x * 4);
      var color;
      if (star.w) color = "255,190,104";
      else if (star.c > 0.85) color = "255,140,200";
      else if (star.c > 0.7) color = "160,255,200";
      else if (star.c > 0.5) color = "170,200,255";
      else color = "156,218,255";

      if (d < hole * 4.2 && d > hole * 0.68) {
        var arc = Math.max(0.022, (hole * 4.2 - d) / (hole * 4.2) * 0.32);
        var lensR = Math.max(hole * 1.06, d * bend);
        ctx.strokeStyle = "rgba(" + color + "," + (tw * 0.82) + ")";
        ctx.lineWidth = Math.max(0.55, star.s * p.s * 0.055);
        ctx.beginPath();
        ctx.arc(cx, cy, lensR, angle - arc, angle + arc);
        ctx.stroke();
        /* Chromatic shear: pink/cyan twins */
        if (d < hole * 2.6) {
          ctx.strokeStyle = "rgba(255,79,200," + (tw * 0.28) + ")";
          ctx.lineWidth = Math.max(0.4, star.s * p.s * 0.035);
          ctx.beginPath();
          ctx.arc(cx, cy, lensR + 1.1, angle - arc * 0.85, angle + arc * 0.85);
          ctx.stroke();
          ctx.strokeStyle = "rgba(121,231,255," + (tw * 0.22) + ")";
          ctx.beginPath();
          ctx.arc(cx, cy, lensR - 1.1, angle - arc * 0.7, angle + arc * 0.7);
          ctx.stroke();
        }
        if (d < hole * 2.4) {
          ctx.strokeStyle = "rgba(255,79,200," + (tw * 0.32) + ")";
          ctx.beginPath();
          ctx.arc(cx, cy, hole * 1.3, angle + Math.PI - arc * 0.85, angle + Math.PI + arc * 0.85);
          ctx.stroke();
          ctx.strokeStyle = "rgba(121,231,255," + (tw * 0.18) + ")";
          ctx.beginPath();
          ctx.arc(cx, cy, hole * 1.42, angle + Math.PI - arc * 0.55, angle + Math.PI + arc * 0.55);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = "rgba(" + color + "," + tw + ")";
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.35, star.s * p.s * 0.055), 0, TAU);
        ctx.fill();
      }
    });

    drawGravitationalLensing(cx, cy, hole, t);

    var tilt = 0.29 + Math.abs(Math.sin(pitch)) * 0.28;
    var rotation = yaw * 0.22;

    /* Colorful accretion filaments */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var band = 0; band < 64; band += 1) {
      var q = band / 63;
      var r = hole * (1.16 + q * 2.2);
      var phase = (reduced ? 0 : t * 0.00012) * (1.3 - q * 0.7) + band * 0.61;
      var hue = (300 + band * 5.5 + Math.sin(yaw + band * 0.1) * 36 + t * 0.01) % 360;
      ctx.strokeStyle = "hsla(" + hue + ",96%," + (52 + q * 22) + "%," + (0.04 + (1 - q) * 0.16) + ")";
      ctx.lineWidth = 1 + (1 - q) * 5.5;
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.scale(1, tilt);
      ctx.beginPath();
      ctx.arc(0, 0, r, phase, phase + 0.7 + seeded(band) * 2.6);
      ctx.stroke();
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    ctx.restore();

    drawDiskParticles(cx, cy, hole, t, tilt, rotation);

    var date = new Date();
    var ms = reduced ? 0 : date.getMilliseconds();
    var secF = date.getSeconds() + ms / 1000;
    var minF = date.getMinutes() + secF / 60;
    var hourF = (date.getHours() % 12) + minF / 60;
    var second = secF / 60 * TAU - Math.PI / 2;
    var minute = minF / 60 * TAU - Math.PI / 2;
    var hour = hourF / 12 * TAU - Math.PI / 2;
    var lensTurn = yaw * 0.12;

    drawHourTicks(cx, cy, hole, lensTurn);

    var hAng = hour + lensTurn;
    var mAng = minute + lensTurn;
    var sAng = second + lensTurn;

    /* Hour & minute first: thick spokes + bright lensed arcs (seconds stay lighter) */
    handSpoke(cx, cy, hole, hAng, "#ffe38a", 1.62, hole * 0.055);
    handSpoke(cx, cy, hole, mAng, "#ff4fc8", 1.72, hole * 0.038);

    lensArc(cx, cy, hole, hAng, "#ffe38a", hole * 0.11, 0.82, 1, 1.15);
    lensArc(cx, cy, hole, mAng, "#ff4fc8", hole * 0.078, 0.62, 0.98, 1.05);
    lensArc(cx, cy, hole, sAng, "#79e7ff", hole * 0.028, 0.3, 0.72, 0.72);

    waveParticles(cx, cy, hole, hAng, "rgba(255,220,120,ALPHA)", 34, 0.82, t, 11);
    waveParticles(cx, cy, hole, mAng, "rgba(255,80,200,ALPHA)", 42, 0.62, t, 29);
    waveParticles(cx, cy, hole, sAng, "rgba(120,230,255,ALPHA)", 40, 0.3, t, 47);

    /* Orbiting beacons — H/M large & bright; second stays compact */
    beacon(cx, cy, hole, hAng, "rgba(255,210,110,0.95)", hole * 0.072, 1.62);
    beacon(cx, cy, hole, mAng, "rgba(255,90,210,0.95)", hole * 0.055, 1.72);
    beacon(cx, cy, hole, sAng, "rgba(120,230,255,0.85)", hole * 0.024, 1.55);

    /* Photon rings */
    ellipse(cx, cy, hole * 1.18, hole * 1.18, 0, "rgba(121,231,255,0.55)", 1.3, 16);
    ellipse(cx, cy, hole * 1.1, hole * 1.1, 0, "rgba(255,79,200,0.48)", 2, 14);
    ellipse(cx, cy, hole * 1.09, hole * (0.45 + tilt * 0.35), rotation, "rgba(255,199,100,0.9)", 2.1, 18);
    ellipse(cx, cy, hole * 1.055, hole * (0.43 + tilt * 0.32), rotation, "rgba(121,231,255,0.75)", 1.1, 10);
    ellipse(cx, cy, hole * 1.28, hole * (0.52 + tilt * 0.3), rotation, "rgba(140,255,160,0.12)", 1, 6);

    /* Event shadow */
    var shadow = ctx.createRadialGradient(cx - hole * 0.2, cy - hole * 0.18, hole * 0.08, cx, cy, hole);
    shadow.addColorStop(0, "#000");
    shadow.addColorStop(0.68, "#000");
    shadow.addColorStop(0.9, "#020108");
    shadow.addColorStop(1, "rgba(0,0,0,0.82)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(cx, cy, hole, 0, TAU);
    ctx.fill();

    /* Chromatic photon rim — thicker lensed edge */
    var photon = ctx.createLinearGradient(cx - hole * 1.3, cy, cx + hole * 1.3, cy);
    photon.addColorStop(0, "#ff4fc8");
    photon.addColorStop(0.25, "#ffb35c");
    photon.addColorStop(0.5, "#79e7ff");
    photon.addColorStop(0.75, "#b7ff72");
    photon.addColorStop(1, "#8d6bff");
    ctx.strokeStyle = photon;
    ctx.shadowColor = "#79e7ff";
    ctx.shadowBlur = 22;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, hole * 1.105, 0, TAU);
    ctx.stroke();
    ctx.shadowBlur = 10;
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(cx, cy, hole * 1.105, 0, TAU);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function frame(t) {
    if (auto) targetYaw += 0.0012;
    yaw += (targetYaw - yaw) * 0.09;
    pitch += (targetPitch - pitch) * 0.09;
    draw(t);
    raf = requestAnimationFrame(frame);
  }

  function startRender() {
    cancelAnimationFrame(raf);
    raf = 0;
    if (!document.hidden && !reduced) raf = requestAnimationFrame(frame);
    else draw(performance.now());
  }

  function updateClock() {
    var now = new Date();
    var stamp = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
    clockStamp = stamp;
    display.textContent = stamp;
    display.dateTime = stamp;
    canvas.setAttribute(
      "aria-label",
      "Event Horizon Orbit. Local time " + stamp +
        ". Gold wave and beacon are the hour, pink the minute, cyan the second, " +
        "all bending around the photon ring. Drag or use arrow keys to orbit."
    );
    var minute = stamp.slice(0, 5);
    if (minute !== lastMinute) {
      lastMinute = minute;
      status.textContent =
        "Local time " + minute +
        ". Gold hour, pink minute, and cyan second waves orbit the event horizon.";
    }
    if (reduced) draw(performance.now());
  }

  canvas.addEventListener("pointerdown", function (e) {
    pointer.down = true;
    pointer.id = e.pointerId;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!pointer.down) return;
    targetYaw += (e.clientX - pointer.x) * 0.007;
    targetPitch = Math.max(-1.05, Math.min(1.05, targetPitch + (e.clientY - pointer.y) * 0.006));
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (reduced) {
      yaw = targetYaw;
      pitch = targetPitch;
      draw(performance.now());
    }
  });
  function release() {
    pointer.down = false;
    if (pointer.id !== null && canvas.hasPointerCapture(pointer.id)) {
      canvas.releasePointerCapture(pointer.id);
    }
    pointer.id = null;
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("keydown", function (e) {
    var used = true;
    if (e.key === "ArrowLeft") targetYaw -= 0.12;
    else if (e.key === "ArrowRight") targetYaw += 0.12;
    else if (e.key === "ArrowUp") targetPitch = Math.max(-1.05, targetPitch - 0.1);
    else if (e.key === "ArrowDown") targetPitch = Math.min(1.05, targetPitch + 0.1);
    else used = false;
    if (used) {
      e.preventDefault();
      if (reduced) {
        yaw = targetYaw;
        pitch = targetPitch;
      }
      draw(performance.now());
    }
  });

  addEventListener("resize", resize);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      updateClock();
      startRender();
    }
  });
  function motionChange(e) {
    reduced = e.matches;
    auto = !reduced;
    startRender();
  }
  if (motion.addEventListener) motion.addEventListener("change", motionChange);
  else motion.addListener(motionChange);

  resize();
  updateClock();
  setInterval(updateClock, 250);
  startRender();
}());
</script>
</body>
</html>



@import url("https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap");
body {
  background: #EEE;
  margin: 0;
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
canvas {
  max-height: 100vh;
  max-width: 100vw;
  height: auto;
  width: auto;
  /*   border: 1px solid silver; */
}

#container {
  box-shadow: 0 0 20px rgba(0,0,0,.05);
  border: 1px solid rgba(0,0,0,.1);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  }
h1 {
  font-family: Rubik;
  font-size: 100px;
  font-weight: 800;
  line-height: 1em;
  position: absolute;
  color: #fff;
}


import {
  lerp,
  getPointsForGridId,
  getEdgeIdsForGridId,
  getPointID,
  hash,
  smoothstep
} from "https://codepen.io/shubniggurath/pen/OPyPdmm.js";

console.clear();

let fullCode = '';

const w = Math.min(400, window.innerWidth - 100), h = Math.min(400, window.innerHeight - 100);

// DPR - Cap at 2 to protect fill-rate on 3x screens; drop the cap for max sharpness.
const dpr = Math.min(window.devicePixelRatio || 1, 2);

const CONFIG = {
  awidth: w,
  aheight: h,
  gridW: Math.min(40, Math.floor(w/10)), // arbitrary something something
  gridH: Math.min(40, Math.floor(w/5)),
  gravity: .2,
  damping: .99,
  iterationsPerFrame: 5,
  compressFactor: .02,
  stretchFactor: 1.1,
  mouseSize: 5000,
  mouseStrength: 4,
  contain: false,
  randomSolve: false,
  preset: ''
};
CONFIG.cellWidth = CONFIG.awidth/(CONFIG.gridW-1)
CONFIG.cellHeight = CONFIG.aheight/(CONFIG.gridH-1);

function sizeCanvas() {
  if (!c) return;
  c.style.width  = window.innerWidth + 'px';
  c.style.height = window.innerHeight + 'px';
  c.width  = Math.round(window.innerWidth  * dpr);
  c.height = Math.round(window.innerHeight * dpr);
}

window.addEventListener('resize', () => {
  if (c && c.width) {
    sizeCanvas();
    CONFIG.awidth  = Math.min(400, window.innerWidth  - 100);
    CONFIG.aheight = Math.min(400, window.innerHeight - 100);
    CONFIG.cellWidth  = CONFIG.awidth  / (CONFIG.gridW - 1);
    CONFIG.cellHeight = CONFIG.aheight / (CONFIG.gridH - 1);
  }
})

let rafID, input, c;
function main() {
  // Tear down any prior run so re-entry doesn't stack raf loops or listeners.
  if (rafID) cancelAnimationFrame(rafID);
  if (input) input.unbind();

  fullCode = main.toString();
  const { awidth: width, aheight: height, gridW, gridH, gravity, damping, iterationsPerFrame, compressFactor, stretchFactor, cellWidth, cellHeight } = CONFIG;

  const charCanvases = {};
  const fontSize = Math.max(12, cellHeight * 1.2); // logical px
  const box = Math.ceil(fontSize * 1.4);           // logical px, glyph cell size
  for (const ch of new Set(fullCode)) {
    if (ch === ' ') continue;
    const off = document.createElement('canvas');
    off.width = off.height = box * dpr;            // device-res backing store
    const octx = off.getContext('2d');
    octx.scale(dpr, dpr);                          // draw everything below in logical px
    octx.font = `bold ${fontSize}px monospace`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = '#333';
    octx.fillText(ch, box / 2, box / 2);           // logical center (no double-dpr)
    off.logicalSize = box;                         // stash for drawImage
    charCanvases[ch] = off;
  }

  c = document.createElement('canvas');
  container.innerHTML = '';
  container.appendChild(c);
  sizeCanvas();
  const ctx = c.getContext('2d');

  const particles = [];
  const constraints = [], verticalConstraints = [], horizontalConstraints = [];
  const pinnedParticles = [];

  input = new Input({ c, particles });

  for(let i=0;i<gridW;i++) {
    for(let j=0;j<gridH;j++) {
      let x = i*cellWidth;   // logical px
      let y = j*cellHeight;  // logical px

      const id = getPointID(j, i, gridH);
      const pinned = j === 0;

      const charIndex = (i + j * gridW) % fullCode.length;
      const char = fullCode[charIndex] || ' ';

      const particle = new Particle({ x, y, pinned, id, char })
      particles.push(particle);
      if(pinned) pinnedParticles.push(particle);
    }
  }

  for(let i=0;i<gridW;i++) {
    for(let j=0;j<gridH;j++) {
      const id = getPointID(j, i, gridH);
      const p = particles[id];

      if(j<gridH-1) {
        const bottomP = particles[getPointID(j+1, i, gridH)];
        const c = new Constraint({p1: p, p2: bottomP, length: cellHeight, id: id+gridW*gridH, compressFactor, stretchFactor});
        constraints.push(c);
        p.downConstraint = c; // Cache the down ref directly on the particle
      }
      // Horizontal constraints, used to give the curtain a cohesive appearance
      if(i<gridW-1) {
        const rightP = particles[getPointID(j, i+1, gridH)];

        const hc = new Constraint({
          p1: p,
          p2: rightP,
          length: cellWidth,
          id: id+gridW*gridH*2,
          compressFactor: 0.6,
          stretchFactor: 4,
          isSpacer: true
        });

        constraints.push(hc);
        horizontalConstraints.push(hc);
      }
    }
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(...p.pos, CONFIG.pointRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  function drawCode() {
    const offsetX = (c.width  / dpr - width)  / 2;      // logical px
    const offsetY = (c.height / dpr - height) / 2 - 30; // logical px

    particles.forEach(p => {
      if (!p.char || p.char === ' ') return;
      const img = charCanvases[p.char];
      if (!img) return;

      let cos = 1, sin = 0;
      const constraint = p.downConstraint;
      if (constraint) {
        const dx = constraint.p2.pos.x - constraint.p1.pos.x;
        const dy = constraint.p2.pos.y - constraint.p1.pos.y;
        const angle = Math.atan2(dy, dx) - Math.PI / 2;
        cos = Math.cos(angle);
        sin = Math.sin(angle);
      }

      const tx = p.pos.x + offsetX;
      const ty = p.pos.y + offsetY;
      // scale(dpr) . translate(tx,ty) . rotate, collapsed into one matrix
      ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, dpr * tx, dpr * ty);

      const half = img.logicalSize / 2;
      // Explicit w/h downscales the hi-res atlas back to logical size.
      ctx.drawImage(img, -half, -half, img.logicalSize, img.logicalSize);
    });

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  let lastDelta = 0;
  function runloop(delta) {
    rafID = requestAnimationFrame(runloop);

    ctx.save();
    ctx.clearRect(0,0,c.width,c.height); // device space; transform is identity here

    particles.forEach(p=>p.update(delta-lastDelta));
    lastDelta = delta;

    if(CONFIG.randomSolve) shuffleArray(constraints)
    for(let i=0;i<iterationsPerFrame;i++) {
      for(let j=0;j<constraints.length;j++) constraints[j].solve();
    }

    if(CONFIG.contain) particles.forEach(p=>p.contain());

    drawCode();

    ctx.restore();
  }
  rafID = requestAnimationFrame(runloop);
}

class Input {
  constructor({ c, particles }) {
    this.c = c, this.particles = particles;
    this.mousePos = new Vec2();
    this.grabRadius = 20; // logical px
    this.grabbed;
    this.bind()
  }
  // Maps a client event into the same logical grid space the particles live in.
  setMouse(e) {
    const rect = this.c.getBoundingClientRect();
    const cssX = e.clientX - rect.left;  // canvas CSS size == logical size
    const cssY = e.clientY - rect.top;
    const offsetX = (this.c.width  / dpr - CONFIG.awidth)  / 2;
    const offsetY = (this.c.height / dpr - CONFIG.aheight) / 2 - 30;
    this.mousePos.x = cssX - offsetX;
    this.mousePos.y = cssY - offsetY;
  }
  pointerdown(e) {
    this.setMouse(e);

    for (const p of this.particles) {
      if (this.mousePos.subtractNew(p.pos).length < this.grabRadius) {
        this.grabbedParticle = p;
        this.grabbedParticle.originalPinnedState = this.grabbedParticle.pinned;
        this.grabbedParticle.pinned = true;
        break;
      }
    }
    if(!this.grabbedParticle) {
      this.pointerIsDown = true
    }
  }
  pointerup(e) {
    if (this.grabbedParticle) {
      this.grabbedParticle.pinned = this.grabbedParticle.originalPinnedState;
      this.grabbedParticle = null;
    }
    clearTimeout(this.pointerUpTimer)
    this.pointerUpTimer = setTimeout(() => {
      this.pointerIsDown = false
    }, 1000)
  }
  pointermove(e) {
    this.setMouse(e);

    if (this.grabbedParticle) {
      this.grabbedParticle.pos.reset(this.mousePos.x, this.mousePos.y);
      this.grabbedParticle.oldPos.reset(this.mousePos.x, this.mousePos.y);
    }
    for (const p of this.particles) {
      const diff = this.mousePos.subtractNew(p.pos);
      const ls = diff.lengthSquared
      if(ls < CONFIG.mouseSize) {
        const a = diff.angle-Math.PI;
        const strength = smoothstep(CONFIG.mouseSize, -2000, ls)*CONFIG.mouseStrength/300;

        const force = new Vec2(Math.cos(a)*strength, Math.sin(a)*strength);
        p.applyForce(force)
      }
    }
  }
  contextmenu(e) {
    e.preventDefault();
  }
  get rect() {
    const rect = this.c.getBoundingClientRect();
    rect.scale = rect.width/this.c.width;
    return rect;
  }
  bind() {
    this.pointerdown=this.pointerdown.bind(this)
    this.pointerup=this.pointerup.bind(this)
    this.pointermove=this.pointermove.bind(this)
    this.contextmenu=this.contextmenu.bind(this)
    document.addEventListener('pointerdown', this.pointerdown)
    document.addEventListener('pointerup', this.pointerup)
    document.addEventListener('pointermove', this.pointermove)
    document.addEventListener('contextmenu', this.contextmenu)
  }
  unbind() {
    document.removeEventListener('pointerdown', this.pointerdown)
    document.removeEventListener('pointerup', this.pointerup)
    document.removeEventListener('pointermove', this.pointermove)
    document.removeEventListener('contextmenu', this.contextmenu)
  }
}

class Vec2 {
  constructor(x=0, y=0) {
    this.reset(x,y)
  }
  zero() {
    this.reset(0,0)
  }
  reset(x=0, y=0) {
    this.x = x;
    this.y = y;
  }
  clone() {
    return new Vec2(this.x, this.y);
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  addNew(v) {
    return this.clone().add(v);
  }
  subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }
  subtractNew(v) {
    return this.clone().subtract(v);
  }
  multiply(v) {
    this.x *= v.x;
    this.y *= v.y;
    return this;
  }
  multiplyNew(v) {
    return this.clone().multiply(v);
  }
  scale(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }
  scaleNew(scalar) {
    return this.clone().scale(scalar);
  }

  get array() {
    return [this.x, this.y];
  }
  get lengthSquared() {
    return this.x**2 + this.y**2;
  }
  get length() {
    return Math.hypot(this.x, this.y);
  }
  get angle() {
    return Math.atan2(this.y, this.x);
  }

  [Symbol.iterator]() {
    let values = this.array;
    let i = 0;
    return {
      next() {
        if(i < values.length) {
          let value = values[i];
          i++;
          return { value, done: false }
        } else return { done: true }
      }
    }
  }
}

class Particle {
  // Added 'char' to the constructor
  constructor({x, y, pinned, id, char}={}) {
    this.pos = new Vec2(x, y);
    this.oldPos = new Vec2(x, y);
    this.velocity = new Vec2()
    this.acceleration = new Vec2();
    this.pinned = pinned;
    this.id = id;
    this.char = char;
    this.gravityVec = new Vec2();
  }
  contain() {
    if(this.pinned) return;
    const radius = 5;

    if (this.pos.x < radius) {
      this.pos.x = radius;
      this.oldPos.x = this.pos.x + Math.abs(this.oldPos.x - this.pos.x) * 0.8;
    } else if (this.pos.x > CONFIG.awidth - radius) {
      this.pos.x = CONFIG.awidth - radius;
      this.oldPos.x = this.pos.x - Math.abs(this.oldPos.x - this.pos.x) * 0.8;
    }
    if (this.pos.y < radius) {
        this.pos.y = radius;
        this.oldPos.y = this.pos.y + Math.abs(this.oldPos.y - this.pos.y) * 0.8;
    } else if (this.pos.y > CONFIG.aheight - radius) {
        this.pos.y = CONFIG.aheight - radius;
        this.oldPos.y = this.pos.y - Math.abs(this.oldPos.y - this.pos.y) * 0.8;
    }
  }
  update(delta) {
    if(this.pinned) {
      this.acceleration.zero();
      return;
    }

    this.velocity.reset(
      (this.pos.x - this.oldPos.x) * CONFIG.damping,
      (this.pos.y - this.oldPos.y) * CONFIG.damping
    );

    this.oldPos.reset(...this.pos);

    const dd = delta**2;
    this.gravityVec.reset(0,CONFIG.gravity/dd)

    this.applyForce(this.gravityVec)

    this.pos.x += this.velocity.x + this.acceleration.x * dd;
    this.pos.y += this.velocity.y + this.acceleration.y * dd;

    this.acceleration.reset();
  }
  applyForce(v) {
    this.acceleration.add(v);
  }
}

class Constraint {
  constructor({p1, p2, length, id, compressFactor, stretchFactor, isSpacer}) {
    this.p1 = p1;
    this.p2 = p2;
    this.length = length;
    this.id=id;
    this.isSpacer = isSpacer;
    this.minLength = length * compressFactor;
    this.maxLength = length * stretchFactor;

    c.addEventListener("update", (e) => {
      this.minLength = this.length * (this.isSpacer ? compressFactor : e.detail.compressFactor);
      this.maxLength = this.length * (this.isSpacer ? stretchFactor : e.detail.stretchFactor);
    })
  }
  solve() {
    // Inline the vector math to avoid thrash
    const dx = this.p2.pos.x - this.p1.pos.x;
    const dy = this.p2.pos.y - this.p1.pos.y;
    const distance = Math.hypot(dx, dy);

    if (distance == 0) return;

    let targetLength = this.length;
    if (distance < this.minLength) targetLength = this.minLength;
    else if (distance > this.maxLength) targetLength = this.maxLength;
    else return;

    const difference = targetLength - distance;
    const percent = difference / distance / 2;

    const offsetX = dx * percent;
    const offsetY = dy * percent;

    if (!this.p1.pinned) {
      this.p1.pos.x -= offsetX;
      this.p1.pos.y -= offsetY;
    }
    if (!this.p2.pinned) {
      this.p2.pos.x += offsetX;
      this.p2.pos.y += offsetY;
    }
  }
}

setTimeout(() => main(), 500);


<script type="importmap">
	{
		"imports": {
			"three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.module.js",
				"jsm/": "https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/"
		}
	}
</script>
<canvas class="webgl"></canvas>
<div class="scanlines"></div>

<!-- Custom cursor -->
<div id="cursor"></div>
<div id="cursor-ring"></div>

<!-- Nav -->
<nav>
	<span class="nav-logo">DD-2026 / ARTIFACT</span>
	<div class="nav-status">
		<div class="dot-live"></div>
		REALTIME · WEBGL
	</div>
</nav>

<!-- Sidebar progress -->
<div class="sidebar">
	<div class="sidebar-item active" data-idx="0">
		<span class="sidebar-label">Hero</span>
		<div class="sidebar-tick"></div>
	</div>
	<div class="sidebar-item" data-idx="1">
		<span class="sidebar-label">Architecture</span>
		<div class="sidebar-tick"></div>
	</div>
	<div class="sidebar-item" data-idx="2">
		<span class="sidebar-label">Interaction</span>
		<div class="sidebar-tick"></div>
	</div>
</div>

<!-- HUD decorations -->
<div class="hud-corner hud-tl">
	<svg width="40" height="40" fill="none">
		<path d="M40 1H1v39" stroke="rgba(255,77,0,0.3)" stroke-width="1" />
	</svg>
</div>
<div
		 class="hud-corner hud-br"
		 style="
						display: flex;
						flex-direction: column;
						align-items: flex-end;
						gap: 0.5rem;
						"
		 >
	<div class="hud-readout" id="hud-readout" style="text-align: right">
		X: +0.000<br />
		Y: +0.000<br />
		Z: +7.000
	</div>
	<svg width="40" height="40" fill="none" style="transform: rotate(180deg)">
		<path d="M40 1H1v39" stroke="rgba(255,77,0,0.3)" stroke-width="1" />
	</svg>
</div>

<!-- Content -->
<div class="content">
	<section id="section-1">
		<div class="hero-top">
			<h1 class="hero-title">
				The future<br />is <span class="accent">fracture.</span>
			</h1>
			<div class="hero-meta">
				<span class="tag">Generative 3D · 2026</span>
				<span class="desc"
							>Procedural stone shell.<br />Wireframe core.<br />Touch to break
					open.</span
					>
			</div>
		</div>

		<div class="hover-hint">↑ hover the surface to interact ↑</div>

		<div class="hero-bottom">
			<div class="hero-cta">
				<span class="cta-label">Scroll to explore</span>
				<div class="cta-arrow">
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path
									d="M8 2v12M3 9l5 5 5-5"
									stroke="currentColor"
									stroke-width="1.3"
									stroke-linecap="round"
									/>
					</svg>
				</div>
			</div>
			<div class="hero-coords" id="hero-coords">
				φ 000.00° · θ 000.00°<br />
				FRAGMENTS: 2500+ · CELLS: 50×50
			</div>
		</div>
	</section>

	<div class="rule"></div>

	<section id="section-2" class="split-section">
		<div class="empty-col"></div>
		<div class="text-col">
			<div class="sec-num">02 / 03</div>
			<p class="sec-tag">// Architecture</p>
			<h2 class="sec-h2">Two layers.<br />One truth.</h2>
			<p class="sec-body">
				Hundreds of independent Voronoi fragments form the stone shell —
				each a real mesh with PBR material. Beneath it, a barycentric GLSL
				shader traces every triangle edge in fire.
			</p>
			<div class="stats">
				<div>
					<div class="stat-n">2500+</div>
					<div class="stat-l">Fragments</div>
				</div>
				<div>
					<div class="stat-n">60fps</div>
					<div class="stat-l">Realtime</div>
				</div>
				<div>
					<div class="stat-n">0</div>
					<div class="stat-l">Assets</div>
				</div>
			</div>
		</div>
	</section>

	<div class="rule"></div>

	<section id="section-3" class="split-section">
		<div class="text-col border-right">
			<div class="sec-num">03 / 03</div>
			<p class="sec-tag">// Interaction</p>
			<h2 class="sec-h2">Touch it.<br />Break it open.</h2>
			<p class="sec-body">
				Move your cursor across the surface. Each fragment responds
				independently — lifting away on a random hinge axis, exposing the
				luminous wireframe within.
			</p>
			<ul class="feat-list">
				<li>Voronoi decomposition · GLSL + JS</li>
				<li>Barycentric wireframe · UnrealBloom</li>
				<li>PBR stone · normal + roughness maps</li>
				<li>GSAP ScrollTrigger · spring animation</li>
			</ul>
		</div>
		<div class="empty-col"></div>
	</section>
</div>

<script type="module">
	

	const lenis = new Lenis({
		duration: 2.0,
		easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
	});
	lenis.on("scroll", ScrollTrigger.update);
	gsap.ticker.add((time) => {
		lenis.raf(time * 1000);
	});
	gsap.ticker.lagSmoothing(0);

	// Custom cursor
	const cur = document.getElementById("cursor");
	const ring = document.getElementById("cursor-ring");
	let mx = 0, my = 0, rx = 0, ry = 0;
	window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
	(function loopCursor() {
		rx += (mx - rx) * 0.12;
		ry += (my - ry) * 0.12;
		cur.style.left = mx + "px";
		cur.style.top = my + "px";
		ring.style.left = rx + "px";
		ring.style.top = ry + "px";
		requestAnimationFrame(loopCursor);
	})();

	// HUD readout
	window.addEventListener("mousemove", (e) => {
		const x = ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3);
		const y = (-(e.clientY / window.innerHeight) * 2 + 1).toFixed(3);
		document.getElementById("hud-readout").innerHTML =
			`X: ${x > 0 ? "+" : ""}${x}<br>Y: ${y > 0 ? "+" : ""}${y}<br>Z: +7.000`;
		const phi = ((e.clientX / window.innerWidth) * 360).toFixed(2).padStart(6, "0");
		const theta = ((e.clientY / window.innerHeight) * 180).toFixed(2).padStart(6, "0");
		const coords = document.getElementById("hero-coords");
		if (coords) coords.textContent = `φ ${phi}° · θ ${theta}°\nFRAGMENTS: 2500+ · CELLS: 50×50`;
	});

	// Entrance animations
	gsap.to(".nav-status", { opacity: 1, duration: 1, delay: 1.5 });
	gsap.to(".hud-corner", { opacity: 1, duration: 1, delay: 1.2, stagger: 0.2 });
	gsap.to(".sidebar-label", { opacity: 1, x: 0, duration: 0.6, delay: 1.4, stagger: 0.1 });

	gsap.timeline({ delay: 0.4 })
		.to(".hero-title", { opacity: 1, y: 0, duration: 1.0, ease: "power3.out" })
		.to(".hero-meta", { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, "-=0.5")
		.to(".hero-cta", { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.4")
		.to(".hero-coords", { opacity: 1, duration: 0.5 }, "-=0.3")
		.to(".hover-hint", { opacity: 1, duration: 0.8, ease: "power2.out" }, "-=0.2");

	// Section reveals
	gsap.timeline({ scrollTrigger: { trigger: "#section-2", start: "top 65%" } })
		.to("#section-2 .sec-num", { opacity: 1, duration: 0.4 })
		.to("#section-2 .sec-tag", { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.1")
		.to("#section-2 .sec-h2", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.2")
		.to("#section-2 .sec-body", { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.3")
		.to("#section-2 .stats", { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.2");

	gsap.timeline({ scrollTrigger: { trigger: "#section-3", start: "top 65%" } })
		.to("#section-3 .sec-num", { opacity: 1, duration: 0.4 })
		.to("#section-3 .sec-tag", { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.1")
		.to("#section-3 .sec-h2", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.2")
		.to("#section-3 .sec-body", { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.3")
		.to("#section-3 .feat-list", { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.2");

	// Sidebar active state
	const items = document.querySelectorAll(".sidebar-item");
	["#section-1", "#section-2", "#section-3"].forEach((id, i) => {
		ScrollTrigger.create({
			trigger: id, start: "top center", end: "bottom center",
			onToggle: (self) => {
				if (self.isActive) {
					items.forEach((it) => it.classList.remove("active"));
					items[i].classList.add("active");
				}
			},
		});
	});

	// Hide HUD when leaving hero
	ScrollTrigger.create({
		trigger: "#section-2",
		start: "top 85%",
		onEnter: () => {
			gsap.to(".hover-hint", { opacity: 0, duration: 0.4 });
			gsap.to(".hud-corner, #hud-readout, .hero-coords", { opacity: 0, duration: 0.4 });
			gsap.to(".sidebar", { opacity: 0, duration: 0.4 });
		},
		onLeaveBack: () => {
			gsap.to(".hover-hint", { opacity: 1, duration: 0.4 });
			gsap.to(".hud-corner, #hud-readout, .hero-coords", { opacity: 1, duration: 0.4 });
			gsap.to(".sidebar", { opacity: 1, duration: 0.4 });
		},
	});
</script>


*,
*::before,
*::after {
	box-sizing: border-box;
	margin: 0;
	padding: 0;
}

:root {
	--orange: #ff4d00;
	--orange2: #ff8c00;
	--white: #eee8de;
	--dim: rgba(238, 232, 222, 0.35);
	--bg: #050505;
	--mono: "Courier New", Courier, monospace;
}

html {
	scroll-behavior: auto;
}

body {
	background: var(--bg);
	color: var(--white);
	font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
	overflow-x: hidden;
	cursor: none;
}

/* ── Custom cursor ─────────────────────────────────────────── */
#cursor {
	position: fixed;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: var(--orange);
	pointer-events: none;
	z-index: 9999;
	transform: translate(-50%, -50%);
	transition:
		width 0.2s,
		height 0.2s,
		opacity 0.2s;
	mix-blend-mode: screen;
}
#cursor-ring {
	position: fixed;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	border: 1px solid rgba(255, 77, 0, 0.5);
	pointer-events: none;
	z-index: 9998;
	transform: translate(-50%, -50%);
	transition:
		transform 0.12s ease-out,
		width 0.3s,
		height 0.3s,
		border-color 0.3s;
}
body:has(.webgl:hover) #cursor-ring {
	width: 60px;
	height: 60px;
	border-color: var(--orange);
}

/* ── Fixed canvas ─────────────────────────────────────────── */
.webgl {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 0;
}

/* ── Nav ──────────────────────────────────────────────────── */
nav {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 1.8rem 3rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.nav-logo {
	font-family: var(--mono);
	font-size: 0.7rem;
	letter-spacing: 0.3em;
	color: var(--white);
	opacity: 0.5;
}

.nav-status {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	font-family: var(--mono);
	font-size: 0.65rem;
	letter-spacing: 0.15em;
	color: var(--orange);
	opacity: 0;
}
.nav-status .dot-live {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--orange);
	animation: blink 1.4s ease-in-out infinite;
}
@keyframes blink {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.2;
	}
}

/* ── Progress sidebar ─────────────────────────────────────── */
.sidebar {
	position: fixed;
	left: 3rem;
	top: 50%;
	transform: translateY(-50%);
	z-index: 100;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	align-items: flex-start;
}

.sidebar-item {
	display: flex;
	align-items: center;
	gap: 0.8rem;
	cursor: pointer;
}

.sidebar-tick {
	width: 20px;
	height: 1px;
	background: rgba(255, 255, 255, 0.15);
	transition:
		width 0.4s,
		background 0.4s;
}

.sidebar-label {
	font-family: var(--mono);
	font-size: 0.58rem;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: rgba(255, 255, 255, 0.2);
	transition: color 0.4s;
	opacity: 0;
}

.sidebar-item.active .sidebar-label {
	color: var(--orange);
}
.sidebar-item.active .sidebar-tick {
	width: 32px;
	background: var(--orange);
}

/* ── Corner HUD decorations ───────────────────────────────── */
.hud-corner {
	position: fixed;
	z-index: 100;
	pointer-events: none;
	opacity: 0;
}
.hud-corner svg {
	display: block;
}

.hud-tl {
	top: 5rem;
	left: 3rem;
}
.hud-br {
	bottom: 2.5rem;
	right: 3rem;
}

.hud-readout {
	font-family: var(--mono);
	font-size: 0.6rem;
	letter-spacing: 0.12em;
	color: rgba(255, 255, 255, 0.2);
	line-height: 1.8;
}

/* ── Scrollable content ───────────────────────────────────── */
.content {
	position: relative;
	z-index: 10;
	pointer-events: none;
}

/* ── SECTION 1 — Hero: full screen, donut dead center ─────── */
#section-1 {
	min-height: 100vh;
	margin-bottom: 70vh;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 6rem 3rem 3rem;
	position: relative;
}

.hero-top {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 4vh;
}

.hero-title {
	font-size: clamp(3rem, 7vw, 7.5rem);
	font-weight: 800;
	line-height: 0.92;
	letter-spacing: -0.02em;
	opacity: 0;
	transform: translateY(30px);
	text-align: center;
	text-transform: uppercase;
}

.hero-title .accent {
	color: var(--orange);
}

.hero-meta {
	text-align: center;
	opacity: 0;
	transform: translateY(20px);
	margin-top: 2rem;
}

.hero-meta .tag {
	font-family: var(--mono);
	font-size: 0.62rem;
	letter-spacing: 0.4em;
	text-transform: uppercase;
	color: var(--orange);
	display: block;
	margin-bottom: 0.8rem;
}

.hero-meta .desc {
	font-size: 0.82rem;
	color: var(--dim);
	max-width: 40ch;
	line-height: 1.6;
	margin: 0 auto;
}

.hero-bottom {
	display: flex;
	justify-content: center;
	align-items: flex-end;
	position: relative;
	width: 100%;
}

.hero-cta {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 1.5rem;
	opacity: 0;
	transform: translateY(20px);
	pointer-events: all;
	cursor: none;
}

.cta-label {
	font-family: var(--mono);
	font-size: 0.68rem;
	letter-spacing: 0.3em;
	text-transform: uppercase;
	color: var(--dim);
}

.cta-arrow {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	border: 1px solid rgba(255, 255, 255, 0.12);
	display: flex;
	align-items: center;
	justify-content: center;
	transition:
		border-color 0.3s,
		background 0.3s;
	animation: float 2.5s ease-in-out infinite;
}
@keyframes float {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-6px);
	}
}
.cta-arrow:hover {
	border-color: var(--orange);
	background: rgba(255, 77, 0, 0.08);
}

.hero-coords {
	position: absolute;
	bottom: 0;
	right: 0;
	font-family: var(--mono);
	font-size: 0.6rem;
	letter-spacing: 0.12em;
	color: rgba(255, 255, 255, 0.15);
	text-align: right;
	opacity: 0;
	line-height: 1.8;
}

/* Hover instruction — center bottom */
.hover-hint {
	position: absolute;
	bottom: 15rem;
	left: 50%;
	transform: translateX(-50%);
	font-family: var(--mono);
	font-size: 0.6rem;
	letter-spacing: 0.25em;
	text-transform: uppercase;
	color: rgba(255, 255, 255, 0.2);
	white-space: nowrap;
	opacity: 0;
}

/* ── SECTIONS 2 & 3 — 50/50 layout ───────────────────────── */
.split-section {
	min-height: 100vh;
	margin-bottom: 70vh;
	display: grid;
	grid-template-columns: 1fr 1fr;
	position: relative;
}
#section-3 {
	margin-bottom: 10vh;
}

.empty-col {
	min-height: 100vh;
}

.text-col {
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: clamp(4rem, 8vh, 7rem) clamp(3rem, 5vw, 6rem);
	border-left: 1px solid rgba(255, 255, 255, 0.04);
	position: relative;
}

.text-col.border-right {
	border-left: none;
	border-right: 1px solid rgba(255, 255, 255, 0.04);
}

/* Section number */
.sec-num {
	font-family: var(--mono);
	font-size: 0.6rem;
	letter-spacing: 0.2em;
	color: rgba(255, 255, 255, 0.12);
	margin-bottom: 3rem;
	opacity: 0;
}

.sec-tag {
	font-family: var(--mono);
	font-size: 0.65rem;
	letter-spacing: 0.25em;
	text-transform: uppercase;
	color: var(--orange);
	margin-bottom: 1.5rem;
	opacity: 0;
	transform: translateY(15px);
}

.sec-h2 {
	font-size: clamp(2.2rem, 4vw, 3.8rem);
	font-weight: 700;
	line-height: 1;
	letter-spacing: -0.03em;
	margin-bottom: 1.8rem;
	opacity: 0;
	transform: translateY(25px);
}

.sec-body {
	font-size: 0.88rem;
	line-height: 1.8;
	color: var(--dim);
	max-width: 36ch;
	margin-bottom: 2.5rem;
	opacity: 0;
	transform: translateY(15px);
}

/* Stat grid */
.stats {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 1.5rem 0;
	border-top: 1px solid rgba(255, 255, 255, 0.06);
	padding-top: 2rem;
	opacity: 0;
	transform: translateY(15px);
}

.stat-n {
	font-size: 2rem;
	font-weight: 800;
	color: var(--orange);
	line-height: 1;
}

.stat-l {
	font-family: var(--mono);
	font-size: 0.58rem;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: rgba(255, 255, 255, 0.25);
	margin-top: 0.4rem;
}

/* Feature list */
.feat-list {
	list-style: none;
	display: flex;
	flex-direction: column;
	border-top: 1px solid rgba(255, 255, 255, 0.06);
	opacity: 0;
	transform: translateY(15px);
}

.feat-list li {
	display: flex;
	align-items: center;
	gap: 1rem;
	font-family: var(--mono);
	font-size: 0.72rem;
	letter-spacing: 0.05em;
	color: var(--dim);
	padding: 1rem 0;
	border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.feat-list li::before {
	content: "→";
	color: var(--orange);
	font-size: 0.7rem;
	flex-shrink: 0;
}

/* ── Scan line overlay ────────────────────────────────────── */
.scanlines {
	position: fixed;
	inset: 0;
	background: repeating-linear-gradient(
		to bottom,
		transparent 0px,
		transparent 3px,
		rgba(0, 0, 0, 0.08) 3px,
		rgba(0, 0, 0, 0.08) 4px
	);
	pointer-events: none;
	z-index: 5;
	opacity: 0.4;
}

/* ── Thin divider ─────────────────────────────────────────── */
.rule {
	width: 100%;
	height: 1px;
	background: rgba(255, 255, 255, 0.04);
	pointer-events: none;
}

import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { GUI } from "jsm/libs/lil-gui.module.min.js";
import { EffectComposer } from "jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "jsm/shaders/FXAAShader.js";

gsap.registerPlugin(ScrollTrigger);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080808);

const scrollGroup = new THREE.Group();
scene.add(scrollGroup);

const torusGroup = new THREE.Group();
scrollGroup.add(torusGroup);

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 7;

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector(".webgl"), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.7, 0.4, 0.65,
);
composer.addPass(bloomPass);

const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.uniforms["resolution"].value.set(1 / window.innerWidth, 1 / window.innerHeight);
composer.addPass(fxaaPass);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enabled = false;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const dirLight = new THREE.DirectionalLight(0xfff4e0, 2.8);
dirLight.position.set(3, 4, 5);
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0xaabbff, 0.5);
fillLight.position.set(-4, -2, -3);
scene.add(fillLight);

// Textures
const textureLoader = new THREE.TextureLoader();
const diffuse = textureLoader.load("https://raw.githubusercontent.com/danielyl123/person/refs/heads/main/diffuse.jpg");
const normalTex = textureLoader.load("https://raw.githubusercontent.com/danielyl123/person/refs/heads/main/normal.jpg");
const arm = textureLoader.load("https://raw.githubusercontent.com/danielyl123/person/refs/heads/main/arm.jpg");

[diffuse, normalTex, arm].forEach((tex) => {
  tex.repeat.set(2, 2);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
});
diffuse.colorSpace = THREE.SRGBColorSpace;

// Wireframe inner torus (barycentric shader)
function addBarycentricCoords(geo) {
  const g = geo.toNonIndexed();
  const count = g.attributes.position.count;
  const bary = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 3) {
    bary[i * 3] = 1; bary[i * 3 + 1] = 0; bary[i * 3 + 2] = 0;
    bary[(i + 1) * 3] = 0; bary[(i + 1) * 3 + 1] = 1; bary[(i + 1) * 3 + 2] = 0;
    bary[(i + 2) * 3] = 0; bary[(i + 2) * 3 + 1] = 0; bary[(i + 2) * 3 + 2] = 1;
  }
  g.setAttribute("barycentric", new THREE.BufferAttribute(bary, 3));
  return g;
}

const wireMaterial = new THREE.ShaderMaterial({
  vertexShader: /* glsl */ `
    attribute vec3 barycentric;
    varying vec3 vBary;
    void main() {
      vBary = barycentric;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vBary;
    float wireMask(vec3 b, float t) {
      vec3 d = fwidth(b);
      vec3 a = smoothstep(vec3(0.0), d * t, b);
      return 1.0 - min(a.x, min(a.y, a.z));
    }
    void main() {
      float wf = wireMask(vBary, 1.6);
      vec3 col = mix(vec3(0.07, 0.01, 0.0), vec3(1.0, 0.28, 0.04), wf);
      col = mix(col, vec3(1.0, 0.8, 0.3) * 2.2, wf * 0.55);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.DoubleSide,
  extensions: { derivatives: true },
});
torusGroup.add(new THREE.Mesh(
  addBarycentricCoords(new THREE.TorusGeometry(2, 0.4, 80, 80)),
  wireMaterial,
));

// Voronoi fragment meshes
const FRAG_SCALE = 50;
const TORUS_R = 2, TORUS_r = 0.4;

function hash2(px, py) {
  const a = Math.sin(px * 127.1 + py * 311.7) * 43758.5453;
  const b = Math.sin(px * 269.5 + py * 183.3) * 43758.5453;
  return [a - Math.floor(a), b - Math.floor(b)];
}

function cellSeed(u, v) {
  const n = [Math.floor(u * FRAG_SCALE), Math.floor(v * FRAG_SCALE)];
  const f = [u * FRAG_SCALE - n[0], v * FRAG_SCALE - n[1]];
  let md = Infinity, best = [...n];
  for (let j = -2; j <= 2; j++) {
    for (let i = -2; i <= 2; i++) {
      const o = hash2(n[0] + i, n[1] + j);
      const r = [i + o[0] - f[0], j + o[1] - f[1]];
      const d = r[0] * r[0] + r[1] * r[1];
      if (d < md) { md = d; best = [n[0] + i + o[0], n[1] + j + o[1]]; }
    }
  }
  return [best[0] / FRAG_SCALE, best[1] / FRAG_SCALE];
}

const fragments = (() => {
  const baseGeo = new THREE.TorusGeometry(TORUS_R, TORUS_r, 100, 100);
  const nonIndexed = baseGeo.toNonIndexed();
  baseGeo.dispose();
  const pos = nonIndexed.attributes.position.array;
  const nrm = nonIndexed.attributes.normal.array;
  const uvData = nonIndexed.attributes.uv.array;
  const tris = pos.length / 9;

  const cellMap = new Map();
  for (let t = 0; t < tris; t++) {
    const uc = (uvData[t * 6] + uvData[t * 6 + 2] + uvData[t * 6 + 4]) / 3;
    const vc = (uvData[t * 6 + 1] + uvData[t * 6 + 3] + uvData[t * 6 + 5]) / 3;
    const s = cellSeed(uc, vc);
    const k = `${s[0].toFixed(9)}_${s[1].toFixed(9)}`;
    if (!cellMap.has(k)) cellMap.set(k, { s, t: [] });
    cellMap.get(k).t.push(t);
  }

  const mat = new THREE.MeshStandardMaterial({
    map: diffuse, normalMap: normalTex, roughnessMap: arm,
    roughness: 1.0, metalness: 0.0, side: THREE.DoubleSide,
  });

  const list = [];
  const TWO_PI = Math.PI * 2;

  for (const { s: seed, t: triList } of cellMap.values()) {
    if (!triList.length) continue;
    const vc = triList.length * 3;
    const pArr = new Float32Array(vc * 3), nArr = new Float32Array(vc * 3), uvArr = new Float32Array(vc * 2);
    let vi = 0;
    for (const tri of triList) {
      for (let v = 0; v < 3; v++) {
        const sv = tri * 3 + v;
        pArr[vi * 3] = pos[sv * 3]; pArr[vi * 3 + 1] = pos[sv * 3 + 1]; pArr[vi * 3 + 2] = pos[sv * 3 + 2];
        nArr[vi * 3] = nrm[sv * 3]; nArr[vi * 3 + 1] = nrm[sv * 3 + 1]; nArr[vi * 3 + 2] = nrm[sv * 3 + 2];
        uvArr[vi * 2] = uvData[sv * 2]; uvArr[vi * 2 + 1] = uvData[sv * 2 + 1];
        vi++;
      }
    }

    const phi = seed[0] * TWO_PI, theta = seed[1] * TWO_PI;
    const cx = (TORUS_R + TORUS_r * Math.cos(theta)) * Math.cos(phi);
    const cy = (TORUS_R + TORUS_r * Math.cos(theta)) * Math.sin(phi);
    const cz = TORUS_r * Math.sin(theta);
    const cellCenter = new THREE.Vector3(cx, cy, cz);
    const majorPt = new THREE.Vector3(TORUS_R * Math.cos(phi), TORUS_R * Math.sin(phi), 0);
    const cellNormal = cellCenter.clone().sub(majorPt).normalize();

    const SHRINK = 0.96;
    for (let i = 0; i < pArr.length; i += 3) {
      pArr[i] = (pArr[i] - cx) * SHRINK;
      pArr[i + 1] = (pArr[i + 1] - cy) * SHRINK;
      pArr[i + 2] = (pArr[i + 2] - cz) * SHRINK;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pArr, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(nArr, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvArr, 2));

    const rnd = hash2(seed[0] * 137.53, seed[1] * 137.53);
    const up = Math.abs(cellNormal.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    const tang = new THREE.Vector3().crossVectors(cellNormal, up).normalize();
    const bitang = new THREE.Vector3().crossVectors(cellNormal, tang);
    const aa = rnd[0] * TWO_PI;
    const rotAxis = tang.clone().multiplyScalar(Math.cos(aa)).addScaledVector(bitang, Math.sin(aa)).normalize();

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(cellCenter).addScaledVector(cellNormal, 0.015);
    mesh.userData = { cellCenter, cellNormal, rotAxis, maxAngle: 0.7 + rnd[1] * 0.9, lift: 0 };
    torusGroup.add(mesh);
    list.push(mesh);
  }

  nonIndexed.dispose();
  return list;
})();

// Invisible raycaster mesh
const rcMesh = new THREE.Mesh(
  new THREE.TorusGeometry(TORUS_R, TORUS_r, 80, 80),
  new THREE.MeshBasicMaterial({ visible: false }),
);
torusGroup.add(rcMesh);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-999, -999);
window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// GUI
const gui = new GUI({ title: "Digital Donut" });

const bloomFolder = gui.addFolder("Bloom");
bloomFolder.add(bloomPass, "strength", 0, 3, 0.01);
bloomFolder.add(bloomPass, "radius", 0, 1, 0.01);
bloomFolder.add(bloomPass, "threshold", 0, 1, 0.01);

const lightsFolder = gui.addFolder("Lights");
lightsFolder.add(scene.children.find(c => c.isAmbientLight), "intensity", 0, 2, 0.01).name("ambient");
lightsFolder.add(dirLight, "intensity", 0, 6, 0.1).name("key light");
lightsFolder.add(fillLight, "intensity", 0, 3, 0.1).name("fill light");

const fragParams = { hoverRadius: 0.75, liftDist: 0.28, liftSpeedUp: 0.15, liftSpeedDown: 0.06 };
const fragFolder = gui.addFolder("Fragments");
fragFolder.add(fragParams, "hoverRadius", 0.2, 1.5, 0.01).name("hover radius");
fragFolder.add(fragParams, "liftDist", 0, 1, 0.01).name("lift distance");
fragFolder.add(fragParams, "liftSpeedUp", 0.01, 0.5, 0.01).name("speed up");
fragFolder.add(fragParams, "liftSpeedDown", 0.01, 0.3, 0.01).name("speed down");

gui.addFolder("Renderer").add(renderer, "toneMappingExposure", 0, 3, 0.01).name("exposure");
gui.close();

// Tick
const clock = new THREE.Clock();
let lastTime = 0;
const hover = { point: new THREE.Vector3(), active: 0 };
const _localHover = new THREE.Vector3();

function smoothstep(min, max, v) {
  const t = Math.max(0, Math.min(1, (v - min) / (max - min)));
  return t * t * (3 - 2 * t);
}

const tick = () => {
  const elapsed = clock.getElapsedTime();
  const delta = elapsed - lastTime;
  lastTime = elapsed;

  controls.update();

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(rcMesh);
  if (hits.length > 0) {
    torusGroup.worldToLocal(_localHover.copy(hits[0].point));
    hover.point.copy(_localHover);
    hover.active = Math.min(hover.active + delta * 5, 1);
  } else {
    hover.active = Math.max(hover.active - delta * 2.5, 0);
  }

  for (const frag of fragments) {
    const { cellCenter, cellNormal, rotAxis, maxAngle } = frag.userData;
    let target = 0;
    if (hover.active > 0.01) {
      const dist = cellCenter.distanceTo(hover.point);
      target = (1 - smoothstep(0.4, fragParams.hoverRadius, dist)) * hover.active;
    }
    const speed = target > frag.userData.lift ? fragParams.liftSpeedUp : fragParams.liftSpeedDown;
    frag.userData.lift = THREE.MathUtils.lerp(frag.userData.lift, target, speed);
    const lift = frag.userData.lift;
    frag.position.copy(cellCenter).addScaledVector(cellNormal, 0.015 + lift * fragParams.liftDist);
    frag.quaternion.setFromAxisAngle(rotAxis, lift * maxAngle);
  }

  composer.render();
  requestAnimationFrame(tick);
};
tick();

// GSAP scroll animations
gsap.set(scrollGroup.position, { x: 0, y: 0, z: 0 });
gsap.set(scrollGroup.rotation, { x: 0.15, y: 0, z: 0 });
gsap.from(scrollGroup.rotation, { y: Math.PI, duration: 2.4, ease: "power3.out" });
gsap.from(scrollGroup.position, { y: -2, duration: 2.4, ease: "power3.out" });

const idleTween = gsap.to(torusGroup.rotation, {
  y: Math.PI * 2, duration: 22, ease: "none", repeat: -1, paused: true,
});
gsap.delayedCall(2.5, () => idleTween.play());

const scrollTl = gsap.timeline({
  scrollTrigger: {
    trigger: "body",
    start: "top top",
    end: "bottom bottom",
    scrub: 4.0,
    onUpdate: self => {
      if (self.progress > 0.02) idleTween.pause();
      else idleTween.resume();
    },
  },
});

scrollTl
  .to(scrollGroup.position, { x: -2.3, y: 0, z: 0, duration: 1, ease: "power1.inOut" }, 0)
  .to(scrollGroup.rotation, { x: Math.PI * 0.5, y: -Math.PI * 0.6, z: Math.PI * 0.25, duration: 1, ease: "power1.inOut" }, 0)
  .to(scrollGroup.position, { x: 2.3, y: 0, z: 0, duration: 1, ease: "power1.inOut" }, 1)
  .to(scrollGroup.rotation, { x: -Math.PI * 0.5, y: Math.PI * 0.6, z: -Math.PI * 0.25, duration: 1, ease: "power1.inOut" }, 1);

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
  fxaaPass.uniforms["resolution"].value.set(1 / window.innerWidth, 1 / window.innerHeight);
});



<div id="app"></div>
  <div class="info">drag to interact &middot; click to spawn</div>
  <script type="module" src="main.js"></script>

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html,
    body {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    body {
      background: #0a0a12;
      font-family: 'Space Grotesk', sans-serif;
    }

    #app {
      width: 100%;
      height: 100%;
      position: relative;
    }

    canvas {
      display: block;
    }

    .info {
      position: fixed;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      font: 12px/1.4 'Space Grotesk', sans-serif;
      color: rgba(255, 255, 255, 0.25);
      pointer-events: none;
      text-align: center;
      user-select: none;
      letter-spacing: 0.04em;
    }


    import * as THREE from "https://unpkg.com/three@0.160.1/build/three.module.js";

/* ================================================================
   Liquid Glass  –  metaball refraction over typography
   ================================================================ */

/* ── Constants ──────────────────────────────────────────── */
const MAX_DROPLETS = 40;
const FIXED_DT_MS = 8;
const MAX_FRAME_DT_MS = 100;
const MAX_CATCHUP = 6;

/* ── Renderer ───────────────────────────────────────────── */
const app = document.getElementById("app");
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

/* ── Background typography texture ──────────────────────── */
const bgCanvas = document.createElement("canvas");
const bgCtx = bgCanvas.getContext("2d");
const bgTexture = new THREE.CanvasTexture(bgCanvas);
bgTexture.minFilter = THREE.LinearFilter;
bgTexture.magFilter = THREE.LinearFilter;

function drawBackground() {
  const w = renderer.domElement.width;
  const h = renderer.domElement.height;
  bgCanvas.width = w;
  bgCanvas.height = h;

  /* gradient background */
  const grd = bgCtx.createLinearGradient(0, 0, w * 0.6, h);
  grd.addColorStop(0, "#e8dbc8");
  grd.addColorStop(0.35, "#5b8cdb");
  grd.addColorStop(0.6, "#2d6fd4");
  grd.addColorStop(1, "#1a3fa0");
  bgCtx.fillStyle = grd;
  bgCtx.fillRect(0, 0, w, h);

  /* decorative colour waves */
  bgCtx.save();
  bgCtx.globalAlpha = 0.35;
  for (let i = 0; i < 5; i++) {
    const cx = w * (0.2 + i * 0.18);
    const cy = h * (0.3 + Math.sin(i * 1.3) * 0.25);
    const rg = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.35);
    const hue = 200 + i * 25;
    rg.addColorStop(0, `hsla(${hue}, 80%, 65%, 0.6)`);
    rg.addColorStop(1, `hsla(${hue}, 60%, 40%, 0)`);
    bgCtx.fillStyle = rg;
    bgCtx.fillRect(0, 0, w, h);
  }
  bgCtx.restore();

  /* main title */
  bgCtx.fillStyle = "#ffffff";
  bgCtx.textAlign = "center";
  bgCtx.textBaseline = "middle";

  const titleSize = Math.round(w * 0.13);
  bgCtx.font = `700 ${titleSize}px 'Space Grotesk', sans-serif`;
  bgCtx.fillText("Liquid", w * 0.5, h * 0.38);
  bgCtx.fillText("Glass", w * 0.5, h * 0.38 + titleSize * 1.05);

  /* subtitle */
  const subSize = Math.round(w * 0.022);
  bgCtx.font = `500 ${subSize}px 'Space Grotesk', sans-serif`;
  bgCtx.globalAlpha = 0.55;
  bgCtx.fillText(
    "Metaball Refraction Demo",
    w * 0.5,
    h * 0.38 + titleSize * 2.3,
  );
  bgCtx.globalAlpha = 1;

  /* scattered small text */
  const words = [
    "physics",
    "refraction",
    "merge",
    "split",
    "surface tension",
    "metaball",
    "IOR",
    "glass",
    "droplet",
  ];
  bgCtx.globalAlpha = 0.08;
  const scatterSize = Math.round(w * 0.018);
  bgCtx.font = `500 ${scatterSize}px 'Space Grotesk', sans-serif`;
  for (let i = 0; i < words.length; i++) {
    bgCtx.fillText(
      words[i],
      w * (0.12 + (i % 4) * 0.25),
      h * (0.08 + Math.floor(i / 4) * 0.35 + (i % 3) * 0.12),
    );
  }
  bgCtx.globalAlpha = 1;

  bgTexture.needsUpdate = true;
}

/* wait for font to load, then draw */
document.fonts.ready.then(() => {
  drawBackground();
});
drawBackground();

/* ── Droplet data (main + ghost trailing blobs) ─────────── */
const MAX_ENTRIES = MAX_DROPLETS * 2;
const dropletBuf = new Float32Array(MAX_ENTRIES * 4);
const dropletTex = new THREE.DataTexture(
  dropletBuf,
  MAX_ENTRIES,
  1,
  THREE.RGBAFormat,
  THREE.FloatType,
);
dropletTex.minFilter = THREE.NearestFilter;
dropletTex.magFilter = THREE.NearestFilter;
dropletTex.needsUpdate = true;

let drops = [];
let uid = 0;

function spawn(x, y, r, vx = 0, vy = 0) {
  if (drops.length >= MAX_DROPLETS) return null;
  const area = Math.PI * r * r;
  const angle = Math.random() * Math.PI * 2;
  const spd = 0.0003 + Math.random() * 0.0008;
  const d = {
    id: uid++,
    x,
    y,
    r,
    area,
    vx: vx || Math.cos(angle) * spd,
    vy: vy || Math.sin(angle) * spd,
    alive: true,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderSpeed: 0.3 + Math.random() * 0.5,
    /* soft-body state */
    softPrevX: x,
    softPrevY: y,
    softOffX: 0,
    softOffY: 0,
    softVelX: 0,
    softVelY: 0,
  };
  drops.push(d);
  return d;
}

/* seed */
for (let i = 0; i < 12; i++) {
  spawn(
    (Math.random() - 0.5) * 0.7,
    (Math.random() - 0.5) * 0.5,
    0.03 + Math.random() * 0.05,
  );
}

/* ── Liquid Glass shader ────────────────────────────────── */
const vertSrc = /* glsl */ `void main(){ gl_Position = vec4(position, 1.0); }`;

const fragSrc = /* glsl */ `
precision highp float;
#define MAX_N ${MAX_ENTRIES}

uniform vec2      uRes;
uniform sampler2D uData;
uniform sampler2D uBg;
uniform int       uCount;
uniform float     uTime;

void main(){
  vec2  uv  = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2  p   = (uv - 0.5) * vec2(asp, 1.0);

  /* ── Accumulate metaball field + lens displacement ── */
  float field = 0.0;
  vec2  grad  = vec2(0.0);
  vec2  lens  = vec2(0.0);   /* weighted pull toward blob centres */
  float lensW = 0.0;

  for(int i = 0; i < MAX_N; i++){
    if(i >= uCount) break;
    vec4  d = texture2D(uData, vec2((float(i)+0.5)/float(MAX_N), 0.5));
    vec2  c = d.xy;
    float r = d.z;
    if(r < 0.001) continue;
    vec2  delta = p - c;
    float dSq   = dot(delta, delta) + 1e-5;
    float contrib = r * r / dSq;
    field += contrib;
    grad  += -2.0 * contrib / dSq * delta;

    /* lens weight: smooth falloff from centre, no singularity */
    float w = r * r / (dSq + r * r);
    lens += (c - p) * w;
    lensW += w;
  }

  /* normalise lens displacement */
  lens /= (lensW + 0.001);
  float lensLen = length(lens);

  float thr  = 1.0;
  float edge = smoothstep(thr - 0.08, thr + 0.03, field);

  /* ── Lens-based refraction (no centre fold) ── */
  float refractStrength = 0.035;
  float mappedLens = atan(lensLen * 6.0) * refractStrength;
  vec2  refractDir = (lensLen > 1e-5) ? lens / lensLen : vec2(0.0);
  /* scale refraction by edge mask with wide soft ramp */
  float refractMask = smoothstep(thr - 0.2, thr + 1.5, field);
  vec2  refractedUV = clamp(uv + refractDir * mappedLens * refractMask, 0.001, 0.999);

  /* sample background */
  vec3  bgClean = texture2D(uBg, uv).rgb;

  /* ── Glass normal from gradient (atan-compressed) ── */
  float gradLen = length(grad);
  float nScale = atan(gradLen * 0.5) * 0.3;
  vec2  nGrad  = (gradLen > 1e-4) ? (grad / gradLen) * nScale : vec2(0.0);
  vec3  N = normalize(vec3(-nGrad, 1.0));
  vec3  L = normalize(vec3(0.3, 0.6, 1.0));
  vec3  V = vec3(0.0, 0.0, 1.0);
  vec3  H = normalize(L + V);
  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, H), 0.0), 180.0);

  /* Fresnel (Schlick) */
  float cosTheta = max(dot(N, V), 0.0);
  float fresnel  = 0.04 + 0.96 * pow(1.0 - cosTheta, 4.0);

  /* rim highlight at boundary */
  float rim = smoothstep(thr + 0.6, thr, field) * edge;

  /* subtle chromatic aberration */
  float caStr = 0.0018 * edge;
  vec3 bgCA;
  bgCA.r = texture2D(uBg, refractedUV + vec2(caStr, caStr * 0.5)).r;
  bgCA.g = texture2D(uBg, refractedUV).g;
  bgCA.b = texture2D(uBg, refractedUV - vec2(caStr, caStr * 0.5)).b;

  /* depth tint */
  float depth = smoothstep(thr, thr + 3.0, field);
  vec3  tint  = mix(vec3(1.0), vec3(0.93, 0.96, 1.0), depth * 0.45);

  /* compose glass */
  vec3 glassColor = bgCA * tint * (0.92 + 0.08 * diff)
                  + vec3(1.0) * spec * 0.85
                  + vec3(0.9, 0.95, 1.0) * rim * 0.22
                  + vec3(1.0) * fresnel * 0.10;

  /* soft shadow */
  float shadowField = smoothstep(thr - 0.35, thr - 0.05, field);
  vec3 bg = bgClean * (1.0 - shadowField * 0.06);

  /* thin white border */
  float borderOuter = smoothstep(thr - 0.10, thr - 0.01, field);
  float borderInner = smoothstep(thr + 0.0, thr + 0.06, field);
  float border = borderOuter * (1.0 - borderInner) * 0.28;

  vec3  col = mix(bg, glassColor, edge);
  col += vec3(1.0) * border;

  gl_FragColor = vec4(col, 1.0);
}
`;

const mat = new THREE.ShaderMaterial({
  vertexShader: vertSrc,
  fragmentShader: fragSrc,
  uniforms: {
    uRes: {
      value: new THREE.Vector2(
        renderer.domElement.width,
        renderer.domElement.height,
      ),
    },
    uData: { value: dropletTex },
    uBg: { value: bgTexture },
    uCount: { value: 0 },
    uTime: { value: 0 },
  },
});
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

/* ── Input ──────────────────────────────────────────────── */
let aspect = innerWidth / innerHeight;
const mouse = { x: 999, y: 999, active: false, down: false };
let spawnCD = 0;

renderer.domElement.addEventListener("pointermove", (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * aspect;
  mouse.y = 0.5 - (e.clientY - rect.top) / rect.height;
  mouse.active = true;
});
renderer.domElement.addEventListener("pointerdown", () => {
  mouse.down = true;
});
renderer.domElement.addEventListener("pointerup", () => {
  mouse.down = false;
});
renderer.domElement.addEventListener("pointerleave", () => {
  mouse.active = false;
  mouse.down = false;
});

window.addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  aspect = innerWidth / innerHeight;
  mat.uniforms.uRes.value.set(
    renderer.domElement.width,
    renderer.domElement.height,
  );
  drawBackground();
});

/* ── Physics parameters ─────────────────────────────────── */
const DAMP = 0.993;
const MOUSE_R = 0.18;
const MOUSE_F = 0.004;
const TENSION_RANGE = 0.12;
const TENSION_F = 0.0004;
const MERGE_RATIO = 0.62;
const SPLIT_SPEED = 0.013;
const SPLIT_MIN_R = 0.04;
const MAX_SPEED = 0.015;
const BOUNCE = 0.4;
const WANDER_F = 0.00004;
const CENTER_PULL = 0.000008;

/* ── Forces (no gravity, random wander) ─────────────────── */
function applyForces(time) {
  for (const d of drops) {
    /* random wander */
    d.wanderAngle += (Math.random() - 0.5) * d.wanderSpeed;
    d.vx += Math.cos(d.wanderAngle) * WANDER_F;
    d.vy += Math.sin(d.wanderAngle) * WANDER_F;

    /* gentle pull toward center to keep them in view */
    d.vx -= d.x * CENTER_PULL;
    d.vy -= d.y * CENTER_PULL;

    /* mouse repulsion */
    if (mouse.active) {
      const dx = d.x - mouse.x;
      const dy = d.y - mouse.y;
      const dSq = dx * dx + dy * dy;
      const rr = MOUSE_R + d.r;
      if (dSq < rr * rr && dSq > 1e-5) {
        const dist = Math.sqrt(dSq);
        const s = 1 - dist / rr;
        const f = s * s * MOUSE_F;
        d.vx += (dx / dist) * f;
        d.vy += (dy / dist) * f;
      }
    }
  }

  /* pairwise surface tension */
  for (let i = 0; i < drops.length; i++) {
    const a = drops[i];
    for (let j = i + 1; j < drops.length; j++) {
      const b = drops[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dSq = dx * dx + dy * dy;
      const rng = TENSION_RANGE + a.r + b.r;
      if (dSq < rng * rng && dSq > 1e-5) {
        const dist = Math.sqrt(dSq);
        const s = 1 - dist / rng;
        const f = s * TENSION_F;
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }
  }
}

/* ── Integration + wall constraints ─────────────────────── */
function integrate() {
  for (const d of drops) {
    const sp = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
    if (sp > MAX_SPEED) {
      const s = MAX_SPEED / sp;
      d.vx *= s;
      d.vy *= s;
    }
    d.x += d.vx;
    d.y += d.vy;
    d.vx *= DAMP;
    d.vy *= DAMP;

    const wx = aspect * 0.5;
    const wy = 0.5;
    if (d.x - d.r < -wx) {
      d.x = -wx + d.r;
      d.vx = Math.abs(d.vx) * BOUNCE;
    }
    if (d.x + d.r > wx) {
      d.x = wx - d.r;
      d.vx = -Math.abs(d.vx) * BOUNCE;
    }
    if (d.y - d.r < -wy) {
      d.y = -wy + d.r;
      d.vy = Math.abs(d.vy) * BOUNCE;
    }
    if (d.y + d.r > wy) {
      d.y = wy - d.r;
      d.vy = -Math.abs(d.vy) * BOUNCE;
    }
  }
}

/* ── Merge (area-conserving) ────────────────────────────── */
function mergeDroplets() {
  for (let i = 0; i < drops.length; i++) {
    const a = drops[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < drops.length; j++) {
      const b = drops[j];
      if (!b.alive) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < (a.r + b.r) * MERGE_RATIO) {
        const na = a.area + b.area;
        a.x = (a.x * a.area + b.x * b.area) / na;
        a.y = (a.y * a.area + b.y * b.area) / na;
        a.vx = (a.vx * a.area + b.vx * b.area) / na;
        a.vy = (a.vy * a.area + b.vy * b.area) / na;
        a.r = Math.sqrt(na / Math.PI);
        a.area = na;
        b.alive = false;
      }
    }
  }
  drops = drops.filter((d) => d.alive);
}

/* ── Split (momentum-driven) ────────────────────────────── */
function splitDroplets() {
  const add = [];
  for (const d of drops) {
    if (d.r < SPLIT_MIN_R) continue;
    const sp = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
    if (sp < SPLIT_SPEED) continue;

    const ha = d.area * 0.5;
    const nr = Math.sqrt(ha / Math.PI);
    const nx = -d.vy / sp;
    const ny = d.vx / sp;
    const off = nr * 0.7;

    d.r = nr;
    d.area = ha;
    d.x -= nx * off;
    d.y -= ny * off;

    add.push({
      id: uid++,
      x: d.x + nx * off * 2,
      y: d.y + ny * off * 2,
      r: nr,
      area: ha,
      vx: d.vx + nx * sp * 0.35,
      vy: d.vy + ny * sp * 0.35,
      alive: true,
      wanderAngle: Math.random() * Math.PI * 2,
      wanderSpeed: 0.3 + Math.random() * 0.5,
      softPrevX: d.x + nx * off * 2,
      softPrevY: d.y + ny * off * 2,
      softOffX: 0,
      softOffY: 0,
      softVelX: 0,
      softVelY: 0,
    });
  }
  for (const a of add) if (drops.length < MAX_DROPLETS) drops.push(a);
}

/* ── Auto-spawn (random position, no top bias) ──────────── */
let autoTimer = 0;
function autoSpawn() {
  autoTimer += FIXED_DT_MS;
  if (autoTimer > 2000 && drops.length < 10) {
    autoTimer = 0;
    spawn(
      (Math.random() - 0.5) * aspect * 0.6,
      (Math.random() - 0.5) * 0.6,
      0.025 + Math.random() * 0.03,
    );
  }
}

/* ── Click / drag spawn ─────────────────────────────────── */
function mouseSpawn() {
  if (!mouse.down || !mouse.active) return;
  spawnCD -= FIXED_DT_MS;
  if (spawnCD <= 0 && drops.length < MAX_DROPLETS) {
    spawnCD = 120;
    spawn(
      mouse.x + (Math.random() - 0.5) * 0.02,
      mouse.y + (Math.random() - 0.5) * 0.02,
      0.02 + Math.random() * 0.015,
    );
  }
}

/* ── Soft-body spring follow (like physics-demo) ────────── */
const SOFT_STIFFNESS = 0.22;
const SOFT_DAMPING = 0.6;

function updateSoftBodies() {
  for (const d of drops) {
    const dx = d.x - d.softPrevX;
    const dy = d.y - d.softPrevY;

    d.softVelX += (dx - d.softOffX) * SOFT_STIFFNESS;
    d.softVelY += (dy - d.softOffY) * SOFT_STIFFNESS;
    d.softVelX *= SOFT_DAMPING;
    d.softVelY *= SOFT_DAMPING;
    d.softOffX += d.softVelX;
    d.softOffY += d.softVelY;

    d.softPrevX = d.x;
    d.softPrevY = d.y;
  }
}

/* ── Fixed step ─────────────────────────────────────────── */
let simTime = 0;
function fixedUpdate() {
  simTime += FIXED_DT_MS;
  applyForces(simTime);
  integrate();
  mergeDroplets();
  splitDroplets();
  updateSoftBodies();
  autoSpawn();
  mouseSpawn();
}

/* ── Sync texture for shader (main + ghost trailing blobs) ── */
function sync() {
  dropletBuf.fill(0);
  const n = Math.min(drops.length, MAX_DROPLETS);
  for (let i = 0; i < n; i++) {
    const d = drops[i];
    /* main blob */
    dropletBuf[i * 4] = d.x;
    dropletBuf[i * 4 + 1] = d.y;
    dropletBuf[i * 4 + 2] = d.r;
    dropletBuf[i * 4 + 3] = 1;

    /* ghost trailing blob: positioned behind by softOffset,
       smaller radius → creates a teardrop tail via metaball merge */
    const ghostScale = 0.7;
    const trailStr = 3.5;
    const gi = (n + i) * 4;
    dropletBuf[gi] = d.x - d.softOffX * trailStr;
    dropletBuf[gi + 1] = d.y - d.softOffY * trailStr;
    dropletBuf[gi + 2] = d.r * ghostScale;
    dropletBuf[gi + 3] = 1;
  }
  dropletTex.needsUpdate = true;
  mat.uniforms.uCount.value = n * 2;
}

/* ── Main loop ──────────────────────────────────────────── */
let last = performance.now();
let acc = 0;
let paused = false;

document.addEventListener("visibilitychange", () => {
  paused = document.hidden;
  if (!paused) last = performance.now();
});

(function loop() {
  if (paused) {
    requestAnimationFrame(loop);
    return;
  }
  const now = performance.now();
  const dt = Math.min(now - last, MAX_FRAME_DT_MS);
  last = now;
  acc += dt;

  let g = 0;
  while (acc >= FIXED_DT_MS && g < MAX_CATCHUP) {
    fixedUpdate();
    acc -= FIXED_DT_MS;
    g++;
  }
  if (g >= MAX_CATCHUP) acc = 0;

  mat.uniforms.uTime.value = now * 0.001;
  sync();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
})();

this is best:

<canvas id="c"></canvas>
	<h1>Pi visualisation</h1>
	<p>This diagram represents the first 1500 digits of pi. The digits are represented as a path traced by links between successive digits.</p>
	<p>Each digit is assigned a segment around the circle. The "14" in "3.14..." is drawn as a link between <span class="segment1">segment 1</span> and <span class="segment4">segment 4</span>.</p>
	<p>The position of the link on a digit's segment is associated with the position of pi. For example, the "14" link associated with the 2nd digit (1) and the 3rd digit (4) is drawn from position 2 on <span class="segment1">segment 1</span> to position 3 on <span class="segment4">segment 4</span>.</p>

    css

    *{
  padding:0;
  margin:0;
}
body{
  background:black;
  color:white;
  font-family: monospace;
}
h1{
  padding:20px;
}
p{
  font-size:120%;
  margin-left:60px;
  padding:5px;
  margin-bottom:10px;
}
canvas{
  /*position:fixed;
  right:0; top:0;*/
  float:right;
}
.segment0{color:black; background:#663d2c}
.segment1{color:black; background:#ea905d}
.segment2{color:black; background:#5f2787}
.segment3{color:black; background:#d55ce0}
.segment4{color:black; background:#1b8477}
.segment5{color:black; background:#3cfff1}
.segment6{color:black; background:#1f58a2}
.segment7{color:black; background:#1e97ff}
.segment8{color:black; background:#4a633d}
.segment9{color:black; background:#a5da76}

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame   ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    function( callback ){
    window.setTimeout(callback, 1000 / 60);
  };
})();
var canvas=document.getElementById("c")
var ctx=canvas.getContext("2d");
var W=window.innerWidth;
var H=window.innerHeight;

var PI="31415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632788659361533818279682303019520353018529689957736225994138912497217752834791315155748572424541506959508295331168617278558890750983817546374649393192550604009277016711390098488240128583616035637076601047101819429555961989467678374494482553797747268471040475346462080466842590694912933136770289891521047521620569660240580381501935112533824300355876402474964732639141992726042699227967823547816360093417216412199245863150302861829745557067498385054945885869269956909272107975093029553211653449872027559602364806654991198818347977535663698074265425278625518184175746728909777727938000816470600161452491921732172147723501414419735685481613611573525521334757418494684385233239073941433345477624168625189835694855620992192221842725502542568876717904946016534668049886272327917860857843838279679766814541009538837863609506800642251252051173929848960841284886269456042419652850222106611863067442786220391949450471237137869609563643719172874677646575739624138908658326459958133904780275900"

var digitsToDisplay=PI.substring(0, 1500)


var colors=[
  "#663d2c",
  "#ea905d",
  "#5f2787",
  "#d55ce0",
  "#1b8477",
  "#3cfff1",
  "#1f58a2",
  "#1e97ff",
  "#4a633d",
  "#a5da76"
];

var rotationOffset=-2.5 // in numbers

/* PARTS*/
var marginBetweenParts=2 // in deg
var paddingCanvas=60 // in px
var heightParts=12 // in px

/* TEXT*/
var textOffset=30 // in px

/* CONNECT*/
var lineWidth=.3 // in px



;(function(){
  var min=Math.min(W,H);
  W=min;
  H=min;
})()

canvas.width=W
canvas.height=H

ctx.globalCompositeOperation = "lighter";
ctx.font = "normal 25px monospace";


function deg(d){ // to rad
  return d * (Math.PI/180);
}


function drawBackground(){
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.fillStyle = "rgba(0, 0, 0, 1)";
  ctx.fill();
}

function drawSegments(){

  function text(n){
    var newN=n+rotationOffset
    var length=H/2-paddingCanvas+textOffset
    var angle=deg(36*newN+marginBetweenParts+18)
    var x=polar(angle, length).x
    var y=polar(angle, length).y
      x+=W/2
      y+=H/2
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(n, x, y);
  }

  function drawSegment(n, color){
    var n=n+rotationOffset
    var angle1=deg(36*n+marginBetweenParts)
    var angle2=deg(36*(n+1)-marginBetweenParts)
    var radius=H/2-paddingCanvas
    ctx.strokeStyle="#FFFFFF"
    ctx.fillStyle=color
    ctx.lineWidth=1
    ctx.beginPath();
    ctx.arc(W/2, H/2, radius, angle1, angle2, false); // final argument is antiClockwise
    ctx.arc(W/2, H/2, radius-heightParts, angle2, angle1, true);
    ctx.arc(W/2, H/2, radius, angle1, angle1, false); // to beginpoint
    ctx.stroke();
    ctx.fill();
  }
  for (var i = 0; i < 10; i++) {
    drawSegment(i, colors[i])
    text(i)
  };
}

function polar(angle, length){ // to cart
  var x=length*Math.cos(angle)
  var y=length*Math.sin(angle)
  return {x:x, y:y}
}

function toCoord(n, iterationOffset){ // get coordinate 
  var n=n+rotationOffset
  var length=H/2-paddingCanvas-heightParts-2-5
  var angle=deg(36*n+marginBetweenParts)
  if(iterationOffset){angle+=deg(iterationOffset*(36-2*marginBetweenParts)/digitsToDisplay.length)}
  var x=polar(angle, length).x
  var y=polar(angle, length).y
    x+=W/2
    y+=H/2
  return {x:x, y:y, angle:angle, length:length}
}

function connect(from, to, iteration){	// conect digits		

  var coordFrom=toCoord(from, iteration)
  var coordTo=toCoord(to, iteration)

  var diffAngle=(coordTo.angle - coordFrom.angle + Math.PI*2) % (Math.PI*2)
  var quadraticControl=polar(coordFrom.angle+(diffAngle)/2,0.05*W)

  ctx.strokeStyle = colors[from];
  ctx.lineWidth=lineWidth;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(coordFrom.x, coordFrom.y);			

  ctx.quadraticCurveTo(quadraticControl.x+W/2, quadraticControl.y+H/2, coordTo.x, coordTo.y);
  ctx.stroke();
}

function drawDigits(number){
  var i=0
  function draw(){
    connect(parseFloat(number[i]), parseFloat(number[i+1]), i)
    if(i < number.length-2){
      i+=1
      requestAnimFrame(draw)
    }
  }
  draw()
}

drawBackground()
drawSegments()
drawDigits(digitsToDisplay)