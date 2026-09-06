#!/usr/bin/env python3
"""Validate Cast V2 masters/runtime portraits and emit checksum source data."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps, ImageStat


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def average_hash(image: Image.Image, size: int = 16) -> int:
    grey = ImageOps.grayscale(image).resize((size, size), Image.Resampling.LANCZOS)
    values = list(grey.get_flattened_data())
    mean = sum(values) / len(values)
    result = 0
    for value in values:
        result = (result << 1) | int(value >= mean)
    return result


def hamming(left: int, right: int) -> int:
    return (left ^ right).bit_count()


def load_manifest(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if len(rows) != 192 or len({row["id"] for row in rows}) != 192:
        raise ValueError("Manifest is not the approved 192-ID structure")
    return rows


def create_mobile_contacts(rows: list[dict[str, str]], runtime: Path, destination: Path) -> list[str]:
    destination.mkdir(parents=True, exist_ok=True)
    outputs = []
    for batch_index in range(3):
        group = rows[batch_index * 64:(batch_index + 1) * 64]
        canvas = Image.new("RGB", (1024, 1024), "#15181D")
        for index, row in enumerate(group):
            with Image.open(runtime / row["crop_filename"]) as image:
                tile = ImageOps.fit(image.convert("RGB"), (124, 124), Image.Resampling.LANCZOS)
            x = (index % 8) * 128 + 2
            y = (index // 8) * 128 + 2
            canvas.paste(tile, (x, y))
        draw = ImageDraw.Draw(canvas)
        for position in range(0, 1025, 128):
            draw.line((position, 0, position, 1024), fill="#000000", width=4)
            draw.line((0, position, 1024, position), fill="#000000", width=4)
        output = destination / f"cast_v2_mobile_audit_batch_{batch_index + 1}.png"
        canvas.save(output, "PNG", optimize=True)
        outputs.append(str(output))
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--masters", type=Path, required=True)
    parser.add_argument("--runtime", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--checksum-source", type=Path, required=True)
    parser.add_argument("--mobile-previews", type=Path, required=True)
    parser.add_argument("--qc-decisions", type=Path)
    parser.add_argument("--expected-size", type=int, default=512)
    args = parser.parse_args()

    rows = load_manifest(args.manifest)
    sheet_names = list(dict.fromkeys(row["sheet"] for row in rows))
    expected_masters = {f"{sheet.lower()}.png" for sheet in sheet_names}
    actual_masters = {path.name for path in args.masters.glob("*.png") if not path.name.endswith(".tmp.png")}
    expected_runtime = {row["crop_filename"] for row in rows}
    actual_runtime = {path.name for path in args.runtime.glob("*") if path.is_file()}
    errors = []
    if actual_masters != expected_masters:
        errors.append({"master_missing": sorted(expected_masters - actual_masters), "master_unexpected": sorted(actual_masters - expected_masters)})
    if actual_runtime != expected_runtime:
        errors.append({"runtime_missing": sorted(expected_runtime - actual_runtime), "runtime_unexpected": sorted(actual_runtime - expected_runtime)})

    decisions = {"sheets": {}, "characters": {}}
    if args.qc_decisions and args.qc_decisions.exists():
        decisions = json.loads(args.qc_decisions.read_text(encoding="utf-8"))
    checksum_rows = []
    master_records = []
    for sheet in sheet_names:
        path = args.masters / f"{sheet.lower()}.png"
        if not path.exists():
            continue
        try:
            with Image.open(path) as image:
                image.verify()
            with Image.open(path) as image:
                width, height, fmt = image.width, image.height, image.format
        except Exception as exc:
            errors.append({"unreadable_master": path.name, "error": str(exc)})
            continue
        if fmt != "PNG" or path.stat().st_size == 0:
            errors.append({"invalid_master": path.name, "format": fmt, "bytes": path.stat().st_size})
        qc = decisions.get("sheets", {}).get(sheet, {}).get("status", "PENDING")
        master_records.append({"sheet": sheet, "filename": path.name, "width": width, "height": height, "format": fmt, "sha256": sha256(path), "qc_status": qc})
        checksum_rows.append({"asset_type": "master_sheet", "sheet": sheet, "cell": "", "cast_id": "", "filename": path.name, "sha256": sha256(path), "width": width, "height": height, "format": fmt, "qc_status": qc})

    portrait_records = []
    hashes = {}
    exact_hashes = {}
    for row in rows:
        path = args.runtime / row["crop_filename"]
        if not path.exists():
            continue
        try:
            with Image.open(path) as image:
                image.load()
                width, height, fmt = image.width, image.height, image.format
                entropy = round(ImageStat.Stat(ImageOps.grayscale(image)).rms[0], 3)
                hashes[row["id"]] = average_hash(image)
        except Exception as exc:
            errors.append({"unreadable_runtime": path.name, "error": str(exc)})
            continue
        digest = sha256(path)
        exact_hashes.setdefault(digest, []).append(row["id"])
        if fmt != "WEBP" or width != args.expected_size or height != args.expected_size or path.stat().st_size == 0:
            errors.append({"invalid_runtime": path.name, "format": fmt, "width": width, "height": height, "bytes": path.stat().st_size})
        qc = decisions.get("characters", {}).get(row["id"], {}).get("status", "PENDING")
        record = {"sheet": row["sheet"], "cell": row["cell"], "cast_id": row["id"], "filename": path.name, "width": width, "height": height, "format": fmt, "sha256": digest, "qc_status": qc, "greyscale_rms": entropy}
        portrait_records.append(record)
        checksum_rows.append({key: record[key] for key in ("sheet", "cell", "cast_id", "filename", "sha256", "width", "height", "format", "qc_status")} | {"asset_type": "runtime_portrait"})
    duplicate_content = [ids for ids in exact_hashes.values() if len(ids) > 1]
    if duplicate_content:
        errors.append({"byte_identical_portraits": duplicate_content})
    nearest = sorted(
        ({"left": left, "right": right, "distance": hamming(hashes[left], hashes[right])}
         for index, left in enumerate(hashes) for right in list(hashes)[index + 1:]),
        key=lambda item: item["distance"],
    )[:30]
    mobile_contacts = create_mobile_contacts(rows, args.runtime, args.mobile_previews) if len(portrait_records) == 192 else []
    all_qc_pass = len(master_records) == 24 and len(portrait_records) == 192 and all(item["qc_status"] == "PASS" for item in master_records + portrait_records)
    result = {
        "status": "PASS" if not errors and all_qc_pass else ("STRUCTURAL_PASS_QC_PENDING" if not errors else "FAIL"),
        "errors": errors,
        "master_sheets": len(master_records), "runtime_portraits": len(portrait_records),
        "unique_master_hashes": len({item["sha256"] for item in master_records}),
        "unique_runtime_hashes": len({item["sha256"] for item in portrait_records}),
        "all_dimensions": sorted({f'{item["width"]}x{item["height"]}' for item in portrait_records}),
        "formats": sorted({item["format"] for item in portrait_records}),
        "all_qc_pass": all_qc_pass, "nearest_perceptual_pairs": nearest,
        "mobile_contact_sheets": mobile_contacts,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.checksum_source.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    args.checksum_source.write_text(json.dumps(checksum_rows, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: result[key] for key in ("status", "master_sheets", "runtime_portraits", "unique_master_hashes", "unique_runtime_hashes", "all_dimensions", "formats", "all_qc_pass")}, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
