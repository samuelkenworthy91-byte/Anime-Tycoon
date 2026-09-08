# Cast anatomy audit — first visual pass

Date: 2026-09-08
Branch: `main`
Audit-pack commit: `539e7fbbebf190d692fa0bdfe982823818d755be`
Workflow run: `34228891451` (`Cast anatomy audit pack`)

## Scope completed

The first-pass visual sweep covered **432 / 432 live selectable cast portraits** from the actual runtime payload.

Structural inventory produced by `scripts/castAnatomyAudit.py`:

- live cast records: 432
- unique cast IDs: 432
- unique runtime image paths: 432
- Cast V2 runtime portraits: 192
- Cast V3 runtime portraits: 240
- expected runtime geometry: 512×512 WebP
- contact sheets: 27 labelled 4×4 sheets
- missing runtime files: 0
- wrong-format/wrong-size runtime files: 0

The GitHub Actions audit-pack job completed successfully before the visual sweep.

## First-pass visual verdict

- `PASS_FIRST_PASS`: **431**
- `REPAIR`: **1**
- clear extra/duplicate limb defects visible at contact-sheet scale: **0**
- clear accidental additional foreground character/body: **1**

`PASS_FIRST_PASS` means no clear extra limb, duplicate body part or accidental second foreground subject was visible in the labelled 4×4 review. It is deliberately not a final close-up certification: subtle finger/hand junction errors and small fused anatomy still require a second pass at larger individual-image scale.

## Repair candidate 001 — Hearth

- ordinal in live audit: `343`
- id: `cv3_mascot_047`
- name: `Hearth`
- role/type: `pet / shojo`
- canonical species: `woolly lamb`
- runtime path: `cast/v3/cv3_mascot_047.webp`
- runtime format: WebP
- runtime size: 512×512
- audit SHA-256: `9298a27b50d298708ff2629ec172505f14c6696b5443cde50bbf7f71eb39f5a3`

### Finding

The runtime portrait shows Hearth as the intended woolly lamb **plus a second small white/orange cat-like animal immediately beside the lamb**. The runtime/canonical record defines Hearth singularly as a `woolly lamb companion connecting slice and supernatural`; there is no second companion in the character identity.

This is therefore classified as `accidental_second_character`, not as deliberate fantasy anatomy.

### Recommended repair

Use a tightly masked inpaint / magic-eraser-style edit on the existing portrait:

1. remove only the small white/orange second animal;
2. reconstruct the local paving/background and any lamb-edge pixels hidden by it;
3. preserve Hearth's face, fleece, ears, legs, scarf, bell, bag, pose, lighting and framing;
4. do not regenerate or redesign Hearth;
5. retain the exact runtime ID/path and 512×512 WebP output contract;
6. record new SHA-256 and before/after QC after repair.

## Next audit stage

A second pass should inspect individual portraits at substantially larger scale, concentrating on hands, wrists, elbows, knees, feet, tails/wings for nonhuman species, and occluded limb junctions. Only explicit defects should move from `PASS_FIRST_PASS` to `REVIEW` or `REPAIR`.

No runtime cast artwork was changed by this first-pass audit.
