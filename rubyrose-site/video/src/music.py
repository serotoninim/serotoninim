#!/usr/bin/env python3
"""Ruby Rose France story — procedural soundtrack (numpy only, fully deterministic).

Soft ambient pad in A minor (Am(add9) → Fmaj7 → Dm9 → Cadd9 → Am → Em7 → Fmaj7 → G6 → Am(add9)),
a slow sub pulse on the 120 BPM grid (every 0.5 s; every scene cut sits on it), a water-drop "plip"
when the pigment lands (0.5 s), bell accents on the logo and the end card, airy whooshes into each cut,
and a noise + sine riser into the end card at 22 s. Integrated loudness normalised to ≈ −14 LUFS
(BS.1770 K-weighting + gating, computed here and checked with ffmpeg ebur128 in build.sh).

usage: python3 music.py OUT.wav [duration=25]
"""
import sys, wave
import numpy as np

SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else 'music.wav'
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 25.0
N = int(round(DUR * SR))
t = np.arange(N) / SR
rng = np.random.default_rng(20261114)
L = np.zeros(N); R = np.zeros(N)

CUTS = [2.5, 5.0, 7.5, 9.0, 12.0, 14.0, 16.0, 19.0, 22.0]
mtof = lambda m: 440.0 * 2 ** ((m - 69) / 12)

def seg(a, b):
    i0, i1 = max(0, int(a * SR)), min(N, int(b * SR))
    return i0, i1, np.maximum(t[i0:i1] - a, 0.0)

def add(i0, sig, pan=0.0, gain=1.0):
    """equal-power pan, -1 = left, +1 = right"""
    n = min(len(sig), N - i0)
    if n <= 0: return
    th = (pan + 1) * np.pi / 4
    L[i0:i0 + n] += sig[:n] * np.cos(th) * gain
    R[i0:i0 + n] += sig[:n] * np.sin(th) * gain

def fft_filter(x, lo=None, hi=None, order=2):
    """zero-phase band filter in the frequency domain (smooth Butterworth-like magnitude)"""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); H = np.ones_like(f)
    if lo: H *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    if hi: H *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    return np.fft.irfft(X * H, len(x))

# ---------------------------------------------------------------- pad
CHORDS = [  # start, bass, voicing
    (0.0, 45, [57, 60, 64, 71]),    # Am(add9)
    (5.0, 41, [53, 57, 60, 64]),    # Fmaj7
    (9.0, 38, [50, 53, 60, 64]),    # Dm9 (no 5)
    (12.0, 48, [52, 55, 60, 62]),   # Cadd9
    (14.0, 45, [57, 60, 64, 67]),   # Am7
    (16.0, 40, [55, 59, 62, 64]),   # Em7 (sus colour)
    (19.0, 41, [53, 57, 60, 64]),   # Fmaj7
    (20.5, 43, [55, 59, 62, 64]),   # G6
    (22.0, 45, [57, 60, 64, 71]),   # Am(add9)
]
pad = np.zeros((2, N))
for ci, (st, bass, notes) in enumerate(CHORDS):
    en = CHORDS[ci + 1][0] if ci + 1 < len(CHORDS) else DUR
    att = 1.4 if ci == 0 else 0.45
    rel = 0.9
    s0 = st - (0 if ci == 0 else 0.15)
    i0, i1, tt = seg(s0, en + rel)
    env = np.clip(tt / att, 0, 1) * np.clip((en + rel - (tt + s0)) / rel, 0, 1)
    env = env ** 1.5
    # brightness opens across the piece and swells into the riser
    bright = 0.45 + 0.35 * np.clip((tt + s0) / 22, 0, 1)
    for vi, m in enumerate(notes):
        f0 = mtof(m)
        for d, pan in ((-7, -0.7), (0, 0.0), (7, 0.7)):
            f = f0 * 2 ** (d / 1200)
            ph = rng.uniform(0, 2 * np.pi)
            v = np.zeros_like(tt)
            for h in range(1, 8):
                amp = (1 / h ** 1.6) * np.exp(-(h - 1) * (1.15 - bright) * 1.1)
                v += amp * np.sin(2 * np.pi * f * h * tt + ph * h)
            trem = 1 + 0.08 * np.sin(2 * np.pi * (0.13 + 0.05 * vi) * tt + vi)
            sig = v * env * trem * 0.055
            th = (pan * 0.8 + 1) * np.pi / 4
            pad[0, i0:i1] += sig * np.cos(th); pad[1, i0:i1] += sig * np.sin(th)
    # bass: warm sine + 2nd harmonic
    fb = mtof(bass)
    b = (np.sin(2 * np.pi * fb * tt) + 0.25 * np.sin(4 * np.pi * fb * tt)) * env * 0.11
    pad[0, i0:i1] += b; pad[1, i0:i1] += b

