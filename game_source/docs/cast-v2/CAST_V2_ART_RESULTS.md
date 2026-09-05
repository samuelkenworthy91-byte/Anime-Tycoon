# Cast V2 art results

## Final totals

- Total sheets generated: 24 canonical sheet jobs.
- Sheet pass count: 24 / 24 after correction and grid normalization.
- Unique sheets regenerated or image-edited: 11 (15 correction jobs including targeted follow-ups).
- Total character crops: 192.
- First-pass character pass count: 117.
- Regenerated/corrected character count: 75 unique characters.
- Final character pass count: 192 / 192.
- Hidden-affinity spoiler failures corrected: 0; no final crop visibly telegraphs its hidden genre beyond cues independently justified by visible genres.
- Duplicate-look failures corrected: 0; perceptual-neighbour review found related studio language but no effective twins.
- No-text corrections: 7 targeted paper/notebook/chart/manifest surfaces.
- Mascot canonical-object corrections: all six mascot sheets reviewed; unapproved clothing, bags, scarves and props removed while explicitly approved collars, harnesses, blanket, pouch, apron and basket were retained.

## Deliberate technical processing

Image generation produced translucent or decorative divider pixels even when pure black was requested. Untouched generation outputs are retained in `art_source/cast_v2/sheets/raw/` or the rejected provenance tree. The reproducible normalization tool geometrically extracts the eight cells without OCR, preserves each complete composition, and assembles a separate 2048×1024 RGB master with 8-pixel pure-black safety gutters inside each 512-pixel cell. Runtime crops are then mapped only through `CAST_V2_VISUAL_MANIFEST.csv` and encoded as 512×512 WebP.

Three first attempts returned non-2:1 canvases (`LEAD_SHOJO_02`, `SIDEKICK_SHONEN_03`, `VILLAIN_SHOJO_02`) and were regenerated as full sheets. Mascot and no-text fixes used documented image-edit passes; rejected predecessors remain available for provenance.

## Acceptance

- Runtime asset validation: PASS after QC decisions are applied.
- Canonical roster field changes: ZERO.
- Game logic changes: ZERO.
