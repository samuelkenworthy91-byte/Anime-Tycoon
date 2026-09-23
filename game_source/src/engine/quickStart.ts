import { SHOWRUNNERS, type Showrunner } from "./data";

const QUICK_STUDIO_PREFIX = [
  "Neon", "Moonrise", "Copper", "Blue Hour", "Paper",
  "Northstar", "Velvet", "Electric", "Lantern", "Silver",
] as const;

const QUICK_STUDIO_SUFFIX = [
  "Works", "Pictures", "House", "Animation", "Studio",
  "Frame", "Films", "Collective", "Motion", "Works",
] as const;

export function randomQuickStudioName(rng: () => number = Math.random): string {
  return `${QUICK_STUDIO_PREFIX[Math.floor(rng() * QUICK_STUDIO_PREFIX.length)]} ${QUICK_STUDIO_SUFFIX[Math.floor(rng() * QUICK_STUDIO_SUFFIX.length)]}`;
}

export function randomQuickShowrunnerId(rng: () => number = Math.random): Showrunner["id"] {
  return (SHOWRUNNERS[Math.floor(rng() * SHOWRUNNERS.length)] ?? SHOWRUNNERS[0]).id;
}
