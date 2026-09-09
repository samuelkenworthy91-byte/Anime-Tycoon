# Anime Runner / Anime Tycoon — Cast V4 Runtime Integration Handoff

## Repository and branch

Repository:
`samuelkenworthy91-byte/Anime-Tycoon`

Authoritative source:
`main`

Verified main HEAD at handoff creation:
`6d8f5abdb04d7da30322238de7c18265e525da65`

Work branch already created for this job:
`work/cast-v4-runtime-integration`

Do **not** push runtime activation directly to main while developing. Work on `work/cast-v4-runtime-integration`, validate everything, then report back before any merge to main.

---

# Goal

Complete the Cast V4 integration using the source portraits already uploaded to the repository.

The finished game should contain:

- existing live cast: 432
- new Cast V4 characters: 304
- final live cast: **736**
- 23 canonical genres
- 253 unordered genre pairs
- 4 cast roles
- 2 anime types
- strict required Role × Anime Type × genre-pair cells: **2,024 / 2,024**

The coverage rule is:

For every one of the 253 unordered genre pairs, there must be at least one **same-character witness** in each of:

- Shonen Lead
- Shojo Lead
- Shonen Sidekick
- Shojo Sidekick
- Shonen Mascot
- Shojo Mascot
- Shonen Villain
- Shojo Villain

A character witnesses a pair when both genres occur anywhere among that character's three affinities:

- `visibleAff[0]`
- `visibleAff[1]`
- `hiddenAff`

The hidden affinity counts mechanically for coverage.

Do not require the pair to be the two visible genres.

---

# Repository source assets

Start by inspecting the live repository. Do not assume filenames or counts from this handoff if the repository disagrees.

Cast V4 staging root:

`game_source/art_src/cast_v4_upload_staging/`

The upload currently exists under four repository batch directories:

- `batch_01_001-080/`
- `batch_02_081-160/`
- `batch_03_161-240/`
- `batch_04_241-304/`

The staging README predates the final upload layout and mentions a flat directory. The **actual repository tree is authoritative**.

The staging source pool was designed to preserve all generated material, not only the final 304 portrait choices. The staging README states that the complete source pool contains **336 generated crops**: primary Arena crops, donor/replacement material, and the 16-cell repair sheet output.

Do not silently discard extra portraits.

---

# Mechanical manifest — already locked

Each batch contains:

`CAST_V4_MECHANICS.csv`

The four mechanics CSV files together define exactly **304 required Cast V4 records**.

Columns:

`id,role,anime_type,visible_genre_1,visible_genre_2,hidden_genre,batch,filename`

Example:

`v4_lead_shonen_001,protag,shonen,mecha,isekai,samurai,1,001__v4_lead_shonen_001.png`

The following fields are mechanically locked and must not be changed:

- stable ID
- role
- anime type
- visible genre 1
- visible genre 2
- hidden genre

Do not re-optimise the affinities.

Do not swap Shonen/Shojo.

Do not change role buckets.

The portrait mapping should follow the manifest filename first. Any additional PNG not referenced by the 304 mechanics rows is a donor/alternate unless you deliberately substitute it after visual QC. Every substitution must be recorded.

---

# Existing staging verification

There is already a test:

`game_source/src/engine/__tests__/cast-v4-staging-mechanics.test.ts`

It verifies:

- current live cast = 432
- pending V4 records = 304
- unique stable IDs
- unique planned filenames
- correct role/type addition counts
- all affinities valid and distinct
- future cast = 736
- strict Role × Anime Type × pair coverage = **2,024 / 2,024**

The optimized additions per bucket are:

- Lead / Shonen: 36
- Lead / Shojo: 41
- Sidekick / Shonen: 35
- Sidekick / Shojo: 38
- Mascot / Shonen: 36
- Mascot / Shojo: 40
- Villain / Shonen: 38
- Villain / Shojo: 40

Do not weaken this test.

---

# Current runtime architecture

Live cast interface:

`game_source/src/engine/data.ts`

`CastMember` currently requires:

- `id`
- `name`
- `archetype`
- optional `epithet`
- `img`
- `personality`
- `role`
- `type`
- `visibleAff`
- `hiddenAff`
- `gender`
- `species`
- `ageBand`
- `culturalBasis`

