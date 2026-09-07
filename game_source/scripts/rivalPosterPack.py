#!/usr/bin/env python3
"""
Rival poster packer — turns external artwork into gameplay webp.

INPUT  : art_src/rival/external/<slot_id>.png|webp|jpg
         (one finished portrait poster per file, named by manifest slot id)
         ...or ...
         art_src/rival/external/sheets/<sheet>.png + the sheets map below
         (2x4 contact sheets with black dividers, row-major cell order)

OUTPUT : public/rival-posters/<slot_id>.webp  (720x900, 4:5, q85)
         then re-runs scripts/rivalPosterPlan.mjs to refresh the manifest.

    python3 scripts/rivalPosterPack.py
"""
import json
import os
import subprocess
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = os.path.join(ROOT, "art_src", "rival", "external")
SHEETS = os.path.join(EXT, "sheets")
SINGLES = os.path.join(ROOT, "art_src", "rival")
DST = os.path.join(ROOT, "public", "rival-posters")
MANIFEST = os.path.join(ROOT, "src", "engine", "generated", "rivalPosterManifest.json")

TW, TH = 720, 900  # gameplay poster size (4:5)

# 2x4 contact sheets — sheet file -> 8 slot ids in ROW-MAJOR order
# (top-left, top-right, row2-left, row2-right, ... row4-left, row4-right).
# Fill this in when a new sheet is attached; blank cells -> "".
SHEET_MAP = {}


def cover_crop(im: Image.Image, tw=TW, th=TH) -> Image.Image:
    """center-crop to 4:5 then high-quality resize (blow up small sources)."""
    im = im.convert("RGB")
    w, h = im.size
    ar_img, ar_tgt = w / h, tw / th
    if ar_img > ar_tgt:  # too wide
        nw = int(h * ar_tgt)
        x0 = (w - nw) // 2
        im = im.crop((x0, 0, x0 + nw, h))
    else:  # too tall
        nh = int(w / ar_tgt)
        y0 = (h - nh) // 2
        im = im.crop((0, y0, w, y0 + nh))
    return im.resize((tw, th), Image.LANCZOS)


def save(im: Image.Image, slot_id: str, quality=85):
    out = os.path.join(DST, f"{slot_id}.webp")
    im.save(out, "WEBP", quality=quality, method=6)
    return os.path.getsize(out) // 1024


def find_source_png(slot_id):
    for base, ext in [(EXT, ""), (SINGLES, "")]:
        for suf in (".png", ".webp", ".jpg", ".jpeg"):
            p = os.path.join(base, f"{slot_id}{suf}")
            if os.path.isfile(p):
                return p
    return None


def delineate(sheet_img: Image.Image):
    """cut a 2x4 sheet into 8 cells, trimming a small inset so the black
    divider lines never bleed into a cell."""
    w, h = sheet_img.size
    cells = []
    inset_x, inset_y = int(w * 0.012), int(h * 0.012)
    for r in range(4):
        for c in range(2):
            x0, x1 = int(c * w / 2), int((c + 1) * w / 2)
            y0, y1 = int(r * h / 4), int((r + 1) * h / 4)
            cells.append(sheet_img.crop((x0 + inset_x, y0 + inset_y, x1 - inset_x, y1 - inset_y)))
    return cells


def main():
    ok, made, missing = 0, 0, []

    # 1) direct posters (external drop-in + earlier single generations)
    manifest = json.load(open(MANIFEST))
    slots = [p["id"] for p in manifest["posters"]]
    done = {f[:-5] for f in os.listdir(DST) if f.endswith(".webp")} if os.path.isdir(DST) else set()
    for slot in slots:
        if slot in done:
            continue
        src = find_source_png(slot)
        if not src:
            continue
        im = Image.open(src)
        kb = save(cover_crop(im), slot)
        made += 1
        print(f"[single] {slot:26s} -> webp 720x900  {kb}KB")

    # 2) contact sheets (2x4, black dividers)
    for sheet_name, cell_slots in SHEET_MAP.items():
        p = os.path.join(SHEETS, sheet_name)
        if not os.path.isfile(p):
            print(f"[sheet ] {sheet_name}: missing file, skipped")
            continue
        sheet = Image.open(p)
        cells = delineate(sheet)
        if len(cell_slots) != 8:
            print(f"[sheet ] {sheet_name}: SHEET_MAP needs exactly 8 slots")
            sys.exit(1)
        for cell, slot in zip(cells, cell_slots):
            if not slot:
                continue
            kb = save(cover_crop(cell), slot)
            made += 1
            print(f"[sheet ] {sheet_name} -> {slot:26s} webp 720x900  {kb}KB")

    made_now = done.__len__()
    print(f"\npacked {made} new poster webp files into public/rival-posters/")

    # 3) refresh the manifest so pending -> false for every landed file
    plan = os.path.join(ROOT, "scripts", "rivalPosterPlan.mjs")
    if os.path.isfile(plan):
        subprocess.run(["node", plan], check=True, cwd=ROOT)


if __name__ == "__main__":
    os.makedirs(DST, exist_ok=True)
    main()
