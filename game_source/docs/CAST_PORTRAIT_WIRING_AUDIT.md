# Cast portrait wiring audit

Generated from the live runtime, canonical roster/manifests, staged source art and actual runtime image bytes.

## Result

- Runtime cast audited: **1,440**
- Genre 30 cast audited: **520**
- Wiring failures after repair: **0**
- Missing source portraits: **0**
- Missing runtime portraits: **0**
- Exact duplicate portrait groups: **0**
- pHash review pairs at Hamming distance ≤12: **10**
- Placeholder/fallback portraits: **0**

## Root cause and repair

The Genre 30 workbook deliberately compressed 135 mechanical coverage edges into 65 three-affinity records per Role × Anime Type bucket. Its overt art plan contains 19 visible pairs, not 65. The source also reused 25 names and four epithets, while runtime generation silently replaced every one of the 520 names. That made the source roster, runtime cards and identity labels disagree even though the image copier used the correct stable IDs.

The repair makes the full Genre 30 roster authoritative, gives every stable ID one canonical name and epithet, removes runtime name fallback/remapping, validates the reduced image manifest against the full roster by ID, and verifies source/runtime image bytes. Portraits were not relabelled into genres they do not visibly depict.

## Cast generations

| Generation | Count |
|---|---:|
| V2 original | 192 |
| V3 pair closure | 240 |
| V4 | 304 |
| V5 Vampire/Grimdark | 184 |
| V6 Genre 30 | 520 |

## Genre 30 visible-pair distribution

| Visible pair | Count |
|---|---:|
| Arabia × Crime | 8 |
| Arabia × Kaiju | 8 |
| Arabia × Monster Taming | 8 |
| Comedy × Cooking | 8 |
| Cosmic Horror × Crime | 8 |
| Cosmic Horror × Kaiju | 192 |
| Cosmic Horror × Monster Taming | 8 |
| Crime × Monster Taming | 192 |
| Cyber × Fantasy | 8 |
| Horror × Slice of Life | 8 |
| Idol × Mystery | 8 |
| Isekai × Mecha | 8 |
| Magical Girl × Space | 8 |
| Martial Arts × Mythology | 8 |
| Military × Supernatural | 8 |
| Nordic × Samurai | 8 |
| Pirate × Survival | 8 |
| Romance × Sports | 8 |
| Shinobi × Vampire | 8 |

All eight Role × Anime Type buckets contain the same 65 canonical affinity triples and collectively witness all 135 new mechanical pair edges. The visible-pair distribution remains the art-authored 19-pair distribution; changing it would misdescribe the supplied portraits.

## Similarity review

No exact duplicates were found. All 10 low-distance pHash pairs were manually inspected on the labelled review sheet and confirmed distinct. The closest-looking Vampire mascot pair still differs in pose and background details; pHash similarity alone does not establish duplicate identity.

See `cast-portrait-audit/SIMILARITY_REPORT.csv` and the contact sheets under `cast-portrait-audit/contact-sheets/`.
