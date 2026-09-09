import { GENRES, MEDIUMS, type AudienceId, type Draft, type GenreId, type MediumId, type PointType } from "./data";
import type { RunState } from "./state";

export type DecisionModifierKind =
  | "releaseSales"
  | "releaseFans"
  | "releaseQuality"
  | "merch"
  | "researchSpeed"
  | "marketBrief";

export interface DecisionModifier {
  id: string;
  kind: DecisionModifierKind;
  label: string;
  createdWeek: number;
  expiresWeek: number;
  uses: number;
  mult?: number;
  flat?: number;
  pointType?: PointType;
  genres?: GenreId[];
  audience?: AudienceId;
  medium?: MediumId;
}

export type DecisionEffect =
  | { type: "cash"; amount: number }
  | { type: "fans"; amount: number }
  | { type: "rd"; amount: number }
  | { type: "projectHype"; projectId: string; amount: number }
  | { type: "projectIssues"; projectId: string; amount: number }
  | { type: "projectPoints"; projectId: string; point: PointType; amount: number }
  | { type: "franchisePopularity"; franchiseKey: string; amount: number }
  | { type: "franchiseFatigue"; franchiseKey: string; amount: number }
  | { type: "marketGenre"; genre: GenreId; amount: number }
  | { type: "activeResearch"; fraction: number }
  | { type: "awardBoost"; sourceId: string; metric: "story" | "art" | "sound" | "audience" | "score"; mult: number }
  | { type: "modifier"; modifier: Omit<DecisionModifier, "id" | "createdWeek"> };

export interface AdvancedEventChoice {
  id: string;
  label: string;
  effect: string;
}

export interface AdvancedDecisionEvent {
  id: string;
  kind: "decision";
  week: number;
  expiresWeek: number;
  headline: string;
  category: string;
  text: string;
  choices: AdvancedEventChoice[];
  payload: {
    template: string;
    effects: Record<string, DecisionEffect[]>;
  };
}

export interface AdvancedDecisionContext {
  crew: { id: string; name: string; role: string; level: number; morale: number }[];
  active: { id: string; title: string; stage: string; hype: number; issues: number }[];
  topFranchise: { key: string; title: string; popularity: number } | null;
  market?: {
    genres: Partial<Record<GenreId, number>>;
    audiences: Partial<Record<AudienceId, number>>;
    mediums: Partial<Record<MediumId, number>>;
  };
  genresUnlocked?: GenreId[];
  mediumsUnlocked?: MediumId[];
  researchJobs?: { id: string; name: string }[];
  yearShows?: { sourceId?: string | null; title: string; story: number; art: number; sound: number; audience: number; score: number }[];
  research?: string[];
}

let seq = 0;
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const fmt = (n: number) => `${n < 0 ? "−" : "+"}£${Math.abs(n).toLocaleString("en-GB")}`;

const make = (
  week: number,
  template: string,
  headline: string,
  category: string,
  text: string,
  choices: { id: string; label: string; effect: string; effects: DecisionEffect[] }[],
): AdvancedDecisionEvent => ({
  id: `dec_${template}_${week}_${++seq}`,
  kind: "decision",
  week,
  expiresWeek: week + 3,
  headline,
  category,
  text,
  choices: choices.map(({ effects: _effects, ...c }) => c),
  payload: { template, effects: Object.fromEntries(choices.map((c) => [c.id, c.effects])) },
});

function hottest<T extends string>(record: Partial<Record<T, number>> | undefined, allowed: T[], fallback: T): T {
  if (!record || !allowed.length) return allowed[0] ?? fallback;
  return [...allowed].sort((a, b) => (record[b] ?? 0) - (record[a] ?? 0))[0] ?? fallback;
}

/**
 * High-stakes decision deck. Existing production dilemmas remain in events.ts;
 * this layer adds commercial, research, awards, merch and studio-level bets.
 * Choices are intentionally asymmetric: some mistakes can be catastrophic,
 * while the right call at the right time can transform a year.
 */
