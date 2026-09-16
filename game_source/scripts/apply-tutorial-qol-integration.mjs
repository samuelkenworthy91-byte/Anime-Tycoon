import fs from "node:fs";

function patch(path, fn) {
  const before = fs.readFileSync(path, "utf8");
  const after = fn(before);
  if (after !== before) fs.writeFileSync(path, after);
}
function once(src, find, repl, label) {
  if (src.includes(repl)) return src;
  if (!src.includes(find)) throw new Error(`Tutorial/QoL patch anchor missing: ${label}`);
  return src.replace(find, repl);
}

patch("src/components/Office.tsx", (input) => {
  let s = input;
  s = once(s, 'import { Fragment, useMemo, useState } from "react";', 'import { Fragment, useEffect, useMemo, useState } from "react";', "Office React import");
  s = once(s, 'import { resumeAuto, setDelegation, takeOver } from "../engine/automation";', 'import { AUTO_MIN_OFFICE, resumeAuto, setDelegation, takeOver } from "../engine/automation";', "Office automation import");
  s = once(s, 'import { appointCreativeLead, expansionOf } from "../engine/studioExpansion";\n', 'import { appointCreativeLead, expansionOf } from "../engine/studioExpansion";\nimport FirstSeenTutorial, { TutorialHelpButton } from "./FirstSeenTutorial";\nimport { markTutorialSeen, tutorialSeen, type TutorialId } from "../engine/tutorials";\n', "Office tutorial imports");
  s = once(s, '  const [knowledge, setKnowledge] = useState<KnowledgeSelection>(null);', '  const [knowledge, setKnowledge] = useState<KnowledgeSelection>(null);\n  const [tutorial, setTutorial] = useState<TutorialId | null>(null);', "Office tutorial state");
  s = once(s, '  const builtRooms = FACILITY_DEFS.filter((d) => (run.facilities[d.id] ?? 0) > 0);\n', `  const builtRooms = FACILITY_DEFS.filter((d) => (run.facilities[d.id] ?? 0) > 0);\n\n  useEffect(() => {\n    if (tutorial) return;\n    const unseen = (id: TutorialId) => !tutorialSeen(run, id);\n    if (run.cash < 0 && (run.negativeCashWeeks ?? 0) > 0 && unseen("financial-distress")) setTutorial("financial-distress");\n    else if (run.dynasty && unseen("dynasty-mode")) setTutorial("dynasty-mode");\n    else if (modal === "sequels" && Object.keys(run.franchises).length > 0 && unseen("franchise-library")) setTutorial("franchise-library");\n    else if (modal === "research" && run.showsMade > 0 && unseen("studio-knowledge")) setTutorial("studio-knowledge");\n    else if (modal === "projects" && run.officeLevel >= AUTO_MIN_OFFICE && unseen("auto-manage")) setTutorial("auto-manage");\n    else if (modal === "facilities" && run.showsMade > 0 && unseen("production-capability")) setTutorial("production-capability");\n  }, [modal, run.cash, run.negativeCashWeeks, run.dynasty, run.showsMade, run.officeLevel, run.franchises, run.tutorialsSeen, tutorial]);\n\n  const dismissTutorial = () => {\n    if (tutorial) setRun((r) => markTutorialSeen(r, tutorial));\n    setTutorial(null);\n  };\n`, "Office tutorial triggers");
  const helps = [
    ['<Modal title="STUDIO ROOMS" onClose={() => setModal(null)}>\n          <FacilitiesPanel', '<Modal title="STUDIO ROOMS" onClose={() => setModal(null)}>\n          <div className="mb-2 flex justify-end"><TutorialHelpButton onClick={() => setTutorial("production-capability")} /></div>\n          <FacilitiesPanel'],
    ['<Modal title="PROJECT BOARD" onClose={() => setModal(null)}>\n          <ProjectsPanel', '<Modal title="PROJECT BOARD" onClose={() => setModal(null)}>\n          {run.officeLevel >= AUTO_MIN_OFFICE && <div className="mb-2 flex justify-end"><TutorialHelpButton onClick={() => setTutorial("auto-manage")} /></div>}\n          <ProjectsPanel'],
    ['<Modal title="RESEARCH & DEVELOPMENT" onClose={() => setModal(null)}>\n          <div className="mb-3', '<Modal title="RESEARCH & DEVELOPMENT" onClose={() => setModal(null)}>\n          <div className="mb-2 flex justify-end"><TutorialHelpButton onClick={() => setTutorial("studio-knowledge")} /></div>\n          <div className="mb-3'],
    ['<Modal title="FRANCHISE LIBRARY" onClose={() => setModal(null)}>\n          <LibraryPanel', '<Modal title="FRANCHISE LIBRARY" onClose={() => setModal(null)}>\n          <div className="mb-2 flex justify-end"><TutorialHelpButton onClick={() => setTutorial("franchise-library")} /></div>\n          <LibraryPanel'],
    ['<Modal title="STUDIO DYNASTY" onClose={() => setModal(null)}>\n          <DynastyPanel', '<Modal title="STUDIO DYNASTY" onClose={() => setModal(null)}>\n          <div className="mb-2 flex justify-end"><TutorialHelpButton onClick={() => setTutorial("dynasty-mode")} /></div>\n          <DynastyPanel'],
  ];
  for (const [a,b] of helps) s = once(s,a,b,`Office help ${a.slice(0,26)}`);
  s = once(s, '      {modal === "newproject" && (', '      <FirstSeenTutorial id={tutorial ?? "financial-distress"} open={tutorial !== null} onDismiss={dismissTutorial} />\n\n      {modal === "newproject" && (', "Office tutorial overlay");
  return s;
});

