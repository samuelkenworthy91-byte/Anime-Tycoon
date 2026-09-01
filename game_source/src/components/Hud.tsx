import {
  Banknote,
  Calendar,
  Clock,
  Crown,
  Database,
  Flame,
  Save,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { GENRES, type GenreId } from "../engine/data";
import { SEASON_NAMES, rankOf, seasonView, type Market } from "../engine/loop";
import { studioScore } from "../engine/state";
import { cn } from "../utils/cn";

/**
 * The top bar.
 *
 * Two rows so nothing is fighting for space on a phone: identity and the
 * calendar on top, the numbers underneath. It is deliberately opaque and
 * heavily beveled — the studio scene behind it is bright and animated, and a
 * translucent bar disappeared into it.
 */
export default function Hud({
  run,
  officeName,
  clockDay,
  clockPhase,
  netPerWeek,
  objectivesDone,
  objectivesTotal,
  onSave,
  onObjectives,
  savedLabel,
}: {
  run: {
    studio: string;
    cash: number;
    rd: number;
    fans: number;
    awards: number;
    week: number;
    incomeThisWeek: number;
    market?: Market;
  };
  officeName: string;
  clockDay: number;
  clockPhase: number;
  /** cash in minus cash out, per in-game week */
  netPerWeek: number;
  objectivesDone: number;
  objectivesTotal: number;
  onSave: () => void;
  onObjectives: () => void;
  savedLabel: string;
}) {
  const score = studioScore(run as never);
  const rank = rankOf(score);
  const season = seasonView(run.week);
  const hot = run.market ? GENRES.find((g) => g.id === run.market!.hot) : undefined;
  const cold = run.market ? GENRES.find((g) => g.id === run.market!.cold) : undefined;
  const phaseName = ["MORNING", "AFTERNOON", "EVENING", "NIGHT"][clockPhase] ?? "DAY";
  const money = (n: number) =>
    n < 0
      ? `-£${Math.abs(n) >= 1_000_000 ? `${(Math.abs(n) / 1_000_000).toFixed(1)}M` : `${Math.round(Math.abs(n) / 1000)}k`}`
      : `£${n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : `${Math.round(n / 1000)}k`}`;
  const num = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${(n / 1000).toFixed(0)}k` : n.toLocaleString("en-GB");

  return (
    <div className="hud-bar relative z-30 shrink-0 px-2 py-1.5 pr-[74px] md:px-4">
      {/* ---------------------------------------------------------- row 1 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="pxcell grid h-6 w-6 shrink-0 place-items-center">
            <Crown size={13} className="text-gold" />
          </span>
          <span className="truncate font-display text-[13px] font-extrabold text-paper md:text-base">{run.studio}</span>
        </div>

        <span
          className="pxcell px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider"
          style={{ color: rank.rank.color, borderColor: "#0c0918" }}
          title={rank.next ? `${rank.next.name} at ${rank.next.min.toLocaleString("en-GB")} studio score` : "Top rank"}
        >
          {rank.rank.name.toUpperCase()}
        </span>

        <span className="pxcell-dark hidden px-1.5 py-0.5 text-[9px] font-bold text-paper/60 sm:inline">{officeName}</span>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="pxcell-dark flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-cyanx">
            <Calendar size={11} /> Y{season.year} · {SEASON_NAMES[season.season]} · W{(run.week % 12) + 1}
          </span>
          <span className="pxcell-dark hidden items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-paper/70 sm:flex">
            <Clock size={11} /> DAY {clockDay + 1} · {phaseName}
          </span>
          {hot && (
            <span
              className="pxcell hidden items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold md:flex"
              style={{ color: hot.color }}
              title="What audiences want this season"
            >
              <TrendingUp size={11} /> {hot.label}
            </span>
          )}
          {cold && (
            <span
              className="pxcell-dark hidden items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-paper/45 lg:flex"
              title="What audiences are tired of this season"
            >
              <TrendingDown size={11} /> {cold.label}
            </span>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------- row 2 */}
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <Stat
          icon={<Banknote size={13} />}
          label="CASH"
          value={money(run.cash)}
          color={run.cash < 0 ? "#ff4d8d" : "#5ef0c0"}
          danger={run.cash < 0}
        />
        <span
          className={cn(
            "pxcell-dark flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold",
            netPerWeek >= 0 ? "text-mint" : "text-neon"
          )}
          title="Broadcast income this week minus wages and rent"
        >
          {netPerWeek >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {money(netPerWeek)}/wk
        </span>
        <Stat icon={<Database size={13} />} label="RD" value={String(run.rd)} color="#8b5cf6" />
        <Stat icon={<Flame size={13} />} label="FANS" value={num(run.fans)} color="#ff85b3" />
        <Stat icon={<Trophy size={13} />} label="AWARDS" value={String(run.awards)} color="#ffd166" />
        <Stat icon={<Star size={13} />} label="SCORE" value={num(score)} color="#3be1ff" />

        <button
          onClick={onObjectives}
          className="btn-press pxcell ml-auto flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-paper/85"
          title="Open the objectives board"
        >
          <Target size={11} className={objectivesDone > 0 ? "text-mint" : "text-gold"} />
          {objectivesDone}/{objectivesTotal} GOALS
        </button>
        <button
          onClick={onSave}
          className="btn-press pxcell-dark flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-paper/70"
          title="Save the game"
        >
          <Save size={11} /> {savedLabel}
        </button>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  danger?: boolean;
}) {
  return (
    <span
      className={cn("pxcell flex items-center gap-1 px-1.5 py-0.5", danger && "border-neon")}
      style={{ color }}
    >
      {icon}
      <span className="text-[8px] font-bold tracking-widest text-paper/45">{label}</span>
      <span className="pxfont text-[11px] font-bold md:text-xs">{value}</span>
    </span>
  );
}

/** tiny helper used by the objectives board for genre chips */
export const genreLabel = (id: GenreId) => GENRES.find((g) => g.id === id)?.label ?? id;
