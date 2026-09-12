import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'); const write=(p,s)=>fs.writeFileSync(p,s);
function once(s,a,b,label){if(!s.includes(a)) throw new Error(`missing ${label}`); return s.replace(a,b);}
function all(s,a,b,label){if(!s.includes(a)) throw new Error(`missing ${label}`); return s.split(a).join(b);}

// Rivals remember external licensed IP identity and greenlight the property they actually won.
{
 const p='src/engine/rivals.ts'; let s=read(p);
 s=once(s,'export type RivalEntryKind = "original" | "season" | "spinoff" | "movie" | "ova" | "reboot";','export type RivalEntryKind = "original" | "season" | "spinoff" | "movie" | "ova" | "reboot" | "licensed";','rival licensed kind');
 s=once(s,'  posterId: string | null;\n}','  posterId: string | null;\n  /** external auction IP this production adapts; canonical key art comes from that IP */\n  licensedIpId?: string | null;\n}','production licensed id');
 s=once(s,'  posterId?: string | null;\n}','  posterId?: string | null;\n  /** external auction-IP lineage; continuations keep using its canonical poster */\n  licensedIpId?: string | null;\n}','franchise licensed id');
 s=once(s,'  franchiseKey: string | null;\n}','  franchiseKey: string | null;\n  /** external auction IP, if this is an adaptation */\n  licensedIpId?: string | null;\n}','release licensed id');

 // Planning carries licensed lineage into continuations and bypasses the generic rival-poster pool.
 s=once(s,'    let animeType: AnimeType;\n    if (fr) {','    let animeType: AnimeType;\n    let licensedIpId: string | null;\n    if (fr) {','planned licensed var');
 s=once(s,'      animeType = fr.animeType;\n      franchiseKey = fr.key;','      animeType = fr.animeType;\n      franchiseKey = fr.key;\n      licensedIpId = fr.licensedIpId ?? null;','planned licensed franchise');
 s=once(s,'      title = uniqueTitle(makeOriginalTitle(genres, animeType), usedTitles);\n      franchiseKey = null;','      title = uniqueTitle(makeOriginalTitle(genres, animeType), usedTitles);\n      franchiseKey = null;\n      licensedIpId = null;','planned original no licensed');
 s=once(s,'    const art = assignPoster({ ...studio, posterRecent, franchises }, { genres, animeType, franchiseKey });\n    posterRecent = art.posterRecent;','    const art = licensedIpId ? { posterId: null as string | null, posterRecent } : assignPoster({ ...studio, posterRecent, franchises }, { genres, animeType, franchiseKey });\n    posterRecent = art.posterRecent;','planned licensed poster bypass');
 s=once(s,'      craft,\n      posterId: art.posterId,\n    });','      craft,\n      posterId: art.posterId,\n      licensedIpId,\n    });','planned production licensed id');

 // Surprise productions that continue a licensed line also keep the canonical property art.
 s=once(s,'      const kind: RivalEntryKind = fr ? "season" : "original";\n      const animeType = fr?.animeType ??','      const kind: RivalEntryKind = fr ? "season" : "original";\n      const licensedIpId = fr?.licensedIpId ?? null;\n      const animeType = fr?.animeType ??','surprise licensed var');
 s=once(s,'      const art = assignPoster(studio, { genres, animeType, franchiseKey: fr ? fr.key : null });\n      studio.posterRecent = art.posterRecent;','      const art = licensedIpId ? { posterId: null as string | null, posterRecent: studio.posterRecent ?? [] } : assignPoster(studio, { genres, animeType, franchiseKey: fr ? fr.key : null });\n      studio.posterRecent = art.posterRecent;','surprise licensed art');
 s=once(s,'        craft: craftForProduction(studio, { id, score }),\n        posterId: art.posterId,\n      });','        craft: craftForProduction(studio, { id, score }),\n        posterId: art.posterId,\n        licensedIpId,\n      });','surprise production licensed id');

 // Premiere record + franchise ledger preserve the source IP.
 s=once(s,'        posterId: prod.posterId ?? null,\n        franchiseKey: prod.franchiseKey ?? null,','        posterId: prod.posterId ?? null,\n        franchiseKey: prod.franchiseKey ?? null,\n        licensedIpId: prod.licensedIpId ?? null,','release licensed id');
 s=once(s,'            posterId: prod.posterId ?? null,\n          });','            posterId: prod.posterId ?? null,\n            licensedIpId: prod.licensedIpId ?? null,\n          });','new rival franchise licensed id');

 // Dedicated ownership sync. Called every weekly state tick, so it also covers
 // auctions resolved through Skip/Withdraw UI paths without changing those APIs.
 const marker='/** yearly status transitions: decline, restructure, acquisition, collapse, revival */';
 const helper=`export interface RivalLicensedIpSeed { id: string; title: string; genreTags: GenreId[]; animeType: AnimeType; sourceType: string; rightsBaseValue: number; }\n\n/** Ensure every external property won at auction becomes an actual rival production.\n * One production per acquired property is scheduled; existing release/production\n * identity prevents duplicate greenlights on later weekly syncs. */\nexport function ensureRivalLicensedAdaptations(\n  world: RivalWorld,\n  ownership: Record<string,string>,\n  ips: readonly RivalLicensedIpSeed[],\n  week: number,\n): RivalWorld {\n  let studios = world.studios;\n  for (const [ipId, studioId] of Object.entries(ownership)) {\n    const ip = ips.find((x) => x.id === ipId);\n    if (!ip) continue;\n    studios = studios.map((studio) => {\n      if (studio.id !== studioId || studio.status === "collapsed") return studio;\n      const exists = studio.productions.some((p) => p.licensedIpId === ipId) || studio.releases.some((r) => r.licensedIpId === ipId) || studio.franchises.some((f) => f.licensedIpId === ipId);\n      if (exists) return studio;\n      const id = \`licensed_\${ipId}_\${hashStr(studio.id).toString(36)}\`;\n      const fit = studio.specialist.filter((g) => ip.genreTags.includes(g)).length * 2 + studio.preferred.filter((g) => ip.genreTags.includes(g)).length;\n      const jitter = ((hashStr(\`${id}|score\`) % 900) / 100) - 4.5;\n      const score = clamp(Math.round(13 + studio.tier * 2.4 + studio.reputation * .07 + PERSONAS[studio.persona].qualityBias + fit * 1.3 + jitter), 5, 39);\n      const medium: MediumId = ip.sourceType === "film" ? "movie" : ip.sourceType === "webcomic" ? "ona" : "tv";\n      const budget: BudgetId = ip.rightsBaseValue >= 2_500_000 ? "blockbuster" : ip.rightsBaseValue < 500_000 ? "indie" : "standard";\n      const releaseWeek = week + 8 + (hashStr(\`${id}|week\`) % 11);\n      const prod: RivalProduction = {\n        id, title: ip.title, genres: [...ip.genreTags].slice(0,2), animeType: ip.animeType, medium, budget,\n        week: releaseWeek, year: yearOfWeek(releaseWeek), franchiseKey: null, kind: "licensed", score,\n        craft: rivalCraftFor(studio.persona, score, id), posterId: null, licensedIpId: ipId,\n      };\n      return { ...studio, productions: [...studio.productions, prod] };\n    });\n  }\n  return { ...world, studios };\n}\n\n${marker}`;
 s=once(s,marker,helper,'rival licensed sync helper');
 write(p,s);
}