Live runtime data comes through:

`game_source/src/engine/castV2.ts`

which currently reads:

`game_source/src/engine/generated/castV3.json`

Canonical content source currently lives at:

`game_source/docs/content-v3/CAST_V3_RUNTIME.json`

Generation/validation script:

`game_source/scripts/generate-content-v3-runtime.mjs`

That generator currently hard-codes the old 432 / 108-per-role / 54-per-role-type assumptions and uses weaker separate coverage checks. Update it for the final 736 roster and the strict 2,024-cell Role × Type × pair rule.

Do not edit only `src/engine/generated/castV3.json` by hand and leave the canonical source/generator stale.

---

# Required work

## Phase 1 — audit the actual source pool

Before changing runtime data:

1. Recursively enumerate every PNG in `game_source/art_src/cast_v4_upload_staging/`.
2. Report the actual total.
3. Load all four `CAST_V4_MECHANICS.csv` files.
4. Verify exactly 304 manifest rows.
5. Verify all 304 referenced filenames exist.
6. Verify all 304 stable IDs are unique.
7. Identify all extra PNGs not referenced by the mechanics manifest as donor/alternate material.
8. Calculate SHA-256 for source assets.
9. Detect exact duplicate bytes among selected portraits.
10. Create a source audit CSV.

Suggested output:

`game_source/docs/cast-v4/CAST_V4_SOURCE_AUDIT.csv`

Useful columns:

- stable_id
- manifest_filename
- actual_path
- source_sha256
- source_width
- source_height
- selected
- donor
- replacement_for
- notes

If any manifest-referenced portrait is absent, stop and report it rather than guessing.

---

## Phase 2 — visually inspect and map portraits

Actually inspect the portrait images.

Do not generate character identities from the affinity list alone.

For each of the 304 required records:

- open/view the mapped portrait;
- confirm it is a single coherent character/mascot;
- confirm its visible presentation is compatible with the two visible genres;
- confirm there is no obvious extra-limb/duplicate-body failure;
- confirm it is usable at mobile portrait size;
- note any donor substitution you make.

The hidden genre is mechanical information only. Do **not** invent character bio or visible design details that spoil the hidden affinity unless they are already independently justified by one of the visible genres.

For donor substitutions:

- keep the stable ID and affinities unchanged;
- replace only the selected art source;
- record donor source path + SHA;
- do not delete unused donors from staging.

Create:

`game_source/docs/cast-v4/CAST_V4_FINAL_ART_MAP.csv`

At minimum include:

- stable_id
- selected_source_path
- selected_source_sha256
- role
- anime_type
- visible_genre_1
- visible_genre_2
- hidden_genre
- donor_substitution
- qc_notes

---

# Phase 3 — create identities based on the actual portraits

This is a creative-data task, but it must be systematic.

For every selected portrait create:

- `name`
- `archetype`
- `epithet`
- `personality`
- `gender`
- `species`
- `ageBand`
- `culturalBasis`

## Naming principles

The user explicitly wants a **diverse roster**.

Do not default most humans to Japanese names just because this is an anime game.

Use a broad international name pool across the 304 additions, while keeping each individual name coherent.

Good overall spread can include, among others:

- Japanese
- Korean
- Chinese / Chinese diaspora
- Filipino
- Vietnamese / Southeast Asian
- Indian / South Asian
- Arab / Levantine / Gulf
- Persian
- Turkish
- West African
- East African
- Southern African
- Afro-Caribbean
- Black British
- Latin American
- Brazilian
- North African
- Mediterranean
- Eastern European
- Northern European
- Western European
- Māori / Polynesian / Pacific
- mixed/diaspora naming patterns where appropriate
- invented names for fantasy-coded or nonhuman characters when that fits better

Do not claim a fictional character is a specific real ethnicity merely because of skin colour or facial features. Choose a coherent `culturalBasis` as character design metadata; do not present it as a factual inference about a real person.

Avoid repetitive naming patterns.

Audit the existing 432 names before naming V4.

Requirements:

