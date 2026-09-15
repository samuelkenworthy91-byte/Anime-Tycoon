import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, text) => fs.writeFileSync(p, text);
const replaceOnce = (text, before, after, label) => {
  if (!text.includes(before)) throw new Error(`Patch anchor missing: ${label}`);
  return text.replace(before, after);
};

// Allow a promised creator to be named late only if they have genuinely
// earned at least 60% of their department's recorded production days.
{
  const p = 'src/engine/studioExpansion.ts';
  let text = read(p);
  const start = text.indexOf('export function appointCreativeLead(');
  const end = text.indexOf('export function pitchAction(', start);
  if (start < 0 || end < 0) throw new Error('Could not locate appointCreativeLead');
  const fn = `export function appointCreativeLead(
  r: RunState,
  projectId: string,
  promiseId: string,
): RunState | null {
  const x = expansionOf(r),
    promise = x.promises.find((p) => p.id === promiseId);
  const p = r.projects.find((p) => p.id === projectId),
    c = x.credits[projectId];
  if (
    !p ||
    !c ||
    !promise ||
    promise.status !== "active" ||
    p.draft.licensedIpId ||
    p.draft.continuation ||
    p.commission ||
    !p.draft.genres.includes(promise.genre) ||
    !p.staffIds.includes(promise.staffId) ||
    expansionBusyReason(r, promise.staffId) ||
    (promise.projectId && promise.projectId !== projectId) ||
    (c.leads[promise.role] && c.leads[promise.role] !== promise.staffId)
  )
    return null;
  if (promise.projectId === projectId && c.leads[promise.role] === promise.staffId)
    return r;
  const total = c.byRole[promise.role] ?? 0,
    creatorDays = c.roleStaff[promise.staffId] ?? 0,
    share = total > 0 ? creatorDays / total : 0;
  const earlyAppointment = p.stage === "concept" && total === 0;
  const earnedLateAppointment =
    !["airing", "done"].includes(p.stage) && total > 0 && share >= 0.6;
  if (!earlyAppointment && !earnedLateAppointment) return null;
  const alignment = promise.vision ? visionAlignment(p.draft, promise.vision) : null;
  const effects = alignment ? visionEffects(alignment) : null;
  return {
    ...write(r, {
      ...x,
      promises: x.promises.map((a) =>
        a.id === promiseId
          ? {
              ...a,
              projectId,
              visionAlignment: alignment?.score,
              history: [
                ...a.history,
                earnedLateAppointment && !earlyAppointment
                  ? "Named as department lead after earning at least 60% of recorded department participation."
                  : "Named as department lead before department production began.",
                ...(alignment
                  ? ["Creator vision alignment locked at " + alignment.score + "% (" + effects!.label + ")."]
                  : []),
              ],
            }
          : a,
      ),
      credits: {
        ...x.credits,
        [projectId]: {
          ...c,
          leads: { ...c.leads, [promise.role]: promise.staffId },
        },
      },
    }),
    staff: effects
      ? r.staff.map((s) => s.id === promise.staffId ? moraleDelta(s, effects.moraleDelta) : s)
      : r.staff,
  };
}
`;
  text = text.slice(0, start) + fn + text.slice(end);
  write(p, text);
}

