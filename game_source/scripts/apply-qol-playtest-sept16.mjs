import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function replaceOnce(relativePath, before, after) {
  const path = resolve(root, relativePath);
  const source = readFileSync(path, "utf8");
  if (source.includes(after)) return false;
  if (!source.includes(before)) throw new Error(`Patch anchor missing in ${relativePath}`);
  writeFileSync(path, source.replace(before, after));
  return true;
}

let changed = false;

changed = replaceOnce(
  "src/App.tsx",
  "const [timeSpeed, setTimeSpeed] = useState<0 | 1 | 4 | 8 | 12>(1);",
  "const [timeSpeed, setTimeSpeed] = useState<0 | 1 | 4 | 8 | 12 | 30>(1);",
) || changed;
changed = replaceOnce(
  "src/App.tsx",
  "const lastClockSpeedRef = useRef<1 | 4 | 8 | 12>(1);",
  "const lastClockSpeedRef = useRef<1 | 4 | 8 | 12 | 30>(1);",
) || changed;
changed = replaceOnce(
  "src/App.tsx",
  "([0, 1, 4, 8, 12] as const).map((speed) => (",
  "([0, 1, 4, 8, 12, 30] as const).map((speed) => (",
) || changed;

const quickTypeButton = `                  {(() => {\n                    const active = isCastFilterActive(\"type\", d.animeType);\n                    const hasTypeFilter = castFilters.some((filter) => filter.kind === \"type\");\n                    const blocked = castFilterAtLimit && !active && !hasTypeFilter;\n                    return (\n                      <button\n                        disabled={blocked}\n                        onClick={() => toggleCastFilter({ kind: \"type\", value: d.animeType })}\n                        className={cn(\n                          \"btn-press rounded-lg border px-2 py-1.5 text-[9px] font-bold\",\n                          active ? \"border-neon bg-neon/10 text-neon\" : \"border-line text-paper/50\",\n                          blocked && \"cursor-not-allowed opacity-35\"\n                        )}\n                      >\n                        {active ? \"FILTERING: \" : \"FILTER: \"}{ANIME_TYPE_LABEL[d.animeType]}\n                      </button>\n                    );\n                  })()}\n                  {d.genres.map((genre) => {`;
changed = replaceOnce(
  "src/components/Create.tsx",
  "                  {d.genres.map((genre) => {",
  quickTypeButton,
) || changed;

changed = replaceOnce(
  "src/components/Ship.tsx",
  '<span className="font-display text-sm font-extrabold text-gold">{hype}%</span>',
  '<span className="font-display text-sm font-extrabold text-gold">{Math.ceil(hype)}%</span>',
) || changed;

const narrativeResearch = '  { id: "narrative_analytics", name: "Narrative Analytics", rd: 38, desc: "Researches several classic story structures, permanently revealing their combo ratings in the Story Arc planner." },';
const potentialResearch = `${narrativeResearch}\n  { id: "staff_appraisal", name: "Staff Appraisal", rd: 40, desc: "Reveals a broad long-term Potential band for employees already on your payroll." },\n  { id: "talent_scouting", name: "Talent Scouting", rd: 70, desc: "Extends Potential bands to recruitment candidates before you sign them.", requires: "staff_appraisal" },`;
changed = replaceOnce("src/engine/data.ts", narrativeResearch, potentialResearch) || changed;

const crewImport = 'import { SHOWRUNNER_XP_LEVELS, showrunnerLevelTitle } from "../engine/showrunnerCareer";';
const crewImportAfter = `${crewImport}\nimport { canSeeCandidatePotential, canSeeEmployeePotential, potentialLabel } from "../engine/staffPotential";`;
changed = replaceOnce("src/components/Crew.tsx", crewImport, crewImportAfter) || changed;

changed = replaceOnce(
  "src/components/Crew.tsx",
  'function CandidateSheet({ candidate, canHire, onHire, onClose }: { candidate: Staff | null; canHire: boolean; onHire: (s: Staff) => void; onClose: () => void }) {',
  'function CandidateSheet({ candidate, canHire, research, onHire, onClose }: { candidate: Staff | null; canHire: boolean; research: readonly string[]; onHire: (s: Staff) => void; onClose: () => void }) {',
) || changed;

