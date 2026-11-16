"""Synthesizes the showreel's original sound effects (whooshes, swell, sub boom, riser).

Pure standard library, so it runs anywhere:  python scripts/synth_sfx.py
Writes 48 kHz stereo 16-bit WAVs into public/sfx/. Deterministic (fixed seed).
"""
import math
import os
import random
import struct
import wave

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'sfx')
random.seed(7)


def write(name, left, right=None):
    right = right if right is not None else left
    peak = max(1e-9, max(max(abs(x) for x in left), max(abs(x) for x in right)))
    scale = 0.89 / peak  # normalise to about -1 dBFS
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = bytearray()
        for a, b in zip(left, right):
            frames += struct.pack('<hh', int(max(-1, min(1, a * scale)) * 32767), int(max(-1, min(1, b * scale)) * 32767))
        w.writeframes(bytes(frames))


def noise(n):
    return [random.uniform(-1, 1) for _ in range(n)]


def swept_bandpass(x, f_lo, f_hi, curve):
    """Two one-pole filters (high-pass then low-pass) whose cutoffs follow curve(t) in 0..1."""
    out = []
    lp = hp_prev_in = hp_prev_out = 0.0
    n = len(x)
    for i, s in enumerate(x):
        c = curve(i / n)
        fc = f_lo + (f_hi - f_lo) * c
        # low-pass at fc
        a = 1 - math.exp(-2 * math.pi * fc / SR)
        lp += a * (s - lp)
        # high-pass at fc / 4
        rc = 1 / (2 * math.pi * max(40, fc / 4))
        alpha = rc / (rc + 1 / SR)
        hp = alpha * (hp_prev_out + lp - hp_prev_in)
        hp_prev_in, hp_prev_out = lp, hp
        out.append(hp)
    return out


def envelope(n, attack, release, power=2.0):
    """Swell up to `attack` (fraction), then fall away over `release`."""
    env = []
    for i in range(n):
        t = i / n
        if t < attack:
            v = (t / attack) ** power
        else:
            v = max(0.0, 1 - (t - attack) / release) ** power
        env.append(v)
    return env


def whoosh(seconds, attack, f_lo, f_hi, pan_from, pan_to):
    n = int(SR * seconds)
    env = envelope(n, attack, 1 - attack)
    sweep = lambda t: math.sin(math.pi * min(1, t / attack) / 2) if t < attack else max(0.0, 1 - (t - attack) / (1 - attack))
    base = swept_bandpass(noise(n), f_lo, f_hi, sweep)
    left, right = [], []
    for i, s in enumerate(base):
        p = pan_from + (pan_to - pan_from) * (i / n)  # -1 left .. 1 right
        g = s * env[i]
        left.append(g * math.cos((p + 1) * math.pi / 4))
        right.append(g * math.sin((p + 1) * math.pi / 4))
    return left, right


def main():
    os.makedirs(OUT, exist_ok=True)

    # Diagonal wipe whoosh: left to right, like the wipe.
    l, r = whoosh(0.7, 0.45, 300, 5200, -0.8, 0.8)
    write('whoosh.wav', l, r)

    # Bigger, longer whoosh for the end card.
    l, r = whoosh(1.3, 0.6, 150, 6500, -0.5, 0.5)
    write('whoosh_big.wav', l, r)

    # Reverse swell into "Twice.": bright noise that only rises, then stops dead.
    n = int(SR * 0.6)
    env = [(i / n) ** 3 for i in range(n)]
    base = swept_bandpass(noise(n), 1500, 9000, lambda t: t)
    write('swell.wav', [s * e for s, e in zip(base, env)])

    # Sub boom: a sine that drops in pitch, fast attack, exponential decay, a touch of click.
    n = int(SR * 1.4)
    phase = 0.0
    boom = []
    for i in range(n):
        t = i / SR
        f = 70 * math.exp(-1.6 * t) + 32
        phase += 2 * math.pi * f / SR
        click = math.exp(-t * 400) * random.uniform(-1, 1) * 0.3
        boom.append((math.sin(phase) + 0.25 * math.sin(2 * phase)) * math.exp(-3.0 * t) + click)
    write('sub.wav', boom)

    # Tonal riser that climbs with the strength line, with a little airy noise.
    n = int(SR * 1.3)
    phase = 0.0
    air = swept_bandpass(noise(n), 800, 7000, lambda t: t)
    rise = []
    for i in range(n):
        t = i / SR
        f = 180 * (2 ** (t * 1.6))
        phase += 2 * math.pi * f / SR
        g = (i / n) ** 1.5 * (1 if i < n * 0.9 else (n - i) / (n * 0.1))
        rise.append((math.sin(phase) * 0.6 + air[i] * 0.4) * g)
    write('riser.wav', rise)

    print('ok')


if __name__ == '__main__':
    main()
