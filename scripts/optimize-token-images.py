#!/usr/bin/env python3
"""Scale + compress token thumbnails in img/tokens/.

Run after dropping new renders in: scales anything wider than MAX_W down to
MAX_W (aspect preserved) and palette-compresses. Overwrites in place — keep
your source exports elsewhere. Requires Pillow.
"""
from PIL import Image
import glob, os

MAX_W = 600
ROOT = os.path.join(os.path.dirname(__file__), "..", "img", "tokens")

total_before = total_after = 0
for path in sorted(glob.glob(os.path.join(ROOT, "*.png"))):
    before = os.path.getsize(path)
    im = Image.open(path)
    if im.mode == "P" and im.width <= MAX_W:
        print(f"{os.path.basename(path):22} {before//1024:>6} KB  (already optimised)")
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
    print(f"{os.path.basename(path):22} {before//1024:>6} KB -> {after//1024:>4} KB")
print(f"{'TOTAL':22} {total_before//1024:>6} KB -> {total_after//1024:>4} KB")
