import { useMemo, useState } from 'react';
import { GENRES, RESEARCH, comboKey, type GenreId } from '../engine/data';
import type { RunState } from '../engine/state';
import { researchBlockReason, researchProjectCost } from '../engine/state';
import { targetedLevel, targetedPool } from '../engine/targetedResearch';
import { Btn } from '../fx/fx';
export default function TargetedResearchPanel({run,onStudy}:{run:RunState;onStudy:(id:string,rd:number)=>void}){
 const [kind,setKind]=useState<'genre'|'pair'>('genre');
 const [a,setA]=useState<GenreId>(run.genresUnlocked[0]??'fantasy');
 const [b,setB]=useState<GenreId>(run.genresUnlocked.find(g=>g!==a)??'slice');
 const key=kind==='genre'?a:comboKey([a,b]);const id=`study_${kind}_${key}`;
 const level=targetedLevel(run,id);const def=RESEARCH.find(r=>r.id===id);
 const block=a===b&&kind==='pair'?'Choose two different genres':researchBlockReason(run,id);
 const pending=run.researchJobs.find(j=>j.researchId===id);const pool=useMemo(()=>targetedPool(run,id),[id,run.ipMarket,run.franchises]);
 const select=(value:GenreId,change:(g:GenreId)=>void)=><select aria-label={change===setA?'First research genre':'Second research genre'} className="min-h-11 w-full rounded-lg border border-line bg-panel2 px-2 text-sm" value={value} onChange={e=>change(e.target.value as GenreId)}>{GENRES.map(g=><option key={g.id} value={g.id}>{g.label}{run.genresUnlocked.includes(g.id)?'':' · licence required'}</option>)}</select>;
 return <div className="ink-card mb-3 p-3"><div className="text-xs font-bold text-cyanx">TARGETED STORY RESEARCH</div><p className="mt-1 text-[11px] text-paper/60">Choose a field. Genre studies reveal every eligible blueprint and fit within 20 passes. Pair studies have 20 levels and higher compounded costs. IP blueprints require owned rights.</p><div className="my-2 flex gap-2"><Btn variant={kind==='genre'?'cyan':'ghost'} onClick={()=>setKind('genre')}>GENRE</Btn><Btn variant={kind==='pair'?'gold':'ghost'} onClick={()=>setKind('pair')}>GENRE PAIR</Btn></div><div className="grid gap-2 sm:grid-cols-2">{select(a,setA)}{kind==='pair'&&select(b,setB)}</div><div className="mt-2 text-xs font-bold">{level===20?'MASTERED':`STUDY ${level}/20`} · {pool.combos.filter(c=>run.arcCombos.includes(c)).length}/{pool.combos.length} eligible structures · {pool.fits.filter(k=>(run.arcGenreKnowledge[k]??0)>0).length}/{pool.fits.length} fits</div><div className="mt-2">{level===20?<span className="text-xs text-gold">All eligible discoveries learned. Newly acquired IP knowledge is added automatically.</span>:<Btn variant="cyan" disabled={!!block||!!pending||!def} onClick={()=>def&&onStudy(id,def.rd)}>{pending?'IN RESEARCH':`STUDY · ${researchProjectCost(run,id)} RD`}</Btn>}</div>{block&&level<20&&<div className="mt-1 text-[10px] text-paper/50">{block}</div>}<div className="mt-2 text-[10px] text-paper/50">Four-, five- and six-arc recipes include their exact order. Knowing a longer recipe does not require owning the production format yet.</div></div>;
}
