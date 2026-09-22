import fs from 'node:fs';

const root = new URL('../', import.meta.url).pathname;
const read = (p) => fs.readFileSync(root + p, 'utf8');
const write = (p, c) => fs.writeFileSync(root + p, c);
function replace(p, oldText, newText) {
  const c = read(p);
  if (!c.includes(oldText)) throw new Error(`Missing anchor in ${p}: ${oldText.slice(0, 100)}`);
  write(p, c.replace(oldText, newText));
}

// ---------- Title: tactile buttons + genuine one-tap random career.
replace('src/components/Title.tsx',
`        "hover:bg-white/[0.06] hover:shadow-[0_0_28px_rgba(61,225,255,.18)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyanx focus-visible:ring-offset-2 focus-visible:ring-offset-black/50",`,
`        "hover:bg-white/[0.06] hover:shadow-[0_0_28px_rgba(61,225,255,.18)]",
        "active:translate-y-[2px] active:scale-[0.985] active:bg-black/30 active:shadow-[inset_0_5px_14px_rgba(0,0,0,.65)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyanx focus-visible:ring-offset-2 focus-visible:ring-offset-black/50",`);
replace('src/components/Title.tsx',
`  const continueCareer = () => {
    if (newest && onLoad) {
      onLoad(newest.id);
      return;
    }
    setView("setup");
  };
`,
`  const continueCareer = () => {
    if (newest && onLoad) {
      onLoad(newest.id);
      return;
    }
    setView("setup");
  };

  const quickStart = () => {
    const generatedStudio = \`Studio \${randomTitle().split(" ")[0]}\`;
    const selected = SHOWRUNNERS[Math.floor(Math.random() * SHOWRUNNERS.length)] ?? SHOWRUNNERS[0];
    primeAudio();
    sfx.select();
    onStart(generatedStudio, selected.id);
  };
`);
replace('src/components/Title.tsx',
`              <Hotspot
                label="Quit"
                className="left-[53.4%] top-[71.6%] h-[4.2%] w-[13.5%] rounded-xl"
                onClick={requestQuit}
              />
`,
`              <Hotspot
                label="Quit"
                className="left-[53.4%] top-[71.6%] h-[4.2%] w-[13.5%] rounded-xl"
                onClick={requestQuit}
              />
              <button
                type="button"
                onClick={quickStart}
                className="btn-press absolute left-[24%] top-[77.1%] z-20 flex min-h-[44px] w-[52%] items-center justify-center gap-2 rounded-xl border border-cyanx/55 bg-[#07101d]/85 px-3 py-2 text-center shadow-[0_0_22px_rgba(61,225,255,.18)] backdrop-blur-sm transition active:translate-y-[2px] active:scale-[0.98] active:border-cyanx/30 active:bg-black/70 active:shadow-[inset_0_5px_14px_rgba(0,0,0,.7)]"
              >
                <Zap size={15} className="shrink-0 text-cyanx" />
                <span><b className="block font-display text-[10px] tracking-wider text-cyanx">QUICK START</b><span className="block text-[7px] text-paper/55">Random studio · random showrunner</span></span>
              </button>
`);

// ---------- Specialisation: early Research choice + direct score identity.
replace('src/engine/specialisation.ts',
`export const PRIMARY_SPECIALISATION_MIN_OFFICE = 1;`,
`export const PRIMARY_SPECIALISATION_MIN_OFFICE = 0;`);
replace('src/engine/specialisation.ts',
`  signatureIssueChance: number;
  outsideOutput: number;`,
`  signatureIssueChance: number;
  signatureScore: number;
  outsideScore: number;
  outsideOutput: number;`);
replace('src/engine/specialisation.ts',
`    signatureIssueChance: 0.95,
    outsideOutput: 1,`,
`    signatureIssueChance: 0.95,
    signatureScore: 1.04,
    outsideScore: 0.98,
    outsideOutput: 1,`);