patch("src/components/StudioExpansionPanel.tsx", (input) => {
  let s = input;
  s = once(s, 'import { StaffStoryInbox } from "./StaffCultureProfile";\nimport { useState } from "react";', 'import { StaffStoryInbox } from "./StaffCultureProfile";\nimport FirstSeenTutorial, { TutorialHelpButton } from "./FirstSeenTutorial";\nimport { markTutorialSeen, tutorialSeen, type TutorialId } from "../engine/tutorials";\nimport { useEffect, useState } from "react";', "Expansion tutorial imports");
  s = once(s, 'export default function StudioExpansionPanel(props: Props) {\n  const [tab, setTab] = useState<"staff" | "policies" | "overseas">("staff");', `export default function StudioExpansionPanel(props: Props) {\n  const { run, setRun } = props;\n  const [tab, setTab] = useState<"staff" | "policies" | "overseas">("staff");\n  const [tutorial, setTutorial] = useState<TutorialId | null>(null);\n  const expansion = expansionOf(run);\n  const hasCreatorCommitment = expansion.pitches.some((p) => !["declined", "accepted"].includes(p.status)) || expansion.promises.some((p) => p.status === "active");\n  const tabTutorial: TutorialId = tab === "staff" ? "passion-projects" : tab === "policies" ? "working-policies" : "overseas-markets";\n  useEffect(() => {\n    if (tab === "staff" && !hasCreatorCommitment) return;\n    if (!tutorial && !tutorialSeen(run, tabTutorial)) setTutorial(tabTutorial);\n  }, [tab, tabTutorial, hasCreatorCommitment, run.tutorialsSeen, tutorial]);\n  const dismissTutorial = () => { if (tutorial) setRun((r) => markTutorialSeen(r, tutorial)); setTutorial(null); };`, "Expansion tutorial state");
  s = once(s, '      <div\n        className="flex flex-wrap gap-2"\n        aria-label="Studio expansion sections"\n      >', '      <div className="flex items-start justify-between gap-2"><div\n        className="flex flex-1 flex-wrap gap-2"\n        aria-label="Studio expansion sections"\n      >', "Expansion tabs wrapper");
  s = once(s, '        ))}\n      </div>\n      {tab === "staff" ? (', '        ))}\n      </div><TutorialHelpButton onClick={() => setTutorial(tabTutorial)} /></div>\n      {tab === "staff" ? (', "Expansion help button");
  s = once(s, '      )}\n    </div>\n  );\n}\nfunction StaffAmbitions', '      )}\n      <FirstSeenTutorial id={tutorial ?? tabTutorial} open={tutorial !== null} onDismiss={dismissTutorial} />\n    </div>\n  );\n}\nfunction StaffAmbitions', "Expansion tutorial overlay");
  return s;
});

patch("src/components/IPMarket.tsx", (input) => {
  let s = input;
  s = once(s, 'import { CAPITAL_PROJECTS, buyCapitalProject, coProductionOffer, startCoProduction } from "../engine/spending";\n', 'import { CAPITAL_PROJECTS, buyCapitalProject, coProductionOffer, startCoProduction } from "../engine/spending";\nimport FirstSeenTutorial, { TutorialHelpButton } from "./FirstSeenTutorial";\nimport { markTutorialSeen } from "../engine/tutorials";\n', "IP market tutorial imports");
  s = once(s, '  const [confirmCommission, setConfirmCommission] = useState(false);', '  const [confirmCommission, setConfirmCommission] = useState(false);\n  const [help, setHelp] = useState(false);', "IP market help state");
  s = once(s, '  return <div className="space-y-4">', '  return <><div className="space-y-4">', "IP market fragment open");
  s = once(s, '      <div className="mt-2 flex flex-wrap gap-2 text-[9px]">', '      <div className="mt-2"><TutorialHelpButton onClick={() => setHelp(true)} /></div>\n      <div className="mt-2 flex flex-wrap gap-2 text-[9px]">', "IP market help button");
  const end = '\n  </div>;\n}\n';
  const replacement = '\n  </div><FirstSeenTutorial id="rights-market" open={help} onDismiss={() => { setRun((r) => markTutorialSeen(r, "rights-market")); setHelp(false); }} /></>;\n}\n';
  if (!s.includes(replacement)) {
    if (!s.includes(end)) throw new Error("Tutorial/QoL patch anchor missing: IP market fragment close");
    s = s.replace(end, replacement);
  }
  return s;
});

