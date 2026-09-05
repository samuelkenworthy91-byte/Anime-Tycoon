# Cast V2 casting balance

This recommendation fits the current `scoring.ts` architecture at commit `63e072d`. The source currently counts every matching affinity (`n × 2.6`), so two selected genres can stack, contributes only to raw quality (`casting × 0.35`), and affects revenue only indirectly through reviews. It has no Anime Type and no fixed hidden field. V2 replaces that block; it must not be layered on top of it.

## Recommended constants

- `ROLE_WEIGHTS = { Lead: 1.00, Sidekick: 0.55, Mascot: 0.30, Villain: 0.45 }` (current weights retained; evaluation order matches the four named slots).
- Baseline cast presence: **0.50 raw quality per role-weight unit**. This gives any complete four-role cast a small casting contribution and lets Anime Type matter without inventing a mismatch penalty.
- Visible Correct Cast: **+0.60 raw quality and +2.5% sales-peak coefficient per role-weight unit**.
- Hidden Correct Cast: **+1.20 raw quality and +5.0% sales-peak coefficient per role-weight unit**, exactly double.
- Type match: **×1.10 on that character’s complete bounded casting contribution**. Type mismatch: ×1.00.

The sales coefficient modifies the existing `peak = 44_000 × appeal` after appeal is calculated and before the 12-week curve is rounded. Market, franchise, merch and late-delivery multipliers continue in their current order. This makes affinity affect money directly even when review rounding or the quality cap hides its ratings contribution.

## Formula

For character `c` in role `r`, let `w = roleWeight[r]`, `t = 1.10` on Type match else `1.00`, and `k = 2` when hidden matches, else `1` when either visible matches, else `0`.

```ts
baseCastQ_c = w * 0.50 * t;
correctCastQ_c = w * 0.60 * k * t;
castQuality = sum(baseCastQ_c + correctCastQ_c);

correctCastSales_c = w * 0.025 * k * t;
castSalesMultiplier = 1 + sum(correctCastSales_c);
```

Insert `castQuality` where current code inserts `casting * 0.35`. Multiply the sales peak by `castSalesMultiplier`. Do not multiply the whole quality score, total reviews, base character stats, salary, staff points, arcs, hype, genre combo, budget or total revenue after unrelated departments. Existing fixed arc bonuses remain fixed. The Type modifier belongs inside each role calculation; it is not a production-wide multiplier.

The Type contribution is independent in data and composable in arithmetic. At no affinity, matching all four Types changes the four-role cast term from 1.150 to 1.265 raw quality (+0.115), with no direct sales bonus. A mismatched all-visible ensemble has +1.380 Correct Cast quality and +5.75% direct sales; Type matching makes those +1.518 and +6.325%. A mismatched all-hidden ensemble has +2.760 and +11.50%; Type matching makes them +3.036 and +12.65%. The hidden affinity-specific parts remain exactly double within the same Type state.

## Best-tier and role examples

`Hidden > either visible > none`; return one tier. `visible1 + visible2 = 1`, `visible + hidden = 2`, and `hidden alone = 2`. Discovery state is absent from this function. Calculate four independent records, then sum. A Lead visible match contributes more than a Mascot hidden match because role importance remains intact; the Mascot hidden coefficient is still exactly twice that Mascot’s visible coefficient.

Example: Lead visible + Sidekick visible + Mascot none + Villain hidden, all Type-matched:

- Correct Cast quality = `(1×0.60 + .55×0.60 + .45×1.20) × 1.10 = 1.617` raw quality.
- Direct sales addition = `(1×.025 + .55×.025 + .45×.050) × 1.10 = 6.7375%`.
- Mascot still contributes its baseline 0.30×0.50×1.10 and other systems decide the outcome.

The maximum four-role affinity-specific ensemble is all four hidden and Type-matched: +3.036 raw quality and +12.65% direct sales. Including baseline, its full casting term is 4.301. This is close to the current two-visible-match ceiling of 4.186 raw quality, so V2 adds discovery and money effects without an unbounded new ceiling.

## Simulation methodology

`tools/simulate_balance.mjs` snapshots the actual repository `data.ts` and `scoring.ts`, verifies source markers, transpiles temporary modules with Node’s TypeScript stripper, inserts each candidate casting term, and calls the real review and 12-week sales functions. It changes no runtime file. Nine candidate grids combined quality coefficients 0.60/1.00/1.40 with sales coefficients 1.5%/2.5%/4.0%. Six scenarios span a clamped disaster, weak show, rookie, competent production, already excellent production and a high-expectation late project. Each candidate/scenario/casting regime used 1,000 deterministic random seeds.

