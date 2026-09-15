import fs from 'node:fs';

function replaceOnce(source, find, replacement, label) {
  if (!source.includes(find)) throw new Error(`Patch anchor not found: ${label}`);
  return source.replace(find, replacement);
}

const producePath = 'src/components/Produce.tsx';
let produce = fs.readFileSync(producePath, 'utf8');
if (!produce.includes('onAppointPromise: (projectId: string, promiseId: string) => void;')) {
  produce = replaceOnce(
    produce,
    'import { Building2, ChevronLeft, MonitorPlay, Music4, PenTool, Scissors } from "lucide-react";',
    'import { Building2, ChevronLeft, Crown, MonitorPlay, Music4, PenTool, Scissors } from "lucide-react";',
    'Produce Crown import',
  );
  produce = replaceOnce(
    produce,
    'import { MILESTONE_LABEL, draftCost } from "../engine/projects";',
    'import { MILESTONE_LABEL, TEAM_MAX, draftCost } from "../engine/projects";\nimport { expansionOf } from "../engine/studioExpansion";',
    'Produce promise imports',
  );
  produce = replaceOnce(
    produce,
    'export default function Produce({ run, project, milestone, workPulses = [], onDone, onBack }: {',
    'export default function Produce({ run, project, milestone, workPulses = [], onAppointPromise, onDone, onBack }: {',
    'Produce props destructure',
  );
  produce = replaceOnce(
    produce,
    '  workPulses?: DeskPulse[];\n  onDone: (o: MilestoneOutcome) => void;',
    '  workPulses?: DeskPulse[];\n  onAppointPromise: (projectId: string, promiseId: string) => void;\n  onDone: (o: MilestoneOutcome) => void;',
    'Produce callback type',
  );

  const teamAnchor = '  const team = useMemo(() => run.staff.filter((s) => project.staffIds.includes(s.id)), [run.staff, project.staffIds]);\n';
  const helper = `  const team = useMemo(() => run.staff.filter((s) => project.staffIds.includes(s.id)), [run.staff, project.staffIds]);
  const expansion = expansionOf(run);
  const productionCredit = expansion.credits[project.id];
  const promiseCandidates = expansion.promises.filter((promise) =>
    promise.status === "active" &&
    (!promise.projectId || promise.projectId === project.id) &&
    !project.commission &&
    !project.draft.continuation &&
    !project.draft.licensedIpId &&
    project.draft.genres.includes(promise.genre)
  );
  const phasePromiseRole = phase
    ? phase.type === "story"
      ? "writer"
      : phase.type === "art"
        ? "animator"
        : "composer"
    : null;
  const renderPromiseActions = (role?: "writer" | "animator" | "composer") => {
    const relevant = promiseCandidates.filter((promise) => !role || promise.role === role);
    if (!relevant.length) return null;
    return (
      <div className="mt-3 space-y-2">
        {relevant.map((promise) => {
          const creator = run.staff.find((st) => st.id === promise.staffId);
          if (!creator) return null;
          const total = productionCredit?.byRole[promise.role] ?? 0;
          const creatorDays = productionCredit?.roleStaff[promise.staffId] ?? 0;
          const participation = total > 0 ? Math.round((creatorDays / total) * 100) : 0;
          const named = productionCredit?.leads[promise.role] === promise.staffId && promise.projectId === project.id;
          const conflictingLead = !!productionCredit?.leads[promise.role] && productionCredit.leads[promise.role] !== promise.staffId;
          const alreadyAssigned = project.staffIds.includes(promise.staffId);
          const early = project.stage === "concept" && total === 0;
          const earnedLate = total > 0 && participation >= 60;
          const canAutoAssign = alreadyAssigned || project.staffIds.length < TEAM_MAX;
          const canName = !named && !conflictingLead && canAutoAssign && (early || (alreadyAssigned && earnedLate));
          const leadLabel = promise.role === "writer" ? "WRITING" : promise.role === "animator" ? "ANIMATION" : "SOUND";
          return (
            <div key={promise.id} className="rounded-xl border border-viol/55 bg-viol/10 p-3">
              <div className="flex items-center gap-2">
                <Crown size={14} className="shrink-0 text-gold" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10px] font-black tracking-wider text-gold">PROMISED {leadLabel} LEAD</div>
                  <div className="truncate text-[10px] text-paper/70">{creator.name} · {participation}% department participation</div>
                </div>
                {named && <span className="rounded bg-mint/15 px-1.5 py-0.5 text-[8px] font-black text-mint">NAMED</span>}
              </div>
              {!named && canName && (
                <Btn variant="gold" className="mt-2 w-full !py-1.5 text-[10px]" onClick={() => onAppointPromise(project.id, promise.id)}>
                  <Crown size={12} /> {alreadyAssigned ? \`NAME \${creator.name.toUpperCase()} \${leadLabel} LEAD\` : \`ASSIGN + NAME \${creator.name.toUpperCase()} \${leadLabel} LEAD\`}
                </Btn>
              )}
              {!named && !canName && (
                <div className="mt-1.5 text-[9px] text-paper/50">
                  {conflictingLead
                    ? \`Another \${leadLabel.toLowerCase()} lead is already named.\`
                    : !canAutoAssign
                      ? "Team is full — make a slot before naming this promised lead."
                      : total > 0
                        ? \`Keep \${creator.name} on the project until they reach 60% of \${leadLabel.toLowerCase()} production days. Current: \${participation}%.\`
                        : \`Assign \${creator.name} before \${leadLabel.toLowerCase()} work begins, or they can still earn the role later at 60% participation.\`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
`;
  produce = replaceOnce(produce, teamAnchor, helper, 'Produce promise helper');

  const editAnchor = '            <p className="mt-1 text-xs text-paper/55">Editing notes only move one way: down. Keep the calendar running to chase a cleaner master; every cleared note improves final quality and earns +1 RD. The trade-off is time and money.</p>\n          </div>\n\n';
  produce = replaceOnce(produce, editAnchor, editAnchor + '          {renderPromiseActions()}\n\n', 'Edit Bay promise action');

  const planAnchor = '            <p className="mt-1 text-xs text-paper/55">Set the balance, appoint one specialist, then the rush resolves as a short studio spotlight. Their skill sets the RNG floor and ceiling.</p>\n          </div>\n';
  produce = replaceOnce(produce, planAnchor, planAnchor + '          {phasePromiseRole && renderPromiseActions(phasePromiseRole)}\n', 'Rush plan promise action');

  const assignAnchor = '          <div className="text-center"><div className="text-[11px] tracking-[0.4em] text-cyanx">{phase!.name}</div><h2 className="font-display text-3xl font-extrabold">WHO GETS THE SPOTLIGHT?</h2><p className="mt-1 text-xs text-paper/55">Higher relevant skill raises both the minimum and maximum result. The reveal is instant and does not consume calendar days.</p></div>\n';
  produce = replaceOnce(produce, assignAnchor, assignAnchor + '          {phasePromiseRole && renderPromiseActions(phasePromiseRole)}\n', 'Rush assignment promise action');

  fs.writeFileSync(producePath, produce);
}

