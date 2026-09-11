import runtime from "./generated/castV3.json";
import genreRuntime from "./generated/genreV3.json";
import type { AnimeType, CastMember, CastRole, GenreId } from "./data";
import {
  catalogHasSecret,
  isCastingActive,
  rebuildCastingCatalog,
} from "./castCatalog";

const CHEMISTRY_CAST_IDS = new Set([
  "kai", "s_riku", "v_carnage",
  "emi", "p_nya", "v_nightshade",
  "kage", "s_chiaki", "v_hollow",
  "shiro", "s_shin", "v_puppeteer",
  "kaito", "s_ryo", "v_scuttle",
  "airi", "s_yuna", "p_piko",
  "rei", "s_ken", "v_volt",
  "yuki", "v_titanus", "p_kona",
  "kenta", "s_eiji", "p_gon",
  "hikari", "s_nozomi", "p_mochi",
  "kuro", "s_tobi", "v_kairos",
  "n_ryoko", "tsubasa", "p_fuwa",
  "suzume", "s_amber", "p_nibi",
  "daichi", "s_kanna", "sen",
  "itsuki", "s_alfred", "v_harlequin",
  "leo", "s_maki", "p_ponta",
  "ash", "s_reina", "p_lumen",
  "zuri", "s_peko", "p_cogsworth",
]);

/**
 * Compatibility export name retained for existing consumers and saved-ID lookup.
 * The source runtime now supplies identity/art only; active casting affinities are
 * rebuilt by Casting Catalog V7 every load. Legacy castingPairKeys are discarded.
 */
export const CAST_V2 = rebuildCastingCatalog(
  runtime.cast as CastMember[],
  genreRuntime.genres.map((genre) => genre.id as GenreId),
  { pinnedActiveIds: CHEMISTRY_CAST_IDS },
);
const BY_ID = new Map(CAST_V2.map((member) => [member.id, member]));

export const CAST_WEIGHTS: Record<CastRole, number> = {
  protag: 1,
  secondary: 0.55,
  pet: 0.3,
  villain: 0.45,
};

export const CAST_ROLE_LABEL: Record<CastRole, string> = {
  protag: "Protagonist",
  secondary: "Sidekick / Supporting",
  pet: "Pet / Mascot",
  villain: "Villain / Antagonist",
};

export const ANIME_TYPE_LABEL: Record<AnimeType, string> = { shonen: "SHONEN", shojo: "SHOJO" };
export const ANIME_TYPE_DESCRIPTION: Record<AnimeType, string> = {
  shonen: "Momentum, escalation, challenge and outward conflict.",
  shojo: "Relationships, identity, emotional stakes and interpersonal conflict.",
};

export type AffinityTier = 0 | 1 | 2;

/** Canonical mechanical tier. Discovery is deliberately not an input. */
export function affinityTier(member: CastMember, genres: readonly GenreId[]): AffinityTier {
  if (member.legacyPlaceholder) return 0;
  if (catalogHasSecret(member) && genres.includes(member.hiddenAff)) return 2;
  return member.visibleAff.some((genre) => genres.includes(genre)) ? 1 : 0;
}

export function publicAffinities(member: CastMember, discovered: readonly string[]) {
  return {
    visible: member.visibleAff,
    hidden: catalogHasSecret(member) && discovered.includes(member.id) ? member.hiddenAff : null,
  };
}

/** Only active catalogue entries are offered for new productions. */
export function castList(role: CastRole): CastMember[] {
  return CAST_V2.filter((member) => member.role === role && isCastingActive(member));
}

function legacyPlaceholder(id: string): CastMember {
  return {
    id,
    name: id === "none" ? "No mascot" : `Legacy cast (${id || "unknown"})`,
    archetype: "Archived cast record",
    personality: "Preserved so an older production or franchise remains readable.",
    img: "img/cast-placeholder.svg",
    role: id === "none" ? "pet" : "protag",
    type: "shonen",
    visibleAff: ["slice", "fantasy"],
    hiddenAff: "comedy",
    gender: "unspecified",
    species: "legacy record",
    ageBand: "unspecified",
    culturalBasis: "legacy archive",
    legacyPlaceholder: true,
  };
}

/** Unknown saved IDs never silently become Kai. Reserve IDs remain readable. */
export function castById(id: string): CastMember {
  return BY_ID.get(id) ?? legacyPlaceholder(id);
}

export const PROTAGONISTS = castList("protag");
export const SECONDARY = castList("secondary");
export const PETS = castList("pet");
export const VILLAINS = castList("villain");

export interface CastChem {
  id: string;
  name: string;
  members: string[];
  mult: number;
}

export const CAST_CHEMS: CastChem[] = [
  { id: "rivalry", name: "Rival Quartet", members: ["kai", "s_riku", "v_carnage"], mult: 1.15 },
  { id: "cat", name: "Cat & Witch", members: ["emi", "p_nya", "v_nightshade"], mult: 1.14 },
  { id: "spooky", name: "Spooky Squad", members: ["kage", "s_chiaki", "v_hollow"], mult: 1.14 },
  { id: "clue", name: "Clue Crew", members: ["shiro", "s_shin", "v_puppeteer"], mult: 1.13 },
  { id: "pirates", name: "Sky Pirates", members: ["kaito", "s_ryo", "v_scuttle"], mult: 1.12 },
  { id: "stage", name: "Stage Lights", members: ["airi", "s_yuna", "p_piko"], mult: 1.12 },
  { id: "aces", name: "Ace Pilots", members: ["rei", "s_ken", "v_volt"], mult: 1.12 },
  { id: "mash", name: "Monster Mash", members: ["yuki", "v_titanus", "p_kona"], mult: 1.11 },
  { id: "tag", name: "Tag Team", members: ["kenta", "s_eiji", "p_gon"], mult: 1.1 },
  { id: "willthey", name: "Will They, Won't They", members: ["hikari", "s_nozomi", "p_mochi"], mult: 1.1 },
  { id: "boardroom", name: "Hostile Takeover", members: ["kuro", "s_tobi", "v_kairos"], mult: 1.15 },
  { id: "skycrew", name: "Sky Crew", members: ["n_ryoko", "tsubasa", "p_fuwa"], mult: 1.14 },
  { id: "shrine", name: "Foxfire Rite", members: ["suzume", "s_amber", "p_nibi"], mult: 1.14 },
  { id: "quietwar", name: "The Quiet War", members: ["daichi", "s_kanna", "sen"], mult: 1.13 },
  { id: "inkwell", name: "Inkwell Nights", members: ["itsuki", "s_alfred", "v_harlequin"], mult: 1.12 },
  { id: "podium", name: "Podium Finish", members: ["leo", "s_maki", "p_ponta"], mult: 1.12 },
  { id: "greenwood", name: "Greenwood Pact", members: ["ash", "s_reina", "p_lumen"], mult: 1.11 },
  { id: "forge", name: "Forge & Spark", members: ["zuri", "s_peko", "p_cogsworth"], mult: 1.11 },
];

export const castChemFor = (draft: { protag: string; secondary: string; pet: string; villain: string }) =>
  CAST_CHEMS.filter((chem) =>
    chem.members.every((id) => id === draft.protag || id === draft.secondary || id === draft.pet || id === draft.villain)
  );
