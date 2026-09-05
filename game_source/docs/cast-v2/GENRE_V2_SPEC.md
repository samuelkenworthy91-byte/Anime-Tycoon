# Genre V2 specification

Canonical design specification, 4 September 2026. This is an implementation contract for the 21-genre system and the independent Anime Type dimension. It was derived from the live definitions and economy on `feature/kairosoft-production-pass` at `63e072d`, but it does not modify the live game.

## Data contract

`AnimeType = "SHONEN" | "SHOJO"`. Every new or active production stores exactly one `animeType` before genres are selected. Shonen and Shojo describe production and casting traditions. They never mean male/female, never restrict a cast gender or species and never appear in `GenreId`, genre selection, genre research, audience fit maps, arc synergy, market trends or combo keys.

`GenreId` is exactly: `mecha | isekai | slice | horror | romance | sports | cyber | fantasy | idol | mystery | comedy | cooking | military | supernatural | space | magical | survival | pirate | martial | mythology | nordic`.

The three direction sliders retain the current UI axes: **Plot ↔ Characters**, **Sakuga ↔ Consistency**, and **Soundtrack ↔ Voice Cast**. Each ideal below is the 0–100 value toward the first named side, matching the current data comment and score calculation. Story/Art/Sound is the target contribution mix and sums to 1.00. Icons are suggested Lucide concepts and may use the nearest available icon if a package version lacks one.

| GenreId | Label | Definition | Icon | Ideal sliders | Story / Art / Sound | RD | Tier |
|---|---|---|---|---|---|---|---|
| mecha | Mecha | Piloted or autonomous large machines; engineering, embodiment and responsibility. | Bot | 60 / 72 / 48 | 0.22 / 0.54 / 0.24 | 32 | MID |
| isekai | Isekai | Displacement into another world; adaptation, changed social rules and identity. | Sparkles | 66 / 58 / 45 | 0.38 / 0.38 / 0.24 | 26 | MID |
| slice | Slice of Life | Everyday work, school, home and community; small stakes can carry deep meaning. | Coffee | 30 / 36 / 55 | 0.45 / 0.25 / 0.30 | 0 | START |
| horror | Horror | Fear, dread, uncanny humans, monsters, isolation and threatened safety. | Ghost | 66 / 40 / 72 | 0.32 / 0.30 / 0.38 | 30 | MID |
| romance | Romance | Attraction, boundaries, intimacy and romantic conflict across genders. | Heart | 26 / 46 / 56 | 0.46 / 0.24 / 0.30 | 14 | EARLY |
| sports | Sports | Athletic training, teams, competition and sporting achievement; includes motorsport formerly Racing. | Trophy | 72 / 75 / 55 | 0.26 / 0.50 / 0.24 | 18 | EARLY |
| cyber | Cyberpunk | Networked power, artificial identity, augmentation and corporate technology. | Cpu | 58 / 66 / 76 | 0.30 / 0.36 / 0.34 | 50 | LATE |
| fantasy | Fantasy | Invented worlds with extraordinary rules, cultures or creatures; not synonymous with every myth. | Sword | 60 / 60 / 50 | 0.36 / 0.40 / 0.24 | 0 | START |
| idol | Idol | Performance, rehearsal, fandom, manufactured image and entertainment-industry relationships. | Mic2 | 55 / 56 / 82 | 0.24 / 0.32 / 0.44 | 38 | MID-LATE |
| mystery | Mystery | Investigation, evidence and revelation; noir remains an aesthetic within this and other genres. | Eye | 72 / 40 / 50 | 0.50 / 0.24 / 0.26 | 40 | MID-LATE |
| comedy | Comedy | Timing, absurdity, social observation and character-driven humour. | Laugh | 58 / 55 / 50 | 0.36 / 0.34 / 0.30 | 12 | EARLY |
| cooking | Cooking | Food craft, hospitality, kitchens, culinary rivalry and the communities around meals. | ChefHat | 48 / 66 / 58 | 0.30 / 0.40 / 0.30 | 22 | EARLY-MID |
| military | Military | Command, service, strategy, logistics and armed institutions; not all action is military. | Crosshair | 64 / 72 / 44 | 0.26 / 0.50 / 0.24 | 30 | MID |
| supernatural | Supernatural | Spirits and unexplained forces interacting with lived reality; need not be frightening. | Wand2 | 62 / 52 / 58 | 0.36 / 0.30 / 0.34 | 24 | EARLY-MID |
| space | Space | Space travel, orbital habitats, alien societies and the scale and isolation of the cosmos. | Rocket | 60 / 74 / 66 | 0.26 / 0.44 / 0.30 | 48 | LATE |
| magical | Magical | Spellcraft, transformations and magical ability; all genders and species, not only magical girls. | Sparkles | 34 / 58 / 78 | 0.34 / 0.30 / 0.36 | 20 | EARLY |
| survival | Survival | Wilderness, apocalypse, disaster, hostile environments, expeditions, isolation, resource scarcity and survival communities. | Tent | 66 / 56 / 62 | 0.40 / 0.32 / 0.28 | 36 | MID-LATE |
| pirate | Pirate | Seafaring adventure, treasure, outlaw crews, privateers, naval conflict, exploration and swashbuckling; airship variants still require a piracy-based world. | Ship | 62 / 68 / 54 | 0.36 / 0.40 / 0.24 | 28 | MID |
| martial | Martial Arts | Hand-to-hand combat, fighting disciplines, dojos, tournament combat, martial schools, masters, students and combat philosophy. | Hand | 62 / 78 / 48 | 0.30 / 0.46 / 0.24 | 18 | EARLY |
| mythology | Mythology | Gods, demigods, divine monsters, legendary heroes and world religious/mythic traditions adapted as grand narrative; never restricted to Norse material. | Landmark | 68 / 60 / 64 | 0.44 / 0.32 / 0.24 | 44 | LATE |
| nordic | Nordic | Scandinavian/Norse-inspired worlds, sagas, Viking-era aesthetics, northern clans, longships, runes, fjords, shield societies and folklore; grounded politics qualify without gods. | MountainSnow | 58 / 58 / 48 | 0.44 / 0.34 / 0.22 | 54 | LATE |

