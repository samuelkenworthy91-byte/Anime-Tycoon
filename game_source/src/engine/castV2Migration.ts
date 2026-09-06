import { GENRES, castById, type AnimeType, type Draft, type GenreId, type Staff } from "./data";

const ACTIVE = new Set<string>(GENRES.map((genre) => genre.id));
const asStrings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/** Subject-matter migration for active productions and current metadata. */
export function migrateActiveGenre(raw: unknown): GenreId | null {
  if (raw === "racing") return "sports";
  if (raw === "noir") return "mystery";
  return typeof raw === "string" && ACTIVE.has(raw) ? raw as GenreId : null;
}

/** Ownership migration intentionally follows the approved progression mapping. */
export function migrateUnlockedGenres(raw: unknown): GenreId[] {
  const migrated = asStrings(raw).flatMap((genre): GenreId[] => {
    if (genre === "racing") return ["pirate"];
    if (genre === "noir") return ["survival"];
    const active = migrateActiveGenre(genre);
    return active ? [active] : [];
  });
  return [...new Set<GenreId>(["slice", "fantasy", ...migrated])];
}

export function inferAnimeType(raw: unknown, genres: unknown, leadId: unknown): AnimeType {
  if (raw === "shonen" || raw === "shojo") return raw;
  const legacy = asStrings(genres);
  const hadShonen = legacy.includes("shonen");
  const hadShojo = legacy.includes("shojo");
  if (hadShonen !== hadShojo) return hadShonen ? "shonen" : "shojo";
  const lead = castById(typeof leadId === "string" ? leadId : "");
  return lead.legacyPlaceholder ? "shonen" : lead.type;
}

export function migrateGenreList(raw: unknown, leadId?: unknown, unlocked?: readonly GenreId[]): GenreId[] {
  const genres = asStrings(raw).map(migrateActiveGenre).filter((genre): genre is GenreId => !!genre);
  const unique = [...new Set(genres)].slice(0, 2);
  if (unique.length) return unique;
  const lead = castById(typeof leadId === "string" ? leadId : "");
  const preferred = !lead.legacyPlaceholder ? lead.visibleAff[0] : "slice";
  return [!unlocked || unlocked.includes(preferred) ? preferred : "slice"];
}

export function migrateDraftV2(raw: Draft | Record<string, unknown>, unlocked?: readonly GenreId[]): Draft {
  const draft = raw as Draft;
  const oldGenres = (raw as { genres?: unknown }).genres;
  return {
    ...draft,
    animeType: inferAnimeType((raw as { animeType?: unknown }).animeType, oldGenres, draft.protag),
    genres: migrateGenreList(oldGenres, draft.protag, unlocked),
  };
}

export function migrateGenreRecord(raw: unknown): Partial<Record<GenreId, number>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<GenreId, number>> = {};
  for (const [key, value] of Object.entries(raw)) {
    const genre = migrateActiveGenre(key);
    if (!genre || typeof value !== "number") continue;
    out[genre] = Math.max(out[genre] ?? Number.NEGATIVE_INFINITY, value);
  }
  return out;
}

export function migrateComboLevels(raw: unknown): { active: Record<string, number>; legacy: Record<string, number> } {
  const active: Record<string, number> = {};
  const legacy: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return { active, legacy };
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "number") continue;
    const parts = key.split("|");
    const migrated = parts.map(migrateActiveGenre);
    if (parts.length !== 2 || migrated.some((genre) => !genre) || migrated[0] === migrated[1]) {
      legacy[key] = value;
      continue;
    }
    const next = (migrated as GenreId[]).sort().join("|");
    active[next] = Math.max(active[next] ?? 0, value);
  }
  return { active, legacy };
}

export function migrateStaffGenre(staff: Staff): Staff {
  const raw = staff.favGenre as string | undefined;
  if (raw === "shonen" || raw === "shojo") return { ...staff, favGenre: undefined };
  const favGenre = migrateActiveGenre(raw);
  return favGenre ? { ...staff, favGenre } : staff;
}

export const isActiveGenre = (value: unknown): value is GenreId => typeof value === "string" && ACTIVE.has(value);
