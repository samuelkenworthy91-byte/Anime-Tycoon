# Cast V2 Implementation Results

Baseline: `41dcffc3129b53171fe01c55f8cebe277e0ad700`

## Implemented systems

- `AnimeType` is a required `shonen | shojo` production dimension and has its own creation step.
- The active genre set contains exactly the approved 21 genres. Shonen, Shojo, Racing and Noir are migration-only legacy values.
- The runtime roster is generated from the locked Cast V2 package and contains 192 stable IDs: 48 Leads, Sidekicks, Mascots and Villains.
- Each character has one Type, exactly two visible affinities and one distinct fixed hidden affinity.
- Independent approved WebP portraits are loaded by stable-ID-based path; no Cast V2 sprite-sheet position is used.
- Hidden affinity knowledge is stored by stable cast ID in `castAffinityDiscovered`.
- Qualifying completed releases create a one-time `CASTING BREAKTHROUGH!`; previews, browsing and audience tests do not reveal secrets.
- Type and affinity persist in drafts, franchises, continuations, Hall of Fame entries and rival records.
- Current project, research, market, staff, franchise, history and save data migrate deterministically.

## Final mechanics

For role weight `w`, Type multiplier `t` and best affinity tier `a`:

- `t = 1.10` on a Type match, otherwise `1.00`; there is no mismatch penalty.
- `a = 2` when Hidden matches, else `1` when either visible affinity matches, else `0`.
- Base cast quality: `0.50 × w × t`.
- Correct Cast rating quality: `0.60 × w × a × t`.
- Correct Cast direct sales lift: `2.5% × w × a × t`.
- Hidden values are therefore exactly `1.20 × w × t` rating quality and `5.0% × w × t` sales lift.
- Role weights are Lead `1.00`, Sidekick `0.55`, Mascot `0.30`, Antagonist `0.45`.
- Matches never stack within one character; visible + hidden uses the hidden 2× tier.

The hidden tier is calculated regardless of discovery. Discovery changes only player knowledge and permitted UI disclosure.

## Verification

- TypeScript: PASS
- Automated application tests: 312 / 312 PASS
- Dedicated balance tests: 3 / 3 PASS
- Canonical roster validation: PASS
- Locked-field drift: zero
- Runtime portraits: 192 / 192 valid and byte-identical to approved assets
- Web production build: PASS
- Capacitor Android sync: PASS

