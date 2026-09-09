#!/usr/bin/env python3
"""Audit Cast V4 staging mechanics against the actual uploaded PNG pool.

This script is intentionally conservative: it records same-stable-ID filename
candidates but never treats them as substitutions when the locked manifest path
is absent. That preserves the Phase 1 hard gate in the Cast V4 runtime handoff.
"""

from __future__ import annotations

import csv
import hashlib
import re
import struct
from collections import Counter, defaultdict
from pathlib import Path

GAME_ROOT = Path(__file__).resolve().parents[1]
STAGING = GAME_ROOT / "art_src" / "cast_v4_upload_staging"
OUT_DIR = GAME_ROOT / "docs" / "cast-v4"
AUDIT_CSV = OUT_DIR / "CAST_V4_SOURCE_AUDIT.csv"
SUMMARY_MD = OUT_DIR / "CAST_V4_SOURCE_AUDIT_SUMMARY.md"
EXPECTED_POOL_COUNT = 336
EXPECTED_MECHANICS_COUNT = 304

BATCHES = (
    "batch_01_001-080",
    "batch_02_081-160",
    "batch_03_161-240",
    "batch_04_241-304",
)


def png_dimensions(path: Path) -> tuple[int, int]:
    with path.open("rb") as handle:
        header = handle.read(24)
    if len(header) < 24 or header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        raise ValueError(f"Not a valid PNG: {path}")
    return struct.unpack(">II", header[16:24])


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable_id_from_name(name: str) -> str | None:
    match = re.fullmatch(r"\d+__(.+)\.png", name)
    return match.group(1) if match else None