changed = replaceOnce(
  "src/components/Crew.tsx",
  '<div className="mt-2 text-[9px] italic text-paper/40">Long-term Potential is hidden. Development rolls reveal who has the highest ceiling.</div>',
  '{canSeeCandidatePotential(research) ? <div className="mt-2 text-[9px] font-bold text-gold">POTENTIAL OUTLOOK · {potentialLabel(candidate)}</div> : <div className="mt-2 text-[9px] italic text-paper/40">Long-term Potential is hidden. Unlock Talent Scouting to assess candidates before signing.</div>}',
) || changed;

changed = replaceOnce(
  "src/components/Crew.tsx",
  '      {/* spec + traits (always visible — this is who they are) */}',
  '      {canSeeEmployeePotential(run.research) && <div className="mt-1.5 rounded-lg border border-gold/30 bg-gold/5 px-2 py-1 text-[9px] font-bold text-gold">POTENTIAL · {potentialLabel(s)}</div>}\n\n      {/* spec + traits (always visible — this is who they are) */}',
) || changed;

changed = replaceOnce(
  "src/components/Crew.tsx",
  '<CandidateSheet candidate={candidate} canHire={!!candidate && run.cash >= candidate.cost && run.staff.length < maxStaff} onHire={(c) => { hire(c); setCandidate(null); }} onClose={() => setCandidate(null)} />',
  '<CandidateSheet candidate={candidate} canHire={!!candidate && run.cash >= candidate.cost && run.staff.length < maxStaff} research={run.research} onHire={(c) => { hire(c); setCandidate(null); }} onClose={() => setCandidate(null)} />',
) || changed;

const levelImport = 'import Portrait from "./Portrait";';
const levelImportAfter = `${levelImport}\nimport { canSeeEmployeePotential, potentialLabel } from "../engine/staffPotential";`;
changed = replaceOnce("src/components/StaffLevelUpModal.tsx", levelImport, levelImportAfter) || changed;

changed = replaceOnce(
  "src/components/StaffLevelUpModal.tsx",
  '<div className="text-[10px] text-paper/50">{ROLE_LABEL[staff.role]} · hidden development potential</div>',
  '<div className="text-[10px] text-paper/50">{ROLE_LABEL[staff.role]} · {canSeeEmployeePotential(run.research) ? `Potential: ${potentialLabel(staff)}` : "hidden development potential"}</div>',
) || changed;
changed = replaceOnce(
  "src/components/StaffLevelUpModal.tsx",
  '<div className="mt-2 text-[9px] text-paper/40">Potential stays hidden. Watch long-term growth to discover who can become exceptional.</div>',
  '<div className="mt-2 text-[9px] text-paper/40">{canSeeEmployeePotential(run.research) ? `Potential outlook: ${potentialLabel(staff)}. Exact numeric Potential remains hidden.` : "Potential stays hidden. Staff Appraisal can reveal a broad long-term outlook."}</div>',
) || changed;

/* --------------------------------------------------------- shelved masters */
changed = replaceOnce(
  "src/engine/projects.ts",
  '  | "ready"\n  | "airing"',
  '  | "ready"\n  | "shelved"\n  | "airing"',
) || changed;
changed = replaceOnce(
  "src/engine/projects.ts",
  '  ready: "Ready to Air",\n  airing: "On Air",',
  '  ready: "Ready to Air",\n  shelved: "Shelved Master",\n  airing: "On Air",',
) || changed;
changed = replaceOnce(
  "src/engine/projects.ts",
  '  ready: null,\n  airing: null,\n  done: null,',
  '  ready: null,\n  shelved: null,\n  airing: null,\n  done: null,',
) || changed;
/* STAGE_FOCUS and STAGE_GATE contain the same tail; the second replacement is
 * intentionally idempotent and applies to the remaining occurrence. */
changed = replaceOnce(
  "src/engine/projects.ts",
  '  ready: null,\n  airing: null,\n  done: null,',
  '  ready: null,\n  shelved: null,\n  airing: null,\n  done: null,',
) || changed;
changed = replaceOnce(
  "src/engine/projects.ts",
  '  /** everything spent on this show so far (upfront + burn + sprints) */\n  spent: number;',
  '  /** week a completed master was deliberately moved into the library */\n  shelvedWeek?: number;\n  /** everything spent on this show so far (upfront + burn + sprints) */\n  spent: number;',
) || changed;
changed = replaceOnce(
  "src/engine/projects.ts",
  'projects.filter((p) => p.stage !== "airing" && p.stage !== "done");',
  'projects.filter((p) => p.stage !== "airing" && p.stage !== "done" && p.stage !== "shelved");',
) || changed;

