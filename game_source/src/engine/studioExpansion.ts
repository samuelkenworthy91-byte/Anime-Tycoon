import { advanceStaffStories, storyBusyReason, type StaffStory } from "./staffStories";
import type { RunState, Payout } from "./state";
import type { GenreId, StaffRole } from "./data";
import type { Project } from "./projects";
import { moraleDelta } from "./careers";
import { genreTargetFor } from "./genreTargets";
import { generateCreatorVision, visionAlignment, visionEffects, type CreatorVision } from "./creatorVision";

export interface Policies {
  recovery: 0 | 7 | 14;
  profit: 0 | 5 | 10;
  development: 0 | 2 | 4;
}
export interface PromiseRecord {
  id: string;
  staffId: string;
  genre: GenreId;
  role: StaffRole;
  createdDay: number;
  deadlineDay: number;
  status: "active" | "fulfilled" | "broken" | "void";
  projectId?: string;
  extended: boolean;
  editApproved?: boolean;
  vision?: CreatorVision;
  visionAlignment?: number;
  history: string[];
}
export interface Pitch {
  id: string;
  staffId: string;
  genre: GenreId;
  week: number;
  status: "offered" | "developing" | "developed" | "accepted" | "declined";
  progress: number;
  cost: number;
  report?: string;
  developmentDays?: Policies["development"];
  vision?: CreatorVision;
}
export interface ProductionCredit {
  days: number;
  byStaff: Record<string, number>;
  byRole: Partial<Record<StaffRole, number>>;
  roleStaff: Record<string, number>;
  leads: Partial<Record<StaffRole, string>>;
  policy: Policies;
  recoveryGranted: boolean;
}
export interface ProjectAccount {
  cost: number;
  receipts: number;
  poolRate: number;
  paid: number;
  shares: Record<string, number>;
  entitlements: Record<string, number>;
  settled: string[];
}
export interface ExpansionState {
  stories?: StaffStory[];
  lastStoryDay?: number;
  storyDay?: number;
  version: 1;
  introducedDay: number;
  lastDay: number;
  lastPitchWeek: number;
  policies: Policies;
  pendingPolicy: { policies: Policies; day: number } | null;
  policyChangeDay: number;
  leave: Record<string, number>;
  pitches: Pitch[];
  promises: PromiseRecord[];
  credits: Record<string, ProductionCredit>;
  accounts: Record<string, ProjectAccount>;
  history: { id: string; day: number; text: string }[];
}
export const DEFAULT_POLICIES: Policies = {
  recovery: 0,
  profit: 0,
  development: 0,
};
export const gameDay = (r: Pick<RunState, "day" | "week">) =>
  Math.max(r.day ?? 0, r.week * 7);
export function initialExpansion(day = 0): ExpansionState {
  return {
    version: 1,
    introducedDay: day,
    lastDay: day - 1,
    lastPitchWeek: -100,
    policies: { ...DEFAULT_POLICIES },
    pendingPolicy: null,
    policyChangeDay: -1000,
    leave: {},
    pitches: [],
    promises: [],
    credits: {},
    accounts: {},
    history: [],
  };
}
function validPolicies(p: Policies): boolean {
  return (
    !!p &&
    [0, 7, 14].includes(p.recovery) &&
    [0, 5, 10].includes(p.profit) &&
    [0, 2, 4].includes(p.development)
  );
}
export function migrateExpansion(
  raw: ExpansionState | undefined,
  day: number,
): ExpansionState {
  if (!raw || raw.version !== 1) return initialExpansion(day);
  const fresh = initialExpansion(day);
  return {
    ...fresh,
    ...raw,
    policies: validPolicies(raw.policies)
      ? { ...raw.policies }
      : fresh.policies,
    pendingPolicy:
      raw.pendingPolicy && validPolicies(raw.pendingPolicy.policies)
        ? raw.pendingPolicy
        : null,
    leave: { ...(raw.leave ?? {}) },
    pitches: Array.isArray(raw.pitches) ? raw.pitches : [],
    promises: Array.isArray(raw.promises) ? raw.promises : [],
    credits: { ...(raw.credits ?? {}) },
    accounts: Object.fromEntries(
      Object.entries(raw.accounts ?? {}).map(([id, a]) => [
        id,
        { ...a, settled: a.settled ?? [] },
      ]),
    ),
    history: Array.isArray(raw.history) ? raw.history : [],
  };
}
export const expansionOf = (r: RunState) =>
  r.expansion ?? initialExpansion(gameDay(r));
