// DJ Caat — Phonk Hyper-Fluid Fractal Instagram Visualizer
// Multi-agent build pipeline: architecture → scaffold → parallel modules → integrate → verify → ship.
//
// Args:
//   root  (string, optional)  Project root. Default: "."
//   mode  (string, optional)  "full" | "scaffold" | "verify". Default: "full"
//   brand (string, optional)  Brand name shown in UI/README. Default: "DJ Caat"
//
// Product intent (user + Gemini brief, merged):
//   - Instagram-ready Phonk / Drift Phonk music visualizer
//   - Upload + transport control for audio AND video
//   - Image overlays (album art, logos, stills)
//   - Timeline-style A/V editing control (trim, opacity, blend, volume, seek)
//   - Python DSP (Librosa/NumPy): 808, pitch/cowbell, hi-hat transients, BPM
//   - Three.js + GLSL raymarching: 4D Mandelbulb SDF + GPU fluid mist
//   - Modular "FL Studio plugin" parameter bus (FFT, sidechain, fold, FOV, warp)
//   - Export frames/video for Instagram aspect ratios (9:16, 1:1, 16:9)

let meta = #{
    name: "dj-caat-phonk-visualizer",
    description: "Build DJ Caat Instagram Phonk visualizer: Python DSP, Three.js/GLSL 4D fractal, media timeline, parameter bus",
    when_to_use: "Scaffold or fully implement the Phonk Hyper-Fluid Fractal music visualizer with audio/video/image control and Instagram export",
    phases: [
        #{ title: "Architect", detail: "system design, module contracts, Instagram export targets" },
        #{ title: "Scaffold", detail: "repo layout, deps, configs, entrypoints" },
        #{ title: "Implement", detail: "parallel DSP, GLSL, Three.js, media timeline, control bus" },
        #{ title: "Integrate", detail: "wire parameter bus, timeline, export, polish UI" },
        #{ title: "Verify", detail: "adversarial requirement checks against the product brief" },
        #{ title: "Ship", detail: "README, runbook, and structured build report" },
    ],
};

// ── Schemas ──────────────────────────────────────────────────────────────────

let design_schema = #{
    "type": "object",
    "required": ["summary", "modules", "file_map"],
    "properties": #{
        "summary": #{ "type": "string" },
        "modules": #{
            "type": "array",
            "maxItems": 12,
            "items": #{
                "type": "object",
                "required": ["id", "role", "paths"],
                "properties": #{
                    "id": #{ "type": "string" },
                    "role": #{ "type": "string" },
                    "paths": #{ "type": "array", "items": #{ "type": "string" } },
                },
            },
        },
        "file_map": #{ "type": "array", "items": #{ "type": "string" }, "maxItems": 80 },
        "design_path": #{ "type": "string" },
    },
};

let scaffold_schema = #{
    "type": "object",
    "required": ["ok", "created"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "created": #{ "type": "array", "items": #{ "type": "string" }, "maxItems": 100 },
        "notes": #{ "type": "string" },
    },
};

let module_schema = #{
    "type": "object",
    "required": ["module", "ok", "files"],
    "properties": #{
        "module": #{ "type": "string" },
        "ok": #{ "type": "boolean" },
        "files": #{ "type": "array", "items": #{ "type": "string" }, "maxItems": 40 },
        "notes": #{ "type": "string" },
    },
};

let integrate_schema = #{
    "type": "object",
    "required": ["ok", "summary", "entrypoints"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "summary": #{ "type": "string" },
        "entrypoints": #{ "type": "array", "items": #{ "type": "string" }, "maxItems": 20 },
        "gaps": #{ "type": "array", "items": #{ "type": "string" }, "maxItems": 20 },
    },
};

let verdict_schema = #{
    "type": "object",
    "required": ["check_id", "passed", "reason", "evidence"],
    "properties": #{
        "check_id": #{ "type": "string" },
        "passed": #{ "type": "boolean" },
        "reason": #{ "type": "string" },
        "evidence": #{ "type": "string" },
        "fix_hint": #{ "type": "string" },
    },
};

