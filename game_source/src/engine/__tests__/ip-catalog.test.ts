import { describe, expect, it } from "vitest";
import { AUCTION_IPS } from "../ip";
import { IP_SOURCE_CANON } from "../ipSourceCanon";

describe("auction IP authored source canon", () => {
  it("covers all 100 source properties with player-facing plot summaries", () => {
    expect(AUCTION_IPS).toHaveLength(100);
    expect(Object.keys(IP_SOURCE_CANON)).toHaveLength(100);
    for (const ip of AUCTION_IPS) {
      expect(ip.description.length, ip.title).toBeGreaterThan(60);
      expect(ip.characters, ip.title).toHaveLength(4);
      expect(new Set(ip.characters.map((character) => character.name)).size, ip.title).toBe(4);
      expect(ip.genreTags.length, ip.title).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses hand-authored parody names rather than the previous generic name generator", () => {
    expect(AUCTION_IPS.find((ip) => ip.id === "ip_002")?.characters.map((c) => c.name)).toContain("Claude Stray");
    expect(AUCTION_IPS.find((ip) => ip.id === "ip_019")?.characters.map((c) => c.name)).toContain("Ash Catchall");
    expect(AUCTION_IPS.find((ip) => ip.id === "ip_052")?.characters.map((c) => c.name)).toContain("Rik Koo");
    expect(AUCTION_IPS.find((ip) => ip.id === "ip_096")?.characters.map((c) => c.name)).toContain("Walter Bright");
  });
});