function write(r: RunState, x: ExpansionState): RunState {
  return { ...r, expansion: x };
}
function event(
  x: ExpansionState,
  id: string,
  day: number,
  text: string,
): ExpansionState {
  return x.history.some((h) => h.id === id)
    ? x
    : { ...x, history: [...x.history, { id, day, text }].slice(-180) };
}
export function policyChangeBlock(r: RunState): string | null {
  const x = expansionOf(r);
  return x.pendingPolicy
    ? "A policy change is already scheduled"
    : gameDay(r) < x.policyChangeDay + 28
      ? "Policies can change once every four weeks"
      : null;
}
export function schedulePolicies(
  r: RunState,
  policies: Policies,
): RunState | null {
  if (!validPolicies(policies) || policyChangeBlock(r)) return null;
  const x = expansionOf(r),
    day = (Math.floor(gameDay(r) / 28) + 1) * 28;
  return write(
    r,
    event(
      {
        ...x,
        pendingPolicy: { policies: { ...policies }, day },
        policyChangeDay: gameDay(r),
      },
      "policy:" + gameDay(r),
      gameDay(r),
      "Working policies agreed for day " +
        day +
        ". Existing production agreements are protected.",
    ),
  );
}
export function expansionBusyReason(
  r: RunState,
  id: string,
  day = gameDay(r),
): string | null {
  const x = expansionOf(r);
  if (storyBusyReason(r,id,day)) return "Paid mentorship";
  if ((x.leave[id] ?? 0) > day)
    return "Protected recovery until day " + x.leave[id];
  if (
    x.pitches.some(
      (p) =>
        p.staffId === id &&
        p.status === "developing" &&
        (!(p.developmentDays ?? x.policies.development) ||
          day % 28 < (p.developmentDays ?? x.policies.development)),
    )
  )
    return "Paid creative development";
  return null;
}
export function snapshotProduction(r: RunState, p: Project): RunState {
  const x = expansionOf(r);
  if (x.credits[p.id]) return r;
  const credit: ProductionCredit = {
    days: 0,
    byStaff: {},
    byRole: {},
    roleStaff: {},
    leads: {},
    policy: { ...x.policies },
    recoveryGranted: false,
  };
  return write(r, { ...x, credits: { ...x.credits, [p.id]: credit } });
}
export function promiseLeadership(
  r: RunState,
  staffId: string,
  genre: GenreId,
): RunState | null {
  const x = expansionOf(r),
    staff = r.staff.find((s) => s.id === staffId),
    day = gameDay(r);
  if (
    !staff ||
    !r.genresUnlocked.includes(genre) ||
    x.promises.some(
      (p) =>
        p.staffId === staffId &&
        (p.status === "active" || p.createdDay === day),
    )
  )
    return null;
  const promise: PromiseRecord = {
    id: "promise:" + staffId + ":" + day,
    staffId,
    genre,
    role: staff.role,
    createdDay: day,
    deadlineDay: day + 336,
    status: "active",
    extended: false,
    history: [
      "Agreed: release an original production with at least 60% department participation.",
    ],
  };
  return write(
    r,
    event(
      { ...x, promises: [...x.promises, promise] },
      promise.id,
      day,
      staff.name + " was promised leadership in " + genre + ".",
    ),
  );
}
export function renegotiatePromise(r: RunState, id: string): RunState | null {
  const x = expansionOf(r),
    p = x.promises.find((p) => p.id === id);
  if (!p || p.status !== "active" || p.extended || gameDay(r) > p.deadlineDay)
    return null;
  return {
    ...write(r, {
      ...x,
      promises: x.promises.map((a) =>
        a.id === id
          ? {
              ...a,
              extended: true,
              deadlineDay: a.deadlineDay + 84,
              history: [...a.history, "Agreed 12-week extension."],
            }
          : a,
      ),
    }),
    staff: r.staff.map((s) => (s.id === p.staffId ? moraleDelta(s, -3) : s)),
  };
}
export function appointCreativeLead(
  r: RunState,
  projectId: string,
  promiseId: string,
): RunState | null {
  const x = expansionOf(r),
    promise = x.promises.find((p) => p.id === promiseId);
  const p = r.projects.find((p) => p.id === projectId),
    c = x.credits[projectId];
  if (
    !p ||
    !c ||
    !promise ||
    promise.status !== "active" ||
    p.draft.licensedIpId ||
    p.draft.continuation ||
    p.commission ||
    !p.draft.genres.includes(promise.genre) ||
    !p.staffIds.includes(promise.staffId) ||
    expansionBusyReason(r, promise.staffId) ||
    (promise.projectId && promise.projectId !== projectId) ||
    (c.leads[promise.role] && c.leads[promise.role] !== promise.staffId)
  )
    return null;
  if (promise.projectId === projectId && c.leads[promise.role] === promise.staffId)
    return r;
  const total = c.byRole[promise.role] ?? 0,
    creatorDays = c.roleStaff[promise.staffId] ?? 0,
    share = total > 0 ? creatorDays / total : 0;
  const earlyAppointment = p.stage === "concept" && total === 0;
  const earnedLateAppointment =
    !["airing", "done"].includes(p.stage) && total > 0 && share >= 0.6;
  if (!earlyAppointment && !earnedLateAppointment) return null;
  const alignment = promise.vision ? visionAlignment(p.draft, promise.vision) : null;
  const effects = alignment ? visionEffects(alignment) : null;
  return {
    ...write(r, {
      ...x,
      promises: x.promises.map((a) =>
        a.id === promiseId
          ? {
              ...a,
              projectId,
              visionAlignment: alignment?.score,
              history: [
                ...a.history,
                earnedLateAppointment && !earlyAppointment
                  ? "Named as department lead after earning at least 60% of recorded department participation."
                  : "Named as department lead before department production began.",
                ...(alignment
                  ? ["Creator vision alignment locked at " + alignment.score + "% (" + effects!.label + ")."]
                  : []),
              ],
            }
          : a,
      ),
      credits: {
        ...x.credits,
        [projectId]: {
          ...c,
          leads: { ...c.leads, [promise.role]: promise.staffId },
        },
      },
    }),
    staff: effects
      ? r.staff.map((s) => s.id === promise.staffId ? moraleDelta(s, effects.moraleDelta) : s)
      : r.staff,
  };
}
export function pitchAction(
  r: RunState,
  id: string,
  action: "develop" | "accept" | "decline" | "cancel",
): RunState | null {
  const x = expansionOf(r),
    pitch = x.pitches.find((p) => p.id === id);
  if (!pitch || !r.staff.some((s) => s.id === pitch.staffId)) return null;
  if (action === "cancel" && pitch.status === "developing")
    return write(
      r,
      event(
        {
          ...x,
          pitches: x.pitches.map((p) =>
            p.id === id ? { ...p, status: "declined" } : p,
          ),
        },
        id + ":cancel",
        gameDay(r),
        "Development cancelled; committed expenditure is not refundable.",
      ),
    );
  if (!["offered", "developed"].includes(pitch.status) || action === "cancel")
    return null;
  if (action === "develop") {
    if (
      pitch.status !== "offered" ||
      r.cash < pitch.cost ||
      expansionBusyReason(r, pitch.staffId) ||
      (!x.policies.development &&
        r.projects.some(
          (p) =>
            p.staffIds.includes(pitch.staffId) &&
            !["done", "airing"].includes(p.stage),
        )) ||
      (!x.policies.development &&
        r.contractJobs.some((j) => j.staffIds.includes(pitch.staffId))) ||
      r.trainingJobs.some((j) => j.staffId === pitch.staffId) ||
      r.audienceTest
    )
      return null;
    return {
      ...write(r, {
        ...x,
        pitches: x.pitches.map((p) =>
          p.id === id
            ? {
                ...p,
                status: "developing",
                developmentDays: x.policies.development,
              }
            : p,
        ),
      }),
      cash: r.cash - pitch.cost,
      strategicSpend: [
        ...r.strategicSpend,
        {
          id: id + ":development",
          week: r.week,
          amount: pitch.cost,
          label: "Passion-project development",
        },
      ],
    };
  }
  if (action === "accept") {
    const next = promiseLeadership(r, pitch.staffId, pitch.genre);
    if (!next) return null;
    const nx = expansionOf(next);
    return write(next, {
      ...nx,
      promises: nx.promises.map((p) =>
        p.staffId === pitch.staffId && p.status === "active" && p.createdDay === gameDay(r)
          ? { ...p, vision: pitch.vision }
          : p,
      ),
      pitches: x.pitches.map((p) =>
        p.id === id ? { ...p, status: "accepted" } : p,
      ),
    });
  }
  return write(
    r,
    event(
      {
        ...x,
        pitches: x.pitches.map((p) =>
          p.id === id ? { ...p, status: "declined" } : p,
        ),
      },
      id + ":decline",
      gameDay(r),
      "Pitch declined without making a promise.",
    ),
  );
}
export function recallStaff(r: RunState, id: string): RunState | null {
  const x = expansionOf(r);
  if ((x.leave[id] ?? 0) <= gameDay(r)) return null;
  return {
    ...write(
      r,
      event(
        { ...x, leave: { ...x.leave, [id]: gameDay(r) } },
        "recall:" + id + ":" + gameDay(r),
        gameDay(r),
        "Protected recovery was recalled: " +
          (r.staff.find((s) => s.id === id)?.name ?? id),
      ),
    ),
    staff: r.staff.map((s) => (s.id === id ? moraleDelta(s, -8) : s)),
  };
}
const stageRole = (p: Project): StaffRole | null =>
  p.stage === "concept" || p.stage === "preprod"
    ? "writer"
    : p.stage === "animation"
      ? "animator"
      : p.stage === "sound"
        ? "composer"
        : null;
