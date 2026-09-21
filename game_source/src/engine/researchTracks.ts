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
    blurb: "Story planning, script process and development craft.",
    milestones: [
      { level: 1, researchId: "storyboard", label: "Storyboard Method", effect: "Story contribution checks improve." },
      { level: 3, label: "Writers' Room Practice", effect: "Writing research becomes a mature studio discipline." },
      { level: 6, label: "Development Department", effect: "High-level writing expertise supports prestige work." },
    ],
  },
  {
    id: "animation", name: "Animation & Art", researchId: "discipline_animation", baseCost: 28,
    blurb: "Animation workflow, reference, tools and visual production.",
    milestones: [
      { level: 1, researchId: "mocap", label: "Motion Reference", effect: "Art contribution checks improve." },
      { level: 3, researchId: "cg", label: "CG Assist", effect: "Animation capacity rises and blockbuster demand eases." },
      { level: 6, label: "Sakuga Pipeline", effect: "The studio is recognised as technically mature." },
    ],
  },
  {
    id: "sound", name: "Sound & Performance", researchId: "discipline_sound", baseCost: 24,
    blurb: "Music, recording, voice direction and post-production performance.",
    milestones: [
      { level: 2, label: "Performance Direction", effect: "Sound teams build permanent institutional craft." },
      { level: 5, label: "Premium Recording Practice", effect: "Prestige sound work becomes more reliable." },
    ],
  },
  {
    id: "production", name: "Production & QA", researchId: "discipline_production", baseCost: 30,
    blurb: "Scheduling, editing, QA, automation and reliable delivery.",
    milestones: [
      { level: 1, researchId: "pipeline", label: "Digital Pipeline", effect: "All live contribution checks improve." },
      { level: 2, researchId: "qa", label: "Editing Room", effect: "Editing-note cleanup improves." },
      { level: 4, researchId: "autoclean", label: "Auto-Cleanup", effect: "Final QA automatically clears part of the remaining note backlog." },
      { level: 7, label: "Institutional Production System", effect: "Routine production can be delegated with confidence." },
    ],
  },
  {
    id: "business", name: "Business & Audience", researchId: "discipline_business", baseCost: 32,
    blurb: "Marketing, audience research, staff appraisal, localisation and consumer products.",
    milestones: [
      { level: 1, researchId: "marketing", label: "Marketing Department", effect: "Strategic launch campaigns unlock." },
      { level: 2, researchId: "merch", label: "Merch Division", effect: "Commercial merchandising infrastructure unlocks." },
      { level: 3, researchId: "local", label: "Localisation", effect: "International release economics improve." },
      { level: 4, researchId: "staff_appraisal", label: "Staff Appraisal", effect: "Employee Potential bands become visible." },
      { level: 5, researchId: "talent_scouting", label: "Talent Scouting", effect: "Candidate Potential bands become visible." },
      { level: 6, researchId: "merch2", label: "Global Merch", effect: "Late-game consumer-products economics improve." },
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
    .map((m) => m.researchId!) ;
  const labels = track.milestones
    .filter((m) => m.level > before && m.level <= level)
    .map((m) => m.label);
  return {
    ...carrier,
    researchTrackLevels: { ...(carrier.researchTrackLevels ?? {}), [trackId]: level },
    research: [...new Set([...carrier.research, ...unlocked])],
    notices: [
      ...carrier.notices,
      `🔬 ${track.name} reaches Lv${level}.${labels.length ? ` Milestone: ${labels.join(", ")}.` : ""}`,
    ],
  };
}

export function trackSkillMultiplier(level: number): number {
  return 1 + Math.min(MAX_RESEARCH_TRACK_LEVEL, Math.max(0, level)) * 0.0125;
}