// ── Args ─────────────────────────────────────────────────────────────────────

let root = ".";
let mode = "full";
let brand = "DJ Caat";

if args != () {
    if args.root != () {
        root = args.root;
        // trim in place then use
        if type_of(root) == "string" {
            root.trim();
        }
        if root == "" { root = "."; }
    }
    if args.mode != () {
        mode = args.mode;
        if type_of(mode) == "string" {
            mode.trim();
        }
        if mode == "" { mode = "full"; }
    }
    if args.brand != () {
        brand = args.brand;
        if type_of(brand) == "string" {
            brand.trim();
        }
        if brand == "" { brand = "DJ Caat"; }
    }
}

log("dj-caat-phonk-visualizer root=" + root + " mode=" + mode + " brand=" + brand);

// Shared product brief injected into every implementer (self-contained — no parent context).
let product_brief = "";
product_brief += "PRODUCT: Instagram music visualizer for brand \"" + brand + "\" — Phonk / Drift Phonk aesthetic.\n";
product_brief += "STACK: Python backend (Librosa/NumPy/SciPy + lightweight FastAPI or Flask) + Vite/Three.js frontend + raw GLSL.\n";
product_brief += "VISUAL: \"Phonk Hyper-Fluid Fractal\" — audio-reactive 4D Mandelbulb (SDF raymarching) inside a GPU fluid void.\n";
product_brief += "DSP MAPS:\n";
product_brief += "  - 808 sub-bass 20-60Hz → fractal fold/space bend + screen shake + RGB chromatic aberration\n";
product_brief += "  - Cowbell/melody pitch 400-2000Hz → HSL palette shift + bloom/emission\n";
product_brief += "  - Hi-hat/transients high-freq → Navier-Stokes fluid velocity forces (neon mist bursts)\n";
product_brief += "  - BPM/tempo → kinematic u_time phase + camera groove (pull on 1/4, zoom off-beat)\n";
product_brief += "CONTROLS (FL Studio-plugin style modular params):\n";
product_brief += "  - FFT smoothing time-constants + band crossovers\n";
product_brief += "  - Sidechain ducking depth (kick shrinks visuals)\n";
product_brief += "  - Fractal folding formula switch (sin/square/etc.)\n";
product_brief += "  - Camera FOV + non-Euclidean warp strength\n";
product_brief += "MEDIA (critical user requirement beyond pure visualizer):\n";
product_brief += "  - Upload audio → play/pause/seek/volume/trim + live analysis uniforms\n";
product_brief += "  - Upload video → layer under/over fractal, opacity, blend mode, trim, mute, speed\n";
product_brief += "  - Upload images/pictures → overlays (logo, cover art), position/scale/opacity/keyframes\n";
product_brief += "  - Timeline UI for multi-track A/V control (Three.js/WebGL-friendly compositing)\n";
product_brief += "  - Instagram export presets: 9:16 (Reels), 1:1, 16:9; MediaRecorder or frame dump path\n";
product_brief += "QUALITY: production-grade code, deep comments on math (raymarch DE, pitch, BPM phase).\n";
product_brief += "PROJECT ROOT: " + root + "\n";

// ── Mode: verify-only short path ─────────────────────────────────────────────

