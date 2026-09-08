#!/usr/bin/env node
import fs from "node:fs";

function patch(path, edits) {
  let src = fs.readFileSync(path, "utf8");
  for (const [from, to, label] of edits) {
    if (src.includes(to)) continue;
    if (!src.includes(from)) throw new Error(`${path}: missing patch target ${label ?? from.slice(0, 60)}`);
    src = src.replace(from, to);
  }
  fs.writeFileSync(path, src);
}

patch("game_source/src/engine/awards.ts", [
  [
`  /** key art identity — rival poster manifest id for rivals */
  posterId?: string | null;`,
`  /** stable production identity — prevents one release appearing twice in the same category */
  sourceId?: string | null;
  /** key art identity — rival poster manifest id for rivals */
  posterId?: string | null;`,
"award source identity"
  ],
  [
`    audience: r.fans,
    posterId: r.posterId ?? null,`,
`    audience: r.fans,
    sourceId: \`${"${r.studioId}:${r.week}:${r.title}"}\`,
    posterId: r.posterId ?? null,`,
"rival source identity"
  ],
  [
`export function buildCeremony(year: number, shows: AwardNominee[]): AwardCeremony {
  const categories: AwardCategory[] = [];
  for (const def of AWARD_CATEGORIES) {
    const pool = shows.filter((n) => def.eligible(n));`,
`export function awardNomineeKey(n: AwardNominee): string {
  const source = n.sourceId?.trim();
  if (source) return source;
  return \`${"${n.player ? \"player\" : \"rival\"}|${n.studio.trim().toLowerCase()}|${n.title.trim().toLowerCase()}"}\`;
}

/** Old saves and edge-case simulation paths can hand the ceremony the same
 * release more than once. Collapse those duplicates before any category is
 * ranked so a production can never occupy two nominee slots in one award. */
export function dedupeAwardSlate(shows: AwardNominee[]): AwardNominee[] {
  const seen = new Set<string>();
  return shows.filter((show) => {
    const key = awardNomineeKey(show);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildCeremony(year: number, shows: AwardNominee[]): AwardCeremony {
  const uniqueShows = dedupeAwardSlate(shows);
  const categories: AwardCategory[] = [];
  for (const def of AWARD_CATEGORIES) {
    const pool = uniqueShows.filter((n) => def.eligible(n));`,
"dedupe award slate"
  ],
]);

patch("game_source/src/engine/state.ts", [
  [
`            audience: typeof n.audience === "number" ? n.audience : n.score * 400,
            posterId: n.posterId ?? null,`,
`            audience: typeof n.audience === "number" ? n.audience : n.score * 400,
            sourceId: typeof n.sourceId === "string" ? n.sourceId : null,
            posterId: n.posterId ?? null,`,
"migrate source identity"
  ],
  [
`        audience: result.fans,
        posterId: null,`,
`        audience: result.fans,
        sourceId: projectId,
        posterId: null,`,
"player release source identity"
  ],
]);

patch("game_source/src/engine/playtestSeed.ts", [
  [`const PLAYTEST_MARKER = "kirameki.playtest.awards-y2.slot3.v3";`, `const PLAYTEST_MARKER = "kirameki.playtest.awards-y2.slot3.v4";`, "playtest marker"],
  [
`    audience,
    posterId: null,`,
`    audience,
    sourceId: \`playtest:${"${index}"}:${"${title}"}\`,
    posterId: null,`,
"playtest source identity"
  ],
  [`nominee(0, "Neon Ronin Refrain", "shonen", ["samurai", "martial"], 36, 47, 53, 42, 19_800),`, `nominee(0, "My Heroic Overtime", "shonen", ["samurai", "martial"], 36, 47, 53, 42, 19_800),`, "playtest title 1"],
  [`nominee(1, "Petals After Rain", "shojo", ["romance", "slice"], 35, 52, 43, 48, 23_600),`, `nominee(1, "Kiss Note: Hearts in the Margin", "shojo", ["romance", "slice"], 35, 52, 43, 48, 23_600),`, "playtest title 2"],
  [`nominee(2, "Aegis Hearts", "shonen", ["mecha", "military"], 34, 42, 51, 45, 17_900),`, `nominee(2, "Mobile Suit: Rent Is Due", "shonen", ["mecha", "military"], 34, 42, 51, 45, 17_900),`, "playtest title 3"],
  [`nominee(3, "Starlit Overtime", "shojo", ["slice", "fantasy"], 32, 45, 40, 50, 15_700),`, `nominee(3, "Sailor Mood After School", "shojo", ["slice", "fantasy"], 32, 45, 40, 50, 15_700),`, "playtest title 4"],
]);

