# Genre 30 expansion

This pack adds five canonical genres to the 25-genre runtime:

- Monster Taming (`monster_taming`)
- Crime (`crime`)
- Kaiju (`kaiju`)
- Cosmic Horror (`cosmic_horror`)
- Arabia (`arabia`)

## Locked integration invariants

- 30 canonical genres total.
- 435 unordered genre pairs total (`C(30, 2)`).
- 135 pair records introduced by this pack; every new genre has one record against each of the other 29 genres.
- 520 V6 cast portraits and cast records: 65 in each Role × Anime Type bucket.
- 1,440 live cast total after integration.
- 3,480 strict Role × Anime Type × genre-pair coverage cells, all witnessed by at least one same-character affinity triple.
- 50 new story arcs and 30 new arc-combo chains.
- Every one of the ten pairings among the five new genres has a bespoke shared crossover arc.
- New arc-combo references are validated against actual runtime arc IDs; no compatibility aliases or invented historical IDs are permitted.

The authoritative V6 identity and affinity roster is `docs/content-v6/GENRE30_CAST_ROSTER.csv`. The reduced image manifest at `art_src/cast_v6_genre30_upload_staging/manifest/final_manifest_webp.csv` is joined to that roster strictly by stable character ID and supplies only the staged WebP filename mapping. `npm run content:prepare` validates the exact join, copies all 520 staged WebPs into `public/cast/v6`, rebuilds generated cast/genre/arc payloads, and verifies source/runtime image bytes before development, tests or production builds.

The 65 affinity triples in each Role × Anime Type bucket provide complete mechanical coverage of the 135 new pair edges. The supplied art has 19 overt visible-pair themes; those visible affinities remain attached to the portraits they actually depict rather than being relabelled as 65 visual themes.

Release candidate validation was explicitly re-triggered on 2026-09-11 before promotion to `main`.
