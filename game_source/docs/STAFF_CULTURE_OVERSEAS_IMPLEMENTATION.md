# Staff culture and overseas markets — implementation status

Branch: `work/staff-culture-overseas-expansion`
Starting main commit: `f579951f589099a0c13ff3c911e4fff3b0122550`
Source implementation commit: `84b8f9ba62ce484d4006585498823679cee1c263`

This is a playable first implementation of the staff ambition, working-policy and overseas-market proposals. It is ready for balance and mobile playtesting, not a claim that every narrative and market-depth feature in the wider proposal is finished. Main has not been changed.

## Where to find it

Office → MORE → STUDIO CULTURE & OVERSEAS.

Three sections provide ambitions and agreements, working policies, and overseas release planning. Controls use 44px minimum heights; the shared office modal has a sticky close header and a viewport-height limit. Actual Pixel 9a portrait verification is still required.

## Staff ambitions and stories

- Staff with 24 weeks' tenure and two release credits can offer a personal genre pitch. Pitches use the creator's unlocked favourite genre where possible.
- Offers are deterministic, with an eight-week studio cooldown, a 48-week employee cooldown and at most two outstanding pitches.
- A prototype costs £8,000 × (1 + 0.75 × office level), takes 28 paid development days and produces a single-genre direction report. Pairing genres can change that direction. Research does not add free production quality.
- Fund development, accept a leadership brief immediately, decline without a promise, or cancel committed development without a refund.
- Manual leadership agreements are also available. Each creator has at most one active commitment.
- Appoint a named department lead to a matching, self-funded original production during concept, before their department starts accruing production days. Commissioned, licensed and continuation projects do not qualify.
- Release within 48 game weeks with at least 60% eligible department-day participation. Waiting at a milestone does not accrue participation. Assignment time, rather than random quality output, is measured.
- A fulfilled opportunity earns morale and a success-dependent story entry. A missed deadline loses morale. One 12-week extension is available at a morale cost. Retirement voids the promise using the employee's stable ID; other departure breaks it.
- A fulfilled promise protects the original cut. A limited overseas broadcast edition requires explicit creator agreement, recorded in the agreement history, with a morale trade-off. An absent creator cannot be silently substituted.

The first story chain is pitch → prototype/decision → leadership → release or missed promise → optional overseas edit agreement. Larger authored event families, interpersonal stories and employee-dossier presentation are future work.

## Working policies

Policy changes activate at the next four-week payroll boundary and cannot be queued repeatedly. Productions snapshot their terms when greenlit; funded prototypes snapshot their development schedule. Legacy productions acquire no retroactive obligations.

| Policy | Choices | Effect |
|---|---|---|
| Protected recovery | 0, 7 or 14 days | Contributors with at least 25% production participation receive paid leave and morale when production completes. Explicit recall costs morale. |
| Contribution profit share | 0%, 5% or 10% | Pays staff from positive cash receipts less tracked direct project costs. Contributor shares survive departure. |
| Creative development | Full time, 2 or 4 days per four weeks | Full-time prototypes require a free creator; reserved days allow another assignment outside development time. |

Leave and development block live production, editing and rush contributions. Staff continue receiving normal wages. Recovery restores energy. Profit pools exclude general payroll and rent; the UI explains this contribution-profit definition.

The project ledger includes domestic receipts, completed-show sale proceeds, commission advances and quality bonuses, and overseas receipts. Direct production, original launch, localisation and overseas campaign spending reduce contribution profit. Each identified receipt is settled once; rounding remainder is allocated deterministically. Overseas costs added after an earlier bonus do not claw back previously paid staff bonuses.

## Overseas releases and audience sensibilities

Three fictional territories avoid assigning uniform tastes to real nationalities. Each contains six interest groups, with different population weights and established genre audiences:

- Source enthusiasts: continuity and fidelity.
- Animation enthusiasts: visual craft.
- Character fans: story craft.
- Mainstream entertainment: accessibility and context.
- Family co-viewers: suitable intensity.
- Experimental viewers: complexity and originality.

Age targeting adds distinct kids, teens, adults and family responses within an interest group. It does not create a fresh audience pool. Sensibilities use six authored creative dimensions: violence, horror, sexual content, language, complexity and context. Genre-based defaults can be adjusted at concept before the first production day, then lock. These choices affect overseas suitability and reception; domestic scoring is preserved.

