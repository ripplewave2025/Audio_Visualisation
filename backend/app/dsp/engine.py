"""
Phonk Hyper-Fluid Fractal — DSP Engine
======================================

Extracts frame-synced metrics that drive GLSL uniforms:

  808 sub-bass (20–60 Hz)     → fractal fold, shake, chromatic aberration
  Melody / cowbell pitch      → HSL hue + bloom emission
  Hi-hat / high transients    → fluid velocity forces
  BPM + beat phase            → kinematic camera / u_time groove
  Sidechain envelope          → kick-driven visual ducking

Math notes are inline. All heavy lifting uses Librosa + NumPy/SciPy.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any

import librosa
import numpy as np
from scipy.signal import butter, sosfilt, find_peaks


@dataclass
class AnalysisConfig:
    """Mirrors the frontend ParameterBus FFT / band knobs."""

    sr: int | None = None  # None → librosa default load
    hop_length: int = 512
    n_fft: int = 2048
    # Band crossovers (Hz)
    cross_low: float = 60.0  # end of 808 band
    cross_mid: float = 400.0  # melody window start
    cross_high: float = 6000.0  # hi-hat start
    # 808 window
    bass_lo: float = 20.0
    # Melody pitch window
    pitch_lo: float = 400.0
    pitch_hi: float = 2000.0
    # Exponential smoothing α ∈ (0,1); higher = stickier
    fft_smooth: float = 0.75
    # Sidechain
    sidechain_depth: float = 0.55
    sidechain_attack: float = 0.02
    sidechain_release: float = 0.18


def _hz_to_bin(hz: float, sr: int, n_fft: int) -> int:
    """Map frequency (Hz) → FFT bin index (clamped)."""
    return int(np.clip(np.round(hz * n_fft / sr), 0, n_fft // 2))


def _band_energy(S_mag: np.ndarray, sr: int, n_fft: int, lo: float, hi: float) -> np.ndarray:
    """
    Mean magnitude in [lo, hi] Hz per frame.

    S_mag shape: (n_freq_bins, n_frames)
    Returns: (n_frames,) normalized roughly to [0, 1] later.
    """
    b0 = _hz_to_bin(lo, sr, n_fft)
    b1 = max(b0 + 1, _hz_to_bin(hi, sr, n_fft))
    return S_mag[b0:b1].mean(axis=0)


def _exp_smooth(x: np.ndarray, alpha: float) -> np.ndarray:
    """
    One-pole low-pass (exponential moving average).

      y[n] = α y[n-1] + (1-α) x[n]

    α close to 1 → heavy smoothing (slow attack/release on meters).
    """
    y = np.empty_like(x)
    y[0] = x[0]
    a = float(np.clip(alpha, 0.0, 0.999))
    b = 1.0 - a
    for i in range(1, len(x)):
        y[i] = a * y[i - 1] + b * x[i]
    return y


def _normalize(x: np.ndarray, eps: float = 1e-8) -> np.ndarray:
    """Percentile-ish normalize to ~[0,1] using 95th percentile peak."""
    peak = np.percentile(x, 95) + eps
    return np.clip(x / peak, 0.0, 1.5)


def _butter_band(y: np.ndarray, sr: int, lo: float, hi: float, order: int = 4) -> np.ndarray:
    """SOS Butterworth bandpass for onset isolation."""
    nyq = 0.5 * sr
    lo_n = max(lo / nyq, 1e-5)
    hi_n = min(hi / nyq, 0.999)
    if lo_n >= hi_n:
        return y
    sos = butter(order, [lo_n, hi_n], btype="band", output="sos")
    return sosfilt(sos, y)


def _sidechain_envelope(
    kick_env: np.ndarray,
    sr: int,
    hop: int,
    attack: float,
    release: float,
    depth: float,
) -> np.ndarray:
    """
    Classic compressor-style gain reduction envelope from a kick/808 detector.

    On each frame, if kick is high we pull gain toward (1 - depth * kick),
    with asymmetric attack/release coefficients derived from time constants:

      coeff = exp(-hop_duration / tau)

    Returns gain ∈ [1-depth, 1] roughly, smoothed.
    """
    hop_s = hop / float(sr)
    att = np.exp(-hop_s / max(attack, 1e-4))
    rel = np.exp(-hop_s / max(release, 1e-4))
    gain = np.ones_like(kick_env)
    g = 1.0
    for i, k in enumerate(kick_env):
        target = 1.0 - depth * float(k)
        coeff = att if target < g else rel
        g = coeff * g + (1.0 - coeff) * target
        gain[i] = g
    return gain


def analyze_audio(path: str, cfg: AnalysisConfig | None = None) -> dict[str, Any]:
    """
    Full offline analysis of an audio file.

    Returns a JSON-serializable dict:
      {
        sr, hop_length, duration, n_frames, bpm, times[],
        frames: { bass808[], mid[], high[], pitchHz[], pitchConf[],
                  onset808[], hatTransient[], sidechain[], beatPhase[] }
      }
    """
    cfg = cfg or AnalysisConfig()

    # ------------------------------------------------------------------ load
    y, sr = librosa.load(path, sr=cfg.sr, mono=True)
    duration = float(librosa.get_duration(y=y, sr=sr))
    hop = cfg.hop_length
    n_fft = cfg.n_fft

    # ---------------------------------------------------------- STFT magnitude
    # |STFT| is the workhorse for band energies. We use power=1 (magnitude)
    # then convert to a perceptual-ish scale via log1p later for some bands.
    S = np.abs(librosa.stft(y, n_fft=n_fft, hop_length=hop))
    S_log = np.log1p(S)

    bass = _normalize(_band_energy(S_log, sr, n_fft, cfg.bass_lo, cfg.cross_low))
    mid = _normalize(_band_energy(S_log, sr, n_fft, cfg.cross_mid, min(cfg.pitch_hi, cfg.cross_high)))
    high = _normalize(_band_energy(S_log, sr, n_fft, cfg.cross_high, sr * 0.45))

    # Smooth meters (parameter-bus fftSmooth)
    bass = _exp_smooth(bass, cfg.fft_smooth)
    mid = _exp_smooth(mid, cfg.fft_smooth)
    high = _exp_smooth(high, cfg.fft_smooth * 0.85)  # hats a bit snappier

    # ------------------------------------------------------ 808 / kick onsets
    # Band-limit to sub, then onset strength. Peaks → transient hits that
    # should trigger fractal fold + shake.
    y_sub = _butter_band(y, sr, cfg.bass_lo, cfg.cross_low)
    onset_env = librosa.onset.onset_strength(y=y_sub, sr=sr, hop_length=hop, aggregate=np.median)
    onset_env = _normalize(onset_env.astype(np.float64))
    # Align length to STFT frames
    n_frames = S.shape[1]
    onset_env = _match_len(onset_env, n_frames)
    onset_env = _exp_smooth(onset_env, max(0.3, cfg.fft_smooth - 0.2))

    # Peak-boosted 808 hit mask (for UI / debugging)
    peaks, _ = find_peaks(onset_env, height=0.35, distance=max(1, int(0.08 * sr / hop)))
    onset808 = onset_env.copy()
    # Soft peak emphasis
    for p in peaks:
        lo = max(0, p - 1)
        hi = min(n_frames, p + 2)
        onset808[lo:hi] = np.maximum(onset808[lo:hi], 0.9)

    # ------------------------------------------------ hi-hat / high transients
    # High-band spectral flux: frame-to-frame positive difference of high energy.
    high_flux = np.diff(high, prepend=high[0])
    high_flux = np.clip(high_flux, 0.0, None)
    hat = _normalize(high_flux * 0.65 + high * 0.35)
    hat = _exp_smooth(hat, 0.45)  # keep hats punchy

    # ---------------------------------------------------------- pitch (melody)
    # PYIN is robust for monophonic-ish lines; cowbell-ish Phonk leads often
    # land in 400–2000 Hz. We fmin/fmax clamp to that window.
    fmin = cfg.pitch_lo
    fmax = min(cfg.pitch_hi, sr / 2 - 1)
    try:
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y,
            fmin=fmin,
            fmax=fmax,
            sr=sr,
            hop_length=hop,
            fill_na=0.0,
        )
        pitch_hz = np.nan_to_num(f0, nan=0.0)
        pitch_conf = np.nan_to_num(voiced_probs, nan=0.0)
        if voiced_flag is not None:
            pitch_conf = pitch_conf * voiced_flag.astype(np.float64)
    except Exception:
        # Fallback: spectral centroid in the melody band as a pseudo-pitch
        cents = librosa.feature.spectral_centroid(S=S, sr=sr)[0]
        pitch_hz = _match_len(cents, n_frames)
        pitch_conf = (mid * 0.5).astype(np.float64)

    pitch_hz = _match_len(np.asarray(pitch_hz, dtype=np.float64), n_frames)
    pitch_conf = _match_len(np.asarray(pitch_conf, dtype=np.float64), n_frames)

    # --------------------------------------------------------------- BPM / beat
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop, units="frames")
    # librosa may return tempo as ndarray in recent versions
    bpm = float(np.atleast_1d(tempo)[0]) if tempo is not None else 0.0
    if bpm <= 0:
        bpm = 140.0  # Phonk-ish default guess

    # Beat phase φ ∈ [0,1): 0 on the beat, rises linearly to next beat.
    # Camera pull uses cos(2π φ) style mapping on the frontend.
    beat_phase = np.zeros(n_frames, dtype=np.float64)
    beat_frames = np.asarray(beat_frames, dtype=int)
    if len(beat_frames) >= 2:
        for i in range(len(beat_frames) - 1):
            a, b = int(beat_frames[i]), int(beat_frames[i + 1])
            a = max(0, min(a, n_frames - 1))
            b = max(a + 1, min(b, n_frames))
            span = b - a
            beat_phase[a:b] = np.linspace(0.0, 1.0, span, endpoint=False)
        # Tail after last beat
        last = int(beat_frames[-1])
        if last < n_frames:
            # Assume constant inter-beat interval
            ibi = int(np.median(np.diff(beat_frames))) if len(beat_frames) > 1 else int(0.5 * sr / hop)
            ibi = max(ibi, 1)
            for i in range(last, n_frames):
                beat_phase[i] = ((i - last) % ibi) / float(ibi)
    else:
        # Synthetic phase from BPM if beat tracker fails
        frames_per_beat = (60.0 / bpm) * sr / hop
        t = np.arange(n_frames)
        beat_phase = (t % frames_per_beat) / frames_per_beat

    # ---------------------------------------------------------- sidechain gain
    sidechain = _sidechain_envelope(
        kick_env=np.maximum(bass, onset808),
        sr=sr,
        hop=hop,
        attack=cfg.sidechain_attack,
        release=cfg.sidechain_release,
        depth=cfg.sidechain_depth,
    )

    times = librosa.frames_to_time(np.arange(n_frames), sr=sr, hop_length=hop)

    def _f32(a: np.ndarray) -> list[float]:
        return [float(x) for x in np.asarray(a, dtype=np.float64)]

    return {
        "sr": int(sr),
        "hop_length": int(hop),
        "n_fft": int(n_fft),
        "duration": duration,
        "n_frames": int(n_frames),
        "bpm": bpm,
        "config": asdict(cfg),
        "times": _f32(times),
        "frames": {
            "bass808": _f32(bass),
            "mid": _f32(mid),
            "high": _f32(high),
            "pitchHz": _f32(pitch_hz),
            "pitchConf": _f32(pitch_conf),
            "onset808": _f32(onset808),
            "hatTransient": _f32(hat),
            "sidechain": _f32(sidechain),
            "beatPhase": _f32(beat_phase),
        },
    }


def _match_len(x: np.ndarray, n: int) -> np.ndarray:
    """Crop or pad 1-D array to length n."""
    x = np.asarray(x, dtype=np.float64).reshape(-1)
    if len(x) == n:
        return x
    if len(x) > n:
        return x[:n]
    out = np.zeros(n, dtype=np.float64)
    out[: len(x)] = x
    if len(x) > 0:
        out[len(x) :] = x[-1]
    return out