replace('src/engine/specialisation.ts',
`    signatureIssueChance: 0.90,
    outsideOutput: 1,`,
`    signatureIssueChance: 0.90,
    signatureScore: 1.07,
    outsideScore: 0.975,
    outsideOutput: 1,`);
replace('src/engine/specialisation.ts',
`    signatureIssueChance: 0.85,
    outsideOutput: 1,`,
`    signatureIssueChance: 0.85,
    signatureScore: 1.10,
    outsideScore: 0.97,
    outsideOutput: 1,`);
replace('src/engine/specialisation.ts',
`  issueChanceMult: number;
}`,
`  issueChanceMult: number;
  /** direct multiplier applied equally to Story / Art / Sound at review scoring */
  scoreMult: number;
}`);
replace('src/engine/specialisation.ts',
`      issueChanceMult: 1,
    };`,
`      issueChanceMult: 1,
      scoreMult: 1,
    };`);
replace('src/engine/specialisation.ts',
`        issueChanceMult: fx.signatureIssueChance,
      }`,
`        issueChanceMult: fx.signatureIssueChance,
        scoreMult: fx.signatureScore,
      }`);
replace('src/engine/specialisation.ts',
`        issueChanceMult: fx.outsideIssueChance,
      };`,
`        issueChanceMult: fx.outsideIssueChance,
        scoreMult: fx.outsideScore,
      };`);
replace('src/engine/specialisation.ts',
`    signatureInterventionEffectPct: Math.round((fx.signatureInterventionEffect - 1) * 100),
    outsideOutputPenaltyPct:`,
`    signatureInterventionEffectPct: Math.round((fx.signatureInterventionEffect - 1) * 100),
    signatureScorePct: Math.round((fx.signatureScore - 1) * 100),
    outsideScorePenaltyPct: Math.round((1 - fx.outsideScore) * 1000) / 10,
    outsideOutputPenaltyPct:`);
replace('src/engine/specialisation.ts',
'      `🎯 STUDIO IDENTITY LOCKED: ${genreLabel(genre)} is now your Signature Genre. Productions containing it gain house expertise; work outside it becomes less predictable.`,',
'      `🎯 HOUSE SPECIALTY LOCKED: ${genreLabel(genre)} shows gain Story, Art and Sound scoring expertise. Shows without it take only a small house-focus penalty.`,');

// ---------- Projects: score specialty in all three areas + business progression + slate prep record.
replace('src/engine/projects.ts',
`  /** the deal financing this show — null/undefined = fully self-funded */
  commission?: ProjectCommission | null;`,
`  /** the deal financing this show — null/undefined = fully self-funded */
  commission?: ProjectCommission | null;
  /** advance planning earned from the Studio Slate before this project was greenlit */
  slatePrep?: { planId: string; importance: "supporting" | "standard" | "tentpole"; weeksPlanned: number; hypeBonus: number; burnDiscount: number; deadlineBufferWeeks: number };`);
replace('src/engine/projects.ts',
`  /** dynasty-era audience expectations — mildly raises the review bar */
  audienceBar?: number;`,
`  /** dynasty-era audience expectations — mildly raises the review bar */
  audienceBar?: number;
  /** House Specialty multiplies Story / Art / Sound equally before review scoring. */
  specialisationScoreMult?: number;
  /** Every Business & Audience level improves shipped-release economics. */
  businessMult?: number;`);
replace('src/engine/projects.ts',
`  const franchiseMult = ctx.franchiseMult ?? (d.franchiseKey ? 1 + 0.14 * (d.season - 1) : 1);

  const res = computeResult({
    draft: d,
    points: p.points,`,
`  const franchiseMult = ctx.franchiseMult ?? (d.franchiseKey ? 1 + 0.14 * (d.season - 1) : 1);
  const houseScoreMult = ctx.specialisationScoreMult ?? 1;
  const scoredPoints: Points = {
    story: p.points.story * houseScoreMult,
    art: p.points.art * houseScoreMult,
    sound: p.points.sound * houseScoreMult,
  };

  const res = computeResult({
    draft: d,
    points: scoredPoints,`);
