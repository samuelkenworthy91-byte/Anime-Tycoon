import { useState } from "react";
import { Flame, Handshake, PhoneCall, Radio, TrendingDown, TrendingUp } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  AUDIENCES,
  GENRES,
  MEDIUMS,
  dateLabel,
  formatGBP,
  type AudienceId,
  type MediumId,
} from "../engine/data";
import {
  HEAT_COLOR,
  HEAT_LABEL,
  PARTNERS,
  effectiveHeat,
  negotiationChance,
  partnerById,
  repLabel,
  saturationOf,
  saturationPenalty,
  type Commission,
} from "../engine/market";
import { negotiateCommission, resolveMarketEvent, type RunState } from "../engine/state";

/* ---------------------------------------------------------------- helpers */

const AUD_IDS = Object.keys(AUDIENCES) as AudienceId[];
const MED_IDS = Object.keys(MEDIUMS) as MediumId[];

const SIDE_LABEL: Record<number, { txt: string; color: string }> = {
  [-1]: { txt: "COOLING", color: "#ff9d5e" },
  [0]: { txt: "STEADY", color: "#8b8fa3" },
  [1]: { txt: "IN DEMAND", color: "#5ef0c0" },
};

function genreLabel(id: string): string {
  return GENRES.find((g) => g.id === id)?.label ?? id;
}

function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 mt-4 flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-gold first:mt-0">
      {icon}
      {children}
    </div>
  );
}

/* ================================================================= panel */