- no duplicate full names across all 736 cast unless deliberately justified;
- strongly minimise repeated given names;
- strongly minimise repeated surnames;
- do not repeatedly reuse obvious anime staples such as Haru, Yuki, Ren, Akira, Kai, Aoi, etc.;
- do not make every dark-skinned character share the same regional naming pool;
- do not make all Shojo characters female or all Shonen characters male;
- names should feel like individuals, not a diversity checklist.

For mascots and clearly nonhuman companions:

- usually use short memorable names rather than human first+surname;
- species should describe what the portrait actually depicts: e.g. fox familiar, robotic cat, spirit owl, service drone, red panda companion;
- do not force a human cultural identity onto a creature;
- `culturalBasis` can describe the artistic/folkloric basis when appropriate.

For robots:

- names may be humanised, call-sign based, or compact model-like names;
- do not use unreadable strings of numbers unless it is clearly part of the character concept.

## Genre-aware identity writing

The two visible genres should influence archetype/personality, but do not reduce characters to genre clichés.

Examples:

- Cooking + Military might become a calm field-kitchen logistics prodigy, not just "soldier chef".
- Horror + Romance can be a restrained gothic drama figure without automatically becoming evil.
- Sports + Mystery can be a tactical analyst, injured captain, investigative reporter, etc.
- Nordic must remain grounded North Atlantic / cold maritime / modern northern rather than horned-helmet fantasy.
- Samurai, Shinobi and Martial Arts must remain conceptually distinct.
- Shojo Villains should include grounded social/rival/romantic/psychological antagonists where appropriate, not all monsters.
- Shonen characters should not all become fighters.

`archetype`:
- concise playable casting concept;
- ideally 2–6 words;
- distinct across the roster.

`epithet`:
- concise flavour title;
- avoid repetitive "The ___" construction;
- avoid mentioning hidden genre;
- avoid duplicate epithets.

`personality`:
- one vivid sentence;
- should say how the person behaves, not merely restate costume or genre;
- avoid generic "brave and loyal";
- give a hook that can support player attachment;
- do not reveal hidden affinity.

---

# Phase 4 — normalization and runtime portraits

Runtime target:

- 512 × 512
- RGB
- WebP
- same presentation as the existing runtime cast
- no distortion

Place final assets under:

`game_source/public/cast/v4/`

Recommended deterministic path:

`cast/v4/<stable_id>.webp`

unless repository tooling demonstrates a better established convention.

Do not use a blind stretch-to-square.

Source crops vary in aspect/framing.

For every portrait:

- preserve complete face/head;
- preserve hands and important props where reasonably possible;
- crop/pad compositionally rather than distorting;
- keep visual scale comparable to existing `public/cast/v2/` portraits;
- avoid baking text/labels/UI into the final asset;
- do not accidentally reveal hidden genre during any image repair.

Build a reproducible normalization script rather than manually exporting 304 unrelated files.

Suggested script:

`game_source/scripts/finalize-cast-v4-art.mjs` or `.py`

The script should read the final art map and produce deterministic runtime WebPs.

Generate SHA-256 checksums for final runtime art.

---

# Phase 5 — build final Cast V4 metadata

Create a durable canonical identity manifest before runtime append.

Suggested:

`game_source/docs/cast-v4/CAST_V4_FINAL_MANIFEST.csv`
and/or
`game_source/docs/cast-v4/CAST_V4_FINAL_RUNTIME.json`

Every row/record must contain the complete `CastMember` data.

Mechanical fields must exactly match the existing mechanics CSVs.

Identity fields should match the selected image.

Then append those 304 completed records to the canonical runtime cast source.

Final roster target:

**736 records**

Do not delete or mutate the existing 432 characters merely to make totals easier.

---

# Phase 6 — update generation and validation infrastructure

Update:

`game_source/scripts/generate-content-v3-runtime.mjs`

or replace it with a properly versioned successor if that is cleaner.

The validation must check:

1. exactly 736 cast records;
2. 736 unique stable IDs;
3. every referenced runtime portrait exists;
4. 23 genres;
5. 253 unordered genre pairs;
6. each cast member has exactly 3 distinct valid affinities;
7. required identity fields are non-empty;
8. no duplicate full names unless explicitly allow-listed;
9. strict Role × Anime Type × genre-pair coverage = 2,024 / 2,024.

Strict coverage algorithm:

