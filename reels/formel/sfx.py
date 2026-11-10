#!/usr/bin/env python3
"""
Sound-Layer für Formel-Reels: synthetisiert die Stil-Sounds aus der Cue-Liste
(render.cjs schreibt <video>.cues.json) und mischt sie unter das Video.

    python3 reels/formel/sfx.py <video.cues.json> <video.mp4> [ausgabe.mp4] [--vo stimme.wav]

Alles wird im Code erzeugt (nur numpy), keine fremden Aufnahmen.
Zuordnung zum earshot-Kit, falls dort gerendert wird: siehe reels/STYLE.md §5.
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
RNG = np.random.default_rng(7)


def db(x):
    return 10 ** (x / 20)


def one_pole_lowpass(x, cutoff_hz):
    """Tiefpass mit zeitvariabler Grenzfrequenz (Array oder Zahl)."""
    cutoff = np.broadcast_to(np.asarray(cutoff_hz, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def tick():
    n = int(0.014 * SR)
    t = np.arange(n) / SR
    env = np.exp(-t * 520)
    noise = np.diff(RNG.standard_normal(n + 1))  # hochpassiges Rauschen = "Klick"
    tone = np.sin(2 * np.pi * RNG.uniform(1900, 2700) * t)
    return (0.55 * noise + 0.45 * tone) * env


def whoosh(dur=0.42, peak_at=0.78):
    n = int(dur * SR)
    p = np.linspace(0, 1, n)
    env = np.where(p < peak_at, (p / peak_at) ** 2.2, np.exp(-(p - peak_at) * 22))
    cutoff = 300 + 6500 * np.sin(np.pi * np.clip(p / (peak_at * 1.15), 0, 1)) ** 2
    sig = one_pole_lowpass(RNG.standard_normal(n), cutoff)
    sig = sig / (np.abs(sig).max() + 1e-9)
    pan = np.clip(p * 1.4 - 0.2, 0, 1)  # wandert von links nach rechts
    mono = sig * env
    return np.stack([mono * np.cos(pan * np.pi / 2), mono * np.sin(pan * np.pi / 2)], axis=1) * 1.3


def sub_drop(dur=1.1, f0=95, f1=36):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 4.2)
    phase = 2 * np.pi * np.cumsum(f) / SR
    env = np.minimum(1, t / 0.004) * np.exp(-t * 3.2)
    click = np.exp(-t * 900) * RNG.standard_normal(n) * 0.25
    return (np.sin(phase) + 0.18 * np.sin(2 * phase)) * env + click


def place(bus, sig, t, gain_db):
    sig = sig if sig.ndim == 2 else np.stack([sig, sig], axis=1)
    i = int(round(t * SR))
    if i < 0:
        sig, i = sig[-i:], 0
    j = min(len(bus), i + len(sig))
    if j > i:
        bus[i:j] += sig[: j - i] * db(gain_db)


def build(cues, duration):
    bus = np.zeros((int((duration + 0.5) * SR), 2))
    for c in cues:
        if c["kind"] == "type":
            step = c["dur"] / max(1, c["chars"])
            for k in range(c["chars"]):
                place(bus, tick(), c["t"] + k * step, -21 + RNG.uniform(-2, 2))
        elif c["kind"] == "cardIn":
            place(bus, whoosh(), c["t"] - 0.42 * 0.78, -11)
        elif c["kind"] == "outro":
            place(bus, whoosh(0.5, 0.35), c["t"] - 0.05, -15)
            place(bus, sub_drop(), c["t"], -6)
    return bus[: int(duration * SR)]


def write_wav(path, stereo):
    pcm = (np.clip(stereo, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    vo = sys.argv[sys.argv.index("--vo") + 1] if "--vo" in sys.argv else None
    if vo:
        args.remove(vo)
    if len(args) < 2:
        sys.exit(__doc__)
    cues_path, video = Path(args[0]), Path(args[1])
    out = Path(args[2]) if len(args) > 2 else video.with_name(video.stem + ".sound.mp4")
    meta = json.loads(cues_path.read_text())
    bus = build(meta["cues"], meta["duration"])
    peak = np.abs(bus).max()
    if peak > db(-1):
        bus *= db(-1) / peak
    wav = out.with_suffix(".sfx.wav")
    write_wav(wav, bus)
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(video), "-i", str(wav)]
    if vo:
        # Stimme vorne, SFX darunter; danach auf ca. -14 LUFS (Instagram) normalisieren.
        cmd += ["-i", vo, "-filter_complex",
                "[2:a]aresample=48000,volume=1[v];[1:a][v]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1:LRA=9[a]",
                "-map", "0:v", "-map", "[a]"]
    else:
        cmd += ["-map", "0:v", "-map", "1:a"]
    cmd += ["-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(out)]
    subprocess.run(cmd, check=True)
    wav.unlink()
    print(f"Mit Sound: {out}")


if __name__ == "__main__":
    main()