// Awards know that rivals' licensed adaptations also use source-IP art.
{
 const p='src/engine/awards.ts'; let s=read(p);
 s=once(s,'  /** frozen production identity used to reproduce the player show\'s exact official key visual */\n  draft?: Draft | null;','  /** external auction IP for rival licensed adaptations */\n  licensedIpId?: string | null;\n  /** frozen production identity used to reproduce the player show\'s exact official key visual */\n  draft?: Draft | null;','award licensed id field');
 s=once(s,'    posterId: r.posterId ?? null,\n    draft: null,','    posterId: r.posterId ?? null,\n    licensedIpId: r.licensedIpId ?? null,\n    draft: null,','rival nominee licensed id');
 const old=`export function licensedAwardPosterAsset(n: AwardNominee): string | null {\n  if (!awardNomineeEligible(n)) return null;\n  const licensedIpId = n.draft?.licensedIpId;\n  if (!licensedIpId) return null;\n  return ipById(licensedIpId)?.posterAsset ?? null;\n}`;
 const neu=`export function licensedAwardPosterAsset(n: AwardNominee): string | null {\n  const licensedIpId = n.draft?.licensedIpId ?? n.licensedIpId ?? null;\n  if (!licensedIpId) return null;\n  // Player adaptations keep the auction-provenance guard. Rival adaptations are\n  // created only from the persistent rivalOwned ledger and carry frozen IP id.\n  if (n.player && !awardNomineeEligible(n)) return null;\n  return ipById(licensedIpId)?.posterAsset ?? null;\n}`;
 s=once(s,old,neu,'licensed award poster generalisation');
 write(p,s);
}