const scoreReadyComment = '/** score a ready project without committing anything */';
const shelvingHelpers = `export const SHELVED_RELEASE_REVENUE_MULT = 0.8;\n\n/** Move a finished master into the library. Quality is frozen, current hype is\n * deliberately lost, staff are freed and the project stops occupying studio\n * capacity until the player chooses to launch it. */\nexport function shelveReadyProject(r: RunState, projectId: string): RunState | null {\n  const target = r.projects.find((p) => p.id === projectId);\n  if (!target || target.stage !== \"ready\") return null;\n  return {\n    ...r,\n    projects: r.projects.map((p) =>\n      p.id === projectId\n        ? { ...p, stage: \"shelved\" as const, hype: 0, staffIds: [], milestone: null, rush: null, auto: null, shelvedWeek: r.week }\n        : p,\n    ),\n    notices: [...r.notices, \`📚 “\${target.draft.title}” has been shelved. Hype falls to 0; the finished master can be launched later from the Library.\`].slice(-40),\n  };\n}\n\n${scoreReadyComment}`;
changed = replaceOnce("src/engine/state.ts", scoreReadyComment, shelvingHelpers) || changed;
changed = replaceOnce(
  "src/engine/state.ts",
  '  if (!p0 || p0.stage !== "ready") return null;',
  '  if (!p0 || (p0.stage !== "ready" && p0.stage !== "shelved")) return null;',
) || changed;

const dealAnchor = '  /* ---- the deal: the commissioner takes their cut, judges the work ---- */';
const shelfPenalty = `  if (p.shelvedWeek !== undefined) {\n    const before = result.revenue;\n    result = {\n      ...result,\n      revenue: Math.round(result.revenue * SHELVED_RELEASE_REVENUE_MULT),\n      breakdown: [...result.breakdown, { label: \"Shelved-master launch\", pts: \`×\${SHELVED_RELEASE_REVENUE_MULT.toFixed(2)} sales · quality unchanged\` }],\n    };\n    void before;\n  }\n\n${dealAnchor}`;
changed = replaceOnce("src/engine/state.ts", dealAnchor, shelfPenalty) || changed;

changed = replaceOnce(
  "src/App.tsx",
  '  sellReadyProject,\n  startBlockReason,',
  '  sellReadyProject,\n  shelveReadyProject,\n  startBlockReason,',
) || changed;

const sellShowBlock = `  const sellShow = useCallback((offerId: string) => {\n    if (!run || !shipId) return;\n    const out = sellReadyProject(run, shipId, offerId);\n    if (!out) return;\n    sfx.cash();\n    setRun(out.run);\n    setShipId(null);\n    setScreen(\"office\");\n  }, [run, shipId]);`;
const sellAndShelve = `${sellShowBlock}\n\n  const shelveShow = useCallback(() => {\n    if (!run || !shipId) return;\n    const next = shelveReadyProject(run, shipId);\n    if (!next) return;\n    sfx.select();\n    setRun(next);\n    setShipId(null);\n    setScreen(\"office\");\n  }, [run, shipId]);`;
changed = replaceOnce("src/App.tsx", sellShowBlock, sellAndShelve) || changed;
changed = replaceOnce(
  "src/App.tsx",
  '            onShip={openShip}\n            workPulses={workPulses}',
  '            onShip={openShip}\n            onReleaseShelved={openShip}\n            workPulses={workPulses}',
) || changed;
changed = replaceOnce(
  "src/App.tsx",
  '            onAir={airShow}\n            onSell={sellShow}\n            onBack={() => {',
  '            onAir={airShow}\n            onSell={sellShow}\n            onShelve={shelveShow}\n            onBack={() => {',
) || changed;

