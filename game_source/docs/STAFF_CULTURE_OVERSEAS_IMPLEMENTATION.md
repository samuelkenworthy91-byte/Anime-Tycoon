# Staff culture and overseas markets — completion pass

Branch: `work/staff-culture-overseas-expansion`
Original main base: `f579951f589099a0c13ff3c911e4fff3b0122550`
Initial playable pass: `a2d9e6cdb07ff39ac6e980d2c6d3b0f6da3c5348`

The feature scope described below is implemented. Main has not been merged. Physical Pixel 9a/browser verification remains blocked by the test environment; balance numbers are initial tuning rather than a guarantee of long-term balance.

## Saved implementation steps

Each step was committed and pushed before the next one began:

1. `c89a12dac89d745e539e313204565d21cdf89bc7` — staff story chains and paid mentorship, 31 focused tests passing.
2. `fa2eb22026cb7252de216b532da630e9a90facc0` — employee-profile integration, production build passing.
3. `2005277c627b06e0303a2aa8205c9e22e46d03b3` — overseas strategy engine and catalogue searches, 42 focused tests passing.
4. `a9fe92818d12b479ee521a33d175f0cd945f2127` — overseas strategy controls and uncertain player-facing forecasts, full suite and build passing.

The final checkpoint includes this document and the refreshed `dist/index.html` playtest build.

## Access

Office → MORE → STUDIO CULTURE & OVERSEAS.

Employee cards also expose AMBITIONS & WORKING AGREEMENTS: current promises, project participation, deadlines, recovery, profit payments, pitch acceptance, extension choices and personal stories.

## Staff ambitions, promises and stories

- Staff with at least 24 weeks' tenure and two release credits can offer personal pitches. The studio has an eight-week pitch cooldown, each employee has a 48-week cooldown, and at most two pitches remain outstanding.
- Development costs £8,000 × (1 + 0.75 × office level), takes 28 paid working days and reveals a single-genre direction report. It does not grant free production quality or promise that a genre pairing has the same target.
- A player can fund development, accept a leadership brief immediately, decline without promising, or cancel development without refunding committed spending.
- Leadership agreements require a matching, self-funded original production, named leadership before departmental work starts, release within 48 game weeks and at least 60% department-day participation. Milestone waiting does not count. One 12-week extension has a morale cost.
- Fulfilment, missed deadlines, retirement and departure have persistent outcomes. Stable employee IDs distinguish retirement from a different employee with the same name.
- Fulfilled promises protect the original cut. A limited overseas edit needs an explicit creator agreement with a morale trade-off; an absent creator cannot be silently replaced.

Five personal story families extend this loop:

| Story | Trigger and choices | Persistent consequence |
|---|---|---|
| Recognition | A fulfilled creative promise; studio showcase or private thanks | Morale response; a showcase can lead to mentoring |
| Mentorship | A recognised senior creator and a colleague at least three levels junior | £4,000, two paid days per week for eight sessions; both gain morale and establish the existing relationship-system bond |
| Creative clash | An established clash between current collaborators | £3,000 mediation resets relationship accumulation and improves morale, or continuing work loses morale; personalities remain unchanged |
| Recovery request | An available employee has very low stamina | Paid recovery and morale, or deferral with a morale cost |
| Trust repair | A missed creative promise | Practical recovery support or acknowledgement; the broken promise remains in history |

Story offers expire after 28 days. A studio cooldown and employee cooldown limit repeated offers. Departures archive affected stories without substituting another employee. Daily story progress is idempotent across repeated calls and saves. Mentorship uses the same availability checks as production and editing.

## Working policies and accounting

Policies activate at the next four-week payroll boundary. New productions snapshot recovery/profit terms; funded prototypes snapshot their development schedule. Existing production agreements survive policy changes. Old productions gain no retroactive obligations.

- Recovery: 0, 7 or 14 paid days for contributors with at least 25% participation; an explicit recall costs morale.
- Profit pool: 0%, 5% or 10% of positive cash receipts less tracked direct project costs. Shares survive staff departure and rounding is deterministic.
- Development: dedicated full-time work or two/four reserved days per four weeks. Reserved-time creators can hold another assignment on other days.

The ledger recognises identified domestic receipts, completed-show sales, commission advances/bonuses and overseas receipts. Production, original launch, localisation, campaigns and project-specific negotiation spending reduce contribution profit. General payroll, rent and studio-wide event sponsorship are excluded. Previously paid bonuses are not clawed back if later investment reduces contribution profit. A stable receipt ledger prevents paying the same bonus twice.

## Overseas audiences and distribution

Three fictional territories contain different mixes of six viewer-interest groups: source enthusiasts, animation enthusiasts, character fans, mainstream entertainment, family co-viewers and experimental viewers. Kids, teens, adults and family targeting modify response within those audiences; changing demographic does not create a new population pool.

Creative profiles track violence, horror, sexual content, language, complexity and context. Genre defaults can be adjusted at concept before the first production day. They lock thereafter. Domestic critic scoring is preserved.

