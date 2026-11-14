# Ruby Rose France — vertical story ad (9:16)

25 s, 1080×1920, 30 fps, H.264 (CRF 20, preset slow, yuv420p, faststart) + AAC 160 kbps; < 25 MB each. Product-first: only product cut-outs, shade chips, smears,
pigment and typography (no people, faces or models). Look and copy follow the site (v3 "Pigment").

| File | What |
|---|---|
| `rubyrose-story-fr.mp4` | French (default copy) |
| `rubyrose-story-tr.mp4` | Turkish version (same scene, `?lang=tr`) |
| `poster-fr.jpg`, `poster-tr.jpg` | first strong frame (t = 2.2 s, monogram + wordmark) |
| `contact-sheet-fr.jpg`, `contact-sheet-tr.jpg` | review frames at 1, 4, 8, 11, 14, 18, 21, 24 s |
| `src/scene.html` | the animation (HTML/CSS + WebGL pigment shader + canvas grain), driven by `window.__seek(t)` |
| `src/render.js` | Playwright renderer: local HTTP server → `__seek(frame/30)` → 2×rAF → PNG |
| `src/music.py` | numpy procedural soundtrack (A minor pad, 120 BPM sub pulse, riser, ≈ −14 LUFS) |
| `src/build.sh` | frames → ffmpeg encode with audio → posters → contact sheets → cleanup |
| `src/contact_sheet.py` | labelled contact sheet helper |
| `src/fonts/` | self-hosted WOFF2 (Instrument Serif, Montserrat, JetBrains Mono — latin + latin-ext for Turkish) |

## Re-render

Requirements: Node with Playwright (Chromium), ffmpeg ≥ 6, Python 3 with numpy + Pillow.

```bash
cd rubyrose-site/video/src
FRAMES=/tmp/rubyrose-video-frames ./build.sh          # both languages (~12 min each on 4 cores)
LANGS=tr KEEP=1 ./build.sh                            # one language, keep the PNG frames
```

PNG frames go to `$FRAMES` (default `$TMPDIR/rubyrose-video-frames`), never into the repo, and are
deleted after encoding unless `KEEP=1`.

Quick timing pass / single frames:

```bash
node render.js --lang fr --out /tmp/q --fps 10 --scale 0.25 --check     # 270×480 @ 10 fps + safe-zone audit
node render.js --lang tr --out /tmp/q --times 2.2,6.8,13.5 --scale 0.5  # specific timestamps
```

Preview in a browser: serve `rubyrose-site/` (e.g. `python3 -m http.server`) and open
`/video/src/scene.html?lang=fr`, then call `__seek(12.5)` in the console.

## How it stays deterministic

- No `requestAnimationFrame` state, no CSS transitions/animations, no `Math.random`: every transform,
  opacity, clip, odometer position and shader uniform is a pure function of `t`.
- Seeded PRNG (mulberry32) for droplets and the 8 grain frames; the shader's time uniform is `t`.
- `render.js` waits for fonts, image decode and fit-to-width (`window.__ready`) before the first frame,
  then for each frame calls `__seek(t)` and waits two animation frames before the screenshot.
  Frames can therefore be rendered in parallel, in any order.
- Audio: `music.py` uses a fixed RNG seed; integrated loudness is computed with BS.1770 K-weighting and
  gating, then checked with `ffmpeg -af ebur128` (≈ −14 LUFS, peak < −1 dBFS).

## Storyboard

| t (s) | Scene |
|---|---|
| 0.0–2.5 | A ruby drop lands at 0.5 s and blooms into liquid pigment; RR monogram draws itself inside the circular `#FormuléEnFrance` badge; wordmark wipes in, FRANCE tracks in |
| 2.5–5.0 | 01 Le laboratoire: "Laboratoire de formulation cosmétique", gold hairline, FIG. 01 / FORMULÉ EN FRANCE, "Sèvres · Paris", texture still life |
| 5.0–7.5 | 02 Teint: three Daily Skin tubes slide in with parallax + light sweep; 33 manifest chips fan out on an arc (counter 0 → 33); M60 smear wipes across |
| 7.5–9.0 | Blur Me concealers + open Light Filter compact; P5–P25 chips |
| 9.0–12.0 | 03 Joues: Blush On Me compact spins in over the Pink Thrill pan; ring of 18 chips; shade-name ticker |
| 12.0–14.0 | 04 Lèvres (deep rose field): five capped Lumen glosses rise like a bar chart; caps lift as gloss drips from the baseline |
| 14.0–16.0 | Mood liquid lipsticks cross-fade in |
| 16.0–19.0 | 05 Yeux: six mascaras fan out like lashes; gold lash curve draws itself |
| 19.0–22.0 | 06 Ruby Rose en chiffres: +40 / +500 / +20M odometers over plum pigment (type only) |
| 22.0–25.0 | End card: products gather into a constellation, wordmark, claim, rubyrosefrance.com, business@rubyrosefrance.com; hold, fade to night |

Every scene cut sits on the 120 BPM pulse grid (multiples of 0.5 s) and gets a whoosh + sub accent.
Text stays inside 90 % width and between y = 220 and y = 1620 (story UI zones); `--check` audits this.

Copy sources (index.html): hero eyebrow/title, `pd.*`, `pc.cat.*`, `fig.*` (FR + TR dictionaries).
Grain is kept at 6 % overlay so the files stay under 25 MB (`CRF=18 ./build.sh` for a heavier master).
Brand names inside Turkish lines are tagged `lang="en"` so uppercase stays "DAILY SKIN", not "DAİLY SKİN".
