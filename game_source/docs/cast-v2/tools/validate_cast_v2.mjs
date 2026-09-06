import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {tier,contribution,discover,publicMember,ROLE_WEIGHTS,DEFAULTS} from './casting_model.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const roster=JSON.parse(fs.readFileSync(path.join(root,'CAST_V2_MASTER.json'),'utf8'));
const genres=JSON.parse(fs.readFileSync(path.join(root,'GENRE_V2_DATA.json'),'utf8')).map(x=>x.id);
const pairs=JSON.parse(fs.readFileSync(path.join(root,'GENRE_V2_COMBOS.json'),'utf8'));
const source=JSON.parse(fs.readFileSync(path.join(root,'evidence/source_cast.json'),'utf8'));
function ok(x,msg){if(!x)throw Error(msg)}
ok(roster.length===192,'roster count');ok(new Set(roster.map(x=>x.id)).size===192,'unique ids');ok(source.every(s=>roster.some(x=>x.id===s.id)),'source id deleted');
for(const role of Object.keys(ROLE_WEIGHTS))for(const type of ['SHONEN','SHOJO'])for(const gender of ['male','female'])ok(roster.filter(x=>x.role===role&&x.anime_type===type&&x.gender===gender).length===12,`${role}/${type}/${gender}`);
for(const m of roster){const a=[m.visible_genre_1,m.visible_genre_2,m.hidden_genre];ok(new Set(a).size===3,`${m.id} affinity distinct`);ok(a.every(x=>genres.includes(x)),`${m.id} invalid genre`)}
ok(pairs.length===210,'pair matrix count');for(const [i,a] of genres.entries())for(const b of genres.slice(i+1))ok(roster.some(m=>[m.visible_genre_1,m.visible_genre_2,m.hidden_genre].includes(a)&&[m.visible_genre_1,m.visible_genre_2,m.hidden_genre].includes(b)),`${a}/${b} uncovered`);
for(const role of Object.keys(ROLE_WEIGHTS))for(const type of ['SHONEN','SHOJO'])for(const genre of genres){const cell=roster.filter(x=>x.role===role&&x.anime_type===type);ok(cell.filter(x=>[x.visible_genre_1,x.visible_genre_2,x.hidden_genre].includes(genre)).length>=2,`${role}/${type}/${genre} thin`);ok(cell.some(x=>[x.visible_genre_1,x.visible_genre_2].includes(genre)),`${role}/${type}/${genre} no visible option`)}
const m={id:'x',role:'Lead',anime_type:'SHONEN',visible_genre_1:'mecha',visible_genre_2:'space',hidden_genre:'martial'};
ok(tier(m,['slice'])===0,'no affinity');ok(tier(m,['mecha'])===1,'visible');ok(tier(m,['mecha','space'])===1,'two visible stacked');ok(tier(m,['martial'])===2,'hidden');ok(tier(m,['mecha','martial'])===2,'visible + hidden stacked');
const make=(k,type='SHOJO')=>Object.keys(ROLE_WEIGHTS).map((role,i)=>({id:String(i),role,anime_type:type,visible_genre_1:k===1?'mecha':'space',visible_genre_2:'cyber',hidden_genre:k===2?'mecha':'martial'}));
const n=contribution(make(0),['mecha'],'SHONEN'),v=contribution(make(1),['mecha'],'SHONEN'),h=contribution(make(2),['mecha'],'SHONEN');
ok(Math.abs(h.genreQuality-2*v.genreQuality)<1e-12,'hidden quality not 2x');ok(Math.abs((h.salesMultiplier-1)-2*(v.salesMultiplier-1))<1e-12,'hidden sales not 2x');
const vm=contribution(make(1,'SHONEN'),['mecha'],'SHONEN');ok(Math.abs(vm.genreQuality/v.genreQuality-1.1)<1e-12,'type is not +10%');
let state={known:new Set,processed:new Set};const event={releaseId:'r1',released:true,cancelled:false,cast:[m],genres:['martial'],positiveContributors:new Set(['x'])};
ok(publicMember(m,state.known).hidden===null,'secret leaked before release');ok(contribution([m,...make(0).slice(1)],['martial'],'SHOJO').byRole[0].tier===2,'undiscovered hidden inactive');
ok(discover(state,{...event,released:false}).known.size===0,'draft reveal');ok(discover(state,{...event,cancelled:true}).known.size===0,'cancel reveal');ok(discover(state,{...event,genres:['slice']}).known.size===0,'wrong genre reveal');ok(discover(state,{...event,positiveContributors:new Set}).known.size===0,'non-contributing reveal');state=discover(state,event);ok(state.known.has('x'),'valid release not revealed');state=discover(state,event);ok(state.known.size===1&&state.processed.size===1,'release not idempotent');
const result={status:'PASS',roster:192,roles:'48 each',role_type:'24 each',role_type_gender:'12 each ledger cell',unique_ids:192,preserved_source_ids:186,affinity_slots:'2 visible + 1 hidden, all distinct',genres:21,pairs:'210/210',minimum_visible_per_role_type_genre:1,minimum_complete_per_role_type_genre:2,mechanics:['0x no match','1x visible','1x two-visible','2x hidden','2x visible+hidden','hidden active before discovery','release-only idempotent discovery'],constants:DEFAULTS};
fs.writeFileSync(path.join(root,'evidence/final_validation.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