replace('src/engine/projects.ts',
`  let out = res;

  /* the market pays what the market pays — reviews are unaffected */`,
`  let out = res;

  if (Math.abs(houseScoreMult - 1) > 0.001) {
    out = {
      ...out,
      breakdown: [...out.breakdown, { label: houseScoreMult > 1 ? "House genre expertise" : "Outside house specialty", pts: \`×\${houseScoreMult.toFixed(3)} Story · Art · Sound\` }],
    };
  }

  const business = ctx.businessMult ?? 1;
  if (business > 1.001) {
    out = {
      ...out,
      revenue: Math.round(out.revenue * business),
      fans: Math.round(out.fans * (1 + (business - 1) * 0.5)),
      breakdown: [...out.breakdown, { label: "Business & Audience discipline", pts: \`×\${business.toFixed(2)} release revenue\` }],
    };
  }

  /* the market pays what the market pays — reviews are unaffected */`);

// ---------- Slate engine: planning has a real preparation payoff.
replace('src/engine/slate.ts',
`import { WEEKS_PER_YEAR } from "./data";`,
`import { WEEKS_PER_YEAR, type Draft } from "./data";`);
replace('src/engine/slate.ts',
`  interface RunState {
    slatePlans?: SlatePlan[];
  }`,
`  interface RunState {
    slatePlans?: SlatePlan[];
    /** the plan whose START SETUP button opened the current creation flow */
    activeSlateSetupPlanId?: string;
  }`);
replace('src/engine/slate.ts',
`export function removeSlatePlan(run: RunState, id: string): RunState {
  return { ...run, slatePlans: (run.slatePlans ?? []).filter((plan) => plan.id !== id) };
}
`,
`export function removeSlatePlan(run: RunState, id: string): RunState {
  return { ...run, slatePlans: (run.slatePlans ?? []).filter((plan) => plan.id !== id), activeSlateSetupPlanId: run.activeSlateSetupPlanId === id ? undefined : run.activeSlateSetupPlanId };
}

export const SLATE_PREP_MIN_WEEKS = 4;
export interface SlatePreparation {
  planId: string;
  importance: SlateImportance;
  weeksPlanned: number;
  ready: boolean;
  hypeBonus: number;
  burnDiscount: number;
  deadlineBufferWeeks: number;
}

export function slatePreparation(plan: SlatePlan, nowWeek: number): SlatePreparation {
  const weeksPlanned = Math.max(0, nowWeek - plan.createdWeek);
  const ready = weeksPlanned >= SLATE_PREP_MIN_WEEKS;
  const values = plan.importance === "tentpole"
    ? { hypeBonus: 10, burnDiscount: 0.08, deadlineBufferWeeks: 1 }
    : plan.importance === "standard"
      ? { hypeBonus: 7, burnDiscount: 0.06, deadlineBufferWeeks: 1 }
      : { hypeBonus: 4, burnDiscount: 0.04, deadlineBufferWeeks: 0 };
  return { planId: plan.id, importance: plan.importance, weeksPlanned, ready, hypeBonus: ready ? values.hypeBonus : 0, burnDiscount: ready ? values.burnDiscount : 0, deadlineBufferWeeks: ready ? values.deadlineBufferWeeks : 0 };
}

export function armSlatePlan(run: RunState, id: string): RunState {
  return { ...updateSlatePlan(run, id, { status: "setup" }), activeSlateSetupPlanId: id };
}

function planMatchesDraft(plan: SlatePlan, draft: Draft): boolean {
  if (plan.kind === "licensed") return !!plan.licensedIpId && draft.licensedIpId === plan.licensedIpId;
  if (plan.kind === "franchise") return !!plan.franchiseKey && draft.franchiseKey === plan.franchiseKey;
  return !draft.licensedIpId && !draft.franchiseKey;
}

export function consumeArmedSlatePlan(run: RunState, draft: Draft): { run: RunState; preparation: SlatePreparation | null } {
  const id = run.activeSlateSetupPlanId;
  if (!id) return { run, preparation: null };
  const plan = (run.slatePlans ?? []).find((candidate) => candidate.id === id);
  if (!plan || !planMatchesDraft(plan, draft)) return { run: { ...run, activeSlateSetupPlanId: undefined }, preparation: null };
  const preparation = slatePreparation(plan, run.week);
  return {
    run: { ...run, slatePlans: (run.slatePlans ?? []).filter((candidate) => candidate.id !== id), activeSlateSetupPlanId: undefined },
    preparation,
  };
}
`);