def main() -> int:
    mechanics: list[dict[str, str]] = []
    for batch in BATCHES:
        manifest = STAGING / batch / "CAST_V4_MECHANICS.csv"
        if not manifest.is_file():
            raise FileNotFoundError(manifest)
        with manifest.open(newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                row["_batch_dir"] = batch
                mechanics.append(row)

    pngs = sorted(STAGING.glob("**/*.png"))
    actual: list[dict[str, object]] = []
    by_rel: dict[str, dict[str, object]] = {}
    by_stable_id: dict[str | None, list[dict[str, object]]] = defaultdict(list)
    by_sha: dict[str, list[str]] = defaultdict(list)

    for path in pngs:
        rel = path.relative_to(STAGING).as_posix()
        width, height = png_dimensions(path)
        digest = sha256(path)
        info: dict[str, object] = {
            "path": rel,
            "name": path.name,
            "stable_id": stable_id_from_name(path.name),
            "sha256": digest,
            "width": width,
            "height": height,
        }
        actual.append(info)
        by_rel[rel] = info
        by_stable_id[info["stable_id"]].append(info)
        by_sha[digest].append(rel)

    mechanics_ids = {row["id"] for row in mechanics}
    audit_rows: list[dict[str, object]] = []
    missing_ids: list[dict[str, str]] = []

    for row in mechanics:
        expected_rel = f'{row["_batch_dir"]}/{row["filename"]}'
        exact = by_rel.get(expected_rel)
        candidates = by_stable_id.get(row["id"], [])

        if exact is not None:
            source = exact
            status = "manifest_exact"
            selected = "TRUE"
            notes = "Manifest filename and batch path present exactly."
        elif len(candidates) == 1:
            source = candidates[0]
            status = "filename_mismatch_candidate"
            selected = "FALSE"
            notes = (
                f'Manifest path absent; same stable ID exists as {source["path"]}. '
                "Integration halted per Phase 1 gate; no substitution assumed."
            )
        elif not candidates:
            source = None
            status = "missing_stable_id_portrait"
            selected = "FALSE"
            notes = (
                "Manifest path absent and no PNG containing this stable ID exists "
                "anywhere in staging. Hard Phase 1 blocker."
            )
            missing_ids.append(row)
        else:
            source = candidates[0]
            status = "ambiguous_stable_id_candidates"
            selected = "FALSE"
            notes = (
                f'{len(candidates)} PNGs contain this stable ID. '
                "Hard Phase 1 blocker; no candidate selected."
            )

        audit_rows.append(
            {
                "stable_id": row["id"],
                "manifest_filename": row["filename"],
                "actual_path": source["path"] if source else "",
                "source_sha256": source["sha256"] if source else "",
                "source_width": source["width"] if source else "",
                "source_height": source["height"] if source else "",
                "selected": selected,
                "donor": "FALSE",
                "replacement_for": "",
                "status": status,
                "notes": notes,
            }
        )

    for info in actual:
        if info["stable_id"] not in mechanics_ids:
            audit_rows.append(
                {
                    "stable_id": "",
                    "manifest_filename": "",
                    "actual_path": info["path"],
                    "source_sha256": info["sha256"],
                    "source_width": info["width"],
                    "source_height": info["height"],
                    "selected": "FALSE",
                    "donor": "TRUE",
                    "replacement_for": "",
                    "status": "donor_alternate",
                    "notes": (
                        "PNG is not referenced by any of the 304 mechanics rows; "
                        "retained as donor/alternate. No substitution assigned because "
                        "the Phase 1 gate failed."
                    ),
                }
            )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "stable_id",
        "manifest_filename",
        "actual_path",
        "source_sha256",
        "source_width",
        "source_height",
        "selected",
        "donor",
        "replacement_for",
        "status",
        "notes",
    ]
    with AUDIT_CSV.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(audit_rows)

    statuses = Counter(str(row["status"]) for row in audit_rows)
    duplicate_groups = {digest: paths for digest, paths in by_sha.items() if len(paths) > 1}
    absent_manifest_paths = statuses["filename_mismatch_candidate"] + statuses["missing_stable_id_portrait"] + statuses["ambiguous_stable_id_candidates"]
    donors = statuses["donor_alternate"]

    lines = [
        "# Cast V4 source audit — Phase 1 blocker",
        "",
        "This audit was generated from the actual repository staging tree. It does not assign donor substitutions.",
        "",
        f"- Source PNGs found: **{len(pngs)}** (handoff/README expectation: {EXPECTED_POOL_COUNT})",
        f"- Mechanics records: **{len(mechanics)} / {EXPECTED_MECHANICS_COUNT}**",
        f"- Exact manifest paths present: **{statuses['manifest_exact']} / {EXPECTED_MECHANICS_COUNT}**",
        f"- Manifest paths absent: **{absent_manifest_paths} / {EXPECTED_MECHANICS_COUNT}**",
        f"- Same-stable-ID candidates under a different path: **{statuses['filename_mismatch_candidate']}**",
        f"- Locked stable IDs with no portrait anywhere in staging: **{statuses['missing_stable_id_portrait']}**",
        f"- Donor/alternate PNGs retained: **{donors}**",
        f"- Exact duplicate-byte PNG groups: **{len(duplicate_groups)}**",
        "",
        "## Hard-missing locked stable IDs",
        "",
    ]
    if missing_ids:
        lines.extend(f'- `{row["id"]}` — expected `{row["_batch_dir"]}/{row["filename"]}`' for row in missing_ids)
    else:
        lines.append("None.")

    lines += [
        "",
        "## Gate decision",
        "",
        "**BLOCKED.** The Cast V4 runtime handoff explicitly requires every manifest-referenced portrait to exist before visual mapping/identity/runtime activation, and says to stop rather than guess when one is absent. The missing source pool must be restored or the locked mechanics manifests must be deliberately corrected by an authoritative follow-up before Phase 2 can begin.",
        "",
        "The 253 same-stable-ID filename candidates are recorded in `CAST_V4_SOURCE_AUDIT.csv` for diagnosis only; they have not been treated as approved substitutions.",
        "",
    ]
    SUMMARY_MD.write_text("\n".join(lines), encoding="utf-8")

    print(f"Source PNGs: {len(pngs)}")
    print(f"Mechanics: {len(mechanics)}")
    print(f"Exact manifest paths: {statuses['manifest_exact']}")
    print(f"Same-ID path mismatches: {statuses['filename_mismatch_candidate']}")
    print(f"Missing stable-ID portraits: {statuses['missing_stable_id_portrait']}")
    print(f"Donors: {donors}")
    print(f"Duplicate byte groups: {len(duplicate_groups)}")
    print("BLOCKED" if missing_ids or len(pngs) != EXPECTED_POOL_COUNT or absent_manifest_paths else "READY")

    return 1 if missing_ids or len(pngs) != EXPECTED_POOL_COUNT or absent_manifest_paths else 0


if __name__ == "__main__":
    raise SystemExit(main())