// Put the promise directly on each matching Project Board card.
{
  const p = 'src/components/Projects.tsx';
  let text = read(p);
  text = replaceOnce(
    text,
    'import { INTERVENTIONS, interventionBlock, interventionQuote } from "../engine/spending";\n',
    'import { INTERVENTIONS, interventionBlock, interventionQuote } from "../engine/spending";\nimport { expansionOf } from "../engine/studioExpansion";\n',
    'Projects import'
  );
  text = text.replaceAll(
    '  onIntervention,\n}: {',
    '  onIntervention,\n  onAppointPromise,\n}: {'
  );
  text = text.replaceAll(
    '  onIntervention: (projectId: string, interventionId: string) => void;\n})',
    '  onIntervention: (projectId: string, interventionId: string) => void;\n  onAppointPromise: (projectId: string, promiseId: string) => void;\n})'
  );
  text = replaceOnce(
    text,
    '  ];\n\n  return (',
    `  ];
  const expansion = expansionOf(run);
  const productionCredit = expansion.credits[p.id];
  const promiseCandidates = expansion.promises.filter((promise) =>
    promise.status === "active" &&
    (!promise.projectId || promise.projectId === p.id) &&
    !p.commission &&
    !p.draft.continuation &&
    !p.draft.licensedIpId &&
    p.draft.genres.includes(promise.genre)
  );

  return (`,
    'Project promise state'
  );
  const marker = `      {inPipeline && (
        <details className="mt-2 rounded-lg border border-line bg-panel2/50 p-2">
          <summary className="cursor-pointer text-[10px] font-black tracking-widest text-gold">PAID PRODUCTION INTERVENTIONS</summary>`;
  const block = `      {inPipeline && promiseCandidates.map((promise) => {
        const creator = run.staff.find((s) => s.id === promise.staffId);
        if (!creator) return null;
        const total = productionCredit?.byRole[promise.role] ?? 0;
        const creatorDays = productionCredit?.roleStaff[promise.staffId] ?? 0;
        const participation = total > 0 ? Math.round((creatorDays / total) * 100) : 0;
        const named = productionCredit?.leads[promise.role] === promise.staffId && promise.projectId === p.id;
        const conflictingLead = !!productionCredit?.leads[promise.role] && productionCredit.leads[promise.role] !== promise.staffId;
        const alreadyAssigned = p.staffIds.includes(promise.staffId);
        const early = p.stage === "concept" && total === 0;
        const earnedLate = total > 0 && participation >= 60;
        const canAutoAssign = alreadyAssigned || p.staffIds.length < TEAM_MAX;
        const canName = !named && !conflictingLead && canAutoAssign && (early || (alreadyAssigned && earnedLate));
        const leadLabel = promise.role === "writer" ? "WRITING" : promise.role === "animator" ? "ANIMATION" : "SOUND";
        return (
          <div key={promise.id} className="mt-2 rounded-lg border border-viol/55 bg-viol/10 p-2.5">
            <div className="flex items-center gap-2">
              <Crown size={13} className="text-gold" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[10px] font-black tracking-wider text-gold">LEADERSHIP PROMISE · {leadLabel} LEAD</div>
                <div className="truncate text-[10px] text-paper/70">{creator.name} · {participation}% department participation</div>
              </div>
              {named && <span className="rounded bg-mint/15 px-1.5 py-0.5 text-[8px] font-black text-mint">NAMED LEAD</span>}
            </div>
            {!named && canName && (
              <Btn variant="gold" className="mt-2 w-full !py-1.5 text-[10px]" onClick={() => onAppointPromise(p.id, promise.id)}>
                <Crown size={12} /> {alreadyAssigned ? "NAME " + creator.name.toUpperCase() + " " + leadLabel + " LEAD" : "ASSIGN + NAME " + creator.name.toUpperCase() + " " + leadLabel + " LEAD"}
              </Btn>
            )}
            {!named && !canName && (
              <div className="mt-1.5 text-[9px] text-paper/50">
                {conflictingLead
                  ? "Another " + leadLabel.toLowerCase() + " lead is already named."
                  : !canAutoAssign
                    ? "Team is full — make a slot before naming this promised lead."
                    : total > 0
                      ? "Keep " + creator.name + " on the project until they reach 60% of " + leadLabel.toLowerCase() + " production days. Current: " + participation + "%."
                      : "Assign " + creator.name + " before " + leadLabel.toLowerCase() + " work begins, or they can still earn the role later by reaching 60% participation."}
              </div>
            )}
          </div>
        );
      })}

${marker}`;
  text = replaceOnce(text, marker, block, 'Project promise card');
  text = replaceOnce(
    text,
    '          onIntervention={onIntervention}\n        />',
    '          onIntervention={onIntervention}\n          onAppointPromise={onAppointPromise}\n        />',
    'Project promise prop pass-through'
  );
  write(p, text);
}

// Wire one-click assign + appoint atomically from Office.
{
  const p = 'src/components/Office.tsx';
  let text = read(p);
  text = replaceOnce(
    text,
    'import BigThreeBoard from "./BigThreeBoard";\n',
    'import BigThreeBoard from "./BigThreeBoard";\nimport { appointCreativeLead, expansionOf } from "../engine/studioExpansion";\n',
    'Office studioExpansion import'
  );
  text = replaceOnce(
    text,
    '          <ProjectsPanel\n            run={run}\n            onAssign={(projectId, staffId) => {',
    `          <ProjectsPanel
            run={run}
            onAppointPromise={(projectId, promiseId) => {
              sfx.click();
              setRun((r) => {
                const promise = expansionOf(r).promises.find((p) => p.id === promiseId);
                const project = r.projects.find((p) => p.id === projectId);
                if (!promise || !project) return r;
                const staged = project.staffIds.includes(promise.staffId)
                  ? r
                  : assignToProject(r, projectId, promise.staffId);
                const assigned = staged.projects.find((p) => p.id === projectId)?.staffIds.includes(promise.staffId);
                if (!assigned) return r;
                return appointCreativeLead(staged, projectId, promiseId) ?? r;
              });
            }}
            onAssign={(projectId, staffId) => {`,
    'Office promised lead callback'
  );
  write(p, text);
}

