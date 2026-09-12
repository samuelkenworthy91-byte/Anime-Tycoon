import { useState } from "react";
import { AlertTriangle, Check, ChevronLeft, Megaphone, Rocket, Scissors, Target } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { POINT_COLOR, POINT_LABEL, formatGBP, type PointType } from "../engine/data";
import { showSaleOffers, type RunState } from "../engine/state";
import { facilityFX } from "../engine/facilities";
import { lateRevenueMult, type Project } from "../engine/projects";
import {
  MAX_STRATEGIC_CAMPAIGNS,
  STRATEGIC_CAMPAIGNS,
  campaignFit,
  campaignFitLabel,
  strategicCampaignHype,
} from "../engine/marketing";
import { cn } from "../utils/cn";

/** Release prep: choose a small strategic campaign mix, then air — or delay. */
export default function Ship({
  run,
  project,
  onAir,
  onSell,
  onBack,
}: {
  run: RunState;
  project: Project;
  onAir: (spent: number, hype: number) => void;
  onSell: (offerId: string) => void;
  onBack: () => void;
}) {
  const [spent, setSpent] = useState(0);
  const [hype, setHype] = useState(project.hype);
  const [bought, setBought] = useState<string[]>([]);
  const [confirmSale, setConfirmSale] = useState<string | null>(null);
  const saleOffers = showSaleOffers(run, project.id);

  const totalPts = project.points.story + project.points.art + project.points.sound;
  const lateMult = lateRevenueMult(project);
  const fx = facilityFX(run.facilities);
  const mktTier = run.facilities.marketing ?? 0;
  const dataTier = run.facilities.data ?? 0;

  const buyCampaign = (id: string, cost: number, h: number) => {
    if (bought.length >= MAX_STRATEGIC_CAMPAIGNS) return;
    sfx.cash();
    setSpent((s) => s + cost);
    setHype((x) => Math.min(100, x + h));
    setBought((p) => [...p, id]);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink gridlines">
      <div className="pointer-events-none absolute inset-0 screentone opacity-40" />

      <div className="relative z-10 flex items-center gap-2 border-b border-line/60 bg-ink/75 py-2 pl-3 pr-[76px] backdrop-blur-md">
        <span className="shrink-0 rounded-md bg-gold px-2 py-0.5 text-[10px] font-bold text-ink">RELEASE PREP</span>
        <span className="truncate font-display text-sm font-extrabold">{project.draft.title}</span>
      </div>

      <div className="nice-scroll relative z-10 mx-auto w-full max-w-4xl flex-1 overflow-y-auto p-4">
        <div className="text-center">
          <div className="text-[11px] tracking-[0.4em] text-gold">MASTER COMPLETE</div>
          <h2 className="font-display text-2xl font-extrabold md:text-3xl">BUILD THE LAUNCH</h2>
          <p className="mt-1 text-xs text-paper/60">Choose up to {MAX_STRATEGIC_CAMPAIGNS} campaigns. Marketing changes reach and opening demand — never the review-quality score.</p>
        </div>

        <div className="ink-card mt-3 grid grid-cols-3 gap-2 p-3 text-center">
          {(["story", "art", "sound"] as PointType[]).map((t) => (
            <div key={t}>
              <div className="font-display text-2xl font-extrabold" style={{ color: POINT_COLOR[t] }}>{project.points[t]}</div>
              <div className="text-[9px] font-bold text-paper/50">{POINT_LABEL[t].toUpperCase()}</div>
              <div className="mt-1 h-1.5 rounded bg-abyss"><div className="h-full rounded" style={{ width: `${totalPts ? (project.points[t] / totalPts) * 100 : 0}%`, background: POINT_COLOR[t] }} /></div>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-panel2/70 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 font-bold text-[#ff5e5e]"><Scissors size={13} /> {project.issues} unresolved editing notes</span>
          <span className="text-paper/50">−{(project.issues * 0.9).toFixed(1)} review points</span>
        </div>

        {project.lateWeeks > 0 && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-neon/50 bg-neon/10 px-3 py-2 text-xs font-bold text-neon">
            <AlertTriangle size={14} /> {project.lateWeeks} week{project.lateWeeks > 1 ? "s" : ""} past the deadline — the broadcaster pays ×{lateMult.toFixed(2)} on revenue.
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel2/50 p-2 text-[9px] text-paper/55">
          <Target size={12} className="text-cyanx" />
          <b className="text-paper">CAMPAIGN INTELLIGENCE</b>
          <span>Marketing Office T{mktTier}: hype ×{fx.hypeMult.toFixed(2)}, prices −{Math.round(fx.promoDiscount * 100)}%</span>
          <span>·</span>
          <span className={dataTier ? "text-cyanx" : "text-paper/35"}>Data Lab T{dataTier}: {dataTier ? "fit forecast active" : "fit hidden"}</span>
          <span className="ml-auto font-bold text-gold">{bought.length}/{MAX_STRATEGIC_CAMPAIGNS} booked</span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {STRATEGIC_CAMPAIGNS.map((campaign) => {
            const locked = campaign.minTier > mktTier && !run.research.includes("marketing");
            const isBought = bought.includes(campaign.id);
            const limitReached = bought.length >= MAX_STRATEGIC_CAMPAIGNS && !isBought;
            const cost = Math.round(campaign.cost * (1 - fx.promoDiscount));
            const fit = campaignFit(campaign, project.draft);
            const hypeGain = strategicCampaignHype(campaign, project.draft, fx.hypeMult, run.capitalProjects);
            const afford = run.cash - spent >= cost;
            const capitalActive = !!campaign.capitalSynergy && run.capitalProjects.includes(campaign.capitalSynergy);
            return (
              <div key={campaign.id} className={cn("ink-card p-3", isBought && "border-mint/60", capitalActive && "ring-1 ring-gold/20")}>
                <div className="flex items-center gap-1.5">
                  <Megaphone size={14} className="text-gold" />
                  <span className="font-display text-sm font-extrabold">{campaign.name}</span>
                  <span className="ml-auto text-[10px] font-bold text-cyanx">+{hypeGain} hype</span>
                </div>
                <div className="mt-0.5 text-[10px] text-paper/50">{campaign.description}</div>
                <div className="mt-1 flex flex-wrap gap-1 text-[8px]">
                  <span className={cn("rounded border px-1.5 py-.5", dataTier ? (fit >= 1.05 ? "border-mint/40 text-mint" : fit < .9 ? "border-neon/40 text-neon" : "border-line text-paper/55") : "border-line text-paper/35")}>{dataTier ? `FIT ${campaignFitLabel(fit)} · ×${fit.toFixed(2)}` : "FIT ??? · build Data Lab"}</span>
                  {capitalActive && <span className="rounded border border-gold/40 px-1.5 py-.5 text-gold">CAPITAL SYNERGY +20%</span>}
                  {run.capitalProjects.includes("flagship_hq") && <span className="rounded border border-viol/40 px-1.5 py-.5 text-viol">FLAGSHIP +10%</span>}
                </div>
                <div className="mt-2">
                  {isBought ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-mint"><Check size={12} /> BOOKED</span>
                  ) : locked ? (
                    <span className="text-[10px] font-bold text-paper/40">Requires Marketing Office tier {campaign.minTier} or Marketing Dept. research</span>
                  ) : limitReached ? (
                    <span className="text-[10px] font-bold text-paper/40">Campaign limit reached</span>
                  ) : (
                    <Btn variant="gold" className="!px-3 !py-1.5 text-xs" disabled={!afford} onClick={() => buyCampaign(campaign.id, cost, hypeGain)}>
                      BOOK {formatGBP(cost)}{cost < campaign.cost && <s className="ml-1 text-[9px] opacity-60">{formatGBP(campaign.cost)}</s>}
                    </Btn>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-panel2/70 p-3">
          <span className="text-xs font-bold text-paper/60">HYPE / AWARENESS</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-abyss"><div className="h-full rounded-full bg-gradient-to-r from-neon to-gold transition-all duration-500" style={{ width: `${hype}%` }} /></div>
          <span className="font-display text-sm font-extrabold text-gold">{hype}%</span>
        </div>

        {saleOffers.length > 0 && <div className="mt-4 rounded-xl border border-cyanx/35 bg-cyanx/5 p-3"><div className="font-display text-sm font-black text-cyanx">SELL THE COMPLETED SHOW</div><div className="mt-1 text-[9px] text-paper/50">Guaranteed cash now, but much lower creator fan growth and no self-release upside. Selling to a rival lets them claim this production in awards. You keep the underlying original IP.</div><div className="mt-2 space-y-2">{saleOffers.map((offer)=><div key={offer.id} className="rounded-lg border border-line bg-panel2/70 p-2"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><b className="text-xs">{offer.buyerName}</b><div className="text-[8px] text-paper/40">{offer.buyerType==="rival"?"RIVAL STUDIO":"NETWORK / DISTRIBUTOR"} · +{offer.creatorFans.toLocaleString("en-GB")} creator fans {offer.awardRisk?"· THEY OWN AWARD ENTRY":""}</div></div><b className="text-sm text-mint">{formatGBP(offer.cash)}</b></div>{confirmSale===offer.id?<div className="mt-2 flex gap-2"><Btn variant="cyan" onClick={()=>onSell(offer.id)}>CONFIRM SALE</Btn><Btn variant="ghost" onClick={()=>setConfirmSale(null)}>CANCEL</Btn></div>:<Btn variant="ghost" className="mt-1 !px-2 !py-1 text-[9px]" onClick={()=>setConfirmSale(offer.id)}>SELL MASTER</Btn>}</div>)}</div></div>}

        <div className="mt-4 flex gap-2">
          <Btn variant="ghost" onClick={onBack}><ChevronLeft size={16} /> DELAY</Btn>
          <Btn big variant="gold" className="flex-1" onClick={() => onAir(spent, hype)}><Rocket size={20} /> AIR THE SHOW!</Btn>
        </div>
        <div className="mt-1.5 text-center text-[9px] text-paper/45">Delaying keeps production costs burning while launch heat cools. Campaign spending is committed only when you air.</div>
      </div>
    </div>
  );
}
