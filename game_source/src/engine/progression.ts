import { GENRES, OFFICES, type GenreId } from "./data";

const GENRE_PURCHASE_CURVE = [
  9, 11, 13, 15,
  19, 22, 25, 28, 32,
  35, 38, 41, 44, 47, 50, 53, 55,
  60, 65, 70, 75, 80, 85, 90, 95,
] as const;

export interface GenreProgressState {
  rd: number;
  genresUnlocked: GenreId[];
  notices: string[];
}

export function genreUnlockCost(run: Pick<GenreProgressState, "genresUnlocked">, genreId: GenreId): number {
  if (run.genresUnlocked.includes(genreId)) return 0;
  const purchases = Math.max(0, new Set(run.genresUnlocked).size - 2);
  const base = GENRE_PURCHASE_CURVE[Math.min(purchases, GENRE_PURCHASE_CURVE.length - 1)];
  const genre = GENRES.find((g) => g.id === genreId);
  const oldPrice = genre?.rd ?? 30;
  const modifier = oldPrice <= 18 ? -1 : oldPrice <= 32 ? 0 : oldPrice <= 48 ? 1 : 2;
  return Math.max(8, Math.min(95, base + modifier));
}

export function unlockGenreLicense<T extends GenreProgressState>(run: T, genreId: GenreId): T | null {
  if (run.genresUnlocked.includes(genreId)) return null;
  const cost = genreUnlockCost(run, genreId);
  if (run.rd < cost) return null;
  const label = GENRES.find((g) => g.id === genreId)?.label ?? genreId;
  return {
    ...run,
    rd: run.rd - cost,
    genresUnlocked: [...run.genresUnlocked, genreId],
    notices: [...run.notices, `New genre licensed: ${label}! (${cost} RD)`],
  };
}

export interface OfficeProgressState {
  cash: number;
  officeLevel: number;
  showsMade: number;
  staff: readonly unknown[];
  fans: number;
}

export interface ProgressRequirement {
  id: "cash" | "shows" | "staff" | "fans";
  label: string;
  current: number;
  target: number;
  met: boolean;
  display: string;
}

const OFFICE_GATES: Record<number, { shows: number; staff: number; fans: number }> = {
  1: { shows: 3, staff: 1, fans: 2_500 },
  2: { shows: 8, staff: 3, fans: 20_000 },
  3: { shows: 15, staff: 5, fans: 75_000 },
  4: { shows: 24, staff: 8, fans: 200_000 },
};

const number = (v: number) => Math.round(v).toLocaleString("en-GB");
const money = (v: number) => `£${Math.round(v).toLocaleString("en-GB")}`;

export function officeRelocationRequirements(run: OfficeProgressState): ProgressRequirement[] {
  const nextLevel = run.officeLevel + 1;
  const next = OFFICES[nextLevel];
  const gate = OFFICE_GATES[nextLevel];
  if (!next || !gate) return [];
  return [
    { id: "cash", label: "Cash", current: run.cash, target: next.cost, met: run.cash >= next.cost, display: `${money(run.cash)} / ${money(next.cost)}` },
    { id: "shows", label: "Productions aired", current: run.showsMade, target: gate.shows, met: run.showsMade >= gate.shows, display: `${run.showsMade} / ${gate.shows}` },
    { id: "staff", label: "Employees", current: run.staff.length, target: gate.staff, met: run.staff.length >= gate.staff, display: `${run.staff.length} / ${gate.staff}` },
    { id: "fans", label: "Studio fans", current: run.fans, target: gate.fans, met: run.fans >= gate.fans, display: `${number(run.fans)} / ${number(gate.fans)}` },
  ];
}

export function officeRelocationBlockReason(run: OfficeProgressState): string | null {
  const requirements = officeRelocationRequirements(run);
  if (!requirements.length) return "No larger studio is available.";
  const missing = requirements.filter((r) => !r.met);
  return missing.length ? `Requires ${missing.map((r) => `${r.label} ${r.display}`).join(" · ")}` : null;
}