if mode == "verify" {
    phase("Verify");
    log("verify-only: scanning existing tree under " + root);
    let vjobs = [];
    let checks = [
        "dsp-808-pitch-bpm",
        "glsl-mandelbulb-fluid",
        "threejs-wrapper",
        "media-audio-video-images",
        "parameter-bus",
        "instagram-export",
    ];
    for c in checks {
        let vp = "";
        vp += "You are an adversarial verifier for the " + brand + " Phonk music visualizer.\n";
        vp += "PROJECT ROOT: " + root + "\n";
        vp += "CHECK ID: " + c + "\n";
        vp += "Use list_dir, grep, and read_file on the REAL codebase under the project root. Do not invent files.\n";
        vp += "Set passed=true ONLY with concrete evidence (file paths + short quotes of what you read).\n";
        vp += "Otherwise passed=false with a clear reason and fix_hint.\n";
        vp += "Check meanings:\n";
        vp += "  dsp-808-pitch-bpm — Python Librosa pipeline extracts 808 band, pitch, hi-hat transients, BPM; exposes JSON/API/stream to frontend.\n";
        vp += "  glsl-mandelbulb-fluid — fragment shader with raymarching SDF Mandelbulb, fold modifiers, fluid/mist contribution, audio uniforms.\n";
        vp += "  threejs-wrapper — Three.js full-screen quad/render loop, uniform updates from audio, bloom/post FX hooks.\n";
        vp += "  media-audio-video-images — upload UI + transport for audio AND video AND image overlays; timeline or equivalent layer control.\n";
        vp += "  parameter-bus — modular control object (FFT smooth, crossovers, sidechain, fold formula, FOV, warp).\n";
        vp += "  instagram-export — aspect ratio presets and capture/export path for Reels-friendly output.\n";
        vp += "Return JSON matching the schema: check_id, passed, reason, evidence, optional fix_hint.\n";
        vjobs.push(#{
            prompt: vp,
            label: "verify:" + c,
            capability_mode: "read-only",
            output_schema: verdict_schema,
        });
    }
    let verdicts = parallel(vjobs);
    let passed_n = 0;
    let failed = [];
    let i = 0;
    for v in verdicts {
        if v != () && v.success && v.output != () {
            if v.output.passed == true && v.output.evidence != () && v.output.evidence != "" {
                passed_n += 1;
            } else {
                let cid = checks[i];
                if v.output.check_id != () { cid = v.output.check_id; }
                failed.push(#{ check_id: cid, reason: v.output.reason, fix_hint: v.output.fix_hint });
            }
        } else {
            failed.push(#{ check_id: checks[i], reason: "verifier failed or returned unusable output", fix_hint: "re-run verify" });
        }
        i += 1;
    }
    let report = "# Verify report — " + brand + " Phonk Visualizer\n\n";
    report += "Passed " + passed_n.to_string() + "/" + checks.len().to_string() + " checks.\n\n";
    if failed.len() > 0 {
        report += "## Failed\n";
        for f in failed {
            report += "- **" + f.check_id + "**: ";
            if f.reason != () { report += f.reason; }
            report += "\n";
            if f.fix_hint != () && f.fix_hint != "" {
                report += "  - fix: " + f.fix_hint + "\n";
            }
        }
    }
    let path = write_scratch_file("verify-report.md", report);
    complete(#{
        summary: "verify " + passed_n.to_string() + "/" + checks.len().to_string() + " passed",
        path: path,
        passed: passed_n,
        total: checks.len(),
        failed: failed,
    });
}

// ── Phase: Architect ─────────────────────────────────────────────────────────

phase("Architect");

let arch_prompt = "";
arch_prompt += "You are the lead systems architect for " + brand + "'s Instagram Phonk music visualizer.\n";
arch_prompt += product_brief;
arch_prompt += "\nTASK:\n";
arch_prompt += "1. Inspect the project root with list_dir/grep/read_file (it may be empty — that is fine).\n";
arch_prompt += "2. Write a concrete architecture document to " + root + "/docs/ARCHITECTURE.md covering:\n";
arch_prompt += "   - directory tree\n";
arch_prompt += "   - DSP → JSON/WebSocket/uniform pipeline\n";
arch_prompt += "   - GLSL raymarch + fluid pipeline\n";
arch_prompt += "   - media timeline (audio track, video track, image overlays)\n";
arch_prompt += "   - parameter bus schema (names, ranges, defaults)\n";
arch_prompt += "   - Instagram export strategy\n";
arch_prompt += "   - run instructions (Python venv + npm)\n";
arch_prompt += "3. Also write " + root + "/docs/PARAMETER_BUS.md with the full control object (like an FL Studio plugin).\n";
arch_prompt += "4. Return structured output: summary, modules[{id,role,paths}], file_map (key paths), design_path.\n";
arch_prompt += "Module ids MUST include exactly: dsp, glsl, threejs, media, controls (you may add more).\n";
arch_prompt += "Use write/search_replace tools to create the docs. Do not only describe — write the files.\n";