export function rollAdvancedDecision(week: number, ctx: AdvancedDecisionContext): AdvancedDecisionEvent | null {
  const active = ctx.active.length ? pick(ctx.active) : null;
  const fr = ctx.topFranchise;
  const unlockedGenres = ctx.genresUnlocked?.length ? ctx.genresUnlocked : GENRES.slice(0, 2).map((g) => g.id);
  const unlockedMediums = ctx.mediumsUnlocked?.length ? ctx.mediumsUnlocked : ["fanweb" as MediumId];
  const hot1 = hottest(ctx.market?.genres, unlockedGenres, unlockedGenres[0]);
  const hot2Pool = unlockedGenres.filter((g) => g !== hot1);
  const hot2 = hottest(ctx.market?.genres, hot2Pool.length ? hot2Pool : unlockedGenres, hot1);
  const auds: AudienceId[] = ["kids", "teens", "adults", "family"];
  const hotAudience = hottest(ctx.market?.audiences, auds, "teens");
  const hotMedium = hottest(ctx.market?.mediums, unlockedMediums, unlockedMediums[0]);
  const g1 = GENRES.find((g) => g.id === hot1)?.label ?? hot1;
  const g2 = GENRES.find((g) => g.id === hot2)?.label ?? hot2;
  const mediumLabel = MEDIUMS[hotMedium]?.label ?? hotMedium;
  const eligibleAward = (ctx.yearShows ?? []).filter((x) => !!x.sourceId);

  const makers: (() => AdvancedDecisionEvent | null)[] = [
    () => make(week, "market_gap", "THE MARKET JUST OPENED", "MARKET INTELLIGENCE",
      `A forecasting firm says buyers are urgently short of ${g1} × ${g2} for ${hotAudience} viewers on ${mediumLabel}. They will sell you the full window before the rest of the industry sees it.`, [
        { id: "full", label: "BUY THE FULL REPORT", effect: "−£35,000 · exact brief · matching release ×1.28 sales", effects: [
          { type: "cash", amount: -35_000 },
          { type: "modifier", modifier: { kind: "marketBrief", label: `${g1} × ${g2} · ${hotAudience} · ${mediumLabel}`, expiresWeek: week + 14, uses: 1, mult: 1.28, genres: [hot1, hot2], audience: hotAudience, medium: hotMedium } },
        ] },
        { id: "summary", label: "BUY THE CHEAP SUMMARY", effect: "−£8,000 · matching release ×1.12 sales", effects: [
          { type: "cash", amount: -8_000 },
          { type: "modifier", modifier: { kind: "marketBrief", label: `${g1} × ${g2} · ${hotAudience} · ${mediumLabel}`, expiresWeek: week + 10, uses: 1, mult: 1.12, genres: [hot1, hot2], audience: hotAudience, medium: hotMedium } },
        ] },
        { id: "ignore", label: "IGNORE THE CONSULTANTS", effect: "free · no advantage", effects: [] },
      ]),

    () => make(week, "streamer_feature", "A PLATFORM WANTS A FLAGSHIP", "DISTRIBUTION",
      `A global platform has a homepage gap. They want your next release, but the placement comes with an expensive co-marketing commitment.`, [
        { id: "buy", label: "TAKE THE HOMEPAGE", effect: "−£70,000 · next release ×1.22 sales · ×1.18 fans", effects: [
          { type: "cash", amount: -70_000 },
          { type: "modifier", modifier: { kind: "releaseSales", label: "Homepage placement", expiresWeek: week + 12, uses: 1, mult: 1.22 } },
          { type: "modifier", modifier: { kind: "releaseFans", label: "Homepage discovery", expiresWeek: week + 12, uses: 1, mult: 1.18 } },
        ] },
        { id: "revshare", label: "LET THEM FUND IT", effect: "+£45,000 now · next release ×0.82 sales · ×1.30 fans", effects: [
          { type: "cash", amount: 45_000 },
          { type: "modifier", modifier: { kind: "releaseSales", label: "Platform revenue share", expiresWeek: week + 12, uses: 1, mult: 0.82 } },
          { type: "modifier", modifier: { kind: "releaseFans", label: "Platform discovery push", expiresWeek: week + 12, uses: 1, mult: 1.30 } },
        ] },
        { id: "pass", label: "KEEP OUR INDEPENDENCE", effect: "no cost · no bonus", effects: [] },
      ]),

    () => fr ? make(week, "brand_buyout", "A BRAND WANTS YOUR IP", "FRANCHISE",
      `A consumer brand wants a six-month tie-in with “${fr.title}”. The cheque is enormous, but fans will know exactly what happened.`, [
        { id: "sell", label: "TAKE THE MONEY", effect: "+£240,000 · −12,000 fans · franchise popularity −18", effects: [
          { type: "cash", amount: 240_000 }, { type: "fans", amount: -12_000 }, { type: "franchisePopularity", franchiseKey: fr.key, amount: -18 },
        ] },
        { id: "premium", label: "DEMAND A TASTEFUL CAMPAIGN", effect: "+£90,000 · franchise popularity +4", effects: [
          { type: "cash", amount: 90_000 }, { type: "franchisePopularity", franchiseKey: fr.key, amount: 4 },
        ] },
        { id: "refuse", label: "REFUSE THEM PUBLICLY", effect: "+4,000 fans · no cash", effects: [{ type: "fans", amount: 4_000 }] },
      ]) : null,

    () => fr ? make(week, "merch_factory", "THE FACTORY HAS ONE EMPTY LINE", "MERCHANDISE",
      `A manufacturer can reserve a priority line for “${fr.title}”. If demand lands, margins are huge. If it doesn't, you still pay for the machines.`, [
        { id: "large", label: "BOOK THE WHOLE LINE", effect: "−£80,000 · next merch launch ×1.55", effects: [
          { type: "cash", amount: -80_000 }, { type: "modifier", modifier: { kind: "merch", label: "Priority factory run", expiresWeek: week + 18, uses: 1, mult: 1.55 } },
        ] },
        { id: "small", label: "BOOK A SMALL RUN", effect: "−£25,000 · next merch launch ×1.22", effects: [
          { type: "cash", amount: -25_000 }, { type: "modifier", modifier: { kind: "merch", label: "Reserved factory run", expiresWeek: week + 18, uses: 1, mult: 1.22 } },
        ] },
        { id: "license", label: "LICENSE IT OUT", effect: "+£35,000 · −2,500 fans", effects: [{ type: "cash", amount: 35_000 }, { type: "fans", amount: -2_500 }] },
      ]) : null,

    () => fr ? make(week, "merch_recall", "MERCH RECALL", "CRISIS",
      `A batch of ${fr.title} goods has a manufacturing defect. Social media has pictures already.`, [
        { id: "recall", label: "FULL RECALL & REFUND", effect: "−£110,000 · +2,500 fans · popularity +5", effects: [
          { type: "cash", amount: -110_000 }, { type: "fans", amount: 2_500 }, { type: "franchisePopularity", franchiseKey: fr.key, amount: 5 },
        ] },
        { id: "replace", label: "QUIET REPLACEMENT PROGRAMME", effect: "−£45,000 · popularity −3", effects: [
          { type: "cash", amount: -45_000 }, { type: "franchisePopularity", franchiseKey: fr.key, amount: -3 },
        ] },
        { id: "deny", label: "DENY RESPONSIBILITY", effect: "+£0 · −18,000 fans · popularity −22", effects: [
          { type: "fans", amount: -18_000 }, { type: "franchisePopularity", franchiseKey: fr.key, amount: -22 },
        ] },
      ]) : null,

    () => make(week, "research_grant", "A LAB WANTS YOUR STUDIO", "RESEARCH",
      `A university lab offers access to a prototype production tool. Their paperwork is painful; the technology is real.`, [
        { id: "partner", label: "CO-FUND THE STUDY", effect: "−£30,000 · next R&D project 40% faster · +12 RD", effects: [
          { type: "cash", amount: -30_000 }, { type: "rd", amount: 12 }, { type: "modifier", modifier: { kind: "researchSpeed", label: "University research partnership", expiresWeek: week + 20, uses: 1, mult: 0.60 } },
        ] },
        { id: "trial", label: "TAKE A SHORT TRIAL", effect: "−£8,000 · next R&D project 20% faster", effects: [
          { type: "cash", amount: -8_000 }, { type: "modifier", modifier: { kind: "researchSpeed", label: "Prototype tool trial", expiresWeek: week + 12, uses: 1, mult: 0.80 } },
        ] },
        { id: "sell", label: "SELL THEM OUR DATA", effect: "+£25,000 · −3,000 fans", effects: [{ type: "cash", amount: 25_000 }, { type: "fans", amount: -3_000 }] },
      ]),

    () => (ctx.researchJobs?.length ?? 0) > 0 ? make(week, "research_breakthrough", "THE R&D TEAM FOUND A SHORTCUT", "RESEARCH",
      `An active research project can be accelerated hard, but doing it safely costs outside consultancy money.`, [
        { id: "consult", label: "HIRE THE SPECIALISTS", effect: "−£45,000 · active R&D remaining time −45%", effects: [{ type: "cash", amount: -45_000 }, { type: "activeResearch", fraction: 0.45 }] },
        { id: "crunch", label: "CRUNCH THE RESEARCH TEAM", effect: "active R&D remaining time −25% · −4,000 fans", effects: [{ type: "activeResearch", fraction: 0.25 }, { type: "fans", amount: -4_000 }] },
        { id: "normal", label: "KEEP THE PLAN", effect: "no change", effects: [] },
      ]) : null,

    () => active ? make(week, "star_animator", "A LEGEND HAS THREE FREE DAYS", "PRODUCTION",
      `A celebrated freelancer can drop into “${active.title}” right now. Their fee is obscene and another studio is on hold.`, [
        { id: "art", label: "BOOK THEM FOR SAKUGA", effect: "−£65,000 · +9 Art · +3 hype", effects: [
          { type: "cash", amount: -65_000 }, { type: "projectPoints", projectId: active.id, point: "art", amount: 9 }, { type: "projectHype", projectId: active.id, amount: 3 },
        ] },
        { id: "mentor", label: "ONE-DAY CONSULT", effect: "−£18,000 · +4 Art", effects: [{ type: "cash", amount: -18_000 }, { type: "projectPoints", projectId: active.id, point: "art", amount: 4 }] },
        { id: "pass", label: "WE CAN DO IT OURSELVES", effect: "free", effects: [] },
      ]) : null,

    () => active ? make(week, "script_doctor", "THE ENDING ISN'T LANDING", "PRODUCTION",
      `A trusted script doctor says “${active.title}” has one structural problem. Fixing it now means reopening work everybody thought was locked.`, [
        { id: "rewrite", label: "REWRITE THE ACT", effect: "−£35,000 · +8 Story · +3 issues", effects: [
          { type: "cash", amount: -35_000 }, { type: "projectPoints", projectId: active.id, point: "story", amount: 8 }, { type: "projectIssues", projectId: active.id, amount: 3 },
        ] },
        { id: "notes", label: "TAKE THE NOTES ONLY", effect: "−£10,000 · +4 Story · +1 issue", effects: [
          { type: "cash", amount: -10_000 }, { type: "projectPoints", projectId: active.id, point: "story", amount: 4 }, { type: "projectIssues", projectId: active.id, amount: 1 },
        ] },
        { id: "trust", label: "TRUST OUR CUT", effect: "no change", effects: [] },
      ]) : null,

    () => active ? make(week, "sponsor_ultimatum", "THE SPONSOR WANTS CHANGES", "BUSINESS",
      `A sponsor offers a major late injection into “${active.title}”, but wants a safer, more commercial cut.`, [
        { id: "take", label: "TAKE THE CHEQUE", effect: "+£130,000 · +12 hype · +7 issues · −7,000 fans", effects: [
          { type: "cash", amount: 130_000 }, { type: "projectHype", projectId: active.id, amount: 12 }, { type: "projectIssues", projectId: active.id, amount: 7 }, { type: "fans", amount: -7_000 },
        ] },
        { id: "limited", label: "ALLOW PRODUCT PLACEMENT", effect: "+£55,000 · +4 hype · +2 issues", effects: [
          { type: "cash", amount: 55_000 }, { type: "projectHype", projectId: active.id, amount: 4 }, { type: "projectIssues", projectId: active.id, amount: 2 },
        ] },
        { id: "walk", label: "WALK AWAY", effect: "+2,500 fans · no cash", effects: [{ type: "fans", amount: 2_500 }] },
      ]) : null,

    () => active ? make(week, "data_leak", "PRODUCTION DATA LEAK", "CRISIS",
      `Internal files from “${active.title}” are circulating online, including unfinished material and private production notes.`, [
        { id: "security", label: "LOCK EVERYTHING DOWN", effect: "−£75,000 · hype −3 · issues −2", effects: [
          { type: "cash", amount: -75_000 }, { type: "projectHype", projectId: active.id, amount: -3 }, { type: "projectIssues", projectId: active.id, amount: -2 },
        ] },
        { id: "own", label: "TURN IT INTO A MAKING-OF", effect: "+10 hype · +5 issues", effects: [{ type: "projectHype", projectId: active.id, amount: 10 }, { type: "projectIssues", projectId: active.id, amount: 5 }] },
        { id: "blame", label: "BLAME A CONTRACTOR", effect: "−12,000 fans · no cash cost", effects: [{ type: "fans", amount: -12_000 }] },
      ]) : null,

    () => eligibleAward.length ? (() => {
      const show = [...eligibleAward].sort((a, b) => b.score - a.score)[0];
      const bestMetric = (["story", "art", "sound"] as const).sort((a, b) => show[b] - show[a])[0];
      const label = bestMetric === "story" ? "WRITING" : bestMetric === "art" ? "ANIMATION" : "ORIGINAL SCORE";
      return make(week, "awards_campaign", "AWARDS SEASON CALLS", "AWARDS",
        `Publicists think “${show.title}” has a real shot at ${label}. Campaigning cannot make bad work good, but it can decide a close ballot.`, [
          { id: "full", label: "FULL FYC CAMPAIGN", effect: "−£70,000 · strongest craft metric +8% for this year's judging", effects: [
            { type: "cash", amount: -70_000 }, { type: "awardBoost", sourceId: show.sourceId!, metric: bestMetric, mult: 1.08 },
          ] },
          { id: "festival", label: "FESTIVAL SCREENINGS", effect: "−£25,000 · strongest craft metric +4% · +1,500 fans", effects: [
            { type: "cash", amount: -25_000 }, { type: "awardBoost", sourceId: show.sourceId!, metric: bestMetric, mult: 1.04 }, { type: "fans", amount: 1_500 },
          ] },
          { id: "work", label: "LET THE WORK SPEAK", effect: "free · no campaigning bonus", effects: [] },
        ]);
    })() : null,

    () => eligibleAward.length ? (() => {
      const show = pick(eligibleAward);
      return make(week, "festival_scandal", "A FESTIVAL JURY IS ANGRY", "AWARDS / PR",
        `A programmer claims “${show.title}” breached an exclusivity understanding. It may be nothing; they are threatening to go public tonight.`, [
          { id: "settle", label: "SETTLE QUIETLY", effect: "−£60,000 · problem disappears", effects: [{ type: "cash", amount: -60_000 }] },
          { id: "fight", label: "FIGHT THEM PUBLICLY", effect: "+2,000 fans · awards audience metric −12%", effects: [{ type: "fans", amount: 2_000 }, { type: "awardBoost", sourceId: show.sourceId!, metric: "audience", mult: 0.88 }] },
          { id: "apologise", label: "PUBLIC APOLOGY", effect: "−5,000 fans · awards score metric +2%", effects: [{ type: "fans", amount: -5_000 }, { type: "awardBoost", sourceId: show.sourceId!, metric: "score", mult: 1.02 }] },
        ]);
    })() : null,

    () => make(week, "fan_campaign", "THE FANDOM ORGANISES ITSELF", "COMMUNITY",
      `A volunteer campaign wants official assets and your blessing. The upside is enormous reach; the risk is handing your brand to strangers.`, [
        { id: "support", label: "FUND THE COMMUNITY", effect: "−£20,000 · +8,000 fans · next release ×1.12 fans", effects: [
          { type: "cash", amount: -20_000 }, { type: "fans", amount: 8_000 }, { type: "modifier", modifier: { kind: "releaseFans", label: "Community campaign", expiresWeek: week + 14, uses: 1, mult: 1.12 } },
        ] },
        { id: "official", label: "TAKE IT IN-HOUSE", effect: "−£55,000 · +5,000 fans · next release ×1.20 fans", effects: [
          { type: "cash", amount: -55_000 }, { type: "fans", amount: 5_000 }, { type: "modifier", modifier: { kind: "releaseFans", label: "Official fandom campaign", expiresWeek: week + 14, uses: 1, mult: 1.20 } },
        ] },
        { id: "cease", label: "SEND A CEASE & DESIST", effect: "−15,000 fans", effects: [{ type: "fans", amount: -15_000 }] },
      ]),

    () => make(week, "celebrity", "A CELEBRITY JUST POSTED ABOUT YOU", "PUBLICITY",
      `A huge celebrity account says your studio is their current obsession. Their agent offers to turn the moment into a formal campaign.`, [
        { id: "deal", label: "SIGN THE CAMPAIGN", effect: "−£85,000 · +18,000 fans · next release ×1.18 sales", effects: [
          { type: "cash", amount: -85_000 }, { type: "fans", amount: 18_000 }, { type: "modifier", modifier: { kind: "releaseSales", label: "Celebrity campaign", expiresWeek: week + 10, uses: 1, mult: 1.18 } },
        ] },
        { id: "organic", label: "LET THE POST BREATHE", effect: "+7,000 fans · free", effects: [{ type: "fans", amount: 7_000 }] },
        { id: "joke", label: "QUOTE-POST A TERRIBLE JOKE", effect: "50/50 energy: +12,000 or −8,000 fans", effects: [{ type: "fans", amount: Math.random() < 0.5 ? 12_000 : -8_000 }] },
      ]),

    () => make(week, "investor", "AN INVESTOR OFFERS A LIFELINE", "FINANCE",
      `A media investor offers immediate working capital. Their terms are legal, aggressive and very public.`, [
        { id: "take", label: "TAKE THE CAPITAL", effect: "+£300,000 · −20,000 fans · next release ×0.85 sales", effects: [
          { type: "cash", amount: 300_000 }, { type: "fans", amount: -20_000 }, { type: "modifier", modifier: { kind: "releaseSales", label: "Investor participation", expiresWeek: week + 16, uses: 1, mult: 0.85 } },
        ] },
        { id: "bridge", label: "NEGOTIATE A BRIDGE LOAN", effect: "+£120,000 · −£35,000 fee immediately", effects: [{ type: "cash", amount: 85_000 }] },
        { id: "refuse", label: "REFUSE OUTSIDE MONEY", effect: "+1,500 fans", effects: [{ type: "fans", amount: 1_500 }] },
      ]),

    () => active ? make(week, "quality_bet", "ONE MORE PASS?", "QUALITY CONTROL",
      `The team believes “${active.title}” can still improve before marketing locks the campaign, but reopening the work could create fresh problems.`, [
        { id: "all", label: "AUTHORISE A FULL POLISH PASS", effect: "−£45,000 · +4 Story · +4 Art · +4 Sound · +4 issues", effects: [
          { type: "cash", amount: -45_000 },
          { type: "projectPoints", projectId: active.id, point: "story", amount: 4 }, { type: "projectPoints", projectId: active.id, point: "art", amount: 4 }, { type: "projectPoints", projectId: active.id, point: "sound", amount: 4 }, { type: "projectIssues", projectId: active.id, amount: 4 },
        ] },
        { id: "target", label: "POLISH THE WEAKEST DEPARTMENT", effect: "−£15,000 · +6 to one craft", effects: [
          { type: "cash", amount: -15_000 }, { type: "projectPoints", projectId: active.id, point: pick(["story", "art", "sound"] as PointType[]), amount: 6 },
        ] },
        { id: "lock", label: "LOCK THE MASTER", effect: "no risk · no improvement", effects: [] },
      ]) : null,
  ];

  const pool = makers.map((f) => f()).filter((x): x is AdvancedDecisionEvent => !!x);
  if (!pool.length) return null;
  return pick(pool);
}

