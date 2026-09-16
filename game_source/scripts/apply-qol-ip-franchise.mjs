import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
function replaceOnce(relativePath, before, after) {
  const path = resolve(root, relativePath);
  const source = readFileSync(path, "utf8");
  if (source.includes(after)) return false;
  if (!source.includes(before)) throw new Error(`IP/franchise patch anchor missing in ${relativePath}`);
  writeFileSync(path, source.replace(before, after));
  return true;
}
let changed = false;

/* ------------------------------------------------ licensed reboot recovery */
changed = replaceOnce(
  "src/components/LicensedCreate.tsx",
  'import { draftCost } from "../engine/projects";\nimport { arcLockReason, startBlockReason, type RunState } from "../engine/state";',
  'import { draftCost } from "../engine/projects";\nimport { continuationBlock } from "../engine/franchise";\nimport { arcLockReason, startBlockReason, type RunState } from "../engine/state";',
) || changed;

changed = replaceOnce(
  "src/components/LicensedCreate.tsx",
  ' const available=ip.availableArcs.filter(a=>(a.minAdaptations??0)<=contract.adaptations&&(!a.requiresSequelRights||contract.sequelRights));\n const learnedBlueprints=ARCS.filter(a=>a.unlock?.kind==="studioArc"&&!arcLockReason(a,run));\n const [arcId,setArcId]=useState(available[0]?.id??""); const [studioArcId,setStudioArcId]=useState(""); const [medium,setMedium]=useState<MediumId>(initialMedium); const [budget,setBudget]=useState<BudgetId>("standard"); const [scope,setScope]=useState<ScopeId>("standard"); const [sliders,setSliders]=useState<[number,number,number]>([50,50,50]);\n const draft=useMemo<Draft>(()=>({title:ip.title,medium,budget,scope,slot:slotForMedium(medium,"midnight"),animeType:ip.animeType,genres:ip.genreTags.slice(0,2),audience:ip.audience,protag:PROTAGONISTS[0].id,protagName:ip.characters[0].name,secondary:SECONDARY[0].id,pet:PETS[0].id,villain:VILLAINS[0].id,secondaryName:ip.characters[1].name,petName:ip.characters.find(c=>c.role==="mascot")?.name??"",villainName:ip.characters.find(c=>c.role==="antagonist")?.name??ip.characters[2].name,arcs:[studioArcId||"hook","finale"].filter(Boolean),sliders,season:contract.adaptations+1,franchiseKey:contract.adaptations?ip.title:undefined,continuation:contract.adaptations?"season":undefined,licensedIpId:ip.id,licensedArcId:arcId,licensedCharacters:ip.characters.map(c=>c.name)}),[ip,contract,arcId,studioArcId,medium,budget,scope,sliders]);',
  ' const available=ip.availableArcs.filter(a=>(a.minAdaptations??0)<=contract.adaptations&&(!a.requiresSequelRights||contract.sequelRights));\n const learnedBlueprints=ARCS.filter(a=>a.unlock?.kind==="studioArc"&&!arcLockReason(a,run));\n const franchise=run.franchises[ip.title];\n const continuationCtx={week:run.week,franchiseCount:Object.keys(run.franchises).length,officeLevel:run.officeLevel,projects:run.projects};\n const seasonBlock=contract.adaptations&&franchise?continuationBlock(franchise,"season",continuationCtx):null;\n const rebootBlock=contract.adaptations&&franchise?continuationBlock(franchise,"reboot",continuationCtx):null;\n const [continuation,setContinuation]=useState<"season"|"reboot">(()=>contract.adaptations&&seasonBlock?"reboot":"season");\n const [arcId,setArcId]=useState(available[0]?.id??""); const [studioArcId,setStudioArcId]=useState(""); const [medium,setMedium]=useState<MediumId>(initialMedium); const [budget,setBudget]=useState<BudgetId>("standard"); const [scope,setScope]=useState<ScopeId>("standard"); const [sliders,setSliders]=useState<[number,number,number]>([50,50,50]);\n const draft=useMemo<Draft>(()=>({title:ip.title,medium,budget,scope,slot:slotForMedium(medium,"midnight"),animeType:ip.animeType,genres:ip.genreTags.slice(0,2),audience:ip.audience,protag:PROTAGONISTS[0].id,protagName:ip.characters[0].name,secondary:SECONDARY[0].id,pet:PETS[0].id,villain:VILLAINS[0].id,secondaryName:ip.characters[1].name,petName:ip.characters.find(c=>c.role==="mascot")?.name??"",villainName:ip.characters.find(c=>c.role==="antagonist")?.name??ip.characters[2].name,arcs:[studioArcId||"hook","finale"].filter(Boolean),sliders,season:franchise?franchise.season+1:contract.adaptations+1,franchiseKey:contract.adaptations?ip.title:undefined,continuation:contract.adaptations?continuation:undefined,licensedIpId:ip.id,licensedArcId:arcId,licensedCharacters:ip.characters.map(c=>c.name)}),[ip,contract,franchise,continuation,arcId,studioArcId,medium,budget,scope,sliders]);',
) || changed;

