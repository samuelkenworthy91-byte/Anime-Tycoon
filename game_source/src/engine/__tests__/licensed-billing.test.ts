import { describe, expect, it } from "vitest";
import { PETS, PROTAGONISTS, SECONDARY, VILLAINS, type Draft } from "../data";
import { createFranchise, recordContinuation } from "../franchise";
import { AUCTION_IPS } from "../ip";

describe("licensed IP character billing", () => {
  it("keeps edited source-character names across licensed sequels and reboots without creating studio cast records", () => {
    const ip = AUCTION_IPS.find((candidate) => candidate.animeType === "shojo")!;
    const byRole = (role: "protagonist" | "companion" | "mascot" | "antagonist") =>
      ip.characters.find((character) => character.role === role)?.name ?? "";

    const first: Draft = {
      title: ip.title,
      medium: "tv",
      budget: "standard",
      scope: "standard",
      slot: "prime",
      animeType: ip.animeType,
      genres: ip.genreTags.slice(0, 2),
      audience: ip.audience,
      protag: PROTAGONISTS[0].id,
      protagName: byRole("protagonist"),
      secondary: SECONDARY[0].id,
      secondaryName: byRole("companion"),
      pet: PETS[0].id,
      petName: byRole("mascot"),
      villain: VILLAINS[0].id,
      villainName: byRole("antagonist"),
      arcs: ["hook", "finale"],
      sliders: [50, 50, 50],
      season: 1,
      licensedIpId: ip.id,
      licensedArcId: ip.availableArcs[0].id,
      licensedCharacters: ip.characters.map((character) => character.name),
    };

    const created = createFranchise(
      ip.title,
      first,
      {
        protag: first.protag,
        protagName: first.protagName,
        secondary: first.secondary,
        secondaryName: first.secondaryName ?? "",
        pet: first.pet,
        petName: first.petName ?? "",
        villain: first.villain,
        villainName: first.villainName ?? "",
      },
      { total: 30, revenue: 1_000_000, fans: 20_000, hallOfFame: false },
      10,
    );
    const licensedFranchise = { ...created, cast: [] };

    expect(licensedFranchise.licensedBilling?.protag).toBe(first.protagName);
    expect(licensedFranchise.cast).toHaveLength(0);

    const sequel: Draft = {
      ...first,
      season: 2,
      continuation: "season",
      franchiseKey: ip.title,
      protagName: "Edited Lead Name",
      secondaryName: "Edited Companion Name",
      petName: "Edited Mascot Name",
      villainName: "Edited Villain Name",
    };
    const continued = recordContinuation(
      licensedFranchise,
      sequel,
      { total: 32, revenue: 1_300_000, fans: 25_000, hallOfFame: true },
      30,
    ).franchise;

    expect(continued.cast).toHaveLength(0);
    expect(continued.licensedBilling).toEqual({
      protag: "Edited Lead Name",
      secondary: "Edited Companion Name",
      pet: "Edited Mascot Name",
      villain: "Edited Villain Name",
    });

    const reboot = recordContinuation(
      continued,
      { ...sequel, season: 3, continuation: "reboot", protagName: "Reboot Lead" },
      { total: 31, revenue: 1_100_000, fans: 22_000, hallOfFame: false },
      60,
    ).franchise;
    expect(reboot.licensedBilling?.protag).toBe("Reboot Lead");
    expect(reboot.licensedBilling?.secondary).toBe("Edited Companion Name");
  });
});
