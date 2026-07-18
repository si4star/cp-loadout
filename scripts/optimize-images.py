#!/usr/bin/env python3
"""Scale + compress product images in img/ (not img/tokens/ — use
optimize-token-images.py for those).

Rules: skip SVGs, JPEGs and anything under 100 KB; scale PNGs wider than
MAX_W down to MAX_W (aspect preserved) and palette-compress. Overwrites in
place — keep source exports elsewhere. Requires Pillow.
"""
from PIL import Image
import glob, os

MAX_W = 900
SKIP_UNDER = 100 * 1024
ROOT = os.path.join(os.path.dirname(__file__), "..", "img")

total_before = total_after = 0
for path in sorted(glob.glob(os.path.join(ROOT, "*.png"))):
    before = os.path.getsize(path)
    if before < SKIP_UNDER:
        print(f"{os.path.basename(path):38} {before//1024:>6} KB  (skipped)")
        continue
    im = Image.open(path)
    if im.mode == "P" and im.width <= MAX_W:
        print(f"{os.path.basename(path):38} {before//1024:>6} KB  (already optimised)")
        continue
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    has_alpha = im.mode in ("RGBA", "LA") and im.getextrema()[-1][0] < 255
    if has_alpha:
        im = im.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)
    else:
        im = im.convert("RGB").quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
    im.save(path, optimize=True)
    after = os.path.getsize(path)
    total_before += before; total_after += after
    print(f"{os.path.basename(path):38} {before//1024:>6} KB -> {after//1024:>4} KB")
print(f"{'TOTAL (processed)':38} {total_before//1024:>6} KB -> {total_after//1024:>4} KB")