// ---------- Slate UI: clearly show why advance planning matters.
replace('src/components/StudioSlate.tsx',
`  addSlatePlan,
  careerCalendarYear,`,
`  addSlatePlan,
  armSlatePlan,
  careerCalendarYear,`);
replace('src/components/StudioSlate.tsx',
`  slateQuarterWarnings,
  updateSlatePlan,`,
`  slateQuarterWarnings,
  slatePreparation,`);
replace('src/components/StudioSlate.tsx',
`  const startPlan = (plan: SlatePlan) => {
    setRun((r) => updateSlatePlan(r, plan.id, { status: "setup" }));`,
`  const startPlan = (plan: SlatePlan) => {
    setRun((r) => armSlatePlan(r, plan.id));`);
replace('src/components/StudioSlate.tsx',
`{plans.map((plan)=><div key={plan.id} className="rounded-lg border border-line bg-panel2/55 p-2"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><div className="truncate text-[10px] font-bold">{plan.title}</div><div className="text-[8px] text-paper/40">{dateLabel(plan.targetWeek)} · {plan.kind.toUpperCase()} · {importanceLabel[plan.importance]}</div></div><button className="p-2 text-paper/35" onClick={()=>setRun((r)=>removeSlatePlan(r,plan.id))}><Trash2 size={12}/></button></div><button onClick={()=>startPlan(plan)} className="btn-press mt-1.5 min-h-10 w-full rounded-md border border-gold/35 bg-gold/5 text-[9px] font-black text-gold">START SETUP</button></div>)}`,
`{plans.map((plan)=>{ const prep=slatePreparation(plan,run.week); return <div key={plan.id} className="rounded-lg border border-line bg-panel2/55 p-2"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><div className="truncate text-[10px] font-bold">{plan.title}</div><div className="text-[8px] text-paper/40">{dateLabel(plan.targetWeek)} · {plan.kind.toUpperCase()} · {importanceLabel[plan.importance]}</div></div><button className="p-2 text-paper/35" onClick={()=>setRun((r)=>removeSlatePlan(r,plan.id))}><Trash2 size={12}/></button></div><div className={cn("mt-1 rounded px-1.5 py-1 text-[8px] font-bold",prep.ready?"bg-mint/10 text-mint":"bg-panel3 text-paper/40")}>{prep.ready ? \`PREPARED · +\${prep.hypeBonus} starting hype · −\${Math.round(prep.burnDiscount*100)}% weekly burn\${prep.deadlineBufferWeeks?" · +1 wk buffer":""}\` : \`PLANNING · \${prep.weeksPlanned}/4 weeks banked before preparation bonuses activate\`}</div><button onClick={()=>startPlan(plan)} className="btn-press mt-1.5 min-h-10 w-full rounded-md border border-gold/35 bg-gold/5 text-[9px] font-black text-gold">START SETUP</button></div>})}`);
replace('src/components/StudioSlate.tsx',
`Plans are executive intent, not phantom projects: START SETUP hands off to the normal Original, Franchise or Licensed creation flow. On mobile the quarter is a card list; the dense timeline only appears on larger screens.`,
`Planning now pays off: leave a show on the Slate for at least 4 weeks before START SETUP to earn preparation. Supporting / Standard / Tentpole plans gain progressively more starting hype and lower weekly burn; larger plans also create more quarter pressure.`);

