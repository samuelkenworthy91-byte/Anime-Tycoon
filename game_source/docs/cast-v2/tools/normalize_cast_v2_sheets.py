#!/usr/bin/env python3
"""Normalize generated Cast V2 raw grids without altering their source files.

The image model may return a near-2:1 canvas, translucent seams, or decorative
divider pixels. This tool treats the raw sheet as eight equal geometric cells,
removes only a narrow seam inset, fits each complete cell into a square using a
blurred extension when necessary, and writes a separate 2048x1024 candidate
master with exact opaque RGB-black functional gutters. Identity mapping is not
performed here and OCR is never used.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def flatten_rgba(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    base = Image.new("RGBA", rgba.size, (0, 0, 0, 255))
    return Image.alpha_composite(base, rgba).convert("RGB")


def square_without_clipping(cell: Image.Image, size: int) -> Image.Image:
    """Fill a square while retaining the entire cell composition."""
    fitted = ImageOps.contain(cell, (size, size), Image.Resampling.LANCZOS)
    background = ImageOps.fit(cell, (size, size), Image.Resampling.LANCZOS)
    background = background.filter(ImageFilter.GaussianBlur(max(8, size // 28)))
    # Darken the extension so it reads as background rather than duplicated art.
    shade = Image.new("RGB", (size, size), (0, 0, 0))
    background = Image.blend(background, shade, 0.18)
    background.paste(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    return background


def normalize(raw: Path, output: Path, cell_size: int, gutter: int, seam_inset: int) -> dict:
    with Image.open(raw) as source:
        source.load()
        image = flatten_rgba(source)
    width, height = image.size
    canvas = Image.new("RGB", (cell_size * 4, cell_size * 2), (0, 0, 0))
    content_size = cell_size - gutter * 2
    cells = []
    for row in range(2):
        for col in range(4):
            x0 = round(width * col / 4) + seam_inset
            x1 = round(width * (col + 1) / 4) - seam_inset
            y0 = round(height * row / 2) + seam_inset
            y1 = round(height * (row + 1) / 2) - seam_inset
            if x1 <= x0 or y1 <= y0:
                raise ValueError(f"Invalid cell bounds for {raw}: {(x0, y0, x1, y1)}")
            cell = image.crop((x0, y0, x1, y1))
            normalized = square_without_clipping(cell, content_size)
            dx = col * cell_size + gutter
            dy = row * cell_size + gutter
            canvas.paste(normalized, (dx, dy))
            cells.append({"row": row, "column": col, "raw_bounds": [x0, y0, x1, y1], "raw_size": [cell.width, cell.height]})
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(f"{output.stem}.tmp{output.suffix}")
    canvas.save(temporary, "PNG", compress_level=6)
    with Image.open(temporary) as check:
        check.load()
        if check.size != (cell_size * 4, cell_size * 2) or check.mode != "RGB":
            raise ValueError(f"Normalized verification failed for {temporary}")
    temporary.replace(output)
    return {
        "raw": str(raw), "raw_sha256": sha256(raw), "raw_width": width, "raw_height": height,
        "normalized": str(output), "normalized_sha256": sha256(output),
        "normalized_width": canvas.width, "normalized_height": canvas.height,
        "cell_size": cell_size, "gutter": gutter, "seam_inset": seam_inset, "cells": cells,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--cell-size", type=int, default=512)
    parser.add_argument("--gutter", type=int, default=8)
    parser.add_argument("--seam-inset", type=int, default=4)
    args = parser.parse_args()
    raws = sorted(args.raw.glob("*.png"))
    if len(raws) != 24:
        raise ValueError(f"Expected 24 raw PNG sheets, found {len(raws)}")
    args.output.mkdir(parents=True, exist_ok=True)
    for stale in args.output.glob("*.tmp.png"):
        stale.unlink()
    records = [normalize(path, args.output / path.name, args.cell_size, args.gutter, args.seam_inset) for path in raws]
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps({"status": "PASS", "sheets": records}, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PASS", "raw_sheets": len(records), "normalized_sheets": len(records)}, indent=2))


if __name__ == "__main__":
    main()
