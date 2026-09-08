# RIVAL POSTER DROP FOLDER

Canonical source drop for the 160 supplied individual rival posters (`poster_001.png` … `poster_160.png`).

Assignments live in `src/engine/generated/rivalPosterCatalog.tsv`. Run `node scripts/finalize-rival-posters.mjs` to materialize stable runtime assets and regenerate the manifest.

Current runtime target: **28 slots per studio × 6 = 168 total**, with **166 live posters + 2 reserve slots**. The staging workflow on `work/final-awards-rival-posters` validates the import with tests, production build, and the Cast V3 coverage audit.

For future art, cropped individual files are preferred. If using 4×2 sheets with black dividers, crop them first and then add stable IDs/tags to the catalog.

Artwork should remain textless, original, portrait-friendly, and visually distinct by rival studio; franchise `family` tags should connect sequel/spinoff visuals.
