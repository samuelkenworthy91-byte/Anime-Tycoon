export type ResearchTrackId = "writing" | "animation" | "sound" | "production" | "business";

export interface ResearchTrackMilestone {
  level: number;
  researchId?: string;
  label: string;
  effect: string;
}

export interface ResearchTrackDef {
  id: ResearchTrackId;
  name: string;
  researchId: string;
  baseCost: number;
  blurb: string;
  milestones: ResearchTrackMilestone[];
}

export const RESEARCH_TRACKS: readonly ResearchTrackDef[] = [
  {
    id: "writing", name: "Writing & Development", researchId: "discipline_writing", baseCost: 26,
    blurb: "Story planning, script process and development craft. Every level strengthens Story contribution checks.",
    milestones: [
      { level: 1, researchId: "storyboard", label: "Storyboard Method", effect: "Storyboard Method unlocks; Story craft also gains the permanent discipline bonus." },
      { level: 2, label: "Script Coverage", effect: "Faster table reads and stronger Story contribution checks." },
      { level: 3, label: "Writers' Room Practice", effect: "Structured development improves every Story production." },
      { level: 4, label: "Character Pass", effect: "Dedicated character rewrites deepen the studio's Story craft." },
      { level: 5, label: "Rewrite Protocol", effect: "Formal rewrite passes make Story work more dependable." },
      { level: 6, label: "Development Department", effect: "A mature development team supports prestige-scale writing." },
      { level: 7, label: "Prestige Development", effect: "Senior development practice pushes Story craft near its ceiling." },
      { level: 8, label: "Story Institute", effect: "Writing & Development mastery: maximum permanent Story discipline bonus." },
    ],
  },
  {
    id: "animation", name: "Animation & Art", researchId: "discipline_animation", baseCost: 28,
    blurb: "Animation workflow, reference, tools and visual production. Every level strengthens Art contribution checks.",
    milestones: [
      { level: 1, researchId: "mocap", label: "Motion Reference", effect: "Motion Reference unlocks; Art craft also gains the permanent discipline bonus." },
      { level: 2, label: "Layout Review", effect: "Formal layout review strengthens every Art contribution check." },
      { level: 3, researchId: "cg", label: "CG Assist", effect: "CG Assist unlocks and eases heavy animation workloads." },
      { level: 4, label: "Compositing Pipeline", effect: "A dedicated compositing pass improves visual production consistency." },
      { level: 5, label: "Action Unit", effect: "A specialist action unit deepens the studio's Art craft." },
      { level: 6, label: "Sakuga Pipeline", effect: "High-end animation workflow supports prestige-scale production." },
      { level: 7, label: "Visual Development Lab", effect: "Senior visual development pushes Art craft near its ceiling." },
      { level: 8, label: "Animation Institute", effect: "Animation & Art mastery: maximum permanent Art discipline bonus." },
    ],
  },
  {
    id: "sound", name: "Sound & Performance", researchId: "discipline_sound", baseCost: 24,
    blurb: "Music, recording, voice direction and post-production performance. Every level strengthens Sound contribution checks.",
    milestones: [
      { level: 1, label: "Table Read", effect: "Regular table reads establish the studio's permanent Sound discipline bonus." },
      { level: 2, label: "Performance Direction", effect: "Dedicated performance direction strengthens Sound contributions." },
      { level: 3, label: "Music Supervision", effect: "A music supervisor improves scoring and recording decisions." },
      { level: 4, label: "Voice Booth", effect: "A mature recording process makes Sound work more dependable." },
      { level: 5, label: "Premium Recording Practice", effect: "Prestige recording practice raises the studio's Sound ceiling." },
      { level: 6, label: "Sound Design Unit", effect: "A dedicated sound-design unit strengthens every production." },
      { level: 7, label: "Composer Network", effect: "A trusted composer network pushes Sound craft near its ceiling." },
      { level: 8, label: "Performance Institute", effect: "Sound & Performance mastery: maximum permanent Sound discipline bonus." },
    ],
  },
  {
    id: "production", name: "Production & QA", researchId: "discipline_production", baseCost: 30,
    blurb: "Scheduling, editing, QA, automation and reliable delivery. Every level improves production efficiency as well as editing.",
    milestones: [
      { level: 1, researchId: "pipeline", label: "Digital Pipeline", effect: "Digital Pipeline unlocks; all staffed productions gain the permanent Production efficiency bonus." },
      { level: 2, researchId: "qa", label: "Editing Room", effect: "Editing Room unlocks and note-clear checks improve." },
      { level: 3, label: "Production Calendar", effect: "Better scheduling strengthens all live project contribution checks." },
      { level: 4, researchId: "autoclean", label: "Auto-Cleanup", effect: "Auto-Cleanup unlocks for final QA." },
      { level: 5, label: "Crisis Desk", effect: "Formal escalation practice raises production efficiency again." },
      { level: 6, label: "Delivery Standards", effect: "Studio-wide delivery standards strengthen every staffed project." },
      { level: 7, label: "Institutional Production System", effect: "Routine production becomes a mature, dependable studio capability." },
      { level: 8, label: "Executive Production Office", effect: "Production & QA mastery: maximum project-efficiency and editing bonuses." },
    ],
  },
  {
    id: "business", name: "Business & Audience", researchId: "discipline_business", baseCost: 32,
    blurb: "Marketing, audience research, staff appraisal, localisation and consumer products. Every level improves release revenue.",
    milestones: [
      { level: 1, researchId: "marketing", label: "Marketing Department", effect: "Strategic launch campaigns unlock; business expertise begins improving release revenue." },
      { level: 2, researchId: "merch", label: "Merch Division", effect: "Commercial merchandising infrastructure unlocks." },
      { level: 3, researchId: "local", label: "Localisation", effect: "International release economics improve." },
      { level: 4, researchId: "staff_appraisal", label: "Staff Appraisal", effect: "Employee Potential bands become visible." },
      { level: 5, researchId: "talent_scouting", label: "Talent Scouting", effect: "Candidate Potential bands become visible before signing." },
      { level: 6, researchId: "merch2", label: "Global Merch", effect: "Late-game consumer-products economics improve." },
      { level: 7, label: "Audience Strategy", effect: "Audience planning raises the permanent Business revenue bonus again." },
      { level: 8, label: "Global Business Office", effect: "Business & Audience mastery: maximum permanent release-revenue bonus." },
    ],
  },
] as const;

