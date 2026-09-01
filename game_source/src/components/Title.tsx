import { useEffect, useState } from "react";
import { Play, Zap, Trophy, ChevronLeft, Check, Sparkles, Dices, Save, Trash2 } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx, primeAudio } from "../engine/audio";
import {
  formatPlaytime,
  formatWhen,
  getScores,
  SLOT_COUNT,
  type SaveSlot,
  type SaveSlots,
  type ScoreEntry,
} from "../engine/storage";
import { PROTAGONISTS, SHOWRUNNERS, randomTitle, formatNum, formatGBPShort } from "../engine/data";
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
              Y{s.year} · {s.shows} shows · {formatNum(s.fans)} fans {s.victory ? "· LEGEND" : ""}
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
  onContinue,
  onDeleteSave,
  saves,
}: {
  onStart: (studio: string, showrunner: string) => void;
  onContinue: (slot: number) => void;
  onDeleteSave: (slot: number) => void;
  saves: SaveSlots;
}) {
  const [view, setView] = useState<"menu" | "setup" | "scores" | "saves">("menu");
  const [studio, setStudio] = useState("Anime Runner");
  const [runner, setRunner] = useState<"steady" | "vision">("steady");

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        primeAudio();
        if (view === "menu") {
          sfx.select();
          setView("setup");
        } else if (view === "setup") {
          sfx.select();
          onStart(studio.trim() || "Anime Runner", runner);
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [view, studio, runner, onStart]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink">
      <img src="img/bg-title.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-abyss/70 via-abyss/40 to-abyss/85" />
      <div className="pointer-events-none absolute inset-0 screentone opacity-40" />

      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-between px-4 py-6 md:py-8">
        {/* logo */}
        <div className="text-center anim-up">
          <div className="mb-1 text-xs tracking-[0.5em] text-neon/90 md:text-sm">
            ANIME STUDIO TYCOON
          </div>
          <h1 className="font-display font-extrabold leading-[0.9] tracking-tight text-[11vw] drop-shadow-[0_6px_24px_rgba(0,0,0,.8)] md:text-[6.5rem]">
            <span className="text-paper drop-shadow-[0_4px_0_rgba(255,77,141,.55)]">ANIME</span>
            <span className="text-neon drop-shadow-[0_4px_0_rgba(59,225,255,.45)]">RUNNER</span>
          </h1>
          <div className="mt-2 inline-flex items-center gap-2 ink-chip px-4 py-1.5 text-[11px] font-bold tracking-[0.3em] text-paper/80 md:text-xs">
            <Sparkles size={13} className="text-gold" />
            ANIMATION HOUSE
            <Sparkles size={13} className="text-gold" />
          </div>
          <div className="mt-1.5 text-[10px] font-bold tracking-[0.2em] text-paper/60">
            TWELVE YEARS · £90,000 · ONE BEDROOM STUDIO
          </div>
        </div>

        {/* body */}
        <div className="w-full max-w-2xl anim-up" style={{ animationDelay: "120ms" }}>
          {view === "menu" && (
            <div className="flex flex-col items-center gap-3">
              <Btn big variant="primary" className="w-72 anim-ring" onClick={() => setView("setup")}>
                <Play size={20} /> FOUND YOUR STUDIO
              </Btn>
              <Btn big variant="gold" className="w-72" onClick={() => setView("saves")}>
                <Save size={20} /> LOAD CAREER
              </Btn>
              <Btn
                big
                variant="cyan"
                className="w-72"
                onClick={() => onStart("Anime Runner", Math.random() < 0.5 ? "steady" : "vision")}
              >
                <Zap size={20} /> QUICK START
              </Btn>
              <Btn big variant="ghost" className="w-72" onClick={() => setView("scores")}>
                <Trophy size={20} className="text-gold" /> HALL OF FAME
              </Btn>
              <div className="mt-2 max-w-xs text-center text-[11px] leading-relaxed text-paper/60">
                Take contracts, plan shows, pop the point bubbles your staff make.
                <br />
                ENTER begin · 1-7 desks · SPACE grab · ESC pause
              </div>
            </div>
          )}

          {view === "saves" && (
            <div className="ink-card p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display flex items-center gap-2 text-xl font-extrabold text-gold">
                  <Save size={18} /> SAVE SLOTS
                </h2>
                <Btn variant="ghost" onClick={() => setView("menu")}>
                  <ChevronLeft size={16} /> Back
                </Btn>
              </div>
              <div className="space-y-2">
                {Array.from({ length: SLOT_COUNT }, (_, i) => (
                  <SaveRow
                    key={i}
                    index={i}
                    slot={saves[i] ?? null}
                    onPlay={() => onContinue(i)}
                    onDelete={() => onDeleteSave(i)}
                    onNew={() => setView("setup")}
                  />
                ))}
              </div>
              <div className="mt-3 text-center text-[11px] text-paper/45">
                Careers save automatically as you play. Three slots, yours to manage.
              </div>
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

              {saves.every((v) => v !== null) && (
                <div className="rounded-xl border border-neon/40 bg-neon/10 p-2.5 text-[11px] text-neon2">
                  All three save slots are full — opening for business overwrites <b>slot 1</b>. Delete one from
                  LOAD CAREER first if you want to keep it.
                </div>
              )}

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

/* ------------------------------------------------------------- save slots */
function SaveRow({
  index,
  slot,
  onPlay,
  onDelete,
  onNew,
}: {
  index: number;
  slot: SaveSlot | null;
  onPlay: () => void;
  onDelete: () => void;
  onNew: () => void;
}) {
  if (!slot) {
    return (
      <button
        onClick={onNew}
        className="btn-press flex w-full items-center gap-3 rounded-xl border border-dashed border-line bg-panel2/40 p-3 text-left hover:border-gold/60"
      >
        <span className="pxcell grid h-9 w-9 shrink-0 place-items-center text-[11px] font-extrabold text-paper/40">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-paper/60">Empty slot</span>
          <span className="block text-[11px] text-paper/40">Start a twelve-year career here.</span>
        </span>
        <span className="text-[11px] font-extrabold text-gold">NEW</span>
      </button>
    );
  }
  const s = slot.summary;
  return (
    <div className="ink-card flex items-center gap-3 p-3">
      <span className="pxcell grid h-9 w-9 shrink-0 place-items-center text-[11px] font-extrabold text-gold">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">{s.studio}</div>
        <div className="text-[11px] text-paper/55">
          <span style={{ color: s.rankColor }}>{s.rankName}</span> · Year {s.year} · {s.showsMade} show
          {s.showsMade === 1 ? "" : "s"} · {s.staff} crew
        </div>
        <div className="text-[10px] text-paper/45">
          {formatGBPShort(s.cash)} · {formatNum(s.fans)} fans · {s.awards} award{s.awards === 1 ? "" : "s"} ·{" "}
          {s.officeName}
        </div>
        <div className="text-[10px] text-paper/35">
          {slot.auto ? "autosaved" : "saved"} {formatWhen(slot.savedAt)} · {formatPlaytime(slot.playtime)} played
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Btn variant="cyan" className="!px-3 !py-1.5 text-xs" onClick={onPlay}>
          <Play size={13} /> CONTINUE
        </Btn>
        <button
          onClick={onDelete}
          className="btn-press flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[10px] text-neon/80 hover:bg-neon/10"
          aria-label={`Delete save slot ${index + 1}`}
        >
          <Trash2 size={11} /> Delete
        </button>
      </div>
    </div>
  );
}
