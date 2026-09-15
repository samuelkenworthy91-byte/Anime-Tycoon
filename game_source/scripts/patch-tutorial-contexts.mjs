import fs from 'node:fs';

function replaceOnce(src, find, repl, label) {
  if (!src.includes(find)) throw new Error(`Patch anchor not found: ${label}`);
  return src.replace(find, repl);
}

// Office: central first-use trigger hub for debt, dynasty and lightweight contextual guides.
{
  const path = 'src/components/Office.tsx';
  let s = fs.readFileSync(path, 'utf8');
  if (!s.includes('markTutorialSeen, tutorialSeen')) {
    s = replaceOnce(s,
      'import { Fragment, useMemo, useState } from "react";',
      'import { Fragment, useEffect, useMemo, useState } from "react";',
      'Office React import');
    s = replaceOnce(s,
      'import { resumeAuto, setDelegation, takeOver } from "../engine/automation";',
      'import { AUTO_MIN_OFFICE, resumeAuto, setDelegation, takeOver } from "../engine/automation";',
      'Office automation import');
    s = replaceOnce(s,
      'import { appointCreativeLead, expansionOf } from "../engine/studioExpansion";\n',
      'import { appointCreativeLead, expansionOf } from "../engine/studioExpansion";\nimport FirstSeenTutorial, { TutorialHelpButton } from "./FirstSeenTutorial";\nimport { markTutorialSeen, tutorialSeen, type TutorialId } from "../engine/tutorials";\n',
      'Office tutorial imports');
    s = replaceOnce(s,
      '  const [knowledge, setKnowledge] = useState<KnowledgeSelection>(null);',
      '  const [knowledge, setKnowledge] = useState<KnowledgeSelection>(null);\n  const [tutorial, setTutorial] = useState<TutorialId | null>(null);',
      'Office tutorial state');
    s = replaceOnce(s,
      '  const builtRooms = FACILITY_DEFS.filter((d) => (run.facilities[d.id] ?? 0) > 0);\n',
      `  const builtRooms = FACILITY_DEFS.filter((d) => (run.facilities[d.id] ?? 0) > 0);\n\n  useEffect(() => {\n    if (tutorial) return;\n    const unseen = (id: TutorialId) => !tutorialSeen(run, id);\n    if (run.cash < 0 && (run.negativeCashWeeks ?? 0) > 0 && unseen("financial-distress")) setTutorial("financial-distress");\n    else if (run.dynasty && unseen("dynasty-mode")) setTutorial("dynasty-mode");\n    else if (modal === "sequels" && Object.keys(run.franchises).length > 0 && unseen("franchise-library")) setTutorial("franchise-library");\n    else if (modal === "research" && run.showsMade > 0 && unseen("studio-knowledge")) setTutorial("studio-knowledge");\n    else if (modal === "projects" && run.officeLevel >= AUTO_MIN_OFFICE && unseen("auto-manage")) setTutorial("auto-manage");\n    else if (modal === "facilities" && run.showsMade > 0 && unseen("production-capability")) setTutorial("production-capability");\n  }, [modal, run.cash, run.negativeCashWeeks, run.dynasty, run.showsMade, run.officeLevel, run.franchises, run.tutorialsSeen, tutorial]);\n\n  const dismissTutorial = () => {\n    if (tutorial) setRun((r) => markTutorialSeen(r, tutorial));\n    setTutorial(null);\n  };\n`,
      'Office tutorial trigger');

    const helpBlocks = [
      ['<Modal title="STUDIO ROOMS" onClose={() => setModal(null)}>\n          <FacilitiesPanel', '<Modal title="STUDIO ROOMS" onClose={() => setModal(null)}>\n          <div className="mb-2 flex justify-end"><TutorialHelpButton onClick={() => setTutorial("production-capability")} /></div>\n          <FacilitiesPanel'],
      ['<Modal title="PROJECT BOARD" onClose={() => setModal(null)}>\n          <ProjectsPanel', '<Modal title="PROJECT BOARD" onClose={() => setModal(null)}>\n          {run.officeLevel >= AUTO_MIN_OFFICE && <div className="mb-2 flex justify-end"><TutorialHelpButton onClick={() => setTutorial("auto-manage")} /></div>}\n          <ProjectsPanel'],
      ['<Modal title="RESEARCH & DEVELOPMENT" onClose={() => setModal(null)}>\n          <div className="mb-3', '<Modal title="RESEARCH & DEVELOPMENT" onClose={() => setModal(null)}>\n          <div className="mb-2 flex justify-end"><TutorialHelpButton onClick={() => setTutorial("studio-knowledge")} /></div>\n          <div className="mb-3'],
      ['<Modal title="FRANCHISE LIBRARY" onClose={() => setModal(null)}>\n          <LibraryPanel', '<Modal title="FRANCHISE LIBRARY" onClose={() => setModal(null)}>\n          <div className="mb-2 flex justify-end"><TutorialHelpButton onClick={() => setTutorial("franchise-library")} /></div>\n          <LibraryPanel'],
      ['<Modal title="STUDIO DYNASTY" onClose={() => setModal(null)}>\n          <DynastyPanel', '<Modal title="STUDIO DYNASTY" onClose={() => setModal(null)}>\n          <div className="mb-2 flex justify-end"><TutorialHelpButton onClick={() => setTutorial("dynasty-mode")} /></div>\n          <DynastyPanel'],
    ];
    for (const [a,b] of helpBlocks) s = replaceOnce(s,a,b,`Office help ${a.slice(0,30)}`);

    const tail = '      {modal === "newproject" && (';
    // Global overlay should sit above every office modal/event.
    s = replaceOnce(s, tail, '      <FirstSeenTutorial id={tutorial ?? "financial-distress"} open={tutorial !== null} onDismiss={dismissTutorial} />\n\n' + tail, 'Office global tutorial overlay');
    fs.writeFileSync(path, s);
  }
}

