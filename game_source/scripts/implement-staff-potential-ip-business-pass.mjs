import { readFileSync, writeFileSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const write = (p, s) => writeFileSync(p, s);
const mustReplace = (text, from, to, label) => {
  if (!text.includes(from)) throw new Error(`Missing replacement target: ${label}`);
  return text.replace(from, to);
};
const mustReplaceRegex = (text, re, to, label) => {
  if (!re.test(text)) throw new Error(`Missing regex target: ${label}`);
  return text.replace(re, to);
};

// ---------------------------------------------------------------- data.ts
{
  const p = "src/engine/data.ts";
  let s = read(p);
  s = mustReplace(s,
`export interface Staff {`,
`export interface StaffLevelUpRecord {
  id: string;
  beforeLevel: number;
  afterLevel: number;
  title: string;
  before: { story: number; art: number; sound: number };
  after: { story: number; art: number; sound: number };
  gains: { story: number; art: number; sound: number };
}

export interface Staff {`, "staff level-up record");

  s = mustReplace(s,
`  /** index into WORKER_LOOKS — the painted model used for the office sprite,
      the desk sprite on the production floor AND the menu portrait */
  look?: number;
  /* ---- career (engine/careers.ts fills + maintains these) ---- */`,
`  /** index into WORKER_LOOKS — the painted model used for the office sprite,
      the desk sprite on the production floor AND the menu portrait */
  look?: number;
  /** hidden 1..100 long-term development ceiling; never displayed numerically */
  potential?: number;
  /** durable level-up reveals waiting for the player to acknowledge */
  pendingLevelUps?: StaffLevelUpRecord[];
  /* ---- career (engine/careers.ts fills + maintains these) ---- */`, "staff potential fields");

  const oldNames = `const FIRST = ["Hana", "Yuto", "Mei", "Ren", "Sakura", "Daichi", "Aoi", "Kenji", "Mio", "Sota", "Rin", "Takeshi", "Nao", "Haru", "Yuki", "Kenta", "Asuka", "Shun", "Emi", "Taiga", "Kira", "Masa", "Noa", "Goro"];
const LAST = ["Tanaka", "Sato", "Kurosawa", "Ishikawa", "Mori", "Abe", "Fujimoto", "Okabe", "Shinohara", "Wakamatsu", "Hirasawa", "Kobayashi", "Endo", "Miura", "Tsukishima", "Araki"];`;
  const newNames = `const STAFF_FIRST_NAMES = [
  "Hana","Yuto","Mei","Ren","Sakura","Daichi","Aoi","Kenji","Mio","Sota","Rin","Takeshi","Nao","Haru","Yuki","Kenta","Asuka","Shun","Emi","Taiga","Kira","Masa","Noa","Goro",
  "Akira","Ayame","Chika","Eiji","Fumi","Haruka","Itsuki","Jun","Kaede","Keiko","Koharu","Makoto","Minato","Rei","Riku","Satomi","Toma","Yuna",
  "Minseo","Jiho","Sora","Haejin","Doyun","Yejun","Jiwon","Nari","Hyun","Ara","Seojun","Mina",
  "Anika","Arjun","Dev","Isha","Kavya","Mira","Naveen","Priya","Ravi","Sana","Tara","Vikram","Zoya",
  "Amina","Amir","Dalia","Farah","Idris","Ilyas","Layla","Nadia","Omar","Rami","Samira","Yara",
  "Adaeze","Amara","Ayodele","Chidi","Eshe","Kofi","Lindiwe","Mandla","Nia","Sade","Tariq","Zuri",
  "Alejandra","Camila","Diego","Elena","Javier","Lucia","Mateo","Rafa","Sofia","Valentina","Ximena",
  "Astrid","Elias","Freja","Ingrid","Jonas","Leona","Luca","Mara","Niko","Petra","Soren","Talia","Theo","Vera",
  "Ari","Casey","Drew","Eden","Ellis","Jamie","Jordan","Morgan","Quinn","Riley","Robin","Rowan","Sage","Taylor"
];
const STAFF_LAST_NAMES = [
  "Tanaka","Sato","Kurosawa","Ishikawa","Mori","Abe","Fujimoto","Okabe","Shinohara","Wakamatsu","Hirasawa","Kobayashi","Endo","Miura","Tsukishima","Araki",
  "Nakamura","Hayashi","Kondo","Maeda","Nakajima","Ogawa","Sasaki","Ueda","Yamada","Yamamoto",
  "Kim","Park","Choi","Han","Kang","Lim","Seo","Yoon",
  "Basu","Desai","Kapoor","Mehta","Nair","Patel","Rao","Shah","Singh",
  "Aziz","Darzi","Haddad","Karim","Khalil","Mansour","Nassar","Rahman","Saleh",
  "Adebayo","Diallo","Mensah","Ndlovu","Okafor","Osei","Tembo","Traore",
  "Alvarez","Castillo","Cruz","Delgado","Garcia","Herrera","Morales","Navarro","Reyes","Santos",
  "Andersen","Berg","Dubois","Fischer","Kovac","Lindholm","Mercer","Moreau","Novak","Rossi","Schmidt","Silva","Varga","Voss",
  "Bell","Brooks","Chen","Cole","Finch","Grey","Hale","Morgan","Reed","Wren"
];

export function randomStaffName(rng: () => number = Math.random): string {
  return \`${"${STAFF_FIRST_NAMES[Math.floor(rng() * STAFF_FIRST_NAMES.length)]} ${STAFF_LAST_NAMES[Math.floor(rng() * STAFF_LAST_NAMES.length)]}"}\`;
}`;
  s = mustReplace(s, oldNames, newNames, "expanded staff names");
  s = mustReplace(s,
`    name: \`${"${FIRST[Math.floor(Math.random() * FIRST.length)]} ${LAST[Math.floor(Math.random() * LAST.length)]}"}\`,`,
`    name: randomStaffName(),`, "candidate name helper");

  s = mustReplace(s,
`export const STAFF_EFFECTIVE_SKILL_CAP = 240;`,
`export const STAFF_EFFECTIVE_SKILL_CAP = 300;`, "effective skill cap");
  s = mustReplace(s,
` * still improves the employee, but with logarithmic mastery returns so a
 * 999-stat legend is roughly 2.4x the old maximum rather than 10x.
 */
export function effectiveStaffSkill(raw: number): number {
  const value = Math.max(0, Math.min(STAFF_STAT_CAP, raw));
  if (value <= 99) return value;
  return Math.min(STAFF_EFFECTIVE_SKILL_CAP, 99 + 60 * Math.log1p((value - 99) / 100));
}`,
` * still improves the employee, with diminishing mastery returns. The curve
 * is intentionally stronger than the legacy one so long-term stat growth and
 * hidden Potential remain strategically meaningful without changing the
 * original 0..99 early-game balance.
 */
export function effectiveStaffSkill(raw: number): number {
  const value = Math.max(0, Math.min(STAFF_STAT_CAP, raw));
  if (value <= 99) return value;
  return Math.min(STAFF_EFFECTIVE_SKILL_CAP, 99 + 72 * Math.log1p((value - 99) / 90));
}`, "stronger mastery curve");
  write(p, s);
}

// ------------------------------------------------------------- careers.ts
{
  const p = "src/engine/careers.ts";
  let s = read(p);
  s = mustReplace(s,
`  type Staff,
  type StaffRole,`,
`  type Staff,
  type StaffLevelUpRecord,
  type StaffRole,`, "career levelup type import");

  s = mustReplaceRegex(s,
/\/\*\* add XP; every level gained trains \+2 main \/ \+1 off stats \*\/[\s\S]*?return \{ staff: out, levelsGained: after - before \};\n\}/,
`/** Add XP and resolve every crossed level through the employee's stable hidden
 * Potential. Growth is deterministic for staff-id + level so save/reload can
 * never reroll a good or bad level. */
export function gainXp(s: Staff, amount: number): { staff: Staff; levelsGained: number; levelUps: StaffLevelUpRecord[] } {
  const xp = (s.xp ?? 0) + Math.max(0, Math.round(amount));
  const before = levelFromXp(s.xp ?? 0);
  const after = levelFromXp(xp);
  let out: Staff = { ...s, potential: potentialOf(s), xp, level: after };
  const levelUps: StaffLevelUpRecord[] = [];
  const queued = [...(s.pendingLevelUps ?? [])];
  for (let level = before + 1; level <= after; level += 1) {
    const oldStats = { story: out.story, art: out.art, sound: out.sound };
    const gains = growthForLevel(out, level);
    const nextStats = {
      story: Math.min(STAFF_STAT_CAP, oldStats.story + gains.story),
      art: Math.min(STAFF_STAT_CAP, oldStats.art + gains.art),
      sound: Math.min(STAFF_STAT_CAP, oldStats.sound + gains.sound),
    };
    const record: StaffLevelUpRecord = {
      id: \`${"${out.id}:lv${level}"}\`,
      beforeLevel: level - 1,
      afterLevel: level,
      title: levelTitle(level),
      before: oldStats,
      after: nextStats,
      gains: {
        story: nextStats.story - oldStats.story,
        art: nextStats.art - oldStats.art,
        sound: nextStats.sound - oldStats.sound,
      },
    };
    levelUps.push(record);
    queued.push(record);
    out = { ...out, ...nextStats, pendingLevelUps: queued };
  }
  return { staff: out, levelsGained: after - before, levelUps };
}`, "potential gainXp");

  const idHashBlock = `function idHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}`;
  const growthBlock = `${idHashBlock}

/** Hidden development ceiling. Distribution is deliberately broad: about
 * 15% low, 30% limited/steady, 35% normal-high, 16% exceptional and 4% elite. */
export function potentialForId(id: string): number {
  const h = idHash(id + "|potential");
  const roll = (h % 10_000) / 10_000;
  const detail = idHash(id + "|potential-detail");
  if (roll < 0.15) return 1 + (detail % 20);
  if (roll < 0.45) return 21 + (detail % 25);
  if (roll < 0.80) return 46 + (detail % 25);
  if (roll < 0.96) return 71 + (detail % 20);
  return 91 + (detail % 10);
}

export function potentialOf(s: Staff): number {
  return Math.max(1, Math.min(100, Math.round(s.potential ?? potentialForId(s.id))));
}

function levelRng(id: string, level: number): () => number {
  let x = (idHash(\`${"${id}|growth|${level}"}\`) || 0x6d2b79f5) >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4_294_967_296;
  };
}

/** Exact stat roll for one level. The total-point gap between weak and elite
 * Potential is intentionally dramatic; role only biases WHERE the points land. */
export function growthForLevel(s: Staff, newLevel: number): { story: number; art: number; sound: number } {
  const potential = potentialOf(s);
  const rng = levelRng(s.id, newLevel);
  let lo = 0, hi = 2;
  if (potential > 20 && potential <= 45) [lo, hi] = [2, 4];
  else if (potential > 45 && potential <= 70) [lo, hi] = [4, 7];
  else if (potential > 70 && potential <= 90) [lo, hi] = [6, 10];
  else if (potential > 90) [lo, hi] = [9, 15];
  let total = lo + Math.floor(rng() * (hi - lo + 1));
  if (potential >= 91 && rng() < 0.12) total += 1 + Math.floor(rng() * 4);
  else if (potential >= 71 && rng() < 0.08) total += 1 + Math.floor(rng() * 3);

  const gains = { story: 0, art: 0, sound: 0 };
  const main = ROLE_POINT[s.role];
  const points: PointType[] = ["story", "art", "sound"];
  for (let i = 0; i < total; i += 1) {
    const weights = points.map((point) => point === main ? 5 : 1.5);
    let pick = rng() * weights.reduce((a, b) => a + b, 0);
    let chosen: PointType = main;
    for (let j = 0; j < points.length; j += 1) {
      pick -= weights[j];
      if (pick <= 0) { chosen = points[j]; break; }
    }
    gains[chosen] += 1;
  }
  return gains;
}`;
  s = mustReplace(s, idHashBlock, growthBlock, "potential growth helpers");

  s = mustReplaceRegex(s,
/  const retroLevels = Math\.max\(0, inferredLevel - savedLevel\);[\s\S]*?  return \{\n    \.\.\.s,\n    level: inferredLevel,\n    xp,\n    story: grow\("story"\),\n    art: grow\("art"\),\n    sound: grow\("sound"\),/,
`  const retroLevels = Math.max(0, inferredLevel - savedLevel);
  const potential = potentialOf(s);
  let retro: Staff = { ...s, potential };
  for (let level = savedLevel + 1; level <= inferredLevel; level += 1) {
    const gain = growthForLevel(retro, level);
    retro = {
      ...retro,
      story: Math.min(STAFF_STAT_CAP, retro.story + gain.story),
      art: Math.min(STAFF_STAT_CAP, retro.art + gain.art),
      sound: Math.min(STAFF_STAT_CAP, retro.sound + gain.sound),
    };
  }
  return {
    ...retro,
    level: inferredLevel,
    xp,
    potential,
    pendingLevelUps: Array.isArray(s.pendingLevelUps) ? s.pendingLevelUps : [],
    story: retro.story,
    art: retro.art,
    sound: retro.sound,`, "career migration growth");

  s = mustReplace(s,
`/** the canonical stat growth gainXp applies to this person per level */
export function intensiveGainFor(s: Staff): { story: number; art: number; sound: number } {
  const main = ROLE_POINT[s.role];
  return { story: main === "story" ? 2 : 1, art: main === "art" ? 2 : 1, sound: main === "sound" ? 2 : 1 };
}`,
`/** Preview the exact stable roll the normal XP path will use next level. */
export function intensiveGainFor(s: Staff): { story: number; art: number; sound: number } {
  return growthForLevel(s, Math.min(MAX_LEVEL, s.level + 1));
}`, "intensive growth preview");
  write(p, s);
}

// ------------------------------------------------ StaffLevelUpModal.tsx
write("src/components/StaffLevelUpModal.tsx", `import { useEffect, useMemo, useState } from "react";
import { Check, FastForward, Sparkles } from "lucide-react";
import { Btn } from "../fx/fx";
import { POINT_COLOR, ROLE_LABEL, workerLook, type PointType } from "../engine/data";
import type { RunState } from "../engine/state";
import Portrait from "./Portrait";

export default function StaffLevelUpModal({ run, setRun }: { run: RunState; setRun: (fn: (r: RunState) => RunState) => void }) {
  const staff = useMemo(() => run.staff.find((s) => (s.pendingLevelUps?.length ?? 0) > 0) ?? null, [run.staff]);
  const record = staff?.pendingLevelUps?.[0] ?? null;
  const [step, setStep] = useState(0);
  useEffect(() => { setStep(0); }, [record?.id]);
  useEffect(() => {
    if (!record || step >= 5) return;
    const timer = window.setTimeout(() => setStep((x) => Math.min(5, x + 1)), 620);
    return () => window.clearTimeout(timer);
  }, [record?.id, step]);
  if (!staff || !record) return null;

  const clearOne = () => setRun((r) => ({ ...r, staff: r.staff.map((s) => s.id === staff.id ? { ...s, pendingLevelUps: (s.pendingLevelUps ?? []).filter((x) => x.id !== record.id) } : s) }));
  const clearAll = () => setRun((r) => ({ ...r, staff: r.staff.map((s) => ({ ...s, pendingLevelUps: [] })) }));
  const points: PointType[] = ["story", "art", "sound"];
  const total = record.gains.story + record.gains.art + record.gains.sound;

  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-abyss/90 p-4 backdrop-blur-lg">
    <button onClick={() => setStep(5)} className="btn-press absolute right-4 top-4 rounded-lg border border-line bg-panel px-3 py-1.5 text-[10px] font-extrabold tracking-widest text-paper/70"><FastForward size={12} className="inline" /> SKIP ANIMATION</button>
    <div className="anim-pop ink-card w-full max-w-md border-gold/50 p-5 text-center shadow-2xl">
      <Sparkles size={26} className="mx-auto text-gold" />
      <div className="mt-2 text-[10px] font-black tracking-[0.35em] text-gold">STAFF LEVEL UP</div>
      <Portrait img={workerLook(staff).portrait} name={staff.name} alt={staff.name} className="mx-auto mt-3 h-24 w-24 rounded-2xl border border-gold/40 object-cover" />
      <div className="mt-2 font-display text-2xl font-extrabold">{staff.name}</div>
      <div className="text-[10px] text-paper/50">{ROLE_LABEL[staff.role]} · hidden development potential</div>
      <div className="mt-4 min-h-56 space-y-2">
        {step >= 1 && <div className="anim-pop font-display text-3xl font-black text-gold">Lv {record.beforeLevel} → Lv {record.afterLevel}</div>}
        {step >= 2 && <div className="anim-pop text-sm font-extrabold tracking-wider text-paper">{record.title.toUpperCase()}</div>}
        {points.map((point, index) => step >= index + 3 ? <div key={point} className="anim-pop grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-line bg-panel2/70 px-3 py-2 text-left">
          <b className="text-xs tracking-wider" style={{ color: POINT_COLOR[point] }}>{point.toUpperCase()}</b>
          <span className="font-display text-lg font-extrabold text-paper/70">{record.before[point]} → {record.after[point]}</span>
          <span className={`min-w-12 text-right font-display text-xl font-black ${record.gains[point] > 0 ? "text-mint" : "text-paper/30"}`}>+{record.gains[point]}</span>
        </div> : null)}
        {step >= 5 && <div className="anim-pop mt-2 rounded-xl border border-mint/30 bg-mint/5 p-2 text-xs text-mint"><Check size={13} className="mr-1 inline" /> Total growth +{total}</div>}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <Btn big variant="primary" disabled={step < 5} onClick={clearOne}>CONTINUE</Btn>
        <Btn variant="ghost" onClick={clearAll}>SKIP ALL</Btn>
      </div>
      <div className="mt-2 text-[9px] text-paper/40">Potential stays hidden. Watch long-term growth to discover who can become exceptional.</div>
    </div>
  </div>;
}
`);

// -------------------------------------------------------------- Crew.tsx
{
  const p = "src/components/Crew.tsx";
  let s = read(p);
  s = mustReplace(s, `  Crown,\n`, `  Crown,\n  Dices,\n`, "crew dice icon");
  s = mustReplace(s, `  staffMain,\n  workerLook,`, `  staffMain,\n  randomStaffName,\n  workerLook,`, "crew random name import");
  s = s.replace(`  intensiveGainFor,\n`, "");
  s = mustReplaceRegex(s, /\/\* ------------------------------------------- intensive development reveal[\s\S]*?\nfunction AbilitySheet/, `function AbilitySheet`, "remove duplicate intensive reveal");

  s = mustReplaceRegex(s, /function CandidateSheet\([\s\S]*?\n\}\n\n\/\* ---------------------------------------------------------- staff card \*\//, `function CandidateSheet({ candidate, canHire, onHire, onClose }: { candidate: Staff | null; canHire: boolean; onHire: (s: Staff) => void; onClose: () => void }) {
  const [hireName, setHireName] = useState(candidate?.name ?? "");
  useEffect(() => { setHireName(candidate?.name ?? ""); }, [candidate?.id]);
  if (!candidate) return null;
  const spec = specDef(candidate.spec);
  const rows = GENRES.map((g) => {
    const familiarity = genreFamiliarity(candidate, g.id);
    const shipped = genreShows(candidate, g.id);
    const mult = genreExperienceMultiplier(familiarity);
    const preferred = candidate.favGenre === g.id ? "FAVOURITE" : spec?.genres?.includes(g.id) ? "SPECIALISM" : "";
    return { g, familiarity, shipped, mult, preferred };
  }).sort((a, b) => b.mult - a.mult || a.g.label.localeCompare(b.g.label));
  const cleanName = hireName.trim().slice(0, 40);
  return (
    <div className="fixed inset-0 z-[97] flex items-end justify-center bg-abyss/80 p-3 backdrop-blur-md sm:items-center" onClick={onClose}>
      <div className="nice-scroll anim-pop max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-cyanx/40 bg-panel p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <Portrait img={workerLook(candidate).portrait} name={candidate.name} alt={candidate.name} className="h-20 w-20 shrink-0 rounded-xl border border-line object-cover" />
          <div className="min-w-0 flex-1"><div className="text-[9px] font-extrabold tracking-[0.25em] text-cyanx">CANDIDATE DOSSIER</div><div className="font-display text-xl font-extrabold">{candidate.name}</div><div className="text-[10px] text-paper/55">{ROLE_LABEL[candidate.role]} · Lv{candidate.level} {levelTitle(candidate.level)}</div><div className="mt-1 text-[10px] text-gold">Sign {formatGBP(candidate.cost)} · {formatGBP(candidate.salary)}/wk</div></div>
          <button onClick={onClose} className="btn-press p-1 text-paper/40"><X size={17}/></button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">{(["story","art","sound"] as PointType[]).map((t) => <div key={t} className="rounded-lg border border-line bg-panel2/70 p-2 text-center"><div className="text-[8px] font-bold text-paper/45">{t.toUpperCase()}</div><div className="font-display text-xl font-extrabold" style={{color:POINT_COLOR[t]}}>{candidate[t]}</div></div>)}</div>
        <div className="mt-3 rounded-xl border border-line bg-panel2/60 p-3"><div className="text-[9px] font-extrabold tracking-widest text-viol">MECHANICAL QUALITIES</div>{spec && <div className="mt-1 text-[10px]"><b className="text-viol">★ {spec.name}:</b> <span className="text-paper/65">{specLabel(spec)}</span></div>}{(candidate.traits ?? []).map((id) => { const t=traitDef(id); if(!t) return null; return <div key={id} className="mt-1 text-[10px]"><b className={t.good?"text-mint":"text-neon2"}>{t.name}:</b> <span className="text-paper/65">{t.desc}{id==="fanatic" && candidate.favGenre ? \` · favourite: ${"${GENRES.find((g)=>g.id===candidate.favGenre)?.label ?? candidate.favGenre}"}\` : ""}</span></div>; })}<div className="mt-2 text-[9px] italic text-paper/40">Long-term Potential is hidden. Development rolls reveal who has the highest ceiling.</div></div>
        <div className="mt-3"><div className="text-[9px] font-extrabold tracking-widest text-paper/45">GENRE READINESS · PERSONAL OUTPUT MODIFIER</div><div className="mt-1 grid gap-1.5 sm:grid-cols-2">{rows.map(({g,familiarity,shipped,mult,preferred}) => <div key={g.id} className="flex items-center rounded-lg border border-line bg-panel2/50 px-2 py-1.5 text-[9px]"><span className="font-bold">{g.label}</span>{preferred && <span className="ml-1 text-[7px] font-extrabold text-viol">{preferred}</span>}<span className={cn("ml-auto font-extrabold",mult<1?"text-neon":mult>1?"text-mint":"text-paper/70")}>{genreExperienceLabel(familiarity)} ×{mult.toFixed(2)}</span><span className="ml-1 text-paper/30">· {shipped} shipped</span></div>)}</div></div>
        <div className="mt-3 rounded-xl border border-cyanx/35 bg-cyanx/5 p-3"><div className="text-[9px] font-extrabold tracking-widest text-cyanx">SIGNING NAME</div><div className="mt-1 flex gap-2"><input value={hireName} onChange={(e)=>setHireName(e.target.value.slice(0,40))} className="ink-input min-w-0 flex-1 px-3 py-2 text-sm font-bold" aria-label="Staff name"/><Btn variant="ghost" onClick={()=>setHireName(randomStaffName())} aria-label="Randomise staff name"><Dices size={15}/></Btn></div><div className="mt-1 text-[8px] text-paper/40">Rename them now or keep the generated name. This does not change their abilities, portrait or hidden Potential.</div></div>
        <Btn big variant="cyan" className="mt-4 w-full" disabled={!canHire || !cleanName} onClick={() => onHire({ ...candidate, name: cleanName })}>{canHire ? \`SIGN ${"${cleanName || candidate.name}"} · ${"${formatGBP(candidate.cost)}"}\` : "CANNOT HIRE"}</Btn>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- staff card */`, "candidate rename sheet");

  s = mustReplace(s,
`function StaffCard({
  s,
  run,
  setRun,
  onIntense,
}: {
  s: Staff;
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
  onIntense: (before: Staff, after: Staff) => void;
}) {`,
`function StaffCard({ s, run, setRun }: { s: Staff; run: RunState; setRun: (fn: (r: RunState) => RunState) => void }) {`, "staff card signature");
  s = mustReplace(s, `                    onIntense(s, after);\n`, ``, "remove local intensive callback");
  s = mustReplace(s,
`                    : "Escalating RD cost · +2 main / +1 off stats via the normal XP path. Timed Training stays separate."}`,
`                    : "Escalating RD cost · reaches exactly the next level, then rolls hidden-Potential growth through the normal XP path."}`, "intensive copy");
  s = mustReplace(s, `  const [intense, setIntense] = useState<null | { before: Staff; after: Staff }>(null);\n`, ``, "remove intense state");
  s = mustReplace(s,
`              <StaffCard key={s.id} s={s} run={run} setRun={setRun} onIntense={(before, after) => setIntense({ before, after })} />`,
`              <StaffCard key={s.id} s={s} run={run} setRun={setRun} />`, "staff card use");
  s = mustReplace(s,
`                      onClick={(e) => { e.stopPropagation(); hire(c); }}`, 
`                      onClick={(e) => { e.stopPropagation(); setCandidate(c); }}`, "hire opens rename prompt");
  s = mustReplace(s,
`      <CandidateSheet candidate={candidate} canHire={!!candidate && run.cash >= candidate.cost && run.staff.length < maxStaff} onHire={(c) => { hire(c); setCandidate(null); }} onClose={() => setCandidate(null)} />
      {intense && <IntensiveReveal before={intense.before} after={intense.after} onClose={() => setIntense(null)} />`,
`      <CandidateSheet candidate={candidate} canHire={!!candidate && run.cash >= candidate.cost && run.staff.length < maxStaff} onHire={(c) => { hire(c); setCandidate(null); }} onClose={() => setCandidate(null)} />`, "candidate footer");
  write(p, s);
}

// ------------------------------------------------------------- Create.tsx
{
  const p = "src/components/Create.tsx";
  let s = read(p);
  s = mustReplace(s, `  ARCS,\n`, `  ARCS,\n  ARC_COMBOS,\n  ARC_RESEARCH_COMBOS,\n`, "arc research imports");
  s = mustReplace(s,
`          {step === 5 && (
            <div className="space-y-4 anim-up">
              <Section title={\`PLAN THE SEASON — PICK 3–${"${arcLimit}"} ARCS (${"${d.arcs.length}"}/${"${arcLimit}"})\`}>
                {/* timeline */}`,
`          {step === 5 && (
            <div className="space-y-4 anim-up">
              <div className="rounded-2xl border-2 border-gold/50 bg-gradient-to-br from-gold/10 via-panel to-cyanx/5 p-3 shadow-xl">
                <div className="flex flex-wrap items-center gap-2"><div className="font-display text-base font-black text-gold">STORY INTELLIGENCE</div><span className="rounded-full border border-gold/40 px-2 py-0.5 text-[8px] font-extrabold text-gold">RESEARCH + FIELD EXPERIENCE</span></div>
                <div className="mt-1 text-[10px] text-paper/55">Everything your studio has already proven about story structure is surfaced before you choose an arc.</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={cn("rounded-lg border px-2 py-1 text-[9px] font-extrabold", run.research.includes("narrative_analytics") ? "border-gold/50 bg-gold/10 text-gold" : "border-line text-paper/35")}>{run.research.includes("narrative_analytics") ? "✓ NARRATIVE ANALYTICS" : "NARRATIVE ANALYTICS NOT RESEARCHED"}</span>
                  <span className={cn("rounded-lg border px-2 py-1 text-[9px] font-extrabold", run.research.includes("genre_studies") ? "border-cyanx/50 bg-cyanx/10 text-cyanx" : "border-line text-paper/35")}>{run.research.includes("genre_studies") ? "✓ GENRE STUDIES" : "GENRE STUDIES NOT RESEARCHED"}</span>
                  <span className="rounded-lg border border-line px-2 py-1 text-[9px] text-paper/55">{run.arcCombos.length} structures known</span>
                  <span className="rounded-lg border border-line px-2 py-1 text-[9px] text-paper/55">{Object.keys(run.arcGenreKnowledge ?? {}).length} arc/genre relationships known</span>
                </div>
                {run.research.includes("narrative_analytics") && <div className="mt-2"><div className="text-[8px] font-black tracking-[0.18em] text-paper/40">RESEARCHED STRUCTURES</div><div className="mt-1 flex flex-wrap gap-1">{ARC_RESEARCH_COMBOS.map((id) => ARC_COMBOS.find((c)=>c.id===id)).filter((c): c is NonNullable<typeof c> => !!c && run.arcCombos.includes(c.id)).map((c)=>{const rating=arcComboRating(c);return <span key={c.id} className={cn("rounded-lg border border-line bg-panel2/70 px-2 py-1 text-[9px] font-extrabold",rating.cls)}>{rating.label} · {c.name}</span>;})}</div></div>}
                {d.genres.length > 0 && <div className="mt-2 text-[9px] text-paper/50">Current genres: {d.genres.map((genre)=>{const label=GENRES.find((g)=>g.id===genre)?.label??genre;const known=Object.keys(run.arcGenreKnowledge??{}).filter((key)=>key.endsWith(\`|${"${genre}"}\`)).length;return \`${"${label}: ${known} known fits"}\`;}).join(" · ")}</div>}
              </div>
              <Section title={\`PLAN THE SEASON — PICK 3–${"${arcLimit}"} ARCS (${"${d.arcs.length}"}/${"${arcLimit}"})\`}>
                {/* timeline */}`, "story intelligence panel");
  write(p, s);
}

// --------------------------------------------------------------- ip.ts
{
  const p = "src/engine/ip.ts";
  let s = read(p);
  s = mustReplace(s,
`export interface IPMarketState { nextAuctionWeek:number; auctions:IPAuction[]; owned:Record<string,IPContract>; rivalOwned:Record<string,string>; history:string[]; studioArcs:string[]; legalReputation:number; pendingPromptId:string|null; annualAuctionVersion:1; }`,
`export interface IPMarketState { nextAuctionWeek:number; auctions:IPAuction[]; owned:Record<string,IPContract>; rivalOwned:Record<string,string>; history:string[]; studioArcs:string[]; legalReputation:number; pendingPromptId:string|null; annualAuctionVersion:1; lastCommissionedAuctionYear:number; }`, "manual auction state");
  s = mustReplace(s,
`export const initIPMarket = (week=0,rng=Math.random):IPMarketState => ({nextAuctionWeek:scheduleNextAuctionWeek(week,rng),auctions:[],owned:{},rivalOwned:{},history:[],studioArcs:[],legalReputation:0,pendingPromptId:null,annualAuctionVersion:1});`,
`export const initIPMarket = (week=0,rng=Math.random):IPMarketState => ({nextAuctionWeek:scheduleNextAuctionWeek(week,rng),auctions:[],owned:{},rivalOwned:{},history:[],studioArcs:[],legalReputation:0,pendingPromptId:null,annualAuctionVersion:1,lastCommissionedAuctionYear:-1});`, "manual auction init");
  s = mustReplace(s,
`return {...fresh,...r,nextAuctionWeek:annual&&typeof r.nextAuctionWeek==="number"?r.nextAuctionWeek:fresh.nextAuctionWeek,auctions,owned,rivalOwned:r.rivalOwned&&typeof r.rivalOwned==="object"?r.rivalOwned:{},history:Array.isArray(r.history)?r.history:[],studioArcs:Array.isArray(r.studioArcs)?r.studioArcs:[],pendingPromptId:typeof r.pendingPromptId==="string"?r.pendingPromptId:null,annualAuctionVersion:1};`,
`return {...fresh,...r,nextAuctionWeek:annual&&typeof r.nextAuctionWeek==="number"?r.nextAuctionWeek:fresh.nextAuctionWeek,auctions,owned,rivalOwned:r.rivalOwned&&typeof r.rivalOwned==="object"?r.rivalOwned:{},history:Array.isArray(r.history)?r.history:[],studioArcs:Array.isArray(r.studioArcs)?r.studioArcs:[],pendingPromptId:typeof r.pendingPromptId==="string"?r.pendingPromptId:null,annualAuctionVersion:1,lastCommissionedAuctionYear:typeof r.lastCommissionedAuctionYear==="number"?r.lastCommissionedAuctionYear:-1};`, "manual auction migration");
  const generateEnd = `  const min=type==="distressed"?Math.round(ip.minimumBid*.72/5000)*5000:ip.minimumBid; return {id:\`auc_${"${run.week}"}_${"${ip.id}"}\`,ipId:ip.id,type,opensWeek:run.week,closesWeek:run.week+1,currentBid:min,leadingStudioId:null,playerMaxBid:0,bids:[],appraisalLevel:0,resolved:false,winnerId:null,winningBid:0,playerSkipped:false};
}`;
  const manual = `${generateEnd}

export function commissionedAuctionFee(run:{officeLevel:number;showsMade:number;awards:number}):number {
  const base=[750_000,1_500_000,2_500_000,4_000_000,6_000_000][Math.max(0,Math.min(4,run.officeLevel))]??6_000_000;
  const prestige=Math.min(2_000_000,run.showsMade*35_000+run.awards*90_000);
  return Math.round((base+prestige)/50_000)*50_000;
}
export function commissionedAuctionBlock(run:{week:number;cash:number;officeLevel:number;showsMade:number;awards:number;ipMarket:IPMarketState}):string|null {
  if(run.ipMarket.pendingPromptId)return "Resolve the current rights opportunity first";
  if(run.ipMarket.auctions.some(a=>!a.resolved))return "Another rights auction is already live";
  const year=Math.floor(run.week/WEEKS_PER_YEAR);
  if(run.ipMarket.lastCommissionedAuctionYear===year)return "You already commissioned an auction this industry year";
  const fee=commissionedAuctionFee(run);
  if(run.cash<fee)return \`Needs £${"${fee.toLocaleString(\"en-GB\")}"}\`;
  return null;
}
export function commissionRightsAuction(run:{week:number;cash:number;fans:number;awards:number;bestScore:number;showsMade:number;officeLevel:number;ipMarket:IPMarketState},rng=Math.random):{market:IPMarketState;fee:number;auction:IPAuction}|null {
  if(commissionedAuctionBlock(run))return null;
  const auction=generateAuction(run,rng); if(!auction)return null;
  const fee=commissionedAuctionFee(run); const year=Math.floor(run.week/WEEKS_PER_YEAR);
  const nextYear=(year+1)*WEEKS_PER_YEAR;
  return {fee,auction,market:{...run.ipMarket,auctions:[...run.ipMarket.auctions,auction],pendingPromptId:auction.id,lastCommissionedAuctionYear:year,nextAuctionWeek:Math.max(run.ipMarket.nextAuctionWeek,scheduleNextAuctionWeek(nextYear,rng)),history:[...run.ipMarket.history,\`Commissioned rights auction: ${"${ipById(auction.ipId)?.title??auction.ipId}"}.\`].slice(-100)}};
}`;
  s = mustReplace(s, generateEnd, manual, "commissioned auction functions");
  write(p, s);
}

// ----------------------------------------------------------- IPMarket.tsx
{
  const p = "src/components/IPMarket.tsx";
  let s = read(p);
  s = mustReplace(s,
`import { AUCTION_TYPE_LABEL, SOURCE_LABEL, appraiseAuction, genreLabel, ipById, negotiateRights } from "../engine/ip";`,
`import { AUCTION_TYPE_LABEL, SOURCE_LABEL, appraiseAuction, commissionRightsAuction, commissionedAuctionBlock, commissionedAuctionFee, genreLabel, ipById, negotiateRights } from "../engine/ip";`, "ip market auction imports");
  s = mustReplace(s,
`  const [loaded, setLoaded] = useState(false);`,
`  const [loaded, setLoaded] = useState(false);`, "noop marker");
  s = mustReplace(s,
`  const coProdProjects = run.projects.filter((p) => ["concept", "preprod", "animation", "sound"].includes(p.stage));`,
`  const coProdProjects = run.projects.filter((p) => ["concept", "preprod", "animation", "sound"].includes(p.stage));
  const [confirmCommission, setConfirmCommission] = useState(false);
  const manualFee = commissionedAuctionFee(run);
  const manualBlock = commissionedAuctionBlock(run);`, "manual auction ui state");
  s = mustReplace(s,
`    <section>
      <div className="mb-2 flex items-center gap-2 text-xs font-black tracking-widest text-gold"><Gavel size={14} /> LIVE AUCTIONS</div>`,
`    <section className="rounded-xl border border-gold/45 bg-gold/5 p-3">
      <div className="flex items-center gap-2 text-xs font-black tracking-widest text-gold"><Gavel size={14}/> COMMISSION A RIGHTS AUCTION</div>
      <div className="mt-1 text-[10px] text-paper/55">Pay brokers to bring a fresh property to market immediately. The fee is non-refundable: you still have to bid and a rival can beat you.</div>
      <div className="mt-2 flex flex-wrap items-center gap-2"><b className="text-sm text-gold">{formatGBPShort(manualFee)} broker fee</b>{manualBlock && <span className="text-[9px] text-neon">{manualBlock}</span>}</div>
      {!confirmCommission ? <Btn variant="gold" className="mt-2" disabled={!!manualBlock} onClick={()=>setConfirmCommission(true)}><Gavel size={12}/> TRIGGER AUCTION</Btn> : <div className="mt-2 flex gap-2"><Btn variant="gold" disabled={!!manualBlock} onClick={()=>{setRun((r)=>{const out=commissionRightsAuction(r);if(!out)return r;return {...r,cash:r.cash-out.fee,ipMarket:out.market,strategicSpend:[...r.strategicSpend,{id:\`auction_broker_${"${r.week}"}\`,label:"Commission rights auction",amount:out.fee,week:r.week}],notices:[...r.notices,\`Rights brokers paid £${"${out.fee.toLocaleString(\"en-GB\")}"}; a new auction is opening.\`]};});setConfirmCommission(false);}}>CONFIRM · PAY {formatGBPShort(manualFee)}</Btn><Btn variant="ghost" onClick={()=>setConfirmCommission(false)}>CANCEL</Btn></div>}
    </section>

    <section>
      <div className="mb-2 flex items-center gap-2 text-xs font-black tracking-widest text-gold"><Gavel size={14} /> LIVE AUCTIONS</div>`, "manual auction section");
  write(p, s);
}

// ------------------------------------------------------------ franchise.ts
{
  const p = "src/engine/franchise.ts";
  let s = read(p);
  s = mustReplace(s,
`  /** legacy flag kept for older saves/UI */
  alive: boolean;`,
`  /** legacy flag kept for older saves/UI */
  alive: boolean;
  /** irreversible sale of the original IP to an outside buyer */
  soldTo?: { id: string; name: string; kind: "network" | "rival"; week: number; price: number };`, "franchise sale field");
  s = mustReplace(s,
`): string | null {
  if (fr.lastScore < SEQUEL_SCORE_THRESHOLD`,
`): string | null {
  if (fr.soldTo) return \`IP sold to ${"${fr.soldTo.name}"} — your studio no longer controls new productions\`;
  if (fr.lastScore < SEQUEL_SCORE_THRESHOLD`, "sold continuation block");
  s = mustReplace(s,
`export function merchBlock(fr: Franchise, product: MerchProduct, week: number, cash: number, research: readonly string[] = ["merch"]): string | null {
  if (!research.includes(MERCH_CAPABILITY_RESEARCH))`,
`export function merchBlock(fr: Franchise, product: MerchProduct, week: number, cash: number, research: readonly string[] = ["merch"]): string | null {
  if (fr.soldTo) return \`IP sold to ${"${fr.soldTo.name}"} — merchandising rights left with the buyer\`;
  if (!research.includes(MERCH_CAPABILITY_RESEARCH))`, "sold merch block");
  write(p, s);
}

// --------------------------------------------------------------- state.ts
{
  const p = "src/engine/state.ts";
  let s = read(p);
  s = mustReplace(s, `  merchReturn,\n`, `  merchReturn,\n  merchValueOf,\n`, "merch value import");

  const marker = `  return { run, result };
}

/* =================================================================== */
/*                         FACILITY OPS                                */`;
  const business = `  return { run, result };
}

export interface ShowSaleOffer {
  id: string;
  buyerType: "network" | "rival";
  buyerId: string;
  buyerName: string;
  cash: number;
  creatorFans: number;
  awardRisk: boolean;
}
function stableDealNumber(key:string):number { let h=2166136261; for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619);} return (h>>>0)/4_294_967_295; }
/** Deterministic buyout offers: reopening the release screen cannot reroll terms. */
export function showSaleOffers(r:RunState,projectId:string):ShowSaleOffer[] {
  const p=r.projects.find(x=>x.id===projectId); if(!p||p.stage!=="ready"||p.draft.licensedIpId)return [];
  const points=p.points.story+p.points.art+p.points.sound;
  const fr=p.draft.franchiseKey?r.franchises[p.draft.franchiseKey]:undefined;
  const value=Math.max(draftCost(p.draft)*1.05,p.spent*.95+points*2_800+p.hype*2_300+(fr?.popularity??0)*4_000+r.bestScore*4_000);
  const networks=[{id:"network:kousei",name:"Kousei Broadcast Network"},{id:"network:streamline",name:"Streamline Media"}];
  const offers:ShowSaleOffer[]=networks.map((buyer,i)=>({id:\`sale:${"${projectId}"}:${"${buyer.id}"}\`,buyerType:"network",buyerId:buyer.id,buyerName:buyer.name,cash:Math.round(value*(.60+stableDealNumber(projectId+buyer.id)*.12)/5000)*5000,creatorFans:Math.max(100,Math.round((p.hype*9+points*2)*(i?0.13:0.10))),awardRisk:false}));
  const rival=[...r.rivalWorld.studios].filter(x=>x.status!=="collapsed").map(st=>({st,fit:st.preferred.filter(g=>p.draft.genres.includes(g)).length})).sort((a,b)=>b.fit-a.fit||b.st.reputation-a.st.reputation)[0];
  if(rival){const mult=.60+rival.fit*.07+stableDealNumber(projectId+rival.st.id)*.13;offers.push({id:\`sale:${"${projectId}"}:rival:${"${rival.st.id}"}\`,buyerType:"rival",buyerId:rival.st.id,buyerName:rival.st.name,cash:Math.round(value*mult/5000)*5000,creatorFans:Math.max(75,Math.round((p.hype*7+points*1.5)*.08)),awardRisk:true});}
  return offers.sort((a,b)=>b.cash-a.cash);
}

/** Sell one completed production while retaining the underlying original IP.
 * Canonical release logic still resolves reviews, staff XP and story knowledge;
 * commercial payouts and awards ownership are then transferred to the buyer. */
export function sellReadyProject(r:RunState,projectId:string,offerId:string):{run:RunState;result:ShowResult;offer:ShowSaleOffer}|null {
  const p=r.projects.find(x=>x.id===projectId); const offer=showSaleOffers(r,projectId).find(x=>x.id===offerId); if(!p||!offer)return null;
  const released=releaseProject(r,projectId,{spent:0,hype:p.hype}); if(!released)return null;
  const key=p.draft.continuation==="spinoff"?p.draft.title:(p.draft.franchiseKey??p.draft.title);
  let franchises=released.run.franchises;
  const fr=franchises[key];
  if(fr){const idx=[...fr.entries].map((e,i)=>({e,i})).reverse().find(x=>x.e.title===p.draft.title)?.i; if(idx!==undefined){const old=fr.entries[idx];const entries=fr.entries.map((e,i)=>i===idx?{...e,revenue:offer.cash,fans:offer.creatorFans}:e);const adjusted={...fr,entries,totalRevenue:Math.max(0,fr.totalRevenue-old.revenue+offer.cash),lifetimeFans:Math.max(0,fr.lifetimeFans-old.fans+offer.creatorFans)};adjusted.merchValue=merchValueOf(adjusted);franchises={...franchises,[key]:adjusted};}}
  let rivalWorld=released.run.rivalWorld;
  if(offer.buyerType==="rival"){
    const craft=playerCraftFor(released.result.total,released.result.points); const year=Math.floor(r.week/48)+1;
    rivalWorld={...rivalWorld,studios:rivalWorld.studios.map(st=>{if(st.id!==offer.buyerId)return st;const revenue=Math.max(offer.cash,Math.round(released.result.revenue*.85));const fans=Math.max(offer.creatorFans*4,Math.round(released.result.fans*.8));const release={title:p.draft.title,studioId:st.id,studio:st.name,score:released.result.total,week:r.week,year,genres:[...p.draft.genres],animeType:p.draft.animeType,revenue,fans,kind:"original" as const,hallOfFame:released.result.hallOfFame,craft,posterId:null,franchiseKey:null};return {...st,revenue:st.revenue+revenue,fans:st.fans+fans,releasesCount:st.releasesCount+1,hits:st.hits+(released.result.total>=27?1:0),masterpieces:st.masterpieces+(released.result.total>=32?1:0),avgScore:Math.round(((st.avgScore*Math.max(1,st.releasesCount))+released.result.total)/(Math.max(1,st.releasesCount)+1)*10)/10,releases:[...st.releases,release].slice(-120)};})};
  }
  const run={...released.run,cash:r.cash+offer.cash,fans:r.fans+offer.creatorFans,totalRevenue:r.totalRevenue+offer.cash,payouts:r.payouts,franchises,rivalWorld,yearShows:released.run.yearShows.filter(n=>n.sourceId!==projectId),notices:[...released.run.notices,\`💼 ${"${offer.buyerName}"} buys the completed release of “${"${p.draft.title}"}” for £${"${offer.cash.toLocaleString(\"en-GB\")}"}. Your studio keeps the underlying IP but receives only ${"${offer.creatorFans.toLocaleString(\"en-GB\")}"} creator fans.${"${offer.awardRisk?\" The rival now owns this release for awards.\":\"\"}"}\`]};
  return {run,result:released.result,offer};
}

export interface FranchiseSaleOffer { buyerType:"network"|"rival"; buyerId:string; buyerName:string; price:number; }
export function franchiseSaleBlock(r:RunState,key:string):string|null {const fr=r.franchises[key];if(!fr)return "Unknown IP";if(fr.soldTo)return `Already sold to ${"${fr.soldTo.name}"}`;if(fr.bestScore<30&&fr.popularity<65&&fr.totalRevenue<1_000_000&&!fr.entries.some(e=>e.hallOfFame))return "Only successful IPs can attract a rights auction (30+/40, popularity 65+, £1m lifetime revenue or Hall of Fame)";return null;}
export function franchiseSaleOffer(r:RunState,key:string):FranchiseSaleOffer|null {const fr=r.franchises[key];if(!fr||franchiseSaleBlock(r,key))return null;const rival=[...r.rivalWorld.studios].filter(s=>s.status!=="collapsed").sort((a,b)=>(b.preferred.filter(g=>fr.genres.includes(g)).length-a.preferred.filter(g=>fr.genres.includes(g)).length)||b.reputation-a.reputation)[0];const rivalWins=!!rival&&stableDealNumber(key+"buyer")>.30;const buyer=rivalWins?{buyerType:"rival" as const,buyerId:rival.id,buyerName:rival.name}:{buyerType:"network" as const,buyerId:"network:zenith",buyerName:"Zenith Media Group"};const base=Math.max(750_000,fr.totalRevenue*.85+fr.lifetimeFans*70+fr.bestScore*45_000+fr.popularity*20_000);const price=Math.round(base*(1.05+stableDealNumber(key+buyer.buyerId)*.55)/25_000)*25_000;return {...buyer,price};}
export function sellFranchiseRights(r:RunState,key:string):RunState|null {const fr=r.franchises[key];const offer=franchiseSaleOffer(r,key);if(!fr||!offer)return null;let rivalWorld=r.rivalWorld;if(offer.buyerType==="rival"){rivalWorld={...rivalWorld,studios:rivalWorld.studios.map(st=>st.id===offer.buyerId?{...st,reputation:Math.min(100,st.reputation+5),franchises:[...st.franchises,{key:\`acquired:${"${key}"}\`,baseTitle:fr.baseTitle,genres:[...fr.genres],animeType:fr.animeType,season:fr.season,popularity:Math.max(45,fr.popularity),bestScore:fr.bestScore,lastScore:fr.lastScore,lastEntryWeek:r.week,entries:fr.entries.length,posterId:null}]}:st)}};
  const sold={...fr,soldTo:{id:offer.buyerId,name:offer.buyerName,kind:offer.buyerType,week:r.week,price:offer.price}};
  return {...r,cash:r.cash+offer.price,totalRevenue:r.totalRevenue+offer.price,franchises:{...r.franchises,[key]:sold},rivalWorld,pendingSequel:r.pendingSequel===key?null:r.pendingSequel,notices:[...r.notices,\`🔨 ${"${fr.baseTitle}"} IP rights sold at auction to ${"${offer.buyerName}"} for £${"${offer.price.toLocaleString(\"en-GB\")}"}. The sale is permanent; your historic entries remain in the library.\`]};
}

/* =================================================================== */
/*                         FACILITY OPS                                */`;
  s = mustReplace(s, marker, business, "show and franchise sale engine");
  write(p, s);
}

// ---------------------------------------------------------------- Ship.tsx
{
  const p = "src/components/Ship.tsx";
  let s = read(p);
  s = mustReplace(s, `import type { RunState } from "../engine/state";`, `import { showSaleOffers, type RunState } from "../engine/state";`, "ship sale import");
  s = mustReplace(s,
`  onAir,
  onBack,
}: {
  run: RunState;
  project: Project;
  onAir: (spent: number, hype: number) => void;
  onBack: () => void;
}) {`,
`  onAir,
  onSell,
  onBack,
}: {
  run: RunState;
  project: Project;
  onAir: (spent: number, hype: number) => void;
  onSell: (offerId: string) => void;
  onBack: () => void;
}) {`, "ship sale prop");
  s = mustReplace(s,
`  const [bought, setBought] = useState<string[]>([]);`,
`  const [bought, setBought] = useState<string[]>([]);
  const [confirmSale, setConfirmSale] = useState<string | null>(null);
  const saleOffers = showSaleOffers(run, project.id);`, "ship offer state");
  s = mustReplace(s,
`        <div className="mt-4 flex gap-2">
          <Btn variant="ghost" onClick={onBack}><ChevronLeft size={16} /> DELAY</Btn>`,
`        {saleOffers.length > 0 && <div className="mt-4 rounded-xl border border-cyanx/35 bg-cyanx/5 p-3"><div className="font-display text-sm font-black text-cyanx">SELL THE COMPLETED SHOW</div><div className="mt-1 text-[9px] text-paper/50">Guaranteed cash now, but much lower creator fan growth and no self-release upside. Selling to a rival lets them claim this production in awards. You keep the underlying original IP.</div><div className="mt-2 space-y-2">{saleOffers.map((offer)=><div key={offer.id} className="rounded-lg border border-line bg-panel2/70 p-2"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><b className="text-xs">{offer.buyerName}</b><div className="text-[8px] text-paper/40">{offer.buyerType==="rival"?"RIVAL STUDIO":"NETWORK / DISTRIBUTOR"} · +{offer.creatorFans.toLocaleString("en-GB")} creator fans {offer.awardRisk?"· THEY OWN AWARD ENTRY":""}</div></div><b className="text-sm text-mint">{formatGBP(offer.cash)}</b></div>{confirmSale===offer.id?<div className="mt-2 flex gap-2"><Btn variant="cyan" onClick={()=>onSell(offer.id)}>CONFIRM SALE</Btn><Btn variant="ghost" onClick={()=>setConfirmSale(null)}>CANCEL</Btn></div>:<Btn variant="ghost" className="mt-1 !px-2 !py-1 text-[9px]" onClick={()=>setConfirmSale(offer.id)}>SELL MASTER</Btn>}</div>)}</div></div>}

        <div className="mt-4 flex gap-2">
          <Btn variant="ghost" onClick={onBack}><ChevronLeft size={16} /> DELAY</Btn>`, "ship sale UI");
  write(p, s);
}

// --------------------------------------------------------------- App.tsx
{
  const p = "src/App.tsx";
  let s = read(p);
  s = mustReplace(s, `  releaseProject,\n`, `  releaseProject,\n  sellReadyProject,\n`, "app sale import");
  s = mustReplace(s, `import { cn } from "./utils/cn";`, `import { cn } from "./utils/cn";\nimport StaffLevelUpModal from "./components/StaffLevelUpModal";`, "level modal import");
  s = mustReplace(s,
`  const continueFromRelease = useCallback(() => {
    setReleased(null);
    setScreen("office");
  }, []);`,
`  const sellShow = useCallback((offerId: string) => {
    if (!run || !shipId) return;
    const out = sellReadyProject(run, shipId, offerId);
    if (!out) return;
    sfx.cash();
    setRun(out.run);
    setShipId(null);
    setScreen("office");
  }, [run, shipId]);

  const continueFromRelease = useCallback(() => {
    setReleased(null);
    setScreen("office");
  }, []);`, "app sell callback");
  s = mustReplace(s,
`            onAir={airShow}
            onBack={() => {`,
`            onAir={airShow}
            onSell={sellShow}
            onBack={() => {`, "ship onsell prop");
  s = mustReplace(s,
`        {paused && pauseMenu}`, 
`        {run && run.staff.some((s) => (s.pendingLevelUps?.length ?? 0) > 0) && screen !== "title" && screen !== "gameover" && screen !== "retrospective" && <StaffLevelUpModal run={run} setRun={(fn) => setRun((r) => (r ? fn(r) : r))} />}

        {paused && pauseMenu}`, "mount level modal");
  s = mustReplace(s,
`  /* ------------------------------------------------------- game clock */`,
`  const pendingLevelUp = !!run?.staff.some((s) => (s.pendingLevelUps?.length ?? 0) > 0);
  useEffect(() => { if (pendingLevelUp) setTimeSpeed(0); }, [pendingLevelUp]);

  /* ------------------------------------------------------- game clock */`, "pause on level up");
  write(p, s);
}

// ------------------------------------------------------------- Library.tsx
{
  const p = "src/components/Library.tsx";
  let s = read(p);
  s = mustReplace(s, `import { launchMerch, type RunState } from "../engine/state";`, `import { franchiseSaleBlock, franchiseSaleOffer, launchMerch, sellFranchiseRights, type RunState } from "../engine/state";`, "library sale imports");
  s = mustReplace(s,
`  const [picking, setPicking] = useState<null | "crossover" | "spinoff">(null);`,
`  const [picking, setPicking] = useState<null | "crossover" | "spinoff">(null);
  const [confirmSale, setConfirmSale] = useState(false);`, "library sale state");
  s = mustReplace(s,
`      {/* ---------------------------------------------------------- cast */}`,
`      <div className={cn("rounded-xl border p-3", fr.soldTo ? "border-neon/45 bg-neon/5" : "border-gold/35 bg-gold/5")}>
        <div className="text-[10px] font-black tracking-widest text-gold">IP RIGHTS</div>
        {fr.soldTo ? <div className="mt-1 text-xs text-neon"><b>SOLD TO {fr.soldTo.name.toUpperCase()}</b> · {formatGBPShort(fr.soldTo.price)} · week {fr.soldTo.week}. Historic credits stay here, but continuations and merchandise are no longer yours.</div> : (()=>{const block=franchiseSaleBlock(run,fr.key);const offer=franchiseSaleOffer(run,fr.key);return <><div className="mt-1 text-[10px] text-paper/50">Very successful original IP can be put on the market for an irreversible full-rights sale. The winning network or rival gets the future upside.</div>{offer?<div className="mt-2 flex flex-wrap items-center gap-2"><b className="text-sm text-mint">Likely winning bid: {formatGBPShort(offer.price)}</b><span className="text-[9px] text-paper/45">{offer.buyerName} · {offer.buyerType.toUpperCase()}</span>{!confirmSale?<Btn variant="gold" onClick={()=>setConfirmSale(true)}>AUCTION FULL IP RIGHTS</Btn>:<><Btn variant="gold" onClick={()=>{setRun(r=>sellFranchiseRights(r,fr.key)??r);setConfirmSale(false);}}>CONFIRM IRREVERSIBLE SALE</Btn><Btn variant="ghost" onClick={()=>setConfirmSale(false)}>CANCEL</Btn></>}</div>:<div className="mt-2 text-[9px] text-paper/40">{block}</div>}</>;})()}
      </div>

      {/* ---------------------------------------------------------- cast */}`, "library IP sale UI");
  write(p, s);
}

// --------------------------------------------------------------- tests
write("src/engine/__tests__/staff-potential-business.test.ts", `import { describe, expect, it } from "vitest";
import { initialRun, showSaleOffers, sellReadyProject, franchiseSaleOffer, sellFranchiseRights } from "../state";
import { growthForLevel, potentialForId, potentialOf, gainXp, XP_LEVELS } from "../careers";
import { commissionRightsAuction, commissionedAuctionFee } from "../ip";
import { makeProject, type Project } from "../projects";
import type { Staff } from "../data";

const worker=(id:string,potential:number,role:Staff["role"]="writer"):Staff=>({id,name:id,role,story:50,art:30,sound:30,level:1,salary:100,cost:0,stamina:100,portrait:0,xp:0,potential});

describe("hidden staff potential",()=>{
  it("assigns stable 1..100 potential",()=>{const a=potentialForId("stable-person");expect(a).toBeGreaterThanOrEqual(1);expect(a).toBeLessThanOrEqual(100);expect(potentialForId("stable-person")).toBe(a);});
  it("makes elite growth dramatically larger than low-potential growth",()=>{let low=0,high=0;for(let level=2;level<=60;level++){const l=growthForLevel(worker("low",10),level);const h=growthForLevel(worker("high",98),level);low+=l.story+l.art+l.sound;high+=h.story+h.art+h.sound;}expect(high).toBeGreaterThan(low*4);});
  it("queues an exact durable reveal when XP crosses a level",()=>{const s=worker("queue",88);const out=gainXp(s,XP_LEVELS[1]+1);expect(out.levelsGained).toBe(1);expect(out.staff.pendingLevelUps).toHaveLength(1);expect(out.staff.pendingLevelUps![0].afterLevel).toBe(2);expect(Object.keys(out.staff.pendingLevelUps![0])).not.toContain("potential");expect(potentialOf(out.staff)).toBe(88);});
});

describe("business ownership choices",()=>{
  it("charges a major fee for commissioning an auction",()=>{const r={...initialRun("A","steady"),cash:20_000_000,officeLevel:3,showsMade:20,awards:2,bestScore:34,fans:50_000};const fee=commissionedAuctionFee(r);const out=commissionRightsAuction(r,()=>0.1);expect(fee).toBeGreaterThanOrEqual(4_000_000);expect(out).not.toBeNull();expect(out!.market.pendingPromptId).toBe(out!.auction.id);});
  it("creates deterministic network and rival buyout offers for a ready original",()=>{let r={...initialRun("A","steady"),cash:5_000_000,bestScore:28};const d={title:"Sell Me",medium:"fanweb" as const,budget:"standard" as const,scope:"standard" as const,slot:"web" as const,animeType:"shonen" as const,genres:["slice" as const],audience:"teens" as const,protag:"cv3_protag_001",protagName:"Lead",secondary:"cv3_secondary_001",pet:"cv3_pet_001",villain:"cv3_villain_001",arcs:["hook","quiet","finale"],sliders:[50,50,50] as [number,number,number],season:1};let p=makeProject(d,0);p={...p,stage:"ready",points:{story:120,art:110,sound:100},hype:60,spent:120_000} as Project;r={...r,projects:[p]};const a=showSaleOffers(r,p.id);const b=showSaleOffers(r,p.id);expect(a.length).toBeGreaterThanOrEqual(2);expect(a).toEqual(b);expect(a.some(x=>x.buyerType==="network")).toBe(true);expect(a.some(x=>x.buyerType==="rival")).toBe(true);});
  it("values a successful franchise sale and permanently marks ownership",()=>{const r=initialRun("A","steady");const fr={key:"Hit",baseTitle:"Hit",genres:["slice" as const],animeType:"shonen" as const,audience:"teens" as const,cast:[],createdWeek:0,entries:[{kind:"original" as const,title:"Hit",score:34,revenue:2_000_000,fans:30_000,week:0,hallOfFame:true}],season:1,totalRevenue:2_000_000,lifetimeFans:30_000,bestScore:34,lastScore:34,lastEntryWeek:0,popularity:80,fatigue:10,merchValue:200_000,cult:false,merchCooldown:{},alive:true};const rich={...r,franchises:{Hit:fr}};const offer=franchiseSaleOffer(rich,"Hit");expect(offer).not.toBeNull();const sold=sellFranchiseRights(rich,"Hit");expect(sold!.cash).toBe(rich.cash+offer!.price);expect(sold!.franchises.Hit.soldTo?.name).toBe(offer!.buyerName);});
});
`);

console.log("Staff potential / business pass applied.");
