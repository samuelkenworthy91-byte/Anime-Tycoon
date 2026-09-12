import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const write = (path, text) => fs.writeFileSync(path, text);

function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`${label}: target not found`);
  if (text.indexOf(from, first + from.length) >= 0) throw new Error(`${label}: target is not unique`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

function replaceRange(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  if (start < 0) throw new Error(`${label}: start marker not found`);
  const end = text.indexOf(endMarker, start);
  if (end < 0) throw new Error(`${label}: end marker not found`);
  return text.slice(0, start) + replacement + text.slice(end);
}

function hardenCastCatalog() {
  const path = "src/engine/castCatalog.ts";
  let text = read(path);
  if (text.includes("HARD_VISUAL_SIGNATURE_INVARIANT_V1")) return;

  text = replaceOnce(
    text,
    `]);\n\n/**\n * The source visible affinities are no longer mechanical wiring`,
    `]);\n\n// HARD_VISUAL_SIGNATURE_INVARIANT_V1\nfunction visualSignatureGenres(member: CastMember): GenreId[] {\n  return member.visibleAff.filter((genre) => VISUAL_SIGNATURE_GENRES.has(genre));\n}\n\n/**\n * The source visible affinities are no longer mechanical wiring`,
    "cast signature helper",
  );

  text = replaceOnce(
    text,
    `  const weights = blocks.map((block) => members.map((member) =>\n    scoreMemberForBlock(member, block, pinned) + (hash32(\`${"${role}|${type}|${block.id}|${member.id}"}\`) % 97)\n  ));`,
    `  const weights = blocks.map((block) => members.map((member) => {\n    const signatures = visualSignatureGenres(member);\n    const hardVisualMismatch = signatures.length > 0 && !signatures.some((genre) => block.genres.includes(genre));\n    const tie = hash32(\`${"${role}|${type}|${block.id}|${member.id}"}\`) % 97;\n    // An unmistakably themed active portrait may never be relabelled into an\n    // unrelated catalogue block. Rectangular assignment can leave surplus\n    // themed portraits in reserve instead of lying about what the art depicts.\n    if (hardVisualMismatch) return -1_000_000_000_000_000 + tie;\n    return scoreMemberForBlock(member, block, pinned) + tie;\n  }));`,
    "cast hard assignment",
  );

  text = replaceOnce(
    text,
    `  const genreOrder = new Map(genres.map((genre, index) => [genre, index]));\n  const rebuiltById = new Map<string, CastMember>();`,
    `  const genreOrder = new Map(genres.map((genre, index) => [genre, index]));\n  const rebuiltById = new Map<string, CastMember>();\n  const originalById = new Map(rawMembers.map((member) => [member.id, member] as const));`,
    "cast original lookup",
  );

  text = replaceOnce(
    text,
    `      for (const [key, count] of ownerCount) {\n        if (count !== 1) throw new Error(\`${"${role}/${type}/${key}: expected one owner, got ${count}."}\`);\n      }`,
    `      for (const [key, count] of ownerCount) {\n        if (count !== 1) throw new Error(\`${"${role}/${type}/${key}: expected one owner, got ${count}."}\`);\n      }\n      for (const member of bucket) {\n        const original = originalById.get(member.id);\n        if (!original) throw new Error(\`${"${role}/${type}/${member.id}: original portrait metadata missing."}\`);\n        const signatures = visualSignatureGenres(original);\n        if (signatures.length > 0) {\n          const assigned = castingCatalogMeta(member)?.genres ?? [];\n          if (!signatures.some((genre) => assigned.includes(genre))) {\n            throw new Error(\`${"${role}/${type}/${member.id}: visual signature ${signatures.join(\",\")} was lost in active catalogue assignment."}\`);\n          }\n        }\n      }`,
    "cast final signature invariant",
  );

  write(path, text);
}

function hardenIpProvenance() {
  const path = "src/engine/ip.ts";
  let text = read(path);
  if (text.includes("AUCTION_AWARD_PROVENANCE_V1")) return;

  text = replaceOnce(
    text,
    `export interface IPContract { ipId:string; acquiredWeek:number; expiresWeek:number; purchasePrice:number; royaltyRate:number; ownershipShare:number; sequelRights:boolean; merchRights:boolean; internationalRights:boolean; adaptations:number; bestScore:number; discoveredArcs:string[]; }`,
    `export interface IPContract { ipId:string; acquiredWeek:number; expiresWeek:number; purchasePrice:number; royaltyRate:number; ownershipShare:number; sequelRights:boolean; merchRights:boolean; internationalRights:boolean; adaptations:number; bestScore:number; discoveredArcs:string[]; /** AUCTION_AWARD_PROVENANCE_V1 */ acquisition?: "auction"; auctionId?: string; ownerStudioId?: string; }`,
    "IP contract provenance fields",
  );

  const oldMigrate = `export function migrateIPMarket(raw:unknown,week:number):IPMarketState { const r=(raw&&typeof raw==="object"?raw:{}) as Partial<IPMarketState>; const fresh=initIPMarket(week); const annual=r.annualAuctionVersion===1; return {...fresh,...r,nextAuctionWeek:annual&&typeof r.nextAuctionWeek==="number"?r.nextAuctionWeek:fresh.nextAuctionWeek,auctions:Array.isArray(r.auctions)?r.auctions:[],owned:r.owned&&typeof r.owned==="object"?r.owned:{},rivalOwned:r.rivalOwned&&typeof r.rivalOwned==="object"?r.rivalOwned:{},history:Array.isArray(r.history)?r.history:[],studioArcs:Array.isArray(r.studioArcs)?r.studioArcs:[],pendingPromptId:typeof r.pendingPromptId==="string"?r.pendingPromptId:null,annualAuctionVersion:1}; }`;
  const newMigrate = `export function migrateIPMarket(raw:unknown,week:number):IPMarketState {\n  const r=(raw&&typeof raw==="object"?raw:{}) as Partial<IPMarketState>;\n  const fresh=initIPMarket(week);\n  const annual=r.annualAuctionVersion===1;\n  const auctions=Array.isArray(r.auctions)?r.auctions:[];\n  const rawOwned=(r.owned&&typeof r.owned==="object"?r.owned:{}) as Record<string,IPContract>;\n  // Backfill proof only when an old save still contains a resolved player-win\n  // auction. Unproven/manual contracts deliberately remain award-ineligible.\n  const owned=Object.fromEntries(Object.entries(rawOwned).map(([ipId,contract])=>{\n    if(contract.acquisition==="auction"&&contract.ownerStudioId==="player"&&contract.auctionId)return [ipId,contract];\n    const proof=[...auctions].reverse().find(a=>a.resolved&&a.winnerId==="player"&&a.ipId===ipId);\n    return [ipId,proof?{...contract,acquisition:"auction" as const,auctionId:proof.id,ownerStudioId:"player"}:contract];\n  }));\n  return {...fresh,...r,nextAuctionWeek:annual&&typeof r.nextAuctionWeek==="number"?r.nextAuctionWeek:fresh.nextAuctionWeek,auctions,owned,rivalOwned:r.rivalOwned&&typeof r.rivalOwned==="object"?r.rivalOwned:{},history:Array.isArray(r.history)?r.history:[],studioArcs:Array.isArray(r.studioArcs)?r.studioArcs:[],pendingPromptId:typeof r.pendingPromptId==="string"?r.pendingPromptId:null,annualAuctionVersion:1};\n}`;
  text = replaceOnce(text, oldMigrate, newMigrate, "IP market migration provenance");

  text = replaceOnce(
    text,
    `export const ipById=(id:string)=>AUCTION_IPS.find(x=>x.id===id)??null;`,
    `export const ipById=(id:string)=>AUCTION_IPS.find(x=>x.id===id)??null;\nexport function playerAuctionAwardProof(m:IPMarketState,ipId:string):{ipId:string;auctionId:string;ownerStudioId:"player"}|null {\n  const contract=m.owned[ipId];\n  if(!contract||contract.acquisition!=="auction"||contract.ownerStudioId!=="player"||!contract.auctionId)return null;\n  return {ipId,auctionId:contract.auctionId,ownerStudioId:"player"};\n}`,
    "IP player auction award proof",
  );

  text = replaceOnce(
    text,
    `const makeContract=(ip:AuctionIP,week:number,price:number):IPContract=>({ipId:ip.id,acquiredWeek:week,expiresWeek:week+ip.licenseLength,purchasePrice:price,royaltyRate:ip.royaltyRate,ownershipShare:.3,sequelRights:false,merchRights:false,internationalRights:false,adaptations:0,bestScore:0,discoveredArcs:[]});`,
    `const makeContract=(ip:AuctionIP,week:number,price:number,auctionId:string):IPContract=>({ipId:ip.id,acquiredWeek:week,expiresWeek:week+ip.licenseLength,purchasePrice:price,royaltyRate:ip.royaltyRate,ownershipShare:.3,sequelRights:false,merchRights:false,internationalRights:false,adaptations:0,bestScore:0,discoveredArcs:[],acquisition:"auction",auctionId,ownerStudioId:"player"});`,
    "IP contract constructor provenance",
  );
  text = replaceOnce(text, `makeContract(ip,week,amount)`, `makeContract(ip,week,amount,a.id)`, "live auction contract provenance");
  text = replaceOnce(text, `makeContract(ip,run.week,a.currentBid)`, `makeContract(ip,run.week,a.currentBid,a.id)`, "weekly auction contract provenance");

  write(path, text);
}

function hardenAwards() {
  const path = "src/engine/awards.ts";
  let text = read(path);
  if (text.includes("LICENSED_AWARD_OWNER_GUARD_V1")) return;

  text = replaceOnce(
    text,
    `  sourceId?: string | null;\n  /** key art identity — rival poster manifest id for rivals */`,
    `  sourceId?: string | null;\n  /** stable studio identity used for licensed-IP ownership checks */\n  studioId?: string | null;\n  /** key art identity — rival poster manifest id for rivals */`,
    "award nominee studio id",
  );
  text = replaceOnce(
    text,
    `  /** lead id retained for legacy saves / safe fallback poster rendering */\n  protag?: string | null;\n}`,
    `  /** lead id retained for legacy saves / safe fallback poster rendering */\n  protag?: string | null;\n  /** LICENSED_AWARD_OWNER_GUARD_V1 — frozen proof that this adaptation belongs\n   *  to the studio that actually won the source auction. */\n  licensedIpAward?: { ipId: string; auctionId: string; ownerStudioId: string } | null;\n}`,
    "award nominee licensed proof",
  );
  text = replaceOnce(
    text,
    `    sourceId: \`${"${r.studioId}:${r.week}:${r.title}"}\`,\n    posterId: r.posterId ?? null,\n    draft: null,\n    protag: null,`,
    `    sourceId: \`${"${r.studioId}:${r.week}:${r.title}"}\`,\n    studioId: r.studioId,\n    posterId: r.posterId ?? null,\n    draft: null,\n    protag: null,\n    licensedIpAward: null,`,
    "rival nominee stable studio id",
  );

  const posterStart = `/** Canonical key art for a player release adapted from an auction IP. */\nexport function licensedAwardPosterAsset`;
  const posterEnd = `\n/* ----------------------------------------------------------- categories */`;
  const guardedPoster = `/** Only a verified auction winner may enter a licensed adaptation. Originals\n * remain normally eligible. This is deliberately frozen into the nominee so\n * later contract expiry or auction pruning cannot rewrite awards history. */\nexport function awardNomineeEligible(n: AwardNominee): boolean {\n  const licensedIpId = n.draft?.licensedIpId;\n  if (!licensedIpId) return true;\n  const proof = n.licensedIpAward;\n  const studioId = n.player ? "player" : n.studioId;\n  return !!proof && !!studioId && proof.ipId === licensedIpId && proof.ownerStudioId === studioId && proof.auctionId.length > 0;\n}\n\n/** Canonical key art for an award-eligible auction-IP adaptation. */\nexport function licensedAwardPosterAsset(n: AwardNominee): string | null {\n  if (!awardNomineeEligible(n)) return null;\n  const licensedIpId = n.draft?.licensedIpId;\n  if (!licensedIpId) return null;\n  return ipById(licensedIpId)?.posterAsset ?? null;\n}\n`;
  text = replaceRange(text, posterStart, posterEnd, guardedPoster, "licensed awards poster guard");

  text = replaceOnce(
    text,
    `  return shows.filter((show) => {\n    const key = awardNomineeKey(show);`,
    `  return shows.filter((show) => {\n    if (!awardNomineeEligible(show)) return false;\n    const key = awardNomineeKey(show);`,
    "awards slate eligibility guard",
  );

  write(path, text);
}

function hardenStateRelease() {
  const path = "src/engine/state.ts";
  let text = read(path);
  if (text.includes("licensedAwardProof = playerAuctionAwardProof")) return;

  text = replaceOnce(
    text,
    `import { initIPMarket, licensedRevenue, migrateIPMarket, tickIPMarket, ipById, type IPMarketState } from "./ip";`,
    `import { initIPMarket, licensedRevenue, migrateIPMarket, tickIPMarket, ipById, playerAuctionAwardProof, type IPMarketState } from "./ip";`,
    "state IP provenance import",
  );
  text = replaceOnce(
    text,
    `  const licensedContract = draft.licensedIpId ? r.ipMarket.owned[draft.licensedIpId] : null;\n  if (licensedIp && licensedContract) {`,
    `  const licensedContract = draft.licensedIpId ? r.ipMarket.owned[draft.licensedIpId] : null;\n  const licensedAwardProof = draft.licensedIpId ? playerAuctionAwardProof(r.ipMarket, draft.licensedIpId) : null;\n  if (licensedIp && licensedContract) {`,
    "state licensed award proof",
  );

  text = replaceOnce(
    text,
    `  if (blueprintDiscovered) notices.push(\`🧠 Hidden story blueprint discovered: ${"${hiddenBlueprint!.replace(/_/g, \" \").toUpperCase()}"} — now available to original productions.\`);\n\n  const run: RunState = {`,
    `  if (blueprintDiscovered) notices.push(\`🧠 Hidden story blueprint discovered: ${"${hiddenBlueprint!.replace(/_/g, \" \").toUpperCase()}"} — now available to original productions.\`);\n\n  const awardEntry: AwardNominee | null = (!draft.licensedIpId || licensedAwardProof) ? {\n    title: draft.title,\n    studio: r.studio,\n    studioId: "player",\n    player: true,\n    animeType: draft.animeType,\n    genres: [...draft.genres],\n    score: result.total,\n    ...playerCraftFor(result.total, result.points),\n    audience: result.fans,\n    sourceId: projectId,\n    posterId: null,\n    draft: {\n      ...draft,\n      genres: [...draft.genres],\n      arcs: [...draft.arcs],\n      sliders: [...draft.sliders] as [number, number, number],\n    },\n    protag: draft.protag,\n    licensedIpAward: licensedAwardProof,\n  } : null;\n\n  const run: RunState = {`,
    "state award entry construction",
  );

  const yearStart = `    /* the awards slate keeps REAL production data: critic total, discipline\n       point mix (→ craft strengths), audience, genres — never invented values */\n    yearShows: [`;
  const yearEnd = `    lastResult: result,`;
  const replacement = `    /* the awards slate keeps REAL production data. Licensed adaptations enter\n       only when their frozen auction-winner provenance proves this studio owns\n       the rights; originals remain normally eligible. */\n    yearShows: awardEntry ? [...r.yearShows, awardEntry] : r.yearShows,\n`;
  text = replaceRange(text, yearStart, yearEnd, replacement, "state awards slate replacement");

  write(path, text);
}

function writeRegressionTests() {
  const path = "src/engine/__tests__/casting-awards-hardening.test.ts";
  const test = `import { describe, expect, it } from "vitest";\nimport { CAST_V2, type GenreId } from "../data";\nimport { catalogPairKeys, isCastingActive } from "../castCatalog";\nimport { awardNomineeEligible, licensedAwardPosterAsset, type AwardNominee } from "../awards";\nimport { AUCTION_IPS, initIPMarket, migrateIPMarket, playerAuctionAwardProof, type IPContract } from "../ip";\n\nconst roles = ["protag", "secondary", "pet", "villain"] as const;\nconst types = ["shonen", "shojo"] as const;\n\ndescribe("casting + auction awards hardening", () => {\n  it("retains every one of the 435 exact pair cells once per Role × Type bucket", () => {\n    for (const role of roles) for (const type of types) {\n      const bucket = CAST_V2.filter((m) => m.role === role && m.type === type && isCastingActive(m));\n      expect(bucket).toHaveLength(155);\n      const counts = new Map<string, number>();\n      for (const member of bucket) for (const key of catalogPairKeys(member)) counts.set(key, (counts.get(key) ?? 0) + 1);\n      expect(counts.size).toBe(435);\n      expect([...counts.values()].every((count) => count === 1)).toBe(true);\n    }\n  });\n\n  it("requires frozen auction-winner proof before a licensed adaptation can enter awards or show IP key art", () => {\n    const ip = AUCTION_IPS[0];\n    const base: AwardNominee = {\n      title: "Licensed Test", studio: "Player Studio", studioId: "player", player: true, animeType: ip.animeType,\n      genres: [...ip.genreTags] as GenreId[], score: 30, story: 30, art: 30, sound: 30, audience: 1000,\n      sourceId: "p1", posterId: null, draft: { licensedIpId: ip.id } as never, protag: null,\n    };\n    expect(awardNomineeEligible(base)).toBe(false);\n    expect(licensedAwardPosterAsset(base)).toBeNull();\n    const valid = { ...base, licensedIpAward: { ipId: ip.id, auctionId: "auc_test", ownerStudioId: "player" } };\n    expect(awardNomineeEligible(valid)).toBe(true);\n    expect(licensedAwardPosterAsset(valid)).toBe(ip.posterAsset);\n    const stolen = { ...valid, licensedIpAward: { ...valid.licensedIpAward, ownerStudioId: "rival_wrong" } };\n    expect(awardNomineeEligible(stolen)).toBe(false);\n    expect(licensedAwardPosterAsset(stolen)).toBeNull();\n  });\n\n  it("persists auction provenance and only backfills legacy contracts from a resolved player win", () => {\n    const ip = AUCTION_IPS[0];\n    const contract: IPContract = { ipId: ip.id, acquiredWeek: 10, expiresWeek: 100, purchasePrice: 1000, royaltyRate: .1, ownershipShare: .3, sequelRights: false, merchRights: false, internationalRights: false, adaptations: 0, bestScore: 0, discoveredArcs: [] };\n    const market = initIPMarket(0);\n    const migrated = migrateIPMarket({ ...market, owned: { [ip.id]: contract }, auctions: [{ id: "auc_legacy", ipId: ip.id, type: "open", opensWeek: 9, closesWeek: 10, currentBid: 1000, leadingStudioId: "player", playerMaxBid: 1000, bids: [], appraisalLevel: 0, resolved: true, winnerId: "player", winningBid: 1000 }] }, 10);\n    expect(playerAuctionAwardProof(migrated, ip.id)).toEqual({ ipId: ip.id, auctionId: "auc_legacy", ownerStudioId: "player" });\n    const unproven = migrateIPMarket({ ...market, owned: { [ip.id]: contract }, auctions: [] }, 10);\n    expect(playerAuctionAwardProof(unproven, ip.id)).toBeNull();\n  });\n});\n`;
  write(path, test);
}

hardenCastCatalog();
hardenIpProvenance();
hardenAwards();
hardenStateRelease();
writeRegressionTests();
console.log("Casting visual signatures + auction awards ownership hardening applied.");