let arch = agent(arch_prompt, #{
    label: "architect",
    capability_mode: "read-write",
    output_schema: design_schema,
});

// Fail open on architect so a bad/missing schema object does not freeze the run;
// implementers re-read ARCHITECTURE.md (or invent a sensible tree if absent).
if arch == () || arch.success == false || arch.output == () {
    log("architect returned unusable output — continuing with scaffold defaults");
} else {
    log("architecture summary ready");
}

// ── Phase: Scaffold ──────────────────────────────────────────────────────────

phase("Scaffold");

let sc_prompt = "";
sc_prompt += "You are scaffolding the " + brand + " Phonk visualizer repo.\n";
sc_prompt += product_brief;
sc_prompt += "\nRead " + root + "/docs/ARCHITECTURE.md if it exists (use read_file) and follow its tree.\n";
sc_prompt += "Create a runnable monorepo skeleton under " + root + ":\n";
sc_prompt += "  backend/\n";
sc_prompt += "    requirements.txt  (librosa, numpy, scipy, soundfile, fastapi, uvicorn, python-multipart)\n";
sc_prompt += "    app/main.py       (FastAPI: health, upload audio, analyze endpoints returning DSP metrics)\n";
sc_prompt += "    app/dsp/engine.py (stub imports OK if heavy logic comes later — but API shapes must be real)\n";
sc_prompt += "  frontend/\n";
sc_prompt += "    package.json (vite, three, lil-gui or leva-style controls)\n";
sc_prompt += "    index.html, vite.config.js\n";
sc_prompt += "    src/main.js (entry)\n";
sc_prompt += "    src/shaders/*.glsl or template strings placeholders\n";
sc_prompt += "    src/three/, src/audio/, src/media/, src/controls/, src/export/\n";
sc_prompt += "  README.md brand-facing\n";
sc_prompt += "  .gitignore\n";
sc_prompt += "Idempotent: if files already exist with real content, do not blank them; fill only missing pieces.\n";
sc_prompt += "Use list_dir/read_file before writing. Return {ok, created[], notes}.\n";

let sc = agent(sc_prompt, #{
    label: "scaffold",
    capability_mode: "all",
    output_schema: scaffold_schema,
});

if sc == () || sc.success == false || sc.output == () {
    log("scaffold reported failure or unusable output — continuing if files may still exist");
} else if sc.output.ok != true {
    log("scaffold ok=false — continuing; implementers will fill gaps");
}

