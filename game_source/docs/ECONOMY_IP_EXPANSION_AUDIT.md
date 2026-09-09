# Economy + IP Expansion: Live Main Audit

Audited against `main` at `daf22f89dfc489a08c177233555fbdded65f38f6` before implementation.

## Authoritative architecture

- Save envelope: `src/engine/storage.ts`, version 5, four slots (`auto`, `1`–`3`). `App.tsx` always calls `migrateRun()` on load. The safe integration point is additive fields in `RunState` plus defaults in `initialRun`/`migrateRun`; changing the storage key would strand existing careers.
- New career: `App.tsx` overlays `randomStartingGenres()` onto `initialRun()`. This correctly creates two distinct random live genres. Legacy `initialRun` defaults remain only as a defensive/headless fallback; the live route must not be changed back to fixed genres.
- Genres and secrets: `data.ts`, generated Genre V3, `comboLevels`, `genreKnowledge`, and `SECRET_COMBOS`. Existing saves migrate removed IDs through `castV2Migration.ts`.
- Story arcs: `ARCS`, generated Arc V3, `arcUnlocked`, `arcKnowledge`, `arcGenreKnowledge`, and discovered `ARC_COMBOS`. Arc fit is intentionally hidden until shipped/researched. Property-derived blueprints should enter through `arcLockReason`, not a second picker.
- Project creation: `Create.tsx` is a seven-step original-production flow. It selects four employed cast roles. `startProject()` is the authoritative greenlight transaction. A licensed route therefore needs a separate setup component and a `Draft.licensedIpId` discriminator; forcing it through `Create` would violate the cast model.
- Production: persistent `Project[]`, stages, weekly/daily ticks, staff assignment, milestones, issues, live quality and automation. Contextual interventions belong on `Project` and transact through pure state functions.
- Quality/reviews: `projects.ts` collects points; `scoring.ts` computes ratios, direction sliders, cast, arcs, issues, reviews, revenue and fans. `production.ts` maintains a mild EMA expectation. Licensed fan expectations and royalties should wrap the existing result, while canonical IP casts bypass cast chemistry/contribution.
- Staff/showrunners: career staff, heads, morale, raises, rival poaching and eight showrunner strategies are live. Retention contracts can augment poaching without replacing the baseline employment UI.
- Rivals: six persistent studios in `rivals.ts`, with persona, tier, reputation, preferred/specialist genres, momentum, releases, franchises and talent. Auction bidding should read these fields on weekly ticks.
- Rivals and posters: rival productions permanently select poster IDs from `public/rival-posters/*.webp`; the imported library is catalogued in generated manifests. Existing named Toei art is 4:5 WebP, approximately 100–180 KB. Auction IP art should use the same 4:5/mobile-readable/WebP convention.
- Economy: £90,000 start cash; 4-week rent/wages/facility upkeep; staged production upfront/burn; 12-week release payouts; commissions, contracts, emergencies and two bailouts. Prices in the brief must be scaled to this live economy.
- Market/difficulty: `market.ts` already implements seasonal heat, 36-week genre saturation, and split-attention penalties. `rivals.ts` injects rival release records and head-to-head pressure. `franchise.ts` already implements fan expectations, fatigue and disappointment. These are the safest places to deepen difficulty without duplicate meters.
- Facilities: ten tiered rooms. Marketing Office already changes campaign efficiency; Archive & Research is the natural first Legal/Data capability until dedicated rooms are added.
- R&D: timed research jobs, genre licences, format licences, hidden relationship discovery, audience panels and numeric findings. Appraisals should reduce uncertainty rather than add quality.
- Legal/Data: there were no dedicated Legal Desk or Data Lab entities. The expansion initially uses Archive tier as capability/odds and leaves dedicated facilities as a future data migration, avoiding office-slot disruption in old saves.
- Marketing: `Ship.tsx` buys campaigns before release; Marketing Office changes hype and price. Strategic campaign expansion should extend this transaction rather than introduce a parallel marketing currency.
- Merchandise: `franchise.ts` has six research-gated product lines, cooldowns, popularity/score gates and scheduled payouts. Licensed merchandise must additionally check contract rights.
- Awards: annual seven-category ceremony, real player/rival craft data, pauses live play, pays category prizes, affects rivals/rankings.
- Events/history: studio dilemmas, market events, notices, franchise timelines, Hall of Fame, project archive, annual award slates and rival histories are all persistent.
- Build: Vite single-file browser build produces `dist/index.html` plus public assets. GitHack serves committed `dist`; `npm run build` is the authoritative browser build step. Capacitor consumes the same build for Android.
- Tests: Vitest suite in `src/engine/__tests__`, balance tests in `scripts/`, plus asset and content validation.

## Integration decisions

1. Add `ipMarket`, contracts, history, discovered blueprints and strategic-spend ledgers to `RunState`; migrate lazily.
2. Tick auctions once per in-game week after the persistent rival world advances; never per render frame.
3. Keep original `Create` untouched and add a distinct licensed setup route. A licensed draft carries canonical character names and explicitly suppresses employee-cast scoring/discovery.
4. Reuse market saturation, attention, franchise expectation, production stages, facilities, payouts and notices.
5. Keep poster filenames stable at `/auction-ip/ip_NNN.webp`; procedural key-art cards are an explicit temporary fallback until independently generated final posters pass QC.

