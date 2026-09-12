import { useMemo, useState } from "react";
import { BarChart3, Gavel, Handshake, Lock, Scale, ScrollText, Trophy } from "lucide-react";
import { Btn } from "../fx/fx";
import { AUCTION_TYPE_LABEL, SOURCE_LABEL, appraiseAuction, commissionRightsAuction, commissionedAuctionBlock, commissionedAuctionFee, genreLabel, ipById, negotiateRights } from "../engine/ip";
import { formatGBP, formatGBPShort } from "../engine/data";
import type { RunState } from "../engine/state";
import { cn } from "../utils/cn";
import { CAPITAL_PROJECTS, buyCapitalProject, coProductionOffer, startCoProduction } from "../engine/spending";

function KeyArt({ ipId }: { ipId: string }) {
  const ip = ipById(ipId)!;
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-xl border border-paper/15" style={{ background: `linear-gradient(145deg,${ip.posterPalette[0]},${ip.posterPalette[1]} 62%,${ip.posterPalette[2]})` }}>
      <div className="absolute inset-0 gridlines opacity-30" />
      {!loaded && <><div className="absolute inset-x-2 bottom-2 font-display text-sm font-black leading-[.9] text-white drop-shadow">{ip.title.toUpperCase()}</div><div className="absolute left-2 top-2 rounded bg-black/55 px-1 text-[7px] font-black tracking-widest">{ip.sourceType.toUpperCase()}</div></>}
      <img src={ip.posterAsset} alt={`${ip.title} poster`} className="absolute inset-0 h-full w-full object-cover" onLoad={() => setLoaded(true)} onError={(e) => { e.currentTarget.style.display = "none"; setLoaded(false); }} />
    </div>
  );
}

