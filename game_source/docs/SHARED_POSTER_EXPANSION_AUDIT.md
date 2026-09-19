# Shared Industry Poster Roster Expansion Audit

Authoritative base: `qol-pass-2-2026-09-19`  
Expansion branch: `poster-roster-expansion-2026-09-19`

## Existing runtime pool

The poster registry currently has **168 slots**, **166 live images** and **2 explicit reserve/pending slots**.

| Studio | Persona | Slots | Live | Pending |
|---|---|---:|---:|---:|
| Toe-i Animation | Blockbuster Action House (`blockbuster`) | 28 | 28 | 0 |
| Sunnyrise | Sakuga Atelier (`technical`) | 28 | 28 | 0 |
| Boneworks | Experimental Atelier (`experimental`) | 28 | 28 | 0 |
| Kyo-Hani | Prestige Drama Studio (`prestige`) | 28 | 28 | 0 |
| Madcap House | Cheap High-Volume Mill (`volume`) | 28 | 27 | 1 |
| Turtle Line | Romance & Idol House (`idol`) | 28 | 27 | 1 |

Usable type split before expansion:

- Shonen-only: 69
- Shojo-only: 69
- Both: 28
- Shonen-compatible total: 97
- Shojo-compatible total: 97

The current imported assets are portrait key art, approximately 346–354 × 530–537 px in the audited samples. Expansion art should stay in the same portrait family and use PNGs under `public/rival-posters/imported/`.

## Genre coverage before expansion

| Genre | Live posters | Key issue |
|---|---:|---|
| Romance | 56 | heavily overrepresented |
| Fantasy | 33 | already deep |
| Slice of Life | 20 | Shojo-heavy |
| Cyberpunk | 20 | no Shojo-only art |
| Space | 19 | healthy |
| Martial Arts | 17 | no Shojo-compatible art before expansion |
| Mecha | 16 | almost entirely Shonen |
| Sports | 16 | heavily Shonen |
| Supernatural | 16 | healthy |
| Mystery | 14 | healthy |
| Idol | 13 | no Shonen-compatible art before expansion |
| Horror | 12 | healthy |
| Mythology | 12 | healthy |
| Survival | 12 | no Shojo-compatible art before expansion |
| Magical | 12 | heavily Shojo |
| Military | 10 | no Shojo-compatible art before expansion |
| Samurai | 10 | adequate |
| Pirate | 6 | no Shojo-compatible art before expansion |
| Nordic | 6 | adequate |
| Comedy | 4 | severe shortage |
| Shinobi | 3 | severe shortage |
| Cooking | 1 | severe shortage; no Shonen-compatible art |
| Isekai | 0 | missing |
| Vampire | 0 | missing |
| Grimdark | 0 | missing |
| Monster Taming | 0 | missing |
| Crime | 0 | missing |
| Kaiju | 0 | missing |
| Cosmic Horror | 0 | missing |
| Arabia | 0 | missing |

## Recommended expansion

Add **96 real images**, exactly **16 per studio**.

Target runtime after art is accepted and applied:

- 264 total slots
- 262 live/generated posters
- 2 existing reserve/pending slots retained
- 44 slots per studio
- Toe-i / Sunnyrise / Boneworks / Kyo-Hani: 44 live each
- Madcap House / Turtle Line: 43 live + 1 existing reserve each
- 60 new standalone productions
- 36 new family images across 12 deliberate three-poster franchises
- new additions: 25 Shonen-only, 25 Shojo-only, 46 both
- new Shonen-compatible additions: 71
- new Shojo-compatible additions: 71

The expansion intentionally prioritises the eight zero-coverage genres, Comedy, Cooking and Shinobi, plus cross-type holes. Romance gains only 9 new images and Mecha only 1.

### Planned additions by priority genre

| Genre | Added | Planned total after expansion |
|---|---:|---:|
| Monster Taming | 13 | 13 |
| Vampire | 12 | 12 |
| Comedy | 12 | 16 |
| Kaiju | 11 | 11 |
| Arabia | 11 | 11 |
| Crime | 11 | 11 |
| Cyberpunk | 10 | 30 |
| Cosmic Horror | 9 | 9 |
| Isekai | 9 | 9 |
| Cooking | 8 | 9 |
| Grimdark | 8 | 8 |
| Shinobi | 6 | 9 |

The plan also introduces at least one Shojo-compatible Military, Survival, Pirate and Martial Arts poster, and Shonen-compatible Idol and Cooking posters.

## Data and art rules

The exact 96 IDs, metadata and art concepts live in:

`src/engine/generated/rivalPosterExpansionPlan.json`

The expansion is intentionally **not** inserted into the live runtime manifest until the actual images exist. This prevents broken paths, fake placeholder art and accidental pending entries.

`scripts/sharedPosterExpansionPlan.mjs` validates:

- unique stable IDs;
- unique asset paths;
- exact studio/persona mapping;
- active genre IDs only;
- 1–3 genre tags per image;
- valid Anime Type metadata;
- 16 additions per studio;
- 2–4 members per planned family;
- no collision with `BIG_THREE_RESERVED_POSTER_IDS`;
- no conflict with existing manifest rows;
- existence/non-zero size of all 96 assets before `--apply`.

Only `node scripts/sharedPosterExpansionPlan.mjs --apply` may wire the expansion into `rivalPosterManifest.json`, and it refuses to do so until every planned image is present.

## Shared-pool regression coverage

The real-manifest test verifies:

1. capacity/generated/pending counts are internally exact;
2. poster IDs and live paths are unique;
3. studio, persona, Anime Type and genre metadata are valid;
4. all live asset paths exist and are non-empty;
5. every ordinary live poster is reachable by `genericPosterOptions()`;
6. every ordinary live poster can be selected by `pickRivalPoster()` for its owning studio;
7. Big Three reserved art remains excluded from ordinary player and rival selection;
8. the 96-slot plan closes every active genre coverage hole;
9. the plan remains balanced across Shonen and Shojo;
10. cross-type gap fixes remain present.

Existing tests continue to cover player claims, immediate rival reassignment, recent-use avoidance and franchise-family continuity.