// ---------- State: make new track gains, specialty scoring and slate preparation authoritative.
replace('src/engine/state.ts',
`  researchTrackLevel,
  trackSkillMultiplier,`,
`  researchTrackLevel,
  trackSkillMultiplier,
  productionTrackProjectMultiplier,
  businessTrackRevenueMultiplier,`);
replace('src/engine/state.ts',
`import { projectLoadMap } from "./capacity";`,
`import { projectLoadMap } from "./capacity";
import { consumeArmedSlatePlan } from "./slate";`);
replace('src/engine/state.ts',
`    effective *= specialisationProjectEffects(r, project.draft).outputMult;
  } else {`,
`    effective *= specialisationProjectEffects(r, project.draft).outputMult;
    effective *= productionTrackProjectMultiplier(researchTrackLevel(r, "production"));
  } else {`);
replace('src/engine/state.ts',
`  if (project) skill *= specialisationProjectEffects(r, project.draft).outputMult;`,
`  if (project) {
    skill *= specialisationProjectEffects(r, project.draft).outputMult;
    skill *= productionTrackProjectMultiplier(researchTrackLevel(r, "production"));
  }`);
replace('src/engine/state.ts',
`    audienceBar: dynastyAudienceBar(r) + campaignPressureFor(r).audienceBar,
    castAffinityDiscovered: r.castAffinityDiscovered,`,
`    audienceBar: dynastyAudienceBar(r) + campaignPressureFor(r).audienceBar,
    specialisationScoreMult: specialisationProjectEffects(r, d).scoreMult,
    businessMult: businessTrackRevenueMultiplier(researchTrackLevel(r, "business")),
    castAffinityDiscovered: r.castAffinityDiscovered,`);
replace('src/engine/state.ts',
`  const greenlightCost = commission ? projectUpfront(d) : selfFundedGreenlightCost(r, d);
  const startupMult = commission ? 1 : selfFundedStartupMult(r, d);
  let p: Project = { ...makeProject(d, r.week, r.day ?? r.week * 7), distributionOwner: "player", spent: greenlightCost };`,
`  const greenlightCost = commission ? projectUpfront(d) : selfFundedGreenlightCost(r, d);
  const startupMult = commission ? 1 : selfFundedStartupMult(r, d);
  const slated = commission ? { run: r, preparation: null } : consumeArmedSlatePlan(r, d);
  r = slated.run;
  let p: Project = { ...makeProject(d, r.week, r.day ?? r.week * 7), distributionOwner: "player", spent: greenlightCost };
  if (slated.preparation?.ready) {
    const prep = slated.preparation;
    p = {
      ...p,
      hype: p.hype + prep.hypeBonus,
      weeklyBurn: Math.max(1, Math.round(p.weeklyBurn * (1 - prep.burnDiscount))),
      deadlineWeek: p.deadlineWeek + prep.deadlineBufferWeeks,
      deadlineDay: (p.deadlineDay ?? p.deadlineWeek * 7) + prep.deadlineBufferWeeks * 7,
      slatePrep: { planId: prep.planId, importance: prep.importance, weeksPlanned: prep.weeksPlanned, hypeBonus: prep.hypeBonus, burnDiscount: prep.burnDiscount, deadlineBufferWeeks: prep.deadlineBufferWeeks },
    };
  }`);