patch("game_source/src/engine/audio.ts", [
  [
`let muted = localStorage.getItem("kirameki.muted") === "1";`,
`let muted = localStorage.getItem("kirameki.muted") === "1";
const ceremonySources = new Set<AudioScheduledSourceNode>();

function trackCeremony(node: AudioScheduledSourceNode) {
  ceremonySources.add(node);
  node.addEventListener("ended", () => ceremonySources.delete(node), { once: true });
}

function stopCeremonyAudio() {
  for (const node of ceremonySources) {
    try { node.stop(); } catch { /* already stopped */ }
  }
  ceremonySources.clear();
}`,
"ceremony audio tracking"
  ],
  [
`function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.5, delay = 0, slideTo?: number) {`,
`function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.5, delay = 0, slideTo?: number, ceremony = false) {`,
"tone ceremony flag"
  ],
  [
`  o.start(t0);
  o.stop(t0 + dur + 0.05);`,
`  if (ceremony) trackCeremony(o);
  o.start(t0);
  o.stop(t0 + dur + 0.05);`,
"track ceremony tone"
  ],
  [
`function noise(dur: number, vol = 0.4, cutoff = 1800, delay = 0) {`,
`function noise(dur: number, vol = 0.4, cutoff = 1800, delay = 0, ceremony = false) {`,
"noise ceremony flag"
  ],
  [
`  src.connect(f).connect(g).connect(master);
  src.start(t0);`,
`  src.connect(f).connect(g).connect(master);
  if (ceremony) trackCeremony(src);
  src.start(t0);`,
"track ceremony noise"
  ],
  [
`export const sfx = {
  click() {`,
`export const sfx = {
  stopCeremony() {
    stopCeremonyAudio();
  },
  audienceSwell() {
    noise(0.45, 0.08, 4300, 0, true);
    noise(0.7, 0.09, 5200, 0.28, true);
    noise(0.9, 0.08, 6000, 0.62, true);
    tone(330, 0.34, "sine", 0.07, 0.18, 440, true);
    tone(440, 0.34, "sine", 0.06, 0.54, 660, true);
  },
  drumroll(grand = false) {
    const beats = grand ? 34 : 26;
    for (let i = 0; i < beats; i++) {
      const p = i / Math.max(1, beats - 1);
      const delay = i * (grand ? 0.075 : 0.082);
      noise(0.07, 0.08 + p * 0.13, 850 + p * 1800, delay, true);
      tone(72 + p * 28, 0.055, "triangle", 0.055 + p * 0.06, delay, undefined, true);
    }
    tone(105, 0.42, "sine", 0.12, beats * (grand ? 0.075 : 0.082) - 0.12, 70, true);
  },
  applause(grand = false) {
    const bursts = grand ? 24 : 16;
    for (let i = 0; i < bursts; i++) {
      const delay = (i % 8) * 0.085 + Math.floor(i / 8) * 0.3;
      noise(0.11 + (i % 3) * 0.035, grand ? 0.19 : 0.14, 5200 + (i % 5) * 700, delay, true);
    }
    noise(grand ? 2.4 : 1.7, grand ? 0.085 : 0.06, 7000, 0.06, true);
    [660, 784, 880, 988].forEach((f, i) => tone(f, 0.24, "sine", grand ? 0.08 : 0.05, 0.16 + i * 0.17, f * 1.08, true));
  },
  click() {`,
"ceremony sound effects"
  ],
  [
`  fanfare() {
    const seq = [523, 523, 523, 659, 784, 1046];
    seq.forEach((f, i) => tone(f, i === seq.length - 1 ? 0.4 : 0.12, "square", 0.26, i * 0.11));
    seq.forEach((f, i) => tone(f / 2, 0.12, "triangle", 0.18, i * 0.11));
  },`,
`  fanfare(ceremony = false) {
    const seq = [523, 523, 523, 659, 784, 1046];
    seq.forEach((f, i) => tone(f, i === seq.length - 1 ? 0.4 : 0.12, "square", 0.26, i * 0.11, undefined, ceremony));
    seq.forEach((f, i) => tone(f / 2, 0.12, "triangle", 0.18, i * 0.11, undefined, ceremony));
  },`,
"trackable fanfare"
  ],
]);

