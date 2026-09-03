import { BookOpen, ChevronRight, HelpCircle, Sparkles } from "lucide-react";
import { COMBO, GENRES, type GenreId } from "../engine/data";
import type { RunState } from "../engine/state";
import { cn } from "../utils/cn";

type Selection = { kind: "genre"; key: GenreId } | { kind: "pair"; key: string } | null;
export type KnowledgeSelection = Selection;

const levelLabel = (n: number) => n <= 0 ? "UNTESTED" : n <= 2 ? "FAMILIAR" : n <= 5 ? "EXPERIENCED" : n <= 8 ? "EXPERT" : "MASTERED";
const pairFit = (m: number) => m >= 1.2 ? "GREAT FIT" : m > 1.02 ? "GOOD FIT" : m < 0.9 ? "RISKY" : "NEUTRAL";

export default function KnowledgeDossier({ run, selection, onSelect }: { run: RunState; selection: Selection; onSelect: (s: Selection) => void }) {
  const unlocked = GENRES.filter((g) => run.genresUnlocked.includes(g.id));
  if (selection?.kind === "genre") {
    const g = GENRES.find((x) => x.id === selection.key)!;
    const k = run.genreKnowledge?.[g.id] ?? 0;
    const emphasis = [
      ["Story", g.ratio[0]], ["Art", g.ratio[1]], ["Sound", g.ratio[2]],
    ].sort((a, b) => Number(b[1]) - Number(a[1]));
    const knownPairs = Object.entries(run.comboLevels).filter(([key]) => key.split("|").includes(g.id));
    const learnedArcs = Object.keys(run.arcGenreKnowledge ?? {}).filter((key) => key.endsWith(`|${g.id}`)).length;
    return <div className="rounded-xl border border-cyanx/40 bg-cyanx/5 p-3">
      <button className="mb-2 text-[10px] font-bold text-cyanx" onClick={() => onSelect(null)}>← ALL KNOWLEDGE</button>
      <div className="flex items-center gap-2"><g.icon size={18} style={{color:g.color}}/><div><div className="font-display text-lg font-extrabold">{g.label}</div><div className="text-[9px] font-extrabold tracking-widest text-gold">{levelLabel(k)} · KNOWLEDGE {k}</div></div></div>
      <p className="mt-2 text-[11px] text-paper/60">{g.desc}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel2/70 p-2 text-[10px]"><b>PRODUCTION LEAN</b><br/><span className="text-paper/60">{
          k <= 0 ? "Untested — ship a show or run a test audience to learn what matters." :
          k <= 2 ? `Early read: ${emphasis[0][0]} appears most important.` :
          k <= 5 ? emphasis.map(([n,v]) => `${n} ≈${Math.round(Number(v)*100/5)*5}%`).join(" · ") :
          emphasis.map(([n,v]) => `${n} ${Math.round(Number(v)*100)}%`).join(" · ")
        }</span></div>
        <div className="rounded-lg border border-line bg-panel2/70 p-2 text-[10px]"><b>DIRECTION MEMO</b><br/><span className="text-paper/60">{
          k < 3 ? "Audience direction preferences are still fuzzy." :
          k < 6 ? `The studio has a working read on this genre. More releases narrow the slider targets.` :
          `Plot ${g.ideal[0]}% · Sakuga ${g.ideal[1]}% · Music ${g.ideal[2]}%`
        }</span></div>
        <div className="rounded-lg border border-line bg-panel2/70 p-2 text-[10px] sm:col-span-2"><b>STORY KNOWLEDGE</b><br/><span className="text-paper/60">{learnedArcs} arc relationship{learnedArcs===1?"":"s"} learned for this genre. Test audiences and repeated releases add more evidence.</span></div>
      </div>
      <div className="mt-3 text-[9px] font-extrabold tracking-widest text-paper/45">KNOWN PAIRINGS</div>
      <div className="mt-1 grid gap-1 sm:grid-cols-2">{knownPairs.length ? knownPairs.map(([key,lv]) => {
        const other = key.split("|").find((x) => x !== g.id) as GenreId | undefined;
        const og = GENRES.find((x)=>x.id===other);
        const mult = COMBO[key] ?? 1;
        return <button key={key} className="btn-press flex items-center rounded-lg border border-line bg-panel2/60 px-2 py-1.5 text-left text-[10px]" onClick={()=>onSelect({kind:"pair",key})}><span className="font-bold">{og?.label ?? other}</span><span className="ml-auto text-gold">{pairFit(mult)} · Lv{lv}</span><ChevronRight size={10}/></button>
      }) : <div className="text-[10px] text-paper/40">No pairing has been shipped yet.</div>}</div>
    </div>;
  }
  if (selection?.kind === "pair") {
    const [a,b] = selection.key.split("|") as GenreId[];
    const ga=GENRES.find((x)=>x.id===a)!; const gb=GENRES.find((x)=>x.id===b)!;
    const lv=run.comboLevels[selection.key]??0; const mult=COMBO[selection.key]??1;
    return <div className="rounded-xl border border-gold/45 bg-gold/5 p-3">
      <button className="mb-2 text-[10px] font-bold text-cyanx" onClick={() => onSelect(null)}>← ALL KNOWLEDGE</button>
      <div className="font-display text-lg font-extrabold">{ga.label} × {gb.label}</div>
      <div className={cn("mt-1 text-xs font-extrabold", mult>=1.03?"text-mint":mult<0.95?"text-neon":"text-gold")}>{pairFit(mult)} · COMBO LEVEL {lv}</div>
      <div className="mt-2 rounded-lg border border-line bg-panel2/70 p-2 text-[10px] text-paper/60">Your studio has shipped this exact pairing {lv} time{lv===1?"":"s"}. Learned review interaction: <b className="text-paper">×{mult.toFixed(2)}</b>. Higher combo knowledge adds the separate familiarity bonus shown during greenlight.</div>
      <div className="mt-2 flex items-center gap-1 text-[9px] text-paper/45"><HelpCircle size={10}/> Unknown pairings stay hidden until you actually ship or research them.</div>
    </div>;
  }
  return <div>
    <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-cyanx"><BookOpen size={14}/> STUDIO KNOWLEDGE</div>
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">{unlocked.map((g)=>{
      const n=run.genreKnowledge?.[g.id]??0;
      return <button key={g.id} className="btn-press rounded-lg border border-line bg-panel2/60 p-2 text-left" onClick={()=>onSelect({kind:"genre",key:g.id})}><div className="flex items-center gap-1"><g.icon size={13} style={{color:g.color}}/><span className="text-[10px] font-bold">{g.label}</span></div><div className="mt-1 text-[8px] font-extrabold tracking-wider text-paper/45">{levelLabel(n)} · {n}</div></button>
    })}</div>
    <div className="mt-3 text-[9px] font-extrabold tracking-widest text-paper/45">KNOWN GENRE PAIRS</div>
    <div className="mt-1 grid gap-1 sm:grid-cols-2">{Object.entries(run.comboLevels).slice().sort((a,b)=>b[1]-a[1]).map(([key,lv])=>{
      const labels=key.split("|").map((id)=>GENRES.find((g)=>g.id===id)?.label??id).join(" × ");
      return <button key={key} onClick={()=>onSelect({kind:"pair",key})} className="btn-press flex items-center rounded-lg border border-line bg-panel2/60 px-2 py-1.5 text-left text-[10px]"><Sparkles size={10} className="mr-1 text-gold"/><span className="truncate font-bold">{labels}</span><span className="ml-auto text-gold">Lv{lv}</span><ChevronRight size={10}/></button>
    })}</div>
    <div className="mt-2 flex gap-1 text-[9px] text-paper/45"><HelpCircle size={10} className="shrink-0"/>Tap a genre or known pairing for what the studio has actually learned. Undiscovered synergies remain secret.</div>
  </div>;
}
