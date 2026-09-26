import { boostAudienceProfile, type AudienceSegmentId } from "./audienceSegments";
import { merchValueOf, type Franchise } from "./franchise";
import type { RunState } from "./state";

export interface FanProjectDef {
  id: string;
  name: string;
  cost: number;
  weeks: number;
  targets: AudienceSegmentId[];
  fandom: number;
  profileShift: number;
  fans: number;
  popularity: number;
  fatigue: number;
  description: string;
}

export const FAN_PROJECTS: FanProjectDef[] = [
  { id:"creator_qa", name:"Creator Q&A Night", cost:25_000, weeks:2, targets:["core","prestige"], fandom:5, profileShift:2, fans:700, popularity:1, fatigue:0, description:"A small live conversation for the people already paying attention." },
  { id:"fan_art", name:"Fan Art Competition", cost:35_000, weeks:2, targets:["online","core"], fandom:6, profileShift:3, fans:1_200, popularity:1, fatigue:1, description:"Commission prizes and feature community artists across studio channels." },
  { id:"popup_cafe", name:"Pop-up Café", cost:45_000, weeks:3, targets:["casual","online"], fandom:7, profileShift:3, fans:1_600, popularity:2, fatigue:2, description:"A short themed café run: fun, visible and deliberately not a giant profit centre." },
  { id:"charity", name:"Charity Collaboration", cost:50_000, weeks:3, targets:["casual","prestige"], fandom:6, profileShift:3, fans:1_700, popularity:1, fatigue:0, description:"A limited collaboration that makes the property visible for a reason beyond sales." },
  { id:"cosplay", name:"Cosplay Showcase", cost:60_000, weeks:3, targets:["online","collectors"], fandom:8, profileShift:4, fans:2_000, popularity:2, fatigue:2, description:"Fund makers, prizes and a studio-hosted showcase." },
  { id:"art_book", name:"Limited Art Book", cost:80_000, weeks:4, targets:["core","collectors"], fandom:9, profileShift:4, fans:1_300, popularity:2, fatigue:1, description:"A deliberately small print run for the faithful and collectors." },
  { id:"vinyl", name:"Soundtrack Vinyl Run", cost:95_000, weeks:4, targets:["collectors","core"], fandom:9, profileShift:4, fans:1_500, popularity:2, fatigue:1, description:"Press a beautiful physical soundtrack instead of another generic ad buy." },
  { id:"gallery", name:"Production Art Exhibition", cost:110_000, weeks:5, targets:["prestige","collectors"], fandom:10, profileShift:5, fans:2_200, popularity:2, fatigue:1, description:"Storyboards, layouts and production material presented as craft." },
  { id:"screening_tour", name:"Director Screening Tour", cost:120_000, weeks:5, targets:["prestige","core"], fandom:10, profileShift:5, fans:2_800, popularity:3, fatigue:1, description:"Small screenings followed by creator talks in several cities." },
  { id:"web_short", name:"Free Web Short", cost:150_000, weeks:6, targets:["online","casual"], fandom:12, profileShift:6, fans:4_000, popularity:4, fatigue:3, description:"A tiny original side story released free. Expensive for the return, memorable for the fandom." },
];

export type FanProjectTwist = "normal" | "viral" | "quiet";
export interface ActiveFanProject { id:string; defId:string; franchiseKey:string; startedWeek:number; endsWeek:number; twist:FanProjectTwist; }
export interface FanProjectHistory { id:string; defId:string; franchiseKey:string; completedWeek:number; twist:FanProjectTwist; fans:number; }
export interface FanProjectState {
  active: ActiveFanProject[];
  history: FanProjectHistory[];
  fandom: Record<string, Partial<Record<AudienceSegmentId, number>>>;
}
declare module "./state" { interface RunState { fanProjects?: FanProjectState; } }

export const fanProjectStateOf = (run: Pick<RunState,"fanProjects">): FanProjectState => ({
  active:[...(run.fanProjects?.active ?? [])],
  history:[...(run.fanProjects?.history ?? [])],
  fandom:Object.fromEntries(Object.entries(run.fanProjects?.fandom ?? {}).map(([key,value])=>[key,{...value}])),
});
export const fanProjectCapacity = (run: Pick<RunState,"officeLevel">) => 1 + (run.officeLevel >= 2 ? 1 : 0) + (run.officeLevel >= 4 ? 1 : 0);
export const fanProjectDef = (id:string) => FAN_PROJECTS.find((def)=>def.id===id) ?? null;
export const franchiseFandom = (run: Pick<RunState,"fanProjects">, key:string) => ({ ...(run.fanProjects?.fandom?.[key] ?? {}) });

