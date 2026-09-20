import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import genreRuntime from "../src/engine/generated/genreV3.json";
import { ARCS, CAST_V2 } from "../src/engine/data";
import { catalogPairKeys, isCastingActive } from "../src/engine/castCatalog";
import { genreTargetFor } from "../src/engine/genreTargets";

const roles = ["protag","secondary","pet","villain"] as const;
const types = ["shonen","shojo"] as const;
const roleLabel: Record<string,string> = {protag:"Lead",secondary:"Sidekick",pet:"Mascot",villain:"Villain"};
const genres = genreRuntime.genres;
const genreIds = genres.map((g:any)=>g.id);
const label = new Map(genres.map((g:any)=>[g.id,g.label]));
const comboMap = new Map(genreRuntime.combos.map((c:any)=>[[c.genre_1,c.genre_2].sort().join("|"),c]));
const pairKey=(a:string,b:string)=>[a,b].sort().join("|");

const active=CAST_V2.filter(isCastingActive);
const reserve=CAST_V2.filter((m:any)=>!isCastingActive(m));
const ownerMap=new Map<string,any>();
for (const m of active) {
  for (const key of catalogPairKeys(m)) {
    const k=[m.role,m.type,key].join("|");
    if(ownerMap.has(k)) throw new Error("Duplicate current owner: "+k);
    ownerMap.set(k,m);
  }
}

const legacyCsv=readFileSync(resolve("docs/content-v3/CAST_V3_TYPE_PAIR_COVERAGE.csv"),"utf8").trim().split(/\r?\n/).slice(1);
const legacy=new Map<string,string>();
for(const line of legacyCsv){
  const [role,type,a,b,id]=line.split(",");
  if(id) legacy.set([role,type,pairKey(a,b)].join("|"),id);
}

function castCard(m:any){
  const p=resolve("public",String(m.img).replace(/^\/+/, ""));
  return {
    id:m.id,name:m.name,img:m.img,role:m.role,roleLabel:roleLabel[m.role],type:m.type,
    visibleAff:[...m.visibleAff],hiddenAff:m.hiddenAff,
    archetype:m.archetype,epithet:m.epithet ?? null,gender:m.gender ?? null,
    imageExists:existsSync(p),
    pairKeys:catalogPairKeys(m)
  };
}

function earlyAllowed(a:any,pair:string[]){
  if(a.franchiseOnly) return false;
  const u=a.unlock;
  if(!u) return true;
  if(u.kind==="genre") return pair.includes(u.genre);
  if(u.kind==="shows") return Number(u.n)<=3;
  if(u.kind==="rd") return Number(u.cost)<=20;
  return false;
}
function unlockLabel(a:any){
  const u=a.unlock;
  if(!u) return "Start";
  if(u.kind==="genre") return (label.get(u.genre) ?? u.genre)+" unlock";
  if(u.kind==="shows") return u.n+" shows";
  if(u.kind==="rd") return u.cost+" RD";
  return u.kind;
}
function fitArc(a:any,pair:string[]){
  const matched=(a.syn ?? []).filter((g:string)=>pair.includes(g));
  const anti=(a.anti ?? []).filter((g:string)=>pair.includes(g));
  return {
    id:a.id,name:a.name,desc:a.desc ?? "",
    q:Number(a.q ?? 0),f:Number(a.f ?? 0),
    syn:[...(a.syn ?? [])],matchedGenres:matched,synQ:Number(a.synQ ?? 0),synF:Number(a.synF ?? 0),
    anti:[...(a.anti ?? [])],antiMatched:anti,antiQ:Number(a.antiQ ?? 0),antiF:Number(a.antiF ?? 0),
    cast:a.cast ?? null,castQ:Number(a.castQ ?? 0),
    unlock:a.unlock ?? null,unlockLabel:unlockLabel(a)
  };
}
function arcRank(a:any){
  return a.matchedGenres.length*1000 + a.synQ*100 + a.synF*1000 + a.q*12 + a.f*500 + a.castQ*8;
}
function pairingLabel(c:any){
  if(c.discovery_class==="experimental") return "EXPERIMENTAL / SECRET";
  const v=Number(c.learned_multiplier ?? c.first_release_multiplier ?? 1);
  if(v>=1.20) return "GREAT COMBO";
  if(v>=1.08) return "GOOD SYNERGY";
  if(v>=0.95) return "SAFE PAIRING";
  return "RISKY MIX";
}