changed = replaceOnce(
  "src/components/LicensedCreate.tsx",
  '<section className="space-y-3"><div className="ink-card p-3"><div className="text-[10px] font-black tracking-widest text-gold">PROPERTY ARC</div>',
  '<section className="space-y-3">{contract.adaptations>0&&franchise&&<div className="ink-card p-3"><div className="text-[10px] font-black tracking-widest text-gold">HOW TO RETURN TO THIS PROPERTY</div><div className="mt-1 text-[9px] text-paper/50">A direct continuation keeps the current canon. A reboot is a fresh adaptation of the same licensed property and remains available after a poor previous entry.</div><div className="mt-2 grid gap-2 sm:grid-cols-2"><button disabled={!!seasonBlock} onClick={()=>setContinuation("season")} className={cn("rounded-lg border p-2 text-left text-xs",continuation==="season"?"border-cyanx bg-cyanx/10":"border-line",seasonBlock&&"opacity-40")}><b>CONTINUE SERIES</b><div className="mt-1 text-[9px] text-paper/45">Season {franchise.season+1}{seasonBlock?` · ${seasonBlock}`:" · current canon continues"}</div></button><button disabled={!!rebootBlock} onClick={()=>setContinuation("reboot")} className={cn("rounded-lg border p-2 text-left text-xs",continuation==="reboot"?"border-gold bg-gold/10":"border-line",rebootBlock&&"opacity-40")}><b>REBOOT PROPERTY</b><div className="mt-1 text-[9px] text-paper/45">Fresh interpretation · same licence, genres and canonical cast{rebootBlock?` · ${rebootBlock}`:""}</div></button></div></div>}<div className="ink-card p-3"><div className="text-[10px] font-black tracking-widest text-gold">PROPERTY ARC</div>',
) || changed;

/* ---------------------------------------------------- quick true sequels */
changed = replaceOnce(
  "src/components/Projects.tsx",
  'import { SEQUEL_SCORE_THRESHOLD } from "../engine/franchise";',
  'import { SEQUEL_SCORE_THRESHOLD, continuationBlock } from "../engine/franchise";',
) || changed;

changed = replaceOnce(
  "src/components/Projects.tsx",
  '  const done = run.projects.filter((p) => p.stage === "done").slice(-4).reverse();\n  const fc = forecastWeek(run);',
  '  const done = run.projects.filter((p) => p.stage === "done").slice(-4).reverse();\n  const quickSequels = Object.values(run.franchises)\n    .filter((fr) => !continuationBlock(fr, "season", { week: run.week, franchiseCount: Object.keys(run.franchises).length, officeLevel: run.officeLevel, projects: run.projects }))\n    .sort((a, b) => b.lastEntryWeek - a.lastEntryWeek || b.lastScore - a.lastScore);\n  const fc = forecastWeek(run);',
) || changed;

changed = replaceOnce(
  "src/components/Projects.tsx",
  '      <StudioSlate run={run} />\n      <div className="flex items-center gap-2">',
  '      <StudioSlate run={run} />\n      {quickSequels.length > 0 && onContinueSeason && <section className="rounded-xl border border-gold/30 bg-gold/5 p-2.5"><div className="text-[9px] font-black tracking-[0.22em] text-gold">TRUE SEQUELS READY</div><div className="mt-1 text-[9px] text-paper/45">Only the latest eligible state of each series appears here. Reboots, spin-offs and sold properties stay in the Library.</div><div className="mt-2 space-y-1.5">{quickSequels.map((fr)=>{const latest=fr.entries[fr.entries.length-1];const ago=Math.max(0,run.week-fr.lastEntryWeek);return <div key={fr.key} className="flex items-center gap-2 rounded-lg border border-line bg-panel2/60 p-2"><div className="min-w-0 flex-1"><b className="block truncate text-xs">{fr.baseTitle}</b><div className="text-[9px] text-paper/45">Latest: {latest?.title??fr.baseTitle} · {ago} week{ago===1?"":"s"} ago · {fr.lastScore}/40</div></div><Btn variant="gold" className="!px-2 !py-1 text-[9px]" onClick={()=>onContinueSeason(fr.key)}>SEASON {fr.season+1}</Btn></div>})}</div></section>}\n      <div className="flex items-center gap-2">',
) || changed;

/* --------------------------------------------------- renewal visibility */
changed = replaceOnce(
  "src/components/IPMarket.tsx",
  'import { IP_AUTO_RENEW_HEADROOM, ipRenewalQuote, renewIPContract, setIPAutoRenew } from "../engine/ipRenewal";',
  'import { IP_AUTO_RENEW_HEADROOM, IP_RENEWAL_WINDOW_WEEKS, ipRenewalQuote, renewIPContract, setIPAutoRenew } from "../engine/ipRenewal";',
) || changed;
changed = replaceOnce(
  "src/components/IPMarket.tsx",
  '            {renewal?.available && <div className={cn("mt-2 rounded-lg border p-2", expired ? "border-neon/35 bg-neon/5" : "border-gold/25 bg-gold/5")}>',
  '            {renewal && !renewal.available && !expired && <div className="mt-2 rounded-lg border border-line bg-panel2/55 p-2 text-[9px] text-paper/55"><b className="text-cyanx">LICENCE EXTENSION</b> · {remaining} weeks remain. Extension window opens in <b>{Math.max(0,remaining-IP_RENEWAL_WINDOW_WEEKS)} week{Math.max(0,remaining-IP_RENEWAL_WINDOW_WEEKS)===1?"":"s"}</b>. You can enable renewal once the property enters its final {IP_RENEWAL_WINDOW_WEEKS} weeks.</div>}\n            {renewal?.available && <div className={cn("mt-2 rounded-lg border p-2", expired ? "border-neon/35 bg-neon/5" : "border-gold/25 bg-gold/5")}>',
) || changed;

console.log(changed ? "Licensed IP / franchise QoL patches applied." : "Licensed IP / franchise patches already present.");