changed = replaceOnce(
  "src/components/Ship.tsx",
  '  onSell,\n  onBack,',
  '  onSell,\n  onShelve,\n  onBack,',
) || changed;
changed = replaceOnce(
  "src/components/Ship.tsx",
  '  onSell: (offerId: string) => void;\n  onBack: () => void;',
  '  onSell: (offerId: string) => void;\n  onShelve: () => void;\n  onBack: () => void;',
) || changed;
changed = replaceOnce(
  "src/components/Ship.tsx",
  '          <Btn variant="ghost" onClick={onBack}><ChevronLeft size={16} /> DELAY</Btn>\n          <Btn big variant="gold" className="flex-1" onClick={() => onAir(spent, hype)}><Rocket size={20} /> AIR THE SHOW!</Btn>',
  '          <Btn variant="ghost" onClick={onBack}><ChevronLeft size={16} /> DELAY</Btn>\n          {project.stage === "ready" && <Btn variant="ghost" onClick={onShelve}>SHELVE MASTER</Btn>}\n          <Btn big variant="gold" className="flex-1" onClick={() => onAir(spent, hype)}><Rocket size={20} /> AIR THE SHOW!</Btn>',
) || changed;
changed = replaceOnce(
  "src/components/Ship.tsx",
  '        <div className="mt-1.5 text-center text-[9px] text-paper/45">Delaying keeps production costs burning while launch heat cools. Campaign spending is committed only when you air.</div>',
  '        <div className="mt-1.5 text-center text-[9px] text-paper/45">{project.stage === "shelved" ? "Shelved masters keep their finished quality. Fresh campaigns rebuild hype, but eventual sales are reduced." : "Delaying keeps production costs burning while launch heat cools. Shelving moves the completed master to the Library, clears hype and stops production burn."} Campaign spending is committed only when you air.</div>',
) || changed;

changed = replaceOnce(
  "src/components/Office.tsx",
  '  onShip,\n  workPulses = [],',
  '  onShip,\n  onReleaseShelved,\n  workPulses = [],',
) || changed;
changed = replaceOnce(
  "src/components/Office.tsx",
  '  onShip: (projectId: string) => void;\n  workPulses?: import("../engine/state").DeskPulse[];',
  '  onShip: (projectId: string) => void;\n  onReleaseShelved: (projectId: string) => void;\n  workPulses?: import("../engine/state").DeskPulse[];',
) || changed;
changed = replaceOnce(
  "src/components/Office.tsx",
  '            onContinue={(plan) => {\n              setModal(null);\n              onContinue(plan);\n            }}\n          />',
  '            onContinue={(plan) => {\n              setModal(null);\n              onContinue(plan);\n            }}\n            onReleaseShelved={(projectId) => {\n              setModal(null);\n              onReleaseShelved(projectId);\n            }}\n          />',
) || changed;

changed = replaceOnce(
  "src/components/Library.tsx",
  '  onContinue,\n}: {\n  run: RunState;\n  setRun: (fn: (r: RunState) => RunState) => void;\n  onContinue: (plan: ContinuationPlan) => void;\n}) {',
  '  onContinue,\n  onReleaseShelved,\n}: {\n  run: RunState;\n  setRun: (fn: (r: RunState) => RunState) => void;\n  onContinue: (plan: ContinuationPlan) => void;\n  onReleaseShelved: (projectId: string) => void;\n}) {',
) || changed;
changed = replaceOnce(
  "src/components/Library.tsx",
  '  const allFranchises = Object.values(run.franchises).sort(',
  '  const shelved = run.projects.filter((project) => project.stage === "shelved").sort((a, b) => (b.shelvedWeek ?? 0) - (a.shelvedWeek ?? 0));\n  const allFranchises = Object.values(run.franchises).sort(',
) || changed;

const libraryListOpen = '      <div className="space-y-1.5 text-[12px]">';
const libraryShelvedSection = `${libraryListOpen}\n        {shelved.length > 0 && (\n          <section className=\"mb-3 rounded-xl border border-gold/35 bg-gold/5 p-3\">\n            <div className=\"text-[9px] font-black tracking-widest text-gold\">SHELVED MASTERS · {shelved.length}</div>\n            <div className=\"mt-2 space-y-2\">\n              {shelved.map((project) => {\n                const weeks = Math.max(0, run.week - (project.shelvedWeek ?? run.week));\n                return <div key={project.id} className=\"rounded-lg border border-line bg-panel2/70 p-2\">\n                  <div className=\"flex items-center gap-2\">\n                    <div className=\"min-w-0 flex-1\"><b className=\"block truncate\">{project.draft.title}</b><span className=\"text-[9px] text-paper/45\">Shelved {weeks} week{weeks === 1 ? \"\" : \"s\"} · hype 0 · finished quality preserved</span></div>\n                    <Btn variant=\"gold\" className=\"!px-2 !py-1 text-[9px]\" onClick={() => onReleaseShelved(project.id)}>PREPARE RELEASE</Btn>\n                  </div>\n                </div>;\n              })}\n            </div>\n          </section>\n        )}`;
changed = replaceOnce("src/components/Library.tsx", libraryListOpen, libraryShelvedSection) || changed;

console.log(changed ? "QoL source patches applied." : "QoL source patches already present.");
