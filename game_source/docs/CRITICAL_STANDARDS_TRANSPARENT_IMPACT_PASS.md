# Critical Standards & Transparent Impact Polish

## Design goal

This pass deliberately preserves Anime Runner's high-output late-game fantasy. Staff, facilities,
showrunner perks, research, specialisation and other multipliers are not flattened simply because
a mature studio can generate very large Story / Art / Sound totals.

Instead, the industry becomes harder to impress at the elite end of the review scale while the
release report explains exactly what the player's systems and decisions contributed.

## Mature-industry critical standard

`industryCriticalStandard()` is derived primarily from career year and only lightly accelerated
by visible studio success.

- Years 1–4: emerging industry; no mature-era elite penalty.
- Years 5–8: established industry.
- Years 9–13: competitive era.
- Years 14–19: elite era.
- Years 20–25+: golden age.
- Maximum elite-review adjustment: 0.85 critic points.

The standard is weighted by the critic's internal score:

- 7.0 and below: no effect.
- 8.0: half effect.
- 9.0+: full effect.

This means an ordinary 5/10 or 6/10 work is not arbitrarily made worse in Year 20. The moving
goalposts distinguish strong 8s, 9s and 10s.

The existing studio review-expectation EMA and campaign audience pressure remain separate:
one represents what critics know this studio can do, the other represents the wider industry.

## Critical Darling

Critical Darling keeps its +0.40 internal critic bonus.

Its perfect-review identity is now explicit and regression-tested:

- Critical Darling: **9.40 pre-perk internal critic score** enters rare 10/10 consideration.
- Other directors: **9.92 after normal critic perks** enters rare 10/10 consideration.
- The existing rare-perfect confirmation remains: eligibility does not guarantee a 10.

This avoids tying the perk identity to an accidental arithmetic relationship between unrelated
constants. A future scoring retune cannot silently remove the 9.40 behaviour.

## Transparent impact accounting

Projects now retain a structured ledger of realised production effects rather than asking the UI
to reconstruct them after release.

Live project bubbles use the same percentile roll while walking each multiplier in calculation
order. The difference at each step is attributed to that source, preventing double-counting.

Tracked production sources include, where applicable:

- staff morale / traits / relationships;
- team coordination;
- studio management capacity;
- house specialisation;
- production and craft research tracks;
- Full Delegation / The Delegator;
- The Sloth;
- Over 9000;
- Roxie Kade;
- Prince of Darkness / Brighter Than the Dawn;
- Ensemble Director;
- facilities;
- department heads and legends;
- pipeline / storyboard / motion capture / QA research;
- The Finisher;
- Genji Ashida;
- Executive Rush;
- milestone Story / Animation / Recording sprints;
- last-minute QC inspiration;
- paid production interventions.

Executive Rush is treated sequentially: the normal bubble retains its underlying system
attribution, while the duplicated bubble is attributed wholly to Executive Rush. This answers the
player-facing question “how many extra Story / Art / Sound points did buying Rush actually create?”

Paid interventions also record their real cash cost so the release report can show benefit and
trade-off together.

## Creative and critical explanation

Every release records structured entries for:

- capped production output;
- direction sliders;
- casting;
- story arcs;
- genre/combo mastery;
- unresolved notes;
- studio expectation;
- audience/campaign pressure;
- current industry standard;
- Critical Darling / Sloth critic-specific polish.

Hidden cast affinities and other undiscovered knowledge are not exposed merely because an internal
calculation exists. The report only names information the player is allowed to understand.

## Commercial accounting

Sequential release modifiers record real before / delta / after values. Examples include:

- Business & Audience discipline: exact extra pounds and fans;
- market demand: exact gain/loss;
- Merch Department: exact extra pounds;
- late delivery: exact lost revenue and fans.

The premiere report therefore shows values such as “£18.4m → £20.2m (+£1.8m)” instead of merely
“×1.10 revenue”.

## Premiere / greenlight UX

Original, continuation and licensed greenlight screens show the current critical climate before the
player commits.

The premiere's Detailed Impact Breakdown contains:

1. the three biggest positive realised effects;
2. the biggest non-spending drag;
3. an investment summary;
4. the active critical era;
5. expandable Production / Creative / Critical / Commercial / Fan / Spend sections;
6. the old formula list retained as a deeper diagnostic layer.

Individual critic cards can expose the internal score, mature-industry deduction and whether the
perfect-score gate was cleared.

## Prestige presentation

Mechanical Hall of Fame / sequel eligibility remains at 32/40.

Presentation now distinguishes the top end:

- 32+: Hall of Fame;
- 36+: All-Time Classic;
- 38+: Era-Defining Masterwork;
- 40: Perfect Masterwork.

Big Three remains at its existing **38/40 minimum review qualification**. The new critical standard
is intentionally not compensated for by lowering that threshold: a Big Three work should remain a
genuinely exceptional late-era achievement. Existing rival-quality pressure continues to represent
the wider industry's rising capability.

## Regression coverage

`critical-standards-impact.test.ts` locks:

- 9.40 Critical Darling perfect gate;
- 9.92 normal perfect gate;
- mature standard weighting and cap;
- actual Critical Darling ten-rate advantage across seeded elite productions;
- exact project bonus carry-through (including Executive Rush / Sloth examples);
- exact 10% Business & Audience revenue accounting.

The normal full suite, focused depth/clarity validation, production build, Pixel 9a smoke test and
Android strict-type/test/build pipeline are the release gates for this pass.
