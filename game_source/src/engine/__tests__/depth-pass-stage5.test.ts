import { describe, expect, it } from "vitest";
import { licensedAwardPosterAsset, rivalNominee } from "../awards";
import { AUCTION_IPS } from "../ip";
import { ensureRivalLicensedAdaptations, initRivalWorld, type RivalRelease } from "../rivals";

describe("rival licensed IP integration", () => {
  it("turns rival-owned auction rights into one persistent adaptation, not a duplicate every week", () => {
    const world = initRivalWorld(0);
    const studio = world.studios[0];
    const ip = AUCTION_IPS[0];
    const first = ensureRivalLicensedAdaptations(world, { [ip.id]: studio.id }, AUCTION_IPS, 12);
    const planned = first.studios.find((s) => s.id === studio.id)!.productions.filter((p) => p.licensedIpId === ip.id);
    expect(planned).toHaveLength(1);
    expect(planned[0].title).toBe(ip.title);
    expect(planned[0].genres).toEqual(ip.genreTags.slice(0, 2));
    expect(planned[0].posterId).toBeNull();
    const second = ensureRivalLicensedAdaptations(first, { [ip.id]: studio.id }, AUCTION_IPS, 13);
    expect(second.studios.find((s) => s.id === studio.id)!.productions.filter((p) => p.licensedIpId === ip.id)).toHaveLength(1);
  });

  it("carries the auction-IP identity into awards and uses the property's canonical poster", () => {
    const ip = AUCTION_IPS[1];
    const release: RivalRelease = {
      title: ip.title, studioId: "rival", studio: "Rival Studio", score: 31, week: 30, year: 1,
      genres: ip.genreTags.slice(0, 2), animeType: ip.animeType, revenue: 1_000_000, fans: 55_000,
      kind: "licensed", hallOfFame: false, craft: { story: 30, art: 32, sound: 29 },
      posterId: null, franchiseKey: null, licensedIpId: ip.id,
    };
    const nominee = rivalNominee(release);
    expect(nominee.licensedIpId).toBe(ip.id);
    expect(licensedAwardPosterAsset(nominee)).toBe(ip.posterAsset);
  });
});
