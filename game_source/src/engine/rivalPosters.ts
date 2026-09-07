/* ============================================================================
 *  RIVAL POSTER REGISTRY — data-driven key art for the rival studios
 *
 *  Competing studios get real, persistent key visuals. The manifest
 *  (generated/rivalPosterManifest.json) describes every poster slot:
 *
 *    id          — stable identity (locked onto a release at greenlight)
 *    img         — public/ file path (WebP)
 *    studio      — owning rival studio (pools never cross studios)
 *    animeTypes  — Shonen/Shojo compatibility
 *    genres      — genre tags used for matching
 *    family      — optional franchise visual family (seasons share a world)
 *    pending     — slot reserved for a future art drop; unselectable
 *
 *  Selection rules (C7/C8):
 *   1. studio pool only                 4. recent-use avoidance
 *   2. Shonen/Shojo compatible          5. never re-roll once locked
 *   3. best genre fit                   6. franchise family continuity
 * ========================================================================== */
import manifestJson from "./generated/rivalPosterManifest.json";
import type { AnimeType, GenreId } from "./data";

export interface RivalPoster {
  id: string;
  img: string;
  studio: string;
  persona: string;
  animeTypes: AnimeType[];
  genres: GenreId[];
  family: string | null;
  /** reserved slot whose art has not been generated yet — never selected */
  pending?: boolean;
}

interface ManifestShape {
  schema: number;
  posters: RivalPoster[];
}

const MANIFEST = manifestJson as unknown as ManifestShape;

/** every poster whose art actually shipped — pending slots stay invisible */
export const RIVAL_POSTERS: RivalPoster[] = MANIFEST.posters.filter((p) => !p.pending);

/** full manifest rows including pending future slots (tools/reporting) */
export const RIVAL_POSTER_SLOTS: RivalPoster[] = MANIFEST.posters;

const BY_ID = new Map(RIVAL_POSTERS.map((p) => [p.id, p]));

export const rivalPosterById = (id: string | null | undefined): RivalPoster | null =>
  (id && BY_ID.get(id)) || null;

export const rivalPostersForStudio = (studio: string): RivalPoster[] =>
  RIVAL_POSTERS.filter((p) => p.studio === studio);

/** how many posters of one studio's pool are usable right now */
export const poolSize = (studio: string): number => rivalPostersForStudio(studio).length;

/* ------------------------------------------------------------ selection */

export interface PosterPickCtx {
  /** owning studio name (must match the RivalStudio name) */
  studio: string;
  animeType: AnimeType;
  genres: GenreId[];
  /** poster ids this studio has used recently (most recent last) */
  recent?: readonly string[];
  /** franchise visual family to continue, when this is a continuation */
  family?: string | null;
  /** injectable randomness for tests; default Math.random */
  rand?: () => number;
}

/** score one candidate: genre fit first, then type compatibility.
 *  Recency is a hard filter (until the pool would otherwise be empty),
 *  handled by pickRivalPoster — not part of this score. */
function fitScore(p: RivalPoster, ctx: PosterPickCtx): number {
  let s = 0;
  ctx.genres.forEach((g, i) => {
    if (p.genres.includes(g)) s += i === 0 ? 6 : 3;
  });
  if (p.animeTypes.includes(ctx.animeType)) s += 4;
  /* a small deterministic nudge keeps equal scores stable */
  s += (p.id.charCodeAt(p.id.length - 1) % 7) * 0.01;
  return s;
}

/**
 * Choose the permanent poster identity for a rival production.
 * Returns null only when the studio's pool is completely empty.
 */
export function pickRivalPoster(ctx: PosterPickCtx): RivalPoster | null {
  const rand = ctx.rand ?? Math.random;
  const recent = new Set(ctx.recent ?? []);
  const pool = rivalPostersForStudio(ctx.studio);
  if (!pool.length) return null;

  /* franchise family continuity: prefer a yet-unused image from the same
     visual family so S1 / S2 / Movie feel like one ongoing world */
  if (ctx.family) {
    const familyPool = pool.filter((p) => p.family === ctx.family && !recent.has(p.id));
    if (familyPool.length) {
      const scored = familyPool
        .map((p) => ({ p, s: fitScore(p, ctx) + rand() * 1.5 }))
        .sort((a, b) => b.s - a.s);
      return scored[0].p;
    }
  }

  /* hard recency avoidance first; if the remaining pool would be empty,
     reuse the least-recently used candidates (sensible cooldown fallback) */
  let candidates = pool.filter((p) => !recent.has(p.id));
  if (!candidates.length) {
    const lastUse = new Map<string, number>();
    (ctx.recent ?? []).forEach((id, i) => lastUse.set(id, i));
    candidates = [...pool].sort(
      (a, b) => (lastUse.get(a.id) ?? -1) - (lastUse.get(b.id) ?? -1)
    ).slice(0, Math.max(1, Math.ceil(pool.length / 3)));
  }

  let scored = candidates.map((p) => ({ p, s: fitScore(p, ctx) }));
  const best = Math.max(...scored.map((x) => x.s));
  /* choose among near-best so slates vary, then lock forever */
  const top = scored.filter((x) => x.s >= best - 1.5);
  scored = top.sort(() => rand() - 0.5);
  return scored[0].p;
}

/** ids currently known to be in use — for ceremony-level duplicate audits */
export function postersInUse(releases: { posterId?: string | null }[]): Set<string> {
  return new Set(releases.map((r) => r.posterId).filter((x): x is string => !!x));
}

/** true when every listed release carries a distinct poster — used by tests
 *  and by the ceremony build sanity check */
export function noDuplicatePosters(releases: { posterId?: string | null }[]): boolean {
  const ids = releases.map((r) => r.posterId).filter(Boolean);
  return new Set(ids).size === ids.length;
}
