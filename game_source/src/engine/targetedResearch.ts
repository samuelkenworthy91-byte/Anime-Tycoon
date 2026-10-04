import { ARCS, ARC_COMBOS, GENRES, comboKey, arcGenreKey, type GenreId } from './data';
import { IP_HIDDEN_ARC_SEEDS } from './ipHiddenArcs';
import { ARC_CLASHES } from './creativeDiscovery';
const arcById=new Map(ARCS.map(a=>[a.id,a]));
const seedById=new Map<string,(typeof IP_HIDDEN_ARC_SEEDS)[number]>(IP_HIDDEN_ARC_SEEDS.map(a=>[a.id,a]));
export const MAX_TARGETED_STUDIES=20;
export const targetedStudy = (id: string) => {
 const kind=id.startsWith('study_genre_')?'genre':id.startsWith('study_pair_')?'pair':null;
 if(!kind)return null;
 const key=id.slice(kind==='genre'?12:11);
 const genres=key.split('|') as GenreId[];
 if(genres.length!==(kind==='genre'?1:2)||new Set(genres).size!==genres.length||genres.some(g=>!GENRES.some(x=>x.id===g)))return null;
 return {kind,key:kind==='pair'?comboKey(genres):key,genres};
};
export interface TargetedCarrier {
 research:string[]; targetedResearchLevels?:Record<string,number>; targetedResearchEligibility?:string; genreKnowledge?:Partial<Record<GenreId,number>>;
 comboLevels?:Record<string,number>; genresUnlocked?:GenreId[];
 arcCombos:string[]; arcUnlocked:string[]; arcKnowledge:Record<string,number>; arcGenreKnowledge:Record<string,number>; notices:string[];
 ipMarket?:{owned:Record<string,unknown>;studioArcs:string[]}; franchises?:Record<string,unknown>;
}
export const targetedLevel=(r: Pick<TargetedCarrier,'targetedResearchLevels'>,id:string)=>Math.max(0,Math.min(20,Math.floor(r.targetedResearchLevels?.[id]??0)));
export const targetedCost=(r:Pick<TargetedCarrier,'targetedResearchLevels'>,id:string)=>Math.ceil((targetedStudy(id)?.kind==='pair'?4:2)*Math.pow(targetedStudy(id)?.kind==='pair'?1.28:1.27,targetedLevel(r,id)));
export function targetedPool(r:TargetedCarrier,id:string){
 const study=targetedStudy(id); if(!study)return {arcs:[],fits:[],combos:[]} as {arcs:string[];fits:string[];combos:string[]};
 const eligible=ARCS.filter(a=> {
  if(a.franchiseOnly&&!Object.keys(r.franchises??{}).length)return false;
  if(!a.id.startsWith('ip_arc_'))return true;
  const slot=seedById.get(a.id)?.slot;
  return !!r.ipMarket?.owned[`ip_${String(slot).padStart(3,'0')}`] || !!r.ipMarket?.studioArcs.includes(a.id);
 });
 const eligibleIds=new Set(eligible.map(a=>a.id));
 const combos=[...ARC_COMBOS,...ARC_CLASHES].filter(c=>c.arcs.every(a=>eligibleIds.has(a))&&(c.arcs.some(a=>arcById.get(a)?.syn?.some(g=>study.genres.includes(g)))||c.arcs.every(a=>!arcById.get(a)?.syn?.length)))
 .sort((a,b)=>a.arcs.length-b.arcs.length||b.q-a.q||a.id.localeCompare(b.id)).map(c=>c.id);
 const fits=eligible.flatMap(a=>study.genres.map(g=>arcGenreKey(a.id,g))).sort((a,b)=>{
  const aa=arcById.get(a.slice(0,a.lastIndexOf('|')))! ,bb=arcById.get(b.slice(0,b.lastIndexOf('|')))!;
  return (bb.synQ??0)-(aa.synQ??0)||a.localeCompare(b);
 });
 return {arcs:eligible.map(a=>a.id),fits,combos};
}
const batch=(pool:string[],known:(key:string)=>boolean,level:number)=>pool.filter(k=>!known(k)).slice(0,Math.ceil(pool.filter(k=>!known(k)).length/Math.max(1,21-level)));
function grant<T extends TargetedCarrier>(r:T,id:string,level:number):T{
 const study=targetedStudy(id)!;const pool=targetedPool(r,id);
 const fits=batch(pool.fits,k=>(r.arcGenreKnowledge[k]??0)>0,level);
 const knownCombos=new Set(r.arcCombos);
 const combos=batch(pool.combos,k=>knownCombos.has(k),level);
 const arcGenreKnowledge={...r.arcGenreKnowledge};for(const key of fits)arcGenreKnowledge[key]=Math.max(1,arcGenreKnowledge[key]??0);
 const unlock=fits.map(k=>k.slice(0,k.lastIndexOf('|'))).filter(id=>{const arc=arcById.get(id)!;return !arc.syn?.length||arc.syn.some(g=>study.genres.includes(g));});
 const arcKnowledge={...r.arcKnowledge};for(const arc of unlock)arcKnowledge[arc]=Math.max(1,arcKnowledge[arc]??0);
 const genreKnowledge={...r.genreKnowledge};
 if(study.kind==='genre')genreKnowledge[study.genres[0]]=Math.max(genreKnowledge[study.genres[0]]??0,Math.min(9,Math.ceil(level*9/20)));
 const comboLevels={...r.comboLevels};if(study.kind==='pair')comboLevels[study.key]=Math.max(comboLevels[study.key]??0,Math.min(5,Math.ceil(level/4)));
 return {...r,research:[...new Set([...r.research,'genre_studies',id])],arcGenreKnowledge,arcKnowledge,arcUnlocked:[...new Set([...r.arcUnlocked,...unlock])],arcCombos:[...new Set([...r.arcCombos,...combos])],genreKnowledge,comboLevels,ipMarket:r.ipMarket?{...r.ipMarket,studioArcs:[...new Set([...r.ipMarket.studioArcs,...unlock.filter(id=>arcById.get(id)?.unlock?.kind==='studioArc')])]}:undefined};
}
export function completeTargetedStudy<T extends TargetedCarrier>(r:T,id:string):T{
 const before=targetedLevel(r,id);if(before>=20)return syncTargetedMastery(r);
 const level=before+1;
 const next=grant(r,id,level);
 return {...next,targetedResearchLevels:{...r.targetedResearchLevels,[id]:level},notices:[...r.notices,`📚 ${GENRES.filter(g=>targetedStudy(id)!.genres.includes(g.id)).map(g=>g.label).join(' × ')} study ${level}/20 complete. ${level===20?'MASTERED — all eligible blueprints, fits and structures revealed.':'New fits and story structures added to your notebooks.'}`]};
}
const eligibilitySignature=(r:TargetedCarrier)=>[ARC_COMBOS.length,Object.keys(r.ipMarket?.owned??{}).sort().join(','),(r.ipMarket?.studioArcs??[]).slice().sort().join(','),Object.keys(r.franchises??{}).sort().join(','),Object.entries(r.targetedResearchLevels??{}).filter(([,level])=>level>=20).map(([id])=>id).sort().join(',')].join(';');
export function syncTargetedMastery<T extends TargetedCarrier>(r:T):T{
 if(r.targetedResearchEligibility===eligibilitySignature(r))return r;
 let next=r;for(const [id,level] of Object.entries(r.targetedResearchLevels??{}))if(level>=20&&targetedStudy(id))next=grant(next,id,20);
 return {...next,targetedResearchEligibility:eligibilitySignature(next)};
}
export function migrateTargetedLevels(r:TargetedCarrier):Record<string,number>{
 const levels:Record<string,number>={};
 for(const [id,value] of Object.entries(r.targetedResearchLevels??{}))if(targetedStudy(id)&&Number.isFinite(value))levels[id]=Math.max(0,Math.min(20,Math.floor(value)));
 // Credit earlier purchased discovery work; never consume a player's discoveries.
 for(const g of GENRES){const id=`study_genre_${g.id}`;if(id in levels)continue;const known=Object.keys(r.arcGenreKnowledge??{}).filter(k=>k.endsWith('|'+g.id)).length;if(known)levels[id]=Math.min(19,Math.floor(known/Math.max(1,ARCS.filter(a=>!a.id.startsWith('ip_arc_')).length)*20));}
 return levels;
}
