# RIVAL POSTER DROP FOLDER

This folder is the source drop for externally-produced rival poster art.

## Current canonical import format

The live rival-poster expansion uses **160 already-cropped individual PNGs**:

    poster_001.png
    poster_002.png
    ...
    poster_160.png

The stable poster-to-studio/type/genre/family assignment is stored in:

    src/engine/generated/rivalPosterCatalog.tsv

Run:

    node scripts/finalize-rival-posters.mjs

The finaliser:
- verifies all 160 numbered PNGs exist;
- copies them to stable runtime filenames under `public/rival-posters/imported/`;
- retains the six original Toe-i runtime posters;
- generates `src/engine/generated/rivalPosterManifest.json`;
- guarantees **28 slots per studio × 6 studios = 168 total**;
- produces **166 live posters + 2 pending reserve slots**;
- writes `docs/rival-poster-import-map.csv` for traceability;
- keeps KNOWN FITS contextual to the first selected genre.

The GitHub workflow `.github/workflows/finalize-rival-posters.yml` is scoped to `work/final-awards-rival-posters` as the reusable staging/finalisation branch. It runs the import, test suite, production build, and Cast V3 coverage audit whenever the numbered source posters/catalog/finaliser change there. Validated runtime assets can then be fast-forwarded to `main`.

## Future art drops

Already-cropped individual files are preferred because they avoid contact-sheet crop errors. If art is generated on 4×2 sheets with black dividers, crop it to individual images before adding it here, then assign stable IDs/tags in the catalog.

## Artwork requirements

- Textless key art only: no titles, letters, logos, watermarks, signatures, or fake Japanese text.
- Strong portrait/key-visual composition; runtime cards may crop slightly depending on screen aspect ratio.
- Keep each rival studio visually distinct and use franchise `family` tags for related sequel/spinoff art.
- Original work only; no copyrighted characters or lifted frames.
