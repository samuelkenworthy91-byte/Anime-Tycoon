#!/usr/bin/env python3
"""Detect Cast V2 black grids, crop deterministic cells, and build square WebP assets.

Identity comes exclusively from CAST_V2_VISUAL_MANIFEST.csv. No OCR or visual
identity inference is used. Masters are read-only inputs and are never overwritten.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageOps, ImageStat


CELLS = ("A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4")


@dataclass(frozen=True)
class Band:
    start: int
    end: int
    black_ratio: float


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def contiguous(indices: Iterable[int]) -> list[tuple[int, int]]:
    groups: list[tuple[int, int]] = []
    for value in indices:
        if not groups or value > groups[-1][1] + 1:
            groups.append((value, value))
        else:
            groups[-1] = (groups[-1][0], value)
    return groups


def black_ratios(image: Image.Image, axis: str, threshold: int = 28) -> list[float]:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    if axis == "x":
        return [sum(max(pixels[x, y]) <= threshold for y in range(height)) / height for x in range(width)]
    return [sum(max(pixels[x, y]) <= threshold for x in range(width)) / width for y in range(height)]


def locate_band(ratios: list[float], expected: float, radius: int, minimum_ratio: float) -> Band:
    centre = round(expected)
    lo = max(0, centre - radius)
    hi = min(len(ratios) - 1, centre + radius)
    qualifying = [index for index in range(lo, hi + 1) if ratios[index] >= minimum_ratio]
    groups = contiguous(qualifying)
    if not groups:
        best = max(range(lo, hi + 1), key=lambda index: ratios[index])
        raise ValueError(f"No qualifying black divider near {centre}; best ratio {ratios[best]:.3f} at {best}")
    start, end = max(groups, key=lambda group: (sum(ratios[group[0]:group[1] + 1]) / (group[1] - group[0] + 1), group[1] - group[0] + 1))
    return Band(start, end, max(ratios[start:end + 1]))


def detect_grid(image: Image.Image) -> tuple[list[Band], list[Band]]:
    width, height = image.size
    x_ratios = black_ratios(image, "x")
    y_ratios = black_ratios(image, "y")
    x_radius = max(8, round(width * 0.045))
    y_radius = max(8, round(height * 0.065))
    vertical = [locate_band(x_ratios, width * index / 4, x_radius, 0.62) for index in range(5)]
    horizontal = [locate_band(y_ratios, height * index / 2, y_radius, 0.62) for index in range(3)]
    if any(a.end >= b.start for a, b in zip(vertical, vertical[1:])):
        raise ValueError("Overlapping vertical divider bands")
    if any(a.end >= b.start for a, b in zip(horizontal, horizontal[1:])):
        raise ValueError("Overlapping horizontal divider bands")
    cell_widths = [vertical[index + 1].start - vertical[index].end - 1 for index in range(4)]
    cell_heights = [horizontal[index + 1].start - horizontal[index].end - 1 for index in range(2)]
    if min(cell_widths) <= 0 or min(cell_heights) <= 0:
        raise ValueError("Detected an empty cell")
    if max(cell_widths) - min(cell_widths) > max(8, round(width * 0.025)):
        raise ValueError(f"Unequal cell widths: {cell_widths}")
    if max(cell_heights) - min(cell_heights) > max(8, round(height * 0.025)):
        raise ValueError(f"Unequal cell heights: {cell_heights}")
    return vertical, horizontal


def corner_fill(image: Image.Image) -> tuple[int, int, int]:
    width, height = image.size
    sample = max(8, min(width, height) // 12)
    patches = [
        image.crop((0, 0, sample, sample)), image.crop((width - sample, 0, width, sample)),
        image.crop((0, height - sample, sample, height)), image.crop((width - sample, height - sample, width, height)),
    ]
    merged = Image.new("RGB", (sample * 4, sample))
    for index, patch in enumerate(patches):
        merged.paste(patch.convert("RGB"), (index * sample, 0))
    return tuple(round(value) for value in ImageStat.Stat(merged).median[:3])


def normalize_square(image: Image.Image, size: int) -> Image.Image:
    rgb = image.convert("RGB")
    contained = ImageOps.contain(rgb, (size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (size, size), corner_fill(rgb))
    canvas.paste(contained, ((size - contained.width) // 2, (size - contained.height) // 2))
    return canvas


def load_manifest(path: Path) -> dict[str, list[dict[str, str]]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if len(rows) != 192 or len({row["id"] for row in rows}) != 192:
        raise ValueError("Manifest must contain exactly 192 unique IDs")
    by_sheet: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        by_sheet.setdefault(row["sheet"], []).append(row)
    for sheet, members in by_sheet.items():
        if [member["cell"] for member in members] != list(CELLS):
            raise ValueError(f"{sheet} cells are not ordered A1-A4/B1-B4")
    if len(by_sheet) != 24:
        raise ValueError("Manifest must contain exactly 24 sheets")
    return by_sheet


def process_sheet(master: Path, members: list[dict[str, str]], png_dir: Path, webp_dir: Path, size: int, quality: int) -> dict:
    with Image.open(master) as source:
        source.load()
        image = source.convert("RGB")
    vertical, horizontal = detect_grid(image)
    sheet_result = {
        "sheet": members[0]["sheet"], "master": str(master), "master_sha256": sha256(master),
        "master_width": image.width, "master_height": image.height,
        "vertical_bands": [asdict(band) for band in vertical], "horizontal_bands": [asdict(band) for band in horizontal],
        "crops": [],
    }
    png_dir.mkdir(parents=True, exist_ok=True)
    webp_dir.mkdir(parents=True, exist_ok=True)
    for index, member in enumerate(members):
        row = 0 if index < 4 else 1
        col = index % 4
        bounds = (vertical[col].end + 1, horizontal[row].end + 1, vertical[col + 1].start, horizontal[row + 1].start)
        crop = image.crop(bounds)
        png_name = Path(member["crop_filename"]).with_suffix(".png").name
        png_path = png_dir / png_name
        webp_path = webp_dir / member["crop_filename"]
        crop.save(png_path, "PNG", optimize=True)
        normalized = normalize_square(crop, size)
        normalized.save(webp_path, "WEBP", quality=quality, method=6, exact=True)
        sheet_result["crops"].append({
            "cell": member["cell"], "cast_id": member["id"], "name": member["name"], "bounds": bounds,
            "source_width": crop.width, "source_height": crop.height, "png": str(png_path), "png_sha256": sha256(png_path),
            "webp": str(webp_path), "webp_sha256": sha256(webp_path), "width": size, "height": size,
        })
    return sheet_result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--masters", type=Path, required=True)
    parser.add_argument("--png-crops", type=Path, required=True)
    parser.add_argument("--webp", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--sheet", help="Optional uppercase manifest sheet ID")
    parser.add_argument("--size", type=int, default=512)
    parser.add_argument("--quality", type=int, default=90)
    args = parser.parse_args()
    manifest = load_manifest(args.manifest)
    selected = [args.sheet] if args.sheet else list(manifest)
    results = []
    for sheet in selected:
        if sheet not in manifest:
            raise ValueError(f"Unknown sheet {sheet}")
        master = args.masters / f"{sheet.lower()}.png"
        if not master.exists():
            raise FileNotFoundError(master)
        results.append(process_sheet(master, manifest[sheet], args.png_crops, args.webp, args.size, args.quality))
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps({"status": "PASS", "sheets": results}, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PASS", "processed_sheets": len(results), "processed_crops": sum(len(item["crops"]) for item in results)}, indent=2))


if __name__ == "__main__":
    main()
