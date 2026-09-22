import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  Dices,
  FolderOpen,
  Settings2,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Btn } from "../fx/fx";
import { isMuted, primeAudio, setMuted, sfx } from "../engine/audio";
import {
  getScores,
  newestSave,
  slotLabel,
  type ScoreEntry,
  type SlotId,
} from "../engine/storage";
import SaveSlots from "./SaveSlots";
import {
  SHOWRUNNERS,
  dateLabel,
  formatGBP,
  formatNum,
  randomTitle,
  type Showrunner,
} from "../engine/data";
import { showrunnerStats } from "../engine/studioOps";
import { cn } from "../utils/cn";

type ShowrunnerId = Showrunner["id"];
type TitleView = "menu" | "setup" | "load" | "settings" | "credits" | "scores" | "quit";

const TITLE_ART = "img/title-london.webp";

export function HighScoreTable({ highlight }: { highlight?: number }) {
  const [scores] = useState<ScoreEntry[]>(() => getScores());
  if (!scores.length) {
    return (
      <div className="py-8 text-center text-sm text-paper/50">
        No legends yet. The stage is waiting.
      </div>
    );
  }

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
              i === 0
                ? "text-gold"
                : i === 1
                  ? "text-paper"
                  : i === 2
                    ? "text-[#cd8b5a]"
                    : "text-paper/40"
            )}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold">{s.name}</div>
            <div className="text-[11px] text-paper/50">
              Y{s.year} · {s.shows} shows · {formatNum(s.fans)} fans{" "}
              {s.dynasty ? "· SANDBOX" : s.victory ? "· LEGEND" : ""}
            </div>
          </div>
          <div className="font-display font-extrabold text-gold">
            {s.score.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

function Hotspot({
  label,
  className,
  onClick,
}: {
  label: string;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        primeAudio();
        sfx.select();
        onClick();
      }}
      className={cn(
        "absolute z-10 rounded-2xl bg-transparent transition duration-150",
        "hover:bg-white/[0.06] hover:shadow-[0_0_28px_rgba(61,225,255,.18)]",
        "active:translate-y-[2px] active:scale-[0.985] active:bg-black/30 active:shadow-[inset_0_5px_14px_rgba(0,0,0,.65)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyanx focus-visible:ring-offset-2 focus-visible:ring-offset-black/50",
        className
      )}
    />
  );
}

