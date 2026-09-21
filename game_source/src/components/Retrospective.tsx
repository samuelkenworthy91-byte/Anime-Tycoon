import { useMemo } from "react";
import {
  Crown,
  Award,
  Banknote,
  Flame,
  Star,
  Layers,
  Users,
  Swords,
  Landmark,
  TrendingUp,
  TrendingDown,
  Clock,
  Play,
  Home,
} from "lucide-react";
import { Btn, CountUp } from "../fx/fx";
import { runCareerEvaluation, type CareerCategory } from "../engine/legacy";
import { CAREER_YEARS, formatGBP, formatNum, ROLE_LABEL } from "../engine/data";
import { studioReputationTraits } from "../engine/studioReputation";
import { rivalMemoriesFor } from "../engine/rivalMemories";
import type { RunState } from "../engine/state";

const CAT_ICONS: Record<string, React.ReactNode> = {
  revenue: <Banknote size={14} className="text-mint" />,
  fans: <Flame size={14} className="text-neon2" />,
  awards: <Award size={14} className="text-gold" />,
  best: <Star size={14} className="text-gold" />,
  franchises: <Layers size={14} className="text-cyanx" />,
  rank: <Crown size={14} className="text-gold" />,
  staff: <Users size={14} className="text-viol" />,
  rivals: <Swords size={14} className="text-neon" />,
  hof: <Landmark size={14} className="text-gold" />,
};

