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

console.log(changed ? "QoL source patches applied." : "QoL source patches already present.");