## Progression and economy

The current save starts with 12 RD, production releases award roughly `max(2, round(review total × 0.55 + issues × 0.4))`, the Archive later supplies 1/2/4 RD weekly, and the test-audience action awards 4 RD. Current genre costs span 14–36 and unlock immediately when purchased. V2 keeps the same currency scale, places first experiments within one or two releases, and extends specialised late research to 54 rather than inflating costs by an order of magnitude.

- **Start:** Slice of Life and Fantasy are in `genresUnlocked`; cost 0.
- **Early:** Comedy 12, Romance 14, Sports 18, Martial Arts 18, Magical 20.
- **Early-mid:** Cooking 22, Supernatural 24.
- **Mid:** Isekai 26, Pirate 28, Horror 30, Military 30, Mecha 32.
- **Mid-late:** Survival 36, Idol 38, Mystery 40.
- **Late:** Mythology 44, Space 48, Cyberpunk 50, Nordic 54.

A tier is pacing metadata rather than another resource. The research screen should sort by this sequence; RD remains the actual purchase gate. Nordic is last and specialised. Existing office and release flows continue to produce enough RD without a new grind currency.

## Genre boundaries

- **Survival** concerns environmental pressure, disaster, apocalypse, expedition endurance, isolation, scarcity and survival communities. A war story is Military only when institutions, operations or command are central; characters merely trying to live through a war can be Survival.
- **Pirate** requires piracy, a seafaring/outlaw crew, naval conflict, privateering, treasure exploration or swashbuckling social codes. A ship alone does not qualify. Air pirates qualify because the world is piracy-based.
- **Martial Arts** requires combat discipline, schools, masters/students, dojos, tournament fighting or philosophy expressed through close combat. Generic action does not qualify.
- **Mythology** adapts gods, demigods, divine monsters, legendary heroes, religious/mythic traditions or folklore as grand narrative from any world culture. Careful cultural consultation applies where living traditions are used.
- **Nordic** is a Scandinavian/Norse-inspired cultural-world genre: sagas, grounded northern clans, longships, fjords, runes, shield societies and northern folklore. A Nordic political family saga needs no gods. Greek, Egyptian, West African or South Asian divine narrative can be Mythology without Nordic. A production may select both when both independently apply.
- **Magical** replaces the display label “Magical Girl” while preserving technical ID `magical`; it is gender-neutral.
- **Racing** becomes an activity/theme inside Sports, Mecha, Cyberpunk or other appropriate genres. **Noir** becomes a style inside Mystery, Cyberpunk, Romance or another genre; neither remains selectable.

