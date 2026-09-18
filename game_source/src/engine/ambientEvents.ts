import type { Franchise } from "./franchise";

export interface AmbientEventContext {
  week: number;
  studio: string;
  cash: number;
  fans: number;
  franchises: Record<string, Franchise>;
  active: { id: string; title: string; hype: number; issues: number }[];
  staff: { id: string; name: string; stamina: number }[];
  merchTier: number;
  overseasTier: number;
}

export interface AmbientEventOutcome {
  id: string;
  text: string;
  cashDelta?: number;
  fansDelta?: number;
  franchise?: { key: string; popularity?: number; fatigue?: number };
  project?: { id: string; hype?: number; issues?: number };
}

const pick = <T,>(xs: readonly T[], rng: () => number): T => xs[Math.floor(rng() * xs.length)];
const money = (n: number) => "£" + Math.abs(n).toLocaleString("en-GB");

function hash32(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function ambientRng(studio: string, week: number): () => number {
  let x = hash32(`${studio}:${week}:ambient`) || 0x9e3779b9;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4_294_967_296;
  };
}

/** Ambient texture deliberately uses its own deterministic stream so adding
 * flavour events cannot perturb production, hiring or rival simulation RNG. */
export function ambientEventOccurs(studio: string, week: number): boolean {
  if (week < 12 || week % 4 !== 2) return false;
  return ambientRng(studio, week)() < 0.65;
}

