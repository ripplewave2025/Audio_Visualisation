# Kit: three.proton

**Upstream:** `vendor/three.proton` (MIT)  
**Ready lib:** `viz-kits/ready/lib/three.proton.min.js`  
**Textures:** `viz-kits/ready/textures/dot.png`, `snow.png`

## Idea
Full emitter stack: Rate → Position/Velocity → Behaviours (Gravity, Attraction, Collision…) → Mesh/Sprite/Points render.

## Automate next mode
1. Serve lib from `frontend/public/vendor/three.proton.min.js`.
2. Copy pattern from `vendor/three.proton/example/spriterender-g.html`.
3. Drive `emitter.rate` and Gravity from audio sample each frame.
4. Keep Instagram canvas as Three.js renderer target.
