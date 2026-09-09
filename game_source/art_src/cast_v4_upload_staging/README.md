# Anime Runner — Cast V4 upload staging

This directory is the upload landing zone for the complete 304-character optimized Cast V4 art set.

## Upload folders
- `batch_01_001-080/` — 80 individual PNGs
- `batch_02_081-160/` — 80 individual PNGs
- `batch_03_161-240/` — 80 individual PNGs
- `batch_04_241-304/` — 64 individual PNGs

Filenames are deterministic: `NNN__stable_id.png`.

Keep the uploaded files as lossless PNG source crops. Do not rename them, recompress them, or convert them to runtime WebP at upload time.

The ZIP supplied in chat contains `CAST_V4_UPLOAD_MANIFEST.csv`; upload that manifest into this directory alongside the four batch folders. It is authoritative for stable ID, role, Shonen/Shojo type, two visible genres, hidden genre, original sheet/cell, source crop and whether the final image came from the 4×4 repair sheet.

After all four batches are uploaded, the integration pass should validate 304/304 files, map each stable ID to the manifest, create the final character metadata, normalize runtime portraits, and run the strict 2,024-cell Role × Type × genre-pair coverage test before runtime integration.