patch("game_source/src/components/AwardsCeremony.tsx", [
  [
`const sameNominee = (a: AwardNominee | null | undefined, b: AwardNominee | null | undefined) =>
  !!a && !!b && a.title === b.title && a.studio === b.studio;`,
`const nomineeKey = (n: AwardNominee) =>
  n.sourceId?.trim() || \`${"${n.player ? \"player\" : \"rival\"}|${n.studio.trim().toLowerCase()}|${n.title.trim().toLowerCase()}"}\`;

const sameNominee = (a: AwardNominee | null | undefined, b: AwardNominee | null | undefined) =>
  !!a && !!b && nomineeKey(a) === nomineeKey(b);`,
"source-aware nominee identity"
  ],
  [
`function NomineeList({ cat, beat }: { cat: AwardCategory; beat: BeatKind }) {
  const winner = cat.winner;
  const settled = beat === "envelope" || beat === "reveal";
  return (
    <div className={cn("aw-nominee-list", settled && "aw-list-settle")}>
      {cat.nominees.map((nominee, index) => {`,
`function NomineeList({ cat, beat }: { cat: AwardCategory; beat: BeatKind }) {
  const winner = cat.winner;
  const settled = beat === "envelope" || beat === "reveal";
  const nominees = cat.nominees.filter(
    (nominee, index, list) => list.findIndex((candidate) => nomineeKey(candidate) === nomineeKey(nominee)) === index
  );
  return (
    <div className={cn("aw-nominee-list", settled && "aw-list-settle")}>
      {nominees.map((nominee, index) => {`,
"defensive nominee list dedupe"
  ],
  [
`  useEffect(() => {
    primeAudio();
    switch (phase.t) {
      case "closed":
        sfx.whoosh();
        schedule(1700);
        break;
      case "opening":
        sfx.whoosh();
        schedule(2400);
        break;
      case "category":
        if (phase.beat === "intro") {
          sfx.phase();
          schedule(BEAT_MS.intro + (isAoty ? 500 : 0));
        } else if (phase.beat === "nominees") {
          sfx.stamp();
          schedule(BEAT_MS.nominees + (isAoty ? 600 : 0));
        } else if (phase.beat === "envelope") {
          sfx.reveal();
          schedule(BEAT_MS.envelope + (isAoty ? 1000 : 0));
        } else {
          if (isAoty) sfx.fanfare();
          else if (cat?.winner.player) sfx.cash();
          else sfx.stamp();
          if (cat?.winner.player && !isAoty) window.setTimeout(() => sfx.coin(), 620);
          schedule(BEAT_MS.reveal + (isAoty ? AOTY_EXTRA_MS : 0));
        }
        break;
      case "summary":
        sfx.fanfare();
        break;
    }
    return () => window.clearTimeout(timer.current);`,
`  useEffect(() => {
    primeAudio();
    sfx.stopCeremony();
    switch (phase.t) {
      case "closed":
        sfx.whoosh();
        schedule(1700);
        break;
      case "opening":
        sfx.whoosh();
        sfx.audienceSwell();
        schedule(2400);
        break;
      case "category":
        if (phase.beat === "intro") {
          sfx.phase();
          schedule(BEAT_MS.intro + (isAoty ? 500 : 0));
        } else if (phase.beat === "nominees") {
          schedule(BEAT_MS.nominees + (isAoty ? 600 : 0));
        } else if (phase.beat === "envelope") {
          sfx.drumroll(!!isAoty);
          schedule(BEAT_MS.envelope + (isAoty ? 1000 : 0));
        } else {
          sfx.applause(!!isAoty);
          if (isAoty) sfx.fanfare(true);
          schedule(BEAT_MS.reveal + (isAoty ? AOTY_EXTRA_MS : 0));
        }
        break;
      case "summary":
        sfx.applause(true);
        sfx.fanfare(true);
        break;
    }
    return () => {
      window.clearTimeout(timer.current);
      sfx.stopCeremony();
    };`,
"ceremony audio choreography"
  ],
  [
`      <img src="/awards/valance.webp" alt="" className="pointer-events-none absolute inset-x-0 top-0 z-40 h-auto w-full" />`,
`      <img src="/awards/valance.webp" alt="" className="aw-valance pointer-events-none absolute inset-x-0 top-0 z-40 h-auto w-full" />`,
"valance class"
  ],
  [
`          <img src="/awards/curtain-left.webp" alt="" className={cn("aw-curtain", phase.t === "closed" ? "closed-l" : "open-l")} />
          <img src="/awards/curtain-right.webp" alt="" className={cn("aw-curtain", phase.t === "closed" ? "closed-r" : "open-r")} />`,
`          <img src="/awards/curtain-left.webp" alt="" className={cn("aw-curtain aw-curtain-left", phase.t === "closed" ? "closed-l" : "open-l")} />
          <img src="/awards/curtain-right.webp" alt="" className={cn("aw-curtain aw-curtain-right", phase.t === "closed" ? "closed-r" : "open-r")} />`,
"anchored curtain classes"
  ],
  [
`            <div className="aw-title-reveal aw-marquee mt-[-10vh]">`,
`            <div className="aw-title-reveal aw-marquee aw-opening-title">`,
"opening title safe zone"
  ],
  [
`          <div className="flex h-full w-full flex-col items-center px-4 pb-14 pt-[8vh]" key={\`${"${cat.id}-${phase.beat}"}\`}>
            <div className={cn("text-center", (phase.beat === "intro" || phase.beat === "nominees") && "aw-rise")}>`,
`          <div className="aw-category-stage flex h-full w-full flex-col items-center px-4 pb-14" key={\`${"${cat.id}-${phase.beat}"}\`}>
            <div className={cn("aw-category-header text-center", (phase.beat === "intro" || phase.beat === "nominees") && "aw-rise")}>`,
"category safe zone"
  ],
  [
`          <button onClick={() => setPhase({ t: "summary" })} className="rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-[8px] font-bold tracking-[0.16em] text-paper/45 backdrop-blur">SKIP CEREMONY</button>`,
`          <button onClick={() => { sfx.stopCeremony(); setPhase({ t: "summary" }); }} className="rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-[8px] font-bold tracking-[0.16em] text-paper/45 backdrop-blur">SKIP CEREMONY</button>`,
"skip audio cleanup"
  ],
]);

