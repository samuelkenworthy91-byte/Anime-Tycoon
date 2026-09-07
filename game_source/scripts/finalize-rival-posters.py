#!/usr/bin/env python3
"""Materialise the audited 160-poster external drop into true runtime WebPs.

Source: 20 compact 4x2 atlases in art_src/rival/external/atlases/.
Output: one 480x600 WebP per supplied poster in public/rival-posters/generated/.
The audited TSV owns studio/type/genre/family metadata.  We preserve the six
original live rival visuals, giving 166 live posters + two reserve slots =
168 total / 28 per rival studio.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src/engine/generated/rivalPosterCatalog.tsv"
MANIFEST = ROOT / "src/engine/generated/rivalPosterManifest.json"
ATLAS_DIR = ROOT / "art_src/rival/external/atlases"
OUT_DIR = ROOT / "public/rival-posters/generated"
MAP_OUT = ROOT / "docs/rival-poster-import-map.csv"
CREATE = ROOT / "src/components/Create.tsx"

POSTER_COUNT = 160
COLS, ROWS = 4, 2
CELL_W, CELL_H = 232, 350
SHEET_W, SHEET_H = CELL_W * COLS, CELL_H * ROWS
OUT_W, OUT_H = 480, 600

STUDIO_META = {
    "Toe-i Animation": ("toei", "blockbuster"),
    "Sunnyrise": ("sunrise", "technical"),
    "Boneworks": ("bones", "experimental"),
    "Kyo-Hani": ("kyo", "prestige"),
    "Madcap House": ("madcap", "volume"),
    "Turtle Line": ("ttl", "idol"),
}


def split_list(v: str) -> list[str]:
    return [x.strip() for x in v.split(",") if x.strip()]


def load_catalog() -> list[dict]:
    with CATALOG.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f, delimiter="\t"))
    if len(rows) != POSTER_COUNT:
        raise RuntimeError(f"Expected {POSTER_COUNT} catalog rows, got {len(rows)}")
    nums = [int(r["n"]) for r in rows]
    ids = [r["id"] for r in rows]
    if sorted(nums) != list(range(1, POSTER_COUNT + 1)) or len(set(ids)) != POSTER_COUNT:
        raise RuntimeError("Poster catalog numbering/IDs are not unique and contiguous 1..160")
    for r in rows:
        if r["studio"] not in STUDIO_META:
            raise RuntimeError(f"Unknown studio: {r['studio']}")
        if not split_list(r["animeTypes"]) or not split_list(r["genres"]):
            raise RuntimeError(f"Poster {r['id']} is missing type/genre tags")
    return rows


def poster_canvas(cell: Image.Image) -> Image.Image:
    """Preserve the complete tall key visual on a 4:5 runtime canvas.

    A blurred/darkened cover of the same art fills the narrow side gutters;
    the sharp source is contained, never cropped.  This avoids ceremony
    object-cover losing heads/titles while matching every other 4:5 card.
    """
    rgb = cell.convert("RGB")
    bg = ImageOps.fit(rgb, (OUT_W, OUT_H), method=Image.Resampling.LANCZOS)
    bg = bg.filter(ImageFilter.GaussianBlur(18))
    bg = ImageEnhance.Brightness(bg).enhance(0.52)
    fg = ImageOps.contain(rgb, (OUT_W, OUT_H), method=Image.Resampling.LANCZOS)
    x = (OUT_W - fg.width) // 2
    y = (OUT_H - fg.height) // 2
    bg.paste(fg, (x, y))
    return bg


def patch_known_fits() -> None:
    text = CREATE.read_text(encoding="utf-8")
    old = '''  const knownPairings = useMemo(\n    () =>\n      Object.entries(run.comboLevels)\n        .filter(([key, lv]) => lv > 0 && key.split("|").every((g) => run.genresUnlocked.includes(g as never)))\n        .sort((a, b) => b[1] - a[1])\n        .slice(0, 4)\n        .map(([key, lv]) => ({ key, genres: key.split("|") as GenreId[], lv })),\n    [run.comboLevels, run.genresUnlocked]\n  );'''
    new = '''  const knownPairings = useMemo(() => {\n    const firstGenre = d.genres[0];\n    if (!firstGenre || d.genres.length > 1) return [];\n    return Object.entries(run.comboLevels)\n      .filter(([key, lv]) => {\n        if (lv <= 0) return false;\n        const pair = key.split("|") as GenreId[];\n        return pair.includes(firstGenre) && pair.every((g) => run.genresUnlocked.includes(g));\n      })\n      .sort((a, b) => b[1] - a[1])\n      .slice(0, 4)\n      .map(([key, lv]) => ({ key, genres: key.split("|") as GenreId[], lv }));\n  }, [d.genres, run.comboLevels, run.genresUnlocked]);'''
    if old in text:
        CREATE.write_text(text.replace(old, new), encoding="utf-8")
    elif "const firstGenre = d.genres[0]" not in text:
        raise RuntimeError("Could not locate KNOWN FITS block in Create.tsx")


def main() -> None:
    catalog = load_catalog()
    for n in range(1, 21):
        p = ATLAS_DIR / f"poster_sheet_{n:02d}.webp"
        if not p.exists():
            raise RuntimeError(f"Missing source atlas {p.name}")
        with Image.open(p) as im:
            if im.size != (SHEET_W, SHEET_H):
                raise RuntimeError(f"{p.name}: expected {(SHEET_W, SHEET_H)}, got {im.size}")

    old_manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    original_live = [p for p in old_manifest["posters"] if not p.get("pending")]
    if len(original_live) != 6 or any(p["studio"] != "Toe-i Animation" for p in original_live):
        raise RuntimeError(f"Expected six original live Toe-i posters, found {len(original_live)}")
    original_ids = {p["id"] for p in original_live}
    if any(r["id"] in original_ids for r in catalog):
        raise RuntimeError("External catalog collides with an original poster ID")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.webp"):
        old.unlink()

    imported: list[dict] = []
    map_rows: list[list[str | int]] = [[
        "poster_number", "slot_id", "studio", "anime_types", "genres", "family",
        "source_sheet", "row", "column", "img",
    ]]

    open_sheet_no = None
    sheet = None
    try:
        for meta in catalog:
            no = int(meta["n"])
            sheet_no = (no - 1) // 8 + 1
            cell_no = (no - 1) % 8
            row, col = divmod(cell_no, COLS)
            if sheet_no != open_sheet_no:
                if sheet is not None:
                    sheet.close()
                sheet = Image.open(ATLAS_DIR / f"poster_sheet_{sheet_no:02d}.webp").convert("RGB")
                open_sheet_no = sheet_no
            assert sheet is not None
            cell = sheet.crop((col * CELL_W, row * CELL_H, (col + 1) * CELL_W, (row + 1) * CELL_H))
            canvas = poster_canvas(cell)
            img_path = f"rival-posters/generated/{meta['id']}.webp"
            canvas.save(OUT_DIR / f"{meta['id']}.webp", "WEBP", quality=82, method=6)

            types = split_list(meta["animeTypes"])
            genres = split_list(meta["genres"])
            family = meta["family"].strip() or None
            imported.append({
                "id": meta["id"], "img": img_path, "studio": meta["studio"],
                "persona": meta["persona"], "animeTypes": types,
                "genres": genres, "family": family,
            })
            map_rows.append([no, meta["id"], meta["studio"], "|".join(types), "|".join(genres), family or "", sheet_no, row + 1, col + 1, img_path])
    finally:
        if sheet is not None:
            sheet.close()

    posters = [*original_live, *imported]
    for studio, (prefix, persona) in STUDIO_META.items():
        live_count = sum(1 for p in posters if p["studio"] == studio)
        if live_count > 28:
            raise RuntimeError(f"{studio} has {live_count} live posters, over capacity")
        for i in range(1, 29 - live_count):
            posters.append({
                "id": f"{prefix}_reserve_{i:02d}", "img": "", "studio": studio,
                "persona": persona, "animeTypes": ["shonen", "shojo"],
                "genres": [], "family": None, "pending": True,
            })

    manifest = {
        "schema": 2,
        "capacity": {"perStudio": 28, "studios": 6, "total": 168},
        "generated": sum(1 for p in posters if not p.get("pending")),
        "pending": sum(1 for p in posters if p.get("pending")),
        "posters": posters,
    }
    if len(posters) != 168 or manifest["generated"] != 166 or manifest["pending"] != 2:
        raise RuntimeError(f"Bad final manifest totals: {len(posters)} / {manifest['generated']} live / {manifest['pending']} pending")
    for studio in STUDIO_META:
        if sum(1 for p in posters if p["studio"] == studio) != 28:
            raise RuntimeError(f"{studio} does not have exactly 28 poster slots")

    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    MAP_OUT.parent.mkdir(parents=True, exist_ok=True)
    with MAP_OUT.open("w", encoding="utf-8", newline="") as f:
        csv.writer(f).writerows(map_rows)
    patch_known_fits()

    print(f"Rival posters: {manifest['generated']}/168 live, {manifest['pending']} pending")
    for studio in STUDIO_META:
        live = sum(1 for p in posters if p["studio"] == studio and not p.get("pending"))
        pending = 28 - live
        print(f"  {studio}: {live} live + {pending} reserve = 28")
    print("Generated 160 true 480x600 runtime WebPs; full source art preserved on 4:5 canvases")
    print("KNOWN FITS contextual to the first selected genre")


if __name__ == "__main__":
    main()