function hash32(text:string){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
const twistFor=(id:string):FanProjectTwist=>{const n=hash32(id)%100;return n<15?"viral":n<30?"quiet":"normal";};

export function fanProjectBlock(run: RunState, franchiseKey:string, defId:string): string | null {
  const state=fanProjectStateOf(run), fr=run.franchises[franchiseKey], def=fanProjectDef(defId);
  if(!fr || fr.soldTo) return "You no longer control this franchise";
  if(!def) return "Unknown fan project";
  if(state.active.length>=fanProjectCapacity(run)) return `Fan Projects full (${state.active.length}/${fanProjectCapacity(run)})`;
  if(state.active.some((job)=>job.franchiseKey===franchiseKey)) return "This franchise already has an active Fan Project";
  if(run.cash<def.cost) return "Not enough cash";
  return null;
}

export function startFanProject(run: RunState, franchiseKey:string, defId:string): RunState | null {
  const block=fanProjectBlock(run,franchiseKey,defId), def=fanProjectDef(defId);
  if(block || !def) return null;
  const state=fanProjectStateOf(run), id=`fan:${franchiseKey}:${defId}:${run.week}`;
  const job:ActiveFanProject={id,defId,franchiseKey,startedWeek:run.week,endsWeek:run.week+def.weeks,twist:twistFor(id)};
  return {
    ...run,
    cash:run.cash-def.cost,
    fanProjects:{...state,active:[...state.active,job]},
    strategicSpend:[...run.strategicSpend,{id,label:`Fan Project · ${def.name}`,amount:def.cost,week:run.week}],
    notices:[...run.notices,`🎪 FAN PROJECT: ${def.name} begins for “${run.franchises[franchiseKey].baseTitle}” (−£${def.cost.toLocaleString("en-GB")}, ${def.weeks} weeks).`].slice(-40),
  };
}

export function advanceFanProjects(run: RunState): RunState {
  const state=fanProjectStateOf(run), due=state.active.filter((job)=>job.endsWeek<=run.week);
  if(!due.length) return run;
  let fans=run.fans;
  const franchises={...run.franchises}, fandom={...state.fandom}, profiles={...(run.franchiseAudienceProfiles ?? {})}, notices=[...run.notices], history=[...state.history];
  for(const job of due){
    const def=fanProjectDef(job.defId), fr=franchises[job.franchiseKey];
    if(!def || !fr) continue;
    const mult=job.twist==="viral"?1.75:job.twist==="quiet"?0.65:1;
    const fanGain=Math.max(0,Math.round(def.fans*mult));
    const popGain=Math.max(0,Math.round(def.popularity*(job.twist==="viral"?1.5:job.twist==="quiet"?0.5:1)));
    fans+=fanGain;
    const next:Franchise={...fr,popularity:Math.min(100,fr.popularity+popGain),fatigue:Math.min(100,fr.fatigue+def.fatigue),lifetimeFans:fr.lifetimeFans+fanGain};
    next.merchValue=merchValueOf(next);
    franchises[job.franchiseKey]=next;
    const row={...(fandom[job.franchiseKey] ?? {})};
    for(const target of def.targets) row[target]=Math.min(100,(row[target] ?? 0)+Math.round(def.fandom*mult));
    fandom[job.franchiseKey]=row;
    profiles[job.franchiseKey]=boostAudienceProfile(profiles[job.franchiseKey],def.targets,Math.max(1,Math.round(def.profileShift*mult))) ?? profiles[job.franchiseKey];
    history.push({id:job.id,defId:job.defId,franchiseKey:job.franchiseKey,completedWeek:run.week,twist:job.twist,fans:fanGain});
    notices.push(`🎉 ${def.name} finishes for “${fr.baseTitle}”: +${fanGain.toLocaleString("en-GB")} fans · +${popGain} popularity · ${def.targets.join(" + ")} fandom${job.twist==="viral"?" · it went viral":job.twist==="quiet"?" · quiet turnout":""}.`);
  }
  return {...run,fans,franchises,franchiseAudienceProfiles:profiles,fanProjects:{active:state.active.filter((job)=>job.endsWeek>run.week),history:history.slice(-80),fandom},notices:notices.slice(-40)};
}
