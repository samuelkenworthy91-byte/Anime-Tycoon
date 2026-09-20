import raw from "./generated/internationalNames.json";

export type PersonNameGender = "male" | "female";

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
  const firstCountry = pick(INTERNATIONAL_NAME_COUNTRIES, rng);
  const first = pick(firstCountry[gender], rng);
  const surnameCountry = pick(INTERNATIONAL_NAME_COUNTRIES, rng);
  const surname = pick(surnameCountry.surnames, rng);
  return `${first} ${surname}`;
}

export const randomCharacterName = (
  gender: string | undefined | null,
  rng: () => number = Math.random,
) => randomInternationalName(personGender(gender, rng), rng);
