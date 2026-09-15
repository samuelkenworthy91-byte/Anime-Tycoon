import fs from 'node:fs';

function replaceOnce(source, find, replacement, label) {
  if (!source.includes(find)) throw new Error(`Patch anchor not found: ${label}`);
  return source.replace(find, replacement);
}

const panelPath = 'src/components/StudioExpansionPanel.tsx';
let panel = fs.readFileSync(panelPath, 'utf8');
if (!panel.includes('FirstSeenTutorial')) {
  panel = replaceOnce(panel, 'import { useState } from "react";', 'import { useEffect, useState } from "react";', 'React imports');
  const anchor = 'import { StaffStoryInbox } from "./StaffCultureProfile";\n';
  panel = replaceOnce(
    panel,
    anchor,
    anchor + 'import FirstSeenTutorial, { TutorialHelpButton } from "./FirstSeenTutorial";\nimport { markTutorialSeen, tutorialSeen, type TutorialId } from "../engine/tutorials";\n',
    'tutorial imports',
  );
  const oldBlock = `export default function StudioExpansionPanel(props: Props) {
  const [tab, setTab] = useState<"staff" | "policies" | "overseas">("staff");
  return (
    <div className="space-y-4 text-sm">
      <div
        className="flex flex-wrap gap-2"
        aria-label="Studio expansion sections"
      >
        {(["staff", "policies", "overseas"] as const).map((t) => (
          <button
            key={t}
            className={button + (t === tab ? " text-gold" : "")}
            aria-pressed={t === tab}
            onClick={() => setTab(t)}
          >
            {t === "staff"
              ? "AMBITIONS"
              : t === "policies"
                ? "WORKING POLICIES"
                : "OVERSEAS MARKETS"}
          </button>
        ))}
      </div>
      {tab === "staff" ? (
        <StaffAmbitions {...props} />
      ) : tab === "policies" ? (
        <PolicyPanel {...props} />
      ) : (
        <OverseasPanel {...props} />
      )}
    </div>
  );
}
`;
  const newBlock = `export default function StudioExpansionPanel(props: Props) {
  const { run, setRun } = props;
  const [tab, setTab] = useState<"staff" | "policies" | "overseas">("staff");
  const [tutorial, setTutorial] = useState<TutorialId | null>(null);
  const expansion = expansionOf(run);
  const hasCreatorCommitment =
    expansion.pitches.some((p) => !["declined", "accepted"].includes(p.status)) ||
    expansion.promises.some((p) => p.status === "active");
  const tabTutorial: TutorialId =
    tab === "staff" ? "passion-projects" :
    tab === "policies" ? "working-policies" : "overseas-markets";

  useEffect(() => {
    if (tab === "staff" && !hasCreatorCommitment) return;
    if (!tutorialSeen(run, tabTutorial)) setTutorial(tabTutorial);
  }, [tab, tabTutorial, hasCreatorCommitment, run.tutorialsSeen]);

  const dismissTutorial = () => {
    if (tutorial) setRun((r) => markTutorialSeen(r, tutorial));
    setTutorial(null);
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 flex-wrap gap-2" aria-label="Studio expansion sections">
          {(["staff", "policies", "overseas"] as const).map((t) => (
            <button
              key={t}
              className={button + (t === tab ? " text-gold" : "")}
              aria-pressed={t === tab}
              onClick={() => setTab(t)}
            >
              {t === "staff"
                ? "AMBITIONS"
                : t === "policies"
                  ? "WORKING POLICIES"
                  : "OVERSEAS MARKETS"}
            </button>
          ))}
        </div>
        <TutorialHelpButton onClick={() => setTutorial(tabTutorial)} />
      </div>
      {tab === "staff" ? (
        <StaffAmbitions {...props} />
      ) : tab === "policies" ? (
        <PolicyPanel {...props} />
      ) : (
        <OverseasPanel {...props} />
      )}
      <FirstSeenTutorial id={tutorial ?? tabTutorial} open={tutorial !== null} onDismiss={dismissTutorial} />
    </div>
  );
}
`;
  panel = replaceOnce(panel, oldBlock, newBlock, 'StudioExpansionPanel body');
  fs.writeFileSync(panelPath, panel);
}

const auditPath = 'docs/THREE_CLICK_UX_AUDIT.md';
let audit = fs.readFileSync(auditPath, 'utf8');
const marker = '## Proposed implementation order\n';
const rule = `## First-seen tutorial fallback\n\nIf a routine system still legitimately takes more than three navigation/action clicks after streamlining, its first real encounter must open a short player-facing tutorial. The tutorial must use visual screen previews of the actual controls, show no more than three numbered steps, explain the consequence of the final action, appear only once per save, and remain replayable from a **HOW THIS WORKS** button on that page. Tutorials support complexity; they do not excuse avoidable menu depth.\n\nThe first covered systems are Passion Projects, Working Policies and Overseas Markets, because the current audit identifies those as the clearest 4+ click flows.\n\n`;
if (!audit.includes('## First-seen tutorial fallback')) {
  audit = replaceOnce(audit, marker, rule + marker, 'audit tutorial rule');
  fs.writeFileSync(auditPath, audit);
}
