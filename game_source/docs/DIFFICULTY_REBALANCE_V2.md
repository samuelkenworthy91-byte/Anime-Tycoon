# Difficulty Rebalance V2 — Anti-Snowball Campaign

Implemented against live `main` after playtesting showed that an early high-scoring second production could effectively solve the economy.

## Design rule

Success remains rewarding, but success makes the industry react. Difficulty is not implemented as a flat price multiplier.

## Industry Pressure

Pressure is derived from existing save data (career year, best score, hits, awards, fans, cash and #1 ranking), so the change is additive and save-compatible. It runs from 0–6 and begins during the normal twelve-year campaign rather than waiting for Dynasty Mode.

Pressure raises next-year rival greenlight quality, can expand strong rivals' slates, gently raises audience expectations, increases payroll pressure and is shown on the Rivals screen.

## Fanbase commercial ceiling

The old logarithmic audience flywheel had no practical ceiling. The new established-audience sales multiplier approaches and caps at ×1.80. Fans still create a meaningful commercial floor without turning the second hit into unlimited capital.

## Rival talent

Rival notables are no longer cheap shop items. Poaching now requires studio prestige and charges a contract buyout/signing package based on talent quality, employer tier/reputation/rivalry and current Industry Pressure. Rival employers effectively counter-offer through a protection premium. The source studio receives compensation and recruits a delayed replacement, preventing permanent roster stripping.

## Management strain

One production is unaffected. Every parallel major production adds management strain. Larger offices, department heads and the Global Flagship Headquarters mitigate the penalty. This makes simultaneous pipelines an empire-management choice instead of free throughput.

## Awards

Fan Favourite remains a literal audience ranking. Jury categories retain their real craft/score metrics but add a small deterministic annual taste swing. It can decide close contests but cannot make mediocre work beat a clearly superior production. Exact metric ties retain the documented score → audience → title tie-break.

## Rival response

Finishing #1 increases rivalry heat and momentum among competing studios. At higher pressure, tier 3–5 studios may greenlight denser slates. Surprise productions also receive a modest champion-response boost while the player holds the top ranking.

## Core tuning constants

- Industry Pressure: `0..6`
- Rival quality pressure: up to `+6`
- Campaign audience expectation: up to `+6` bar units (review effect remains mild)
- Campaign payroll multiplier: up to `×1.28`
- Fanbase sales multiplier: cap `×1.80`
- Parallel-production output cost: `−7.5%` per extra active project before mitigation
- Multi-airing attention floor: `×0.65`

The intent is that an excellent second production is still exciting; it simply causes the rest of the industry to notice the player instead of ending the competitive game.