// Rights Market: replay the full rights tutorial from the permanent market screen.
{
  const path = 'src/components/IPMarket.tsx';
  let s = fs.readFileSync(path, 'utf8');
  if (!s.includes('FirstSeenTutorial')) {
    s = replaceOnce(s,
      'import { CAPITAL_PROJECTS, buyCapitalProject, coProductionOffer, startCoProduction } from "../engine/spending";\n',
      'import { CAPITAL_PROJECTS, buyCapitalProject, coProductionOffer, startCoProduction } from "../engine/spending";\nimport FirstSeenTutorial, { TutorialHelpButton } from "./FirstSeenTutorial";\nimport { markTutorialSeen } from "../engine/tutorials";\n',
      'IPMarket tutorial imports');
    s = replaceOnce(s,
      '  const [confirmCommission, setConfirmCommission] = useState(false);',
      '  const [confirmCommission, setConfirmCommission] = useState(false);\n  const [help, setHelp] = useState(false);',
      'IPMarket help state');
    s = replaceOnce(s,
      '      <div className="mt-2 flex flex-wrap gap-2 text-[9px]">',
      '      <div className="mt-2"><TutorialHelpButton onClick={() => setHelp(true)} /></div>\n      <div className="mt-2 flex flex-wrap gap-2 text-[9px]">',
      'IPMarket help button');
    s = replaceOnce(s, '  return <div className="space-y-4">', '  return <><div className="space-y-4">', 'IPMarket fragment open');
    const end = '\n  </div>;\n}\n';
    if (!s.includes(end)) throw new Error('Patch anchor not found: IPMarket fragment close');
    s = s.replace(end, '\n  </div><FirstSeenTutorial id="rights-market" open={help} onDismiss={() => { setRun((r) => markTutorialSeen(r, "rights-market")); setHelp(false); }} /></>;\n}\n');
    fs.writeFileSync(path, s);
  }
}

// Staff cards: surface eligible head appointments on the person instead of forcing a separate department-head hunt.
{
  const path = 'src/components/Crew.tsx';
  let s = fs.readFileSync(path, 'utf8');
  if (!s.includes('quickHeadSlots')) {
    s = replaceOnce(s,
      '  const headSlot = (Object.entries(run.heads) as [HeadSlot, string][]).find(([, id]) => id === s.id)?.[0];',
      '  const headSlot = (Object.entries(run.heads) as [HeadSlot, string][]).find(([, id]) => id === s.id)?.[0];\n  const quickHeadSlots = (["writer", "animator", "composer", "production"] as HeadSlot[]).filter((slot) => !run.heads[slot] && !headBlockReason(run, slot, s.id));',
      'Crew quick head slots');
    s = replaceOnce(s,
      '      <AbilitySheet info={sheet} onClose={() => setSheet(null)} />\n\n      {open && (',
      `      <AbilitySheet info={sheet} onClose={() => setSheet(null)} />\n      {!headSlot && quickHeadSlots.length > 0 && (\n        <div className="mt-2 rounded-lg border border-gold/35 bg-gold/5 p-2">\n          <div className="text-[8px] font-black tracking-widest text-gold">HEAD VACANCY · ELIGIBLE NOW</div>\n          <div className="mt-1 flex flex-wrap gap-1">{quickHeadSlots.map((slot) => <Btn key={slot} variant="gold" className="!px-2 !py-1 text-[8px]" onClick={() => { sfx.fanfare(); setRun((r) => appointHead(r, slot, s.id) ?? r); }}><Crown size={9}/> APPOINT {HEAD_TITLES[slot].toUpperCase()}</Btn>)}</div>\n          <div className="mt-1 text-[7px] text-paper/40">Appointment applies the normal +25% head salary premium.</div>\n        </div>\n      )}\n\n      {open && (`,
      'Crew quick head actions');
    fs.writeFileSync(path, s);
  }
}

console.log('Tutorial context integration applied.');
