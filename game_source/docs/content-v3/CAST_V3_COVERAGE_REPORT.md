# Validated revised Cast V3 coverage

Live Arena base: 2701f638f614eccce0e58a48f705918570b1f78c. User authorised continuation using revised calculations. Selected +208 to retain equal roles and equal Shonen/Shojo within each role: 52 additions per role, 26+26. Final total 400, each role 100 (50+50).

All 1,012 role/pair requirements are met across 23 genres / 253 unordered pairs. The 551 original missing role/pair combinations all have new covering IDs. Existing 192 IDs, names, affinities and art paths are preserved. Every new character has exactly two visible and one hidden distinct affinity and three distinct unordered pair edges. New IDs are cv3_lead_001–052, cv3_sidekick_001–052, cv3_mascot_001–052, cv3_villain_001–052. No external canonical IDs were overwritten.

The minimum solver witnesses (46/48/48/51) were retained, then expanded with distinct triples to 52 per role. Additional triples reinforce Samurai/Shinobi and crossover flexibility. Balanced anime-type assignment does not change graph coverage. Visibility assignment prioritises Mecha/Samurai/Shinobi; when all three share a triple, only two are visible and the third has no art cues. Portrait prompts are derived exclusively from visible affinities. Art QC must still verify model compliance.

EXPANSION_PLAN contains the full character manifest; SOLVER_OUTPUT is its graph projection. PAIR_COVERAGE includes existing and new IDs for every role/pair. GAPS records original gaps and their solution IDs, not remaining gaps. firstAssignedGaps assigns each missing edge to its earliest new contributor for accountable coverage; existingGapsSupplied also records intentional redundancy.

Art is not marked complete merely because these data checks pass. Original exact-solver proof and source are supplied in evidence/. No mechanics or remote branches modified.