if mode == "scaffold" {
    let sreport = "# Scaffold complete — " + brand + "\n\n";
    if sc != () && sc.success && sc.output != () {
        sreport += "ok=" + sc.output.ok.to_string() + "\n";
        if sc.output.notes != () { sreport += sc.output.notes + "\n"; }
    }
    let sp = write_scratch_file("scaffold-report.md", sreport);
    complete(#{ summary: "scaffold finished", path: sp, mode: "scaffold" });
}

// ── Phase: Implement (parallel modules) ──────────────────────────────────────

phase("Implement");

let modules = [
    #{
        id: "dsp",
        title: "Python DSP engine",
        detail: "Librosa/NumPy/SciPy analysis: 808 onset/energy 20-60Hz, pitch (yin/pyin or spectral) 400-2000Hz, hi-hat transient strength, BPM + beat phase, FFT band energies with configurable crossovers/smoothing. Sidechain envelope from kick. Serialize frame-synced metrics JSON for the frontend. Wire FastAPI routes /analyze and /analyze/stream or file-based cache. Deep math comments.",
    },
    #{
        id: "glsl",
        title: "GLSL raymarch fractal + fluid",
        detail: "Raw GLSL fragment shader: SDF Mandelbulb (or hybrid) with trigonometric fold modifiers driven by u_bass808; pitch-driven HSL/emission; high-freq fluid density/velocity contribution (simplified GPU fluid or curl-noise mist if full NS too heavy — document choice); BPM-phase camera; chromatic aberration + shake uniforms; sidechain scale. Comment every DE/fold step.",
    },
    #{
        id: "threejs",
        title: "Three.js render wrapper",
        detail: "Three.js full-viewport renderer, orthographic/fullscreen quad material with GLSL, clock, resize, postprocessing bloom if available, uniform bus updated each frame from AudioEngine + ParameterStore. Smooth interpolation of DSP uniforms. Production structure with clear modules.",
    },
    #{
        id: "media",
        title: "Media timeline audio/video/images",
        detail: "CRITICAL USER REQUIREMENT: upload audio (WebAudio + file), upload video (HTMLVideoElement → texture layer), upload images (textures as overlays). Transport: play/pause/seek/loop, volume, mute. Video: opacity, blend, trim in/out, fit cover/contain. Images: multi-layer list with transform. Simple multi-track timeline UI sufficient for Instagram edits. Composite video+fractal+overlays in correct order.",
    },
    #{
        id: "controls",
        title: "Parameter bus + Instagram export",
        detail: "Modular control object (single source of truth) for FFT smoothing, band crossovers, sidechain depth, fold formula enum, FOV, warp strength, color offsets, fluid force scale. lil-gui or equivalent panel. Persist presets to localStorage. Instagram export: aspect 9:16/1:1/16:9 letterbox, MediaRecorder or canvas capture with audio mix. Brand string in UI: " + brand + ".",
    },
];

let ijobs = [];
for m in modules {
    let ip = "";
    ip += "You are the implementer for module \"" + m.id + "\" (" + m.title + ") of the " + brand + " Phonk visualizer.\n";
    ip += product_brief;
    ip += "\nMODULE FOCUS:\n" + m.detail + "\n";
    ip += "\nRULES:\n";
    ip += "1. Read docs/ARCHITECTURE.md and docs/PARAMETER_BUS.md if present; honor existing paths and names.\n";
    ip += "2. Inspect the scaffold with list_dir/read_file before editing. Implement real production code under " + root + ".\n";
    ip += "3. Do NOT leave TODO-only stubs for core paths — ship runnable logic with comments on the math.\n";
    ip += "4. Stay inside your module's ownership; share contracts via clear exports/imports and the parameter bus names.\n";
    ip += "5. Prefer existing scaffold files over inventing a parallel tree.\n";
    ip += "6. Return {module:\"" + m.id + "\", ok:true/false, files:[...], notes}.\n";
    ip += "Use write/search_replace freely. capability is full stack for this module.\n";
    ijobs.push(#{
        prompt: ip,
        label: "impl:" + m.id,
        capability_mode: "all",
        output_schema: module_schema,
    });
}

let iresults = parallel(ijobs);

let impl_ok = 0;
let impl_fail = [];
let impl_files = [];
let mi = 0;
for r in iresults {
    let mid = modules[mi].id;
    if r != () && r.success && r.output != () {
        if r.output.ok == true {
            impl_ok += 1;
        } else {
            impl_fail.push(mid);
        }
        if r.output.files != () {
            for f in r.output.files { impl_files.push(f); }
        }
    } else {
        impl_fail.push(mid);
    }
    mi += 1;
}
log("implement ok=" + impl_ok.to_string() + "/" + modules.len().to_string());
if impl_fail.len() > 0 {
    log("implement soft-fail modules: " + json_encode(impl_fail));
}

// ── Phase: Integrate ─────────────────────────────────────────────────────────

phase("Integrate");

