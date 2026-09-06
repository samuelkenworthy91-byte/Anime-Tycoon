# Integrated Arena content pass

This supersedes the pre-integration status in the archived handoff notes. Base: arena/01a0759f-anime-tycoon @ 2701f638f614eccce0e58a48f705918570b1f78c. Main is outside this change.

Integrated: 400 cast (192 preserved plus 208), 400 epithets with archetype fallback, 23 canonical genres and 253 pairs, 24 appended arcs and 18 appended combos, seven worker appearance pairs, producer showrunner replacement pair, three role-selected workstation foregrounds. Existing specialisation genre lists gain the proposed Samurai/Shinobi support; output and training formulas are unchanged. New appearances append after existing indexes. V2 source files remain archival; runtime imports now use V3. CAST_V2 remains a compatibility export name. `npm run content-v3:generate` validates and reproduces the three active generated payloads from docs/content-v3.

The cast picker uses a deterministic visible-affinity mixer, calculated once per role at module load. It balances genre frequency throughout the list, penalises recent repeats and gently alternates anime type. It never reads hidden affinities or discovery state. No source roster reordering, saved-ID remapping or scoring changes. For the four 100-card lists the longest consecutive shared visible-genre run fell from 5/4/4/5 to 1/1/1/1. Portrait IDs and exact supplied bytes are preserved.

Verification: 373 tests across 36 suites pass; production build and TypeScript no-emit check pass. All 227 supplied images compare against allocation SHA-256; public and built assets are checked byte-for-byte. Built dist is included because this repository tracks it. Tests for the provisional phase now assert canonical content. Coverage tests check all 253 pairs independently for each role.

The browser was blocked from opening the local preview host. Browser visual placement and APK testing were not completed here. Office art retains the existing working-state condition, depth, movement and click behaviour; final phone-scale placement remains for APK review. Original generation limitations remain in QC_NOTES.md. No main merge, workflow changes, save migration changes or mechanics rewrite.