## Anime Type casting

Each cast member has one canonical Type. A character matching the production Type receives `×1.10` on that character’s bounded casting contribution. A mismatch uses `×1.00`; there is no penalty, lockout, salary change or base-stat change. Type applies after role weight and only within casting. It does not modify staff points, arcs, production cost, hype, combo multipliers, budget, salary or the production as a whole.

SHONEN favours outward momentum, challenge, escalation, competition, adventure, action readability and overcoming obstacles. SHOJO favours relationships, identity, emotional stakes, interpersonal conflict, social dynamics, expressive character drama and romantic or personal tension where suitable. These tendencies can describe the same subject differently; they are not audience demographics and never infer gender.

## Affinity rules for ratings and sales

Every character stores `visibleAffinities: [GenreId, GenreId]` and a distinct `hiddenAffinity: GenreId`. At calculation time:

```ts
const affinityTier = genres.includes(character.hiddenAffinity)
  ? 2
  : character.visibleAffinities.some(g => genres.includes(g))
    ? 1
    : 0;
```

The hidden value is read regardless of discovery state. Knowledge controls rendering only. Two visible matches remain tier 1. Visible plus hidden remains tier 2. Discovery never activates, increases or retroactively applies the bonus.

With the recommended balance values, the ratings-side Correct Cast term is `roleWeight × 0.60 raw quality × affinityTier × typeModifier`. The sales-side term is `roleWeight × 0.025 × affinityTier × typeModifier`, summed once across roles and applied directly to the existing sales peak. The hidden coefficient is mathematically twice the visible coefficient on both branches. The baseline casting-presence term and full derivation are in `CAST_V2_CASTING_BALANCE.md`.

Evaluate Lead, Sidekick, Mascot and Villain independently. A genre match in one role never satisfies another. Arc-to-cast bonuses check whether the relevant character has tier > 0 but remain their existing fixed arc bonus; affinity tier does not double an arc, and an arc does not add another Correct Cast tier.

## Hidden discovery and UI secrecy

Before discovery, the cast detail shows `Visible Genre 1 · Visible Genre 2 · ???`. All player-facing projections must be built through a public-cast selector that omits the hidden ID entirely. Sorting, filtering, tooltips, recommendations, draft previews, score previews, search indexes, accessibility labels, telemetry returned to the client and player-enabled logs may consume only that public projection. A label such as “hidden affinity active” is forbidden. Normal outcomes may let an observant player form a hypothesis; that is discovery through play rather than a leak.

Release processing uses the canonical hidden field internally. An atomic, idempotent release transaction reveals it only if the character was actually cast, the released production contains that hidden genre, the hidden tier made a positive pre-round contribution, and the release completed. Drafting, selecting/deselecting, cancellation, ownership and unlocking do nothing. Queue one breakthrough card per qualifying character after the release result:

> **CASTING BREAKTHROUGH!**  
> [CHARACTER] was unexpectedly brilliant in [GENRE].  
> Hidden Affinity discovered: [GENRE] ✦

Persist discovery per save as character IDs or an ID→genre map, with the canonical genre verified on load. A later roster patch cannot silently replace an already displayed value; such a change needs explicit content migration. Multiple breakthroughs from one release may appear sequentially or as a stacked post-release list. Screen readers receive the reveal only at this point.