export const MAX_RESEARCH_TRACK_LEVEL = 8;
export const LEGACY_TRACK_MILESTONE_IDS = new Set(
  RESEARCH_TRACKS.flatMap((track) => track.milestones.map((m) => m.researchId).filter((id): id is string => !!id))
);

export function researchTrackById(id: ResearchTrackId): ResearchTrackDef {
  return RESEARCH_TRACKS.find((track) => track.id === id)!;
}

export function researchTrackForResearchId(researchId: string): ResearchTrackDef | null {
  return RESEARCH_TRACKS.find((track) => track.researchId === researchId) ?? null;
}

export function researchTrackLevel(
  carrier: { researchTrackLevels?: Partial<Record<ResearchTrackId, number>> },
  id: ResearchTrackId,
): number {
  return Math.max(0, Math.min(MAX_RESEARCH_TRACK_LEVEL, carrier.researchTrackLevels?.[id] ?? 0));
}

export function nextTrackMilestone(track: ResearchTrackDef, level: number): ResearchTrackMilestone | null {
  return track.milestones.find((milestone) => milestone.level > level) ?? null;
}

export function completeResearchTrack<T extends {
  research: string[];
  notices: string[];
  researchTrackLevels?: Partial<Record<ResearchTrackId, number>>;
}>(carrier: T, trackId: ResearchTrackId): T {
  const track = researchTrackById(trackId);
  const before = researchTrackLevel(carrier, trackId);
  const level = Math.min(MAX_RESEARCH_TRACK_LEVEL, before + 1);
  const unlocked = track.milestones
    .filter((m) => m.researchId && m.level > before && m.level <= level)
    .map((m) => m.researchId!);
  const labels = track.milestones
    .filter((m) => m.level > before && m.level <= level)
    .map((m) => m.label);
  return {
    ...carrier,
    researchTrackLevels: { ...(carrier.researchTrackLevels ?? {}), [trackId]: level },
    research: [...new Set([...carrier.research, ...unlocked])],
    notices: [
      ...carrier.notices,
      `🔬 ${track.name} reaches Lv${level}. ${labels.length ? `Unlocked: ${labels.join(", ")}.` : ""} Permanent discipline gain increased.`,
    ],
  };
}

/** Craft tracks are intentionally obvious in play: every paid level is +2% to
 * the relevant live Story / Art / Sound contribution checks (max +16%). */
export function trackSkillMultiplier(level: number): number {
  return 1 + Math.min(MAX_RESEARCH_TRACK_LEVEL, Math.max(0, level)) * 0.02;
}

/** Production levels strengthen contribution checks on staffed major projects
 * regardless of discipline. This stacks modestly with craft-track expertise. */
export function productionTrackProjectMultiplier(level: number): number {
  return 1 + Math.min(MAX_RESEARCH_TRACK_LEVEL, Math.max(0, level)) * 0.01;
}

/** Business levels directly improve money earned by every shipped production.
 * The existing named milestones still unlock marketing, merch and localisation. */
export function businessTrackRevenueMultiplier(level: number): number {
  return 1 + Math.min(MAX_RESEARCH_TRACK_LEVEL, Math.max(0, level)) * 0.01;
}
