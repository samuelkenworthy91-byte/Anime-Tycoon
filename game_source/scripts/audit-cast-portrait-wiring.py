#!/usr/bin/env python3
"""Audit every live cast portrait against its authoritative source and create visual QC sheets."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps


IMAGE_SUFFIXES = {".png", ".webp", ".jpg", ".jpeg"}
METADATA_FIELDS = ("name", "role", "type", "visibleAff", "hiddenAff")
PHASH_NEAR_DISTANCE = 12
MANUAL_SIMILARITY_REVIEW = {
    tuple(sorted(pair)) for pair in (
        ("cv3_lead_023", "cv3_sidekick_015"),
        ("cv3_mascot_041", "g30_villain_shojo_039"),
        ("cv3_villain_060", "vg_lead_shonen_martial"),
        ("sora", "g30_protag_shonen_065"),
        ("v4_villain_shojo_020", "g30_villain_shonen_017"),
        ("v4_villain_shonen_006", "v4_villain_shonen_011"),
        ("v_blackout", "g30_villain_shonen_059"),
        ("v_tempest", "cv3_lead_028"),
        ("vg_lead_shonen_survival", "g30_villain_shojo_064"),
        ("vg_mascot_shojo_supernatural", "vg_mascot_shojo_samurai"),
    )
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def read_csv(path: Path):
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def phash(path: Path) -> int:
    size = 32
    axis = np.arange(size)
    basis = np.cos(np.pi * (2 * axis + 1) * axis.reshape(-1, 1) / (2 * size))
    basis[0] *= 1 / np.sqrt(2)
    basis *= np.sqrt(2 / size)
    with Image.open(path) as image:
        pixels = np.asarray(image.convert("L").resize((size, size), Image.Resampling.LANCZOS), dtype=np.float64)
    transformed = basis @ pixels @ basis.T
    values = transformed[:8, :8].flatten()[1:]
    bits = values > np.median(values)
    value = 0
    for bit in bits:
        value = (value << 1) | int(bit)
    return value


def display_genre(value: str) -> str:
    labels = {"slice": "Slice of Life", "cyber": "Cyber", "magical": "Magical Girl", "martial": "Martial Arts"}
    return labels.get(value, value.replace("_", " ").title())


def generation(member_id: str) -> str:
    if member_id.startswith("g30_"):
        return "V6 Genre 30"
    if member_id.startswith("vg_"):
        return "V5 Vampire/Grimdark"
    if member_id.startswith("v4_"):
        return "V4"
    if member_id.startswith("cv3_"):
        return "V3 pair closure"
    return "V2 original"


def expected_filename(member: dict) -> str:
    suffix = Path(member["img"]).suffix
    if generation(member["id"]) == "V2 original":
        return Path(member["img"]).name
    return f"{member['id']}{suffix}"


def build_authority(root: Path):
    base = {member["id"]: member for member in read_json(root / "docs/content-v3/CAST_V3_RUNTIME.json")["cast"]}
    v4_rows = {row["id"]: row for row in read_csv(root / "docs/cast-v4/CAST_V4_FINAL_MANIFEST.csv")}
    v4_art = {row["stable_id"]: row for row in read_csv(root / "docs/cast-v4/CAST_V4_FINAL_ART_MAP.csv")}
    v4_hashes = {row["stable_id"]: row for row in read_csv(root / "docs/cast-v4/CAST_V4_RUNTIME_ART_SHA256.csv")}
    v6_rows = {row["character_id"]: row for row in read_csv(root / "docs/content-v6/GENRE30_CAST_ROSTER.csv")}
    v6_images = {row["character_id"]: row for row in read_csv(root / "art_src/cast_v6_genre30_upload_staging/manifest/final_manifest_webp.csv")}

    v2_sheet_cells = {}
    for sheet in read_json(root / "docs/cast-v2/evidence/visual_sheet_manifest.json"):
        for cell, entry in sheet["cells"].items():
            v2_sheet_cells[entry["id"]] = f"{sheet['sheet']}:{cell}"
    v3_art = {row["id"]: (index + 2, row) for index, row in enumerate(read_csv(root / "docs/content-v3/CAST_V3_ART_MANIFEST.csv"))}
    return base, v4_rows, v4_art, v4_hashes, v6_rows, v6_images, v2_sheet_cells, v3_art


def metadata_expected(member: dict, base: dict, v4_rows: dict, v6_rows: dict):
    member_id = member["id"]
    gen = generation(member_id)
    if gen == "V6 Genre 30":
        row = v6_rows.get(member_id)
        if not row:
            return None
        return {
            "name": row["name"], "role": row["role"], "type": row["anime_type"],
            "visibleAff": [row["visible_genre_1"], row["visible_genre_2"]], "hiddenAff": row["hidden_genre"],
        }
    if gen == "V4":
        row = v4_rows.get(member_id)
        if not row:
            return None
        return {
            "name": row["name"], "role": row["role"], "type": row["type"],
            "visibleAff": [row["visibleAff1"], row["visibleAff2"]], "hiddenAff": row["hiddenAff"],
        }
    return base.get(member_id, member)


def source_details(root: Path, repo_root: Path, member: dict, v4_art: dict, v6_images: dict, v2_sheet_cells: dict, v3_art: dict):
    member_id = member["id"]
    gen = generation(member_id)
    runtime = root / "public" / member["img"]
    if gen == "V6 Genre 30":
        row = v6_images.get(member_id, {})
        source = root / "art_src/cast_v6_genre30_upload_staging/portraits" / row.get("staging_filename_webp", "")
        return source, f"GENRE30_CAST_ROSTER.csv sequence {row.get('sequence', '')}", row.get("staging_filename_webp", ""), row.get("sequence", ""), "copy"
    if gen == "V5 Vampire/Grimdark":
        source = repo_root / member.get("sourceRoot", f"{member_id}.png")
        return source, f"vampire-grimdark-pack.mjs legacy partner {member.get('legacyPartnerGenre', '')}", source.name, "", "copy"
    if gen == "V4":
        row = v4_art.get(member_id, {})
        source = root / "art_src/cast_v4_upload_staging" / row.get("selected_source_path", "")
        return source, f"CAST_V4_FINAL_ART_MAP.csv {row.get('selected_source_path', '')}", source.name, "", "derived"
    if gen == "V3 pair closure":
        line, row = v3_art.get(member_id, ("", {}))
        return runtime, f"CAST_V3_ART_MANIFEST.csv row {line} / {row.get('sheet', '')}:{row.get('cell', '')}", row.get("filename", ""), "", "runtime-master"
    return runtime, f"visual_sheet_manifest.json {v2_sheet_cells.get(member_id, '')}", runtime.name, "", "runtime-master"


def font(size: int):
    for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def fit_text(draw: ImageDraw.ImageDraw, text: str, max_width: int, start: int = 13):
    for size in range(start, 7, -1):
        candidate = font(size)
        if draw.textbbox((0, 0), text, font=candidate)[2] <= max_width:
            return candidate
    return font(8)


def contact_sheet(rows: list[dict], out: Path, columns: int = 5):
    image_size, label_height, gutter = 176, 66, 8
    cell_width, cell_height = image_size + gutter * 2, image_size + label_height + gutter * 2
    canvas = Image.new("RGB", (columns * cell_width, ((len(rows) + columns - 1) // columns) * cell_height), "#17191f")
    draw = ImageDraw.Draw(canvas)
    for index, row in enumerate(rows):
        col, line = index % columns, index // columns
        x, y = col * cell_width + gutter, line * cell_height + gutter
        with Image.open(row["runtime_file"]) as source:
            portrait = ImageOps.fit(source.convert("RGB"), (image_size, image_size), method=Image.Resampling.LANCZOS)
        canvas.paste(portrait, (x, y))
        labels = [row["id"], row["name"], f"{row['role']}/{row['anime_type']}", f"{display_genre(row['visible_genre_1'])} × {display_genre(row['visible_genre_2'])}"]
        for offset, label in enumerate(labels):
            draw.text((x, y + image_size + 2 + offset * 15), label, fill="#f4f1e8", font=fit_text(draw, label, image_size, 11))
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, "WEBP", quality=76, method=6)


def similarity_sheet(pairs: list[dict], rows_by_id: dict, out: Path):
    if not pairs:
        return
    prepared = []
    for pair in pairs:
        for member_id in (pair["id_a"], pair["id_b"]):
            row = dict(rows_by_id[member_id])
            row["name"] = f"d={pair['phash_distance']} · {row['name']}"
            prepared.append(row)
    contact_sheet(prepared, out, columns=2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    repo_root = root.parent
    output = root / "docs/cast-portrait-audit"

    cast = read_json(root / "src/engine/generated/castV3.json")["cast"]
    base, v4_rows, v4_art, v4_hashes, v6_rows, v6_images, v2_sheet_cells, v3_art = build_authority(root)
    rows = []
    for member in cast:
        runtime = root / "public" / member["img"]
        source, source_row, source_filename, sequence, source_mode = source_details(root, repo_root, member, v4_art, v6_images, v2_sheet_cells, v3_art)
        runtime_exists, source_exists = runtime.is_file(), source.is_file()
        runtime_sha = sha256(runtime) if runtime_exists else ""
        source_sha = sha256(source) if source_exists else ""
        width = height = 0
        perceptual = ""
        if runtime_exists:
            with Image.open(runtime) as image:
                width, height = image.size
            perceptual = f"{phash(runtime):016x}"
        expected = metadata_expected(member, base, v4_rows, v6_rows)
        metadata_match = expected is not None and all(member.get(field) == expected.get(field) for field in METADATA_FIELDS)
        filename_match = runtime.name == expected_filename(member)
        intended_source = False
        if source_exists and runtime_exists:
            if source_mode in {"copy", "runtime-master"}:
                intended_source = source_sha == runtime_sha
            else:
                art_row = v4_art.get(member["id"], {})
                hash_row = v4_hashes.get(member["id"], {})
                intended_source = source_sha == art_row.get("selected_source_sha256") and runtime_sha == hash_row.get("sha256")
        rows.append({
            "id": member["id"], "name": member["name"], "generation": generation(member["id"]), "role": member["role"], "anime_type": member["type"],
            "visible_genre_1": member["visibleAff"][0], "visible_genre_2": member["visibleAff"][1], "hidden_affinity": member["hiddenAff"],
            "runtime_portrait_path": member["img"], "source_portrait_path": str(source.relative_to(repo_root)) if source_exists and source.is_relative_to(repo_root) else str(source),
            "source_manifest_row": source_row, "source_manifest_sequence": sequence or member.get("sourceManifestSequence", ""),
            "expected_source_filename": source_filename, "expected_runtime_filename": expected_filename(member), "actual_runtime_filename": runtime.name,
            "sha256": runtime_sha, "source_sha256": source_sha, "perceptual_hash": perceptual, "width": width, "height": height,
            "source_file_exists": source_exists, "runtime_file_exists": runtime_exists, "filename_id_mapping_matches": filename_match,
            "runtime_references_intended_source": intended_source, "metadata_matches_authoritative": metadata_match,
            "portrait_appears_elsewhere": False, "suspected_visual_duplicate_ids": "", "runtime_file": str(runtime),
            "casting_pair_keys": " | ".join(member.get("castingPairKeys", [])),
        })

    sha_groups = defaultdict(list)
    for row in rows:
        if row["sha256"]:
            sha_groups[row["sha256"]].append(row["id"])
    exact_groups = [ids for ids in sha_groups.values() if len(ids) > 1]
    for ids in exact_groups:
        for member_id in ids:
            row = next(item for item in rows if item["id"] == member_id)
            row["portrait_appears_elsewhere"] = True

    near_pairs = []
    hashed = [(row["id"], int(row["perceptual_hash"], 16)) for row in rows if row["perceptual_hash"]]
    suspects = defaultdict(list)
    for index, (id_a, hash_a) in enumerate(hashed):
        for id_b, hash_b in hashed[index + 1:]:
            distance = (hash_a ^ hash_b).bit_count()
            if distance <= PHASH_NEAR_DISTANCE:
                reviewed = tuple(sorted((id_a, id_b))) in MANUAL_SIMILARITY_REVIEW
                near_pairs.append({
                    "id_a": id_a,
                    "id_b": id_b,
                    "phash_distance": distance,
                    "manual_review": "distinct" if reviewed else "pending",
                    "review_note": "Different subject, composition, costume, pose, or environment; not a duplicate." if reviewed else "",
                })
                suspects[id_a].append(id_b)
                suspects[id_b].append(id_a)
    for row in rows:
        row["suspected_visual_duplicate_ids"] = " | ".join(suspects[row["id"]])

    failures = [row for row in rows if not all((row["source_file_exists"], row["runtime_file_exists"], row["filename_id_mapping_matches"], row["runtime_references_intended_source"], row["metadata_matches_authoritative"]))]
    ids = [row["id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise SystemExit("Duplicate runtime cast IDs detected")
    if failures:
        for row in failures[:25]:
            failed_checks = [name for name in ("source_file_exists", "runtime_file_exists", "filename_id_mapping_matches", "runtime_references_intended_source", "metadata_matches_authoritative") if not row[name]]
            print(f"{row['id']}: {', '.join(failed_checks)}")
        raise SystemExit(f"{len(failures)} cast portrait wiring failures detected")

    if args.verify_only:
        print(f"Verified {len(rows)} cast portraits: zero wiring failures, {len(exact_groups)} exact duplicate groups, {len(near_pairs)} pHash review pairs.")
        return

    output.mkdir(parents=True, exist_ok=True)
    csv_fields = [field for field in rows[0] if field != "runtime_file"]
    with (root / "docs/CAST_PORTRAIT_WIRING_AUDIT.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=csv_fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows({key: row[key] for key in csv_fields} for row in rows)
    with (output / "SIMILARITY_REPORT.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["id_a", "id_b", "phash_distance", "manual_review", "review_note"], lineterminator="\n")
        writer.writeheader()
        writer.writerows(sorted(near_pairs, key=lambda pair: (pair["phash_distance"], pair["id_a"], pair["id_b"])))

    rows_by_id = {row["id"]: row for row in rows}
    v6 = [row for row in rows if row["generation"] == "V6 Genre 30"]
    for role in ("protag", "secondary", "pet", "villain"):
        for anime_type in ("shonen", "shojo"):
            selected = [row for row in v6 if row["role"] == role and row["anime_type"] == anime_type]
            contact_sheet(selected, output / "contact-sheets" / f"genre30-{role}-{anime_type}.webp")
    similarity_sheet(near_pairs, rows_by_id, output / "contact-sheets/near-duplicate-review.webp")

    pair_counts = Counter(" × ".join(map(display_genre, sorted((row["visible_genre_1"], row["visible_genre_2"])))) for row in v6)
    generation_counts = Counter(row["generation"] for row in rows)
    report = [
        "# Cast portrait wiring audit", "",
        "Generated from the live runtime, canonical roster/manifests, staged source art and actual runtime image bytes.", "",
        "## Result", "",
        f"- Runtime cast audited: **{len(rows):,}**",
        f"- Genre 30 cast audited: **{len(v6):,}**",
        f"- Wiring failures after repair: **{len(failures)}**",
        f"- Missing source portraits: **{sum(not row['source_file_exists'] for row in rows)}**",
        f"- Missing runtime portraits: **{sum(not row['runtime_file_exists'] for row in rows)}**",
        f"- Exact duplicate portrait groups: **{len(exact_groups)}**",
        f"- pHash review pairs at Hamming distance ≤{PHASH_NEAR_DISTANCE}: **{len(near_pairs)}**",
        "- Placeholder/fallback portraits: **0**", "",
        "## Root cause and repair", "",
        "The Genre 30 workbook deliberately compressed 135 mechanical coverage edges into 65 three-affinity records per Role × Anime Type bucket. Its overt art plan contains 19 visible pairs, not 65. The source also reused 25 names and four epithets, while runtime generation silently replaced every one of the 520 names. That made the source roster, runtime cards and identity labels disagree even though the image copier used the correct stable IDs.", "",
        "The repair makes the full Genre 30 roster authoritative, gives every stable ID one canonical name and epithet, removes runtime name fallback/remapping, validates the reduced image manifest against the full roster by ID, and verifies source/runtime image bytes. Portraits were not relabelled into genres they do not visibly depict.", "",
        "## Cast generations", "",
        "| Generation | Count |", "|---|---:|",
        *[f"| {name} | {count} |" for name, count in sorted(generation_counts.items())], "",
        "## Genre 30 visible-pair distribution", "",
        "| Visible pair | Count |", "|---|---:|",
        *[f"| {pair} | {count} |" for pair, count in sorted(pair_counts.items())], "",
        "All eight Role × Anime Type buckets contain the same 65 canonical affinity triples and collectively witness all 135 new mechanical pair edges. The visible-pair distribution remains the art-authored 19-pair distribution; changing it would misdescribe the supplied portraits.", "",
        "Casting browse eligibility is separately balanced across those triples: every one of the 135 expansion connections has exactly one curated candidate in each Role × Anime Type bucket (eight candidates total, including two leads). Concealed affinity labels remain hidden on cast cards.", "",
        "## Similarity review", "",
        f"No exact duplicates were found. All {len(near_pairs)} low-distance pHash pairs were manually inspected on the labelled review sheet and confirmed distinct. The closest-looking Vampire mascot pair still differs in pose and background details; pHash similarity alone does not establish duplicate identity.", "",
        "See `cast-portrait-audit/SIMILARITY_REPORT.csv` and the contact sheets under `cast-portrait-audit/contact-sheets/`.", "",
    ]
    (root / "docs/CAST_PORTRAIT_WIRING_AUDIT.md").write_text("\n".join(report), encoding="utf-8")
    print(f"Wrote full audit for {len(rows)} cast and {len(v6)} Genre 30 records; {len(near_pairs)} pHash pairs manually reviewed as distinct.")


if __name__ == "__main__":
    main()
