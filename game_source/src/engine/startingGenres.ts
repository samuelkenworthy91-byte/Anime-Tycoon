import { GENRES, type GenreId } from "./data";

/** Pick two different genres uniformly from the live canonical genre pool. */
export function randomStartingGenres(rng: () => number = Math.random): [GenreId, GenreId] {
  const pool = GENRES.map((genre) => genre.id);
  if (pool.length < 2) throw new Error("At least two genres are required to start a career");

  const firstIndex = Math.floor(rng() * pool.length);
  const [first] = pool.splice(firstIndex, 1);
  const secondIndex = Math.floor(rng() * pool.length);
  const [second] = pool.splice(secondIndex, 1);
  return [first, second];
}