## Genre combo matrix

The matrix is symmetric and contains all 210 unordered pairs. Values are learned quality multipliers. `1.00` is neutral and deliberately makes most combinations unlabelled. `E` is experimental: the first completed release uses 1.00, then reveals the listed multiplier for subsequent productions, preserving the current learn-by-shipping philosophy. Combo discovery and hidden cast discovery are separate transactions and messages.

|  | Mecha | Isekai | Slice of Life | Horror | Romance | Sports | Cyberpunk | Fantasy | Idol | Mystery | Comedy | Cooking | Military | Supernatural | Space | Magical | Survival | Pirate | Martial Arts | Mythology | Nordic |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mecha | — | 1.00 | 0.80 | 1.00 | 1.24 E | 1.00 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.22 | 1.00 | 1.24 | 1.00 | 1.00 | 1.16 E | 1.00 | 1.00 | 1.00 |
| Isekai | 1.00 | — | 1.00 | 1.00 | 0.88 | 1.00 | 1.00 | 1.25 | 1.22 E | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.18 | 1.00 | 1.00 | 1.00 |
| Slice of Life | 0.80 | 1.00 | — | 1.30 E | 1.20 | 1.10 | 1.22 E | 1.00 | 1.15 | 1.00 | 1.16 | 1.18 | 1.00 | 1.00 | 1.24 E | 1.00 | 1.18 E | 1.00 | 1.00 | 1.00 | 1.00 |
| Horror | 1.00 | 1.00 | 1.30 E | — | 1.16 E | 0.80 | 1.10 | 1.00 | 1.28 E | 1.25 | 0.82 | 1.26 E | 1.00 | 1.20 | 1.00 | 1.00 | 1.22 | 1.00 | 1.00 | 1.00 | 1.00 |
| Romance | 1.24 E | 0.88 | 1.20 | 1.16 E | — | 1.00 | 1.00 | 1.00 | 1.00 | 1.18 E | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Sports | 1.00 | 1.00 | 1.10 | 0.80 | 1.00 | — | 1.00 | 1.00 | 1.00 | 1.26 E | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.25 | 1.00 | 1.00 |
| Cyberpunk | 1.25 | 1.00 | 1.22 E | 1.10 | 1.00 | 1.00 | — | 1.15 E | 1.00 | 1.20 | 1.00 | 1.00 | 1.00 | 1.00 | 1.16 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.14 E |
| Fantasy | 1.00 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.15 E | — | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.20 | 1.00 | 1.22 | 1.15 |
| Idol | 1.00 | 1.22 E | 1.15 | 1.28 E | 1.00 | 1.00 | 1.00 | 1.00 | — | 1.00 | 1.00 | 1.12 | 1.18 E | 1.00 | 1.00 | 1.14 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Mystery | 1.00 | 1.00 | 1.00 | 1.25 | 1.18 E | 1.26 E | 1.20 | 1.00 | 1.00 | — | 1.00 | 1.00 | 1.00 | 1.15 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Comedy | 1.00 | 1.00 | 1.16 | 0.82 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | — | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Cooking | 1.00 | 1.00 | 1.18 | 1.26 E | 1.00 | 1.00 | 1.00 | 1.00 | 1.12 | 1.00 | 1.00 | — | 1.00 | 1.00 | 1.12 E | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Military | 1.22 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.18 E | 1.00 | 1.00 | 1.00 | — | 1.00 | 1.00 | 1.25 E | 1.18 | 1.00 | 1.00 | 1.00 | 1.00 |
| Supernatural | 1.00 | 1.00 | 1.00 | 1.20 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.15 | 1.00 | 1.00 | 1.00 | — | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.20 | 1.00 |
| Space | 1.24 | 1.00 | 1.24 E | 1.00 | 1.00 | 1.00 | 1.16 | 1.00 | 1.00 | 1.00 | 1.00 | 1.12 E | 1.00 | 1.00 | — | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Magical | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.14 | 1.00 | 1.00 | 1.00 | 1.25 E | 1.00 | 1.00 | — | 1.00 | 1.00 | 1.00 | 1.18 | 1.00 |
| Survival | 1.00 | 1.00 | 1.18 E | 1.22 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.18 | 1.00 | 1.00 | 1.00 | — | 1.00 | 1.00 | 1.00 | 1.18 |
| Pirate | 1.16 E | 1.18 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.20 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | — | 1.00 | 1.00 | 1.00 |
| Martial Arts | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.25 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | — | 1.00 | 1.00 |
| Mythology | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.22 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.20 | 1.00 | 1.18 | 1.00 | 1.00 | 1.00 | — | 1.20 |
| Nordic | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.14 E | 1.15 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.18 | 1.00 | 1.00 | 1.20 | — |

