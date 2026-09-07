#!/usr/bin/env python3
"""Crop the four Cast V3 type-pair closure sheets into runtime WebPs.

The sheet order is canonical: lead, sidekick, mascot, villain; cells run
left-to-right across the top row, then left-to-right across the bottom row.
Pure-black divider runs are detected and excluded from every crop.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
from pathlib import Path

from PIL import Image


ROLE_IDS = {
    "lead": [f"cv3_lead_{index:03d}" for index in range(53, 61)],
    "sidekick": [f"cv3_sidekick_{index:03d}" for index in range(53, 61)],
    "mascot": [f"cv3_mascot_{index:03d}" for index in range(53, 61)],
    "villain": [f"cv3_villain_{index:03d}" for index in range(53, 61)],
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def runs(values: list[int]) -> list[tuple[int, int]]:
    grouped: list[list[int]] = []
    for value in values:
        if not grouped or value != grouped[-1][-1] + 1:
            grouped.append([value])
        else:
            grouped[-1].append(value)
    return [(group[0], group[-1]) for group in grouped if len(group) >= 2]


def divider_runs(image: Image.Image, axis: str) -> list[tuple[int, int]]:
    width, height = image.size
    limit = width if axis == "x" else height
    cross = height if axis == "x" else width
    matches: list[int] = []
    pixels = image.load()
    for position in range(limit):
        dark = 0
        for other in range(cross):
            pixel = pixels[position, other] if axis == "x" else pixels[other, position]
            if max(pixel) <= 20:
                dark += 1
        if dark / cross >= 0.90:
            matches.append(position)
    return runs(matches)


def cell_boxes(image: Image.Image) -> list[tuple[int, int, int, int]]:
    width, height = image.size
    x_runs = divider_runs(image, "x")
    y_runs = divider_runs(image, "y")
    if len(x_runs) != 5 or len(y_runs) != 3:
        raise ValueError(
            f"Expected five vertical and three horizontal black divider runs, "
            f"found x={x_runs}, y={y_runs} in {width}x{height} sheet"
        )
    xs = [(x_runs[index][1] + 1, x_runs[index + 1][0]) for index in range(4)]
    ys = [(y_runs[index][1] + 1, y_runs[index + 1][0]) for index in range(2)]
    return [(x0, y0, x1, y1) for y0, y1 in ys for x0, x1 in xs]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sheet", action="append", required=True, help="role=/absolute/or/relative/path.png")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--qc", default="PENDING_VISUAL_QC")
    args = parser.parse_args()

    sheets: dict[str, Path] = {}
    for value in args.sheet:
        role, raw_path = value.split("=", 1)
        if role not in ROLE_IDS or role in sheets:
            raise ValueError(f"Invalid or duplicate sheet role: {role}")
        sheets[role] = Path(raw_path)
    if set(sheets) != set(ROLE_IDS):
        raise ValueError(f"Expected sheets for {sorted(ROLE_IDS)}, got {sorted(sheets)}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    new_rows: list[dict[str, str | int]] = []
    for sheet_number, role in enumerate(("lead", "sidekick", "mascot", "villain"), start=27):
        source_path = sheets[role]
        with Image.open(source_path) as source:
            image = source.convert("RGB")
            boxes = cell_boxes(image)
            for cell, (member_id, box) in enumerate(zip(ROLE_IDS[role], boxes, strict=True), start=1):
                crop = image.crop(box).resize((512, 512), Image.Resampling.LANCZOS)
                destination = args.output_dir / f"{member_id}.webp"
                crop.save(destination, "WEBP", quality=92, method=6)
                with Image.open(destination) as check:
                    check.load()
                    if check.size != (512, 512) or check.format != "WEBP":
                        raise ValueError(f"Runtime verification failed for {destination}")
                new_rows.append({
                    "id": member_id,
                    "filename": destination.name,
                    "sheet": f"cast_v3_sheet_{sheet_number:02d}",
                    "cell": cell,
                    "source_width": image.width,
                    "source_height": image.height,
                    "crop_box": str(box),
                    "source_cell_width": box[2] - box[0],
                    "source_cell_height": box[3] - box[1],
                    "width": 512,
                    "height": 512,
                    "sha256": sha256(destination),
                    "qc": args.qc,
                })

    with args.manifest.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames
        existing_ids = {row["id"] for row in reader}
    if not fieldnames:
        raise ValueError("Art manifest has no header")
    new_ids = {str(row["id"]) for row in new_rows}
    overlap = existing_ids & new_ids
    if overlap:
        raise ValueError(f"Refusing to replace existing manifest rows: {sorted(overlap)}")
    with args.manifest.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writerows(new_rows)
    print(f"Wrote {len(new_rows)} runtime portraits and {len(new_rows)} manifest rows.")


if __name__ == "__main__":
    main()
