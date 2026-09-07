#!/usr/bin/env python3
"""
Packs the generated awards-ceremony art into public/awards/*.webp:
 - stage-bg.webp                     full-bleed stage backdrop
 - curtain-left.webp / -right.webp   split velvet curtains (crimson + gold)
 - valance.webp                      scalloped swag; black keyed to alpha

    python3 scripts/ceremonyArtPack.py
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "art_src", "awards")
DST = os.path.join(ROOT, "public", "awards")


def pack_opaque(name, max_w, quality=86):
    path = os.path.join(SRC, name)
    im = Image.open(path).convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, int(im.height * max_w / im.width)), Image.LANCZOS)
    out = os.path.join(DST, name.replace(".png", ".webp"))
    im.save(out, "WEBP", quality=quality, method=6)
    print(f"{os.path.basename(out):20s} {im.width}x{im.height}  {os.path.getsize(out)//1024}KB")


def pack_valance(name, max_w, quality=90):
    """luminance-keyed alpha: pure black becomes transparent, colours keep."""
    path = os.path.join(SRC, name)
    im = Image.open(path).convert("RGBA")
    if im.width > max_w:
        im = im.resize((max_w, int(im.height * max_w / im.width)), Image.LANCZOS)
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            v = max(r, g, b)
            # threshold out near-black noise so the empty area trims away
            a = 0 if v <= 20 else min(255, int((v - 20) * 255 / 235))
            px[x, y] = (r, g, b, a)
    # trim fully-transparent borders so only the swag gets encoded
    bbox = im.split()[3].getbbox()
    if bbox:
        im = im.crop(bbox)
    out = os.path.join(DST, name.replace(".png", ".webp"))
    im.save(out, "WEBP", quality=quality, method=6)
    print(f"{os.path.basename(out):20s} {im.width}x{im.height}  {os.path.getsize(out)//1024}KB")


def main():
    os.makedirs(DST, exist_ok=True)
    pack_opaque("stage-bg.png", 1600, 84)
    pack_opaque("curtain-left.png", 900, 86)
    pack_opaque("curtain-right.png", 900, 86)
    pack_valance("valance.png", 1600, 90)


if __name__ == "__main__":
    if not os.path.isdir(SRC):
        print("art_src/awards missing — generate the ceremony art first", file=sys.stderr)
        sys.exit(1)
    main()
