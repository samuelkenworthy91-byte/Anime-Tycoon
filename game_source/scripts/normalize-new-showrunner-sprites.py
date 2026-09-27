#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "public" / "img"
IDS = ["darkness","dawn","unbalanced","finisher","critical","ensemble","sloth","delegator","over9000"]
CANVAS = (448, 640)
TARGET_H = 602
MAX_W = 340
BASELINE = 628

for sid in IDS:
    path = IMG / f"sprite-showrunner-{sid}.webp"
    with Image.open(path) as source:
        im = source.convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError(f"{path.name}: no opaque pixels")
    cut = im.crop(bbox)
    scale = min(TARGET_H / cut.height, MAX_W / cut.width)
    nw = max(1, round(cut.width * scale))
    nh = max(1, round(cut.height * scale))
    cut = cut.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", CANVAS, (0,0,0,0))
    x = (CANVAS[0] - nw) // 2
    y = BASELINE - nh
    if y < 0:
        raise RuntimeError(f"{path.name}: normalized sprite would exceed canvas")
    canvas.alpha_composite(cut, (x, y))
    after = canvas.getchannel("A").getbbox()
    canvas.save(path, "WEBP", quality=92, method=6, lossless=False)
    print(f"{path.name}: before={bbox} cut={cut.size} after={after}")
