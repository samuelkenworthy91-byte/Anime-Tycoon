import { GENRES, PROTAGONISTS, type Draft } from "./data";
import { rollHire } from "./careers";
import { advanceWeeks, initialRun, type RunState } from "./state";
import { loadSlot, saveSlot, type SaveData } from "./storage";
import type { AwardNominee } from "./awards";

const PLAYTEST_MARKER = "kirameki.playtest.awards-y2.slot3.v3";
const PLAYTEST_WEEK = 95;
const PLAYTEST_DAY = PLAYTEST_WEEK * 7 + 6;

function nominee(
  index: number,
  title: string,
  animeType: "shonen" | "shojo",
  genres: AwardNominee["genres"],
  score: number,
  story: number,
  art: number,
  sound: number,
  audience: number,
): AwardNominee {
  const lead = PROTAGONISTS[index % PROTAGONISTS.length];
  const draft: Draft = {
    title,
    genres: [...genres],
    medium: "tv",
    budget: "standard",
    slot: "midnight",
    animeType,
    audience: "teens",
    protag: lead.id,
    protagName: lead.name,
    secondary: "",
    pet: "",
    villain: "",
    arcs: [],
    sliders: [58, 58, 58],
    season: 1,
  };
  return {
    title,
    studio: "Anime Runner",
    player: true,
    animeType,
    genres: [...genres],
    score,
    story,
    art,
    sound,
    audience,
    posterId: null,
    draft,
    protag: lead.id,
  };
}

export function makeAwardsPlaytestSave(): SaveData {
  /* Advance the real simulation so Year 2 has a genuine persistent rival slate.
     Player-facing state is then shaped into a compact, stable playtest career. */
  const simulated = advanceWeeks(initialRun("Anime Runner", "steady"), PLAYTEST_WEEK);

  const yearShows: AwardNominee[] = [
    nominee(0, "Neon Ronin Refrain", "shonen", ["samurai", "martial"], 36, 47, 53, 42, 19_800),
    nominee(1, "Petals After Rain", "shojo", ["romance", "slice"], 35, 52, 43, 48, 23_600),
    nominee(2, "Aegis Hearts", "shonen", ["mecha", "military"], 34, 42, 51, 45, 17_900),
    nominee(3, "Starlit Overtime", "shojo", ["slice", "fantasy"], 32, 45, 40, 50, 15_700),
  ];

  const staff = Array.from({ length: 6 }, () => rollHire(PLAYTEST_WEEK));
  const candidates = Array.from({ length: 3 }, () => rollHire(PLAYTEST_WEEK));
  const genreKnowledge = Object.fromEntries(GENRES.map((genre) => [genre.id, 3])) as RunState["genreKnowledge"];

  const run: RunState = {
    ...simulated,
    studio: "Anime Runner",
    showrunner: "steady",
    week: PLAYTEST_WEEK,
    day: PLAYTEST_DAY,
    cash: 485_000,
    fans: 68_500,
    rd: 180,
    officeLevel: 2,
    showsMade: 8,
    hits: 6,
    totalRevenue: 1_760_000,
    bestScore: 36,
    studioTop: 36,
    reviewExpectation: 33.5,
    staff,
    candidates,
    genresUnlocked: GENRES.map((genre) => genre.id),
    genreKnowledge,
    hallOfFame: [
      { title: "Ashes of Tomorrow", score: 34, genres: ["fantasy", "martial"], animeType: "shonen", protag: PROTAGONISTS[4 % PROTAGONISTS.length].id, week: 38 },
      { title: "Velvet Comet", score: 33, genres: ["romance", "fantasy"], animeType: "shojo", protag: PROTAGONISTS[5 % PROTAGONISTS.length].id, week: 45 },
      { title: "Steel Hymn", score: 35, genres: ["mecha", "military"], animeType: "shonen", protag: PROTAGONISTS[6 % PROTAGONISTS.length].id, week: 71 },
      { title: "Paper Moon Club", score: 32, genres: ["slice", "romance"], animeType: "shojo", protag: PROTAGONISTS[7 % PROTAGONISTS.length].id, week: 82 },
    ],
    yearShows,
    awardsCeremony: null,
    projects: [],
    payouts: [],
    marketEvents: [],
    studioEvents: [],
    staffEvents: [],
    contractJobs: [],
    trainingJobs: [],
    researchJobs: [],
    audienceTest: null,
    notices: ["PLAYTEST SAVE — Year 2 awards are tomorrow. Advance one in-game day to open the ceremony."],
  };

  return {
    run,
    meta: { studio: "Anime Runner", showrunner: "steady" },
    clock: { day: 6, phase: 0, acc: 0, dayCount: 6 },
    summary: {
      studio: run.studio,
      week: run.week,
      cash: run.cash,
      fans: run.fans,
      shows: run.showsMade,
      officeLevel: run.officeLevel,
    },
  };
}

/**
 * This APK is a playtest build. On the first launch of this build only,
 * overwrite manual slot 3 with the prepared Year-2 awards save. Slots 1/2 and
 * autosave are untouched. A marker prevents later launches from overwriting
 * the player's progress after they have started testing.
 */
export function seedAwardsPlaytestSlot3(): boolean {
  try {
    if (localStorage.getItem(PLAYTEST_MARKER) === "1") return false;
    const ok = saveSlot("3", makeAwardsPlaytestSave());
    if (ok && loadSlot("3")) {
      localStorage.setItem(PLAYTEST_MARKER, "1");
      return true;
    }
  } catch {
    /* Storage unavailable: leave normal save behaviour untouched. */
  }
  return false;
}
