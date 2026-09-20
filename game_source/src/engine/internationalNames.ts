import raw from "./generated/internationalNames.json";

export type PersonNameGender = "male" | "female" | "neutral";

type CountryPool = {
  code: string;
  country: string;
  male: string[];
  female: string[];
  surnames: string[];
};

type InternationalNameData = {
  countryCount: number;
  countries: CountryPool[];
  neutralFirstNames: string[];
};

const DATA = raw as InternationalNameData;
export const INTERNATIONAL_NAME_COUNTRIES = DATA.countries;
export const INTERNATIONAL_NAME_COUNTRY_COUNT = DATA.countryCount;

const pick = <T>(items: readonly T[], rng: () => number): T =>
  items[Math.min(items.length - 1, Math.max(0, Math.floor(rng() * items.length)))];

export function personGender(value: string | undefined | null, rng: () => number = Math.random): PersonNameGender {
  const g = (value ?? "").trim().toLowerCase();
  if (g === "female" || g === "f" || g === "woman" || g === "girl") return "female";
  if (g === "male" || g === "m" || g === "man" || g === "boy") return "male";
  if (g === "neutral" || g === "unknown" || g === "unsure" || g === "androgynous") return "neutral";
  return rng() < 0.5 ? "female" : "male";
}

/**
 * Pick first name and surname independently, including independently chosen
 * countries. This deliberately allows any cross-country first/last-name
 * combination while keeping the first name locked to the person's gender.
 */
export function randomInternationalName(
  gender: PersonNameGender,
  rng: () => number = Math.random,
): string {
  const first = gender === "neutral"
    ? pick(DATA.neutralFirstNames, rng)
    : pick(pick(INTERNATIONAL_NAME_COUNTRIES, rng)[gender], rng);
  const surnameCountry = pick(INTERNATIONAL_NAME_COUNTRIES, rng);
  const surname = pick(surnameCountry.surnames, rng);
  return `${first} ${surname}`;
}

export const randomCharacterName = (
  gender: string | undefined | null,
  rng: () => number = Math.random,
) => randomInternationalName(personGender(gender, rng), rng);

function seededNameRng(seed: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable randomized billing for catalog characters: reloads keep the same
 * person while different cast IDs spread across the 50-country name pool. */
export function internationalNameForSeed(gender: string | undefined | null, seed: string): string {
  const rng = seededNameRng(seed);
  return randomInternationalName(personGender(gender, rng), rng);
}