let int_prompt = "";
int_prompt += "You are the integration engineer for the " + brand + " Phonk visualizer under " + root + ".\n";
int_prompt += product_brief;
int_prompt += "\nRead the repo (list_dir, grep, read_file). Wire modules so the app actually runs end-to-end:\n";
int_prompt += "1. Frontend main entry imports Three renderer, shaders, ParameterStore, MediaTimeline, Export.\n";
int_prompt += "2. Audio playback drives either live WebAudio analyser OR fetched Python DSP metrics (fallback path documented).\n";
int_prompt += "3. Video and image layers composite with the fractal pass.\n";
int_prompt += "4. Control panel binds to the same parameter object the shaders read.\n";
int_prompt += "5. Fix broken imports, missing package.json scripts (dev, build), and Python entrypoint.\n";
int_prompt += "6. Update README with exact Windows-friendly run steps (pwsh): venv, pip, npm install, npm run dev, uvicorn.\n";
int_prompt += "7. Ensure Instagram aspect switch resizes canvas correctly.\n";
int_prompt += "Do not rewrite entire modules unless required — integrate and fix glue.\n";
int_prompt += "Return {ok, summary, entrypoints[], gaps[]}.\n";

let integ = agent(int_prompt, #{
    label: "integrate",
    capability_mode: "all",
    output_schema: integrate_schema,
});

if integ == () || integ.success == false {
    log("integrate agent failed — verification will surface gaps");
}

// ── Phase: Verify ────────────────────────────────────────────────────────────

phase("Verify");

let req_checks = [
    #{ id: "dsp-808-pitch-bpm", desc: "Python DSP extracts 808, pitch, hi-hat, BPM and exposes to frontend" },
    #{ id: "glsl-mandelbulb-fluid", desc: "GLSL raymarch Mandelbulb + fluid/mist + audio uniforms with deep comments" },
    #{ id: "threejs-wrapper", desc: "Three.js render loop updates uniforms from audio/parameter bus" },
    #{ id: "media-audio-video-images", desc: "Upload+control audio, video, and picture overlays with timeline-like editing" },
    #{ id: "parameter-bus", desc: "Modular FL-style params: FFT, sidechain, fold, FOV, warp" },
    #{ id: "instagram-export", desc: "Aspect presets and capture/export path for Instagram" },
];

let vjobs2 = [];
for c in req_checks {
    let vp2 = "";
    vp2 += "Adversarially verify requirement \"" + c.id + "\" for project at " + root + ".\n";
    vp2 += "Requirement: " + c.desc + "\n";
    vp2 += "Use list_dir, grep, read_file on real files only. Quote evidence.\n";
    vp2 += "passed=true only with concrete evidence. Else passed=false + fix_hint.\n";
    vp2 += "Return check_id=\"" + c.id + "\", passed, reason, evidence, fix_hint.\n";
    vjobs2.push(#{
        prompt: vp2,
        label: "verify:" + c.id,
        capability_mode: "read-only",
        output_schema: verdict_schema,
    });
}

let verdicts2 = parallel(vjobs2);