# side-chain-style breathing on the pulse grid (gentle)
duck = np.ones(N)
for k in range(1, int(DUR / 0.5) + 1):
    bt = k * 0.5
    if bt < 0.5 or bt > 24.0: continue
    i0, i1, tt = seg(bt, bt + 0.45)
    depth = 0.10 if bt < 2.5 else 0.17
    duck[i0:i1] *= 1 - depth * np.exp(-tt * 9)
pad *= duck
L += pad[0]; R += pad[1]

# ---------------------------------------------------------------- pulse (soft sub kick on the 0.5 s grid)
def kick(at, g):
    i0, i1, tt = seg(at, at + 0.6)
    f = 46 + 70 * np.exp(-tt * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-tt * 8.5) * g
    add(i0, s, 0, 1)
for k in range(1, int(DUR / 0.5)):
    bt = k * 0.5
    if bt < 2.5 or bt >= 24.0: continue
    on_cut = any(abs(bt - c) < 1e-6 for c in CUTS)
    g = 0.30 if on_cut else (0.17 if (k % 2 == 0) else 0.10)
    if 19.0 <= bt < 22.0: g *= 1.15
    kick(bt, g)

# soft shaker on 8th off-beats (scenes 3–7) for pace
for k in range(int(5.0 / 0.25), int(22.0 / 0.25)):
    bt = k * 0.25
    if abs((bt / 0.5) - round(bt / 0.5)) < 1e-6: continue
    i0, i1, tt = seg(bt, bt + 0.09)
    n = fft_filter(rng.standard_normal(len(tt)), lo=6500, order=2) * np.exp(-tt * 70) * 0.035
    add(i0, n, 0.35 if k % 4 == 1 else -0.35)

# ---------------------------------------------------------------- whooshes into cuts + click on the cut
for c in CUTS:
    i0, i1, tt = seg(c - 0.42, c + 0.18)
    x = rng.standard_normal(len(tt))
    n = fft_filter(x, lo=700, hi=5200, order=2)
    e = np.where(tt < 0.42, (tt / 0.42) ** 2.2, np.exp(-(tt - 0.42) * 30))
    g = 0.09 if c != 22.0 else 0.0
    add(i0, n * e * g, -0.25); add(i0, np.roll(n, 331) * e * g, 0.25)
    i0, i1, tt = seg(c, c + 0.05)
    clk = np.sin(2 * np.pi * 3100 * tt) * np.exp(-tt * 140) * 0.05
    add(i0, clk, 0)

# ---------------------------------------------------------------- the drop: plip + bloom swell
def plip(at, f0, f1, g, pan=0):
    i0, i1, tt = seg(at, at + 0.35)
    f = f1 + (f0 - f1) * np.exp(-tt * 28)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 16) * g
    add(i0, s, pan)
plip(0.47, 1500, 620, 0.26)
plip(0.60, 1900, 900, 0.10, 0.4)
plip(0.71, 1300, 700, 0.06, -0.4)
i0, i1, tt = seg(0.5, 2.6)
sw = fft_filter(rng.standard_normal(len(tt)), lo=120, hi=900, order=2)
add(i0, sw * np.sin(np.pi * np.clip(tt / 2.1, 0, 1)) ** 2 * 0.06, 0)

# ---------------------------------------------------------------- bells (logo, end card)
def bell(at, m, g, pan=0, dec=2.2):
    f = mtof(m)
    i0, i1, tt = seg(at, at + dec * 2.2)
    s = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 3)
         + 0.18 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt * 6))
    s *= np.exp(-tt / dec * 2.3) * np.minimum(1, tt / 0.004) * g
    add(i0, s, pan)
for i, m in enumerate([76, 81, 83]):            # E5 A5 B5 as the wordmark wipes in
    bell(1.5 + i * 0.25, m, 0.07, (-0.5, 0, 0.5)[i])
for i, m in enumerate([69, 76, 81, 83, 84, 88]):  # end card sparkle (Am add9)
    bell(22.0 + i * 0.125, m, 0.06 if i else 0.08, (-0.6 + i * 0.24), dec=2.8)

