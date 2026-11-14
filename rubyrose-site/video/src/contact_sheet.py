#!/usr/bin/env python3
"""Tile frames into a labelled contact sheet.
usage: contact_sheet.py OUT.jpg COLS THUMB_W frame1.png[@label] frame2.png[@label] ..."""
import sys
from PIL import Image, ImageDraw
out, cols, tw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
items = [a.split('@', 1) if '@' in a else (a, '') for a in sys.argv[4:]]
ims = [Image.open(p).convert('RGB') for p, _ in items]
th = round(tw * ims[0].height / ims[0].width)
pad, lab = 10, 26
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + pad + lab) + pad), (20, 10, 15))
d = ImageDraw.Draw(sheet)
for i, (im, (_, l)) in enumerate(zip(ims, items)):
    x, y = pad + (i % cols) * (tw + pad), pad + (i // cols) * (th + pad + lab)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y + lab))
    d.text((x + 2, y + 6), l, fill=(217, 176, 114))
sheet.save(out, quality=88)