function grantRecovery(r: RunState, projectId: string): RunState {
  const x = expansionOf(r),
    c = x.credits[projectId];
  if (!c || c.recoveryGranted) return r;
  const leave = { ...x.leave };
  let staff = r.staff;
  for (const [id, days] of Object.entries(c.byStaff))
    if (days >= Math.max(1, c.days * 0.25) && c.policy.recovery) {
      leave[id] = Math.max(leave[id] ?? 0, gameDay(r) + c.policy.recovery);
      staff = staff.map((s) =>
        s.id === id ? moraleDelta(s, c.policy.recovery === 14 ? 5 : 3) : s,
      );
    }
  return {
    ...r,
    staff,
    expansion: {
      ...x,
      leave,
      credits: { ...x.credits, [projectId]: { ...c, recoveryGranted: true } },
    },
  };
}
/** Calendar time, not real-world time. Calling twice on the same day is harmless. */
export function advanceExpansionDay(r: RunState): RunState {
  let x = expansionOf(r);
  const day = gameDay(r);
  if (day <= x.lastDay) return r;
  x = { ...x, lastDay: day, credits: { ...x.credits } };
  if (x.pendingPolicy && day >= x.pendingPolicy.day)
    x = { ...x, policies: x.pendingPolicy.policies, pendingPolicy: null };
  let staff = r.staff;
  for (const p of r.projects) {
    const old = x.credits[p.id];
    if (
      !old ||
      ["ready", "airing", "done"].includes(p.stage) ||
      p.milestone ||
      r.audienceTest
    )
      continue;
    const role = stageRole(p);
    const c = {
      ...old,
      days: old.days + 1,
      byStaff: { ...old.byStaff },
      byRole: { ...old.byRole },
      roleStaff: { ...old.roleStaff },
    };
    if (role) c.byRole[role] = (c.byRole[role] ?? 0) + 1;
    for (const id of p.staffIds) {
      const s = staff.find((s) => s.id === id);
      if (
        !s ||
        expansionBusyReason({ ...r, expansion: x }, id, day) ||
        r.staffResting[id] ||
        s.stamina <= 0 ||
        r.trainingJobs.some((j) => j.staffId === id) ||
        r.contractJobs.some((j) => j.staffIds.includes(id))
      )
        continue;
      c.byStaff[id] = (c.byStaff[id] ?? 0) + 1;
      if (role && s.role === role) c.roleStaff[id] = (c.roleStaff[id] ?? 0) + 1;
    }
    x.credits[p.id] = c;
  }
  x.pitches = x.pitches.map((p) => {
    if (p.status !== "developing") return p;
    if (!staff.some((s) => s.id === p.staffId))
      return { ...p, status: "declined" as const };
    const reserved = p.developmentDays ?? x.policies.development;
    if (
      r.audienceTest ||
      (x.leave[p.staffId] ?? 0) > day ||
      (reserved && day % 28 >= reserved)
    )
      return p;
    const progress = p.progress + 1;
    return progress >= 28
      ? {
          ...p,
          progress,
          status: "developed" as const,
          report:
            "Prototype completed. Single-genre direction for " +
            p.genre +
            ": story / art / sound " +
            genreTargetFor([p.genre]).ideal.join(" / ") +
            ". Combining genres changes the target. This research does not guarantee acclaim.",
        }
      : { ...p, progress };
  });
  const promises = x.promises.map((p) => {
    if (p.status !== "active") return p;
    if (!staff.some((s) => s.id === p.staffId)) {
      const retired = r.legends.some((l) => l.staffId === p.staffId);
      x = event(
        x,
        p.id + ":departure",
        day,
        "The creator's leadership commitment ended on " +
          (retired ? "retirement." : "departure."),
      );
      return {
        ...p,
        status: retired ? ("void" as const) : ("broken" as const),
        history: [...p.history, "Employee left the active studio."],
      };
    }
    if (day <= p.deadlineDay) return p;
    staff = staff.map((s) => (s.id === p.staffId ? moraleDelta(s, -10) : s));
    x = event(
      x,
      p.id + ":broken",
      day,
      "Leadership promise missed: " +
        (staff.find((s) => s.id === p.staffId)?.name ?? p.staffId),
    );
    return {
      ...p,
      status: "broken" as const,
      history: [...p.history, "Deadline passed without a qualifying release."],
    };
  });
  x = { ...x, promises };
  const week = Math.floor(day / 7);
  if (
    week % 4 === 0 &&
    day % 7 === 0 &&
    week - x.lastPitchWeek >= 8 &&
    x.pitches.filter((p) =>
      ["offered", "developing", "developed"].includes(p.status),
    ).length < 2
  ) {
    const eligible = staff
      .filter(
        (s) =>
          week - (s.joinedWeek ?? week) >= 24 &&
          week - (s.lastRequestWeek ?? -1000) >= 144 &&
          (s.shows?.length ?? 0) >= 2 &&
          !x.promises.some(
            (p) => p.staffId === s.id && p.status === "active",
          ) &&
          !x.pitches.some(
            (p) =>
              p.staffId === s.id &&
              (week - p.week < 48 ||
                ["offered", "developing", "developed"].includes(p.status)),
          ),
      )
      .sort(
        (a, b) =>
          Math.max(
            -100,
            ...x.pitches.filter((p) => p.staffId === a.id).map((p) => p.week),
          ) -
            Math.max(
              -100,
              ...x.pitches.filter((p) => p.staffId === b.id).map((p) => p.week),
            ) || a.id.localeCompare(b.id),
      );
    const s = eligible[0],
      genre =
        s &&
        (r.genresUnlocked.includes(s.favGenre!)
          ? s.favGenre
          : r.genresUnlocked[0]);
    if (s && genre) {
      const pitch: Pitch = {
        id: "pitch:" + s.id + ":" + week,
        staffId: s.id,
        genre,
        week,
        status: "offered",
        progress: 0,
        cost: Math.round(8000 * (1 + r.officeLevel * 0.75)),
        vision: generateCreatorVision("pitch:" + s.id + ":" + week, genre, r.genresUnlocked, s),
      };
      staff = staff.map((employee) =>
        employee.id === s.id ? { ...employee, lastRequestWeek: week } : employee
      );
      x = event(
        { ...x, pitches: [...x.pitches, pitch], lastPitchWeek: week },
        pitch.id,
        day,
        s.name + " has pitched an original " + genre + " production. They will not make another personal request for three years.",
      );
    }
  }
  let next: RunState = { ...r, staff, expansion: x };
  for (const p of r.projects)
    if (["ready", "airing", "done"].includes(p.stage))
      next = grantRecovery(next, p.id);
  return advanceStaffStories(next);
}
export function finishExpansionProduction(r: RunState, p: Project): RunState {
  let x = expansionOf(r);
  const c = x.credits[p.id];
  if (!c) return r;
  let staff = r.staff;
  const promises = x.promises.map((a) => {
    const total = c.byRole[a.role] ?? 0,
      days = c.roleStaff[a.staffId] ?? 0;
    if (
      a.status !== "active" ||
      a.projectId !== p.id ||
      gameDay(r) > a.deadlineDay ||
      c.leads[a.role] !== a.staffId ||
      total <= 0 ||
      days / total < 0.6 ||
      !r.staff.some((s) => s.id === a.staffId)
    )
      return a;
    staff = staff.map((s) => (s.id === a.staffId ? moraleDelta(s, 8) : s));
    x = event(
      x,
      a.id + ":fulfilled",
      gameDay(r),
      (staff.find((s) => s.id === a.staffId)?.name ?? a.staffId) +
        " delivered their promised production. " +
        ((p.result?.total ?? 0) >= 27
          ? "A breakthrough to remember."
          : "The opportunity was honoured even though acclaim was not guaranteed."),
    );
    return {
      ...a,
      status: "fulfilled" as const,
      history: [
        ...a.history,
        "Released with " +
          Math.round((days / total) * 100) +
          "% department participation.",
      ],
    };
  });
  const account = x.accounts[p.id] ?? {
    cost: p.spent,
    receipts: p.commission?.advance ?? 0,
    poolRate: c.policy.profit,
    paid: 0,
    shares: { ...c.byStaff },
    entitlements: {},
    settled: [],
  };
  return grantRecovery(
    {
      ...r,
      staff,
      expansion: {
        ...x,
        promises,
        accounts: { ...x.accounts, [p.id]: account },
      },
    },
    p.id,
  );
}
/** Deducts the staff pool; the existing payout mechanism credits the receipt itself. */
export function settleProjectReceipt(r: RunState, payout: Payout): RunState {
  if (!payout.sourceProjectId) return r;
  const x = expansionOf(r),
    account = x.accounts[payout.sourceProjectId];
  if (!account) return r;
  const receiptId = [
    payout.sourceReleaseId ?? "domestic",
    payout.instalment ?? "cash",
    payout.week,
  ].join(":");
  if (account.settled.includes(receiptId)) return r;
  const cost = Math.max(
    account.cost,
    r.projects.find((p) => p.id === payout.sourceProjectId)?.spent ?? 0,
  );
  const receipts = account.receipts + Math.max(0, payout.amount);
  const bonus = Math.max(
    0,
    Math.floor((Math.max(0, receipts - cost) * account.poolRate) / 100) -
      account.paid,
  );
  const entitlements = { ...account.entitlements },
    ids = Object.keys(account.shares)
      .filter((id) => account.shares[id] > 0)
      .sort();
  const total = ids.reduce((sum, id) => sum + account.shares[id], 0);
  let allocated = 0;
  for (const [i, id] of ids.entries()) {
    const amount =
      i === ids.length - 1
        ? bonus - allocated
        : Math.floor((bonus * account.shares[id]) / total);
    allocated += amount;
    entitlements[id] = (entitlements[id] ?? 0) + amount;
  }
  return {
    ...r,
    cash: r.cash - allocated,
    expansion: {
      ...x,
      accounts: {
        ...x.accounts,
        [payout.sourceProjectId]: {
          ...account,
          cost,
          receipts,
          paid: account.paid + allocated,
          entitlements,
          settled: [...account.settled, receiptId],
        },
      },
    },
  };
}
export function approveCreatorEdit(
  r: RunState,
  projectId: string,
): RunState | null {
  const x = expansionOf(r),
    promises = x.promises.filter(
      (p) =>
        p.projectId === projectId &&
        p.status === "fulfilled" &&
        !p.editApproved,
    );
  if (
    !promises.length ||
    promises.some((p) => !r.staff.some((s) => s.id === p.staffId))
  )
    return null;
  const ids = new Set(promises.map((p) => p.staffId));
  return {
    ...write(
      r,
      event(
        {
          ...x,
          promises: x.promises.map((p) =>
            promises.includes(p)
              ? {
                  ...p,
                  editApproved: true,
                  history: [
                    ...p.history,
                    "Agreed a limited overseas broadcast edit; original cut preserved.",
                  ],
                }
              : p,
          ),
        },
        "edit-consent:" + projectId,
        gameDay(r),
        "Creators approved an overseas edition. The original remains intact.",
      ),
    ),
    staff: r.staff.map((s) => (ids.has(s.id) ? moraleDelta(s, -3) : s)),
  };
}
