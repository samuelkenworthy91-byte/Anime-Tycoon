#!/usr/bin/env python3
"""Build a deterministic visual-QC pack for every live cast portrait.

This script is intentionally read-only with respect to runtime artwork. It:
- reads the actual selectable cast from src/engine/generated/castV3.json
- requires exactly 432 unique cast IDs and image paths
- opens every referenced runtime portrait under public/
- records format, size, file size and SHA-256
- emits a CSV seeded as PENDING_VISUAL_QC
- emits labelled 4x4 contact sheets for anatomy review

It does NOT attempt semantic anatomy detection and it never rewrites runtime art.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont, ImageOps

EXPECTED_CAST = 432
EXPECTED_SIZE = (512, 512)
CONTACT_COLUMNS = 4
CONTACT_ROWS = 4
CONTACT_BATCH = CONTACT_COLUMNS * CONTACT_ROWS
THUMB = 236
LABEL_H = 58
CELL_W = 256
CELL_H = THUMB + LABEL_H


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def runtime_path(public_dir: Path, img: str) -> Path:
    clean = img[1:] if img.startswith("/") else img
    return public_dir / clean


def short_label(member: dict[str, Any]) -> tuple[str, str]:
    line1 = str(member["id"])
    line2 = f'{member.get("role", "?")} · {member.get("type", "?")}'
    return line1, line2


def make_contact_sheet(members: list[dict[str, Any]], public_dir: Path, destination: Path) -> None:
    sheet = Image.new("RGB", (CONTACT_COLUMNS * CELL_W, CONTACT_ROWS * CELL_H), "white")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for index, member in enumerate(members):
        col = index % CONTACT_COLUMNS
        row = index // CONTACT_COLUMNS
        x0 = col * CELL_W
        y0 = row * CELL_H
        path = runtime_path(public_dir, str(member["img"]))
        with Image.open(path) as source:
            image = source.convert("RGB")
            fitted = ImageOps.contain(image, (THUMB, THUMB), Image.Resampling.LANCZOS)
        px = x0 + (CELL_W - fitted.width) // 2
        py = y0 + (THUMB - fitted.height) // 2
        sheet.paste(fitted, (px, py))
        draw.rectangle((x0, y0, x0 + CELL_W - 1, y0 + CELL_H - 1), outline="black", width=1)
        line1, line2 = short_label(member)
        draw.text((x0 + 8, y0 + THUMB + 7), line1, fill="black", font=font)
        draw.text((x0 + 8, y0 + THUMB + 25), line2, fill="black", font=font)

    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, "JPEG", quality=92, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    root = args.root.resolve()
    public_dir = root / "public"
    runtime_json = root / "src/engine/generated/castV3.json"
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)

    payload = json.loads(runtime_json.read_text(encoding="utf-8"))
    cast = payload.get("cast")
    if not isinstance(cast, list):
        raise ValueError("castV3.json does not contain a cast array")
    if len(cast) != EXPECTED_CAST:
        raise ValueError(f"Expected {EXPECTED_CAST} live cast entries, found {len(cast)}")

    ids = [str(member["id"]) for member in cast]
    paths = [str(member["img"]) for member in cast]
    if len(set(ids)) != EXPECTED_CAST:
        raise ValueError("Live cast IDs are not unique")
    if len(set(paths)) != EXPECTED_CAST:
        raise ValueError("Live cast image paths are not unique")

    rows: list[dict[str, Any]] = []
    invalid: list[str] = []
    source_counts: dict[str, int] = {"v2": 0, "v3": 0, "other": 0}

    for ordinal, member in enumerate(cast, start=1):
        img = str(member["img"])
        path = runtime_path(public_dir, img)
        if "/v2/" in f"/{img}":
            source_set = "v2"
        elif "/v3/" in f"/{img}":
            source_set = "v3"
        else:
            source_set = "other"
        source_counts[source_set] += 1

        if not path.is_file():
            invalid.append(f"missing:{img}")
            rows.append({
                "ordinal": ordinal,
                "id": member["id"],
                "name": member.get("name", ""),
                "role": member.get("role", ""),
                "type": member.get("type", ""),
                "species": member.get("species", ""),
                "img": img,
                "source_set": source_set,
                "format": "MISSING",
                "width": "",
                "height": "",
                "bytes": "",
                "sha256": "",
                "visual_status": "BLOCKED_FILE_MISSING",
                "anatomy_issue": "",
                "repair_action": "",
                "review_notes": "",
            })
            continue

        with Image.open(path) as image:
            image.load()
            fmt = image.format or ""
            width, height = image.size

        if fmt != "WEBP" or (width, height) != EXPECTED_SIZE:
            invalid.append(f"invalid:{img}:{fmt}:{width}x{height}")

        rows.append({
            "ordinal": ordinal,
            "id": member["id"],
            "name": member.get("name", ""),
            "role": member.get("role", ""),
            "type": member.get("type", ""),
            "species": member.get("species", ""),
            "img": img,
            "source_set": source_set,
            "format": fmt,
            "width": width,
            "height": height,
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
            "visual_status": "PENDING_VISUAL_QC",
            "anatomy_issue": "",
            "repair_action": "",
            "review_notes": "",
        })

    fieldnames = list(rows[0].keys())
    with (out / "CAST_ANATOMY_QC.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)

    contacts = out / "contact_sheets"
    for start in range(0, len(cast), CONTACT_BATCH):
        subset = cast[start : start + CONTACT_BATCH]
        first = start + 1
        last = start + len(subset)
        make_contact_sheet(subset, public_dir, contacts / f"cast_{first:03d}_{last:03d}.jpg")

    summary = {
        "status": "READY_FOR_VISUAL_QC" if not invalid else "STRUCTURAL_ERRORS",
        "live_cast_count": len(cast),
        "unique_ids": len(set(ids)),
        "unique_image_paths": len(set(paths)),
        "source_counts": source_counts,
        "expected_runtime_size": list(EXPECTED_SIZE),
        "contact_sheet_count": (len(cast) + CONTACT_BATCH - 1) // CONTACT_BATCH,
        "structural_errors": invalid,
        "note": "No semantic anatomy verdict is produced automatically. Every contact-sheet cell requires human visual review.",
    }
    (out / "SUMMARY.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(summary, indent=2))
    if invalid:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
