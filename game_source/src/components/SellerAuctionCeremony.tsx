import { useEffect, useMemo, useState } from "react";
import { Gavel, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { finalizeFranchiseAuction, type RunState } from "../engine/state";
import { formatGBP } from "../engine/data";
import { cn } from "../utils/cn";

export default function SellerAuctionCeremony({ run, setRun }: { run: RunState; setRun: (fn: (r: RunState) => RunState) => void }) {
  const auction = run.sellerAuction;
  const [shown, setShown] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => { setShown(0); setAuto(true); }, [auction?.id]);
  useEffect(() => {
    if (!auction || !auto || shown >= auction.bids.length) return;
    const timer = window.setTimeout(() => {
      setShown((n) => Math.min(auction.bids.length, n + 1));
      sfx.coin();
    }, shown === 0 ? 650 : 760);
    return () => window.clearTimeout(timer);
  }, [auction, shown, auto]);
  const visible = useMemo(() => auction?.bids.slice(0, shown) ?? [], [auction, shown]);
  if (!auction) return null;
  const current = visible[visible.length - 1] ?? null;
  const finished = shown >= auction.bids.length;
  const ratio = auction.fairAppraisal > 0 ? auction.winningBid / auction.fairAppraisal : 0;

  return <div className="fixed inset-0 z-[112] flex flex-col overflow-hidden bg-ink">
    <div className="pointer-events-none absolute inset-0 gridlines opacity-35" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(177,104,255,.14),rgba(6,5,14,.94)_68%)]" />
    <header className="relative z-10 flex items-center gap-3 border-b border-line/50 bg-ink/80 px-4 py-3 backdrop-blur-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-viol/50 bg-viol/10 text-viol"><Gavel size={21}/></div>
      <div className="min-w-0 flex-1"><div className="text-[9px] font-black tracking-[0.35em] text-viol">SELLER-SIDE RIGHTS AUCTION · NO RESERVE</div><div className="truncate font-display text-xl font-extrabold">{auction.title}</div></div>
      <div className="text-right"><div className="text-[8px] font-bold tracking-wider text-paper/35">DESK APPRAISAL</div><div className="font-display text-lg font-black text-paper/60">{formatGBP(auction.fairAppraisal)}</div></div>
    </header>

    <main className="nice-scroll relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto p-4">
      <div className="ink-card border-viol/35 p-5 text-center">
        <div className="text-[9px] font-extrabold tracking-[0.3em] text-paper/45">CURRENT HAMMER PRICE</div>
        <div className={cn("mt-2 font-display text-5xl font-black tabular-nums", !current ? "text-paper/25" : finished ? "text-gold" : "text-mint")}>{current ? formatGBP(current.amount) : "WAITING…"}</div>
        <div className="mt-2 min-h-6 text-sm font-bold text-paper/70">{current ? `${current.bidderName} leads the room` : "The auctioneer opens the floor."}</div>
        {!finished && current && <div className="mt-1 text-[9px] text-paper/40">Round {current.round} · another bidder may still answer.</div>}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="ink-card p-3">
          <div className="flex items-center gap-2 text-[10px] font-extrabold tracking-widest text-paper/50"><Users size={13}/> BIDDING FLOOR</div>
          <div className="mt-2 space-y-1.5">
            {visible.slice(-10).map((bid, i) => <div key={`${bid.round}:${bid.bidderId}`} className={cn("anim-pop flex items-center rounded-lg border px-2.5 py-2 text-xs", i === visible.slice(-10).length - 1 ? "border-mint/50 bg-mint/10" : "border-line bg-panel2/50")}><span className="font-bold">{bid.bidderName}</span><span className="ml-2 rounded bg-panel3 px-1.5 py-0.5 text-[8px] font-black tracking-wider text-paper/45">{bid.bidderType.toUpperCase()}</span><span className="ml-auto font-display font-black text-mint">{formatGBP(bid.amount)}</span></div>)}
            {!visible.length && <div className="py-6 text-center text-xs text-paper/35">Paddles are still down…</div>}
          </div>
        </div>
        <div className="space-y-3">
          <div className="ink-card p-3 text-xs leading-relaxed text-paper/60"><b className="text-gold">NO RESERVE:</b> listing the property committed the studio to the final hammer price. A cold room can be brutal; a bidding war can become irrational.</div>
          {finished && <div className={cn("anim-pop rounded-xl border p-3 text-center", auction.biddingWar ? "border-gold/55 bg-gold/10" : ratio < .45 ? "border-neon/55 bg-neon/10" : "border-cyanx/45 bg-cyanx/10")}>
            {auction.biddingWar ? <TrendingUp size={22} className="mx-auto text-gold"/> : ratio < .45 ? <TrendingDown size={22} className="mx-auto text-neon"/> : <Gavel size={22} className="mx-auto text-cyanx"/>}
            <div className="mt-1 text-[9px] font-black tracking-widest">{auction.biddingWar ? "BIDDING WAR" : ratio < .45 ? "COLD ROOM" : "HAMMER RESULT"}</div>
            <div className="mt-1 font-display text-lg font-black">{auction.winnerName}</div>
            <div className="text-xs text-paper/55">{ratio >= 1 ? `${Math.round(ratio * 100)}% of appraisal` : `${Math.round(ratio * 100)}% of appraisal`}</div>
          </div>}
        </div>
      </div>

      <div className="mt-auto pt-4">
        {!finished ? <div className="grid grid-cols-2 gap-2"><Btn variant="ghost" onClick={()=>setAuto((x)=>!x)}>{auto ? "PAUSE BIDDING" : "RESUME BIDDING"}</Btn><Btn variant="cyan" onClick={()=>{setAuto(false);setShown(auction.bids.length);}}>SKIP TO HAMMER</Btn></div> : <Btn big variant="gold" className="w-full" onClick={()=>{sfx.fanfare();setRun((r)=>finalizeFranchiseAuction(r) ?? r);}}>🔨 HAMMER DOWN · SELL FOR {formatGBP(auction.winningBid)}</Btn>}
      </div>
    </main>
  </div>;
}