export default function MarketPanel({
  run,
  setRun,
  onCommission,
}: {
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
  onCommission: (c: Commission) => void;
}) {
  const [tab, setTab] = useState<"trends" | "deals" | "partners">("deals");
  const week = run.week;
  const market = run.market;
  const recs = run.recentReleases ?? [];

  const upcoming = run.rivals
    .filter((rv) => rv.week > week && rv.week <= week + 20)
    .sort((a, b) => a.week - b.week)
    .slice(0, 6);

  const negotiate = (id: string, ask: "advance" | "share") => {
    sfx.select();
    setRun((r) => negotiateCommission(r, id, ask) ?? r);
  };

  const answerEvent = (id: string, accept: boolean) => {
    if (accept) sfx.fanfare();
    else sfx.select();
    setRun((r) => resolveMarketEvent(r, id, accept) ?? r);
  };

  return (
    <div className="space-y-1 text-[12px]">
      {/* ------------------------------------------------------------ tabs */}
      <div className="mb-2 flex gap-1">
        {(
          [
            ["deals", "DEALS"],
            ["trends", "TRENDS"],
            ["partners", "PARTNERS"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              sfx.select();
              setTab(id);
            }}
            className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-bold tracking-widest transition-colors ${
              tab === id ? "border-gold/60 bg-gold/15 text-gold" : "border-paper/15 bg-paper/5 text-paper/50"
            }`}
          >
            {label}
            {id === "deals" && (run.commissions.length + run.marketEvents.length > 0) && (
              <span className="ml-1 text-cyanx">({run.commissions.length + run.marketEvents.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* ----------------------------------------------------------- DEALS */}
      {tab === "deals" && (
        <>
          {run.marketEvents.length > 0 && (
            <>
              <SectionTitle icon={<PhoneCall size={12} />}>THE PHONE IS RINGING</SectionTitle>
              {run.marketEvents.map((ev) => (
                <div key={ev.id} className="rounded-lg border border-cyanx/40 bg-cyanx/10 p-2.5">
                  <div className="text-paper/90">{ev.text}</div>
                  <div className="mt-1 text-[10px] text-paper/50">Answer by {dateLabel(ev.expiresWeek)}</div>
                  <div className="mt-2 flex gap-2">
                    <Btn variant="gold" className="flex-1" onClick={() => answerEvent(ev.id, true)}>
                      {ev.accept}
                    </Btn>
                    <Btn variant="ghost" className="flex-1" onClick={() => answerEvent(ev.id, false)}>
                      {ev.decline}
                    </Btn>
                  </div>
                </div>
              ))}
            </>
          )}

          <SectionTitle icon={<Handshake size={12} />}>COMMISSION BRIEFS</SectionTitle>
          {run.commissions.length === 0 && (
            <div className="rounded-lg border border-paper/10 bg-paper/5 p-3 text-paper/50">
              No briefs on the table right now — commissioners refresh their slates every few weeks.
            </div>
          )}
          {run.commissions.map((c) => {
            const partner = partnerById(c.partnerId);
            const rep = run.partners[c.partnerId] ?? 45;
            const odds = Math.round(negotiationChance(rep) * 100);
            return (
              <div
                key={c.id}
                className={`rounded-lg border p-2.5 ${c.emergency ? "border-red-400/50 bg-red-400/10" : "border-paper/15 bg-paper/5"}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-bold text-paper">
                    {partner.name}
                    {c.emergency && <span className="ml-1.5 text-[10px] font-bold text-red-300">EMERGENCY</span>}
                    {c.hypeBonus ? <span className="ml-1.5 text-[10px] font-bold text-gold">ADAPTATION +{c.hypeBonus} hype</span> : null}
                  </div>
                  <div className="shrink-0 text-[10px] text-paper/50">expires {dateLabel(c.expiresWeek)}</div>
                </div>
                <div className="mt-0.5 text-paper/80">
                  {MEDIUMS[c.medium].label} · {genreLabel(c.genre)} · for {AUDIENCES[c.audience].label}
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                  <div className="text-paper/60">
                    Advance <span className="font-bold text-mint">{formatGBP(c.advance)}</span>
                  </div>
                  <div className="text-paper/60">
                    Their share <span className="font-bold text-paper">{Math.round(c.share * 100)}%</span>
                  </div>
                  <div className="text-paper/60">
                    Min quality <span className="font-bold text-paper">{c.minQuality}/40</span>
                  </div>
                  <div className="text-paper/60">
                    Deadline <span className="font-bold text-paper">{c.maxWeeks} weeks</span>
                  </div>
                  <div className="col-span-2 text-paper/60">
                    Quality bonus <span className="font-bold text-gold">{formatGBP(c.bonus)}</span>
                    <span className="text-paper/40"> if you score {c.minQuality + 6}+</span>
                  </div>
                </div>
                <div className="mt-1 text-[10px] italic text-paper/45">“{c.restriction}”</div>
                <div className="mt-2 flex gap-1.5">
                  <Btn
                    variant="gold"
                    className="flex-1"
                    onClick={() => {
                      sfx.whoosh();
                      onCommission(c);
                    }}
                  >
                    ACCEPT BRIEF
                  </Btn>
                  {!c.negotiated ? (
                    <>
                      <Btn variant="ghost" onClick={() => negotiate(c.id, "advance")}>
                        +£ ({odds}%)
                      </Btn>
                      <Btn variant="ghost" onClick={() => negotiate(c.id, "share")}>
                        −% ({odds}%)
                      </Btn>
                    </>
                  ) : (
                    <div className="flex items-center px-2 text-[10px] text-paper/40">final terms</div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="mt-2 rounded-lg border border-paper/10 bg-paper/5 p-2.5 text-[11px] text-paper/50">
            Self-funding is always an option: you pay every bill but keep 100% of the revenue and total creative control.
          </div>
        </>
      )}

      {/* ---------------------------------------------------------- TRENDS */}
      {tab === "trends" && (
        <>
          <SectionTitle icon={<Flame size={12} />}>GENRE TRENDS</SectionTitle>
          <div className="grid grid-cols-2 gap-1">
            {GENRES.filter((g) => run.genresUnlocked.includes(g.id)).map((g) => {
              const heat = effectiveHeat(market, recs, g.id, week);
              const sat = saturationOf(recs, g.id, week);
              const flooded = saturationPenalty(sat) > 0;
              return (
                <div key={g.id} className="rounded-md border border-paper/10 bg-paper/5 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-paper/85">{g.label}</span>
                    <span className="shrink-0 text-[9px] font-bold tracking-wider" style={{ color: HEAT_COLOR[heat + 2] }}>
                      {HEAT_LABEL[heat + 2]}
                    </span>
                  </div>
                  {flooded && (
                    <div className="text-[9px] text-red-300">flooded — {sat} recent releases nearby</div>
                  )}
                </div>
              );
            })}
          </div>

          <SectionTitle icon={<TrendingUp size={12} />}>AUDIENCE DEMAND</SectionTitle>
          <div className="grid grid-cols-2 gap-1">
            {AUD_IDS.map((a) => {
              const h = market.audiences[a] ?? 0;
              const s = SIDE_LABEL[h];
              return (
                <div key={a} className="flex items-center justify-between rounded-md border border-paper/10 bg-paper/5 px-2 py-1.5">
                  <span className="text-paper/85">{AUDIENCES[a].label}</span>
                  <span className="text-[9px] font-bold tracking-wider" style={{ color: s.color }}>
                    {s.txt}
                  </span>
                </div>
              );
            })}
          </div>

          <SectionTitle icon={<TrendingDown size={12} />}>FORMAT DEMAND</SectionTitle>
          <div className="grid grid-cols-3 gap-1">
            {MED_IDS.map((m) => {
              const h = market.mediums[m] ?? 0;
              const s = SIDE_LABEL[h];
              return (
                <div key={m} className="rounded-md border border-paper/10 bg-paper/5 px-2 py-1.5 text-center">
                  <div className="text-paper/85">{MEDIUMS[m].label}</div>
                  <div className="text-[9px] font-bold tracking-wider" style={{ color: s.color }}>
                    {s.txt}
                  </div>
                </div>
              );
            })}
          </div>

          <SectionTitle icon={<Radio size={12} />}>UPCOMING RIVAL PREMIERES</SectionTitle>
          {upcoming.length === 0 && <div className="text-paper/50">Nothing on the rivals' slates for now.</div>}
          {upcoming.map((rv, i) => (
            <div key={i} className="flex items-baseline justify-between gap-2 rounded-md border border-paper/10 bg-paper/5 px-2 py-1.5">
              <div className="min-w-0">
                <div className="truncate text-paper/85">“{rv.title}”</div>
                <div className="text-[10px] text-paper/50">
                  {rv.studio}
                  {rv.genre ? ` · ${genreLabel(rv.genre)}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-[10px] text-cyanx">{dateLabel(rv.week)}</div>
            </div>
          ))}
          <div className="mt-2 text-[10px] text-paper/40">
            Trends shift every season. A brilliant show succeeds in any market — trends move the money, not the reviews.
          </div>
        </>
      )}

      {/* -------------------------------------------------------- PARTNERS */}
      {tab === "partners" && (
        <>
          <SectionTitle icon={<Handshake size={12} />}>COMMISSIONER RELATIONS</SectionTitle>
          {PARTNERS.map((p) => {
            const rep = run.partners[p.id] ?? 45;
            return (
              <div key={p.id} className="rounded-lg border border-paper/15 bg-paper/5 p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-bold text-paper">{p.name}</div>
                  <div className="shrink-0 text-[10px] font-bold text-cyanx">
                    {repLabel(rep)} · {rep}/100
                  </div>
                </div>
                <div className="mt-0.5 text-[10px] text-paper/50">{p.blurb}</div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper/10">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${rep}%`, background: rep >= 60 ? "#5ef0c0" : rep >= 35 ? "#ffd166" : "#ff5e5e" }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-paper/45">
                  Likes: {p.likesGenres.slice(0, 3).map(genreLabel).join(", ")} · {p.mediums.map((m) => MEDIUMS[m].label).join("/")}
                </div>
              </div>
            );
          })}
          <div className="mt-2 text-[10px] text-paper/40">
            Deliver on brief to earn better advances and softer shares. Miss quality bars or deadlines and they remember.
          </div>
        </>
      )}
    </div>
  );
}
