import type { RunState } from "../engine/state";
import { formatGBP, GENRES } from "../engine/data";
import { expansionOf, gameDay, pitchAction, renegotiatePromise } from "../engine/studioExpansion";
import { resolveStaffStory, storyChoices } from "../engine/staffStories";

type Props={run:RunState;setRun:(fn:(r:RunState)=>RunState)=>void;staffId?:string};
const button="min-h-11 rounded-lg border border-line px-3 py-2 text-xs font-bold disabled:opacity-40";
export function StaffStoryInbox({run,setRun,staffId}:Props){
 const stories=(expansionOf(run).stories??[]).filter(s=>!staffId||s.staffIds.includes(staffId));
 return <div className="space-y-2" aria-label="Staff stories">
  {stories.filter(s=>s.status==="offered"||s.status==="active").map(s=><article className="rounded-xl border border-gold/30 bg-gold/5 p-3" key={s.id}>
   <h4 className="font-bold">{s.title}</h4><p className="my-2 text-xs">{s.text}</p>
   <p className="text-xs">{s.staffIds.map(id=>run.staff.find(st=>st.id===id)?.name??"Former employee").join(" · ")}</p>
   {s.status==="active"?<p className="text-xs text-gold">Mentoring sessions: {s.progress}/8. Two paid days reserved each week.</p>:<><p className="text-xs">Respond by day {s.expiresDay}.</p><div className="mt-2 flex flex-wrap gap-2">{storyChoices[s.kind].map(c=><button className={button} key={c.id} disabled={run.cash<c.cost||gameDay(run)>s.expiresDay} onClick={()=>setRun(r=>resolveStaffStory(r,s.id,c.id)??{...r,notices:[...r.notices,"Story decision unavailable: check participant availability and cash."].slice(-40)})}>{c.label}{c.cost?" · "+formatGBP(c.cost):""}</button>)}</div></>}
  </article>)}
  {stories.some(s=>s.status==="resolved"||s.status==="expired")&&<details><summary>Past personal stories</summary>{stories.filter(s=>s.status==="resolved"||s.status==="expired").slice().reverse().map(s=><p className="my-2 text-xs" key={s.id}><b>{s.title}</b> · {s.outcome??s.decision??s.status}</p>)}</details>}
 </div>;
}
export function StaffCultureProfile({run,setRun,staffId}:Props){
 if(!staffId)return null;
 const x=expansionOf(run),promises=x.promises.filter(p=>p.staffId===staffId),pitches=x.pitches.filter(p=>p.staffId===staffId&&!['declined','accepted'].includes(p.status));
 const paid=Object.values(x.accounts).reduce((sum,a)=>sum+(a.entitlements[staffId]??0),0);
 return <section className="space-y-2 rounded-xl border border-line p-3 text-xs" aria-label="Creative ambitions and agreements">
  <h4 className="font-bold text-gold">AMBITIONS &amp; WORKING AGREEMENTS</h4>
  {(x.leave[staffId]??0)>gameDay(run)&&<p>Protected recovery until day {x.leave[staffId]}.</p>}
  <p>Staff profit payments received: {formatGBP(paid)}.</p>
  {!promises.length&&!pitches.length&&<p>No current creative commitment. Agree a leadership opportunity in Studio Culture.</p>}
  {pitches.map(p=><div key={p.id}><b>Personal pitch: {GENRES.find(g=>g.id===p.genre)?.label??p.genre}</b><p>{p.report??(p.status==="developing"?p.progress+"/28 development days":"Awaiting your decision.")}</p>{p.status!=="developing"&&<button className={button} onClick={()=>setRun(r=>pitchAction(r,p.id,"accept")??r)}>ACCEPT LEADERSHIP BRIEF</button>}</div>)}
  {promises.map(p=>{const c=p.projectId?x.credits[p.projectId]:undefined,total=c?.byRole[p.role]??0;return <div key={p.id} className="space-y-1"><b>{p.status.toUpperCase()} · {GENRES.find(g=>g.id===p.genre)?.label??p.genre} leadership</b><p>Deadline day {p.deadlineDay} · {p.projectId?run.projects.find(pr=>pr.id===p.projectId)?.draft.title??"Archived production":"Project not yet appointed"}</p><p>Department participation: {total?Math.round((c?.roleStaff[staffId]??0)/total*100):0}%.</p>{p.status==="active"&&<button className={button} disabled={p.extended||gameDay(run)>p.deadlineDay} onClick={()=>setRun(r=>renegotiatePromise(r,p.id)??r)}>12-WEEK EXTENSION · −3 MORALE</button>}<details><summary>Agreement history</summary>{p.history.map((h,i)=><p key={i}>{h}</p>)}</details></div>;})}
  <StaffStoryInbox run={run} setRun={setRun} staffId={staffId}/>
 </section>;
}