Strong additions include Martial Arts/Sports, Mythology/Fantasy, Nordic/Mythology, Pirate/Fantasy, Pirate/Isekai, Survival/Horror, Survival/Military, Mecha/Military, Mecha/Space, Magical/Mythology, Supernatural/Mythology, Nordic/Survival and Nordic/Fantasy. Experimental additions include Cooking/Horror, Idol/Military, Slice of Life/Survival, Pirate/Mecha, Nordic/Cyberpunk and Cooking/Space. Romance/Military remains neutral: unusual does not automatically mean secretly excellent.

The matrix machine source is `GENRE_V2_COMBOS.csv/json`. Runtime must have one owner for each key: a key cannot exist in both normal and experimental maps. Missing keys mean neutral 1.00; risky values are explicit.

## Save migration principles

1. Preserve every cast ID and historical billing string. Load cast mechanics from the V2 canonical table by ID; do not trust old save-owned affinity arrays. Preserve the nine legacy prefixes even when the character’s role changes.
2. Add schema version `castGenreV2: 2`, `production.animeType`, and a per-save hidden-discovery collection. Existing saves initialise discovery empty. Do not infer secrets from old productions, because old results did not calculate this mechanic.
3. For active drafts/projects, derive Type from an exclusive old Shonen/Shojo tag. If both or neither existed, use the selected Lead’s V2 Type; if its ID is corrupt, use SHONEN and record a migration repair notice. Remove both tags. If that leaves zero genres, choose the Lead’s first visible V2 affinity when unlocked, otherwise Slice of Life. New projects cannot enter this fallback path.
4. Completed historical productions retain their stored scores, revenue and genre labels as an immutable legacy snapshot. Add a nullable `legacyAnimeType` display field; do not recalculate history or fabricate a Type where the old data is ambiguous.
5. Map active/unlocked `racing → sports`, `noir → mystery`; merge duplicate combo levels by maximum level and archive old display labels in historical records. Preserve technical ID `magical` and change only its label. Archive, rather than reinterpret, combo knowledge whose key contains Shonen or Shojo.
6. Remove Shonen/Shojo from `GenreId`, initial unlocks, `GENRES`, slots, audiences, trends, rivals, posters, staff favourites, arcs and test fixtures. Migrate an active staff favourite Shonen/Shojo to that staff member’s strongest current V2 genre if deterministic; otherwise clear it with no penalty. Map Racing/Noir favourites to Sports/Mystery.
7. Chemistry IDs can remain stable, but `skycrew` must become `n_ryoko + tsubasa + p_fuwa` and `quietwar` must become `daichi + s_kanna + sen`, because V2 role changes otherwise put two members into one slot. All other current chemistry IDs remain valid.
8. Migration is idempotent, journalled and applied before any project can advance. Back up the pre-migration save, validate every active project has one Type and 1–2 valid genres, then commit. Unknown cast IDs remain historical placeholders rather than falling through to Kai.

Repository audit found deprecated GenreId references across `data.ts`, market, careers, facilities, poster, rivals, state and 20 current test files. Implementation is incomplete until an exact-token search confirms none remain in active genre logic; text describing migrated history may remain. The specification’s validator exercises affinity tiers and discovery state without claiming the running game already implements them.