const cssPath = "game_source/src/components/awardsCeremony.css";
let css = fs.readFileSync(cssPath, "utf8");
const cssMarker = "/* awards-polish-v3: stable curtains + mobile-safe stage */";
if (!css.includes(cssMarker)) {
  css += `\n\n${cssMarker}\n.aw-valance {\n  z-index: 60 !important;\n  max-height: 18vh;\n  object-fit: fill;\n}\n\n.aw-curtain {\n  top: 0 !important;\n  bottom: auto !important;\n  height: 100% !important;\n  width: 52vw !important;\n  max-width: 52vw !important;\n  object-fit: cover;\n  z-index: 30;\n  will-change: transform;\n}\n.aw-curtain-left { left: 0 !important; right: auto !important; object-position: right center; }\n.aw-curtain-right { right: 0 !important; left: auto !important; object-position: left center; }\n.aw-opening-title { margin-top: 7vh; }\n.aw-category-stage {\n  padding-top: max(18vh, calc(env(safe-area-inset-top, 0px) + 7rem));\n  min-height: 0;\n}\n.aw-category-header {\n  position: relative;\n  z-index: 20;\n  flex: 0 0 auto;\n}\n\n@media (max-width: 700px) {\n  .aw-valance { max-height: 16vh; }\n  .aw-category-stage {\n    padding-top: max(16vh, calc(env(safe-area-inset-top, 0px) + 6.6rem));\n    padding-left: .85rem !important;\n    padding-right: .85rem !important;\n  }\n  .aw-category-header .aw-marquee {\n    font-size: clamp(1.65rem, 8.3vw, 2.35rem) !important;\n    line-height: 1.08;\n  }\n  .aw-opening-title { margin-top: 9vh; }\n}\n\n@media (max-height: 760px) {\n  .aw-valance { max-height: 14vh; }\n  .aw-category-stage { padding-top: max(14vh, 5.6rem); }\n  .aw-opening-title { margin-top: 10vh; transform: scale(.9); }\n}\n`;
  fs.writeFileSync(cssPath, css);
}