The harness then tested every one of 210 production genre pairs for both Types. For each of the four real V2 roles it chose the best canonical eligible character, compared the result against the same cast with the affinity-specific term suppressed, and used 50 paired seeds: 42,000 scoring calls. Total run: 426,000 calls including controlled candidates and legacy baselines. The committed JSON preserves exact inputs, source hashes, unrounded results and every selected ID.

Results below use the recommended 0.60 / 2.5% values. Cells are **mean reviews out of 40 / mean 12-week revenue / hit rate (27+)**.

| Scenario | No affinity / mismatch | All visible / Type match | All hidden / Type match | Mixed ensemble |
|---|---|---|---|---|
| disaster | 4.00 / £4,730 / 0.0% | 4.00 / £5,029 / 0.0% | 4.00 / £5,328 / 0.0% | 4.00 / £5,048 / 0.0% |
| weak | 5.09 / £8,611 / 0.0% | 5.50 / £10,712 / 0.0% | 5.66 / £12,016 / 0.0% | 5.51 / £10,794 / 0.0% |
| rookie | 14.03 / £91,177 / 0.0% | 15.81 / £124,846 / 0.0% | 17.24 / £158,234 / 0.0% | 16.01 / £128,485 / 0.0% |
| competent | 21.84 / £355,330 / 0.0% | 23.20 / £429,306 / 0.0% | 25.09 / £535,694 / 0.0% | 23.38 / £438,103 / 0.0% |
| excellent | 36.00 / £1,324,373 / 100.0% | 36.00 / £1,408,139 / 100.0% | 36.00 / £1,491,906 / 100.0% | 36.00 / £1,413,603 / 100.0% |
| late high expectations | 29.79 / £1,175,101 / 100.0% | 29.79 / £1,249,426 / 100.0% | 29.79 / £1,323,752 / 100.0% | 29.79 / £1,254,274 / 100.0% |

Across the 420 real pair×Type casting cases, ratings improved by **1.20–3.34 review points** (median 2.24) over the same no-affinity cast in the competent scenario. Revenue increased by **£57,855–£233,295** (median £123,066); the direct affinity part was 9.90–12.65%, with the remainder coming from the current nonlinear review-to-sales curve. That nonlinear response is why the larger 1.00 and 1.40 quality candidates were rejected.

The disaster remains 4/40 and loses roughly £40k even with four hidden matches. The weak show remains about 6/40 and deeply unprofitable. The competent all-hidden case reaches only 25.09/40 and has 0% hit rate in this simulation; it does not cross the 27-point hit threshold. The excellent case is already quality-capped, so casting changes revenue directly but cannot inflate reviews beyond 36/40. This satisfies the requirement that four exceptional matches cannot rescue inadequate staff points, editing, sliders, budget and genre execution.

## Safeguards

1. Compute one tier once per role. Never sum matching visible genres and never add visible after hidden.
2. Keep integer tier and coefficients separate in debug data. Tests assert hidden coefficient = 2 × visible before rounding on quality and sales branches.
3. Apply the 10% Type multiplier only to the character’s cast term. A mismatch is 1.00, never 0.90.
4. Apply direct sales once to the unrounded sales peak. Do not also add an affinity revenue multiplier after market or merch.
5. Quality still passes through the existing genre combo, combo experience, issues and chemistry systems and the 4–60 clamp. Affinity does not bypass them.
6. Arc fit checks a boolean tier > 0 and pays the existing arc value once. It does not reuse tier 2.
7. The breakdown visible before release must not name or imply an undiscovered hidden match. A private receipt can store the tier and positive pre-round delta; the public breakdown shows a combined casting result. After release, the breakthrough may name the genre.
8. Discovery consumes the release receipt only after completed release and is idempotent by release ID. It changes knowledge only, never recomputes that release.
9. Add regression tests at raw coefficient level and fixed-RNG integration tests. Do not assert exact random reviews without controlling the seed.

## Required implementation tests

- Tier truth table: none 0; one visible 1; two visible 1; hidden 2; visible+hidden 2.
- Hidden operates while undiscovered and has exactly twice visible quality/sales coefficients.
- Type match is exactly 1.10 and mismatch exactly 1.00 for male, female and non-human fixtures.
- Four role weights are used once in the correct slots; missing/corrupt IDs fail migration rather than silently falling back to Kai.
- Pre-production public selectors cannot serialise hidden IDs. Sorting/filtering/recommendations remain identical when hidden values are permuted.
- Browse, selection, deselection, ownership and cancellation reveal nothing. Only a completed, genuinely contributing release reveals; replaying a release transaction is idempotent.
- Sales changes directly when review output is held constant. Affinity is not applied again in market, merch or late-delivery layers.
- A deliberately disastrous fixture remains a flop with all hidden matches; a normal ensemble gains measurable rating and revenue.

`tools/validate_cast_v2.mjs` currently passes the structural truth table and reference discovery reducer. These are design-validation scripts; production integration still requires tests in the runtime suite.
