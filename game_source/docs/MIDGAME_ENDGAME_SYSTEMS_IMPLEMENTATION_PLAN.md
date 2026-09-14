# Anime Runner / Anime Tycoon — Midgame & Endgame Systems Pass

Working branch: `work/midgame-endgame-systems-pass`
Base: `main` @ `00e568baa633cb5b79ba61504025530fcbae0a4f`

## Purpose

This pass addresses current playthrough UX/state issues, removes late-game clutter, creates meaningful long-term cash/research sinks, gives studios a strategic identity, and introduces the ultimate Year-6+ endgame: the industry's fan-defined **Big Three**.

This document is an implementation plan only. Each stage should be implemented, tested and reviewed separately. Do not merge the branch to `main` until the complete pass has been playtested and explicitly approved.

## Global constraints

- Preserve existing saves. Add migrations/defaults for every new persisted field.
- Existing productions, staff, IP contracts, rival histories and award history must remain valid.
- Do not silently delete historical records. Hide inactive/sold content from operational UIs but retain it in Records/History.
- New modal/event presentation must be deterministic and must never cover a higher-priority active reveal.
- Mobile validation must explicitly include Google Pixel 9a portrait dimensions/safe areas.
- Economy changes should create decisions, not simply add stronger bonuses the player can buy without trade-offs.
- Late-game power should come with escalating costs, opportunity costs and specialisation risk.

---

# STAGE 1 — Modal priority and Pixel 9a employee UI

## Goals

Fix the current portrait close-button problem and prevent level-up/reward pop-ups from appearing over more important screens.

## Implementation

### Employee/recruitment modal

- Move the portrait modal/header down inside the Android safe area.
- Keep the close `X` inside a sticky/fixed modal header rather than at the viewport edge.
- Ensure the body scrolls independently while the close control remains visible.
- Audit hiring, staff detail, employee management and any shared modal shell using the same layout.

### Global presentation queue

Introduce one presentation/event queue with explicit priority, for example:

1. Critical story/system reveal
2. Player decision / negotiation
3. Production/release/new-series reveal
4. Awards / major industry announcement
5. Staff level-up / training result
6. Routine notices

Mechanical effects still resolve when earned, but lower-priority presentation waits until all higher-priority modals are dismissed.

Example: a worker levels during a new-series reveal. Their stats update immediately, but the level-up modal is queued and shown only after the series reveal closes.

Multiple queued level-ups should be presented cleanly as one sequence rather than overlapping.

## Tests

- Pixel 9a portrait: close button always visible and tappable at top, middle and bottom scroll positions.
- Trigger level-up while a production/new-series reveal is active: no overlap.
- Trigger multiple level-ups: stable ordering and no lost rewards.
- Save/reload with queued low-priority presentation: no duplicated mechanical reward.

---

# STAGE 2 — Awards nomination slate and November announcement

## Goals

Stop a single rival studio from filling entire award categories and separate nomination selection from the ceremony itself.

## Implementation

### Frozen nomination slate

- Add an annual nomination checkpoint late in the year, approximately November / 4–6 in-game weeks before the ceremony.
- Evaluate all eligible releases available at that checkpoint.
- Build and persist one frozen nomination slate for that award year.
- The ceremony later consumes exactly that saved slate and does not recalculate nominees.

### Studio diversity

For each four-nominee category:

- Normal maximum: 2 productions from the same studio.
- Target: at least 3 distinct studios where qualifying candidates exist.
- Never insert an unqualified production merely to manufacture diversity.
- Relax the studio cap only where the qualifying pool genuinely cannot fill the category otherwise.

A dominant studio can still win multiple awards and can still earn two nominations in a category; it should not routinely provide all four.

### Nomination announcement

Add a polished industry pop-up when nominations are frozen:

- `THE LONDON ANIME AWARDS — NOMINATIONS ANNOUNCED`
- Show the player's nominated productions/categories prominently.
- If the player has no nominations, communicate that clearly without hiding the industry announcement.
- Persist acknowledgement so reloading does not replay it repeatedly.

## Migration

Old saves without a nomination slate generate one at the next valid nomination checkpoint. If loaded after that checkpoint but before the ceremony, generate/freeze it once on load/tick.