// Update the fallback Studio Culture guidance.
{
  const p = 'src/components/StudioExpansionPanel.tsx';
  let text = read(p);
  text = replaceOnce(
    text,
    `        Commit to a creator's next step. Name their leadership at the concept
        stage, then release an original production with at least 60%
        participation in their department's production days.`,
    `        Commit to a creator's next step. The quickest route is now the Project Board:
        name them before their department starts, or later once they have personally earned
        at least 60% of that department's recorded production days. Then release within the deadline.`,
    'Ambitions guidance'
  );
  write(p, text);
}

// Regression coverage for early and earned-late appointment.
{
  const p = 'src/engine/__tests__/studio-expansion.test.ts';
  let text = read(p);
  text = replaceOnce(
    text,
    `  it("does not appoint a creator after department production starts", () => {
    const r = advanceExpansionDay(
      promiseLeadership(studio(), "writer", "romance")!,
    );
    expect(
      appointCreativeLead(r, "project", expansionOf(r).promises[0].id),
    ).toBeNull();
  });`,
    `  it("allows a late lead appointment once the creator has earned at least 60% department participation", () => {
    let r = promiseLeadership(studio(), "writer", "romance")!;
    r = credit(r, 6);
    r = { ...r, projects: r.projects.map((p) => ({ ...p, stage: "post" as const })) };
    const next = appointCreativeLead(r, "project", expansionOf(r).promises[0].id);
    expect(next).not.toBeNull();
    expect(expansionOf(next!).credits.project.leads.writer).toBe("writer");
  });
  it("still rejects a late lead appointment below 60% participation", () => {
    let r = promiseLeadership(studio(), "writer", "romance")!;
    r = credit(r, 5);
    r = { ...r, projects: r.projects.map((p) => ({ ...p, stage: "post" as const })) };
    expect(appointCreativeLead(r, "project", expansionOf(r).promises[0].id)).toBeNull();
  });`,
    'Late appointment tests'
  );
  write(p, text);
}