export function rollAmbientEvent(ctx: AmbientEventContext, rng: () => number = ambientRng(ctx.studio, ctx.week)): AmbientEventOutcome | null {
  const franchises = Object.values(ctx.franchises).filter((fr) => !fr.soldTo);
  const hot = franchises.length ? [...franchises].sort((a, b) => b.popularity - a.popularity)[0] : null;
  const active = ctx.active.length ? pick(ctx.active, rng) : null;
  const staff = ctx.staff.length ? pick(ctx.staff, rng) : null;

  const makers: (() => AmbientEventOutcome | null)[] = [
    () => hot ? { id: "fan-edit", text: `📱 A fan edit of “${hot.baseTitle}” goes viral overnight. +3 popularity, +2 fatigue.`, franchise: { key: hot.key, popularity: 3, fatigue: 2 } } : null,
    () => hot ? { id: "opening-meme", text: `🎵 The opening from “${hot.baseTitle}” becomes the meme of the week. +4 popularity, +1 fatigue.`, franchise: { key: hot.key, popularity: 4, fatigue: 1 } } : null,
    () => hot ? { id: "retrospective", text: `📰 A major critic publishes a warm retrospective on “${hot.baseTitle}”. +3 popularity.`, franchise: { key: hot.key, popularity: 3 } } : null,
    () => hot ? { id: "bad-retrospective", text: `📰 A retrospective argues that “${hot.baseTitle}” has aged badly. −3 popularity.`, franchise: { key: hot.key, popularity: -3 } } : null,
    () => hot ? { id: "voice-interview", text: `🎙 A cast interview sends fans back to “${hot.baseTitle}”. +2 popularity, +1 fatigue.`, franchise: { key: hot.key, popularity: 2, fatigue: 1 } } : null,
    () => hot ? { id: "anniversary-fan-day", text: `🎂 Fans organise an unofficial “${hot.baseTitle}” anniversary day. +2,500 fans, +2 popularity.`, fansDelta: 2_500, franchise: { key: hot.key, popularity: 2 } } : null,
    () => hot ? { id: "piracy-spike", text: `🏴‍☠️ Piracy of “${hot.baseTitle}” spikes. The studio loses sales, but thousands discover the title. −${money(20_000)}, +1,500 fans.`, cashDelta: -20_000, fansDelta: 1_500 } : null,
    () => hot ? { id: "celebrity-shirt", text: `📸 A celebrity is photographed wearing “${hot.baseTitle}” merchandise. +5 popularity, +3 fatigue.`, franchise: { key: hot.key, popularity: 5, fatigue: 3 } } : null,
    () => hot ? { id: "school-club-craze", text: `🏫 “${hot.baseTitle}” unexpectedly catches on with school clubs. +4,000 fans, +2 popularity.`, fansDelta: 4_000, franchise: { key: hot.key, popularity: 2 } } : null,
    () => hot ? { id: "fandom-row", text: `💢 A shipping argument consumes the “${hot.baseTitle}” fandom for a week. −2 popularity, +3 fatigue.`, franchise: { key: hot.key, popularity: -2, fatigue: 3 } } : null,

    () => active ? { id: "great-cut", text: `✨ A sequence from “${active.title}” is passed around internally as the week's standout work. +3 hype.`, project: { id: active.id, hype: 3 } } : null,
    () => active ? { id: "render-failure", text: `🖥 A render/storage failure hits “${active.title}”. Emergency replacement parts cost ${money(18_000)} and add a rework note.`, cashDelta: -18_000, project: { id: active.id, issues: 1 } } : null,
    () => active ? { id: "trailer-reaction", text: `👀 Early trailer reactions to “${active.title}” are stronger than expected. +4 hype.`, project: { id: active.id, hype: 4 } } : null,
    () => active ? { id: "trailer-flat", text: `😶 The latest “${active.title}” promo lands flat. −3 hype.`, project: { id: active.id, hype: -3 } } : null,
    () => active ? { id: "supplier-refund", text: `📦 A supplier misses a delivery on “${active.title}” and refunds ${money(12_000)}. +${money(12_000)}.`, cashDelta: 12_000 } : null,
    () => active ? { id: "insurance", text: `🧾 A production insurance claim clears faster than expected. +${money(25_000)}.`, cashDelta: 25_000 } : null,

    () => staff ? { id: "staff-lecture", text: `🎓 ${staff.name} gives a guest lecture and the studio gains a little industry goodwill. +750 fans.`, fansDelta: 750 } : null,
    () => staff ? { id: "staff-interview", text: `🎤 ${staff.name} gives a thoughtful trade interview. +1,000 fans.`, fansDelta: 1_000 } : null,
    () => staff && staff.stamina < 35 ? { id: "staff-sick-day", text: `🤒 ${staff.name} takes an ordinary sick day. No decision required; the studio absorbs ${money(2_000)} in cover costs.`, cashDelta: -2_000 } : null,

    () => ctx.merchTier >= 1 && hot ? { id: "merch-reorder", text: `🛍 Retailers place an unexpected reorder for “${hot.baseTitle}” goods. +${money(45_000)}.`, cashDelta: 45_000 } : null,
    () => ctx.merchTier >= 1 && hot ? { id: "counterfeit-merch", text: `⚠ Counterfeit “${hot.baseTitle}” goods flood marketplaces. Enforcement and lost margin cost ${money(35_000)}.`, cashDelta: -35_000 } : null,
    () => ctx.merchTier >= 2 && hot ? { id: "figure-sellout", text: `🧸 A premium “${hot.baseTitle}” figure sells out instantly. +${money(110_000)}, +2 popularity, +2 fatigue.`, cashDelta: 110_000, franchise: { key: hot.key, popularity: 2, fatigue: 2 } } : null,
    () => ctx.merchTier >= 2 && hot ? { id: "factory-delay", text: `🏭 A premium-goods factory delay forces air freight. −${money(60_000)}.`, cashDelta: -60_000 } : null,
    () => ctx.merchTier >= 3 && hot ? { id: "tcg-chase-card", text: `🃏 A chase card from the “${hot.baseTitle}” TCG becomes a collector sensation. +${money(220_000)}, +4 popularity, +3 fatigue.`, cashDelta: 220_000, franchise: { key: hot.key, popularity: 4, fatigue: 3 } } : null,
    () => ctx.merchTier >= 3 && hot ? { id: "tcg-tournament", text: `🏆 An independently organised “${hot.baseTitle}” TCG tournament draws a huge crowd. +5,000 fans, +3 popularity, +2 fatigue.`, fansDelta: 5_000, franchise: { key: hot.key, popularity: 3, fatigue: 2 } } : null,
    () => ctx.merchTier >= 3 && hot ? { id: "tcg-overprint", text: `📉 The latest “${hot.baseTitle}” card print run was too large. Warehousing and discounts cost ${money(140_000)}.`, cashDelta: -140_000 } : null,

    () => ctx.overseasTier >= 1 ? { id: "currency-tailwind", text: `🌍 Exchange rates move in your favour this month. Overseas receipts and settlements add ${money(60_000)}.`, cashDelta: 60_000 } : null,
    () => ctx.overseasTier >= 1 ? { id: "currency-headwind", text: `🌍 Exchange rates move against the studio. Overseas settlements lose ${money(45_000)}.`, cashDelta: -45_000 } : null,
    () => ctx.overseasTier >= 2 && hot ? { id: "dub-breakout", text: `🌐 An overseas dub clip from “${hot.baseTitle}” breaks out online. +4,000 fans, +3 popularity, +2 fatigue.`, fansDelta: 4_000, franchise: { key: hot.key, popularity: 3, fatigue: 2 } } : null,
    () => ctx.overseasTier >= 2 ? { id: "regional-press", text: `🗞 Regional entertainment press runs a studio profile. +2,500 fans.`, fansDelta: 2_500 } : null,
    () => ctx.overseasTier >= 3 ? { id: "localisation-overrun", text: `🎧 A localisation partner reports unexpected retake costs. −${money(80_000)}.`, cashDelta: -80_000 } : null,
    () => ctx.overseasTier >= 4 ? { id: "global-platform-bonus", text: `🌎 A global distribution performance bonus clears. +${money(250_000)}.`, cashDelta: 250_000 } : null,

    () => ({ id: "tax-rebate", text: `💷 A routine production tax adjustment lands in the studio account. +${money(18_000)}.`, cashDelta: 18_000 }),
    () => ({ id: "building-repair", text: `🔧 A boring but unavoidable building repair costs ${money(15_000)}. No meeting required.`, cashDelta: -15_000 }),
    () => ({ id: "trade-press", text: "📰 The trade press mentions the studio in its weekly industry roundup. +600 fans.", fansDelta: 600 }),
    () => ({ id: "quiet-week", text: "☕ For once, the industry has a quiet week. Nothing catches fire." }),
  ];

  const pool = makers.map((make) => make()).filter((x): x is AmbientEventOutcome => !!x);
  return pool.length ? pick(pool, rng) : null;
}