## Tests

- One studio owns the top four raw scores: diversity cap is enforced when alternatives qualify.
- Only one/two studios have qualifying works: fallback fills correctly.
- Nomination slate remains identical through save/reload and at the ceremony.
- Releases after the nomination cutoff do not retroactively enter that year's ceremony unless design explicitly marks them for the next award year.

---

# STAGE 3 — Independent IP renewal, sale state and operational cleanup

## Goals

Make IP ownership understandable, give independent IPs an ongoing renewal loop, and remove sold assets from active production UIs without erasing history.

## Implementation

### Explicit IP lifecycle state

Represent player relationship to an IP with an authoritative status such as:

- `owned`
- `licensed`
- `renewal_due`
- `expired`
- `sold`

Operational screens must derive availability from this state rather than one-off UI filters.

### Renewal choices

Before an independent/licensed IP expires, surface:

- **Negotiate Renewal**
- **Auto-Renew**
- **Let Expire**

Manual negotiation can affect price, duration, royalties and applicable rights.

Auto-renew should attempt to retain the property within player-configured/default limits rather than magically preserving the old contract. Successful/high-value IPs should become materially more expensive to retain.

### Sold IP cleanup

Once the player has sold an IP outright:

- Remove it from Series 2/sequel/adaptation creation menus.
- Remove it from normal active IP selectors.
- Grey/lock its proprietary cast in any selector where they might otherwise be chosen.
- Prevent new player productions from using the sold property or its exclusive characters.
- Retain all historic productions in Records.
- Retain the property in an IP History / Sold Rights record.
- Allow rival productions using the sold IP to appear normally in rival/industry records.

## Tests

- Sold IP cannot start a sequel through any creation path.
- Sold exclusive cast cannot be selected through filters/search/quick picks.
- Historic records survive and rival ownership/use remains visible.
- Renewal state survives save/reload and expiry boundaries.

---

# STAGE 4 — Training Room overhaul

## Goals

Turn training into an immediate, scalable cash/research sink and let the player prepare staff for unfamiliar genres before risking a production.

## Implementation

### Instant training

Training resolves immediately rather than consuming calendar time.

Training costs both cash and Research. Larger gains use strongly nonlinear costs.

Suggested tiers to tune in balance testing:

- Basic development: small +1–2 improvement.
- Advanced course: +3–5.
- Intensive/masterclass: potentially +6–10.

The cost to move an elite employee higher must be dramatically greater than improving a junior employee. Use diminishing returns/soft caps rather than allowing cheap universal maxing.

### Genre training

Allow a staff member to train familiarity/proficiency in a genre before being assigned to a production.

Suggested progression:

1. Familiarity — removes the harshest unfamiliarity risk.
2. Competence — positive contribution in the genre.
3. Specialist training — expensive late-game improvement.

Training a genre adjacent to existing strengths should be cheaper than training a radically unfamiliar genre.

### Research-room interaction

Higher Research investment/facility progression unlocks stronger courses and/or better training efficiency. Research should remain a meaningful spend throughout the game, not just an early unlock currency.

## Tests

- Training is immediate and applies exactly once.
- Cost curves rise with both gain size and existing skill.
- Genre training correctly changes production contribution/risk.
- Old staff saves gain sensible default genre-training state.

---

# STAGE 5 — Production investment ladder and permanent capability tracks

## Goals

Make late-game productions capable of absorbing very large budgets while retaining diminishing returns and meaningful choice.

## Implementation

### Tiered interventions

Convert suitable production interventions from one flat purchase into escalating tiers. Example pattern:

- Standard
- Extended
- Prestige
- Obsessive

Higher tiers cost disproportionately more and return diminishing marginal gains.

Early-game intervention costs can remain in the tens of thousands; advanced studio-three intervention packages should be capable of costing hundreds of thousands or millions where the benefit justifies it.

### Permanent capability ticks

Selected repeated investments can also feed slow permanent studio capability tracks, for example:

- Animation Pipeline
- Writing Development
- Sound & Music
- Post-Production
- Marketing/Launch

A capability track should provide small permanent advantages and become increasingly expensive at each level. It must not replace production-specific decision making.

