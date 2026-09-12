import fs from 'node:fs';
await import('./apply-depth-pass-stage5.mjs');
const read=(p)=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
const once=(s,a,b,label)=>{ if(!s.includes(a)) throw new Error(`missing ${label}`); return s.replace(a,b); };

// Finish seller-auction presentation in the root app and freeze the live clock while it runs.
{
  const p='src/App.tsx'; let s=read(p);
  s=once(s,'import AuctionCeremony from "./components/AuctionCeremony";','import AuctionCeremony from "./components/AuctionCeremony";\nimport SellerAuctionCeremony from "./components/SellerAuctionCeremony";','seller auction import');
  s=once(s,'  useEffect(() => { if (pendingLevelUp) setTimeSpeed(0); }, [pendingLevelUp]);','  useEffect(() => { if (pendingLevelUp) setTimeSpeed(0); }, [pendingLevelUp]);\n  const sellerAuctionOpen = !!run?.sellerAuction;\n  useEffect(() => { if (sellerAuctionOpen) setTimeSpeed(0); }, [sellerAuctionOpen]);','seller auction pause');
  const marker='        {run && run.studioEvents.length > 0 && screen !== "title" && screen !== "gameover" && screen !== "retrospective" && (';
  const insert='        {run?.sellerAuction && screen !== "title" && screen !== "gameover" && screen !== "retrospective" && (\n          <SellerAuctionCeremony run={run} setRun={(fn) => setRun((r) => (r ? fn(r) : r))} />\n        )}\n\n'+marker;
  s=once(s,marker,insert,'seller auction overlay');
  write(p,s);
}

// Make room temperature materially broad: a small share of listings are truly cold,
// while hot rooms always contain enough serious bidders to create a genuine bidding war.
{
  const p='src/engine/sellerAuction.ts'; let s=read(p);
  s=once(s,'  const dealHeat = showrunner === "dealmaker" ? 1.14 : 1;','  const dealHeat = showrunner === "dealmaker" ? 1.14 : 1;\n  const roomHeat = rng();\n  const coldRoom = roomHeat < 0.12;\n  const hotRoom = roomHeat > 0.82;','auction room heat');
  s=once(s,'    const interest = rng();\n    if (interest < 0.20) continue;\n    const ceiling = round25(fair * (0.22 + interest * 1.18 + n.genreBias) * dealHeat);','    const interest = rng();\n    if (coldRoom) continue;\n    if (!hotRoom && interest < 0.20) continue;\n    const roomMult = hotRoom ? 1.34 : 1;\n    const ceiling = round25(fair * (0.22 + interest * 1.18 + n.genreBias) * dealHeat * roomMult);','network heat');
  s=once(s,'    const appetite = rng();\n    // Studios with no fit are often simply not in the room.\n    if (appetite < Math.max(0.08, 0.40 - fit * 0.10)) continue;','    const appetite = rng();\n    // Studios with no fit are often simply not in the room. Cold rooms have no strategic rival bidders.\n    if (coldRoom) continue;\n    if (!hotRoom && appetite < Math.max(0.08, 0.40 - fit * 0.10)) continue;','rival heat gate');
  s=once(s,'    const ceiling = round25(fair * (0.16 + appetite * 0.72 + stature * 0.42 + fit * 0.16 + rivalryMadness) * dealHeat);','    const roomMult = hotRoom ? 1.28 : 1;\n    const ceiling = round25(fair * (0.16 + appetite * 0.72 + stature * 0.42 + fit * 0.16 + rivalryMadness) * dealHeat * roomMult);','rival heat ceiling');
  write(p,s);
}

// Repair the stage-4 fixture: "anytime" was never a real broadcast slot.
{
  const p='src/engine/__tests__/depth-pass-stage4.test.ts'; let s=read(p);
  s=once(s,'  slot: "anytime",','  slot: "midnight",','stage4 valid slot');
  write(p,s);
}

// Regression coverage for rival ownership -> actual licensed adaptation -> canonical source poster.
write('src/engine/__tests__/depth-pass-stage5.test.ts', `import { describe, expect, it } from "vitest";\nimport { licensedAwardPosterAsset, rivalNominee } from "../awards";\nimport { AUCTION_IPS } from "../ip";\nimport { ensureRivalLicensedAdaptations, initRivalWorld, type RivalRelease } from "../rivals";\n\ndescribe("rival licensed IP integration", () => {\n  it("turns rival-owned auction rights into one persistent adaptation, not a duplicate every week", () => {\n    const world = initRivalWorld(0);\n    const studio = world.studios[0];\n    const ip = AUCTION_IPS[0];\n    const first = ensureRivalLicensedAdaptations(world, { [ip.id]: studio.id }, AUCTION_IPS, 12);\n    const planned = first.studios.find((s) => s.id === studio.id)!.productions.filter((p) => p.licensedIpId === ip.id);\n    expect(planned).toHaveLength(1);\n    expect(planned[0].title).toBe(ip.title);\n    expect(planned[0].genres).toEqual(ip.genreTags.slice(0, 2));\n    expect(planned[0].posterId).toBeNull();\n    const second = ensureRivalLicensedAdaptations(first, { [ip.id]: studio.id }, AUCTION_IPS, 13);\n    expect(second.studios.find((s) => s.id === studio.id)!.productions.filter((p) => p.licensedIpId === ip.id)).toHaveLength(1);\n  });\n\n  it("carries the auction-IP identity into awards and uses the property's canonical poster", () => {\n    const ip = AUCTION_IPS[1];\n    const release: RivalRelease = {\n      title: ip.title, studioId: "rival", studio: "Rival Studio", score: 31, week: 30, year: 1,\n      genres: ip.genreTags.slice(0, 2), animeType: ip.animeType, revenue: 1_000_000, fans: 55_000,\n      kind: "licensed", hallOfFame: false, craft: { story: 30, art: 32, sound: 29 },\n      posterId: null, franchiseKey: null, licensedIpId: ip.id,\n    };\n    const nominee = rivalNominee(release);\n    expect(nominee.licensedIpId).toBe(ip.id);\n    expect(licensedAwardPosterAsset(nominee)).toBe(ip.posterAsset);\n  });\n});\n`);

console.log('Final depth pass applied: seller auction presentation/balance, rival licensed adaptations, and regression coverage.');
