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

# 4x2 contact sheets — sheet file -> 8 slot ids in ROW-MAJOR order
# (top row L2R: cells 1-4, bottom row L2R: cells 5-8).
# Fill this in when a new sheet is attached; blank cells -> "".
SHEET_MAP = {}

COLS, ROWS = 4, 2  # sheets are 4 columns x 2 rows

