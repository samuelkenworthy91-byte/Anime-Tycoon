import { describe, expect, it } from "vitest";
import type { Draft } from "../data";
import { AUCTION_IPS } from "../ip";
import { buildCeremony, licensedAwardPosterAsset, type AwardNominee } from "../awards";

const nomineeFor = (ipIndex = 0): AwardNominee => {
  const ip = AUCTION_IPS[ipIndex];
  const draft: Draft = {
    title: ip.title,
    medium: "tv",
    budget: "standard",
    slot: "prime",
    animeType: ip.animeType,
    genres: ip.genreTags.slice(0, 2),
    audience: ip.audience,
    protag: "kai",
    protagName: ip.characters[0]?.name ?? "Lead",
    secondary: "",
    pet: "",
    villain: "",
    arcs: [],
    sliders: [50, 50, 50],
    season: 1,
    licensedIpId: ip.id,
    licensedCharacters: ip.characters.map((character) => character.name),
  };
  return {
    title: ip.title,
    studio: "Player Studio",
    studioId: "player",
    player: true,
    animeType: ip.animeType,
    genres: [...draft.genres],
    score: 36,
    story: 52,
    art: 55,
    sound: 49,
    audience: 250_000,
    sourceId: `licensed:${ip.id}`,
    posterId: null,
    draft,
    protag: draft.protag,
    licensedIpAward: {
      ipId: ip.id,
      auctionId: `auction-test:${ip.id}`,
      ownerStudioId: "player",
    },
  };
};

describe("auction IP awards integration", () => {
  it("puts an auction-won licensed production into every awards category its anime type allows", () => {
    const nominee = nomineeFor();
    const ceremony = buildCeremony(3, [nominee]);
    const categoryIds = ceremony.categories.map((category) => category.id);

    expect(categoryIds).toEqual(expect.arrayContaining(["aoty", "writing", "animation", "score", "fanfav"]));
    expect(categoryIds).toContain(nominee.animeType === "shonen" ? "shonen" : "shojo");
    expect(categoryIds).not.toContain(nominee.animeType === "shonen" ? "shojo" : "shonen");

    for (const category of ceremony.categories) {
      expect(category.nominees.some((entry) => entry.sourceId === nominee.sourceId), category.id).toBe(true);
      expect(category.winner.sourceId, category.id).toBe(nominee.sourceId);
    }
  });

  it("uses the auction property's canonical poster only for the verified winner", () => {
    const nominee = nomineeFor(1);
    const ip = AUCTION_IPS[1];
    expect(licensedAwardPosterAsset(nominee)).toBe(ip.posterAsset);

    nominee.licensedIpAward = { ...nominee.licensedIpAward!, ownerStudioId: "wrong-studio" };
    expect(licensedAwardPosterAsset(nominee)).toBeNull();
  });

  it("does not replace original-production posters with an auction asset", () => {
    const nominee = nomineeFor();
    nominee.draft = { ...nominee.draft!, licensedIpId: undefined };
    expect(licensedAwardPosterAsset(nominee)).toBeNull();
  });
});