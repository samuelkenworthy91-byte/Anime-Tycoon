/** Runs the actual repository scoring implementation with a narrowly patched
 * experimental casting term. No runtime source files or saved games are changed.
 * Node 24+; no npm install. Temporary transpilation removes icons only.
 */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';import {stripTypeScriptTypes} from 'node:module';
import {createHash} from 'node:crypto';
import {contribution,DEFAULTS,ROLE_WEIGHTS} from './casting_model.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const engine=path.resolve(root,'../../src/engine');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cast-v2-'));
const genres=JSON.parse(fs.readFileSync(path.join(root,'GENRE_V2_DATA.json'),'utf8'));
const pairs=JSON.parse(fs.readFileSync(path.join(root,'GENRE_V2_COMBOS.json'),'utf8'));
const roster=JSON.parse(fs.readFileSync(path.join(root,'CAST_V2_MASTER.json'),'utf8'));
const originalData=fs.readFileSync(path.join(engine,'data.ts'),'utf8');
const originalScoring=fs.readFileSync(path.join(engine,'scoring.ts'),'utf8');
const imports=originalData.match(/import \{([\s\S]*?)\} from "lucide-react";/)[1].split(',').map(s=>s.trim()).filter(s=>s&&!s.startsWith('type '));
let data=originalData.replace(/import \{[\s\S]*?\} from "lucide-react";/,imports.map(s=>`const ${s}=${JSON.stringify(s)};`).join('\n'));
data=stripTypeScriptTypes(data);fs.writeFileSync(path.join(tmp,'legacy-data.mjs'),data);
let v2data=data+`\nGENRES.splice(0,GENRES.length,...${JSON.stringify(genres)});\nfor(const k of Object.keys(COMBO))delete COMBO[k];\nfor(const k of Object.keys(SECRET_COMBOS))delete SECRET_COMBOS[k];\n`;
for(const p of pairs) v2data+=`${p.discovery_class==='experimental'?'SECRET_COMBOS':'COMBO'}[${JSON.stringify(p.key)}]=${p.learned_multiplier};\n`;
// Explicit shared migration rules, matching GENRE_V2_SPEC.
v2data+=`const remap={shonen:'martial',shojo:'romance',racing:'sports',noir:'mystery'};
for(const arc of ARCS){for(const field of ['syn','anti'])if(arc[field])arc[field]=[...new Set(arc[field].map(g=>remap[g]??g))];}
for(const slot of Object.values(SLOTS))slot.best=[...new Set(slot.best.map(g=>remap[g]??g))];
for(const audience of Object.values(AUDIENCES)){for(const g of Object.keys(remap))delete audience.fit[g];}
`;
fs.writeFileSync(path.join(tmp,'data.mjs'),v2data);
let scoring=stripTypeScriptTypes(originalScoring).replace('from "./data"','from "./data.mjs"');
fs.writeFileSync(path.join(tmp,'legacy-scoring.mjs'),scoring.replace('from "./data.mjs"','from "./legacy-data.mjs"'));
const start=scoring.indexOf('  const castFit = '),end=scoring.indexOf('  /* ---- arcs',start);
if(start<0||end<0)throw Error('Source casting marker changed');
scoring=scoring.slice(0,start)+`  const castingRaw = opts.v2.quality;\n`+scoring.slice(end);
scoring=scoring.replaceAll('casting * 0.35','castingRaw');
scoring=scoring.replace('const peak = 44_000 * appeal;','const peak = 44_000 * appeal * opts.v2.salesMultiplier;');
// In V2, arc.cast is a boolean fit check, never a hidden-tier multiplier.
scoring=scoring.replace('m && m.aff.some((g) => draft.genres.includes(g))','opts.v2.byRole.find(x => ({protag:"Lead",secondary:"Sidekick",pet:"Mascot",villain:"Villain"})[arc.cast]===x.role)?.tier > 0');
fs.writeFileSync(path.join(tmp,'scoring.mjs'),scoring);
const {computeResult}=await import(pathToFileURL(path.join(tmp,'scoring.mjs')));
const {computeResult:legacy}=await import(pathToFileURL(path.join(tmp,'legacy-scoring.mjs')));
function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
const profiles=[
 {name:'disaster',pts:[18,4,3],issues:12,sliders:[0,0,0],hype:0,budget:'indie',arcs:['filler'],studioTop:50,audienceBar:0,genres:['mecha','slice'],costs:45000},
 {name:'weak',pts:[20,15,10],issues:5,sliders:[35,35,35],hype:10,budget:'indie',arcs:[],studioTop:0,audienceBar:0,genres:['mecha','slice'],costs:80000},
 {name:'rookie',pts:[45,45,45],issues:2,sliders:[50,50,50],hype:20,budget:'indie',arcs:['hook','lore'],studioTop:0,audienceBar:0,genres:['mecha','military'],costs:120000},
 {name:'competent',pts:[60,60,60],issues:1,sliders:[62,72,46],hype:40,budget:'standard',arcs:['hook','lore','finale'],studioTop:35,audienceBar:0,genres:['mecha','military'],costs:220000},
 {name:'excellent',pts:[75,150,75],issues:0,sliders:[62,72,46],hype:70,budget:'standard',arcs:['hook','lore','launch','finale'],studioTop:40,audienceBar:0,genres:['mecha','military'],costs:360000},
 {name:'late high expectations',pts:[75,150,75],issues:0,sliders:[62,72,46],hype:70,budget:'blockbuster',arcs:['hook','lore','launch','finale'],studioTop:60,audienceBar:8,genres:['mecha','military'],costs:650000},
];
const regimes=[['none/type mismatch',0,false],['none/type match',0,true],['visible/type mismatch',1,false],['visible/type match',1,true],['hidden/type mismatch',2,false],['hidden/type match',2,true],['mixed ensemble',-1,true]];
const candidates=[];for(const quality of [.6,1,1.4])for(const sales of [.015,.025,.04])candidates.push({base:.5,quality,sales});
function synthetic(k,match,config){const types=k===-1?[1,1,0,2]:[k,k,k,k];const roles=Object.keys(ROLE_WEIGHTS);return contribution(roles.map((role,i)=>({id:'synthetic_'+role,role,anime_type:match?'SHONEN':'SHOJO',visible_genre_1:types[i]===1?'test':'a',visible_genre_2:'b',hidden_genre:types[i]===2?'test':'c'})),['test'],'SHONEN',config);}
function options(p){const gd=p.genres.map(id=>genres.find(x=>x.id===id));return {draft:{title:'Controlled trial',medium:'tv',budget:p.budget,scope:'standard',slot:'midnight',genres:p.genres,audience:'teens',protag:'kai',secondary:'s_ren',pet:'p_mochi',villain:'v_dread',arcs:p.arcs,sliders:p.sliders,season:1},points:{story:p.pts[0],art:p.pts[1],sound:p.pts[2]},issues:p.issues,hype:p.hype,research:[],showrunner:'balanced',genreIdeal:[0,1,2].map(i=>Math.round(gd.reduce((s,g)=>s+g.ideal[i],0)/gd.length)),genreRatio:[0,1,2].map(i=>gd.reduce((s,g)=>s+g.ratio[i],0)/gd.length),comboLevel:0,newCombo:false,comboDiscovered:true,castCombos:[],arcCombos:[],studioTop:p.studioTop,franchiseMult:1,costs:p.costs,fanBase:0,audienceBar:p.audienceBar};}
const results=[];const N=1000;
for(const config of candidates)for(const p of profiles)for(const [name,k,match] of regimes){
 const vals=[];const v2=synthetic(k,match,config);
 for(let i=1;i<=N;i++){Math.random=rng(i);const r=computeResult({...options(p),v2});vals.push(r);}
 results.push({quality:config.quality,sales:config.sales,profile:p.name,regime:name,n:N,meanQuality:vals.reduce((s,r)=>s+r.quality,0)/N,meanReviews:vals.reduce((s,r)=>s+r.total,0)/N,meanRevenue:vals.reduce((s,r)=>s+r.revenue,0)/N,hitRate:vals.filter(r=>r.total>=27).length/N,maxReviews:Math.max(...vals.map(r=>r.total)),directSales:v2.salesMultiplier,meanProfit:vals.reduce((s,r)=>s+r.revenue-p.costs,0)/N});
}
// 210 genre pairs x two types x all four real roles. Simulate actual feasible casts,
// compare to their same identities with affinity contribution suppressed.
const actual=[];
for(const pair of pairs)for(const type of ['SHONEN','SHOJO']){
 const g=[pair.genre_1,pair.genre_2];const members=Object.keys(ROLE_WEIGHTS).map(role=>roster.filter(m=>m.role===role).sort((a,b)=>{
  const score=m=>(g.includes(m.hidden_genre)?2:g.includes(m.visible_genre_1)||g.includes(m.visible_genre_2)?1:0)*(m.anime_type===type?1.1:1);
  return score(b)-score(a)||a.id.localeCompare(b.id);
 })[0]);
 const v2=contribution(members,g,type),base={...v2,quality:v2.quality-v2.genreQuality,salesMultiplier:1};
 const profile={...profiles[3],genres:g,sliders:[50,50,50]};let dq=0,dr=0,rev=0;
 for(let seed=1;seed<=50;seed++){Math.random=rng(seed);const a=computeResult({...options(profile),v2});Math.random=rng(seed);const b=computeResult({...options(profile),v2:base});dq+=a.quality-b.quality;dr+=a.total-b.total;rev+=a.revenue-b.revenue;}
 actual.push({pair:pair.key,type,ids:members.map(m=>m.id),qualityDelta:dq/50,reviewDelta:dr/50,revenueDelta:rev/50,directSales:v2.salesMultiplier});
}
const legacyRows=[];for(const p of profiles){let q=0,review=0,rev=0;for(let i=1;i<=N;i++){Math.random=rng(i);const r=legacy(options(p));q+=r.quality;review+=r.total;rev+=r.revenue;}legacyRows.push({profile:p.name,n:N,meanQuality:q/N,meanReviews:review/N,meanRevenue:rev/N});}
const meta={sourceCommit:'63e072d310670b6cb19dbef77d2d13526f7d5317',sha256:{data:createHash('sha256').update(originalData).digest('hex'),scoring:createHash('sha256').update(originalScoring).digest('hex')},seeds:N,controlledCalls:results.length*N,actualPairCalls:actual.length*50*2,legacyCalls:legacyRows.length*N,candidates,profiles,results,actualPairSummary:{cases:actual.length,minReviewDelta:Math.min(...actual.map(x=>x.reviewDelta)),maxReviewDelta:Math.max(...actual.map(x=>x.reviewDelta)),minRevenueDelta:Math.min(...actual.map(x=>x.revenueDelta)),maxDirectSales:Math.max(...actual.map(x=>x.directSales))},legacyRows};
fs.writeFileSync(path.join(root,'evidence/balance_simulation.json'),JSON.stringify(meta,null,2)+'\n');
fs.writeFileSync(path.join(root,'evidence/actual_pair_trials.json'),JSON.stringify(actual,null,2)+'\n');
console.log(JSON.stringify({calls:meta.controlledCalls+meta.actualPairCalls+meta.legacyCalls,actual:meta.actualPairSummary,recommended:results.filter(r=>r.quality===1&&r.sales===.025)},null,2));
fs.rmSync(tmp,{recursive:true,force:true});
