#!/usr/bin/env python3
"""Crop unit sprites from generated sheets, punch out the backdrop, write
matching 224x224 head portraits. Uses the same painting for both files."""
from __future__ import annotations

import os
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1] / "public" / "img"


def corner_bg(im: Image.Image) -> tuple[int, int, int]:
    px = im.convert("RGB")
    w, h = px.size
    samples = [
        px.getpixel((2, 2)),
        px.getpixel((w - 3, 2)),
        px.getpixel((2, h - 3)),
        px.getpixel((w - 3, h - 3)),
        px.getpixel((w // 2, 2)),
        px.getpixel((2, h // 2)),
    ]
    r = sum(s[0] for s in samples) // len(samples)
    g = sum(s[1] for s in samples) // len(samples)
    b = sum(s[2] for s in samples) // len(samples)
    return r, g, b


def dist2(a, b) -> int:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2


def alpha_from_bg(im: Image.Image, fuzz: int = 34) -> Image.Image:
    """Flood-fill transparency from the edges so black clothes on a black
    backdrop (or white sneakers on white paper) stay opaque."""
    rgb = im.convert("RGB")
    bg = corner_bg(rgb)
    thresh = fuzz * fuzz * 3
    w, h = rgb.size
    src = rgb.load()
    vis = bytearray(w * h)
    stack = []

    def maybe(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h:
            return
        i = y * w + x
        if vis[i]:
            return
        if dist2(src[x, y], bg) <= thresh:
            vis[i] = 1
            stack.append((x, y))

    for x in range(w):
        maybe(x, 0)
        maybe(x, h - 1)
    for y in range(h):
        maybe(0, y)
        maybe(w - 1, y)
    while stack:
        x, y = stack.pop()
        maybe(x + 1, y)
        maybe(x - 1, y)
        maybe(x, y + 1)
        maybe(x, y - 1)

    out = Image.new("RGBA", rgb.size)
    dst = out.load()
    for y in range(h):
        row = y * w
        for x in range(w):
            p = src[x, y]
            if vis[row + x]:
                d = dist2(p, bg)
                a = 0 if d <= thresh * 0.4 else int(255 * (d - thresh * 0.4) / (thresh * 0.6))
                dst[x, y] = (p[0], p[1], p[2], max(0, min(255, a)))
            else:
                dst[x, y] = (p[0], p[1], p[2], 255)
    return out


def bbox_from_alpha(im: Image.Image, pad: int = 8, min_a: int = 24):
    a = im.split()[-1]
    box = a.point(lambda v: 255 if v >= min_a else 0).getbbox()
    if not box:
        return (0, 0, im.width, im.height)
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return (x0, y0, x1, y1)


def column_occupancy(im: Image.Image, min_a: int = 30) -> list[int]:
    a = im.split()[-1]
    w, h = im.size
    px = a.load()
    cols = []
    for x in range(w):
        n = 0
        for y in range(h):
            if px[x, y] >= min_a:
                n += 1
        cols.append(n)
    return cols


def split_figures(im: Image.Image) -> list[tuple[int, int, int, int]]:
    """Return bboxes of distinct standing figures in a horizontal sheet."""
    cols = column_occupancy(im)
    w, h = im.size
    # a column is "occupied" if more than 4% of its pixels are foreground
    occ = [c > h * 0.04 for c in cols]
    # merge tiny gaps (anti-aliasing between nearby pixels of one figure)
    gap = max(6, w // 80)
    cleaned = occ[:]
    i = 0
    while i < w:
        if not cleaned[i]:
            j = i
            while j < w and not cleaned[j]:
                j += 1
            if 0 < (j - i) <= gap and i > 0 and j < w:
                for k in range(i, j):
                    cleaned[k] = True
            i = j
        else:
            i += 1
    regions = []
    i = 0
    while i < w:
        if cleaned[i]:
            j = i
            while j < w and cleaned[j]:
                j += 1
            if (j - i) > w * 0.08:
                regions.append((i, 0, j, h))
            i = j
        else:
            i += 1
    return regions


def pick_three_quarter(regions: list[tuple[int, int, int, int]]) -> tuple[int, int, int, int]:
    """Prefer a 3/4 view: not the first (usually front) and not the last (usually back)."""
    if not regions:
        raise ValueError("no figures")
    if len(regions) == 1:
        return regions[0]
    if len(regions) == 2:
        return regions[0]
    # 0-index: for 5 poses (front, 3/4, side, 3/4-back, back) take index 1
    # for 3 poses take the middle
    if len(regions) >= 5:
        return regions[1]
    return regions[len(regions) // 2]


def fit_sprite(im: Image.Image, target_h: int = 640) -> Image.Image:
    box = bbox_from_alpha(im, pad=10)
    cropped = im.crop(box)
    w, h = cropped.size
    if h <= 0:
        return cropped
    scale = target_h / h
    nw = max(1, int(round(w * scale)))
    return cropped.resize((nw, target_h), Image.Resampling.LANCZOS)


def make_portrait(sprite: Image.Image, size: int = 224) -> Image.Image:
    """Head-and-shoulders square from the same painting."""
    box = bbox_from_alpha(sprite, pad=0)
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    # head lives in the top ~42% of a 3.5-head-tall figure
    head_h = int(bh * 0.46)
    # a bit of shoulders
    crop_h = int(bh * 0.42)
    crop_w = int(max(crop_h * 0.95, bw * 0.92))
    cx = (x0 + x1) // 2
    top = y0
    left = max(x0, cx - crop_w // 2)
    right = min(x1, left + crop_w)
    left = max(x0, right - crop_w)
    bottom = min(y1, top + crop_h)
    head = sprite.crop((left, top, right, bottom))
    # pad to square
    hw, hh = head.size
    side = max(hw, hh)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(head, ((side - hw) // 2, (side - hh) // 2), head)
    return sq.resize((size, size), Image.Resampling.LANCZOS)


def process_one(src: Path, sprite_out: Path, portrait_out: Path | None, prefer_sheet: bool = True) -> None:
    im = Image.open(src).convert("RGBA")
    punched = alpha_from_bg(im)
    if prefer_sheet:
        regions = split_figures(punched)
        print(f"  {src.name}: {len(regions)} figure(s) detected")
        if len(regions) >= 2:
            r = pick_three_quarter(regions)
            # inset a little so we don't keep a neighbour's elbow
            pad = max(4, (r[2] - r[0]) // 30)
            r = (r[0] + pad, r[1], r[2] - pad, r[3])
            punched = punched.crop(r)
    sprite = fit_sprite(punched)
    sprite_out.parent.mkdir(parents=True, exist_ok=True)
    sprite.save(sprite_out, "PNG", optimize=True)
    print(f"  wrote {sprite_out.name} {sprite.size}")
    if portrait_out:
        port = make_portrait(sprite)
        port.save(portrait_out, "PNG", optimize=True)
        print(f"  wrote {portrait_out.name} {port.size}")


JOBS = [
    ("sprite-showrunner-steady.png", "sprite-showrunner-steady.png", "portrait-showrunner-steady.png", True),
    ("sprite-showrunner-vision.png", "sprite-showrunner-vision.png", "portrait-showrunner-vision.png", True),
    ("sprite-showrunner-producer.png", "sprite-showrunner-producer.png", "portrait-showrunner-producer.png", True),
    ("sprite-showrunner-marketer.png", "sprite-showrunner-marketer.png", "portrait-showrunner-marketer.png", True),
    ("sprite-worker-1.png", "sprite-worker-1.png", "portrait-worker-1.png", True),
    ("sprite-worker-2.png", "sprite-worker-2.png", "portrait-worker-2.png", True),
    ("sprite-worker-3.png", "sprite-worker-3.png", "portrait-worker-3.png", True),
    ("sprite-worker-4.png", "sprite-worker-4.png", "portrait-worker-4.png", True),
]


def main() -> None:
    for src_name, spr_name, por_name, sheet in JOBS:
        src = ROOT / src_name
        if not src.exists():
            print("missing", src)
            continue
        print("processing", src_name)
        process_one(src, ROOT / spr_name, ROOT / por_name if por_name else None, prefer_sheet=sheet)


if __name__ == "__main__":
    main()
