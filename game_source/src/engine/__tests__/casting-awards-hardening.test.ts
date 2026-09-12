import { describe, expect, it } from "vitest";
import { CAST_V2, type GenreId } from "../data";
import { catalogPairKeys, isCastingActive } from "../castCatalog";
import { awardNomineeEligible, licensedAwardPosterAsset, type AwardNominee } from "../awards";
import { AUCTION_IPS, initIPMarket, migrateIPMarket, playerAuctionAwardProof, type IPContract } from "../ip";

const roles = ["protag", "secondary", "pet", "villain"] as const;
const types = ["shonen", "shojo"] as const;

describe("casting + auction awards hardening", () => {
  it("retains every one of the 435 exact pair cells once per Role × Type bucket", () => {
    for (const role of roles) for (const type of types) {
      const bucket = CAST_V2.filter((m) => m.role === role && m.type === type && isCastingActive(m));
      expect(bucket).toHaveLength(155);
      const counts = new Map<string, number>();
      for (const member of bucket) for (const key of catalogPairKeys(member)) counts.set(key, (counts.get(key) ?? 0) + 1);
      expect(counts.size).toBe(435);
      expect([...counts.values()].every((count) => count === 1)).toBe(true);
    }
  });

  it("requires frozen auction-winner proof before a licensed adaptation can enter awards or show IP key art", () => {
    const ip = AUCTION_IPS[0];
    const base: AwardNominee = {
      title: "Licensed Test", studio: "Player Studio", studioId: "player", player: true, animeType: ip.animeType,
      genres: [...ip.genreTags] as GenreId[], score: 30, story: 30, art: 30, sound: 30, audience: 1000,
      sourceId: "p1", posterId: null, draft: { licensedIpId: ip.id } as never, protag: null,
    };
    expect(awardNomineeEligible(base)).toBe(false);
    expect(licensedAwardPosterAsset(base)).toBeNull();
    const valid = { ...base, licensedIpAward: { ipId: ip.id, auctionId: "auc_test", ownerStudioId: "player" } };
    expect(awardNomineeEligible(valid)).toBe(true);
    expect(licensedAwardPosterAsset(valid)).toBe(ip.posterAsset);
    const stolen = { ...valid, licensedIpAward: { ...valid.licensedIpAward, ownerStudioId: "rival_wrong" } };
    expect(awardNomineeEligible(stolen)).toBe(false);
    expect(licensedAwardPosterAsset(stolen)).toBeNull();
  });

  it("persists auction provenance and only backfills legacy contracts from a resolved player win", () => {
    const ip = AUCTION_IPS[0];
    const contract: IPContract = { ipId: ip.id, acquiredWeek: 10, expiresWeek: 100, purchasePrice: 1000, royaltyRate: .1, ownershipShare: .3, sequelRights: false, merchRights: false, internationalRights: false, adaptations: 0, bestScore: 0, discoveredArcs: [] };
    const market = initIPMarket(0);
    const migrated = migrateIPMarket({ ...market, owned: { [ip.id]: contract }, auctions: [{ id: "auc_legacy", ipId: ip.id, type: "open", opensWeek: 9, closesWeek: 10, currentBid: 1000, leadingStudioId: "player", playerMaxBid: 1000, bids: [], appraisalLevel: 0, resolved: true, winnerId: "player", winningBid: 1000 }] }, 10);
    expect(playerAuctionAwardProof(migrated, ip.id)).toEqual({ ipId: ip.id, auctionId: "auc_legacy", ownerStudioId: "player" });
    const unproven = migrateIPMarket({ ...market, owned: { [ip.id]: contract }, auctions: [] }, 10);
    expect(playerAuctionAwardProof(unproven, ip.id)).toBeNull();
  });
});
