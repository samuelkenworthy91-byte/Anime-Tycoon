import { useRef, useState } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Image, Megaphone, Rocket, Scissors, Target, X } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { POINT_COLOR, POINT_LABEL, formatGBP, type PointType } from "../engine/data";
import { showSaleOffers, unavailablePosterIdsForProject, type RunState } from "../engine/state";
import { facilityFX } from "../engine/facilities";
import { lateRevenueMult, type Project } from "../engine/projects";
import {
  MAX_STRATEGIC_CAMPAIGNS,
  STRATEGIC_CAMPAIGNS,
  campaignFit,
  campaignFitLabel,
  strategicCampaignHype,
} from "../engine/marketing";
import { campaignForecastAccess, specialisationProjectEffects } from "../engine/specialisation";
import { cn } from "../utils/cn";
import { audienceProfileForDraft, franchiseAudienceProfile } from "../engine/audienceSegments";
import { publicityAudienceFit, publicityFitLabel } from "../engine/publicity";
import { genericPosterOptions, rivalPosterById } from "../engine/rivalPosters";
import { assetPath } from "../utils/assetPath";

/** Release prep: choose a small strategic campaign mix, then air — or delay. */
export default function Ship({
  run,
  project,
  onAir,
  onSell,
  onShelve,
  onPosterChoice,
  onBack,
}: {
  run: RunState;
  project: Project;
  onAir: (spent: number, hype: number) => void;
  onSell: (offerId: string) => void;
  onShelve: () => void;
  onPosterChoice: (posterArtId?: string) => void;
  onBack: () => void;
}) {
  const [spent, setSpent] = useState(0);
  const [hype, setHype] = useState(project.hype);
  const [bought, setBought] = useState<string[]>([]);
  const [confirmSale, setConfirmSale] = useState<string | null>(null);
  const [posterBrowserOpen, setPosterBrowserOpen] = useState(false);
  const [posterIndex, setPosterIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const saleOffers = showSaleOffers(run, project.id);
  const unavailablePosterIds = project.draft.licensedIpId ? [] : unavailablePosterIdsForProject(run, project);
  const genericPosters = project.draft.licensedIpId ? [] : genericPosterOptions(project.draft.animeType, project.draft.genres, undefined, unavailablePosterIds);
  const selectedPoster = project.draft.posterArtId ? rivalPosterById(project.draft.posterArtId) : null;
  const posterConflict = !!project.draft.posterArtId && unavailablePosterIds.includes(project.draft.posterArtId);
  const safePosterIndex = genericPosters.length ? Math.min(posterIndex, genericPosters.length - 1) : 0;
  const browserPoster = genericPosters[safePosterIndex] ?? null;

  const openPosterBrowser = () => {
    const selectedIndex = project.draft.posterArtId
      ? genericPosters.findIndex((poster) => poster.id === project.draft.posterArtId)
      : -1;
    setPosterIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setPosterBrowserOpen(true);
  };
  const movePoster = (delta: number) => {
    if (!genericPosters.length) return;
    setPosterIndex((current) => (current + delta + genericPosters.length) % genericPosters.length);
  };

  const totalPts = project.points.story + project.points.art + project.points.sound;
  const lateMult = lateRevenueMult(project);
  const fx = facilityFX(run.facilities);
  const mktTier = run.facilities.marketing ?? 0;
  const dataTier = run.facilities.data ?? 0;
  const forecastAccess = campaignForecastAccess(run, project.draft, dataTier);
  const houseEffect = specialisationProjectEffects(run, project.draft);

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

        {!project.draft.licensedIpId && (
          <div className="ink-card mt-3 p-3">
            <div className="flex items-center gap-2">
              <Image size={14} className="text-cyanx" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black tracking-widest text-cyanx">KEY VISUAL</div>
                <div className="text-[9px] text-paper/45">Every unclaimed industry poster is available. Once a franchise uses one, that poster belongs to that franchise; its sequels can reuse it.</div>
              </div>
              <Btn variant="ghost" className="!px-2.5 !py-1.5 text-[9px]" onClick={openPosterBrowser} disabled={!genericPosters.length}>
                BROWSE {genericPosters.length}
              </Btn>
            </div>
            <div className="mt-2 flex items-center gap-3">
              {selectedPoster ? (
                <button type="button" onClick={openPosterBrowser} className={cn("relative h-40 w-32 shrink-0 overflow-hidden rounded-xl border", posterConflict ? "border-neon ring-2 ring-neon/50" : "border-gold/60")}>
                  <img src={assetPath(selectedPoster.img)} alt="Selected key visual" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-ink/80 px-2 py-1 text-[8px] font-black text-gold">SELECTED POSTER</div>
                </button>
              ) : (
                <button type="button" onClick={openPosterBrowser} className="flex h-40 w-32 shrink-0 flex-col items-center justify-center rounded-xl border border-gold/60 bg-gold/10 text-center text-[10px] font-bold text-gold">
                  <div className="mb-2 text-3xl">★</div>
                  MAIN CHARACTER
                </button>
              )}
              <div className="min-w-0 text-[10px] text-paper/55">
                <div className="font-bold text-paper">{selectedPoster ? "Franchise key art selected" : "Main-character key visual selected"}</div>
                <div className="mt-1">{project.draft.continuation && selectedPoster ? "Inherited from the previous franchise entry unless you change it." : "Tap Browse Posters for a full-screen flick-through gallery."}</div>
                {posterConflict && <div className="mt-2 rounded-lg border border-neon/50 bg-neon/10 p-2 font-bold text-neon">This poster has since been claimed by another franchise. Choose another poster or Main Character before airing.</div>}
                {selectedPoster && <button type="button" onClick={() => onPosterChoice(undefined)} className="mt-2 rounded border border-line px-2 py-1 text-[9px] font-bold text-paper/60">USE MAIN CHARACTER INSTEAD</button>}
              </div>
            </div>
          </div>
        )}

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
          {run.showrunner === "marketer" && <span className="font-bold text-gold">· SANA: GOOD/EXCELLENT campaign matches +20%</span>}
          {run.showrunner === "audience" && <span className="font-bold text-cyanx">· RYKA: audience forecast · matched targeting +15%</span>}
          <span>·</span>
          <span className={forecastAccess === "exact" ? "text-cyanx" : forecastAccess === "band" ? "text-gold" : "text-paper/35"}>Data Lab T{dataTier}: {forecastAccess === "exact" ? "exact fit forecast" : forecastAccess === "band" ? "directional fit band" : "fit hidden"}</span>
          {houseEffect.active && <span className={houseEffect.signature ? "font-bold text-mint" : "font-bold text-neon"}>{houseEffect.signature ? `SIGNATURE · ${houseEffect.rank.toUpperCase()}` : "OUTSIDE SPECIALITY · LOWER CONFIDENCE"}</span>}
          <span className="ml-auto font-bold text-gold">{bought.length}/{MAX_STRATEGIC_CAMPAIGNS} booked</span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {STRATEGIC_CAMPAIGNS.map((campaign) => {
            const locked = campaign.minTier > mktTier && !run.research.includes("marketing");
            const isBought = bought.includes(campaign.id);
            const limitReached = bought.length >= MAX_STRATEGIC_CAMPAIGNS && !isBought;
            const cost = Math.round(campaign.cost * (1 - fx.promoDiscount));
            const fit = campaignFit(campaign, project.draft);
            const storedAudienceProfile = project.draft.franchiseKey ? franchiseAudienceProfile(run, project.draft.franchiseKey) ?? undefined : undefined;
            const audienceProfile = storedAudienceProfile ?? (run.showrunner === "audience" ? audienceProfileForDraft(project.draft) : undefined);
            const audienceFit = publicityAudienceFit(audienceProfile, campaign.id);
            const hypeGain = strategicCampaignHype(campaign, project.draft, fx.hypeMult, run.capitalProjects, audienceProfile, run.showrunner);
            const afford = run.cash - spent >= cost;
            const capitalActive = !!campaign.capitalSynergy && run.capitalProjects.includes(campaign.capitalSynergy);
            const fitKnown = forecastAccess !== "hidden";
            const audienceFitKnown = !!audienceProfile || run.facilities.data > 0 || run.showrunner === "audience";
            const fitExact = forecastAccess === "exact";
            return (
              <div key={campaign.id} className={cn("ink-card p-3", isBought && "border-mint/60", capitalActive && "ring-1 ring-gold/20")}>
                <div className="flex items-center gap-1.5">
                  <Megaphone size={14} className="text-gold" />
                  <span className="font-display text-sm font-extrabold">{campaign.name}</span>
                  <span className="ml-auto text-[10px] font-bold text-cyanx">+{hypeGain} hype</span>
                </div>
                <div className="mt-0.5 text-[10px] text-paper/50">{campaign.description}</div>
                <div className="mt-1 flex flex-wrap gap-1 text-[8px]">
                  <span className={cn("rounded border px-1.5 py-.5", fitKnown ? (fit >= 1.05 ? "border-mint/40 text-mint" : fit < .9 ? "border-neon/40 text-neon" : "border-line text-paper/55") : "border-line text-paper/35")}>{fitKnown ? `FIT ${campaignFitLabel(fit)}${fitExact ? ` · ×${fit.toFixed(2)}` : " · directional"}` : "FIT ??? · improve forecasting"}</span>
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
          <span className="font-display text-sm font-extrabold text-gold">{Math.ceil(hype)}%</span>
        </div>

        {saleOffers.length > 0 && <div className="mt-4 rounded-xl border border-cyanx/35 bg-cyanx/5 p-3"><div className="font-display text-sm font-black text-cyanx">SELL THE COMPLETED SHOW</div><div className="mt-1 text-[9px] text-paper/50">Guaranteed cash now, but much lower creator fan growth and no self-release upside. Selling to a rival lets them claim this production in awards. You keep the underlying original IP.</div><div className="mt-2 space-y-2">{saleOffers.map((offer)=><div key={offer.id} className="rounded-lg border border-line bg-panel2/70 p-2"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><b className="text-xs">{offer.buyerName}</b><div className="text-[8px] text-paper/40">{offer.buyerType==="rival"?"RIVAL STUDIO":"NETWORK / DISTRIBUTOR"} · +{offer.creatorFans.toLocaleString("en-GB")} creator fans {offer.awardRisk?"· THEY OWN AWARD ENTRY":""}</div></div><b className="text-sm text-mint">{formatGBP(offer.cash)}</b></div>{confirmSale===offer.id?<div className="mt-2 flex gap-2"><Btn variant="cyan" onClick={()=>onSell(offer.id)}>CONFIRM SALE</Btn><Btn variant="ghost" onClick={()=>setConfirmSale(null)}>CANCEL</Btn></div>:<Btn variant="ghost" className="mt-1 !px-2 !py-1 text-[9px]" onClick={()=>setConfirmSale(offer.id)}>SELL MASTER</Btn>}</div>)}</div></div>}

        <div className="mt-4 flex gap-2">
          <Btn variant="ghost" onClick={onBack}><ChevronLeft size={16} /> DELAY</Btn>
          {project.stage === "ready" && <Btn variant="ghost" onClick={onShelve}>SHELVE MASTER</Btn>}
          <Btn big variant="gold" className="flex-1" disabled={posterConflict} onClick={() => onAir(spent, hype)}><Rocket size={20} /> {posterConflict ? "CHOOSE AVAILABLE POSTER" : "AIR THE SHOW!"}</Btn>
        </div>
        <div className="mt-1.5 text-center text-[9px] text-paper/45">{project.stage === "shelved" ? "Shelved masters keep their finished quality. Fresh campaigns rebuild hype, but eventual sales are reduced." : "Delaying keeps production costs burning while launch heat cools. Shelving moves the completed master to the Library, clears hype and stops production burn."} Campaign spending is committed only when you air.</div>
      </div>

      {posterBrowserOpen && !project.draft.licensedIpId && (
        <div
          className="fixed inset-0 z-[120] flex flex-col bg-abyss px-3 pb-4 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl"
          onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            const start = touchStartX.current;
            const endX = event.changedTouches[0]?.clientX ?? null;
            touchStartX.current = null;
            if (start === null || endX === null || Math.abs(endX - start) < 45) return;
            movePoster(endX < start ? 1 : -1);
          }}
        >
          <div className="flex items-center gap-2 py-2">
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-black tracking-[0.25em] text-cyanx">POSTER BROWSER</div>
              <div className="truncate text-xs font-bold">{project.draft.title}</div>
            </div>
            <div className="text-[9px] font-bold text-paper/45">{genericPosters.length ? (safePosterIndex + 1) + " / " + genericPosters.length : "NO AVAILABLE POSTERS"}</div>
            <button type="button" onClick={() => setPosterBrowserOpen(false)} className="btn-press rounded-lg border border-line bg-panel2 p-2 text-paper/70" aria-label="Close poster browser"><X size={18} /></button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            {browserPoster ? (
              <>
                <button type="button" onClick={() => movePoster(-1)} className="absolute left-0 z-10 rounded-full border border-line bg-ink/85 p-2 text-paper/80" aria-label="Previous poster"><ChevronLeft size={24} /></button>
                <div className="flex h-full w-full max-w-xl flex-col items-center justify-center px-10">
                  <img src={assetPath(browserPoster.img)} alt="Poster preview" className="min-h-0 max-h-[72vh] w-auto max-w-full rounded-2xl border border-line object-contain shadow-2xl" />
                  <div className="mt-2 text-center text-[9px] text-paper/50">
                    {browserPoster.genres.join(" / ")} · {browserPoster.animeTypes.map((type) => type.toUpperCase()).join(" / ")}
                  </div>
                </div>
                <button type="button" onClick={() => movePoster(1)} className="absolute right-0 z-10 rounded-full border border-line bg-ink/85 p-2 text-paper/80" aria-label="Next poster"><ChevronRight size={24} /></button>
              </>
            ) : (
              <div className="text-center text-sm text-paper/50">Every poster is currently owned by another franchise.</div>
            )}
          </div>

          <div className="mx-auto mt-2 flex w-full max-w-xl gap-2">
            <Btn variant="ghost" className="flex-1" onClick={() => { onPosterChoice(undefined); setPosterBrowserOpen(false); }}>★ MAIN CHARACTER</Btn>
            <Btn big variant="gold" className="flex-[1.4]" disabled={!browserPoster} onClick={() => {
              if (!browserPoster) return;
              onPosterChoice(browserPoster.id);
              setPosterBrowserOpen(false);
            }}>USE THIS POSTER</Btn>
          </div>
          <div className="mt-1 text-center text-[8px] text-paper/35">Swipe left/right or use the arrows. Genre and Anime Type affect ordering only — every unclaimed poster remains selectable.</div>
        </div>
      )}
    </div>
  );
}