export default function Retrospective({
  run,
  onContinue,
  onTitle,
}: {
  run: RunState;
  onContinue: () => void;
  onTitle: () => void;
}) {
  const ev = useMemo(() => runCareerEvaluation(run), [run]);
  const h = ev.history;
  const reputation = useMemo(() => studioReputationTraits(run), [run]);
  const goldenPairs = (run.staffRelationships ?? []).filter((relationship) => relationship.goldenPair).sort((a,b)=>b.acclaimedReleases-a.acclaimedReleases);
  const rivalHistory = run.rivalWorld.studios
    .map((studio) => ({ studio, memories: rivalMemoriesFor(run, studio.id) }))
    .filter((row) => row.memories.length)
    .sort((a,b) => b.memories.length - a.memories.length);
  const biggestRivalStory = rivalHistory[0] ?? null;

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-ink nice-scroll">
      <div className="absolute inset-0 gridlines" />
      <div
        className="absolute left-1/2 top-0 h-[460px] w-[760px] -translate-x-1/2 rounded-full blur-[130px]"
        style={{ background: `${ev.rank.color}14` }}
      />

      <div className="relative z-10 mx-auto w-full max-w-3xl space-y-4 p-4 py-8">
        {/* ------------------------------------------------ header */}
        <div className="anim-up text-center">
          <div className="text-xs tracking-[0.5em] text-paper/50">{CAREER_YEARS}-YEAR CAREER COMPLETE</div>
          <h1
            className="font-display mt-1 text-4xl font-extrabold md:text-6xl"
            style={{ color: ev.rank.color, textShadow: `0 0 24px ${ev.rank.color}55` }}
          >
            {ev.rank.label.toUpperCase()}
          </h1>
          <div className="mt-2 flex items-center justify-center gap-2 text-paper/60">
            <Crown size={15} className="text-gold" />
            <span className="text-sm">{ev.rank.blurb}</span>
          </div>
        </div>

        {/* ------------------------------------------------ score */}
        <div className="anim-up ink-card p-4 text-center" style={{ animationDelay: "70ms" }}>
          <div className="text-[10px] font-bold tracking-[0.4em] text-paper/40">CAREER SCORE</div>
          <div className="font-display text-5xl font-extrabold text-gold drop-shadow-[0_0_20px_rgba(255,209,102,.4)]">
            <CountUp to={ev.total} duration={1400} />
            <span className="text-2xl text-paper/40">/{ev.max}</span>
          </div>
          <div className="mt-2 text-[11px] text-paper/50">
            Nine categories of studio legacy — revenue, fans, awards, craft, franchises, rank, staff, rivalries and
            hall-of-fame productions.
          </div>
        </div>

        {/* ------------------------------------------------ categories */}
        <div className="anim-up grid gap-2 sm:grid-cols-3" style={{ animationDelay: "120ms" }}>
          {ev.categories.map((c) => (
            <CategoryCard key={c.id} c={c} />
          ))}
        </div>

        {/* ------------------------------------------------ history */}
        <div className="anim-up" style={{ animationDelay: "180ms" }}>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-paper/50">
            <Clock size={13} /> STUDIO HISTORY
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <HistoryCard
              icon={<TrendingUp size={15} className="text-mint" />}
              k="Biggest hit"
              v={h.biggestHit ? `“${h.biggestHit.title}”` : "—"}
              sub={h.biggestHit ? `${h.biggestHit.score}/40 · Year ${h.biggestHit.year}` : "No shows shipped"}
            />
            <HistoryCard
              icon={<TrendingDown size={15} className="text-neon" />}
              k="Biggest flop"
              v={h.biggestFlop ? `“${h.biggestFlop.title}”` : "—"}
              sub={h.biggestFlop ? `${h.biggestFlop.score}/40 · Year ${h.biggestFlop.year}` : "Nothing worth cringing at"}
            />
            <HistoryCard
              icon={<Layers size={15} className="text-cyanx" />}
              k="Longest franchise"
              v={h.longestFranchise ? `“${h.longestFranchise.title}”` : "—"}
              sub={h.longestFranchise ? `${h.longestFranchise.entries} entries · ${formatGBP(h.longestFranchise.revenue)}` : "No franchises built"}
            />
            <HistoryCard
              icon={<Users size={15} className="text-viol" />}
              k="Favourite staff"
              v={h.favouriteStaff ? h.favouriteStaff.name : "—"}
              sub={h.favouriteStaff ? `${ROLE_LABEL[h.favouriteStaff.role]} · ${h.favouriteStaff.shows} shows` : "No staff hired"}
            />
            <HistoryCard
              icon={<Banknote size={15} className="text-mint" />}
              k="Most profitable IP"
              v={h.mostProfitableIp ? `“${h.mostProfitableIp.title}”` : "—"}
              sub={h.mostProfitableIp ? formatGBP(h.mostProfitableIp.revenue) : "No IP yet"}
            />
            <HistoryCard
              icon={<Swords size={15} className="text-neon" />}
              k="Highest rival"
              v={h.highestRival ? h.highestRival.name : "—"}
              sub={h.highestRival ? `Finished #${h.highestRival.rank} in the industry` : "No rivals left standing"}
            />
            <HistoryCard
              icon={<Award size={15} className="text-gold" />}
              k="Awards"
              v={String(h.awards)}
              sub="London Anime Awards won"
            />
            <HistoryCard
              icon={<Flame size={15} className="text-neon2" />}
              k="Total shows"
              v={String(h.totalShows)}
              sub={`${run.hits} hits · ${formatNum(run.fans)} fans`}
            />
          </div>
        </div>

        {/* ------------------------------------------------ identity & people */}
        <div className="anim-up space-y-3" style={{ animationDelay: "205ms" }}>
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-paper/50">
              <Crown size={13} /> WHAT YOUR STUDIO BECAME
            </div>
            {reputation.length ? (
              <div className="grid gap-2 sm:grid-cols-3">
                {reputation.map((trait) => (
                  <div key={trait.id} className="ink-card border-cyanx/25 p-3">
                    <div className="text-[10px] font-black tracking-wider text-cyanx">{trait.label.toUpperCase()}</div>
                    <div className="mt-1 text-[10px] leading-relaxed text-paper/55">{trait.description}</div>
                    <div className="mt-1 text-[8px] font-bold text-paper/35">{trait.evidence}</div>
                  </div>
                ))}
              </div>
            ) : <div className="ink-card p-3 text-center text-xs text-paper/40">The studio remained too young to acquire a clear industry reputation.</div>}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="ink-card p-3">
              <div className="text-[9px] font-black tracking-wider text-viol">CREATIVE RELATIONSHIPS</div>
              {goldenPairs.length ? goldenPairs.slice(0,3).map((pair) => {
                const names = pair.staffIds.map((id) => run.staff.find((staff) => staff.id === id)?.name ?? run.legends.find((legend) => legend.id === id)?.name ?? "Former creator");
                return <div key={pair.key} className="mt-1.5 rounded-lg border border-gold/25 bg-gold/5 p-2"><b className="text-[10px] text-gold">GOLDEN PAIR · {names.join(" + ")}</b><div className="text-[9px] text-paper/45">{pair.sharedReleases} shared releases · {pair.acclaimedReleases} hits · best {pair.bestScore}/40{pair.bestTitle ? ` “${pair.bestTitle}”` : ""}</div></div>;
              }) : <div className="mt-2 text-[10px] text-paper/40">No partnership reached Golden Pair status.</div>}
            </div>
            <div className="ink-card p-3">
              <div className="text-[9px] font-black tracking-wider text-neon2">RIVAL HISTORY</div>
              {biggestRivalStory ? <><div className="mt-1 font-display text-sm font-extrabold">{biggestRivalStory.studio.name}</div><div className="text-[9px] text-paper/45">{biggestRivalStory.memories.length} memorable clashes, poaches or head-to-head releases.</div>{biggestRivalStory.memories.slice(0,2).map((memory)=><div key={memory.id} className="mt-1 text-[9px] text-paper/55">• {memory.text}</div>)}</> : <div className="mt-2 text-[10px] text-paper/40">No rivalry accumulated a lasting story.</div>}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ timeline */}
        {h.timeline.length > 0 && (
          <div className="anim-up" style={{ animationDelay: "220ms" }}>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-paper/50">
              <Star size={13} /> TIMELINE
            </div>
            <div className="space-y-1">
              {h.timeline.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-14 shrink-0 text-right font-display font-extrabold text-gold">Y{t.year}</span>
                  <span className="text-paper/70">{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------ actions */}
        <div className="anim-up flex flex-col gap-2 pt-1 sm:flex-row" style={{ animationDelay: "260ms" }}>
          <Btn big variant="primary" className="anim-ring flex-1" onClick={onContinue}>
            <Play size={18} /> CONTINUE IN SANDBOX
          </Btn>
          <Btn big variant="ghost" onClick={onTitle}>
            <Home size={18} /> TITLE
          </Btn>
        </div>
        <div className="pb-2 text-center text-[11px] text-paper/40">
          The 25-year career is complete. Continue only if you want an endless post-career sandbox; this result remains your formal career legacy.
        </div>
      </div>
    </div>
  );
}

function CategoryCard({ c }: { c: CareerCategory }) {
  const pct = Math.max(0, Math.min(100, Math.round((c.score / c.max) * 100)));
  return (
    <div className="ink-card p-3">
      <div className="flex items-center gap-1.5">
        {CAT_ICONS[c.id] ?? <Star size={14} className="text-gold" />}
        <span className="truncate text-xs font-bold text-paper/80">{c.label}</span>
        <span className="ml-auto font-display text-xs font-extrabold text-gold">
          {c.score}/{c.max}
        </span>
      </div>
      <div className="mt-1.5 truncate text-[11px] text-paper/50">{c.display}</div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel3">
        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HistoryCard({ icon, k, v, sub }: { icon: React.ReactNode; k: string; v: string; sub: string }) {
  return (
    <div className="ink-card flex items-center gap-2.5 p-2.5">
      <div className="rounded-lg bg-panel3 p-1.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-bold tracking-wider text-paper/40">{k.toUpperCase()}</div>
        <div className="truncate text-sm font-bold">{v}</div>
        <div className="truncate text-[10px] text-paper/50">{sub}</div>
      </div>
    </div>
  );
}
