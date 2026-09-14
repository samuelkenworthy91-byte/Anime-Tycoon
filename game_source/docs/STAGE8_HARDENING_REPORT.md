# Stage 8 — Balance, Migration & Regression Hardening

Branch: `work/midgame-endgame-systems-pass`

This pass closes the midgame/endgame systems work by validating Stages 1–7 as one game rather than adding another headline feature. The goal is to preserve save compatibility, keep late-game power expensive, prove the new systems do not trivialise each other, and catch cross-system failures that focused feature tests can miss.

## Validation added

Stage 8 adds two permanent validation layers:

- `src/engine/__tests__/stage8-hardening.test.ts` — cross-system contract guards.
- `scripts/stage8-progression-audit.test.ts` — deterministic late-game progression/sink audit.

The normal `Midgame Endgame Systems Validation` workflow now runs:

1. awards capacity simulation;
2. Stage 8 progression audit;
3. focused awards/IP regression;
4. the complete automated suite;
5. the production web build.

## Save migration

The hardening suite migrates a deliberately old-shaped save with the Stage 4–7 state omitted. It verifies that migration is additive and preserves the studio, week, office, cash, Research, show count and staff raw skills while safely defaulting new collections/state.

A second test serialises to JSON, migrates, serialises again and migrates a second time. Core state and the new persistent systems remain stable rather than duplicating or resetting.

## Staff training economy

Tier-3 Masterclass quotes were sampled at increasingly advanced raw skill/career levels:

| Raw skill | Career level | Cash | Research | Gain |
| ---: | ---: | ---: | ---: | ---: |
| 50 | 2 | £180,000 | 39 RD | +10 |
| 250 | 12 | £545,000 | 72 RD | +10 |
| 500 | 20 | £975,000 | 112 RD | +10 |
| 800 | 30 | £1,500,000 | 162 RD | +10 |
| 950 | 40 | £1,810,000 | 191 RD | +10 |

Conclusion: no additional training inflation was required. Mastery remains possible up to the 999 raw-stat cap, but the cash/RD cost rises sharply enough that elite development remains a genuine late-game sink.

The one-paid-course-per-employee-per-industry-week rule is now explicitly regression-tested to prevent instant spam abuse.

## Production intervention ROI

Final Polish at Studio 3 was audited across the Stage-5 investment ladder:

| Tier | Cash | Approx. craft points | Cash per point |
| --- | ---: | ---: | ---: |
| Standard | £72,000 | 22 | £3,273 |
| Extended | £200,000 | 34 | £5,882 |
| Prestige | £540,000 | 47 | £11,489 |
| Obsessive | £1,295,000 | 59 | £21,949 |

Each step is materially less efficient than the one below it. Obsessive quality chasing therefore remains available without becoming the mathematically correct default choice.

Permanent production capability progression tops out at the £18m lifetime-spend threshold per track. Fully pushing all five tracks therefore represents roughly a **£90m** long-run investment envelope, while the permanent output effect stays bounded at about **16% per related track** rather than becoming an automatic score engine.

## Studio specialisation

Hardening guards now lock the intended asymmetry:

- first-rank Signature Genre output gains remain modest;
- related intervention savings stay bounded;
- outside-specialisation work remains viable rather than receiving a blunt score punishment;
- the secondary Signature Genre remains an expensive late-game decision at at least £2.5m + 450 RD.

No additional specialisation nerf was justified by the audit.

## Awards calibration

The existing 12-year production-capacity simulation remains part of every branch validation.

Representative median full-funded output remains around:

- **Year 6:** Story ~1,234, Animation ~1,574, Sound ~1,034.
- **Year 12:** Story ~1,757, Animation ~2,247, Sound ~1,531.

The calibrated craft floors therefore remain appropriate:

- **Year 6:** Writing 1,200 / Animation 1,500 / Score 975.
- **Year 12:** Writing 1,700 / Animation 2,150 / Score 1,475.

Stage 8 found no evidence that these should be relaxed or inflated further.

## Insolvency

The shutdown contract is now explicit in regression tests:

- 4 consecutive negative-cash weeks: landlord reprieve/warning;
- 8 consecutive negative-cash weeks: shutdown;
- returning to solvency clears the streak immediately.

This protects the intended “one-month reprieve, two-month failure” rule from later economy changes.

## Pixel 9a portrait safety

Static regression guards verify that the portrait employee dossier retains:

- Android safe-area top/bottom handling;
- `100dvh` containment;
- scroll containment;
- a sticky header/escape route;
- a minimum 36×36 close target.

The Big Three cinematic is also required to remain vertically scrollable and safe-area aware, so the expanded reveal cannot recreate the earlier blocked-close-button problem on a Pixel 9a portrait screen.

## Big Three rarity audit

The first deterministic Stage-8 audit ran 16 seeded rival-only 12-year careers. Before hardening, every sample produced:

`[Year 6, Year 6, Year 6]`

The seeded Sunnyrise title and both remaining rival titles were therefore becoming canon almost immediately. This defeated the purpose of the Year-6 event as a new long-term aspiration.

An initial cadence adjustment produced:

`[Year 6, Year 6, Year 7]`

That was still too compressed, so the final rival-consensus cadence is:

- Sunnyrise seed: opening of Year 6;
- rival consensus grace after the seed: **48 weeks**;
- rival consensus cooldown after a new rival name: **72 weeks**;
- no more than one rival title can crystallise in a single recognition window.

The final 16-seed audit now produces a rival-only pattern of:

`[Year 6, Year 7, Year 8]`

with median second-slot year 7 and median third-slot year 8. All 16 rival-only careers still fill the wall by Year 12, proving that rivals can absolutely take both open positions.

Crucially, **player recognition is not blocked by the rival grace/cooldown**. There is still no reserved player slot. A player release that genuinely meets the critic, reach, craft and cultural-momentum requirements can seize an open position sooner; the cadence only prevents the AI from mechanically consuming both places before the player has a meaningful endgame response window.

## Big Three player-craft integration repair

The slower rivalry cadence exposed a latent Stage-7 bug in a path that had previously been masked by the wall filling rapidly.

`playerCraftFor()` has the signature:

`playerCraftFor(score, points)`

and returns Story / Art / Sound craft values. The Big Three integration had incorrectly called it with only `points` and then attempted to read a non-existent `craft.score` field.

Stage 8 corrects this to:

- call `playerCraftFor(input.score, input.points)`;
- calculate the craft floor from `story`, `art`, and `sound`.

This restores real shipped production craft as the player Big Three craft gate and removes the reachable long-run crash.

## Conclusion

Stage 8 did not justify broad late-game nerfs. Training, intervention ROI, capability costs, specialisation, awards, insolvency, migration and mobile layout all held within the intended design envelopes.

The audit did justify two concrete corrections:

1. stretch rival Big Three recognition across the endgame rather than letting the wall fill in Year 6;
2. repair the player Big Three craft integration so it uses the real awards craft API correctly.

These are now permanent regression targets rather than one-off manual findings.