fs.writeFileSync('docs/THREE_CLICK_UX_AUDIT.md', `# Anime Runner — Three-Click UX Audit

## Principle

From the main office, any routine management goal should be reachable and commit-able in no more than three navigation/action clicks. This audit counts navigation and the final command, but not substantive creative choices inside a deliberate builder (for example choosing four cast members for a new show).

## Immediate fix implemented

### Leadership promises

Old path: Office → More/Studio Culture → Ambitions → promise card/project selector, then back to production. In practice this was 4–6 navigation/actions and required remembering a promise outside the production context.

New path: Office → Project Board → **ASSIGN + NAME [CREATOR] [DEPARTMENT] LEAD**. Two clicks from the office if the project qualifies. The promise card is visible beside team/rush/intervention controls. If the creator was not named before department work began, they can still earn the appointment later once they personally hold at least 60% of the department's recorded production days. This keeps the promise meaningful without creating a hidden irreversible failure.

## Current click-depth audit

| Goal | Current path | Approx. clicks | Status | Streamlining direction |
| --- | --- | ---: | --- | --- |
| Name promised creative lead | Project Board → promise action | 2 | PASS after this patch | Keep on project card and surface progress % |
| Assign staff to a project | Project Board → Team → Assign | 3 | PASS | Keep team accordion state sticky while board is open |
| Start a milestone rush | Project Board → Assign Rush Lead → choose lead | 3 | PASS | Prefer promised/department leads at top of selector |
| Buy a production intervention | Project Board → Paid Interventions → intervention | 3 | PASS | Auto-expand when project is in crisis |
| Release a ready show | Project Board → Release Prep → confirm release route | 3 | PASS | Keep all final-release choices on one sheet |
| Start the next season while airing | Project Board → Start Season | 2 | PASS | Preserve this pattern for spin-offs/reboots |
| Open original production builder | New Project → Original Production | 2 | PASS | Creative selections inside the builder are intentional choices, not navigation debt |
| Open licensed adaptation builder | New Project → Licensed Adaptation/rights → property | 2–3 | PASS/BORDERLINE | Owned IPs should appear immediately; auctions remain a separate acquisition goal |
| Research a technology | More/R&D → research item | 2–3 | PASS | Add contextual R&D shortcuts where a locked feature cites its requirement |
| Hire a worker | Staff → candidate → Sign | 3 | PASS | Keep dossier as bottom sheet; never add another confirmation page |
| Train a worker | Staff → employee expand → training panel → course | 3–4 | BORDERLINE | Put one-tap recommended training buttons in expanded employee card |
| Appoint department head | Staff → employee expand → head control → appoint | 3–4 | BORDERLINE | Show eligible head vacancy CTA directly on employee card |
| Accept/respond to salary or poach event | Staff → event → decision | 2–3 | PASS | Surface urgent event card at top of Staff |
| Accept a passion-project pitch | More → Studio Culture → Ambitions → pitch → accept | 4 | FAIL | Surface active pitches as actionable cards in Staff and as an Office alert; accept/decline in-place |
| Fund passion-project development | More → Studio Culture → Ambitions → pitch → fund | 4 | FAIL | Same contextual pitch card; no separate Ambitions visit required |
| Change working policy | More → Studio Culture → Working Policies → option → schedule | 4+ | FAIL | Put Working Policies as a direct More tile; one sheet with apply button |
| Start an overseas release | More → Studio Culture → Overseas → title/territory → sign | 4+ | FAIL | Add **OVERSEAS** action to released title cards; open preselected title in a bottom sheet |
| Negotiate an overseas edit | More → Studio Culture → Overseas/promise → negotiate | 4+ | FAIL | Put edit request directly on the affected title/promise card |
| Start staff mentorship/story response | Staff/Studio Culture → story inbox → choice | 3–4 | BORDERLINE | Put pending story choice on both people involved, with one shared response sheet |
| Build/upgrade facility | More/Facilities → room → build/upgrade | 3 | PASS | Contextual shortcut from features blocked by missing room |
| Relocate office | More → Relocate → confirm | 3 | PASS | Keep requirements visible before opening |
| Take/assign contract | More/Jobs/Contracts → contract → assign crew | 3–4 | BORDERLINE | Contract card should expand inline to crew selection, then start |
| Continue/reboot/spin-off an existing series | Series/Project card → continuation type → builder | 2–3 | PASS | Keep title-context shortcuts rather than central menus |

## Design rule for the next UX pass

1. **Context beats taxonomy.** If an action affects a project, put it on that project. If it affects a person, put it on that person. The central Studio Culture/More screens become dashboards and history, not mandatory action funnels.
2. **One sheet, one commitment.** A click may open a bottom sheet; the next click selects the target; the third commits. Avoid modal → tab → accordion → selector chains.
3. **Blocked actions should link to their remedy.** “Needs Research Lab”, “needs genre licence”, “needs creator approval”, etc. should be tappable shortcuts to the exact purchase/research/negotiation control.
4. **Urgent/eligible actions surface themselves.** Promises, pitches, staff stories, expiring rights, salary requests and overseas opportunities should create a contextual CTA where the player is already looking.
5. **Do not count meaningful creative decisions as navigation.** Building a show can involve many creative selections. The three-click rule is about getting to the relevant decision, not deleting game depth.

## Proposed implementation order

### Pass A — Staff and creator actions
- Surface passion pitches in Staff and the Office alert stack with Accept / Fund / Decline inline.
- Put recommended training and eligible department-head appointment directly in expanded employee cards.
- Put mentorship/story decisions on the relevant employee profiles.

### Pass B — Project-context commerce
- Add Overseas to released/airing project and Series cards, preselecting the title.
- Put overseas edit consent on the affected promise/project card.
- Make contract crew assignment inline on each contract card.

### Pass C — Smart shortcuts
- Add tappable remedies for locked research, facilities, formats and genre licences.
- Auto-focus the exact requirement when the destination opens.
- Add a small global **Action Centre** badge that aggregates only unresolved decisions, never routine menus.

### Acceptance test
For every player-facing command, record: start context, clicks to control, clicks to commit, and whether the route remains usable on a Pixel 9a portrait viewport. Any routine management goal above three clicks is treated as a UX regression.
`);

console.log('Applied promised creative lead quick action and three-click UX audit.');