export default function IPMarket({ run, setRun, onAdapt, onEnterAuction }: { run: RunState; setRun: (fn: (r: RunState) => RunState) => void; onAdapt: (ipId: string) => void; onEnterAuction: (auctionId: string) => void }) {
  const active = run.ipMarket.auctions.filter((a) => !a.resolved);
  const owned = Object.values(run.ipMarket.owned);
  const legal = run.facilities.legal ?? 0;
  const data = run.facilities.data ?? 0;
  const appraisalCost = Math.max(2, 5 - data);
  const sorted = useMemo(() => [...active].sort((a, b) => a.closesWeek - b.closesWeek), [active]);
  const coProdProjects = run.projects.filter((p) => ["concept", "preprod", "animation", "sound"].includes(p.stage));
  const [confirmCommission, setConfirmCommission] = useState(false);
  const manualFee = commissionedAuctionFee(run);
  const manualBlock = commissionedAuctionBlock(run);

  const appraise = (id: string) => setRun((r) => {
    const cost = Math.max(2, 5 - (r.facilities.data ?? 0));
    if (r.rd < cost) return r;
    return {
      ...r,
      rd: r.rd - cost,
      ipMarket: appraiseAuction(r.ipMarket, id),
      strategicSpend: [...r.strategicSpend, { id: `app_${r.week}_${id}`, label: "IP appraisal", amount: 0, week: r.week }],
      notices: [...r.notices, `Audience Data Lab appraisal complete (−${cost} RD).`],
    };
  });

  const negotiate = (ipId: string, kind: "sequel" | "merch" | "international" | "royalty" | "ownership") => setRun((r) => {
    const out = negotiateRights(r.ipMarket, ipId, kind, r.facilities.legal ?? 0);
    if (!out || r.cash < out.cost) return r;
    return {
      ...r,
      cash: r.cash - out.cost,
      ipMarket: out.market,
      strategicSpend: [...r.strategicSpend, { id: `legal_${r.week}_${ipId}_${kind}`, label: `Rights negotiation: ${kind}`, amount: out.cost, week: r.week }],
      notices: [...r.notices, `${out.success ? "✅" : "❌"} ${kind} negotiation ${out.success ? "succeeded" : "failed"} (−${formatGBP(out.cost)}).`],
    };
  });

  return <div className="space-y-4">
    <div className="rounded-xl border border-gold/35 bg-gold/5 p-3 text-xs text-paper/65">
      <b className="text-gold">RIGHTS MARKET</b> · A rights opportunity has a random chance to appear and can fire at most once per 48-week industry year. Entering launches the live auction room; returned opportunities remain here until the end of the week.
      <div className="mt-2 flex flex-wrap gap-2 text-[9px]">
        <span className={cn("rounded border px-2 py-1", legal ? "border-gold/40 text-gold" : "border-line text-paper/40")}>LEGAL DESK T{legal} · {legal ? `+${legal * 14}% negotiation chance` : "build for better rights terms"}</span>
        <span className={cn("rounded border px-2 py-1", data ? "border-cyanx/40 text-cyanx" : "border-line text-paper/40")}>DATA LAB T{data} · {data ? `${data} appraisal layer${data > 1 ? "s" : ""} pre-revealed` : "build to reduce uncertainty"}</span>
      </div>
    </div>

    <section className="rounded-xl border border-gold/45 bg-gold/5 p-3">
      <div className="flex items-center gap-2 text-xs font-black tracking-widest text-gold"><Gavel size={14}/> COMMISSION A RIGHTS AUCTION</div>
      <div className="mt-1 text-[10px] text-paper/55">Pay brokers to bring a fresh property to market immediately. The fee is non-refundable: you still have to bid and a rival can beat you.</div>
      <div className="mt-2 flex flex-wrap items-center gap-2"><b className="text-sm text-gold">{formatGBPShort(manualFee)} broker fee</b>{manualBlock && <span className="text-[9px] text-neon">{manualBlock}</span>}</div>
      {!confirmCommission ? <Btn variant="gold" className="mt-2" disabled={!!manualBlock} onClick={()=>setConfirmCommission(true)}><Gavel size={12}/> TRIGGER AUCTION</Btn> : <div className="mt-2 flex gap-2"><Btn variant="gold" disabled={!!manualBlock} onClick={()=>{setRun((r)=>{const out=commissionRightsAuction(r);if(!out)return r;return {...r,cash:r.cash-out.fee,ipMarket:out.market,strategicSpend:[...r.strategicSpend,{id:`auction_broker_${r.week}`,label:"Commission rights auction",amount:out.fee,week:r.week}],notices:[...r.notices,`Rights brokers paid £${out.fee.toLocaleString("en-GB")}; a new auction is opening.`]};});setConfirmCommission(false);}}>CONFIRM · PAY {formatGBPShort(manualFee)}</Btn><Btn variant="ghost" onClick={()=>setConfirmCommission(false)}>CANCEL</Btn></div>}
    </section>

    <section>
      <div className="mb-2 flex items-center gap-2 text-xs font-black tracking-widest text-gold"><Gavel size={14} /> LIVE AUCTIONS</div>
      {sorted.length === 0 ? <div className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-paper/45">Next catalogue expected around week {run.ipMarket.nextAuctionWeek}.</div> : <div className="space-y-3">{sorted.map((a) => {
        const ip = ipById(a.ipId)!;
        const reveal = Math.min(3, a.appraisalLevel + data);
        return <div key={a.id} className="ink-card flex gap-3 p-3">
          <KeyArt ipId={ip.id} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5"><b className="font-display text-base">{ip.title}</b><span className="ink-chip px-1.5 py-.5 text-[8px] text-gold">{AUCTION_TYPE_LABEL[a.type]}</span></div>
            <div className="text-[10px] text-paper/50">{SOURCE_LABEL[ip.sourceType]} · {ip.genreTags.map(genreLabel).join(" / ")} · {ip.audience}</div>
            <p className="mt-1 text-[11px] text-paper/65">{ip.description}</p>
            <div className="mt-2 grid grid-cols-2 gap-1 text-[9px] sm:grid-cols-4">
              <span>Fanbase ≈{ip.fanbase}k</span><span>Prestige {ip.prestige}</span>
              <span>{reveal >= 1 ? `Difficulty ${ip.adaptationDifficulty}` : "Difficulty ???"}</span>
              <span>{reveal >= 2 ? `Merch ${ip.merchPotential}` : "Merch ???"}</span>
              <span>{reveal >= 2 ? `Royalty ${Math.round(ip.royaltyRate * 100)}%` : "Royalty ???"}</span>
              <span>{reveal >= 3 ? `Control ${Math.round(ip.creatorControl)}%` : "Control ???"}</span>
              <span>Closes {Math.max(0, a.closesWeek - run.week)} wk</span>
              <span className={a.leadingStudioId === "player" ? "text-mint" : "text-neon"}>{a.leadingStudioId === "player" ? "YOU LEAD" : a.leadingStudioId ? `${a.leadingStudioId} LEADS` : "NO BIDS"}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Btn variant="gold" onClick={() => onEnterAuction(a.id)}><Gavel size={12} /> ENTER AUCTION · {formatGBPShort(a.currentBid)}</Btn>
              <Btn variant="ghost" disabled={run.rd < appraisalCost || reveal >= 3} onClick={() => appraise(a.id)}><BarChart3 size={12} /> APPRAISE · {appraisalCost} RD</Btn>
            </div>
          </div>
        </div>;
      })}</div>}
    </section>

    <section>
      <div className="mb-2 flex items-center gap-2 text-xs font-black tracking-widest text-cyanx"><ScrollText size={14} /> OWNED IP ({owned.length})</div>
      {owned.length === 0 ? <div className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-paper/45">Win an auction to build a licensed slate.</div> : <div className="space-y-3">{owned.map((c) => {
        const ip = ipById(c.ipId)!;
        const expired = c.expiresWeek <= run.week;
        return <div key={c.ipId} className={cn("ink-card flex gap-3 p-3", expired && "opacity-55")}>
          <KeyArt ipId={ip.id} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><b>{ip.title}</b>{c.bestScore >= 32 && <Trophy size={13} className="text-gold" />}</div>
            <div className="mt-1 text-[10px] text-paper/55">Royalty {Math.round(c.royaltyRate * 100)}% · Ownership {Math.round(c.ownershipShare * 100)}% · {Math.max(0, c.expiresWeek - run.week)} wk remaining · {c.adaptations} adaptation(s)</div>
            <div className="mt-1 flex flex-wrap gap-1 text-[8px]">{[["SEQUEL", c.sequelRights], ["MERCH", c.merchRights], ["INTL", c.internationalRights]].map(([x, on]) => <span key={String(x)} className={cn("rounded border px-1.5 py-.5", on ? "border-mint/40 text-mint" : "border-line text-paper/35")}>{on ? "✓ " : <Lock size={7} className="inline" />}{x}</span>)}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Btn variant="primary" disabled={expired} onClick={() => onAdapt(ip.id)}>ADAPT</Btn>
              {!c.sequelRights && ip.sequelRightsAvailable && <Btn variant="ghost" onClick={() => negotiate(ip.id, "sequel")}><Scale size={11} /> SEQUEL</Btn>}
              {!c.merchRights && ip.merchRightsAvailable && <Btn variant="ghost" onClick={() => negotiate(ip.id, "merch")}>MERCH</Btn>}
              {!c.internationalRights && ip.internationalRightsAvailable && <Btn variant="ghost" onClick={() => negotiate(ip.id, "international")}>INTL</Btn>}
              <Btn variant="ghost" onClick={() => negotiate(ip.id, "royalty")}>ROYALTY</Btn><Btn variant="ghost" onClick={() => negotiate(ip.id, "ownership")}>OWNERSHIP</Btn>
            </div>
          </div>
        </div>;
      })}</div>}
    </section>

    <section>
      <div className="mb-2 flex items-center gap-2 text-xs font-black tracking-widest text-viol"><Handshake size={14} /> RIVAL CO-PRODUCTIONS</div>
      <div className="rounded-xl border border-line bg-panel2/50 p-2 text-[9px] text-paper/50">Bring a rival studio onto an active production. They inject cash now and take a back-end revenue share when the show releases. Genre fit, their scale, your Legal Desk and the Global Flagship HQ all affect the terms.</div>
      {coProdProjects.length === 0 ? <div className="mt-2 rounded-xl border border-dashed border-line p-3 text-center text-[10px] text-paper/40">No production is early enough to invite a co-producer.</div> : <div className="mt-2 space-y-2">{coProdProjects.map((p) => {
        const isCoprod = p.commission?.partnerId.startsWith("coprod:");
        const offer = coProductionOffer(run, p.id);
        return <div key={p.id} className="ink-card flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1"><b className="text-sm">{p.draft.title}</b><div className="text-[9px] text-paper/45">{p.stage.toUpperCase()} · {formatGBPShort(p.spent)} spent</div></div>
          {isCoprod ? <div className="text-right text-[9px] text-mint"><b>{p.commission!.partnerName}</b><br />funded {formatGBPShort(p.commission!.advance)} · takes {Math.round(p.commission!.share * 100)}%</div> : p.commission ? <span className="text-[9px] text-paper/40">Already externally financed</span> : offer ? <Btn variant="primary" onClick={() => setRun((r) => startCoProduction(r, p.id) ?? r)}><Handshake size={12} /> {offer.studioName} · +{formatGBPShort(offer.contribution)} for {Math.round(offer.revenueShare * 100)}%</Btn> : <span className="text-[9px] text-paper/40">No viable offer</span>}
        </div>;
      })}</div>}
    </section>

    <section>
      <div className="mb-2 text-xs font-black tracking-widest text-gold">PRESTIGE CAPITAL PROJECTS · {CAPITAL_PROJECTS.length}</div>
      <div className="grid gap-2 sm:grid-cols-2">{CAPITAL_PROJECTS.map((d) => {
        const ownedProject = run.capitalProjects.includes(d.id);
        const locked = run.officeLevel < d.minOffice || run.cash < d.cost;
        return <div key={d.id} className={cn("ink-card p-3", ownedProject && "border-mint/40")}><b className="text-sm">{d.name}</b><div className="text-[10px] text-paper/50">{d.description}</div>{ownedProject ? <div className="mt-2 text-[10px] font-bold text-mint">COMPLETED · EFFECT ACTIVE</div> : <Btn variant="gold" className="mt-2" disabled={locked} onClick={() => setRun((r) => buyCapitalProject(r, d.id) ?? r)}>INVEST {formatGBPShort(d.cost)}</Btn>}</div>;
      })}</div>
    </section>
  </div>;
}
