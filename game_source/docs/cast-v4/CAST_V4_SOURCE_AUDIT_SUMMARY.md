# Cast V4 source audit — Phase 1 blocker

This audit was generated from the actual repository staging tree. It does not assign donor substitutions.

- Source PNGs found: **320** (handoff/README expectation: 336)
- Mechanics records: **304 / 304**
- Exact manifest paths present: **39 / 304**
- Manifest paths absent: **265 / 304**
- Same-stable-ID candidates under a different path: **253**
- Locked stable IDs with no portrait anywhere in staging: **12**
- Donor/alternate PNGs retained: **28**
- Exact duplicate-byte PNG groups: **0**

## Hard-missing locked stable IDs

- `v4_lead_shojo_004` — expected `batch_01_001-080/040__v4_lead_shojo_004.png`
- `v4_lead_shojo_011` — expected `batch_01_001-080/047__v4_lead_shojo_011.png`
- `v4_lead_shojo_018` — expected `batch_01_001-080/054__v4_lead_shojo_018.png`
- `v4_lead_shojo_027` — expected `batch_01_001-080/063__v4_lead_shojo_027.png`
- `v4_sidekick_shojo_023` — expected `batch_02_081-160/135__v4_sidekick_shojo_023.png`
- `v4_sidekick_shojo_031` — expected `batch_02_081-160/143__v4_sidekick_shojo_031.png`
- `v4_sidekick_shojo_038` — expected `batch_02_081-160/150__v4_sidekick_shojo_038.png`
- `v4_mascot_shonen_009` — expected `batch_02_081-160/159__v4_mascot_shonen_009.png`
- `v4_mascot_shojo_013` — expected `batch_03_161-240/199__v4_mascot_shojo_013.png`
- `v4_mascot_shojo_018` — expected `batch_03_161-240/204__v4_mascot_shojo_018.png`
- `v4_mascot_shojo_026` — expected `batch_03_161-240/212__v4_mascot_shojo_026.png`
- `v4_mascot_shojo_034` — expected `batch_03_161-240/220__v4_mascot_shojo_034.png`

## Gate decision

**BLOCKED.** The Cast V4 runtime handoff explicitly requires every manifest-referenced portrait to exist before visual mapping/identity/runtime activation, and says to stop rather than guess when one is absent. The missing source pool must be restored or the locked mechanics manifests must be deliberately corrected by an authoritative follow-up before Phase 2 can begin.

The 253 same-stable-ID filename candidates are recorded in `CAST_V4_SOURCE_AUDIT.csv` for diagnosis only; they have not been treated as approved substitutions.