# ---------------------------------------------------------------- riser 19.5 → 22.0 and impact
a, b = 19.5, 22.0
i0, i1, tt = seg(a, b)
x = rng.standard_normal(len(tt))
# moving band: filter overlapping chunks with rising centre
C = 4096; H = C // 2; w = np.hanning(C)
xp = np.concatenate([np.zeros(C), x, np.zeros(C)]); out = np.zeros_like(xp)
for s0 in range(0, len(xp) - C, H):
    k = np.clip((s0 - C) / len(x), 0, 1); fc = 300 * (6500 / 300) ** k
    out[s0:s0 + C] += fft_filter(xp[s0:s0 + C] * w, lo=fc * 0.6, hi=fc * 1.6, order=2)
out = out[C:C + len(x)]
env = (tt / (b - a)) ** 2.4 * np.clip((b - a - tt) / 0.012, 0, 1)
add(i0, out * env * 0.15, -0.2); add(i0, np.roll(out, 777) * env * 0.15, 0.2)
f = 220 * (880 / 220) ** (tt / (b - a)) ** 1.6
add(i0, np.sin(2 * np.pi * np.cumsum(f) / SR) * env * 0.05, 0)  # sine riser
i0, i1, tt = seg(22.0, 24.6)
boom = np.sin(2 * np.pi * np.cumsum(42 + 40 * np.exp(-tt * 12)) / SR) * np.exp(-tt * 2.2) * 0.42
add(i0, boom, 0)

# ---------------------------------------------------------------- space: FFT convolution reverb (seeded IR)
ir_len = int(2.2 * SR); it = np.arange(ir_len) / SR
irL = rng.standard_normal(ir_len) * np.exp(-it * 3.0); irR = rng.standard_normal(ir_len) * np.exp(-it * 3.0)
irL = fft_filter(irL, hi=6000); irR = fft_filter(irR, hi=6000)
irL /= np.sqrt((irL ** 2).sum()); irR /= np.sqrt((irR ** 2).sum())
def conv(x, h):
    n = 1 << int(np.ceil(np.log2(len(x) + len(h))))
    return np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(h, n), n)[:len(x)]
wetL, wetR = conv(L, irL), conv(R, irR)
L = L + 0.32 * wetL; R = R + 0.32 * wetR

# ---------------------------------------------------------------- fades (match the picture's fade to night)
fin = np.minimum(1, t / 0.25)
fout = np.clip((DUR - t) / 0.9, 0, 1) ** 1.6
L *= fin * fout; R *= fin * fout

# ---------------------------------------------------------------- loudness: BS.1770-4 integrated (K-weighting, gated)
def k_weight(x):
    """apply the two BS.1770 biquads via their exact magnitude response (power is phase-independent)"""
    n = 1 << int(np.ceil(np.log2(len(x)))); X = np.fft.rfft(x, n)
    w = 2 * np.pi * np.fft.rfftfreq(n, 1 / SR) / SR; z = np.exp(-1j * w)
    def H(b, a): return (b[0] + b[1] * z + b[2] * z * z) / (a[0] + a[1] * z + a[2] * z * z)
    h = H([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]) * \
        H([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621])
    return np.fft.irfft(X * h, n)[:len(x)]
def lufs(l, r):
    kl, kr = k_weight(l), k_weight(r); bl = int(0.4 * SR); hop = int(0.1 * SR)
    z = np.array([(kl[i:i + bl] ** 2).mean() + (kr[i:i + bl] ** 2).mean() for i in range(0, len(l) - bl, hop)])
    lk = -0.691 + 10 * np.log10(np.maximum(z, 1e-12))
    z1 = z[lk > -70]; rel = -0.691 + 10 * np.log10(z1.mean()) - 10
    z2 = z1[(-0.691 + 10 * np.log10(z1)) > rel]
    return -0.691 + 10 * np.log10(z2.mean())
TARGET = -14.0
for _ in range(2):
    g = 10 ** ((TARGET - lufs(L, R)) / 20); L *= g; R *= g
# gentle soft-clip safety, keep true-ish peak under −1 dBFS
pk = max(np.abs(L).max(), np.abs(R).max()); lim = 10 ** (-1.2 / 20)
if pk > lim:
    L = np.tanh(L / lim * 0.9) * lim / np.tanh(0.9) if pk > lim * 1.6 else L * lim / pk
    R = np.tanh(R / lim * 0.9) * lim / np.tanh(0.9) if pk > lim * 1.6 else R * lim / pk
print(f'music: {DUR:.2f}s  integrated ≈ {lufs(L, R):.2f} LUFS  peak {20*np.log10(max(np.abs(L).max(), np.abs(R).max())):.2f} dBFS')

pcm = (np.stack([L, R], 1) * 32767).clip(-32768, 32767).astype('<i2')
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