const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');
if (!app.includes('const appointPromiseLead = useCallback')) {
  app = replaceOnce(
    app,
    '  applyMilestone,\n  initialRun,',
    '  applyMilestone,\n  assignToProject,\n  initialRun,',
    'App assignToProject import',
  );
  app = replaceOnce(
    app,
    'import BigThreeReveal from "./components/BigThreeReveal";\n',
    'import BigThreeReveal from "./components/BigThreeReveal";\nimport { appointCreativeLead, expansionOf } from "./engine/studioExpansion";\n',
    'App studioExpansion import',
  );

  const finishAnchor = `  const finishMilestone = useCallback(
    (o: MilestoneOutcome) => {
      if (!focus) return;
      sfx.reveal();
      setRun((r) => (r ? applyMilestone(r, focus.projectId, o) : r));
      setFocus(null);
      setScreen("office");
    },
    [focus]
  );

`;
  const appointBlock = `  const appointPromiseLead = useCallback((projectId: string, promiseId: string) => {
    sfx.click();
    setRun((current) => {
      if (!current) return current;
      const promise = expansionOf(current).promises.find((p) => p.id === promiseId);
      const project = current.projects.find((p) => p.id === projectId);
      if (!promise || !project) return current;
      const staged = project.staffIds.includes(promise.staffId)
        ? current
        : assignToProject(current, projectId, promise.staffId);
      const assigned = staged.projects.find((p) => p.id === projectId)?.staffIds.includes(promise.staffId);
      if (!assigned) return current;
      return appointCreativeLead(staged, projectId, promiseId) ?? current;
    });
  }, []);

`;
  app = replaceOnce(app, finishAnchor, finishAnchor + appointBlock, 'App promise callback');
  app = replaceOnce(
    app,
    '            workPulses={workPulses}\n            onDone={finishMilestone}\n',
    '            workPulses={workPulses}\n            onAppointPromise={appointPromiseLead}\n            onDone={finishMilestone}\n',
    'App Produce promise prop',
  );
  fs.writeFileSync(appPath, app);
}

const auditPath = 'docs/THREE_CLICK_UX_AUDIT.md';
let audit = fs.readFileSync(auditPath, 'utf8');
audit = audit.replace(
  'New path: Office → Project Board → **ASSIGN + NAME [CREATOR] [DEPARTMENT] LEAD**. Two clicks from the office if the project qualifies. The promise card is visible beside team/rush/intervention controls. If the creator was not named before department work began, they can still earn the appointment later once they personally hold at least 60% of the department\'s recorded production days. This keeps the promise meaningful without creating a hidden irreversible failure.',
  'New paths: Office → Project Board → **ASSIGN + NAME [CREATOR] [DEPARTMENT] LEAD** (two clicks), or act directly inside the relevant Story / Animation / Sound rush with no detour. The Edit Bay also shows any still-unfulfilled promised lead who has earned at least 60% of their department\'s recorded production days. The Project Board remains the overview; rush/edit screens are contextual shortcuts. This keeps the promise meaningful without creating a hidden irreversible failure.',
);
audit = audit.replace(
  '| Name promised creative lead | Project Board → promise action | 2 | PASS after this patch | Keep on project card and surface progress % |',
  '| Name promised creative lead | Project Board → promise action, or relevant Rush/Edit Bay → promise action | 1–2 | PASS | Keep the same action in every production context where it becomes eligible |',
);
audit = audit.replace(
  '5. **Do not count meaningful creative decisions as navigation.** Building a show can involve many creative selections. The three-click rule is about getting to the relevant decision, not deleting game depth.',
  '5. **Contextual parity.** A production action that becomes eligible while the player is in a rush, edit, release or project screen must appear there as well as on its dashboard; never force a back-out-and-reopen loop.\n6. **Do not count meaningful creative decisions as navigation.** Building a show can involve many creative selections. The three-click rule is about getting to the relevant decision, not deleting game depth.',
);
fs.writeFileSync(auditPath, audit);

console.log('Promise-lead production-context patch applied.');
