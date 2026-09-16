import type { RunState } from "./state";
import { expansionOf, gameDay } from "./studioExpansion";
import { bondBetween, bondKey, genreFamiliarity, moraleDelta } from "./careers";
import { ROLE_POINT, STAFF_STAT_CAP, type GenreId } from "./data";

export type StaffStoryKind =
  | "recognition"
  | "mentorship"
  | "clash"
  | "recovery"
  | "rebuild";
export interface StaffStory {
  id: string;
  source: string;
  kind: StaffStoryKind;
  staffIds: string[];
  openedDay: number;
  expiresDay: number;
  status: "offered" | "active" | "resolved" | "expired";
  title: string;
  text: string;
  decision?: string;
  progress: number;
  nextDay?: number;
  outcome?: string;
}

/** Recovery conversations should feel meaningful rather than repetitive.
 * One in-game year is 48 weeks = 336 days. */
export const RECOVERY_REQUEST_COOLDOWN_DAYS = 48 * 7;
export const RECOVERY_REQUEST_STAMINA_THRESHOLD = 15;

export const storyChoices: Record<
  StaffStoryKind,
  { id: string; label: string; cost: number }[]
> = {
  recognition: [
    {
      id: "celebrate",
      label: "Studio showcase · creator +5 morale, colleagues +1",
      cost: 6000,
    },
    { id: "private", label: "Private thanks · creator +2 morale", cost: 0 },
  ],
  mentorship: [
    {
      id: "mentor",
      label: "Fund mentoring · reserve 2 days/week for 4 weeks",
      cost: 4000,
    },
    { id: "decline", label: "Keep current assignments", cost: 0 },
  ],
  clash: [
    {
      id: "mediate",
      label: "Mediated reset · both +4 morale, relationship rebuilds",
      cost: 3000,
    },
    { id: "professional", label: "Keep working · both −2 morale", cost: 0 },
  ],
  recovery: [
    { id: "rest", label: "7 paid recovery days · +4 morale", cost: 2000 },
    { id: "defer", label: "Defer recovery · −2 morale", cost: 0 },
  ],
  rebuild: [
    {
      id: "repair",
      label: "7 recovery days · +4 morale, missed promise retained",
      cost: 6000,
    },
    { id: "acknowledge", label: "Acknowledge mistake · +1 morale", cost: 0 },
  ],
};
export function storyBusyReason(
  r: RunState,
  id: string,
  day = gameDay(r),
): string | null {
  return expansionOf(r).stories?.some(
    (s) => s.status === "active" && s.staffIds.includes(id) && day % 7 < 2,
  )
    ? "Paid mentorship"
    : null;
}
export function advanceStaffStories(r: RunState): RunState {
  const day = gameDay(r);
  let x = expansionOf(r),
    staff = r.staff,
    bonds = r.bonds;
  if (day <= (x.storyDay ?? -1)) return r;
  x = { ...x, storyDay: day };
  const stories = (x.stories ?? []).map((s) => {
    if (!["offered", "active"].includes(s.status)) return s;
    if (s.staffIds.some((id) => !r.staff.some((st) => st.id === id)))
      return {
        ...s,
        status: "expired" as const,
        outcome: "A participant left; archived without substitution.",
      };
    if (s.status === "offered" && day > s.expiresDay)
      return {
        ...s,
        status: "expired" as const,
        outcome: "The opportunity passed without a commitment.",
      };
    if (
      s.status !== "active" ||
      day % 7 >= 2 ||
      r.audienceTest ||
      s.staffIds.some(
        (id) =>
          (x.leave[id] ?? 0) > day ||
          r.trainingJobs.some((j) => j.staffId === id),
      )
    )
      return s;
    const progress = s.progress + 1;
    if (progress < 8) return { ...s, progress };
    const key = bondKey(s.staffIds[0], s.staffIds[1]);
    bonds = { ...bonds, [key]: Math.max(8, bonds[key] ?? 0) };
    const mentor = staff.find((st) => st.id === s.staffIds[0])!;
    const junior = staff.find((st) => st.id === s.staffIds[1])!;
    const focus = ROLE_POINT[junior.role];
    const skillGap = Math.max(0, mentor[focus] - junior[focus]);
    const skillGain = Math.max(1, Math.min(5, Math.ceil(skillGap / 20)));
    const strongestGenre = (mentor.favGenre ?? Object.entries(mentor.genreExperience ?? {}).sort((a, b) => Number(b[1] ?? 0) - Number(a[1] ?? 0))[0]?.[0]) as GenreId | undefined;
    const mentorGenre = strongestGenre ? genreFamiliarity(mentor, strongestGenre) : 0;
    const juniorGenre = strongestGenre ? genreFamiliarity(junior, strongestGenre) : 0;
    const genreGain = strongestGenre && mentorGenre > juniorGenre ? Math.min(2, mentorGenre - juniorGenre) : 0;
    staff = staff.map((st) => {
      let next = s.staffIds.includes(st.id) ? moraleDelta(st, 4) : st;
      if (st.id !== junior.id) return next;
      next = { ...next, [focus]: Math.min(STAFF_STAT_CAP, next[focus] + skillGain) };
      if (strongestGenre && genreGain > 0) {
        next = {
          ...next,
          genreExperience: {
            ...(next.genreExperience ?? {}),
            [strongestGenre]: Math.max(next.genreExperience?.[strongestGenre] ?? 0, juniorGenre + genreGain),
          },
        };
      }
      return next;
    });
    return {
      ...s,
      progress,
      status: "resolved" as const,
      outcome:
        "Eight mentoring days completed: " + junior.name + " gained +" + skillGain + " " + focus + (strongestGenre && genreGain ? " and " + genreGain + " steps of " + strongestGenre + " familiarity" : "") + "; both gained morale and established a working relationship.",
    };
  });
  let history = x.history;
  for (const s of stories)
    if (s.outcome && !history.some((h) => h.id === s.id + ":outcome"))
      history = [
        ...history,
        { id: s.id + ":outcome", day, text: s.title + ": " + s.outcome },
      ].slice(-180);
  x = { ...x, stories, history };
  let next: RunState = { ...r, staff, bonds, expansion: x };
  if (
    day - (x.lastStoryDay ?? -1000) < 28 ||
    stories.filter((s) => s.status === "offered" || s.status === "active")
      .length >= 2
  )
    return next;
  const free = (id: string) =>
    !stories.some(
      (s) =>
        s.staffIds.includes(id) &&
        (s.status === "active" ||
          s.status === "offered" ||
          day - s.openedDay < 84),
    );
  const recoveryOnCooldown = (id: string) =>
    stories.some(
      (s) =>
        s.kind === "recovery" &&
        s.staffIds.includes(id) &&
        day - s.openedDay < RECOVERY_REQUEST_COOLDOWN_DAYS,
    );
  const seen = (source: string) => stories.some((s) => s.source === source);
  const create = (
    kind: StaffStoryKind,
    source: string,
    ids: string[],
    title: string,
    text: string,
  ): RunState => ({
    ...next,
    expansion: {
      ...x,
      lastStoryDay: day,
      stories: [
        ...stories,
        {
          id: "story:" + source,
          source,
          kind,
          staffIds: ids,
          openedDay: day,
          expiresDay: day + 28,
          status: "offered",
          title,
          text,
          progress: 0,
        },
      ],
    },
    notices: [
      ...next.notices,
      title + " — review Studio Culture or the employee profile.",
    ].slice(-40),
  });
  for (const s of stories) {
    if (
      s.kind !== "recognition" ||
      s.decision !== "celebrate" ||
      day < (s.nextDay ?? Infinity) ||
      seen(s.id + ":mentor")
    )
      continue;
    const creator = staff.find((st) => st.id === s.staffIds[0]);
    if (
      !creator ||
      stories.some(
        (s) =>
          s.staffIds.includes(creator.id) &&
          ["active", "offered"].includes(s.status),
      )
    )
      continue;
    const junior = staff
      .filter((st) => free(st.id) && creator.level - st.level >= 3)
      .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id))[0];
    if (junior)
      return create(
        "mentorship",
        s.id + ":mentor",
        [creator.id, junior.id],
        creator.name + " offers to mentor " + junior.name,
        "The showcase sparked a teaching opportunity. Both creators give up two production days each week until eight sessions are complete.",
      );
  }
  for (const p of x.promises) {
    if (
      !["fulfilled", "broken"].includes(p.status) ||
      seen(p.id) ||
      !free(p.staffId)
    )
      continue;
    const st = staff.find((s) => s.id === p.staffId);
    if (!st) continue;
    return p.status === "fulfilled"
      ? create(
          "recognition",
          p.id,
          [st.id],
          st.name + " wants to share the work",
          "Recognise the fulfilled creative promise. An experienced creator may later offer to teach a junior colleague.",
        )
      : create(
          "rebuild",
          p.id,
          [st.id],
          "Rebuilding trust with " + st.name,
          "The missed commitment remains in their history. A practical gesture can begin repairing the working relationship.",
        );
  }
  const eligible = staff
    .filter((s) => free(s.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  for (let i = 0; i < eligible.length; i++)
    for (let j = i + 1; j < eligible.length; j++) {
      const a = eligible[i],
        b = eligible[j];
      if (
        bondBetween(bonds, a, b)?.kind === "clash" &&
        next.projects.some(
          (p) =>
            !["done", "airing", "ready"].includes(p.stage) &&
            p.staffIds.includes(a.id) &&
            p.staffIds.includes(b.id),
        )
      )
        return create(
          "clash",
          "clash:" + bondKey(a.id, b.id) + ":" + Math.floor(day / 84),
          [a.id, b.id],
          "Creative friction: " + a.name + " and " + b.name,
          "Mediation offers a fresh working start. Their personalities remain their own; friction can return as they work together.",
        );
    }
  const tired = eligible.find(
    (s) =>
      s.stamina < RECOVERY_REQUEST_STAMINA_THRESHOLD &&
      (x.leave[s.id] ?? 0) <= day &&
      !recoveryOnCooldown(s.id),
  );
  if (tired)
    return create(
      "recovery",
      "recovery:" + tired.id + ":" + Math.floor(day / RECOVERY_REQUEST_COOLDOWN_DAYS),
      [tired.id],
      tired.name + " asks for breathing room",
      "Low stamina has become a personal concern. Protected time has a real production opportunity cost.",
    );
  return next;
}
export function resolveStaffStory(
  r: RunState,
  id: string,
  choiceId: string,
): RunState | null {
  const x = expansionOf(r),
    story = x.stories?.find((s) => s.id === id),
    day = gameDay(r);
  if (
    !story ||
    story.status !== "offered" ||
    day > story.expiresDay ||
    story.staffIds.some((id) => !r.staff.some((s) => s.id === id))
  )
    return null;
  const choice = storyChoices[story.kind].find((c) => c.id === choiceId);
  if (!choice || r.cash < choice.cost) return null;
  if (
    choiceId === "mentor" &&
    (r.audienceTest ||
      story.staffIds.some(
        (id) =>
          (x.leave[id] ?? 0) > day ||
          r.trainingJobs.some((j) => j.staffId === id) ||
          r.contractJobs.some((j) => j.staffIds.includes(id)) ||
          x.pitches.some(
            (p) => p.staffId === id && p.status === "developing",
          ) ||
          (x.stories ?? []).some(
            (s) => s.status === "active" && s.staffIds.includes(id),
          ),
      ))
  )
    return null;
  const leave = { ...x.leave };
  let bonds = r.bonds;
  if (["repair", "rest"].includes(choiceId))
    for (const id of story.staffIds)
      leave[id] = Math.max(leave[id] ?? 0, day + 7);
  if (choiceId === "mediate")
    bonds = { ...bonds, [bondKey(story.staffIds[0], story.staffIds[1])]: 0 };
  const delta =
    choiceId === "celebrate"
      ? 5
      : choiceId === "private"
        ? 2
        : ["rest", "repair", "mediate"].includes(choiceId)
          ? 4
          : choiceId === "acknowledge"
            ? 1
            : ["professional", "defer"].includes(choiceId)
              ? -2
              : 0;
  const updated: StaffStory = {
    ...story,
    status: choiceId === "mentor" ? "active" : "resolved",
    decision: choiceId,
    nextDay: day + 14,
    outcome: choiceId === "mentor" ? undefined : choice.label,
  };
  return {
    ...r,
    cash: r.cash - choice.cost,
    bonds,
    staff: r.staff.map((s) =>
      story.staffIds.includes(s.id)
        ? moraleDelta(s, delta)
        : choiceId === "celebrate"
          ? moraleDelta(s, 1)
          : s,
    ),
    expansion: {
      ...x,
      leave,
      stories: (x.stories ?? []).map((s) => (s.id === id ? updated : s)),
    },
    strategicSpend: choice.cost
      ? [
          ...r.strategicSpend,
          {
            id: story.id + ":decision",
            label: story.title,
            amount: choice.cost,
            week: r.week,
          },
        ]
      : r.strategicSpend,
  };
}