replace('src/engine/state.ts',
`        : \`“\${d.title}” \${d.licensedIpId ? "licensed adaptation " : ""}greenlit — target release in \${Math.max(0, (p.deadlineDay ?? p.deadlineWeek * 7) - (r.day ?? r.week * 7))} days.\${startupMult > 1 ? \` Early self-funding setup ×\${startupMult.toFixed(2)} raised today’s greenlight payment.\` : ""} Total production budget ≈ £\${draftCost(d).toLocaleString("en-GB")}.\`,`,
`        : \`“\${d.title}” \${d.licensedIpId ? "licensed adaptation " : ""}greenlit — target release in \${Math.max(0, (p.deadlineDay ?? p.deadlineWeek * 7) - (r.day ?? r.week * 7))} days.\${p.slatePrep ? \` Slate preparation: +\${p.slatePrep.hypeBonus} hype, −\${Math.round(p.slatePrep.burnDiscount * 100)}% weekly burn\${p.slatePrep.deadlineBufferWeeks ? ", +1 week buffer" : ""}.\` : ""}\${startupMult > 1 ? \` Early self-funding setup ×\${startupMult.toFixed(2)} raised today’s greenlight payment.\` : ""} Total production budget ≈ £\${draftCost(d).toLocaleString("en-GB")}.\`,`);

// ---------- Research UI: specialty is chosen where the player asked for it.
replace('src/components/Office.tsx',
`import { RESEARCH_TRACKS, MAX_RESEARCH_TRACK_LEVEL, nextTrackMilestone, researchTrackLevel } from "../engine/researchTracks";`,
`import { RESEARCH_TRACKS, MAX_RESEARCH_TRACK_LEVEL, nextTrackMilestone, researchTrackLevel } from "../engine/researchTracks";
import { choosePrimarySpecialisation, specialisationBenefits, studioSpecialisationProfile } from "../engine/specialisation";`);
replace('src/components/Office.tsx',
`          <div className="mb-2 mt-4 text-xs font-bold tracking-widest text-paper/50">STUDIO KNOWLEDGE STUDIES</div>`,
`          <div className="mb-2 mt-4 text-xs font-bold tracking-widest text-paper/50">HOUSE GENRE SPECIALTY</div>
          {(() => {
            const profile = studioSpecialisationProfile(run);
            const benefits = specialisationBenefits(run);
            if (profile.primary) {
              const genre = GENRES.find((g) => g.id === profile.primary);
              return <div className="rounded-xl border border-gold/45 bg-gold/5 p-3"><div className="flex items-center gap-2"><Star size={15} className="text-gold"/><div className="font-display text-sm font-extrabold">{genre?.label ?? profile.primary} HOUSE</div><span className="ml-auto rounded bg-gold/10 px-2 py-0.5 text-[8px] font-black text-gold">{profile.rank.toUpperCase()}</span></div><div className="mt-1 text-[10px] text-paper/55">Any show containing <b className="text-paper">{genre?.label ?? profile.primary}</b> — alone or in a two-genre combination — gains <b className="text-mint">+{benefits?.signatureScorePct ?? 0}% to Story, Art and Sound scoring</b>. Shows without it take only a <b className="text-neon">−{benefits?.outsideScorePenaltyPct ?? 0}% scoring penalty</b>.</div><div className="mt-1 text-[9px] text-paper/35">House expertise strengthens as successful signature releases move Studio → Authority → Institution.</div></div>;
            }
            return <div className="rounded-xl border border-gold/35 bg-gold/5 p-3"><div className="text-[10px] font-bold text-gold">CHOOSE ONE PERMANENT HOUSE SPECIALTY</div><div className="mt-1 text-[9px] text-paper/50">This is your studio's creative identity. It gives a real scoring edge to every show containing that genre, with a small penalty when you work completely outside it.</div><div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">{GENRES.filter((g)=>run.genresUnlocked.includes(g.id)).map((g)=>{const Icon=g.icon;return <button key={g.id} className="btn-press min-h-11 rounded-lg border border-line bg-panel2 px-2 text-left hover:border-gold" onClick={()=>{const next=choosePrimarySpecialisation(run,g.id);if(next){sfx.fanfare();setRun(()=>next);}}}><div className="flex items-center gap-1.5"><Icon size={13} style={{color:g.color}}/><b className="text-[10px]">{g.label}</b></div></button>})}</div></div>;
          })()}

          <div className="mb-2 mt-4 text-xs font-bold tracking-widest text-paper/50">STUDIO KNOWLEDGE STUDIES</div>`);

