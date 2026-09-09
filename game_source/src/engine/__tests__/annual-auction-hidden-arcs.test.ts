import { describe, expect, it } from "vitest";
import { ARCS } from "../data";
import { AUCTION_IPS, bidIncrementOptions, dismissAuctionPrompt, initIPMarket, scheduleNextAuctionWeek, tickIPMarket } from "../ip";
import { initRivalWorld } from "../rivals";

describe("annual live IP auctions", () => {
  it("uses the full 100-property user catalogue and gives every IP one unique hidden studio arc", () => {
    expect(AUCTION_IPS).toHaveLength(100);
    const ids=AUCTION_IPS.map(ip=>ip.specialArcUnlock);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(100);
    for(const id of ids){const a=ARCS.find(x=>x.id===id);expect(a?.unlock).toEqual({kind:"studioArc"});expect(a?.syn?.length).toBeGreaterThanOrEqual(2);}
    expect(AUCTION_IPS.map(ip=>ip.posterSlot)).toEqual(Array.from({length:100},(_,i)=>i+1));
    expect(AUCTION_IPS.filter(ip=>ip.animeType==="shonen")).toHaveLength(50);
    expect(AUCTION_IPS.filter(ip=>ip.animeType==="shojo")).toHaveLength(50);
  });
  it("schedules no more than one candidate inside a 48-week year and can skip years", () => {
    const seq=[0.2,0.5]; let i=0; const week=scheduleNextAuctionWeek(0,()=>seq[i++]??0.5); expect(week).toBeGreaterThanOrEqual(6); expect(week).toBeLessThanOrEqual(42);
    const skip=[0.99,0.2,0.0]; i=0; const later=scheduleNextAuctionWeek(0,()=>skip[i++]??0); expect(later).toBeGreaterThanOrEqual(48+6);
  });
  it("creates a one-week prompted opportunity and schedules the following opportunity no earlier than next industry year", () => {
    const base=initIPMarket(0,()=>0); const m={...base,nextAuctionWeek:10}; const world=initRivalWorld();
    const out=tickIPMarket(m,{week:10,cash:1_000_000,fans:0,awards:0,bestScore:0,showsMade:0},world,()=>0);
    const live=out.market.auctions.find(a=>!a.resolved); expect(live).toBeTruthy(); expect(live?.closesWeek).toBe(11); expect(out.market.pendingPromptId).toBe(live?.id); expect(out.market.nextAuctionWeek).toBeGreaterThanOrEqual(48+6);
    expect(dismissAuctionPrompt(out.market,live!.id).pendingPromptId).toBeNull();
  });
  it("offers four escalating live bid increments",()=>{const x=bidIncrementOptions(200_000);expect(x).toHaveLength(4);expect(x[0]).toBeLessThan(x[1]);expect(x[1]).toBeLessThan(x[2]);expect(x[2]).toBeLessThan(x[3]);});
});
