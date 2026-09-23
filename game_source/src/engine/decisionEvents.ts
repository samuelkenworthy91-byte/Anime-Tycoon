import { moraleDelta } from "./careers";
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
  | { type: "staffMorale"; staffIds: string[]; amount: number }
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
  /** recently used templates are suppressed so rare decisions stay varied */
  recentTemplates?: string[];
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

    () => make(week, "creative_consultant", "A CREATIVE CONSULTANT HAS AN OPENING", "NEXT PRODUCTION",
      `A famously difficult development consultant can spend one week shaping your NEXT greenlight. They are expensive, but their notes are unusually specific.`, [
        { id: "story", label: "BOOK STORY DEVELOPMENT", effect: "−£45,000 · next production starts +8 Story", effects: [
          { type: "cash", amount: -45_000 }, { type: "modifier", modifier: { kind: "releaseQuality", label: "Consultant story development", expiresWeek: week + 14, uses: 1, flat: 8, pointType: "story" } },
        ] },
        { id: "visual", label: "BOOK VISUAL DEVELOPMENT", effect: "−£45,000 · next production starts +8 Art", effects: [
          { type: "cash", amount: -45_000 }, { type: "modifier", modifier: { kind: "releaseQuality", label: "Consultant visual development", expiresWeek: week + 14, uses: 1, flat: 8, pointType: "art" } },
        ] },
        { id: "pass", label: "PASS", effect: "no cost", effects: [] },
      ]),

    () => make(week, "investor", "AN INVESTOR OFFERS A LIFELINE", "FINANCE",
      `A media investor offers immediate working capital. Their terms are legal, aggressive and very public.`, [
        { id: "take", label: "TAKE THE CAPITAL", effect: "+£300,000 · −20,000 fans · next release ×0.85 sales", effects: [
          { type: "cash", amount: 300_000 }, { type: "fans", amount: -20_000 }, { type: "modifier", modifier: { kind: "releaseSales", label: "Investor participation", expiresWeek: week + 16, uses: 1, mult: 0.85 } },
        ] },
        { id: "bridge", label: "NEGOTIATE A BRIDGE LOAN", effect: "+£120,000 · −£35,000 fee immediately", effects: [{ type: "cash", amount: 85_000 }] },
        { id: "refuse", label: "REFUSE OUTSIDE MONEY", effect: "+1,500 fans", effects: [{ type: "fans", amount: 1_500 }] },
      ]),

    () => active && ctx.crew.length ? (() => {
      const animator = ctx.crew.find((member) => member.role.toLowerCase().includes("anim")) ?? pick(ctx.crew);
      return make(week, "key_animator_injury", "A KEY CREW MEMBER IS OUT", "PRODUCTION",
        `${animator.name} has been signed off unexpectedly while “${active.title}” is in ${active.stage}. The work can move, but somebody has to absorb the gap.`, [
          { id: "cover", label: "BRING IN EMERGENCY COVER", effect: "−£38,000 · +1 production note", effects: [
            { type: "cash", amount: -38_000 }, { type: "projectIssues", projectId: active.id, amount: 1 },
          ] },
          { id: "protect", label: "PROTECT THEIR RECOVERY", effect: "+3 production notes · team morale +3", effects: [
            { type: "projectIssues", projectId: active.id, amount: 3 }, { type: "staffMorale", staffIds: [animator.id], amount: 3 },
          ] },
          { id: "push", label: "ASK THEM TO FINISH THE SCENE", effect: "+4 Art · morale −10", effects: [
            { type: "projectPoints", projectId: active.id, point: "art", amount: 4 }, { type: "staffMorale", staffIds: [animator.id], amount: -10 },
          ] },
        ]);
    })() : null,

    () => active ? make(week, "corrupted_files", "THE MASTER FILES ARE CORRUPTED", "PRODUCTION / CRISIS",
      `A storage fault hits “${active.title}”. The backups are usable, but not everything survived cleanly.`, [
        { id: "restore", label: "PAY FOR FORENSIC RECOVERY", effect: "−£48,000 · −3 production notes", effects: [
          { type: "cash", amount: -48_000 }, { type: "projectIssues", projectId: active.id, amount: -3 },
        ] },
        { id: "rebuild", label: "REBUILD THE LOST WORK", effect: "+4 production notes · +2 Art", effects: [
          { type: "projectIssues", projectId: active.id, amount: 4 }, { type: "projectPoints", projectId: active.id, point: "art", amount: 2 },
        ] },
        { id: "cut", label: "CUT THE DAMAGED MATERIAL", effect: "−4 hype · −2 Story", effects: [
          { type: "projectHype", projectId: active.id, amount: -4 }, { type: "projectPoints", projectId: active.id, point: "story", amount: -2 },
        ] },
      ]) : null,

    () => active ? make(week, "unexpected_scene", "ONE SCENE IS FAR BETTER THAN PLANNED", "PRODUCTION",
      `A small sequence in “${active.title}” has become the scene everyone in the studio is talking about. It was never meant to be a centrepiece.`, [
        { id: "expand", label: "REBUILD THE EPISODE AROUND IT", effect: "+7 Art · +5 Story · +4 production notes", effects: [
          { type: "projectPoints", projectId: active.id, point: "art", amount: 7 }, { type: "projectPoints", projectId: active.id, point: "story", amount: 5 }, { type: "projectIssues", projectId: active.id, amount: 4 },
        ] },
        { id: "trailer", label: "SAVE IT FOR THE TRAILER", effect: "+9 hype", effects: [{ type: "projectHype", projectId: active.id, amount: 9 }] },
        { id: "leave", label: "LEAVE THE HAPPY ACCIDENT ALONE", effect: "+3 Art", effects: [{ type: "projectPoints", projectId: active.id, point: "art", amount: 3 }] },
      ]) : null,

    () => active && ctx.crew.length >= 2 ? (() => {
      const first = pick(ctx.crew);
      const otherPool = ctx.crew.filter((member) => member.id !== first.id);
      const second = pick(otherPool);
      return make(week, "creator_disagreement", "THE CREATIVE LEADS HAVE STOPPED AGREEING", "STAFF / PRODUCTION",
        `${first.name} and ${second.name} want completely different versions of “${active.title}”. The disagreement is now slowing actual work.`, [
          { id: "choose", label: `BACK ${first.name.toUpperCase()}`, effect: "+4 Story · other morale −8", effects: [
            { type: "projectPoints", projectId: active.id, point: "story", amount: 4 }, { type: "staffMorale", staffIds: [second.id], amount: -8 },
          ] },
          { id: "merge", label: "FORCE A COMPROMISE", effect: "+2 Story · +2 production notes · morale −3 ×2", effects: [
            { type: "projectPoints", projectId: active.id, point: "story", amount: 2 }, { type: "projectIssues", projectId: active.id, amount: 2 }, { type: "staffMorale", staffIds: [first.id, second.id], amount: -3 },
          ] },
          { id: "screen", label: "TEST BOTH VERSIONS INTERNALLY", effect: "−£18,000 · +5 Story", effects: [
            { type: "cash", amount: -18_000 }, { type: "projectPoints", projectId: active.id, point: "story", amount: 5 },
          ] },
        ]);
    })() : null,

    () => active ? make(week, "voice_unavailable", "THE LEAD VOICE IS UNAVAILABLE", "PRODUCTION",
      `A lead performer cannot make the next recording block for “${active.title}”. The delivery calendar will not move itself.`, [
        { id: "wait", label: "WAIT FOR THEM", effect: "+3 production notes · −2 hype", effects: [
          { type: "projectIssues", projectId: active.id, amount: 3 }, { type: "projectHype", projectId: active.id, amount: -2 },
        ] },
        { id: "replace", label: "RECAST THE ROLE", effect: "−£28,000 · +2 Sound · −3 hype", effects: [
          { type: "cash", amount: -28_000 }, { type: "projectPoints", projectId: active.id, point: "sound", amount: 2 }, { type: "projectHype", projectId: active.id, amount: -3 },
        ] },
        { id: "remote", label: "RECORD REMOTELY", effect: "−£9,000 · +1 production note", effects: [
          { type: "cash", amount: -9_000 }, { type: "projectIssues", projectId: active.id, amount: 1 },
        ] },
      ]) : null,

    () => active ? make(week, "outsourced_disaster", "THE OUTSOURCE PACKAGE CAME BACK WRONG", "PRODUCTION / CRISIS",
      `An outside studio returns a block of work for “${active.title}” that does not match the approved designs. The deadline is close.`, [
        { id: "redo", label: "MAKE THEM REDO IT", effect: "+4 production notes · +2 Art", effects: [
          { type: "projectIssues", projectId: active.id, amount: 4 }, { type: "projectPoints", projectId: active.id, point: "art", amount: 2 },
        ] },
        { id: "internal", label: "PULL IT BACK IN-HOUSE", effect: "−£42,000 · +4 Art · +2 production notes", effects: [
          { type: "cash", amount: -42_000 }, { type: "projectPoints", projectId: active.id, point: "art", amount: 4 }, { type: "projectIssues", projectId: active.id, amount: 2 },
        ] },
        { id: "air", label: "USE WHAT THEY SENT", effect: "−5 Art · +3 hype", effects: [
          { type: "projectPoints", projectId: active.id, point: "art", amount: -5 }, { type: "projectHype", projectId: active.id, amount: 3 },
        ] },
      ]) : null,

    () => active ? make(week, "network_note", "THE NETWORK WANTS A SAFER CUT", "BUSINESS / PRODUCTION",
      `The broadcaster likes “${active.title}” but wants several sharp edges softened before transmission.`, [
        { id: "comply", label: "MAKE THE CHANGES", effect: "+£45,000 · −4 Story · +5 hype", effects: [
          { type: "cash", amount: 45_000 }, { type: "projectPoints", projectId: active.id, point: "story", amount: -4 }, { type: "projectHype", projectId: active.id, amount: 5 },
        ] },
        { id: "partial", label: "GIVE THEM ONE CHANGE", effect: "+£18,000 · −1 Story · +2 hype", effects: [
          { type: "cash", amount: 18_000 }, { type: "projectPoints", projectId: active.id, point: "story", amount: -1 }, { type: "projectHype", projectId: active.id, amount: 2 },
        ] },
        { id: "refuse", label: "DELIVER YOUR CUT", effect: "−4 hype · +2,500 fans", effects: [
          { type: "projectHype", projectId: active.id, amount: -4 }, { type: "fans", amount: 2_500 },
        ] },
      ]) : null,

    () => active ? make(week, "soundtrack_replacement", "THE MAIN THEME ISN'T WORKING", "PRODUCTION",
      `A late screening of “${active.title}” exposes a problem: the music is fighting the scene instead of carrying it.`, [
        { id: "replace", label: "COMMISSION A NEW THEME", effect: "−£32,000 · +7 Sound · +2 production notes", effects: [
          { type: "cash", amount: -32_000 }, { type: "projectPoints", projectId: active.id, point: "sound", amount: 7 }, { type: "projectIssues", projectId: active.id, amount: 2 },
        ] },
        { id: "recut", label: "RECUT AROUND THE EXISTING MUSIC", effect: "+3 Sound · +3 Story · +3 production notes", effects: [
          { type: "projectPoints", projectId: active.id, point: "sound", amount: 3 }, { type: "projectPoints", projectId: active.id, point: "story", amount: 3 }, { type: "projectIssues", projectId: active.id, amount: 3 },
        ] },
        { id: "ship", label: "SHIP THE CURRENT MIX", effect: "−4 Sound", effects: [{ type: "projectPoints", projectId: active.id, point: "sound", amount: -4 }] },
      ]) : null,

    () => active ? make(week, "schedule_domino", "ONE DELAY IS HITTING EVERYTHING", "PRODUCTION / SCHEDULE",
      `A missed hand-off on “${active.title}” is now threatening the next departments in the chain.`, [
        { id: "overtime", label: "AUTHORISE OVERTIME", effect: "−£24,000 · −2 production notes · team morale −4", effects: [
          { type: "cash", amount: -24_000 }, { type: "projectIssues", projectId: active.id, amount: -2 }, { type: "staffMorale", staffIds: ctx.crew.map((member) => member.id), amount: -4 },
        ] },
        { id: "triage", label: "TRIAGE THE IMPORTANT SHOTS", effect: "−2 Art · −1 production note", effects: [
          { type: "projectPoints", projectId: active.id, point: "art", amount: -2 }, { type: "projectIssues", projectId: active.id, amount: -1 },
        ] },
        { id: "absorb", label: "LET THE SCHEDULE SLIP", effect: "+4 production notes · team morale +2", effects: [
          { type: "projectIssues", projectId: active.id, amount: 4 }, { type: "staffMorale", staffIds: ctx.crew.map((member) => member.id), amount: 2 },
        ] },
      ]) : null,

    () => ctx.crew.length >= 2 ? (() => {
      const first = pick(ctx.crew);
      const second = pick(ctx.crew.filter((member) => member.id !== first.id));
      return make(week, "staff_friendship", "TWO STAFF HAVE BECOME A REAL TEAM", "STAFF",
        `${first.name} and ${second.name} have started solving problems together without being asked. Other people have noticed.`, [
          { id: "pair", label: "MAKE THEM AN OFFICIAL PAIR", effect: "morale +7 ×2 · +5 RD", effects: [
            { type: "staffMorale", staffIds: [first.id, second.id], amount: 7 }, { type: "rd", amount: 5 },
          ] },
          { id: "spread", label: "ASK THEM TO SHARE THEIR PROCESS", effect: "team morale +3", effects: [
            { type: "staffMorale", staffIds: ctx.crew.map((member) => member.id), amount: 3 },
          ] },
          { id: "leave", label: "LET IT DEVELOP NATURALLY", effect: "morale +4 ×2", effects: [
            { type: "staffMorale", staffIds: [first.id, second.id], amount: 4 },
          ] },
        ]);
    })() : null,

    () => ctx.crew.length ? (() => {
      const member = pick(ctx.crew);
      return make(week, "family_emergency", "A STAFF MEMBER NEEDS TO GO HOME", "STAFF",
        `${member.name} has a family emergency and asks to step away immediately. They do not know exactly when they will be fully focused again.`, [
          { id: "cover", label: "TELL THEM FAMILY COMES FIRST", effect: "morale +10 · active project +2 notes", effects: [
            { type: "staffMorale", staffIds: [member.id], amount: 10 }, ...(active ? [{ type: "projectIssues" as const, projectId: active.id, amount: 2 }] : []),
          ] },
          { id: "paid", label: "ARRANGE PAID COVER", effect: "−£20,000 · morale +6", effects: [
            { type: "cash", amount: -20_000 }, { type: "staffMorale", staffIds: [member.id], amount: 6 },
          ] },
          { id: "deadline", label: "ASK THEM TO FINISH THE DEADLINE FIRST", effect: "morale −12 · active project −1 note", effects: [
            { type: "staffMorale", staffIds: [member.id], amount: -12 }, ...(active ? [{ type: "projectIssues" as const, projectId: active.id, amount: -1 }] : []),
          ] },
        ]);
    })() : null,

    () => ctx.crew.length ? (() => {
      const member = pick(ctx.crew);
      return make(week, "outside_offer", "A RIVAL WANTS TO BORROW YOUR STAFF", "STAFF / BUSINESS",
        `${member.name} has been offered a prestigious outside job. They want to take it without leaving your studio.`, [
          { id: "allow", label: "LET THEM TAKE IT", effect: "+£25,000 · morale +8 · active project +2 notes", effects: [
            { type: "cash", amount: 25_000 }, { type: "staffMorale", staffIds: [member.id], amount: 8 }, ...(active ? [{ type: "projectIssues" as const, projectId: active.id, amount: 2 }] : []),
          ] },
          { id: "match", label: "KEEP THEIR FOCUS HERE", effect: "−£18,000 · morale +4", effects: [
            { type: "cash", amount: -18_000 }, { type: "staffMorale", staffIds: [member.id], amount: 4 },
          ] },
          { id: "refuse", label: "BLOCK THE OUTSIDE WORK", effect: "morale −9", effects: [{ type: "staffMorale", staffIds: [member.id], amount: -9 }] },
        ]);
    })() : null,

    () => ctx.crew.length ? (() => {
      const member = pick(ctx.crew);
      return make(week, "public_criticism", "A STAFF MEMBER CRITICISES THE STUDIO", "STAFF / PR",
        `${member.name} gives an interview and says management is making the studio less creative. The quote is spreading fast.`, [
          { id: "talk", label: "HANDLE IT PRIVATELY", effect: "morale +3 · −2,000 fans", effects: [
            { type: "staffMorale", staffIds: [member.id], amount: 3 }, { type: "fans", amount: -2_000 },
          ] },
          { id: "agree", label: "PUBLICLY AGREE AND CHANGE COURSE", effect: "+4,000 fans · team morale +3", effects: [
            { type: "fans", amount: 4_000 }, { type: "staffMorale", staffIds: ctx.crew.map((worker) => worker.id), amount: 3 },
          ] },
          { id: "discipline", label: "DISCIPLINE THEM", effect: "morale −14 · +1,500 fans", effects: [
            { type: "staffMorale", staffIds: [member.id], amount: -14 }, { type: "fans", amount: 1_500 },
          ] },
        ]);
    })() : null,

    () => ctx.crew.length >= 2 ? (() => {
      const veteran = [...ctx.crew].sort((a, b) => b.level - a.level)[0];
      const junior = [...ctx.crew].sort((a, b) => a.level - b.level).find((member) => member.id !== veteran.id)!;
      return make(week, "shadow_veteran", "A JUNIOR ASKS TO SHADOW A VETERAN", "STAFF / DEVELOPMENT",
        `${junior.name} wants to shadow ${veteran.name} closely for the next production cycle. It will slow the veteran down, but the learning could stick.`, [
          { id: "yes", label: "PAIR THEM UP", effect: "junior morale +9 · veteran morale −3 · +8 RD", effects: [
            { type: "staffMorale", staffIds: [junior.id], amount: 9 }, { type: "staffMorale", staffIds: [veteran.id], amount: -3 }, { type: "rd", amount: 8 },
          ] },
          { id: "light", label: "ONE DAY A WEEK", effect: "morale +4 ×2 · +3 RD", effects: [
            { type: "staffMorale", staffIds: [junior.id, veteran.id], amount: 4 }, { type: "rd", amount: 3 },
          ] },
          { id: "no", label: "KEEP THEM ON SEPARATE WORK", effect: "junior morale −5", effects: [{ type: "staffMorale", staffIds: [junior.id], amount: -5 }] },
        ]);
    })() : null,

    () => ctx.crew.length ? (() => {
      const member = pick(ctx.crew);
      return make(week, "credit_demand", "A CREATOR WANTS MORE CREDIT", "STAFF / OWNERSHIP",
        `${member.name} says their contribution is being undersold and wants a more prominent creator credit on the next release.`, [
          { id: "grant", label: "GIVE THEM THE CREDIT", effect: "morale +12 · next release fans ×1.05", effects: [
            { type: "staffMorale", staffIds: [member.id], amount: 12 }, { type: "modifier", modifier: { kind: "releaseFans", label: `${member.name} creator credit`, expiresWeek: week + 14, uses: 1, mult: 1.05 } },
          ] },
          { id: "bonus", label: "OFFER MONEY INSTEAD", effect: "−£22,000 · morale +5", effects: [
            { type: "cash", amount: -22_000 }, { type: "staffMorale", staffIds: [member.id], amount: 5 },
          ] },
          { id: "deny", label: "KEEP THE CURRENT CREDITS", effect: "morale −10", effects: [{ type: "staffMorale", staffIds: [member.id], amount: -10 }] },
        ]);
    })() : null,

    () => ctx.crew.length && active ? (() => {
      const member = pick(ctx.crew);
      const craft: PointType = member.role.toLowerCase().includes("anim") ? "art" : member.role.toLowerCase().includes("sound") || member.role.toLowerCase().includes("music") ? "sound" : "story";
      return make(week, "prodigy_moment", "SOMEBODY JUST LEVELLED UP IN FRONT OF YOU", "STAFF / PRODUCTION",
        `${member.name} solves a problem on “${active.title}” that the senior team had been stuck on all week.`, [
          { id: "lead", label: "GIVE THEM THE SCENE", effect: `+${8} ${craft.toUpperCase()} · morale +8 · +2 notes`, effects: [
            { type: "projectPoints", projectId: active.id, point: craft, amount: 8 }, { type: "staffMorale", staffIds: [member.id], amount: 8 }, { type: "projectIssues", projectId: active.id, amount: 2 },
          ] },
          { id: "share", label: "MAKE IT A TEAM LESSON", effect: "+5 RD · team morale +2", effects: [
            { type: "rd", amount: 5 }, { type: "staffMorale", staffIds: ctx.crew.map((worker) => worker.id), amount: 2 },
          ] },
          { id: "quiet", label: "BANK THE FIX AND MOVE ON", effect: `+3 ${craft.toUpperCase()}`, effects: [{ type: "projectPoints", projectId: active.id, point: craft, amount: 3 }] },
        ]);
    })() : null,

    () => make(week, "streamer_bidding_war", "TWO PLATFORMS WANT YOUR NEXT SHOW", "BUSINESS / DISTRIBUTION",
      `Competing streamers are trying to lock down your next release before either knows what the other has offered.`, [
        { id: "cash", label: "TAKE THE BIG UP-FRONT DEAL", effect: "+£150,000 · next release sales ×0.86", effects: [
          { type: "cash", amount: 150_000 }, { type: "modifier", modifier: { kind: "releaseSales", label: "Rich exclusivity deal", expiresWeek: week + 16, uses: 1, mult: 0.86 } },
        ] },
        { id: "reach", label: "TAKE THE GLOBAL REACH DEAL", effect: "+£45,000 · next release fans ×1.32", effects: [
          { type: "cash", amount: 45_000 }, { type: "modifier", modifier: { kind: "releaseFans", label: "Global platform push", expiresWeek: week + 16, uses: 1, mult: 1.32 } },
        ] },
        { id: "play", label: "KEEP BOTH TALKING", effect: "50/50: +£95,000 or both walk", effects: [
          { type: "cash", amount: Math.random() < 0.5 ? 95_000 : 0 },
        ] },
      ]),

    () => active ? make(week, "advertiser_backlash", "AN ADVERTISER WANTS DISTANCE", "BUSINESS / PR",
      `A major advertiser says the online argument around “${active.title}” is becoming bad for their brand.`, [
        { id: "edit", label: "MAKE A CLEANER CAMPAIGN", effect: "+£35,000 · −5 hype · −2,000 fans", effects: [
          { type: "cash", amount: 35_000 }, { type: "projectHype", projectId: active.id, amount: -5 }, { type: "fans", amount: -2_000 },
        ] },
        { id: "replace", label: "FIND A DIFFERENT SPONSOR", effect: "−£18,000 · +2 hype", effects: [
          { type: "cash", amount: -18_000 }, { type: "projectHype", projectId: active.id, amount: 2 },
        ] },
        { id: "walk", label: "DROP THE ADVERTISER", effect: "+3,500 fans · −£20,000", effects: [
          { type: "fans", amount: 3_500 }, { type: "cash", amount: -20_000 },
        ] },
      ]) : null,

    () => make(week, "distributor_collapse", "A DISTRIBUTOR HAS COLLAPSED", "BUSINESS / CRISIS",
      `A distributor used across the industry has stopped paying invoices. Everyone is scrambling for replacement capacity.`, [
        { id: "reserve", label: "BUY REPLACEMENT CAPACITY NOW", effect: "−£52,000 · next release sales ×1.10", effects: [
          { type: "cash", amount: -52_000 }, { type: "modifier", modifier: { kind: "releaseSales", label: "Secured replacement distribution", expiresWeek: week + 18, uses: 1, mult: 1.10 } },
        ] },
        { id: "wait", label: "WAIT FOR THE MARKET TO SETTLE", effect: "next release sales ×0.91", effects: [
          { type: "modifier", modifier: { kind: "releaseSales", label: "Distribution bottleneck", expiresWeek: week + 12, uses: 1, mult: 0.91 } },
        ] },
        { id: "direct", label: "GO DIRECT TO THE AUDIENCE", effect: "next release sales ×0.96 · fans ×1.12", effects: [
          { type: "modifier", modifier: { kind: "releaseSales", label: "Direct distribution", expiresWeek: week + 12, uses: 1, mult: 0.96 } },
          { type: "modifier", modifier: { kind: "releaseFans", label: "Direct audience push", expiresWeek: week + 12, uses: 1, mult: 1.12 } },
        ] },
      ]),

    () => active ? make(week, "piracy_spike", "PIRACY IS SPIKING BEFORE RELEASE", "FANDOM / BUSINESS",
      `Watermarked material from “${active.title}” is appearing on pirate sites faster than takedowns can keep up.`, [
        { id: "legal", label: "FUND A TAKEDOWN WAVE", effect: "−£30,000 · −2 hype · next release sales ×1.06", effects: [
          { type: "cash", amount: -30_000 }, { type: "projectHype", projectId: active.id, amount: -2 }, { type: "modifier", modifier: { kind: "releaseSales", label: "Anti-piracy enforcement", expiresWeek: week + 10, uses: 1, mult: 1.06 } },
        ] },
        { id: "convert", label: "RELEASE AN OFFICIAL FREE PREVIEW", effect: "+8 hype · next release fans ×1.10", effects: [
          { type: "projectHype", projectId: active.id, amount: 8 }, { type: "modifier", modifier: { kind: "releaseFans", label: "Official preview conversion", expiresWeek: week + 10, uses: 1, mult: 1.10 } },
        ] },
        { id: "ignore", label: "FOCUS ON THE PAYING AUDIENCE", effect: "next release sales ×0.94", effects: [
          { type: "modifier", modifier: { kind: "releaseSales", label: "Piracy leakage", expiresWeek: week + 10, uses: 1, mult: 0.94 } },
        ] },
      ]) : null,

    () => active ? make(week, "international_censorship", "AN OVERSEAS MARKET WANTS CUTS", "BUSINESS / INTERNATIONAL",
      `A major overseas buyer will carry “${active.title}”, but only if you alter material they consider unacceptable.`, [
        { id: "cut", label: "MAKE A LOCAL EDIT", effect: "−£22,000 · +£70,000 · −2 Story", effects: [
          { type: "cash", amount: 48_000 }, { type: "projectPoints", projectId: active.id, point: "story", amount: -2 },
        ] },
        { id: "refuse", label: "KEEP THE ORIGINAL CUT", effect: "+2,500 fans", effects: [{ type: "fans", amount: 2_500 }] },
        { id: "delay", label: "NEGOTIATE A DIFFERENT EDIT", effect: "+2 production notes · +£30,000", effects: [
          { type: "projectIssues", projectId: active.id, amount: 2 }, { type: "cash", amount: 30_000 },
        ] },
      ]) : null,

    () => active ? make(week, "shipping_war", "THE FANDOM IS FIGHTING OVER A PAIRING", "FANDOM",
      `A relationship in “${active.title}” has split the fandom into camps. Every official post is becoming a battlefield.`, [
        { id: "tease", label: "TEASE BOTH SIDES", effect: "+10 hype · +3 production notes", effects: [
          { type: "projectHype", projectId: active.id, amount: 10 }, { type: "projectIssues", projectId: active.id, amount: 3 },
        ] },
        { id: "canon", label: "MAKE THE INTENTION CLEAR", effect: "+5 Story · −4 hype", effects: [
          { type: "projectPoints", projectId: active.id, point: "story", amount: 5 }, { type: "projectHype", projectId: active.id, amount: -4 },
        ] },
        { id: "ignore", label: "STOP FEEDING IT", effect: "−2 hype · +1,500 fans", effects: [
          { type: "projectHype", projectId: active.id, amount: -2 }, { type: "fans", amount: 1_500 },
        ] },
      ]) : null,

    () => fr ? make(week, "cult_following", "AN OLD SHOW HAS FOUND A NEW AUDIENCE", "FANDOM / FRANCHISE",
      `Clips from “${fr.title}” are suddenly everywhere again. New viewers are treating it like a discovery nobody else knows about.`, [
        { id: "feed", label: "FEED THE CULT FOLLOWING", effect: "−£15,000 · popularity +10 · +4,000 fans", effects: [
          { type: "cash", amount: -15_000 }, { type: "franchisePopularity", franchiseKey: fr.key, amount: 10 }, { type: "fans", amount: 4_000 },
        ] },
        { id: "merch", label: "DROP A LIMITED MERCH RUN", effect: "next merch launch ×1.30 · popularity +4", effects: [
          { type: "modifier", modifier: { kind: "merch", label: `${fr.title} cult revival`, expiresWeek: week + 12, uses: 1, mult: 1.30 } }, { type: "franchisePopularity", franchiseKey: fr.key, amount: 4 },
        ] },
        { id: "leave", label: "LET THE FANS OWN IT", effect: "+2,500 fans", effects: [{ type: "fans", amount: 2_500 }] },
      ]) : null,

    () => active ? make(week, "review_bombing", "THE SHOW IS BEING REVIEW-BOMBED", "FANDOM / PR",
      `Thousands of new ratings for “${active.title}” appeared in a few hours, many from accounts that have never watched it.`, [
        { id: "platform", label: "PRESS THE PLATFORM TO ACT", effect: "−£12,000 · +2 hype", effects: [
          { type: "cash", amount: -12_000 }, { type: "projectHype", projectId: active.id, amount: 2 },
        ] },
        { id: "fans", label: "ASK FANS NOT TO RETALIATE", effect: "+3,500 fans · −2 hype", effects: [
          { type: "fans", amount: 3_500 }, { type: "projectHype", projectId: active.id, amount: -2 },
        ] },
        { id: "fight", label: "TURN IT INTO A PUBLIC FIGHT", effect: "+8 hype · −5,000 fans", effects: [
          { type: "projectHype", projectId: active.id, amount: 8 }, { type: "fans", amount: -5_000 },
        ] },
      ]) : null,

    () => make(week, "genre_bubble", "ONE GENRE IS SUDDENLY EVERYWHERE", "INDUSTRY",
      `${g1} shows are selling faster than broadcasters can commission them. Nobody agrees whether this is the start of a cycle or the top of one.`, [
        { id: "chase", label: "CHASE THE BOOM", effect: `${g1} market heat +0.7 · next matching opportunity stronger`, effects: [{ type: "marketGenre", genre: hot1, amount: 0.7 }] },
        { id: "counter", label: "PROGRAM AGAINST THE TREND", effect: `${g1} heat −0.4 · +5 RD`, effects: [{ type: "marketGenre", genre: hot1, amount: -0.4 }, { type: "rd", amount: 5 }] },
        { id: "watch", label: "WAIT FOR MORE DATA", effect: "no immediate numerical change", effects: [] },
      ]),

    () => make(week, "genre_fatigue", "AUDIENCES ARE GETTING TIRED OF A TREND", "INDUSTRY",
      `The latest tracking says ${g1} viewers are becoming much harder to impress. Buyers have not stopped ordering it yet.`, [
        { id: "exit", label: "GET OUT BEFORE EVERYONE ELSE", effect: `${g1} heat −0.8 · +4 RD`, effects: [{ type: "marketGenre", genre: hot1, amount: -0.8 }, { type: "rd", amount: 4 }] },
        { id: "quality", label: "BET ON QUALITY BEATING FATIGUE", effect: "next production +5 Story", effects: [
          { type: "modifier", modifier: { kind: "releaseQuality", label: "Quality-over-trend development", expiresWeek: week + 12, uses: 1, flat: 5, pointType: "story" } },
        ] },
        { id: "double", label: "DOUBLE DOWN WHILE BUYERS STILL PAY", effect: `${g1} heat +0.3 · next release sales ×0.95`, effects: [
          { type: "marketGenre", genre: hot1, amount: 0.3 }, { type: "modifier", modifier: { kind: "releaseSales", label: "Late-cycle genre bet", expiresWeek: week + 12, uses: 1, mult: 0.95 } },
        ] },
      ]),

    () => make(week, "famous_creator_available", "A FAMOUS CREATOR IS BETWEEN PROJECTS", "INDUSTRY / TALENT",
      `A respected creator has unexpectedly become available for a short development engagement. Several studios are already calling.`, [
        { id: "book", label: "BOOK THE DEVELOPMENT WEEK", effect: "−£75,000 · next production +7 Story · +4 Art", effects: [
          { type: "cash", amount: -75_000 },
          { type: "modifier", modifier: { kind: "releaseQuality", label: "Guest creator story pass", expiresWeek: week + 14, uses: 1, flat: 7, pointType: "story" } },
          { type: "modifier", modifier: { kind: "releaseQuality", label: "Guest creator visual pass", expiresWeek: week + 14, uses: 1, flat: 4, pointType: "art" } },
        ] },
        { id: "talk", label: "PAY FOR A HALF-DAY REVIEW", effect: "−£18,000 · +7 RD", effects: [{ type: "cash", amount: -18_000 }, { type: "rd", amount: 7 }] },
        { id: "pass", label: "LET A RIVAL HAVE THEM", effect: "no immediate numerical change", effects: [] },
      ]),

    () => make(week, "studio_closure", "A RIVAL STUDIO HAS CLOSED", "INDUSTRY",
      `A respected mid-sized studio has shut its doors. Talent, equipment and unfinished business are suddenly loose in the market.`, [
        { id: "talent", label: "MOVE FIRST ON THE TALENT", effect: "−£35,000 · team morale +3 · +8 RD", effects: [
          { type: "cash", amount: -35_000 }, { type: "staffMorale", staffIds: ctx.crew.map((member) => member.id), amount: 3 }, { type: "rd", amount: 8 },
        ] },
        { id: "assets", label: "BUY THEIR PIPELINE ASSETS", effect: "−£55,000 · next R&D 25% faster", effects: [
          { type: "cash", amount: -55_000 }, { type: "modifier", modifier: { kind: "researchSpeed", label: "Acquired studio pipeline", expiresWeek: week + 18, uses: 1, mult: 0.75 } },
        ] },
        { id: "wait", label: "DO NOTHING", effect: "+2,000 fans", effects: [{ type: "fans", amount: 2_000 }] },
      ]),

    () => make(week, "broadcaster_strategy", "A BROADCASTER IS CHANGING STRATEGY", "INDUSTRY / BUSINESS",
      `One of the biggest buyers is cutting broad slates and wants fewer, louder shows with clearer audiences.`, [
        { id: "pitch", label: "RESHAPE YOUR NEXT PITCH", effect: "−£12,000 · next release sales ×1.12", effects: [
          { type: "cash", amount: -12_000 }, { type: "modifier", modifier: { kind: "releaseSales", label: "Broadcaster-aligned pitch", expiresWeek: week + 14, uses: 1, mult: 1.12 } },
        ] },
        { id: "audience", label: "LEAN INTO A CLEAR AUDIENCE", effect: "next release fans ×1.14", effects: [
          { type: "modifier", modifier: { kind: "releaseFans", label: "Clear audience positioning", expiresWeek: week + 14, uses: 1, mult: 1.14 } },
        ] },
        { id: "ignore", label: "KEEP YOUR OWN SLATE", effect: "+3 RD", effects: [{ type: "rd", amount: 3 }] },
      ]),

    () => make(week, "archive_discovery", "THE ARCHIVE TEAM FOUND SOMETHING USEFUL", "R&D / TECHNOLOGY",
      `Old production materials reveal a discarded workflow that solves a problem the modern pipeline has been fighting for years.`, [
        { id: "restore", label: "RESTORE THE WORKFLOW", effect: "−£16,000 · +10 RD · next R&D 15% faster", effects: [
          { type: "cash", amount: -16_000 }, { type: "rd", amount: 10 }, { type: "modifier", modifier: { kind: "researchSpeed", label: "Recovered archive workflow", expiresWeek: week + 16, uses: 1, mult: 0.85 } },
        ] },
        { id: "study", label: "DOCUMENT IT FIRST", effect: "+14 RD", effects: [{ type: "rd", amount: 14 }] },
        { id: "leave", label: "LEAVE THE OLD SYSTEM BURIED", effect: "no immediate numerical change", effects: [] },
      ]),

    () => make(week, "failed_experiment", "THE EXPERIMENT DID NOT WORK", "R&D / TECHNOLOGY",
      `A prototype pipeline test has produced unusable output. The team can salvage the learning, hide the failure, or spend more to fix it properly.`, [
        { id: "learn", label: "PUBLISH THE FAILURE INTERNALLY", effect: "+10 RD · team morale +2", effects: [
          { type: "rd", amount: 10 }, { type: "staffMorale", staffIds: ctx.crew.map((member) => member.id), amount: 2 },
        ] },
        { id: "fix", label: "FUND ANOTHER ITERATION", effect: "−£40,000 · +18 RD", effects: [{ type: "cash", amount: -40_000 }, { type: "rd", amount: 18 }] },
        { id: "bury", label: "BURY IT", effect: "team morale −4", effects: [{ type: "staffMorale", staffIds: ctx.crew.map((member) => member.id), amount: -4 }] },
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

  const recent = new Set((ctx.recentTemplates ?? []).slice(-8));
  const all = makers.map((f) => f()).filter((x): x is AdvancedDecisionEvent => !!x);
  const fresh = all.filter((event) => !recent.has(event.payload.template));
  const pool = fresh.length ? fresh : all;
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
    case "staffMorale": {
      const ids = new Set(effect.staffIds);
      return { ...run, staff: run.staff.map((member) => ids.has(member.id) ? moraleDelta(member, effect.amount) : member) };
    }
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