patch("game_source/src/engine/rivals.ts", [
  [
`const SEQUEL_SUB = ["Return", "Re:Ignition", "Awakening", "Requiem", "Storm", "Ascension", "Vengeance", "Redemption", "Infinity", "Genesis"];
const SPINOFF_SUB = ["Gaiden", "Origins", "Side Story", "Another Story", "After Story", "Zero"];
const MOVIE_SUB = ["The Movie", "The Final Act", "Film", "Rebellion"];`,
`const SEQUEL_SUB = ["Return", "Re:Ignition", "Awakening", "Requiem", "Storm", "Ascension", "Vengeance", "Redemption", "Infinity", "Genesis"];
const SPINOFF_SUB = ["Gaiden", "Origins", "Side Story", "Another Story", "After Story", "Zero"];
const MOVIE_SUB = ["The Movie", "The Final Act", "Film", "Rebellion"];

/** Rival originals deliberately sound like anime titles, including affectionate
 * parody/allusion, but never copy an existing title verbatim. The primary
 * genre selects the strongest bank; a second genre can widen the pool. */
const RIVAL_TITLE_BANK: Partial<Record<GenreId, string[]>> = {
  mecha: ["Mobile Suit: Rent Is Due", "Neon Gear Re:Genesis", "Giant Robot Small Claims", "Mecha Me Later", "Steel Frame Panic!"],
  isekai: ["I Got Rehired in Another World", "That Time My Rent Became a Quest", "Respawned With No Annual Leave", "Another World, Same Deadline", "My Inventory Is Mostly Receipts"],
  slice: ["Quiet Days, Loud Neighbours", "My Lunch Break Has a Plot", "After School Overtime", "Ordinary Tuesday EX", "The Club That Forgot Its Purpose"],
  horror: ["Junji Oh-No", "The Ring Tone Is Coming From Inside", "Chainsaw Intern", "Night Shift of the Living Deadlines", "Cursed VHS Club"],
  romance: ["Kiss Note", "Love Is Mostly Logistics", "Your Name Was in the Group Chat", "Confession Pending!", "Heartstrings & Red Tape"],
  sports: ["Blue Locker Room", "Haikyu Later", "Slam Deadline", "Ace of Base Line", "Extra Time! Extra Feelings!"],
  cyber: ["Ghost in the Payroll", "Serial Experiments: Login", "Psycho-Passcode", "Chrome Hearts, Broken Wi-Fi", "Firewall//Feelings"],
  fantasy: ["Fullmetal Accountant", "Dungeon Meshi-up", "The Fellowship of the Ping", "Sword Art Offline", "Mana Management!"],
  idol: ["Oshi No Maybe", "Idol Hands Are the Devil's Workshop", "Encore! But Make It Rent", "Stage Fright☆All Night", "Center Position Pending"],
  mystery: ["Case Closed for Lunch", "Detective Conan't Make the Deadline", "Murder, She Streamed", "The Locked Room Has Wi-Fi", "Clue Club After Dark"],
  comedy: ["Nichijou Business", "Daily Lives of Very Tired People", "Gintama Receipt", "Punchline Pending", "Laugh Track Academy"],
  cooking: ["Food Wars: Fridge Edition", "Attack on Titanobori", "My Hero Macadamia", "Dungeon Meshi-up Deluxe", "Kitchen Shonen Showdown"],
  military: ["Attack on Timesheets", "86 Unread Emails", "Code Geasslight", "Full Metal Payroll", "Tactical Lunch Break"],
  supernatural: ["Mob Psycho 9-to-5", "Bleach the Break Room", "Spirit Away Message", "Paranormal Activity Report", "Possessed by Overtime"],
  space: ["Cowboy Bebop-Up Shop", "Space Dandy-ish", "Galaxy Express Checkout", "Planetes, But With Rent", "Orbital Overtime"],
  magical: ["Sailor Mood", "Cardcaptor Overtime", "Magical Girl Compliance Dept.", "Pretty Cure-ish", "Moon Prism Payroll"],
  survival: ["Made in a Miss", "Promised Never-Landlord", "Battle Royale With Cheese", "Last Train, No Signal", "Respawn Denied"],
  pirate: ["One More Piece", "Grand Line Item", "Pirate King of HR", "Treasure Island Dispute", "Straw Hat, No Benefits"],
  martial: ["One Punch Overtime", "My Heroic Internship", "Fist of the Lunch Star", "Dragon Call Z", "Uppercut Academia"],
  mythology: ["Fate/Stay Employed", "Saint Seiya Later", "Record of Ragnarok-and-Roll", "Gods' Day Off", "Myth Taken Identity"],
  nordic: ["Saga of the Very Tired North", "Vinland Landlord", "Thorfinn's Day Off", "Longship, Short Notice", "North Sea Side Story"],
  samurai: ["Rurouni Deadline", "Samurai Champloo-ish", "Blade Runner-Up!", "Seven Samurai, Eight Meetings", "Ronin With Benefits"],
  shinobi: ["Ninja Scroll Down", "Hidden Leaf on Read", "Shinobi No Show", "Shadow Clone Overtime", "Kunai Ask You Something?"],
};

function makeOriginalTitle(genres: GenreId[], animeType: AnimeType): string {
  const pool = genres.flatMap((genre) => RIVAL_TITLE_BANK[genre] ?? []);
  const base = pick(pool.length ? pool : PUN_TITLES);
  if (animeType === "shojo" && Math.random() < 0.18 && !/[!☆]$/.test(base)) return `${base}!`;
  return base;
}

function uniqueTitle(base: string, usedTitles: Set<string>): string {
  if (!usedTitles.has(base.toLowerCase())) return base;
  const tags = ["Again", "Next Beat", "Second Cour", "Encore", "Re:Mix", "After Hours"];
  for (const tag of tags) {
    const candidate = `${base}: ${tag}`;
    if (!usedTitles.has(candidate.toLowerCase())) return candidate;
  }
  let n = 2;
  while (usedTitles.has(`${base} ${n}`.toLowerCase())) n += 1;
  return `${base} ${n}`;
}`,
"genre-aware parody title bank"
  ],
  [
`  boost = 0
): { productions: RivalProduction[]; posterRecent: string[]; franchises: RivalFranchise[] } {`,
`  boost = 0,
  usedTitles = new Set<string>()
): { productions: RivalProduction[]; posterRecent: string[]; franchises: RivalFranchise[] } {`,
"global title set parameter"
  ],
  [`  const usedTitles = new Set<string>();
  const productions: RivalProduction[] = [];`, `  const productions: RivalProduction[] = [];`, "remove local title set"],
  [
`    } else {
      kind = "original";
      title = makeTitle({ key: "", baseTitle: "", genres: [], animeType: "shonen", season: 0, popularity: 0, bestScore: 0, lastScore: 0, lastEntryWeek: 0, entries: 0 }, "original");
      while (usedTitles.has(title) || franchises.some((f) => f.baseTitle === title)) title = `${title} 2`;
      usedTitles.add(title);
      genres = pickGenres(studio);
      animeType = studio.persona === "idol" || studio.persona === "prestige" ? "shojo" : Math.random() < 0.5 ? "shonen" : "shojo";
      franchiseKey = null;
    }`,
`    } else {
      kind = "original";
      genres = pickGenres(studio);
      animeType = studio.persona === "idol" || studio.persona === "prestige" ? "shojo" : Math.random() < 0.5 ? "shonen" : "shojo";
      title = uniqueTitle(makeOriginalTitle(genres, animeType), usedTitles);
      franchiseKey = null;
    }
    title = uniqueTitle(title, usedTitles);
    usedTitles.add(title.toLowerCase());`,
"generate and reserve unique titles"
  ],
  [
`  const studios = world.studios.map((st) => {
    const t = yearTransition(st, year);`,
`  const usedTitles = new Set(
    world.studios.flatMap((studio) => [
      ...studio.releases.filter((release) => release.year === year).map((release) => release.title.toLowerCase()),
      ...studio.productions.filter((production) => production.year === year).map((production) => production.title.toLowerCase()),
    ])
  );
  const studios = world.studios.map((st) => {
    const t = yearTransition(st, year);`,
"year-wide title registry"
  ],
  [
`    const slate = planStudioYear(next, year, yearStartWeek, boost);`,
`    const slate = planStudioYear(next, year, yearStartWeek, boost, usedTitles);`,
"pass year title registry"
  ],
  [
`      const fr = maybeContinue(studio);
      const genres = fr ? [...fr.genres] : pickGenres(studio);
      const kind: RivalEntryKind = fr ? "season" : "original";
      let title = fr ? makeTitle(fr, kind) : pick(PUN_TITLES);
      if (!fr) while (studio.franchises.some((f) => f.baseTitle === title)) title = `${title} 2`;
      const id = \`rp${"${++rivalProdSeq}"}_surp_${"${week}"}\`;
      const animeType = fr?.animeType ?? (studio.persona === "idol" || studio.persona === "prestige" ? "shojo" : "shonen");`,
`      const fr = maybeContinue(studio);
      const genres = fr ? [...fr.genres] : pickGenres(studio);
      const kind: RivalEntryKind = fr ? "season" : "original";
      const animeType = fr?.animeType ?? (studio.persona === "idol" || studio.persona === "prestige" ? "shojo" : "shonen");
      const usedTitles = new Set(world.studios.flatMap((s) => [
        ...s.releases.map((release) => release.title.toLowerCase()),
        ...s.productions.map((production) => production.title.toLowerCase()),
        ...s.franchises.map((franchise) => franchise.baseTitle.toLowerCase()),
      ]));
      const title = uniqueTitle(fr ? makeTitle(fr, kind) : makeOriginalTitle(genres, animeType), usedTitles);
      const id = \`rp${"${++rivalProdSeq}"}_surp_${"${week}"}\`;`,
"unique surprise title"
  ],
]);

