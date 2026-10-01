# Anime Runner — Crash Audit Report
**Date:** 2026-10-01  
**Branch:** `bugfix/arcball-rooms-work-cleanup`  
**Validated build:** `347a2fbf32056bfcb388eac65d32306223567d3b`

## Scope
This pass audited the production runtime for the same classes of failure that caused the Arcball Training and intermittent Rooms crashes: undefined component-local state, missing save-state maps, stale/missing identifiers, incomplete stage/state coverage, unsafe nullable values, and mismatches between runtime data and UI expectations.

## Player-reported fixes
- Arcball Training no longer renders tutorial state from the wrong component scope.
- Arcball tutorial/cutscene is mounted at the Arcball panel level so the cutscene image can render consistently.
- Rooms and facility purchase/display code now tolerate temporarily missing or legacy `facilities` state.
- Redundant ON AIR cards were removed from the Work board now that franchise continuation is handled by the newer overview.

## Additional crash-risk defects found and fixed
1. **Project Board — missing `TEAM_MAX` runtime reference**
   - A production-card branch could reference an identifier that was not imported.
   - Fixed by restoring the canonical project-team constant import.

2. **Overseas quick launch — undefined `setMessage`**
   - A blocked quick-launch path could call a state setter that the panel had not destructured.
   - Fixed and wired through the shared run-action hook.

3. **Staff random-name fallback — missing `personGender` reference**
   - A fallback random-name path referenced an unimported helper.
   - Fixed by importing the canonical gender resolver.

4. **Research completion — incomplete `ResearchCarrier` state**
   - Weekly research completion omitted `arcUnlocked`, which could break completion paths and discard state.
   - Fixed by carrying, updating and persisting `arcUnlocked` through the weekly research pipeline.

5. **Licensed Studio Slate — wrong IP genre property**
   - Licensed planning used `genres` instead of canonical `genreTags`.
   - Fixed so licensed plans inherit genres correctly.

6. **Retrospective — retired staff lookup used the wrong key**
   - Legend records use `staffId`, not `id`.
   - Fixed to avoid failed retired-creator lookups.

7. **Arcball sponsor settlement — nullable sponsor access**
   - Sponsor payout text could dereference a nullable sponsor after a season transition.
   - Guarded before reading sponsor data.

8. **Project stage table — missing `shelved` stage**
   - The stage-gate table did not cover the newer shelved project state.
   - Fixed to include `shelved: null`.

9. **Arcball substitution event typing**
   - Substitution event kind was widening to a generic string.
   - Locked to the canonical Arcball event type.

10. **Award event metric selection**
    - A readonly tuple was being sorted directly.
    - Changed to sort a copied array.

11. **Shared Button component**
    - Several screens were supplying normal HTML button attributes such as `title` / accessibility props that the wrapper did not forward.
    - The shared `Btn` now accepts and forwards standard button attributes.

12. **Release poster browser**
    - Poster genre selection was overly broad string state and a facility access could be undefined.
    - Tightened to `GenreId` and null-safe facility checks.

13. **Facilities-state hardening expanded**
    - Applied null-safe facility access to Rights Market, Overseas Strategy, Staff Training, release preparation, training engine, strategic spending, overseas engine and state-level training actions.

14. **Studio event roll safety**
    - Added an explicit fallback return for exhaustive safety if event kinds and switch coverage ever drift.

## Validation added
A production-focused TypeScript configuration was added at `game_source/tsconfig.runtime.json` to audit actual shipped runtime code without test-only/no-unused noise.

The APK workflow now runs this runtime typecheck before tests and build.

## Final validation result
The final CI run completed successfully:
- dependency install: PASS
- production runtime TypeScript check: PASS
- full automated test suite: PASS
- web build + Capacitor sync: PASS
- Android Gradle debug APK build: PASS
- APK artifact upload: PASS
- direct GitHub crash-audit release: PASS

## Remaining assessment
No further instances of the same obvious crash classes were found in the audited production paths after the final runtime typecheck and test/build pass.

This does not mathematically prove the absence of every runtime crash, particularly those dependent on unusual long-running save histories or device-specific browser/WebView behaviour. The most important next step is targeted playtesting of:
- Arcball Training and every Arcball tab
- Rooms repeatedly across old/current saves
- Overseas quick launch, including blocked launches
- research jobs completing through calendar advance
- licensed Studio Slate planning
- shelving/reopening finished projects
- release poster browsing
- season rollover with Arcball sponsorship