// ---------- Studio Identity wording must match the restored minor penalty.
replace('src/components/StudioIdentity.tsx',
`Choose a house genre to build exceptional institutional expertise. Signature work gets stronger production output, faster pacing, better intervention economics and sharper forecasts. Work outside the house remains fully viable: specialisation adds strengths rather than punishing experimentation.`,
`Choose a house genre to build exceptional institutional expertise. Signature work gets stronger production output, faster pacing, better intervention economics, sharper forecasts and a direct Story / Art / Sound scoring lift. Work outside the house remains viable, but carries a small scoring penalty because the studio is operating away from its strongest identity.`);
replace('src/components/StudioIdentity.tsx',
`<div className="rounded-lg border border-cyanx/20 bg-cyanx/[.04] p-2"><b className="text-[10px] text-cyanx">OUTSIDE HOUSE</b><div className="text-[7px] text-paper/40">No blanket penalty. Experiment freely; you simply do not receive the house-speciality bonuses.</div></div>`,
`<div className="rounded-lg border border-neon/20 bg-neon/[.04] p-2"><b className="text-[10px] text-neon">OUTSIDE HOUSE</b><div className="text-[7px] text-paper/40">Small all-craft scoring penalty only. Production pace, rescue cost and issue risk are not broadly punished.</div></div>`);

// ---------- Tests: match the new playtest rules.
replace('src/engine/__tests__/studio-specialisation.test.ts',
`  it("unlocks primary specialisation at Studio 2 and makes the choice permanent", () => {
    let run = initialRun("House", "steady");
    expect(choosePrimarySpecialisation(run, "fantasy")).toBeNull();
    run.officeLevel = 1;
    run = choosePrimarySpecialisation(run, "fantasy")!;`,
`  it("lets a new studio choose one permanent research specialty", () => {
    let run = initialRun("House", "steady");
    run = choosePrimarySpecialisation(run, "fantasy")!;`);
replace('src/engine/__tests__/studio-specialisation.test.ts',
`  it("rewards house expertise without imposing a blanket penalty on experimentation", () => {
    const run = withFantasyHistory([27, 28, 22, 23]);
    const house = specialisationProjectEffects(run, draft(["fantasy"]));
    const outside = specialisationProjectEffects(run, draft(["slice"]));
    expect(house.outputMult).toBeGreaterThan(1);
    expect(house.paceMult).toBeGreaterThan(1);
    expect(outside.outputMult).toBe(1);
    expect(outside.paceMult).toBe(1);
    expect(outside.interventionCostMult).toBe(1);
    expect(outside.issueChanceMult).toBe(1);
  });`,
`  it("boosts all scoring in-house and applies only a minor scoring penalty outside it", () => {
    const run = withFantasyHistory([27, 28, 22, 23]);
    const house = specialisationProjectEffects(run, draft(["fantasy"]));
    const combo = specialisationProjectEffects(run, draft(["fantasy", "horror"]));
    const outside = specialisationProjectEffects(run, draft(["slice"]));
    expect(house.outputMult).toBeGreaterThan(1);
    expect(house.paceMult).toBeGreaterThan(1);
    expect(house.scoreMult).toBeGreaterThan(1);
    expect(combo.scoreMult).toBe(house.scoreMult);
    expect(outside.scoreMult).toBeLessThan(1);
    expect(outside.scoreMult).toBeGreaterThanOrEqual(0.97);
    expect(outside.outputMult).toBe(1);
    expect(outside.paceMult).toBe(1);
    expect(outside.interventionCostMult).toBe(1);
    expect(outside.issueChanceMult).toBe(1);
  });`);

console.log('Applied playtest specialty/slate/title/research integration pass.');
