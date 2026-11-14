#!/usr/bin/env bash
# Ruby Rose France — 9:16 story ad: render frames → encode with music → posters + contact sheets → cleanup.
# usage: FRAMES=/scratch/video-frames ./build.sh            (both languages)
#        LANGS=fr KEEP=1 ./build.sh                          (French only, keep PNG frames)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; VID="$(dirname "$HERE")"
FRAMES="${FRAMES:-${TMPDIR:-/tmp}/rubyrose-video-frames}"   # PNG frames never go in the repo
LANGS="${LANGS:-fr tr}"; WORKERS="${WORKERS:-4}"; FPS=30; DUR=25
mkdir -p "$FRAMES"
cd "$HERE"

echo "▸ music"
python3 music.py "$FRAMES/music.wav" "$DUR"

for L in $LANGS; do
  echo "▸ frames [$L] → $FRAMES/$L"
  rm -rf "${FRAMES:?}/$L"
  node render.js --lang "$L" --out "$FRAMES/$L" --fps "$FPS" --dur "$DUR" --workers "$WORKERS"

  echo "▸ encode [$L]"
  ffmpeg -hide_banner -loglevel error -y -framerate "$FPS" -i "$FRAMES/$L/frame_%04d.png" -i "$FRAMES/music.wav" \
    -c:v libx264 -pix_fmt yuv420p -crf "${CRF:-20}" -preset slow -movflags +faststart -c:a aac -b:a 160k -shortest \
    "$VID/rubyrose-story-$L.mp4"

  echo "▸ poster + contact sheet [$L]"
  # poster: first strong frame = monogram + wordmark fully drawn (t = 2.2 s)
  python3 -c "from PIL import Image; Image.open('$FRAMES/$L/frame_0066.png').convert('RGB').save('$VID/poster-$L.jpg', quality=90, optimize=True)"
  ARGS=(); for s in 1 4 8 11 14 18 21 24; do ARGS+=("$FRAMES/$L/frame_$(printf %04d $((s * FPS))).png@${s}s"); done
  python3 contact_sheet.py "$VID/contact-sheet-$L.jpg" 4 360 "${ARGS[@]}"

  [ "${KEEP:-0}" = 1 ] || rm -rf "${FRAMES:?}/$L"
done

echo "▸ verify"
for L in $LANGS; do
  ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt:format=duration,size -of compact "$VID/rubyrose-story-$L.mp4"
done
