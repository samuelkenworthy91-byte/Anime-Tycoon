from pathlib import Path

root = Path(__file__).resolve().parents[1]

# 1) Preserve meaningful early affordability while retaining premium/legendary pressure.
ip = root / "src/engine/ip.ts"
s = ip.read_text(encoding="utf-8")
s = s.replace(
    'const rightsScale: Record<IPRarity, number> = { cult: .35, emerging: .6, recognised: 1.2, premium: 2.5, legendary: 6 };',
    'const rightsScale: Record<IPRarity, number> = { cult: .12, emerging: .38, recognised: 1.2, premium: 2.5, legendary: 6 };',
)

old_tick = '''  let market={...m,auctions:m.auctions.map(a=>({...a,bids:[...a.bids]})),owned:{...m.owned},rivalOwned:{...m.rivalOwned},history:[...m.history]}; const notices:string[]=[];
  market.auctions=market.auctions.map(a=>a); for(const a of market.auctions.filter(a=>!a.resolved&&run.week>=a.closesWeek)){market=resolveForAI(market,a,world,rng);const ip=ipById(a.ipId);notices.push(`${ip?.title??"The IP"} auction closed.`);}'''
new_tick = '''  let market={...m,auctions:m.auctions.map(a=>({...a,bids:[...a.bids]})),owned:{...m.owned},rivalOwned:{...m.rivalOwned},history:[...m.history]}; const notices:string[]=[]; let cashDelta=0;
  market.auctions=market.auctions.map(a=>a); for(const a of market.auctions.filter(a=>!a.resolved&&run.week>=a.closesWeek)){
    const ip=ipById(a.ipId)!;
    if(a.leadingStudioId==="player" && run.cash+cashDelta>=a.currentBid){
      const resolved={...a,resolved:true,winnerId:"player",winningBid:a.currentBid};
      market={...market,auctions:market.auctions.map(x=>x.id===a.id?resolved:x),owned:{...market.owned,[ip.id]:makeContract(ip,run.week,a.currentBid)},pendingPromptId:market.pendingPromptId===a.id?null:market.pendingPromptId,history:[...market.history,`Rights won: ${ip.title} for £${a.currentBid.toLocaleString("en-GB")}.`].slice(-100)};
      cashDelta-=a.currentBid; notices.push(`🏆 Rights won: ${ip.title}.`);
    }else{
      market=resolveForAI(market,a,world,rng); notices.push(`${ip.title} auction closed.`);
    }
  }'''
if old_tick not in s:
    raise SystemExit("tick expiry block not found")
s = s.replace(old_tick, new_tick, 1)
s = s.replace(
    'market.history=[...market.history,...notices].slice(-100);return {market,cashDelta:0,notices,world};',
    'market.history=[...market.history,...notices].slice(-100);return {market,cashDelta,notices,world};',
    1,
)
ip.write_text(s, encoding="utf-8")

# 2) Update the pre-expansion tests only where the contract intentionally changed.
p = root / "src/engine/__tests__/ip-expansion.test.ts"
t = p.read_text(encoding="utf-8")
t = t.replace(
    'licensedRevenue, migrateIPMarket, placePlayerBid, tickIPMarket',
    'licensedRevenue, migrateIPMarket, placeLivePlayerBid, placePlayerBid, tickIPMarket',
)
t = t.replace("assigns immutable poster slots inside the 80-asset contract", "assigns immutable poster slots inside the 100-asset contract")
t = t.replace("x.posterSlot<=80", "x.posterSlot<=100")
old_rival = ''' it("lets stateful rivals outbid a weak player during a live auction",()=>{const ip=AUCTION_IPS[0];const run=initialRun("A","steady");const m=initIPMarket(0);m.auctions=[{id:"a",ipId:ip.id,type:"open",opensWeek:0,closesWeek:4,currentBid:10_000,leadingStudioId:"player",playerMaxBid:10_000,bids:[],appraisalLevel:0,resolved:false,winnerId:null,winningBid:0}];const out=tickIPMarket(m,{week:1,cash:99_000,fans:0,awards:0,bestScore:0,showsMade:0},run.rivalWorld,()=>0);expect(out.market.auctions[0].leadingStudioId).not.toBe("player");expect(out.market.auctions[0].bids[out.market.auctions[0].bids.length-1]?.studioId).not.toBe("player");});'''
new_rival = ''' it("lets stateful rivals immediately counter a weak live-room bid",()=>{const ip=AUCTION_IPS[0];const run=initialRun("A","steady");const m=initIPMarket(0);m.auctions=[{id:"a",ipId:ip.id,type:"open",opensWeek:0,closesWeek:1,currentBid:10_000,leadingStudioId:null,playerMaxBid:0,bids:[],appraisalLevel:0,resolved:false,winnerId:null,winningBid:0}];const out=placeLivePlayerBid(m,"a",20_000,99_000,0,run.rivalWorld,()=>0)!;expect(out.market.auctions[0].leadingStudioId).not.toBe("player");expect(out.market.auctions[0].bids[out.market.auctions[0].bids.length-1]?.studioId).not.toBe("player");});'''
if old_rival not in t:
    raise SystemExit("legacy rival bidding test not found")
t = t.replace(old_rival, new_rival, 1)
p.write_text(t, encoding="utf-8")

# 3) The canonical arc library is intentionally extended by one arc/combo per IP.
c = root / "src/engine/__tests__/content-v3.test.ts"
d = c.read_text(encoding="utf-8")
if 'import { AUCTION_IPS } from "../ip";' not in d:
    d = d.replace(
        'import { ARCS, ARC_COMBOS, CAST_V2, WORKER_LOOKS } from "../data";',
        'import { ARCS, ARC_COMBOS, CAST_V2, WORKER_LOOKS } from "../data";\nimport { AUCTION_IPS } from "../ip";',
    )
d = d.replace(
    'expect(ARCS).toHaveLength(90); expect(ARC_COMBOS).toHaveLength(49);\n    expect(new Set(ARCS.map(a => a.id)).size).toBe(90);\n    expect(new Set(ARC_COMBOS.map(a => a.id)).size).toBe(49);',
    'expect(ARCS).toHaveLength(90 + AUCTION_IPS.length); expect(ARC_COMBOS).toHaveLength(49 + AUCTION_IPS.length);\n    expect(new Set(ARCS.map(a => a.id)).size).toBe(ARCS.length);\n    expect(new Set(ARC_COMBOS.map(a => a.id)).size).toBe(ARC_COMBOS.length);',
)
c.write_text(d, encoding="utf-8")