export function modifierMatchesDraft(m: DecisionModifier, d: Draft, week: number): boolean {
  if (m.expiresWeek < week || m.uses <= 0) return false;
  if (m.medium && m.medium !== d.medium) return false;
  if (m.audience && m.audience !== d.audience) return false;
  if (m.genres?.length) {
    const have = new Set(d.genres);
    if (!m.genres.every((g) => have.has(g))) return false;
  }
  return true;
}

export function decisionReleaseSalesMult(run: Pick<RunState, "decisionModifiers" | "week">, d: Draft): number {
  return (run.decisionModifiers ?? [])
    .filter((m) => (m.kind === "releaseSales" || m.kind === "marketBrief") && modifierMatchesDraft(m, d, run.week))
    .reduce((a, m) => a * (m.mult ?? 1), 1);
}

export function decisionReleaseFansMult(run: Pick<RunState, "decisionModifiers" | "week">, d: Draft): number {
  return (run.decisionModifiers ?? [])
    .filter((m) => m.kind === "releaseFans" && modifierMatchesDraft(m, d, run.week))
    .reduce((a, m) => a * (m.mult ?? 1), 1);
}

export function decisionReleaseQualityBonus(run: Pick<RunState, "decisionModifiers" | "week">, d: Draft): { point: PointType; amount: number }[] {
  return (run.decisionModifiers ?? [])
    .filter((m) => m.kind === "releaseQuality" && modifierMatchesDraft(m, d, run.week))
    .map((m) => ({ point: m.pointType ?? "story", amount: m.flat ?? 0 }));
}

