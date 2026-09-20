import { describe, expect, it } from "vitest";
import data from "../generated/internationalNames.json";
import { internationalNameForSeed, randomInternationalName } from "../internationalNames";

describe("international person names", () => {
  it("ships 100 male names, 100 female names and 100 surnames from each of 50 countries", () => {
    expect(data.countryCount).toBe(50);
    expect(data.countries).toHaveLength(50);
    for (const country of data.countries) {
      expect(country.male).toHaveLength(100);
      expect(country.female).toHaveLength(100);
      expect(country.surnames).toHaveLength(100);
    }
  });

  it("locks first names to the requested gender while allowing cross-country surnames", () => {
    const values = [0, 0, 0.9999, 0];
    let index = 0;
    const male = randomInternationalName("male", () => values[index++ % values.length]);
    index = 0;
    const female = randomInternationalName("female", () => values[index++ % values.length]);
    const firstCountry = data.countries[0];
    const lastCountry = data.countries[data.countries.length - 1];
    expect(firstCountry.male).toContain(male.split(" ")[0]);
    expect(firstCountry.female).toContain(female.split(" ")[0]);
    expect(male.endsWith(lastCountry.surnames[0])).toBe(true);
    expect(female.endsWith(lastCountry.surnames[0])).toBe(true);
  });

  it("provides a real neutral-name pool for visually ambiguous workers", () => {
    expect(data.neutralFirstNames.length).toBeGreaterThanOrEqual(100);
    const neutral = internationalNameForSeed("neutral", "worker:ambiguous");
    expect(data.neutralFirstNames.some((name) => neutral.startsWith(`${name} `))).toBe(true);
  });

  it("keeps catalog character billing stable for the same id and gender", () => {
    expect(internationalNameForSeed("female", "cast:test_hero")).toBe(internationalNameForSeed("female", "cast:test_hero"));
    expect(internationalNameForSeed("male", "cast:test_hero")).not.toBe("");
  });
});