const pairs:any[]=[];
let mismatchCount=0;
for(let i=0;i<genreIds.length;i++){
  for(let j=i+1;j<genreIds.length;j++){
    const a=genreIds[i], b=genreIds[j], key=pairKey(a,b), pair=[a,b];
    const combo=comboMap.get(key) as any;
    const target=genreTargetFor(pair as any);
    const cast:any={shonen:{},shojo:{}};
    for(const type of types){
      for(const role of roles){
        const owner=ownerMap.get([role,type,key].join("|"));
        if(!owner) throw new Error("Missing live owner: "+[role,type,key].join("|"));
        const old=legacy.get([role,type,key].join("|"));
        if(old && old!==owner.id) mismatchCount++;
        cast[type][role]={...castCard(owner),legacyWitnessId:old ?? null,legacyChanged:!!old && old!==owner.id};
      }
    }
    const early=ARCS
      .filter((arc:any)=>(arc.syn ?? []).some((g:string)=>pair.includes(g)))
      .filter((arc:any)=>!(arc.anti ?? []).some((g:string)=>pair.includes(g)))
      .filter((arc:any)=>earlyAllowed(arc,pair))
      .map((arc:any)=>fitArc(arc,pair))
      .sort((x:any,y:any)=>arcRank(y)-arcRank(x) || x.name.localeCompare(y.name));
    const avoid=ARCS
      .filter((arc:any)=>(arc.anti ?? []).some((g:string)=>pair.includes(g)))
      .filter((arc:any)=>earlyAllowed(arc,pair))
      .map((arc:any)=>fitArc(arc,pair))
      .sort((x:any,y:any)=>(Math.abs(y.antiQ)+Math.abs(y.antiF)*10)-(Math.abs(x.antiQ)+Math.abs(x.antiF)*10) || x.name.localeCompare(y.name));
    const immediate=early.filter((arc:any)=>!arc.unlock || (arc.unlock.kind==="genre" && pair.includes(arc.unlock.genre)));
    const picks=immediate.slice(0,3).map((x:any)=>x.name);
    const finale=ARCS.find((x:any)=>x.id==="finale")?.name ?? "Finale Climax";
    const hook=ARCS.find((x:any)=>x.id==="hook")?.name ?? "Cold Open Hook";
    const recommended=picks.length>=3 ? [...picks,finale] : picks.length===2 ? [hook,...picks,finale] : picks.length===1 ? [hook,picks[0],finale] : [hook,finale];
    pairs.push({
      key,a,b,labelA:label.get(a),labelB:label.get(b),
      pairing:{class:combo.discovery_class,first:Number(combo.first_release_multiplier),learned:Number(combo.learned_multiplier),label:pairingLabel(combo),qualityMultiplier:target.comboQualityMult},
      sliders:{plot:Number(target.ideal[0]),characters:100-Number(target.ideal[0]),sakuga:Number(target.ideal[1]),consistency:100-Number(target.ideal[1]),soundtrack:Number(target.ideal[2]),voiceCast:100-Number(target.ideal[2])},
      cast,earlyArcs:early,avoidEarlyArcs:avoid,recommended
    });
  }
}
const missingImages=active.filter((m:any)=>!existsSync(resolve("public",String(m.img).replace(/^\/+/, "")))).map((m:any)=>({id:m.id,img:m.img}));
const output={
  generatedAt:new Date().toISOString(),
  commit:process.env.GITHUB_SHA ?? null,
  summary:{
    genres:genreIds.length,pairs:pairs.length,rawCast:CAST_V2.length,activeCast:active.length,reserveCast:reserve.length,
    activePerBucket:155,coverageCells:ownerMap.size,legacyCoverageCells:legacy.size,legacyOwnerChanges:mismatchCount,
    missingActivePortraits:missingImages.length
  },
  genres:genres.map((g:any)=>({id:g.id,label:g.label,tier:g.tier,rd:g.rd,description:g.description})),
  missingImages,pairs
};
writeFileSync("handbook-live-data.json",JSON.stringify(output,null,2));
describe("handbook live export",()=>{it("exports exact current main catalogue",()=>{
  expect(output.summary.genres).toBe(30);
  expect(output.summary.pairs).toBe(435);
  expect(output.summary.activeCast).toBe(1240);
  expect(output.summary.coverageCells).toBe(3480);
  expect(output.summary.missingActivePortraits).toBe(0);
  expect(pairs.every((p:any)=>roles.every(r=>p.cast.shonen[r]?.imageExists && p.cast.shojo[r]?.imageExists))).toBe(true);
});});