const testPath = "game_source/src/engine/__tests__/awards-polish.test.ts";
fs.writeFileSync(testPath, `import { describe, expect, it } from "vitest";\nimport { awardNomineeKey, buildCeremony, type AwardNominee } from "../awards";\nimport { initRivalWorld } from "../rivals";\n\nconst nominee = (sourceId: string | null, title: string, studio = "Studio B"): AwardNominee => ({\n  sourceId,\n  title,\n  studio,\n  player: false,\n  animeType: "shonen",\n  genres: ["martial"],\n  score: 32,\n  story: 32,\n  art: 32,\n  sound: 32,\n  audience: 12_000,\n  posterId: null,\n  draft: null,\n  protag: null,\n});\n\ndescribe("awards ceremony polish", () => {\n  it("never places the same production twice in one category", () => {\n    const repeated = nominee("release-42", "One Punch Overtime");\n    const ceremony = buildCeremony(2, [\n      repeated,\n      { ...repeated },\n      nominee("release-43", "Kiss Note"),\n      nominee("release-44", "Mobile Suit: Rent Is Due"),\n      nominee("release-45", "Sailor Mood"),\n    ]);\n    for (const category of ceremony.categories) {\n      const keys = category.nominees.map(awardNomineeKey);\n      expect(new Set(keys).size).toBe(keys.length);\n    }\n  });\n\n  it("deduplicates legacy entries without source ids by studio and title", () => {\n    const legacy = nominee(null, "Uppercut Academia");\n    const category = buildCeremony(2, [legacy, { ...legacy }, nominee(null, "Blue Locker Room", "Studio C")]).categories[0];\n    expect(category.nominees.filter((entry) => entry.title === "Uppercut Academia")).toHaveLength(1);\n  });\n\n  it("plans a rival year with unique, non-empty release titles across studios", () => {\n    const world = initRivalWorld(0);\n    const titles = world.studios.flatMap((studio) => studio.productions.map((production) => production.title));\n    expect(titles.length).toBeGreaterThan(6);\n    expect(titles.every((title) => title.trim().length >= 5)).toBe(true);\n    expect(new Set(titles.map((title) => title.toLowerCase())).size).toBe(titles.length);\n  });\n});\n`);

console.log("Awards polish pass applied.");
