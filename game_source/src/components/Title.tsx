import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, Dices, FolderOpen, Play, Save, Trophy, Zap } from "lucide-react";
import { Btn } from "../fx/fx";
import { primeAudio, sfx } from "../engine/audio";
import { getScores, newestSave, slotLabel, type ScoreEntry, type SlotId } from "../engine/storage";
import SaveSlots from "./SaveSlots";
import { CAREER_YEARS, SHOWRUNNERS, dateLabel, formatGBP, formatNum, randomTitle, type Showrunner } from "../engine/data";
import { showrunnerStats } from "../engine/studioOps";
import { cn } from "../utils/cn";

type ShowrunnerId = Showrunner["id"];

export function HighScoreTable({ highlight }: { highlight?: number }) {
  const [scores] = useState<ScoreEntry[]>(() => getScores());
  if (!scores.length) return <div className="py-8 text-center text-sm text-paper/50">No legends yet. The stage is waiting.</div>;
  return (
    <div className="space-y-1.5">
      {scores.map((s, i) => (
        <div key={s.date + i} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2 text-sm anim-up", i === highlight ? "border-gold/70 bg-gold/10 shadow-[0_0_20px_rgba(255,209,102,.25)]" : "border-line bg-panel2/60")} style={{ animationDelay: `${i * 60}ms` }}>
          <span className={cn("font-display w-7 text-center font-extrabold", i === 0 ? "text-gold" : i === 1 ? "text-paper" : i === 2 ? "text-[#cd8b5a]" : "text-paper/40")}>{i + 1}</span>
          <div className="min-w-0 flex-1"><div className="truncate font-bold">{s.name}</div><div className="text-[11px] text-paper/50">Y{s.year} · {s.shows} shows · {formatNum(s.fans)} fans {s.dynasty ? "· SANDBOX" : s.victory ? "· LEGEND" : ""}</div></div>
          <div className="font-display font-extrabold text-gold">{s.score.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

const menuButton = "btn-press flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 font-display text-sm font-extrabold tracking-[0.12em] backdrop-blur-sm transition-all sm:min-h-14 sm:text-base";

export default function Title({ onStart, onLoad }: { onStart: (studio: string, showrunner: string) => void; onLoad?: (id: SlotId) => void; }) {
  const [saveTick, setSaveTick] = useState(0);
  const newest = useMemo(() => newestSave(), [saveTick]);
  const [view, setView] = useState<"menu" | "setup" | "scores" | "load">("menu");
  const [studio, setStudio] = useState("Anime Runner");
  const [runner, setRunner] = useState<ShowrunnerId>("steady");

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && view !== "menu") { setView("menu"); return; }
      if (e.key !== "Enter") return;
      primeAudio();
      if (view === "menu") {
        sfx.select();
        if (newest && onLoad) onLoad(newest.id); else setView("setup");
      } else if (view === "setup") {
        sfx.select(); onStart(studio.trim() || "Anime Runner", runner);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [view, studio, runner, onStart, newest, onLoad]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#050a1b]">
      <img src="img/bg-title.jpg" alt="Anime Runner studio overlooking London at night" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,transparent_25%,rgba(2,6,23,.10)_58%,rgba(2,6,23,.48)_100%)]" />
      {view === "menu" ? (
        <>
          <div className="absolute left-1/2 top-[49%] z-10 flex w-[min(72vw,26rem)] -translate-x-1/2 flex-col gap-2.5 sm:top-[48%]">
            <button type="button" disabled={!newest} onClick={() => newest && onLoad?.(newest.id)} className={cn(menuButton, newest ? "border-[#ffd45b] bg-[#5a3908]/95 text-[#fff4c5] shadow-[0_0_22px_rgba(255,205,65,.52)] hover:bg-[#6b4509]" : "border-[#806a39]/55 bg-[#171827]/90 text-paper/35")}><Play size={18} fill="currentColor" /> {newest ? "CONTINUE" : "NO SAVE YET"}</button>
            <button type="button" onClick={() => { primeAudio(); sfx.select(); setView("setup"); }} className={cn(menuButton, "border-cyanx/80 bg-[#061d44]/95 text-paper shadow-[0_0_20px_rgba(59,225,255,.35)] hover:bg-[#0a2b5d]")}><Play size={18} /> NEW GAME</button>
            <button type="button" onClick={() => { sfx.select(); setView("load"); }} className={cn(menuButton, "border-cyanx/80 bg-[#061d44]/95 text-paper shadow-[0_0_20px_rgba(59,225,255,.30)] hover:bg-[#0a2b5d]")}><FolderOpen size={18} /> LOAD GAME</button>
            <button type="button" onClick={() => { sfx.select(); setView("scores"); }} className={cn(menuButton, "border-cyanx/80 bg-[#061d44]/95 text-paper shadow-[0_0_20px_rgba(59,225,255,.30)] hover:bg-[#0a2b5d]")}><Trophy size={18} className="text-gold" /> HALL OF FAME</button>
            <button type="button" onClick={() => onStart("Anime Runner", SHOWRUNNERS[Math.floor(Math.random() * SHOWRUNNERS.length)].id)} className="btn-press mx-auto mt-0.5 flex min-h-10 items-center gap-1.5 rounded-full border border-paper/20 bg-[#071020]/85 px-4 text-[10px] font-extrabold tracking-[0.16em] text-paper/75 backdrop-blur-md hover:border-cyanx/50 hover:text-cyanx"><Zap size={13} /> QUICK START</button>
          </div>
          {newest && <div className="absolute bottom-3 left-1/2 z-10 w-[min(86vw,32rem)] -translate-x-1/2 rounded-xl border border-paper/10 bg-[#030817]/72 px-3 py-2 text-center text-[9px] text-paper/55 backdrop-blur-md sm:text-[10px]"><span className="font-bold text-gold">{newest.save.summary.studio}</span> · {slotLabel(newest.id)} · {dateLabel(newest.save.summary.week)} · {formatGBP(newest.save.summary.cash)} · {formatNum(newest.save.summary.fans)} fans</div>}
        </>
      ) : (
        <div className="nice-scroll absolute inset-0 z-20 overflow-y-auto bg-[#020617]/74 px-3 py-5 backdrop-blur-[3px] sm:px-5 sm:py-8"><div className="mx-auto flex min-h-full w-full max-w-2xl items-center justify-center">
          {view === "load" && <div className="ink-card w-full border-cyanx/35 bg-[#071020]/95 p-4 shadow-[0_20px_80px_rgba(0,0,0,.65)] md:p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-display flex items-center gap-2 text-xl font-extrabold text-cyanx"><FolderOpen size={18} /> LOAD GAME</h2><Btn variant="ghost" onClick={() => setView("menu")}><ChevronLeft size={16} /> Back</Btn></div><SaveSlots mode="load" refreshKey={saveTick} onChanged={() => setSaveTick((n) => n + 1)} onPick={(id) => onLoad?.(id)} /></div>}
          {view === "scores" && <div className="ink-card w-full border-gold/35 bg-[#071020]/95 p-4 shadow-[0_20px_80px_rgba(0,0,0,.65)] md:p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-display flex items-center gap-2 text-xl font-extrabold text-gold"><Trophy size={18} /> HALL OF FAME</h2><Btn variant="ghost" onClick={() => setView("menu")}><ChevronLeft size={16} /> Back</Btn></div><HighScoreTable /></div>}
          {view === "setup" && <div className="ink-card w-full space-y-5 border-cyanx/30 bg-[#071020]/95 p-4 shadow-[0_20px_80px_rgba(0,0,0,.65)] md:p-6">
            <div className="flex items-center justify-between gap-3"><div><div className="text-[9px] font-black tracking-[0.22em] text-cyanx">{CAREER_YEARS}-YEAR CAREER</div><h2 className="font-display text-xl font-extrabold md:text-2xl">FOUND YOUR STUDIO</h2></div><Btn variant="ghost" onClick={() => setView("menu")}><ChevronLeft size={16} /> Back</Btn></div>
            <div><label className="text-xs font-bold tracking-widest text-paper/50">STUDIO NAME</label><div className="mt-1.5 flex gap-2"><input value={studio} onChange={(e) => setStudio(e.target.value.slice(0, 26))} className="ink-input flex-1 px-4 py-3 text-base font-bold" placeholder="Anime Runner" /><Btn variant="ghost" onClick={() => setStudio(`Studio ${randomTitle().split(" ")[0]}`)} aria-label="Random name"><Dices size={18} /></Btn></div></div>
            <div><label className="text-xs font-bold tracking-widest text-paper/50">CHOOSE YOUR SHOWRUNNER</label><div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">{SHOWRUNNERS.map((s) => <button key={s.id} onClick={() => { sfx.select(); setRunner(s.id); }} className={cn("btn-press ink-card group relative overflow-hidden rounded-2xl border text-left", runner === s.id ? "border-neon shadow-[0_0_30px_rgba(255,77,141,.35)]" : "border-line opacity-80 hover:opacity-100")}><div className="flex items-center gap-3 p-3"><img src={s.portrait} alt={s.name} className="h-20 w-20 rounded-xl border border-line object-cover" /><div className="min-w-0"><div className="font-display font-extrabold leading-tight">{s.name}</div><div className="text-[11px] font-bold text-cyanx">{s.title}</div><div className="mt-1 text-[11px] leading-snug text-paper/60">{s.perk}</div><div className="mt-1 text-[9px] font-extrabold text-gold">STORY {Math.round(showrunnerStats(s.id, 0).story)} · ART {Math.round(showrunnerStats(s.id, 0).art)} · SOUND {Math.round(showrunnerStats(s.id, 0).sound)}</div></div></div>{runner === s.id && <div className="absolute right-2 top-2 rounded-full bg-neon p-1 text-white"><Check size={13} /></div>}</button>)}</div></div>
            <Btn big variant="primary" className="w-full" onClick={() => onStart(studio.trim() || "Anime Runner", runner)}><Save size={18} /> OPEN FOR BUSINESS</Btn>
          </div>}
        </div></div>
      )}
    </div>
  );
}