Example: repeated serious animation investment gradually improves the studio's Animation Pipeline, but each permanent level costs substantially more cash/research than the previous one.

### Scaling

Pricing should account for studio tier/progression and the strength of the chosen effect. Do not scale purely from current bank balance in a way that punishes saving; use progression/value bands so prices remain strategically meaningful without feeling arbitrary.

## Tests

- Intervention tiers are mutually coherent and cannot double-charge/stack accidentally.
- Permanent tracks survive save/reload.
- Forecast/review systems account for the correct bonuses.
- Late-game spending can materially consume accumulated cash/research without making top outcomes automatic.

---

# STAGE 6 — Studio specialisation

## Goals

Give each mature studio a strong creative identity: exceptional when working in its signature genre, but less certain outside it.

## Implementation

### Signature genre

Unlock specialisation at an appropriate studio/progression milestone, likely studio 2–3.

The player chooses one **Signature Genre**.

Any production containing that genre can combine it with any other genre and still receive the studio's specialisation benefits.

Potential benefits to tune:

- Production efficiency/output.
- Better use of trained specialist staff.
- Higher ceiling/chance of exceptional craft.
- Reduced cost or improved effectiveness for matching production interventions.
- Improved forecasting/understanding of that genre.

### Outside-specialism risk

Do not apply a crude universal score penalty. Productions with no signature genre should instead become harder/more expensive to perfect through some combination of:

- Higher variance.
- Weaker forecasting certainty.
- Higher intervention cost.
- Reduced passive capability contribution.

The player can still experiment, but the studio has a real identity and opportunity cost.

### Long-term depth

Allow expensive upgrades such as:

- Genre Studio
- Genre Authority
- Genre Institution

A very late secondary specialism may be considered only if it remains costly enough that the studio cannot become equally specialised in everything.

## Tests

- Signature genre applies regardless of what second/third genre it is paired with.
- No-signature productions remain viable but riskier/costlier.
- Specialisation modifies all intended production paths consistently, including licensed IPs using the same genre-fit logic as their genre combination.
- Save migration gives old saves no accidental specialisation until the player chooses one.

---

# STAGE 7 — Year 6+ ultimate endgame: THE BIG THREE

## Design goal

From Year 6 onward, the industry enters a new prestige era built around fandom arguing over the era's **Big Three** anime. This is not another London Anime Awards category. It is a rare, fan/culture-driven status that can define an entire playthrough.

Getting one of the player's productions officially recognised as part of the Big Three should feel like one of the largest achievements in the game.

## Year 6 opening event

At the start/middle of Year 6, trigger a highly polished standalone industry event announcing that critics/fandom have started talking about a new Big Three era.

The **first Big Three title is named in Year 6** and should initially come from a rival studio.

This title should not feel like an ordinary procedurally named rival release. Give it:

- A dedicated flagship IP/show identity.
- A bespoke high-quality poster/key visual.
- A named rival studio owner.
- Strong production history/metrics appropriate to an era-defining show.
- A special reveal presentation with its own visual treatment.

This creates an endgame target rather than simply telling the player to hit a number.

## Big Three status model

Persist three Big Three slots for the era.

Each slot records at minimum:

- Production identity/title.
- Studio owner.
- Year recognised.
- Poster/key art.
- Recognition metrics.
- Whether it belongs to the player or a rival.

Once a slot is formally recognised, it is historically permanent for that Big Three era unless a later design explicitly introduces generational eras.

## Qualification

A production should need to clear an **era-defining threshold**, not merely win an award.

Use a composite qualification model so one exploitable stat cannot trigger Big Three status. Candidate dimensions should include:

- Very high critical reception.
- Exceptional audience/fan reach relative to the era.
- Strong cultural/franchise momentum or sustained performance.
- Appropriate quality floor across craft rather than one isolated category spike.

Keep the exact constants as named balance values so they can be tuned after simulation/playtesting. The target should be substantially harder than ordinary awards or Hall-of-Fame recognition.

A production that clears the hard qualification threshold becomes eligible for fan recognition. If an open Big Three slot exists, trigger recognition at the appropriate post-release/fandom checkpoint.

## Standalone fan-decided reveal

Big Three recognition must happen outside the award ceremony.

Presentation concept:

