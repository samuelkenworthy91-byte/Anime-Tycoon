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

The authoritative V6 art mapping is `art_src/cast_v6_genre30_upload_staging/manifest/final_manifest_webp.csv`. `npm run content:prepare` copies the 520 staged WebPs into `public/cast/v6`, rebuilds generated cast/genre/arc payloads, and validates the invariants above before development, tests or production builds.

Release candidate validation was explicitly re-triggered on 2026-09-11 before promotion to `main`.