let pass2 = 0;
let fail2 = [];
let vi = 0;
for v in verdicts2 {
    let cid = req_checks[vi].id;
    if v != () && v.success && v.output != () {
        if v.output.passed == true && v.output.evidence != () && v.output.evidence != "" {
            pass2 += 1;
        } else {
            let reason = "";
            if v.output.reason != () { reason = v.output.reason; }
            let fh = "";
            if v.output.fix_hint != () { fh = v.output.fix_hint; }
            if v.output.check_id != () { cid = v.output.check_id; }
            fail2.push(#{ check_id: cid, reason: reason, fix_hint: fh });
        }
    } else {
        fail2.push(#{ check_id: cid, reason: "verifier unusable", fix_hint: "re-run" });
    }
    vi += 1;
}
log("verify " + pass2.to_string() + "/" + req_checks.len().to_string() + " passed");

// Optional repair pass if anything failed (bounded — one integrate-style fixer)
if fail2.len() > 0 {
    phase("Integrate");
    log("repairing " + fail2.len().to_string() + " failed checks");
    let fix_prompt = "";
    fix_prompt += "You are a repair engineer for " + brand + " Phonk visualizer at " + root + ".\n";
    fix_prompt += product_brief;
    fix_prompt += "\nThe following verification checks FAILED. Read the code, then implement minimal fixes so they pass:\n";
    fix_prompt += json_encode(fail2);
    fix_prompt += "\nUse list_dir/grep/read_file first. Prefer small targeted fixes. Return {ok, summary, entrypoints, gaps}.\n";
    let fixr = agent(fix_prompt, #{
        label: "repair",
        capability_mode: "all",
        output_schema: integrate_schema,
    });
    if fixr != () && fixr.success {
        log("repair agent finished");
    }
}

// ── Phase: Ship ──────────────────────────────────────────────────────────────

phase("Ship");

let ship_prompt = "";
ship_prompt += "Finalize shipping docs for " + brand + " Phonk visualizer at " + root + ".\n";
ship_prompt += "1. Read the tree and ensure README.md has: concept, features (audio/video/images/export), stack, install, run (Windows pwsh), parameter bus overview, Instagram export how-to.\n";
ship_prompt += "2. Write " + root + "/docs/RUNBOOK.md with troubleshooting (CORS, mic/file perms, WebGL, large audio).\n";
ship_prompt += "3. List key entrypoints and what the user should click first after npm run dev.\n";
ship_prompt += "Return a short summary string of what was finalized (free text is fine if schema not attached).\n";
ship_prompt += "Use tools to write files.\n";

let ship = agent(ship_prompt, #{
    label: "ship-docs",
    capability_mode: "read-write",
});

let final_report = "";
final_report += "# " + brand + " — Phonk Hyper-Fluid Fractal Visualizer\n\n";
final_report += "Build workflow finished (mode=" + mode + ").\n\n";
final_report += "## Implement\n";
final_report += "- modules ok: " + impl_ok.to_string() + "/" + modules.len().to_string() + "\n";
if impl_fail.len() > 0 {
    final_report += "- soft-fail modules: " + json_encode(impl_fail) + "\n";
}
final_report += "\n## Verify\n";
final_report += "- passed: " + pass2.to_string() + "/" + req_checks.len().to_string() + " (pre-repair snapshot)\n";
if fail2.len() > 0 {
    final_report += "- failed checks (pre-repair):\n";
    for f in fail2 {
        final_report += "  - " + f.check_id + ": " + f.reason + "\n";
    }
}
final_report += "\n## Entrypoints\n";
if integ != () && integ.success && integ.output != () && integ.output.entrypoints != () {
    for e in integ.output.entrypoints {
        final_report += "- " + e + "\n";
    }
} else {
    final_report += "- See README.md (frontend npm run dev, backend uvicorn)\n";
}
final_report += "\n## How to run next\n";
final_report += "1. `cd backend && python -m venv .venv && .\\.venv\\Scripts\\pip install -r requirements.txt`\n";
final_report += "2. `uvicorn app.main:app --reload --port 8000`\n";
final_report += "3. `cd frontend && npm install && npm run dev`\n";
final_report += "4. Upload a Phonk track, optional video/images, tweak the parameter bus, export 9:16 for Instagram.\n";

if ship != () && ship.success && ship.output != () {
    final_report += "\n## Ship notes\n";
    // output may be free text or object
    final_report += json_encode(ship.output);
    final_report += "\n";
}

let report_path = write_scratch_file("build-report.md", final_report);

complete(#{
    summary: brand + " visualizer build complete; verify " + pass2.to_string() + "/" + req_checks.len().to_string() + " pre-repair",
    path: report_path,
    root: root,
    mode: mode,
    implement_ok: impl_ok,
    implement_total: modules.len(),
    verify_passed: pass2,
    verify_total: req_checks.len(),
    failed_checks: fail2,
});
