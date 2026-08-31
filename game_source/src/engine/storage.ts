export interface ScoreEntry {
  name: string;
  score: number;
  fans: number;
  shows: number;
  year: number;
  victory: boolean;
  date: number;
}

const KEY = "kirameki.scores.v1";
const MAX = 8;

export function getScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ScoreEntry[];
    return Array.isArray(arr) ? arr.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function addScore(entry: ScoreEntry): { scores: ScoreEntry[]; rank: number } {
  const scores = [...getScores(), entry].sort((a, b) => b.score - a.score).slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(scores));
  } catch {
    /* ignore */
  }
  const rank = scores.findIndex((s) => s.date === entry.date && s.name === entry.name);
  return { scores, rank };
}

export function clearScores() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
