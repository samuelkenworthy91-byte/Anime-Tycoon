# Crash Audit — 2026-10-01

Branch: `bugfix/arcball-rooms-work-cleanup`

## Scope

This pass audited the reported Arcball Training, Arcball tutorial/cutscene, Rooms, Work/Project Board and adjacent runtime code for the same crash pattern: UI paths referencing state, identifiers or nested save properties that can be absent, stale or incorrectly scoped at runtime.

The audit also added a production-focused TypeScript check so runtime source is checked independently of older test-fixture typing debt.

## Reported issues fixed

- **Arcball Training crash** — the Arcball tutorial was mounted inside the Training component while referencing `help` and `dismissHelp` from the parent scope. The tutorial is now mounted at ArcballPanel level.
- **Arcball cutscene/tutorial image** — the asset path was valid; the tutorial mount was not. Fixing the mount restores the first-seen cutscene/help image.
- **Rooms intermittent crash** — room rendering and room-purchase logic now tolerate a temporarily missing/legacy `facilities` map.
- **Redundant ON AIR Work cards** — removed from the Work board now that franchise/continuation overview owns that information.

## Additional crash-class defects found and fixed

1. **Project Board latent reference error**
   - `TEAM_MAX` was referenced without being imported.
   - Card props also carried stale `setRun` / `onLicensed` requirements after the UI was simplified.
   - Result: certain Project Board states could fail when the affected card path rendered.

2. **Overseas quick-launch blocked-path crash**
   - `setMessage` was called by Quick Launch but not destructured from `useRunAction`.
   - Result: the failure/blocked path could throw instead of showing the reason.

3. **Staff-name fallback reference error**
   - `randomStaffName` called `personGender` without importing it.
   - Result: a fallback/random-name path could throw.

4. **Weekly research-completion state omission**
   - The weekly research completion carrier omitted `arcUnlocked`.
   - Result: research completion could enter an invalid state when the calendar advanced.
   - `arcUnlocked` is now carried, updated and returned through the weekly advance path.

5. **Licensed slate property mismatch**
   - Studio Slate read `AuctionIP.genres`; the canonical property is `genreTags`.
   - Result: licensed planning inherited invalid/empty genre data on that path.

6. **Retrospective retired-creator lookup**
   - Retrospective searched `LegendRec.id`; the stored identifier is `staffId`.
   - Result: stale lookup logic and a potential invalid runtime assumption were removed.

7. **Studio event fall-through**
   - `rollStudioEvent` now has an explicit safe `null` fallback after the event switch.

8. **Arcball sponsor settlement guard**
   - Sponsor payout text now requires a live sponsor object as well as a non-zero payout.

9. **Arcball substitution event typing**
   - Substitution event kind is now preserved as the literal `info`, keeping the match event array contract stable.

10. **Shelved production stage**
    - `shelved` is now represented in the production stage-gate table instead of being an uncovered stage.

11. **Shared button prop forwarding**
    - The shared `Btn` component now forwards normal button attributes such as `title` and ARIA props.
    - This removes several UI paths that were relying on props the wrapper did not formally accept.

12. **Missing-facilities hardening extended**
    - Guards were extended beyond Rooms to release prep, Rights Market, Overseas Strategy, Staff Training, spending and overseas engine paths.
    - These now use safe optional access/defaults rather than assuming a fully populated facilities object.

13. **Save-load metadata hardening**
    - Award nomination metadata restoration now reads from the migrated save rather than reaching back into untyped raw save data.

14. **Production XP work contract**
    - `xpMult` was restored to the staff work modifier contract, matching the runtime modifier returned by career logic.

15. **Genre-group typing / readonly mutation cleanup**
    - Genre specialisation/training lookups now use the canonical GenreId view.
    - Award decision metric ordering now sorts a copy instead of mutating a readonly tuple.

## Validation

The final audit configuration runs:

1. production runtime TypeScript check using `tsconfig.runtime.json`;
2. full Vitest suite;
3. production Vite/Capacitor sync;
4. Android Gradle debug APK build.

The previous audit run reached all four build stages successfully. Its only failure was the GitHub artifact name containing the slash from the branch name. The workflow is being corrected to use a slash-safe artifact name and to publish a direct bugfix playtest APK release.

## Residual risk

No static audit can prove that a UI-heavy game has zero possible runtime crashes. The important result of this pass is that the same class of defect that caused the reported crashes — out-of-scope identifiers, stale property names, missing migrated state and unguarded nested save state — was found in several adjacent paths and removed. The production runtime typecheck is now suitable for catching this class of regression before APK creation.
