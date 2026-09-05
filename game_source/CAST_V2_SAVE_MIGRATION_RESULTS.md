# Cast V2 Save Migration Results

## Storage

- Current saves write version 4 keys.
- Version 3 slots remain readable as a non-destructive compatibility source.
- Loading does not delete or overwrite the version 3 key; the next ordinary save writes version 4.
- Missing discovery state initializes to an empty array. Historical shows never retroactively reveal hidden affinities.

## Genre migration

Active subject metadata uses:

- Racing → Sports
- Noir → Mystery
- Shonen and Shojo are removed from active genre arrays.

Progression ownership intentionally uses:

- old Racing unlock → Pirate unlock
- old Noir unlock → Survival unlock
- Slice of Life and Fantasy remain safe starting unlocks.

Invalid active combinations are retained only in the legacy combo ledger. Current genre knowledge, market records, commissions, recent releases and arc/genre knowledge are migrated to valid IDs.

## Anime Type inference

- Shonen present without Shojo → Shonen Type.
- Shojo present without Shonen → Shojo Type.
- Both or neither → canonical Lead Type when the stable cast ID resolves.
- Unresolvable legacy Lead → deterministic Shonen fallback.

## Cast, staff and franchise compatibility

- Stable Cast V2 IDs are preserved; unknown ancient IDs render as explicit archive placeholders rather than silently becoming another character.
- Staff favourite Racing/Noir migrate to Sports/Mystery.
- Staff favourite Shonen/Shojo is cleared because Type is not a genre.
- Current projects, last draft and audience-test drafts gain Type and valid genres.
- Franchise entries, continuations and Hall of Fame records gain deterministic Type while retaining legacy genre labels for archival compatibility.
- Rival productions and franchises persist Type.

Migration tests pass, including discovery persistence and the no-retroactive-discovery rule.

