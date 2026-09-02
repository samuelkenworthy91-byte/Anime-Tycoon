import { useEffect, useMemo, useState } from "react";
import { Play, Zap, Trophy, ChevronLeft, Check, Sparkles, Dices, Save, FolderOpen } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx, primeAudio } from "../engine/audio";
import { getScores, newestSave, slotLabel, type SlotId, type ScoreEntry } from "../engine/storage";
import SaveSlots from "./SaveSlots";
import { PROTAGONISTS, SHOWRUNNERS, randomTitle, formatNum, formatGBP, dateLabel, type Showrunner } from "../engine/data";
type ShowrunnerId = Showrunner["id"];
import { cn } from "../utils/cn";

/* ----------------------------------------------------------- score table */
export function HighScoreTable({ highlight }: { highlight?: number }) {
  const [scores] = useState<ScoreEntry[]>(() => getScores());
  if (!scores.length)
    return (
      <div className="py-8 text-center text-sm text-paper/50">
        No legends yet. The stage is waiting.
      </div>
    );
  return (
    <div className="space-y-1.5">
      {scores.map((s, i) => (
        <div
          key={s.date + i}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm anim-up",
            i === highlight
              ? "border-gold/70 bg-gold/10 shadow-[0_0_20px_rgba(255,209,102,.25)]"
              : "border-line bg-panel2/60"
          )}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <span
            className={cn(
              "font-display w-7 text-center font-extrabold",
              i === 0 ? "text-gold" : i === 1 ? "text-paper" : i === 2 ? "text-[#cd8b5a]" : "text-paper/40"
            )}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold">{s.name}</div>
            <div className="text-[11px] text-paper/50">
              Y{s.year} · {s.shows} shows · {formatNum(s.fans)} fans {s.dynasty ? "· DYNASTY" : s.victory ? "· LEGEND" : ""}
            </div>
          </div>
          <div className="font-display font-extrabold text-gold">{s.score.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- title */
export default function Title({
  onStart,
  onLoad,
}: {
  onStart: (studio: string, showrunner: string) => void;
  /** resume a specific slot */
  onLoad?: (id: SlotId) => void;
}) {
  /* bumped after a delete so the slot list and CONTINUE re-read storage */
  const [saveTick, setSaveTick] = useState(0);
  const newest = useMemo(() => newestSave(), [saveTick]);
  const [view, setView] = useState<"menu" | "setup" | "scores" | "load">("menu");
  const [studio, setStudio] = useState("Anime Runner");
  const [runner, setRunner] = useState<ShowrunnerId>("steady");

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        primeAudio();
        if (view === "menu") {
          sfx.select();
          if (newest && onLoad) {
            onLoad(newest.id);
            return;
          }
          setView("setup");
        } else if (view === "setup") {
          sfx.select();
          onStart(studio.trim() || "Anime Runner", runner);
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [view, studio, runner, onStart, newest, onLoad]);

  return (
    <div className="relative min-h-full w-full overflow-x-hidden overflow-y-auto overscroll-y-contain bg-ink">
      <img src="img/bg-title.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-abyss/70 via-abyss/40 to-abyss/85" />
      <div className="pointer-events-none absolute inset-0 screentone opacity-40" />

      <div className="relative z-10 mx-auto flex min-h-full max-w-5xl flex-col items-center justify-between gap-6 px-4 py-6 pb-10 md:py-8">
        {/* logo lockup — emblem + wordmark (deliberately unisex: no character art) */}
        <div className="flex flex-col items-center text-center anim-up">
          <img
            src="img/logo-mark.png"
            alt="Anime Runner"
            className="mb-2 h-16 w-16 rounded-2xl border border-gold/40 shadow-[0_8px_30px_rgba(0,0,0,.65)] md:h-20 md:w-20"
          />
          <div className="mb-1 text-[10px] tracking-[0.5em] text-cyanx/90 md:text-xs">
            ANIME STUDIO TYCOON
          </div>
          <h1 className="font-display font-extrabold leading-[0.9] tracking-tight text-[11vw] drop-shadow-[0_6px_24px_rgba(0,0,0,.8)] md:text-[6.5rem]">
            <span className="text-paper drop-shadow-[0_4px_0_rgba(17,26,61,.9)]">ANIME</span>
            <span className="text-gold drop-shadow-[0_4px_0_rgba(59,225,255,.45)]">RUNNER</span>
          </h1>
          <div className="mt-1 h-[3px] w-40 rounded-full bg-gradient-to-r from-transparent via-cyanx to-transparent md:w-64" />
          <div className="mt-2 inline-flex items-center gap-2 ink-chip px-4 py-1.5 text-[11px] font-bold tracking-[0.3em] text-paper/80 md:text-xs">
            <Sparkles size={13} className="text-gold" />
            ANIMATION HOUSE
            <Sparkles size={13} className="text-gold" />
          </div>
          <div className="mt-1.5 text-[10px] font-bold tracking-[0.2em] text-paper/60">
            EIGHT YEARS · £90,000 · ONE BEDROOM STUDIO
          </div>
        </div>

        {/* body */}
        <div className="w-full max-w-2xl anim-up" style={{ animationDelay: "120ms" }}>
          {view === "menu" && (
            <div className="flex flex-col items-center gap-3">
              {newest && (
                <div className="w-72 anim-pop">
                  <Btn
                    big
                    variant="gold"
                    className="w-full anim-ring"
                    onClick={() => onLoad?.(newest.id)}
                  >
                    <Save size={20} /> CONTINUE
                  </Btn>
                  <div className="mt-1 rounded-xl border border-gold/30 bg-gold/5 px-2.5 py-1.5 text-[10px] leading-tight text-paper/70">
                    <div className="truncate font-bold text-gold">
                      {newest.save.summary.studio}
                      <span className="ml-1.5 font-normal text-paper/45">
                        {slotLabel(newest.id)}
                      </span>
                    </div>
                    <div className="truncate">
                      {dateLabel(newest.save.summary.week)} ·{" "}
                      {formatGBP(newest.save.summary.cash)} ·{" "}
                      {formatNum(newest.save.summary.fans)} fans ·{" "}
                      {newest.save.summary.shows} shows
                    </div>
                  </div>
                </div>
              )}
              <Btn big variant="primary" className="w-72 anim-ring" onClick={() => setView("setup")}>
                <Play size={20} /> {newest ? "NEW CAREER" : "FOUND YOUR STUDIO"}
              </Btn>
              <Btn
                big
                variant="cyan"
                className="w-72"
                onClick={() => onStart("Anime Runner", SHOWRUNNERS[Math.floor(Math.random() * SHOWRUNNERS.length)].id)}
              >
                <Zap size={20} /> QUICK START
              </Btn>
              <Btn big variant="ghost" className="w-72" onClick={() => setView("load")}>
                <FolderOpen size={20} className="text-cyanx" /> LOAD GAME
              </Btn>
              <Btn big variant="ghost" className="w-72" onClick={() => setView("scores")}>
                <Trophy size={20} className="text-gold" /> HALL OF FAME
              </Btn>
              <div className="mt-2 max-w-xs text-center text-[11px] leading-relaxed text-paper/60">
                Take contracts, plan shows, pop the point bubbles your staff make.
                <br />
                {newest ? "ENTER resume" : "ENTER begin"} · 1-7 desks · SPACE grab · ESC pause
                <br />
                Autosaves as you play · 3 manual slots from the pause menu.
              </div>
            </div>
          )}

          {view === "load" && (
            <div className="ink-card p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display flex items-center gap-2 text-xl font-extrabold text-cyanx">
                  <FolderOpen size={18} /> LOAD GAME
                </h2>
                <Btn variant="ghost" onClick={() => setView("menu")}>
                  <ChevronLeft size={16} /> Back
                </Btn>
              </div>
              <SaveSlots
                mode="load"
                refreshKey={saveTick}
                onChanged={() => setSaveTick((n) => n + 1)}
                onPick={(id) => onLoad?.(id)}
              />
            </div>
          )}

          {view === "scores" && (
            <div className="ink-card p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display flex items-center gap-2 text-xl font-extrabold text-gold">
                  <Trophy size={18} /> HALL OF FAME
                </h2>
                <Btn variant="ghost" onClick={() => setView("menu")}>
                  <ChevronLeft size={16} /> Back
                </Btn>
              </div>
              <HighScoreTable />
            </div>
          )}

          {view === "setup" && (
            <div className="ink-card space-y-5 p-4 md:p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-extrabold md:text-2xl">REGISTER YOUR STUDIO</h2>
                <Btn variant="ghost" onClick={() => setView("menu")}>
                  <ChevronLeft size={16} /> Back
                </Btn>
              </div>

              <div>
                <label className="text-xs font-bold tracking-widest text-paper/50">STUDIO NAME</label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={studio}
                    onChange={(e) => setStudio(e.target.value.slice(0, 26))}
                    className="ink-input flex-1 px-4 py-3 text-base font-bold"
                    placeholder="Anime Runner"
                  />
                  <Btn
                    variant="ghost"
                    onClick={() => setStudio(`Studio ${randomTitle().split(" ")[0]}`)}
                    aria-label="Random name"
                  >
                    <Dices size={18} />
                  </Btn>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold tracking-widest text-paper/50">
                  CHOOSE YOUR SHOWRUNNER
                </label>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {SHOWRUNNERS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        sfx.select();
                        setRunner(s.id);
                      }}
                      className={cn(
                        "btn-press ink-card group relative overflow-hidden rounded-2xl border text-left",
                        runner === s.id
                          ? "border-neon shadow-[0_0_30px_rgba(255,77,141,.35)]"
                          : "border-line opacity-80 hover:opacity-100"
                      )}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <img
                          src={s.img}
                          alt={s.name}
                          className="h-20 w-20 rounded-xl border border-line object-cover"
                        />
                        <div className="min-w-0">
                          <div className="font-display font-extrabold leading-tight">{s.name}</div>
                          <div className="text-[11px] font-bold text-cyanx">{s.title}</div>
                          <div className="mt-1 text-[11px] leading-snug text-paper/60">{s.perk}</div>
                        </div>
                      </div>
                      {runner === s.id && (
                        <div className="absolute right-2 top-2 rounded-full bg-neon p-1 text-white">
                          <Check size={13} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Btn
                big
                variant="primary"
                className="w-full"
                onClick={() => onStart(studio.trim() || "Anime Runner", runner)}
              >
                <Zap size={20} /> OPEN FOR BUSINESS
              </Btn>
            </div>
          )}
        </div>

        {/* marquee */}
        <div className="w-full overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max gap-3 pr-3" style={{ animation: "marquee 36s linear infinite" }}>
            {[...PROTAGONISTS.slice(0, 12), ...PROTAGONISTS.slice(0, 12)].map((p, i) => (
              <div key={i} className="ink-card flex items-center gap-2.5 p-2 pr-4">
                <img src={p.img} alt={p.name} className="h-11 w-11 rounded-lg object-cover" />
                <div>
                  <div className="font-display text-xs font-extrabold">{p.name}</div>
                  <div className="text-[10px] text-paper/50">{p.archetype}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