export default function Title({
  onStart,
  onLoad,
}: {
  onStart: (studio: string, showrunner: string) => void;
  onLoad?: (id: SlotId) => void;
}) {
  const [saveTick, setSaveTick] = useState(0);
  const newest = useMemo(() => newestSave(), [saveTick]);
  const [view, setView] = useState<TitleView>("menu");
  const [studio, setStudio] = useState("Anime Runner");
  const [runner, setRunner] = useState<ShowrunnerId>("steady");
  const [muted, setMutedState] = useState(() => isMuted());

  const backToMenu = () => {
    sfx.back();
    setView("menu");
  };

  const continueCareer = () => {
    if (newest && onLoad) {
      onLoad(newest.id);
      return;
    }
    setView("setup");
  };

  const quickStart = () => {
    const generatedStudio = `Studio ${randomTitle().split(" ")[0]}`;
    const selected = SHOWRUNNERS[Math.floor(Math.random() * SHOWRUNNERS.length)] ?? SHOWRUNNERS[0];
    primeAudio();
    sfx.select();
    onStart(generatedStudio, selected.id);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && view !== "menu") {
        backToMenu();
        return;
      }
      if (e.key !== "Enter") return;
      primeAudio();
      sfx.select();
      if (view === "menu") {
        continueCareer();
      } else if (view === "setup") {
        onStart(studio.trim() || "Anime Runner", runner);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [view, studio, runner, onStart, newest, onLoad]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) {
      primeAudio();
      sfx.select();
    }
  };

  const requestQuit = () => {
    try {
      window.close();
    } catch {
      // Browsers normally refuse to close tabs they did not open.
    }
    setView("quit");
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#050612]">
      <img
        src={TITLE_ART}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
      />
      <div className="absolute inset-0 bg-[#050612]/45" />

      <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden">
        <div className="relative h-full shrink-0" style={{ aspectRatio: "720 / 1279" }}>
          <img
            src={TITLE_ART}
            alt="Anime Runner — Build your studio. Make the next big hit."
            className="pointer-events-none h-full w-full select-none object-cover"
            draggable={false}
          />

          {view === "menu" && (
            <>
              <Hotspot
                label={newest ? "Continue career" : "Start a new career"}
                className="left-[28.2%] top-[49.1%] h-[5.55%] w-[43.8%]"
                onClick={continueCareer}
              />
              <Hotspot
                label="New game"
                className="left-[28.2%] top-[55.0%] h-[4.95%] w-[43.8%]"
                onClick={() => setView("setup")}
              />
              <Hotspot
                label="Load game"
                className="left-[28.2%] top-[60.35%] h-[4.95%] w-[43.8%]"
                onClick={() => setView("load")}
              />
              <Hotspot
                label="Settings"
                className="left-[28.2%] top-[65.55%] h-[4.95%] w-[43.8%]"
                onClick={() => setView("settings")}
              />
              <Hotspot
                label="Credits"
                className="left-[34.1%] top-[71.6%] h-[4.2%] w-[13.5%] rounded-xl"
                onClick={() => setView("credits")}
              />
              <Hotspot
                label="Quit"
                className="left-[53.4%] top-[71.6%] h-[4.2%] w-[13.5%] rounded-xl"
                onClick={requestQuit}
              />
              <button
                type="button"
                onClick={quickStart}
                className="btn-press absolute left-[24%] top-[77.1%] z-20 flex min-h-[44px] w-[52%] items-center justify-center gap-2 rounded-xl border border-cyanx/55 bg-[#07101d]/85 px-3 py-2 text-center shadow-[0_0_22px_rgba(61,225,255,.18)] backdrop-blur-sm transition active:translate-y-[2px] active:scale-[0.98] active:border-cyanx/30 active:bg-black/70 active:shadow-[inset_0_5px_14px_rgba(0,0,0,.7)]"
              >
                <Zap size={15} className="shrink-0 text-cyanx" />
                <span><b className="block font-display text-[10px] tracking-wider text-cyanx">QUICK START</b><span className="block text-[7px] text-paper/55">Random studio · random showrunner</span></span>
              </button>
            </>
          )}
        </div>
      </div>

      {view !== "menu" && (
        <div className="nice-scroll absolute inset-0 z-30 overflow-y-auto bg-[#03040d]/78 px-3 py-4 backdrop-blur-md sm:px-5 sm:py-6">
          <div className="mx-auto flex min-h-full w-full max-w-2xl items-center justify-center">
            {view === "load" && (
              <div className="ink-card w-full p-4 shadow-2xl md:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="font-display flex items-center gap-2 text-xl font-extrabold text-cyanx">
                    <FolderOpen size={18} /> LOAD GAME
                  </h2>
                  <Btn variant="ghost" onClick={backToMenu}>
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

            {view === "settings" && (
              <div className="ink-card w-full max-w-lg p-5 shadow-2xl md:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="font-display flex items-center gap-2 text-xl font-extrabold text-cyanx">
                    <Settings2 size={19} /> SETTINGS
                  </h2>
                  <Btn variant="ghost" onClick={backToMenu}>
                    <ChevronLeft size={16} /> Back
                  </Btn>
                </div>
                <button
                  type="button"
                  onClick={toggleSound}
                  className="ink-card btn-press flex w-full items-center justify-between gap-4 border border-line p-4 text-left"
                >
                  <div>
                    <div className="font-display font-extrabold">SOUND EFFECTS</div>
                    <div className="mt-1 text-xs text-paper/55">
                      Toggle game audio on or off. Your choice is remembered.
                    </div>
                  </div>
                  <div className={cn("rounded-xl p-3", muted ? "bg-panel2 text-paper/45" : "bg-cyanx/15 text-cyanx")}>
                    {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                  </div>
                </button>
              </div>
            )}

            {view === "credits" && (
              <div className="ink-card w-full max-w-lg p-5 text-center shadow-2xl md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3 text-left">
                  <h2 className="font-display text-xl font-extrabold text-gold">CREDITS</h2>
                  <Btn variant="ghost" onClick={backToMenu}>
                    <ChevronLeft size={16} /> Back
                  </Btn>
                </div>
                <div className="rounded-2xl border border-line bg-panel2/70 p-5">
                  <div className="font-display text-2xl font-extrabold">ANIME RUNNER</div>
                  <div className="mt-2 text-sm leading-relaxed text-paper/65">
                    An anime-studio management game about building a team, making shows,
                    surviving the industry and creating a legacy.
                  </div>
                </div>
                <Btn big variant="gold" className="mt-4 w-full" onClick={() => setView("scores")}>
                  <Trophy size={18} /> HALL OF FAME
                </Btn>
              </div>
            )}

            {view === "scores" && (
              <div className="ink-card w-full p-4 shadow-2xl md:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="font-display flex items-center gap-2 text-xl font-extrabold text-gold">
                    <Trophy size={18} /> HALL OF FAME
                  </h2>
                  <Btn variant="ghost" onClick={() => setView("credits")}>
                    <ChevronLeft size={16} /> Back
                  </Btn>
                </div>
                <HighScoreTable />
              </div>
            )}

            {view === "quit" && (
              <div className="ink-card w-full max-w-md p-5 text-center shadow-2xl md:p-6">
                <div className="font-display text-xl font-extrabold">LEAVING THE STUDIO?</div>
                <div className="mt-2 text-sm leading-relaxed text-paper/65">
                  On Android, use the system Back or Home control. In a browser, close this tab when you are finished.
                </div>
                <Btn big variant="primary" className="mt-5 w-full" onClick={backToMenu}>
                  RETURN TO TITLE
                </Btn>
              </div>
            )}

            {view === "setup" && (
              <div className="ink-card w-full space-y-5 p-4 shadow-2xl md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold md:text-2xl">REGISTER YOUR STUDIO</h2>
                  <Btn variant="ghost" onClick={backToMenu}>
                    <ChevronLeft size={16} /> Back
                  </Btn>
                </div>

                <div>
                  <label className="text-xs font-bold tracking-widest text-paper/50">STUDIO NAME</label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      value={studio}
                      onChange={(e) => setStudio(e.target.value.slice(0, 26))}
                      className="ink-input min-w-0 flex-1 px-4 py-3 text-base font-bold"
                      placeholder="Anime Runner"
                    />
                    <Btn
                      variant="ghost"
                      onClick={() => setStudio(`Studio ${randomTitle().split(" ")[0]}`)}
                      aria-label="Random studio name"
                    >
                      <Dices size={18} />
                    </Btn>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold tracking-widest text-paper/50">CHOOSE YOUR SHOWRUNNER</label>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {SHOWRUNNERS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
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
                            src={s.portrait}
                            alt={s.name}
                            className="h-20 w-20 shrink-0 rounded-xl border border-line object-cover"
                          />
                          <div className="min-w-0">
                            <div className="font-display font-extrabold leading-tight">{s.name}</div>
                            <div className="text-[11px] font-bold text-cyanx">{s.title}</div>
                            <div className="mt-1 text-[11px] leading-snug text-paper/60">{s.perk}</div>
                            <div className="mt-1 text-[9px] font-extrabold text-gold">
                              STORY {Math.round(showrunnerStats(s.id, 0).story)} · ART {Math.round(showrunnerStats(s.id, 0).art)} · SOUND {Math.round(showrunnerStats(s.id, 0).sound)}
                            </div>
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

                {newest && (
                  <div className="rounded-xl border border-gold/25 bg-gold/5 px-3 py-2 text-[11px] text-paper/60">
                    Existing autosave: <span className="font-bold text-gold">{newest.save.summary.studio}</span> · {slotLabel(newest.id)} · {dateLabel(newest.save.summary.week)} · {formatGBP(newest.save.summary.cash)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
