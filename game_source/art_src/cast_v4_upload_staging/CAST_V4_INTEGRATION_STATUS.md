# Cast V4 integration status

## Mechanical records — READY

All 304 optimized additions now have repository-side mechanical records next to their upload batches in `CAST_V4_MECHANICS.csv`.

Each record fixes:
- stable ID
- runtime role (`protag`, `secondary`, `pet`, `villain`)
- anime type (`shonen`, `shojo`)
- two visible affinities
- one hidden affinity
- exact source PNG filename
- upload batch

The filenames use the same stable ID, so every uploaded PNG maps deterministically to exactly one mechanical cast record.

The staging mechanics are protected by `src/engine/__tests__/cast-v4-staging-mechanics.test.ts`, which verifies the planned 304 additions against the current 432 live cast and requires the future roster to close every one of the 2,024 Role × Type × genre-pair cells.

## Runtime activation — NOT YET

The live game still intentionally uses the existing 432 records from `src/engine/generated/castV3.json`. Cast V4 is not appended while source art is still being uploaded, because activating it early would create broken image paths and incomplete character cards.

Before activation, each V4 stable ID still needs the non-mechanical `CastMember` fields:
- `name`
- `archetype`
- `epithet`
- `personality`
- `gender`
- `species`
- `ageBand`
- `culturalBasis`
- final runtime `img` path

Those fields should be created after the corresponding artwork is present so the final identity data matches the approved portrait rather than generic placeholders.

## Activation work required after 304/304 art upload

1. Validate all four source batches and stable filenames.
2. Create final character identity metadata for the 304 mechanical records.
3. Normalize source PNGs to the established 512×512 runtime WebP format under `public/cast/v4/`.
4. Append the completed 304 records to the canonical runtime cast source.
5. Update the generator and tests that currently hard-code the 432 / 108-per-role / 54-per-role-type V3 roster.
6. Replace the old weaker coverage acceptance with the strict 2,024-cell Role × Type × pair requirement.
7. Regenerate runtime JSON and verify 736 unique cast IDs and portrait paths.
8. Run tests/build before treating Cast V4 as live.