patch("src/components/AuctionForecast.tsx", (input) => {
  let s = input;
  s = once(s, 'import { Gavel, SkipForward, X } from "lucide-react";', 'import { useEffect, useState } from "react";\nimport { Gavel, SkipForward, X } from "lucide-react";', "Auction React imports");
  s = once(s, 'import { dismissAuctionPrompt, genreLabel, ipById, skipAuctionOpportunity, SOURCE_LABEL, type IPAuction } from "../engine/ip";', 'import { dismissAuctionPrompt, genreLabel, ipById, skipAuctionOpportunity, SOURCE_LABEL } from "../engine/ip";', "Auction remove stale type");
  s = once(s, 'import type { RunState } from "../engine/state";\n', 'import type { RunState } from "../engine/state";\nimport FirstSeenTutorial, { TutorialHelpButton } from "./FirstSeenTutorial";\nimport { markTutorialSeen, tutorialSeen } from "../engine/tutorials";\n', "Auction tutorial imports");
  s = once(s, '  const id=run.ipMarket.pendingPromptId; const auction=id?run.ipMarket.auctions.find(a=>a.id===id):null; const ip=auction?ipById(auction.ipId):null; if(!auction||!ip)return null;', '  const id=run.ipMarket.pendingPromptId; const auction=id?run.ipMarket.auctions.find(a=>a.id===id):null; const ip=auction?ipById(auction.ipId):null;\n  const [help,setHelp]=useState(false);\n  useEffect(()=>{ if(auction&&!tutorialSeen(run,"rights-market")) setHelp(true); },[auction?.id,run.tutorialsSeen]);\n  if(!auction||!ip)return null;\n  const dismissHelp=()=>{setRun(r=>markTutorialSeen(r,"rights-market"));setHelp(false);};', "Auction first-seen trigger");
  s = once(s, '  return <div className="fixed inset-0 z-[95]', '  return <><div className="fixed inset-0 z-[95]', "Auction fragment open");
  s = once(s, 'A rare IP rights room has opened. Auction opportunities can occur at most once per industry year.</div></div><div className="ink-card', 'A rare IP rights room has opened. Auction opportunities can occur at most once per industry year.</div><div className="mt-2 flex justify-center"><TutorialHelpButton onClick={()=>setHelp(true)}/></div></div><div className="ink-card', "Auction help button");
  s = once(s, '</div></div></div>;\n}', '</div></div></div><FirstSeenTutorial id="rights-market" open={help} onDismiss={dismissHelp} priority="auction" /></>;\n}', "Auction tutorial overlay");
  return s;
});

patch("src/components/Crew.tsx", (input) => {
  let s = input;
  s = once(s, '  const headSlot = (Object.entries(run.heads) as [HeadSlot, string][]).find(([, id]) => id === s.id)?.[0];', '  const headSlot = (Object.entries(run.heads) as [HeadSlot, string][]).find(([, id]) => id === s.id)?.[0];\n  const quickHeadSlots = (["writer", "animator", "composer", "production"] as HeadSlot[]).filter((slot) => !run.heads[slot] && !headBlockReason(run, slot, s.id));', "Crew head vacancy calculation");
  s = once(s, '      <AbilitySheet info={sheet} onClose={() => setSheet(null)} />\n\n      {open && (', '      <AbilitySheet info={sheet} onClose={() => setSheet(null)} />\n      {!headSlot && quickHeadSlots.length > 0 && (\n        <div className="mt-2 rounded-lg border border-gold/35 bg-gold/5 p-2">\n          <div className="text-[8px] font-black tracking-widest text-gold">HEAD VACANCY · ELIGIBLE NOW</div>\n          <div className="mt-1 flex flex-wrap gap-1">{quickHeadSlots.map((slot) => <Btn key={slot} variant="gold" className="!px-2 !py-1 text-[8px]" onClick={() => { sfx.fanfare(); setRun((r) => appointHead(r, slot, s.id) ?? r); }}><Crown size={9}/> APPOINT {HEAD_TITLES[slot].toUpperCase()}</Btn>)}</div>\n          <div className="mt-1 text-[7px] text-paper/40">Appointment applies the normal +25% head salary premium.</div>\n        </div>\n      )}\n\n      {open && (', "Crew head vacancy actions");
  return s;
});

console.log("Tutorial/QoL integration applied without replacing current QoL flows.");
