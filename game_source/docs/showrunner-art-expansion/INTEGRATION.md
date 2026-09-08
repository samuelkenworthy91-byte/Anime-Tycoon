# Approved showrunner expansion

User approved the five pairs and requested upload/integration into main on 2026-09-08.
Base main: 34692db2746df0739c0bbfda0fd4fd63751188c3.

The roster has eight selectable showrunners: existing steady/vision/producer/marketer plus operations/franchise/mentor/research. Genji retains steady and receives the approved replacement pair. Akari, Haruto and Sana keep their exact previous data and portrait/sprite bytes. No cast member or save schema is changed. Old saves retain their chosen showrunner; new careers expose all eight choices.

- Elliot Mercer / operations: +0.10 scheduling capacity, subject to the existing schedule cap; production burn ×0.90. Stacks multiplicatively with the production head's burn reduction. Applied in live daily and legacy weekly simulation, and the cash forecast.
- Freja Lindholm / franchise: added sequel/continuation fatigue ×0.75, including disappointing-entry and dynasty additions. Existing fatigue and the reboot reset are unchanged. Integer fatigue uses the existing rounding convention.
- Amara Okafor / mentor: weekly work XP ×1.25; resting stamina recovery ×1.25, capped at 100. Applies to active productions and weekly contract/training participation, not award/release/instant-training XP grants. Live daily and legacy weekly recovery paths are covered.
- Ravi Shah / research: research duration ×0.75 after archive bonuses. RD costs and passive RD income unchanged. Fractional due dates preserve the exact 25% reduction; completion occurs on the next daily tick (or next weekly tick for legacy week jumps). UI countdowns round up to the next observable day.

Ten approved RGBA PNGs are installed in public/img using portrait-showrunner-<id>.png (224×224) and sprite-showrunner-<id>.png (448×640). The normalized magenta masters are preserved under art_src/showrunners/expansion/source (1024×1536). ASSET_MANIFEST.csv records the approved runtime hashes. Historical approval notes refer to the pre-integration stage; this document supersedes their pending status. The production browser dist includes the same assets and new roster.

Validation: 43 test files, 436 tests PASS; Vite production build PASS. Added tests exercise all eight save IDs and image paths, Ravi's exact duration ratio and completion timing, unchanged research cost/income, Elliot's live burn/speed/forecast, Amara's weekly XP/daily and weekly recovery, and continuation fatigue. Existing protected showrunner asset hashes verified unchanged. Browser local preview was blocked by the cloud browser; published preview checked separately when available.