export function decisionResearchSpeedMult(run: Pick<RunState, "decisionModifiers" | "week">): number {
  return (run.decisionModifiers ?? [])
    .filter((m) => m.kind === "researchSpeed" && m.expiresWeek >= run.week && m.uses > 0)
    .reduce((a, m) => a * (m.mult ?? 1), 1);
}

export function decisionMerchMult(run: Pick<RunState, "decisionModifiers" | "week">): number {
  return (run.decisionModifiers ?? [])
    .filter((m) => m.kind === "merch" && m.expiresWeek >= run.week && m.uses > 0)
    .reduce((a, m) => a * (m.mult ?? 1), 1);
}

export function consumeDecisionModifiers(
  mods: DecisionModifier[],
  predicate: (m: DecisionModifier) => boolean,
): DecisionModifier[] {
  return mods.flatMap((m) => {
    if (!predicate(m)) return [m];
    const uses = m.uses - 1;
    return uses > 0 ? [{ ...m, uses }] : [];
  });
}

function applyEffect(run: RunState, effect: DecisionEffect, eventId: string, week: number): RunState {
  switch (effect.type) {
    case "cash": return { ...run, cash: run.cash + effect.amount };
    case "fans": return { ...run, fans: Math.max(0, run.fans + effect.amount) };
    case "rd": return { ...run, rd: Math.max(0, run.rd + effect.amount) };
    case "projectHype": return { ...run, projects: run.projects.map((p) => p.id === effect.projectId ? { ...p, hype: clamp(p.hype + effect.amount, 0, 100) } : p) };
    case "projectIssues": return { ...run, projects: run.projects.map((p) => p.id === effect.projectId ? { ...p, issues: Math.max(0, p.issues + effect.amount) } : p) };
    case "projectPoints": return { ...run, projects: run.projects.map((p) => p.id === effect.projectId ? { ...p, points: { ...p.points, [effect.point]: p.points[effect.point] + effect.amount } } : p) };
    case "franchisePopularity": {
      const fr = run.franchises[effect.franchiseKey];
      if (!fr) return run;
      return { ...run, franchises: { ...run.franchises, [effect.franchiseKey]: { ...fr, popularity: clamp(fr.popularity + effect.amount, 0, 100) } } };
    }
    case "franchiseFatigue": {
      const fr = run.franchises[effect.franchiseKey];
      if (!fr) return run;
      return { ...run, franchises: { ...run.franchises, [effect.franchiseKey]: { ...fr, fatigue: clamp(fr.fatigue + effect.amount, 0, 100) } } };
    }
    case "marketGenre": return { ...run, market: { ...run.market, genres: { ...run.market.genres, [effect.genre]: clamp((run.market.genres[effect.genre] ?? 0) + effect.amount, -2, 2) } } };
    case "activeResearch": {
      const nowDay = run.day ?? run.week * 7;
      return {
        ...run,
        researchJobs: run.researchJobs.map((j) => {
          const dueDay = j.completesDay ?? j.completesWeek * 7;
          const remain = Math.max(1, dueDay - nowDay);
          const newRemain = Math.max(1, Math.ceil(remain * (1 - effect.fraction)));
          return { ...j, completesDay: nowDay + newRemain, completesWeek: run.week + Math.max(1, Math.ceil(newRemain / 7)) };
        }),
      };
    }
    case "awardBoost": return {
      ...run,
      yearShows: run.yearShows.map((s) => s.sourceId === effect.sourceId ? { ...s, [effect.metric]: Math.round((s[effect.metric] as number) * effect.mult * 10) / 10 } : s),
    };
    case "modifier": {
      const m: DecisionModifier = {
        ...effect.modifier,
        id: `${eventId}_${effect.modifier.kind}_${Math.floor(Math.random() * 1e6)}`,
        createdWeek: week,
      };
      return { ...run, decisionModifiers: [...(run.decisionModifiers ?? []), m] };
    }
  }
}

export function resolveAdvancedDecision(run: RunState, event: AdvancedDecisionEvent, choiceId: string): RunState | null {
  const effects = event.payload?.effects?.[choiceId];
  if (!effects) return null;
  let out = run;
  for (const effect of effects) out = applyEffect(out, effect, event.id, event.week);
  const choice = event.choices.find((c) => c.id === choiceId);
  const decisionModifiers = (out.decisionModifiers ?? []).filter((m) => m.expiresWeek >= out.week && m.uses > 0);
  return {
    ...out,
    decisionModifiers,
    studioEvents: (out.studioEvents ?? []).filter((e) => e.id !== event.id),
    studioEventHistory: [...(out.studioEventHistory ?? []).slice(-9), event.payload.template],
    notices: [...out.notices, `Decision: ${event.headline} — ${choice?.label ?? choiceId}. ${choice?.effect ?? ""}`],
  };
}
