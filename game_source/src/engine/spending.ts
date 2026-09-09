import type { PointType } from "./data";
import type { Project, ProjectStage } from "./projects";
import type { RunState } from "./state";

export interface InterventionDef { id:string; name:string; cost:number; stages:ProjectStage[]; description:string; point?:PointType; points?:number; issueDelta?:number; hype?:number; days?:number; risk:number; }
export const INTERVENTIONS:InterventionDef[]=[
 {id:"writing_overhaul",name:"Writing Room Overhaul",cost:38_000,stages:["concept","preprod"],description:"Rebuild weak structure; may create continuity notes.",point:"story",points:34,issueDelta:1,risk:.2},
 {id:"animation_pass",name:"Extra Animation Pass",cost:65_000,stages:["animation","post"],description:"Target key sequences, not the whole show.",point:"art",points:38,issueDelta:-1,risk:.12},
 {id:"retakes",name:"Retakes / Reshoots",cost:52_000,stages:["sound","post"],description:"Repair performances at schedule cost.",point:"sound",points:28,issueDelta:-1,days:7,risk:.1},
 {id:"soundtrack",name:"Soundtrack Enhancement",cost:45_000,stages:["sound","post"],description:"Commission a specialist suite.",point:"sound",points:32,risk:.08},
 {id:"schedule",name:"Schedule Extension",cost:22_000,stages:["concept","preprod","animation","sound","post"],description:"Buy two weeks; hype cools while rivals keep moving.",days:14,hype:-6,risk:0},
 {id:"consultant",name:"Specialist Consultant",cost:30_000,stages:["concept","preprod","animation"],description:"Reduce adaptation/technical mistakes; imperfect advice.",points:18,issueDelta:-2,risk:.18},
 {id:"continuity",name:"Continuity Repair",cost:48_000,stages:["post","marketing"],description:"Expensive surgery for accumulated notes.",point:"story",points:15,issueDelta:-4,risk:.08},
 {id:"crunch",name:"Executive Crunch",cost:18_000,stages:["animation","sound","post"],description:"Fast output with a real chance of more errors.",points:26,issueDelta:2,risk:.4},
 {id:"final_polish",name:"Final Polish Pass",cost:72_000,stages:["post","marketing","ready"],description:"Diminishing returns; cannot fix a broken foundation.",points:22,issueDelta:-2,risk:.1},
];
export function interventionBlock(run:RunState,p:Project,d:InterventionDef):string|null {if(p.stage==="airing"||p.stage==="done")return "Already released";if(!d.stages.includes(p.stage))return `Only during ${d.stages.join("/")}`;if(run.cash<d.cost)return "Not enough cash";if((p.interventions??[]).includes(d.id))return "Already used";return null;}
export function applyIntervention(run:RunState,projectId:string,id:string,rng=Math.random):RunState|null {const d=INTERVENTIONS.find(x=>x.id===id),p=run.projects.find(x=>x.id===projectId);if(!d||!p||interventionBlock(run,p,d))return null;const success=rng()>=d.risk;const point=d.point??(["story","art","sound"] as PointType[])[Math.floor(rng()*3)];const gain=success?(d.points??0):Math.round((d.points??0)*.25);const updated:Project={...p,points:{...p.points,[point]:p.points[point]+gain},issues:Math.max(0,p.issues+(d.issueDelta??0)+(success?0:1)),hype:Math.max(0,p.hype+(d.hype??0)),deadlineDay:(p.deadlineDay??p.deadlineWeek*7)+(d.days??0),deadlineWeek:p.deadlineWeek+Math.ceil((d.days??0)/7),spent:p.spent+d.cost,interventions:[...(p.interventions??[]),d.id]};return {...run,cash:run.cash-d.cost,projects:run.projects.map(x=>x.id===projectId?updated:x),strategicSpend:[...run.strategicSpend,{id:`int_${run.week}_${projectId}_${id}`,label:d.name,amount:d.cost,week:run.week,projectId}],notices:[...run.notices,`${success?"✅":"⚠️"} ${d.name} on “${p.draft.title}”: ${success?`+${gain} ${point}`:"limited improvement and an extra note"} (−£${d.cost.toLocaleString("en-GB")}).`]};}

export interface CapitalDef {id:string;name:string;cost:number;minOffice:number;description:string;}
export const CAPITAL_PROJECTS:CapitalDef[]=[
 {id:"screening_theatre",name:"Private Screening Theatre",cost:1_500_000,minOffice:2,description:"Unlocks prestige test-screening events."},
 {id:"mocap_stage",name:"Performance Capture Stage",cost:18_000_000,minOffice:3,description:"Unlocks specialist animation rescue options."},
 {id:"orchestra_hall",name:"Orchestral Recording Hall",cost:42_000_000,minOffice:4,description:"Unlocks international soundtrack events."},
 {id:"global_merch",name:"Global Merch Centre",cost:120_000_000,minOffice:4,description:"Expands inventory capacity and global rights events."},
 {id:"convention_venue",name:"Exhibition & Convention Venue",cost:480_000_000,minOffice:4,description:"Hosts owned fan events and late-game premieres."},
 {id:"flagship_hq",name:"Global Flagship Headquarters",cost:1_100_000_000,minOffice:4,description:"A permanent prestige objective for an anime empire."},
];
export function buyCapitalProject(run:RunState,id:string):RunState|null {const d=CAPITAL_PROJECTS.find(x=>x.id===id);if(!d||run.capitalProjects.includes(id)||run.cash<d.cost||run.officeLevel<d.minOffice)return null;return {...run,cash:run.cash-d.cost,capitalProjects:[...run.capitalProjects,id],strategicSpend:[...run.strategicSpend,{id:`cap_${run.week}_${id}`,label:d.name,amount:d.cost,week:run.week}],notices:[...run.notices,`🏛 ${d.name} completed (−£${d.cost.toLocaleString("en-GB")}).`]};}
export function signStaffContract(run:RunState,staffId:string,years=2,exclusive=true):RunState|null {const s=run.staff.find(x=>x.id===staffId);if(!s)return null;const bonus=Math.round(s.salary*48*years*(exclusive?.5:.3)/1000)*1000;if(run.cash<bonus)return null;return {...run,cash:run.cash-bonus,staffContracts:{...run.staffContracts,[staffId]:{expiresWeek:run.week+48*years,bonus,exclusive}},strategicSpend:[...run.strategicSpend,{id:`staff_${run.week}_${staffId}`,label:`${s.name} retention contract`,amount:bonus,week:run.week}],notices:[...run.notices,`${s.name} signs a ${years}-year ${exclusive?"exclusive ":""}contract (−£${bonus.toLocaleString("en-GB")}).`]};}