For each role in:
`protag, secondary, pet, villain`

For each anime type in:
`shonen, shojo`

For each of the 253 unordered genre pairs:

find at least one cast member in that exact role/type bucket whose three affinities contain both genres.

Do not fall back to the old weaker rule of:

- pair covered somewhere within role, types mixed; or
- pair covered somewhere within type, roles mixed.

That old rule is not sufficient.

Convert or replace the staging test so this strict rule becomes permanent production coverage validation.

---

# Phase 7 — tests

At minimum run:

`cd game_source`
`npm test`
`npm run build`

Also run the content generation/validation command used by the repo.

Add focused tests for:

- 736/736 roster size;
- 304 V4 IDs present;
- 304 V4 runtime portraits exist;
- unique IDs;
- all full names non-empty and collision audit;
- all V4 affinity records exactly match mechanics;
- strict 2,024 coverage;
- all `img` paths resolve;
- no V4 record still points into `art_src/cast_v4_upload_staging`;
- final V4 files are exactly 512×512 WebP.

If the APK workflow is triggered by the final branch change, report its result but do not merge merely because the APK built.

---

# Identity / art QC gates

Before declaring complete, audit all 304 new final records for:

## Identity
- duplicate names
- excessive recurrence of the same cultures/naming patterns
- gender imbalance that is clearly accidental
- mascots given inappropriate human metadata
- archetype duplication
- personality boilerplate
- hidden genre spoilers

## Visual
- extra limbs / duplicate arms or hands
- multiple subjects in a supposedly single-character crop
- obvious merged anatomy
- badly cropped faces/hands
- text/watermarks
- wrong genre cues severe enough to contradict visible genres
- duplicate portraits assigned to different stable IDs
- runtime size/path errors

Do not use automated computer vision alone as proof of anatomy quality. Use it for triage, then inspect suspicious portraits visually.

---

# Preserve these decisions

- Current workers/workstations are unrelated; do not modify them.
- Do not redesign worker movement or office behaviour.
- Do not change genre mechanics.
- Do not change affinity assignments.
- Do not expose hidden affinities through art or public-facing character copy.
- Nordic means grounded North Atlantic / Vinland-Saga-adjacent realism, not generic Viking iconography.
- Maintain complexion and cultural variety across the new roster.
- Keep the established material-rich anime portrait visual language.
- Existing saves do not need bespoke migration unless the current code requires it to prevent breakage, but do not knowingly corrupt existing save IDs.

---

# Recommended work sequence

1. Verify branch and source HEAD.
2. Audit staging source count and manifest integrity.
3. Produce final source-art mapping.
4. Visually inspect all 304 selected portraits.
5. Create the 304 identities from the selected images.
6. Run duplicate/diversity QA on names and metadata.
7. Normalize 304 portraits to runtime WebP.
8. Create canonical V4 runtime manifest.
9. Append into canonical runtime cast.
10. Update generator and permanent strict coverage tests.
11. Regenerate generated JSON.
12. Run tests/build.
13. Re-audit final runtime assets and 2,024 coverage.
14. Commit all work to `work/cast-v4-runtime-integration`.
15. Report exact HEAD, changed files, counts, coverage, QC failures, tests and build.
16. Do not merge to main until explicitly requested.

---

# Final report format

CAST V4 RUNTIME INTEGRATION STATUS

Source branch:
main @ 6d8f5abdb04d7da30322238de7c18265e525da65

Work branch:
work/cast-v4-runtime-integration

Source PNGs found:
X

Mechanics records:
304 / 304

Selected final portraits:
304 / 304

Donor/alternate portraits retained:
X

Identity records completed:
304 / 304

Final runtime portraits:
304 / 304

Existing cast preserved:
432 / 432

Final roster:
736 / 736

Strict Role × Type × genre-pair coverage:
2024 / 2024

Duplicate IDs:
0

Duplicate full names:
0 (or list deliberate exceptions)

Broken image paths:
0

Hidden-affinity art/copy spoilers:
0

Anatomy/QC failures remaining:
0 (or exact list)

Tests:
PASS / FAIL

Build:
PASS / FAIL

Final work-branch HEAD:
<sha>

Main modified:
NO

Merge recommendation:
READY / NOT READY