- Full-screen polished fan/industry takeover.
- `THE BIG THREE HAS A NEW NAME`
- Large poster/key visual.
- Studio and production name.
- Short language explaining that fandom consensus has elevated the title into the era-defining trio.
- Major prestige/fan/reputation reward.

This event should use the high-priority presentation queue and never be buried under routine notices.

## Rival competition for remaining slots

After the seeded first title is named, rivals continue producing candidates. The player is therefore racing the industry for the remaining open slots.

Do not reserve a slot for the player. If rival productions legitimately clear the threshold first, they can claim the remaining places and the player may miss the Big Three entirely in that save.

Conversely, once the player's production qualifies and claims a slot, it remains part of the era's Big Three and should be celebrated across Records, studio prestige displays, rival commentary and relevant endgame summaries.

## Rewards and consequences

Big Three recognition should provide a major but not game-breaking reward package, weighted toward prestige rather than simply free cash:

- Very large fan gain.
- Major studio reputation/prestige increase.
- Permanent record/badge.
- Strong franchise/IP value multiplier for that title.
- Increased licensing/merch/renewal leverage where applicable.
- Rival reaction/industry notices.

The most important reward is permanent status and visibility.

## UI/records

Add a prominent **BIG THREE** section to suitable industry/records/endgame screens showing the three poster slots, studio, title and recognition year.

Before all three are filled, empty slots should visibly communicate the remaining opportunity.

Sold or licensed rights do not erase the historical studio credit for creating a Big Three production; current ownership and original creator can be shown separately where relevant.

## Save compatibility

- Saves before Year 6 have an empty/inactive Big Three state.
- Saves already beyond Year 6 should initialise the era safely and trigger the Year-6 introduction/seed process once, without rewriting existing production history.
- Recognition must be idempotent: reloading cannot award the same slot twice.

## Tests

- Year 6 triggers the Big Three era exactly once.
- First seeded title belongs to the intended rival studio and has its bespoke visual.
- Ordinary award-winning shows below the threshold do not qualify.
- A qualifying player show claims an open slot exactly once.
- A qualifying rival can beat the player to an open slot.
- Three filled slots prevent additional recognitions for that era.
- Save/reload preserves slots and never duplicates rewards/pop-ups.
- Sold IP/ownership changes do not erase historical Big Three creator credit.

---

# STAGE 8 — Full balance, migration and regression pass

## Goals

Validate the whole progression curve from early studio through Year 6+ rather than balancing each subsystem in isolation.

## Required validation

- Existing save migration from representative old saves.
- New game progression through studios 1–3.
- Cash/research accumulation curves before and after new sinks.
- Training affordability and abuse cases.
- Production intervention ROI at each studio tier.
- Studio specialisation strength inside and outside signature genre.
- Awards nomination diversity across multiple simulated years.
- IP sale/renewal lifecycle across multiple seasons.
- Big Three qualification rate across many simulated Year-6+ seasons.
- Mobile portrait regression on Pixel 9a dimensions.
- Full automated test suite.
- Production/browser build.

## Desired progression outcome

- Early years remain financially tense and imperfect productions are normal.
- Mid-game gives the player more control but creates meaningful spending choices.
- Studio three does not trivialise cash or Research.
- Specialisation allows mastery without universal safety.
- Year 6 introduces a fresh aspirational objective even for a wealthy, successful studio.
- Earning a Big Three slot is rare enough to feel like the culmination of the save rather than an automatic consequence of reaching Year 6.

---

# Suggested implementation order / commit boundaries

1. `Fix mobile modal layout and add presentation queue`
2. `Freeze annual award nominations and diversify nominee slates`
3. `Add IP renewal lifecycle and sold-IP operational locking`
4. `Overhaul instant staff and genre training`
5. `Add scalable production investment and capability tracks`
6. `Add studio signature-genre specialisation`
7. `Introduce Year 6 Big Three endgame system`
8. `Balance and harden midgame-endgame progression`

Each stage should report:

- Exact files changed.
- Behaviour added/changed.
- Save migration impact.
- Focused tests added and results.
- Full test/build result where appropriate.
- Exact branch HEAD.

Do not merge to `main` until explicitly approved after playtesting.