// Awards ceremony checks canonical licensed key art before player/rival branches.
{
 const p='src/components/AwardsCeremony.tsx'; let s=read(p);
 const old='function WinnerPoster({ nominee }: { nominee: AwardNominee }) {\n  if (nominee.player) {\n    const licensedPoster = licensedAwardPosterAsset(nominee);\n    if (licensedPoster) {\n      return (\n        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gold/55 bg-[#0d0a17] shadow-[0_24px_90px_rgba(0,0,0,.75)]">\n          <img src={licensedPoster} alt={`${nominee.title} poster`} className="absolute inset-0 h-full w-full object-cover" />\n          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />\n        </div>\n      );\n    }\n\n    const draft = nominee.draft ?? fallbackDraft(nominee);';
 const neu='function WinnerPoster({ nominee }: { nominee: AwardNominee }) {\n  const licensedPoster = licensedAwardPosterAsset(nominee);\n  if (licensedPoster) {\n    return (\n      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gold/55 bg-[#0d0a17] shadow-[0_24px_90px_rgba(0,0,0,.75)]">\n        <img src={licensedPoster} alt={`${nominee.title} poster`} className="absolute inset-0 h-full w-full object-cover" />\n        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />\n      </div>\n    );\n  }\n  if (nominee.player) {\n    const draft = nominee.draft ?? fallbackDraft(nominee);';
 s=once(s,old,neu,'awards canonical licensed art first');
 write(p,s);
}

// Weekly state sync turns rivalOwned auction records into real rival productions.
{
 const p='src/engine/state.ts'; let s=read(p);
 s=once(s,'  finalizeYear,\n  initRivalWorld,','  finalizeYear,\n  initRivalWorld,\n  ensureRivalLicensedAdaptations,','state rival licensed import');
 s=once(s,'import { initIPMarket, migrateIPMarket, tickIPMarket, ipById, playerAuctionAwardProof, type IPMarketState } from "./ip";','import { AUCTION_IPS, initIPMarket, migrateIPMarket, tickIPMarket, ipById, playerAuctionAwardProof, type IPMarketState } from "./ip";','state auction IP import');
 s=once(s,'      ipMarket = ipTick.market;\n      cash += ipTick.cashDelta;\n      rivalWorld = ipTick.world;','      ipMarket = ipTick.market;\n      cash += ipTick.cashDelta;\n      rivalWorld = ensureRivalLicensedAdaptations(ipTick.world, ipMarket.rivalOwned, AUCTION_IPS, w);','state weekly rival licensed sync');
 s=once(s,'            posterId: n.posterId ?? null,\n            draft: n.draft ? migrateDraftV2(n.draft) : null,','            posterId: n.posterId ?? null,\n            licensedIpId: (n as { licensedIpId?: string | null }).licensedIpId ?? null,\n            draft: n.draft ? migrateDraftV2(n.draft) : null,','award migration licensed id');
 write(p,s);
}

console.log('Stage 5 rival licensed adaptation + canonical IP posters applied');