Players choose specialist or family distribution, subtitles/standard dub/premium dub/limited edited dub, and a launch campaign. Family broadcasters reject unsuitable originals, and very intense material cannot be made suitable through a light edit. Completed language/edition work can be reused. Territorial exclusivity and same-edition cooldowns prevent overlapping contracts; finite project/territory/interest-group reach prevents repeat releases from minting fresh audiences.

Signed deals freeze their terms. Exact reception, viewers and receipts are hidden in the UI until opening. Local release uses the existing weekly payout system, without adding another domestic review, show-made count or award entry.

### Research and uncertainty

Reception includes a stable regional-season response and a smaller production-specific response. Reopening the screen or reloading the same save does not reroll them. Ordinary forecasts show a broad range; an Audience Data Lab study costs research data and reveals the regional component, narrowing the range. Studies last through the current 12-week market season. Actual release response remains uncertain even after research.

The player-facing forecast shows a reception range, a net receipt range and contribution after upfront spending. Committed outcomes are not shown early in the signed-release list.

### Distributor relationships and negotiations

Relationships are tracked separately for each territory/distributor pair. A completed profitable, well-received release improves trust; weaker outcomes reduce it. Completion settles the relationship change once. Strong relationships improve future revenue shares.

The Legal Desk offers a paid negotiation for either a lower distributor share or more reach. Concessions last 12 weeks, cannot be repeatedly purchased while active, and are frozen into a signed contract. The fee is a direct project cost.

### Regional events and rival activity

Each territory has a deterministic 12-week programming/festival/audience event aimed at one interest group. Opening during that window supports reach. A £12,000 sponsorship adds a bounded benefit while the event applies; it cannot be purchased repeatedly or improve previously signed outcomes.

Competing regional windows derive from actual rival releases. Rival tier, genre fit and score determine their overseas positioning. Overlapping releases reduce addressable reach, with a cap on pressure. The UI lists competing productions and event windows. This adds competition to the overseas model without counting a rival's domestic production twice.

### Multi-territory packages

A Legal Desk can sign two or three territories for one production using the selected distributor, audience, edition and campaign. Packages reduce distributor fees by 10% and pay matching language/edition localisation once. The quoted package cost agrees with cash, release costs and the strategic-spending ledger. Validation is atomic: an unavailable or unaffordable component prevents the entire package from signing.

### Ownership and older catalogues

New productions retain explicit distribution ownership; completed-show sales transfer it. Sold franchises, ungranted commissioned productions and licensed projects lacking international rights cannot sign new overseas releases. Licensed rights must cover the full release window; royalties are charged once after distributor share.

For old titles, an immediate review still requires an exact retained source ID. A Legal Desk can also open a two-week historical search using retained player-release evidence, exact award nominee IDs and identified domestic receipts. Cases freeze available evidence so an annual rollover does not discard it midway. Missing evidence remains visibly unresolved: the game does not guess ownership from a title or grant rights because the player paid a search fee.

Previously offered blanket overseas deals and their existing boosts remain valid until expiry. New blanket offers are no longer generated.

## Code map

| Files | Responsibility |
|---|---|
| `studioExpansion.ts`, `staffStories.ts` | Production agreements, availability, leave, receipts and personal story progression |
| `overseas.ts`, `overseasStrategy.ts` | Audience response, rights, cashflow, forecasts, studies, negotiations, packages, events and rival competition |
| `state.ts`, `projects.ts`, `careers.ts`, `market.ts` | Save/calendar integration, ownership, retirement identity and legacy offer compatibility |
| `StudioExpansionPanel.tsx`, `StaffCultureProfile.tsx`, `OverseasStrategyPanel.tsx`, `Crew.tsx`, `Office.tsx` | Player controls, employee integration, forecast visibility and modal access |
| `studio-expansion.test.ts`, `staff-stories.test.ts`, `overseas-strategy.test.ts` | 42 focused regression tests |

## Verification and remaining validation

- Full suite: **718 tests passed across 89 files**.
- Production build and post-build canonical cast verification passed, including all 520 source-identical Genre 30 portraits.
- Focused tests cover story chains, eight real mentorship days, duplicate calls, departed employees, research and negotiation repeat guards, forecast bounds, atomic packages, shared localisation cost, seasonal sponsorship expiry, relationship settlement and historical evidence.
- A 104-week progression test includes a mid-release save/reload and verifies that the regional contract completes and settles once.
- No diagnostics in the new modules/components were reported by TypeScript. The repository still has pre-existing errors; this is not a clean whole-repository typecheck claim.
- Physical Pixel 9a and interactive browser validation remain unverified. The earlier local browser install failed certificate verification and the connected browser could not access the local server. No security controls were weakened to bypass that restriction.

Before main promotion, manually check portrait scrolling and close controls, forecast readability, package selection, staff-story choices, and the feel of costs over a real career. The existing headless weekly production fallback is coarser than live daily production; exact equivalence is not claimed. These validation limits do not represent additional unimplemented story/market features.

No APK, main merge or production deployment has been performed.
