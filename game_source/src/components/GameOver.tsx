import { useEffect, useMemo, useState } from "react";
import { Crown, RotateCcw, Home, Skull, Flame, Clapperboard, Star, Banknote, Save } from "lucide-react";
import { Btn, CountUp } from "../fx/fx";
import { sfx } from "../engine/audio";
import { addScore } from "../engine/storage";
import { formatNum, formatGBP, yearOfWeek } from "../engine/data";
import { studioScore, type RunState } from "../engine/state";
import { HighScoreTable } from "./Title";
import { cn } from "../utils/cn";

export default function GameOver({
  run,
  victory,
  onRestart,
  onTitle,
}: {
  run: RunState;
  victory: boolean;
  onRestart: () => void;
  onTitle: () => void;
}) {
  const [name, setName] = useState(run.studio);
  const [savedRank, setSavedRank] = useState<number | null>(null);
  const score = useMemo(() => studioScore(run), [run]);

  useEffect(() => {
    if (victory) sfx.fanfare();
    else sfx.fail();
  }, [victory]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r") onRestart();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onRestart]);

  const save = () => {
    sfx.fanfare();
    const { rank } = addScore({
      name: name.trim() || run.studio || "Unknown Studio",
      score,
      fans: run.fans,
      shows: run.showsMade,
      year: yearOfWeek(run.week),
      victory,
      date: Date.now(),
    });
    setSavedRank(rank);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-ink nice-scroll">
      <div className="absolute inset-0 gridlines" />
      <div
        className={cn(
          "absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full blur-[120px]",
          victory ? "bg-gold/15" : "bg-neon/10"
        )}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 p-4 py-8">
        <div className="text-center anim-up">
          <div className={cn("text-xs tracking-[0.5em]", victory ? "text-gold" : "text-neon")}>
            {victory ? "STUDIO LEGEND" : "BANKRUPT"}
          </div>
          <h1 className={cn("font-display text-5xl font-extrabold md:text-7xl", victory ? "shine-text" : "text-paper")}>
            {victory ? "STUDIO LEGEND" : "BANKRUPT"}
          </h1>
          <div className="mt-1 flex items-center justify-center gap-2 text-paper/60">
            {victory ? <Crown size={15} className="text-gold" /> : <Skull size={15} className="text-neon" />}
            <span className="text-sm">
              {victory
                ? `${run.studio} defined a whole era of anime.`
                : `${run.studio} ran out of ink in Year ${yearOfWeek(run.week)}.`}
            </span>
          </div>
        </div>

        <div className="anim-up ink-card w-full p-4" style={{ animationDelay: "80ms" }}>
          <div className="text-center">
            <div className="text-[10px] font-bold tracking-[0.4em] text-paper/40">FINAL SCORE</div>
            <div className="font-display text-5xl font-extrabold text-gold drop-shadow-[0_0_20px_rgba(255,209,102,.4)]">
              <CountUp to={score} duration={1400} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat icon={<Clapperboard size={14} className="text-cyanx" />} k="Shows" v={String(run.showsMade)} />
            <Stat icon={<Star size={14} className="text-gold" />} k="Hall of Fame" v={String(run.hallOfFame.length)} />
            <Stat icon={<Flame size={14} className="text-neon" />} k="Fans" v={formatNum(run.fans)} />
            <Stat icon={<Banknote size={14} className="text-mint" />} k="Revenue" v={formatGBP(run.totalRevenue)} />
          </div>
        </div>

        {savedRank === null ? (
          <div className="anim-up flex w-full gap-2" style={{ animationDelay: "140ms" }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              className="ink-input flex-1 px-4 py-3 font-bold"
              placeholder="Studio name"
            />
            <Btn variant="gold" onClick={save}>
              <Save size={16} /> SAVE
            </Btn>
          </div>
        ) : (
          <div className="anim-up w-full" style={{ animationDelay: "140ms" }}>
            <HighScoreTable highlight={savedRank >= 0 ? savedRank : undefined} />
          </div>
        )}

        <div className="anim-up flex gap-2" style={{ animationDelay: "200ms" }}>
          <Btn big variant="primary" className="anim-ring" onClick={onRestart}>
            <RotateCcw size={18} /> INSTANT RESTART (R)
          </Btn>
          <Btn big variant="ghost" onClick={onTitle}>
            <Home size={18} /> TITLE
          </Btn>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel2/60 p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-[9px] font-bold tracking-wider text-paper/40">
        {icon} {k.toUpperCase()}
      </div>
      <div className="mt-0.5 truncate font-display text-sm font-extrabold">{v}</div>
    </div>
  );
}
