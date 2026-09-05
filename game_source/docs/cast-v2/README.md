# Cast V2 specification package

Canonical source date: 4 September 2026. Repository basis: `feature/kairosoft-production-pass` at `63e072d310670b6cb19dbef77d2d13526f7d5317`.

## Review order

1. `CAST_V2_MASTER.md` — complete human-readable canon.
2. `CAST_V2_MASTER.csv` — authoritative one-row-per-character import table.
3. `CAST_V2_COVERAGE.md` — role, Type, gender, genre, pair, species and antagonist audit.
4. `GENRE_V2_SPEC.md` — 21 genres, progression, combo matrix, Type, discovery and save migration.
5. `CAST_V2_CASTING_BALANCE.md` — formula and simulation recommendation.
6. `CAST_V2_MIGRATION_MAP.csv` — all 186 existing IDs.
7. `CAST_V2_VISUAL_BIBLE.md` — all 192 canonical visual profiles and complete individual prompts.
8. `CAST_V2_VISUAL_MANIFEST.csv` — deterministic sheet/cell/crop mapping.
9. `CAST_V2_SHEET_PLAN.md` — 24 sheets with eight fixed cells each.
10. `CAST_V2_SHEET_PROMPTS.md` — 24 complete standalone generation prompts.
11. `CAST_V2_SHEET_PROMPTS_GENERATOR.md` — the same 24 jobs with repeated boilerplate deduplicated below the 32,000-character generator limit.
12. `CAST_V2_GENERATION_BATCHES.md` — three 64-character production batches.
13. `CAST_V2_ART_QC.md` — one completed PASS record per character.
14. `CAST_V2_ART_RESULTS.md` — generation, correction, crop and QC totals.
15. `CAST_V2_ASSET_CHECKSUMS.csv` — hashes and dimensions for 24 normalized masters and 192 runtime portraits.

`CAST_V2_MASTER.json`, `GENRE_V2_DATA.json`, `GENRE_V2_COMBOS.csv/json` and `CAST_V2_PAIR_COVERAGE.csv` are implementation-friendly mirrors. `evidence/` contains the exact source extraction, branch audit, simulations and final validator results. `tools/` contains the deterministic builders and reference model.

## Spoiler boundary

The master and visual-production files contain hidden affinities and internal logic. They are developer material and must not ship as public game assets. Each internal art prompt names the hidden affinity only to impose an explicit visual ban: generated portraits omit hidden-specific motifs, and player-facing asset metadata omits the hidden field entirely.

## Regenerate and validate

From the repository root:

```bash
python3 game_source/docs/cast-v2/tools/build_v2.py
node --disable-warning=ExperimentalWarning game_source/docs/cast-v2/tools/simulate_balance.mjs
node game_source/docs/cast-v2/tools/validate_cast_v2.mjs
node game_source/docs/cast-v2/tools/build_visual_bible.mjs
node game_source/docs/cast-v2/tools/validate_visual_bible.mjs
python3 game_source/docs/cast-v2/tools/normalize_cast_v2_sheets.py --help
python3 game_source/docs/cast-v2/tools/process_cast_v2_sheets.py --help
python3 game_source/docs/cast-v2/tools/validate_cast_v2_assets.py --help
node game_source/docs/cast-v2/tools/finalize_cast_v2_art.mjs --prepare
node game_source/docs/cast-v2/tools/finalize_cast_v2_art.mjs --checksums
```

The dynamic-presentation revision replaces the earlier neutral-background convention with a distinct crop-safe action, setting, camera and lighting plan for every character. It does not alter canonical identities, affinities or sheet/cell assignments. Runtime manifest filenames use `.webp`; lossless source crops remain PNG in the art-source tree.

Generated source provenance is under `art_source/cast_v2/sheets/`; normalized 2048×1024 masters use exact RGB-black functional gutters, and `public/cast/v2/` contains 192 independent 512×512 WebP portraits. Grid normalization and cropping use geometry plus the external manifest only—never OCR or appearance-based identity inference.

The balance harness requires Node 24+ because it uses the built-in TypeScript stripper. It patches temporary copies of the current scoring sources and deletes them after the run; it does not edit the game.
