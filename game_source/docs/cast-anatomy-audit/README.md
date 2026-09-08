# Live cast anatomy audit

Status: **IN PROGRESS**

Audit target: the actual selectable cast loaded by `src/engine/generated/castV3.json` on `main`.

Current runtime contract:

- 432 unique selectable cast IDs
- 108 Leads, 108 Sidekicks, 108 Mascots, 108 Villains
- one unique runtime image path per cast ID
- runtime portraits expected to be 512×512 WebP
- V2 and V3 portrait paths are both included because both remain live through the single generated cast payload

## Purpose

This pass is specifically looking for image-generation anatomy defects and accidental duplicate forms that can survive ordinary file/size/hash validation. Review categories include:

- extra arms or legs
- duplicate hands or feet
- extra fingers that clearly form an additional hand/limb
- fused or impossible limb junctions
- accidental second character/body fragments
- duplicate weapons/props that read as duplicated anatomy
- malformed mascot anatomy where the intended species is unambiguous

This is **not** a style-redesign pass. Odd poses, foreshortening, costume shapes, deliberate non-human anatomy and genre-specific prosthetics/mecha parts should not be flagged merely for being unusual.

## Audit rule

No runtime image is changed during the audit stage. A portrait must first receive a recorded visual verdict.

Verdicts:

- `PASS` — no clear anatomy defect visible
- `REPAIR` — clear local defect suitable for a surgical edit/inpaint
- `REVIEW` — ambiguous; requires closer single-image inspection before any edit
- `BLOCKED_FILE_MISSING` — runtime path cannot be opened

Repairs, when approved, must preserve the existing cast ID, filename, 512×512 dimensions and WebP runtime path. The preferred action is a local inpaint/magic-eraser-style edit rather than character regeneration.

## Reproducible inventory/contact sheets

Run from `game_source/`:

```bash
python scripts/castAnatomyAudit.py --out /tmp/cast-anatomy-audit
```

The tool reads the live generated cast file, verifies the 432-entry runtime contract, opens and hashes every referenced image, and creates:

- `CAST_ANATOMY_QC.csv` — one row per live cast member, initially `PENDING_VISUAL_QC`
- `SUMMARY.json` — structural audit totals/errors
- `contact_sheets/cast_001_016.jpg` etc. — labelled 4×4 sheets for detailed visual review

The generator is intentionally read-only with respect to `public/cast/**`.

## Main-branch audit baseline

Audit harness added on 2026-09-08 after `main` commit `04db47aae61cedfd19b85952d23393ae218dbbbe`.

Visual findings should be committed separately from any image repairs so there is a clean before/after audit trail.