Release choices include specialist or family distribution; original subtitles, standard dub, premium dub or a limited broadcast edit; and £0/£15,000/£40,000 campaigns. The forecast explains audience fit, timing, upfront cost, distributor share, licensed-IP royalty and net studio receipts. A family broadcaster rejects unsuitable originals; very intense material cannot be made suitable through a light edit.

Language/edition work can be reused after localisation completes. Territorial exclusivity prevents overlapping releases of the same production. Same-edition repeats have a 48-week cooldown. Each project/territory/interest group has finite reach; changing age target does not reset it. Studio recognition and competing releases affect the next signed deal.

Signing freezes the terms, spends the launch cost and reserves audience exposure. At opening, exact weekly instalments enter the existing payout system. The release creates no second domestic critic result, show-made count or award entry.

### Ownership and compatibility

- New productions have explicit distribution ownership. Completed-show sales transfer those rights.
- Sold franchises and commissioned productions without a territorial grant cannot sign new overseas releases.
- Licensed productions require international rights covering the entire release window. Royalty is charged once, after the distributor share.
- Old productions require exact stable source-ID evidence of a retained release; ambiguous historical ownership is not guessed from a title. The £5,000 review is offered only as a conservative clearance mechanism and can fail when the old save lacks proof.
- Already signed releases retain their committed terms. New contracts recheck rights.
- Old blanket overseas offers/boosts are honoured until their existing expiry. New blanket offers are no longer generated; new overseas business uses per-production contracts.

## Code map

| File | Responsibility |
|---|---|
| `src/engine/studioExpansion.ts` | Agreements, pitches, production participation, policies, leave and receipt ledger |
| `src/engine/overseas.ts` | Territories, audience fit, editions, rights checks and signed-release cashflow |
| `src/engine/state.ts` | Additive save migration and integration with production, staff availability, release, sale and calendar operations |
| `src/engine/projects.ts` | Explicit production distribution ownership |
| `src/engine/careers.ts` | Stable staff identity in retirement records |
| `src/engine/market.ts` | Retirement of new blanket overseas offers |
| `src/components/StudioExpansionPanel.tsx` | Player decisions, forecasts and histories |
| `src/components/Office.tsx` | Menu access and modal layout |
| `src/engine/__tests__/studio-expansion.test.ts` | 26 focused regressions |

## Validation

- Focused suite: 26/26 passed.
- Full suite: 702/702 tests passed across 87 files.
- Production build and post-build cast verification passed, including all 520 Genre 30 source-identical portraits.
- TypeScript comparison against the starting main commit: no new diagnostics. The repository already has unrelated TypeScript errors, so this is not a clean whole-repo typecheck claim.
- Browser validation was blocked by the execution environment: the local browser download failed certificate verification, and the connected browser could not access the local server. No certificate checks or access controls were disabled.

## Playtest checklist and remaining scope

1. On a fresh or copied save, open the new panel on Pixel 9a portrait; check the close button from every tab and after scrolling. Check that game controls do not overlap it.
2. Promise leadership, greenlight a matching original and appoint the creator before advancing time. Confirm participation, deadline and fulfilment read clearly.
3. Schedule recovery and profit share, then greenlight another production. Confirm leave blocks work and cash receipts produce the expected bonus statement.
4. Compare low-intensity family and complex adult/experimental releases. Compare a dub's extra cost with its accessibility benefit. Verify loss-making contracts are clearly visible.
5. Sign a release, save/reload during localisation, and follow every instalment. Try an overlapping deal and a repeat age target; neither should replenish the same audience.
6. Try a sold production, a commission and a licensed production whose international rights expire before the proposed release ends.

Initial territory populations, fees, localising times, reach and reception weights need long-career balance testing. Forecasts are deterministic signed outcomes in this first pass; Data Lab uncertainty bands and market research are not implemented. Distributor relationships, richer regional events, multi-territory package negotiations, rival overseas strategies and a larger authored staff-story library remain follow-up work. The existing headless weekly production fallback remains coarser than live daily production; exact live-versus-headless work equivalence is not claimed.

The generated web build accompanies this branch. No APK, main merge or production deployment is part of this change.
