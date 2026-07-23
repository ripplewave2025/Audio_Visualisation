"""
FastAPI entry — upload audio, run Phonk DSP, return frame-synced metrics.
"""

from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.dsp.engine import AnalysisConfig, analyze_audio

ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="DJ Caat Phonk DSP",
    description="Librosa analysis backend for the Phonk Hyper-Fluid Fractal visualizer",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache: analysis_id → metrics dict
_CACHE: dict[str, dict[str, Any]] = {}


class AnalyzeOptions(BaseModel):
    fft_smooth: float = Field(0.75, ge=0.0, le=0.99)
    cross_low: float = Field(60.0, ge=20.0, le=200.0)
    cross_mid: float = Field(400.0, ge=200.0, le=1000.0)
    cross_high: float = Field(6000.0, ge=2000.0, le=14000.0)
    sidechain_depth: float = Field(0.55, ge=0.0, le=1.0)
    sidechain_attack: float = Field(0.02, ge=0.001, le=0.5)
    sidechain_release: float = Field(0.18, ge=0.01, le=2.0)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "dj-caat-phonk-dsp"}


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    fft_smooth: float = 0.75,
    cross_low: float = 60.0,
    cross_mid: float = 400.0,
    cross_high: float = 6000.0,
    sidechain_depth: float = 0.55,
    sidechain_attack: float = 0.02,
    sidechain_release: float = 0.18,
) -> dict[str, Any]:
    """
    Accept an audio file (wav/mp3/flac/ogg), run full DSP, return metrics JSON.
    Large responses are expected (per-frame arrays); frontend caches them.
    """
    if not file.filename:
        raise HTTPException(400, "Missing filename")

    ext = Path(file.filename).suffix.lower() or ".wav"
    if ext not in {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aiff", ".aif"}:
        raise HTTPException(400, f"Unsupported audio type: {ext}")

    analysis_id = uuid.uuid4().hex
    dest = UPLOAD_DIR / f"{analysis_id}{ext}"

    try:
        with dest.open("wb") as out:
            shutil.copyfileobj(file.file, out)
    finally:
        await file.close()

    cfg = AnalysisConfig(
        fft_smooth=fft_smooth,
        cross_low=cross_low,
        cross_mid=cross_mid,
        cross_high=cross_high,
        sidechain_depth=sidechain_depth,
        sidechain_attack=sidechain_attack,
        sidechain_release=sidechain_release,
    )

    try:
        metrics = analyze_audio(str(dest), cfg)
    except Exception as exc:  # noqa: BLE001 — surface DSP errors cleanly
        dest.unlink(missing_ok=True)
        raise HTTPException(500, f"Analysis failed: {exc}") from exc

    metrics["analysis_id"] = analysis_id
    metrics["filename"] = file.filename
    _CACHE[analysis_id] = metrics

    # Optional: keep file for re-analysis; delete to save disk
    if os.environ.get("KEEP_UPLOADS", "0") != "1":
        dest.unlink(missing_ok=True)

    return metrics


@app.get("/analyze/{analysis_id}")
def get_analysis(analysis_id: str) -> dict[str, Any]:
    data = _CACHE.get(analysis_id)
    if not data:
        raise HTTPException(404, "Unknown analysis_id (server restarted or expired)")
    return data


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "DJ Caat Phonk DSP",
        "docs": "/docs",
        "health": "/health",
        "analyze": "POST /analyze (multipart file)",
    }
