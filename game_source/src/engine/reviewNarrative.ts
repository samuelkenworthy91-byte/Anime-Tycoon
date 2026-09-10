export interface ReviewNarrativeContext {
  /** release title is used only as a deterministic variation seed */
  title?: string;
  outlet: string;
  focus: string;
  score: number;
  total: number;
  quality: number;
  careerWeek: number;
  showsMade: number;
  baseQuote: string;
}

export const careerYearForWeek = (week: number) => Math.max(1, Math.floor(Math.max(0, week) / 48) + 1);

function hash32(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function pick(lines: readonly string[], seed: string, salt = ""): string {
  if (!lines.length) return "";
  return lines[hash32(`${seed}|${salt}`) % lines.length];
}

const EXACT_SCORE: Record<number, readonly string[]> = {
  1: [
    "A one out of ten is not a provocation here; it is mercy.",
    "This barely functions as a finished release.",
    "There are rough cuts with more internal logic than this.",
    "One point, awarded mostly for reaching the end credits.",
    "The production has failed at the level of basic coherence.",
    "A catastrophic release with almost nothing to recommend.",
  ],
  2: [
    "Two out of ten: fragments of an idea, stranded inside a broken production.",
    "There are isolated moments here, but no convincing whole.",
    "A couple of competent decisions cannot rescue the surrounding collapse.",
    "This occasionally resembles the show it was trying to become.",
    "The ambition is visible only because the execution misses it so badly.",
    "Two points for flashes of craft in a release that otherwise disintegrates.",
  ],
  3: [
    "Three out of ten: not empty, but nowhere near ready.",
    "Enough works to make the failures more frustrating.",
    "The production keeps threatening to become watchable, then retreats.",
    "A few sound instincts survive a deeply compromised final cut.",
    "There is a salvageable show buried under too many wrong decisions.",
    "Three points feels appropriate for something this visibly unfinished.",
  ],
  4: [
    "Four out of ten: the floor of professional acceptability, and only just.",
    "There are pieces worth keeping, but this release is mostly a warning.",
    "Functional in places, frustrating almost everywhere else.",
    "It gets over the line, but leaves too much work scattered behind it.",
    "The production survives the review rather than earning it.",
    "Four points for a release whose weaknesses dominate every strength.",
    "This is the kind of four that sends a studio straight back to the whiteboard.",
    "Nothing is irreparable, but almost everything needs repair.",
  ],
  5: [
    "Five out of ten: exactly half convincing, which may be the problem.",
    "There is a workable show here, interrupted constantly by its own mistakes.",
    "Competence and misjudgement trade scenes all the way to the credits.",
    "A true middle score: neither disaster nor recommendation.",
    "The good material never builds enough momentum to dominate the weak material.",
    "Five points feels less like balance and more like indecision.",
    "Watchable, sometimes interesting, rarely assured.",
    "This clears the minimum bar without giving us much reason to celebrate it.",
  ],
  6: [
    "Six out of ten: more works than fails, but the margin is not comfortable.",
    "A decent release that keeps showing us the better version it could have been.",
    "There is enough craft here to recommend with qualifications.",
    "Solid stretches are repeatedly softened by avoidable compromises.",
    "A respectable six, with several obvious routes to seven.",
    "The fundamentals are present; the authority is not quite there yet.",
    "Good enough to finish happily, not good enough to stop taking notes.",
    "This is credible work, even when it is not especially memorable.",
  ],
  7: [
    "Seven out of ten: confidently good, with weaknesses that stay manageable.",
    "A strong release whose best decisions outweigh its untidy ones.",
    "The studio knows what it is doing here, even if not every choice lands.",
    "A comfortable recommendation and a meaningful step above merely solid.",
    "Seven points for a show with identity, control and room left to grow.",
    "The rough edges are real; so is the quality around them.",
    "A genuinely good production that earns more praise than caveats.",
    "This feels like the work of people beginning to trust their own process.",
  ],
  8: [
    "Eight out of ten: excellent work, and close enough to greatness to make the misses sting.",
    "A release this strong can carry a studio's reputation for a long time.",
    "Confident, polished and consistently rewarding.",
    "Eight points for a production with very little dead weight.",
    "The craft is mature enough that individual flaws feel like exceptions.",
    "This is the sort of release rivals have to plan around.",
    "Excellent across long stretches, with genuine standout moments.",
    "The studio has delivered something people will recommend without needing excuses.",
  ],
  9: [
    "Nine out of ten: elite work separated from perfection by details, not fundamentals.",
    "This is a major release by any sensible standard.",
    "A production with the confidence to make difficult choices look inevitable.",
    "Nine points because perfection still has to mean something.",
    "The studio is operating at a level most competitors only reach occasionally.",
    "Exceptional craft, exceptional control, almost no wasted motion.",
    "This will be the comparison point for whatever the studio makes next.",
    "A near-masterpiece that makes its ambition look entirely justified.",
  ],
  10: [
    "Ten out of ten. No hedging, no qualification, no useful complaint.",
    "A perfect score should feel unreasonable. This one does not.",
    "Nothing meaningful is gained by pretending we found a flaw.",
    "Ten points: the rare production where execution catches the full ambition.",
    "This is the release other studios will spend years dissecting.",
    "The medium occasionally produces something that resets the scale. Here it is.",
    "Perfect scores invite arguments. The work answers them before they start.",
    "An extraordinary release with no weak department to hide behind.",
  ],
};

const OUTLET_SCORE: Record<string, Record<number, readonly string[]>> = {
  "Animage Monthly": {
    1: ["The script is structurally broken from premise to payoff.", "Character motivation disappears whenever the plot needs help."],
    2: ["A handful of good lines cannot disguise a story without a spine.", "The screenplay keeps setting up ideas it has no plan to resolve."],
    3: ["There are characters worth saving inside a draft that needed several more passes.", "The story has themes, but not yet a structure capable of carrying them."],
    4: ["The script communicates its premise, then spends too long fighting it.", "Readable storytelling is not the same thing as persuasive storytelling."],
    5: ["Half the character work lands; half feels drafted on the train to the studio.", "The dramatic architecture is serviceable and painfully visible."],
    6: ["The writing has a dependable spine, even when some episodes sag around it.", "Good character beats keep rescuing merely functional plotting."],
    7: ["The writers understand both setup and payoff, with only a few shortcuts between them.", "The emotional logic is strong enough to survive some conventional plotting."],
    8: ["A sharply structured script with characters allowed to complicate the premise.", "The writing room has turned genre machinery into something personal."],
    9: ["The script has intent, structure and nerve in almost every scene.", "Setup, character and payoff interlock with remarkable confidence."],
    10: ["A once-in-a-generation script with nothing ornamental and nothing missing.", "Every major dramatic choice earns the one that follows it."],
  },
  "Otaku Pulse": {
    1: ["The timeline stopped arguing about this and simply left.", "Even hate-watching this feels like unpaid labour."],
    2: ["There will be memes. They will not be helping the show.", "The fandom found two good clips and is treating them like emergency rations."],
    3: ["The reaction posts are doing considerably better numbers than the episodes.", "There is a tiny defence squad forming, and they have an exhausting week ahead."],
    4: ["The discourse is alive; enthusiasm is on life support.", "A four is where ironic appreciation starts doing suspicious amounts of work."],
    5: ["Half the fandom is coping, half is posting essays, nobody is relaxed.", "Perfectly engineered for three weeks of arguments and one very good reaction GIF."],
    6: ["A decent watch-party show with enough highlights to keep clips circulating.", "People will recommend this, but probably with a paragraph of caveats."],
    7: ["The fandom has characters to love, scenes to clip and just enough to argue about.", "This is going to have a healthy season online."],
    8: ["The fan art queue is already becoming a public-health concern.", "This has ships, edits, theories and repeat-watch energy in equal measure."],
    9: ["The timeline is on fire for all the right reasons.", "Cancel the discourse schedule: everyone is simply having a great time."],
    10: ["ABSOLUTE CINEMA. The caps lock is staying on.", "The fandom has collectively decided sleep is optional until further notice."],
  },
  "The London Reel": {
    1: ["The production committee should commission an inquiry, not a continuation.", "A release this poor damages confidence beyond the immediate balance sheet."],
    2: ["There are too many systemic failures here to blame any single department.", "This is an expensive demonstration of what happens when nobody says no."],
    3: ["The industry will notice the mistakes before it notices the ambition.", "There is a professional production buried here, but it did not make transmission."],
    4: ["Barely serviceable work from a studio that now has difficult questions to answer.", "This fills a slot; it does not justify the confidence behind the greenlight."],
    5: ["Competent enough to air, ordinary enough to disappear.", "A middling result that neither strengthens nor destroys the studio case."],
    6: ["A credible professional release with identifiable strengths and manageable weaknesses.", "The committee can call this respectable, though not transformative."],
    7: ["A strong commercial-quality production from a studio with increasingly reliable instincts.", "This is the sort of seven that gets future meetings booked."],
    8: ["An excellent release and a serious piece of industry positioning.", "The studio has delivered both craft and a persuasive case for its next budget."],
    9: ["A major production from a studio now setting rather than following the standard.", "This is where reputation becomes leverage."],
    10: ["A landmark release. Competitors will pretend not to be studying it immediately.", "The business has a new benchmark, whether it wanted one or not."],
  },
  StudioScope: {
    1: ["The pipeline has failed visibly in almost every department.", "This final master looks several production stages away from final."],
    2: ["A few clean cuts survive an otherwise compromised technical package.", "The drawings, mix and compositing rarely agree on the same level of finish."],
    3: ["There are competent sequences trapped between severe consistency failures.", "The technical highs only make the production lows harder to ignore."],
    4: ["Basic delivery is intact, polish is not.", "The show is technically watchable and visibly under-resolved."],
    5: ["The pipeline alternates clean work and obvious compromise almost scene by scene.", "Average craft, average consistency, frustratingly predictable weaknesses."],
    6: ["The production is technically sound, with several departments flirting with something better.", "A solid pipeline result held back by uneven finishing."],
    7: ["Strong animation and sound choices give the production a confident technical floor.", "The craft departments are coordinated enough that flaws rarely compound."],
    8: ["Excellent production discipline: clean staging, confident cuts and a mix that knows when to step forward.", "The pipeline is operating at a level that makes difficult sequences look routine."],
    9: ["Direction, animation, compositing and sound are pulling in remarkable harmony.", "Nearly immaculate craft with no obvious weak link in the chain."],
    10: ["Frame-level scrutiny only makes the achievement more impressive.", "The technical execution is effectively flawless."],
  },
};

type CareerBand = "awful" | "weak" | "middling" | "strong" | "elite";
const careerBand = (score: number): CareerBand =>
  score <= 4 ? "awful" : score <= 5 ? "weak" : score <= 6 ? "middling" : score <= 8 ? "strong" : "elite";

function careerLines(year: number, showsMade: number, score: number): string[] {
  const band = careerBand(score);
  const debut = showsMade === 0;
  if (debut) {
    const byBand: Record<CareerBand, string[]> = {
      awful: [
        "For a debut, this is a brutal first lesson.",
        "The first production exposes just how much studio craft still has to be learned.",
        "A debut this rough turns survival to production two into the immediate target.",
        "First release, first scar: almost every rookie weakness made it to air.",
        "Beginners are allowed mistakes; this debut simply contains too many at once.",
      ],
      weak: [
        "A recognisable debut: promising instincts and rookie errors in roughly equal supply.",
        "The first-production nerves are obvious, although there is something here to build on.",
        "As an opening statement it is uneven, inexperienced and occasionally interesting.",
        "The debut clears the line, but only just enough to make production two interesting.",
        "A first show full of lessons the studio now has no excuse not to learn.",
      ],
      middling: [
        "A respectable debut with more competence than identity so far.",
        "For a first production, the fundamentals are encouragingly intact.",
        "The studio arrives looking capable, if not yet distinctive.",
        "A debut that suggests the team understands the job even while learning its own voice.",
        "This is a credible first step rather than a miraculous one, which may be healthier.",
      ],
      strong: [
        "A strong debut. The rough edges are there, but so is unusually clear promise.",
        "For a first production, there is an alarming amount here worth following.",
        "A confident opening statement from a studio that should not yet look this settled.",
        "Debuts rarely arrive with this much control already visible.",
        "Production one has given the studio a reputation before it has even built a history.",
      ],
      elite: [
        "A debut this assured is absurd. Keep the studio name handy.",
        "First production and already operating with veteran confidence.",
        "For a debut, this is frighteningly complete.",
        "This is the kind of first release that changes expectations immediately.",
        "The industry just acquired a new studio to worry about on its very first attempt.",
      ],
    };
    return byBand[band];
  }

  const stage = year === 1 ? "rookie" : year === 2 ? "second" : year === 3 ? "third" : year <= 5 ? "building" : year <= 8 ? "established" : "veteran";
  const tables: Record<string, Record<CareerBand, string[]>> = {
    rookie: {
      awful: ["Still in Year 1, but the debut excuse gets thinner with every release.", "The studio is young; this is exactly the kind of mistake it must stop repeating."],
      weak: ["Year 1 remains a learning year, and this release certainly contains lessons.", "There is time to improve, but the rookie runway is already being used."],
      middling: ["A steady Year 1 release: competence is arriving before consistency.", "The studio is beginning to look functional rather than merely hopeful."],
      strong: ["Still Year 1, and the studio is learning unusually quickly.", "This early, a release this strong suggests the ceiling may be much higher."],
      elite: ["Year 1 excellence changes the timetable for every expectation that follows.", "This is veteran-level work arriving before the studio has veteran-level experience."],
    },
    second: {
      awful: ["Year 2 should be where rookie errors start disappearing. They have not.", "A second-year studio can no longer hide every mistake behind inexperience.", "There has been a full year to learn; too little of it is visible here.", "Year 2 is early, not consequence-free, and this release makes that distinction painfully clear."],
      weak: ["Year 2 and the studio is improving too slowly for comfort.", "The second year should bring a higher floor than this.", "There is progress since the rookie stage, but not enough authority in the work yet.", "At Year 2, five-out-of-ten work starts feeling like a habit that needs breaking."],
      middling: ["Year 2 brings a dependable six: useful progress, not a breakthrough.", "The studio's second year is beginning to replace improvisation with process.", "A credible Year 2 release, although the jump to genuinely strong work remains ahead.", "This is the kind of second-year competence that keeps the runway open."],
      strong: ["Year 2 and the studio is already building a recognisable standard.", "The sophomore year is producing work with far more control than the debut stage.", "This is exactly the kind of Year 2 step that turns promise into credibility.", "Only the second year, and rivals have to start treating the studio seriously."],
      elite: ["Only Year 2, and the studio is already producing work with veteran confidence.", "An elite breakthrough in the second year changes the studio's trajectory overnight.", "Year 2 should not look this accomplished; that is the compliment.", "A score this high this early puts every future release under brighter lights."],
    },
    third: {
      awful: ["Three years in, this is a poor show. The beginner's excuse has expired.", "Year 3, and avoidable weaknesses are still making it to air.", "A studio in its third year should be producing with far more control than this.", "By Year 3, this level of failure is organisational rather than merely inexperienced."],
      weak: ["Year 3 is too late for five-out-of-ten to feel like useful growing pain.", "Three years of production should have built a stronger floor than this.", "The studio has experience now; this release makes poor use of it.", "A third-year studio has enough history for mediocrity to count as regression."],
      middling: ["Year 3 competence is welcome, but the studio should now be hunting for a clearer identity.", "Three years in, a six keeps the lights on without changing the conversation.", "A stable Year 3 release; the next challenge is turning reliability into distinction.", "This is acceptable third-year work, and that is both praise and warning."],
      strong: ["Year 3 is where the studio starts looking fully professional, and this release does.", "Three years in, the craft is beginning to feel repeatable rather than accidental.", "A strong third-year release suggests the studio has found a process it can trust.", "This is the sort of Year 3 work that earns larger rooms and harder expectations."],
      elite: ["Year 3 and the studio looks fully formed. This is elite work.", "Three years of learning have crystallised into something exceptional.", "At Year 3, this is no longer an early-career fluke; it is a standard.", "The third year has produced the release that confirms the studio belongs near the top table."],
    },
    building: {
      awful: [`Year ${year}: an experienced studio delivering work this weak is difficult to excuse.`, `After ${year} years, this feels less like a mistake and more like a warning sign.`, `A Year ${year} studio should not be shipping something this undercooked.`, `By Year ${year}, the process should be preventing failures like this before release.`],
      weak: [`Year ${year}, and merely surviving the review is not enough anymore.`, `At Year ${year}, competent-but-fragile work reads as regression.`, `The studio should be setting a much higher floor by Year ${year}.`, `${year} years of institutional memory should produce more than this.`],
      middling: [`Year ${year}: respectable, but an experienced studio should want more than respectable.`, `A six in Year ${year} is stable work with uncomfortable opportunity cost.`, `The studio knows how to make competent work by now; the question is why it stopped there.`, `Year ${year} experience is visible, but not being stretched.`],
      strong: [`Year ${year} and the studio is turning experience into dependable quality.`, `This is what a growing studio's stronger middle years should look like.`, `By Year ${year}, good work needs to be repeatable; this feels repeatable.`, `The studio is converting ${year} years of lessons into a convincing house standard.`],
      elite: [`Year ${year} and the studio is operating at full authority.`, `After ${year} years, the accumulated craft is visible in every department.`, `This is the payoff for a studio that has spent ${year} years learning what to keep and what to cut.`, `Year ${year} produces a release worthy of the experience behind it.`],
    },
    established: {
      awful: [`Year ${year}: this is a serious failure for an established studio.`, `${year} years in, there is no credible inexperience defence left.`, `A veteran production system should catch this long before audiences do.`, `At Year ${year}, a score this low threatens the studio's hard-earned reputation.`],
      weak: [`Year ${year} mediocrity carries more reputational weight than Year 1 mediocrity ever could.`, `An established studio cannot call this a learning release without inviting uncomfortable questions.`, `After ${year} years, five-out-of-ten work feels like institutional drift.`, `The studio's history makes this result more disappointing, not less.`],
      middling: [`A Year ${year} studio can produce a six in its sleep; that is rather the problem.`, `Established competence is present, ambition less so.`, `${year} years have built a strong safety net, but this release never climbs much above it.`, `Reliable work from an established outfit, with very little sense of risk.`],
      strong: [`Year ${year} professionalism is doing exactly what it should here.`, `An established studio delivering a strong release without visible strain.`, `The studio's experience gives this production an unusually high floor.`, `${year} years in, the craft feels practiced without feeling stale.`],
      elite: [`Year ${year} and the studio is setting the industry pace rather than chasing it.`, `This is an established studio using experience as leverage, not comfort.`, `${year} years of craft culminate in work that still feels hungry.`, `Elite late-career work is difficult because expectations are already high; this clears them.`],
    },
    veteran: {
      awful: [`Year ${year}: a collapse this severe becomes part of the studio's legacy immediately.`, `After ${year} years, failure at this scale cannot be dismissed as a bad week.`, `A studio with this much history has no business releasing work at this standard.`, `Year ${year} turns this from an ordinary flop into a reputational event.`],
      weak: [`At Year ${year}, mediocrity invites questions about whether the studio has become too comfortable.`, `${year} years of experience make this result harder to defend.`, `A veteran studio should know exactly where this production went wrong; audiences will ask why it shipped anyway.`, `The studio has earned patience over ${year} years, but this release spends some of it.`],
      middling: [`Year ${year} competence is not a crisis, but it is no longer an achievement either.`, `A veteran studio delivers a safe six and leaves us wondering where the appetite went.`, `${year} years of craft keep the floor intact, even as this release avoids the ceiling.`, `Experience prevents disaster here; it does not create excitement.`],
      strong: [`Year ${year} and the veteran studio still knows how to deliver a genuinely strong production.`, `Longevity has sharpened rather than softened the process here.`, `${year} years in, the studio remains capable of work with urgency and control.`, `A veteran release that remembers experience is useful only when it still serves the work.`],
      elite: [`Year ${year}, and the studio is still capable of making the industry recalibrate.`, `Longevity without complacency: elite work deep into the studio's history.`, `${year} years have not dulled the appetite for excellence.`, `A veteran masterpiece is different from an early breakthrough: this is mastery sustained.`],
    },
  };
  return tables[stage][band];
}

/**
 * Reviews are deliberately combinatorial rather than a tiny random quote list.
 * Every displayed line is assembled from: exact critic score, outlet voice,
 * career year/stage, show count and release identity. This creates thousands of
 * deterministic combinations while keeping each critic recognisably themselves.
 */
export function contextualReviewQuote(ctx: ReviewNarrativeContext): string {
  const year = careerYearForWeek(ctx.careerWeek);
  const score = Math.max(1, Math.min(10, Math.round(ctx.score)));
  const seed = `${ctx.title ?? ""}|${ctx.outlet}|${ctx.focus}|${score}|${ctx.total}|${Math.round(ctx.quality)}|${year}|${ctx.showsMade}`;
  const career = pick(careerLines(year, ctx.showsMade, score), seed, "career");
  const outlet = pick(OUTLET_SCORE[ctx.outlet]?.[score] ?? EXACT_SCORE[score] ?? [ctx.baseQuote], seed, "outlet");
  const general = pick(EXACT_SCORE[score] ?? [ctx.baseQuote], seed, "score");

  /* Two observations are enough to feel authored without turning a review card
     into an essay. Which two are used also varies deterministically by release. */
  const mode = hash32(`${seed}|mode`) % 3;
  if (mode === 0) return `${career} ${outlet}`;
  if (mode === 1) return `${outlet} ${career}`;
  return `${career} ${general}`;
}
