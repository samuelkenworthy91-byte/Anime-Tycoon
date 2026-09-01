/* ======================================================================
 *  STUDIO EVENTS — the industry throws curveballs, not just phone calls.
 *
 *  Unlike commission offers (which live on the market screen and answer
 *  yes/no), these are genuine dilemmas: 2–3 responses, each with a real
 *  trade-off in cash, hype, issues, morale or fans. They are rolled on a
 *  slow, irregular cadence (roughly once every couple of months, never
 *  two at once) so they feel like an occasion instead of a nagging popup.
 *
 *  Every effect is concrete and stated on the button — no "+5% and a
 *  thumbs up" here. The player picks the price they're willing to pay.
 * ==================================================================== */

import { moraleDelta, moraleOf } from "./careers";
import type { PointType, Staff } from "./data";
import type { Project } from "./projects";
import type { RunState } from "./state";

export type StudioEventKind =
  | "viral"
  | "leak"
  | "incredible"
  | "argument"
  | "castpopular"
  | "backlash"
  | "convention";

export interface EventChoice {
  id: string;
  label: string;
  /** what this response costs you, in plain words */
  effect: string;
}

export interface StudioEvent {
  id: string;
  kind: StudioEventKind;
  week: number;
  expiresWeek: number;
  text: string;
  choices: EventChoice[];
  /** project the event centres on (may have shipped by the time you answer) */
  projectId?: string;
  franchiseKey?: string;
}

let studioEventSeq = 0;

export interface StudioEventContext {
  crew: { id: string; name: string; role: Staff["role"]; level: number; morale: number }[];
  active: { id: string; title: string; stage: string; hype: number; issues: number }[];
  topFranchise: { key: string; title: string; popularity: number } | null;
}

export function rollStudioEvent(week: number, ctx: StudioEventContext): StudioEvent | null {
  const kinds: StudioEventKind[] = [];
  if (ctx.active.length > 0) kinds.push("viral", "leak", "backlash", "castpopular", "convention");
  if (ctx.crew.length >= 1) kinds.push("incredible");
  if (ctx.crew.length >= 2) kinds.push("argument");
  if (kinds.length === 0) return null;
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  const id = `sev${++studioEventSeq}_${week}`;
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const project = ctx.active.length ? pick(ctx.active) : null;
  const fr = ctx.topFranchise;
  const title = project ? `“${project.title}”` : fr ? `“${fr.title}”` : "your studio";

  switch (kind) {
    case "viral":
      return {
        id,
        kind,
        week,
        expiresWeek: week + 3,
        projectId: project?.id,
        text: `The trailer for ${title} just exploded overnight — trending worldwide. The fans want more, NOW.`,
        choices: [
          { id: "ads", label: "BUY ADS AND RIDE IT", effect: "−£25,000 · +16 hype" },
          { id: "organic", label: "LET IT GROW ORGANICALLY", effect: "+8 hype · free" },
          { id: "meme", label: "LEAN INTO THE MEME", effect: "+12 hype · +2 issues" },
        ],
      };
    case "leak":
      return {
        id,
        kind,
        week,
        expiresWeek: week + 3,
        projectId: project?.id,
        text: `A rough cut of ${title} leaked online. Half the fandom loves it; the rest are spoiling it everywhere.`,
        choices: [
          { id: "preview", label: "CALL IT A ‘SURPRISE PREVIEW’", effect: "+8 hype · +2 issues" },
          { id: "legal", label: "SEND THE LAWYERS", effect: "−£30,000 · −2 hype" },
          { id: "reshoot", label: "RESHOOT THE ENDING", effect: "−£50,000 · +8 Story · +4 hype" },
        ],
      };
    case "incredible":
      return {
        id,
        kind,
        week,
        expiresWeek: week + 3,
        projectId: project?.id,
        text: `One of your animators just delivered a single scene so stunning the whole studio has gone quiet watching it on loop.`,
        choices: [
          { id: "bonus", label: "PAY THEM A BONUS", effect: "−£15,000 · +6 Art · +4 morale" },
          { id: "showcase", label: "PUT IT IN THE TRAILER", effect: "+5 hype" },
          { id: "private", label: "KEEP IT QUIET", effect: "no cost · no reward" },
        ],
      };
    case "argument":
      return {
        id,
        kind,
        week,
        expiresWeek: week + 3,
        text: `Two senior staff are shouting at each other in the kitchen. This has stopped being about the work.`,
        choices: [
          { id: "mediate", label: "MEDIATE", effect: "−£5,000 · +3 morale ×2" },
          { id: "side", label: "BACK THE SENIOR ONE", effect: "+6 morale to one · −8 to the other" },
          { id: "ignore", label: "LET THEM FIGHT IT OUT", effect: "−4 morale ×2" },
        ],
      };
    case "castpopular":
      return {
        id,
        kind,
        week,
        expiresWeek: week + 3,
        projectId: project?.id,
        franchiseKey: project ? undefined : fr?.key,
        text: `The voice of your lead on ${title} has blown up on social media — talent agencies are already circling.`,
        choices: [
          { id: "spinoff", label: "LOCK IN A SPIN-OFF", effect: "+10 hype · +1 issue" },
          { id: "pay", label: "PAY THEM NOW", effect: "−£40,000 · +12 hype" },
          { id: "ride", label: "RIDE THE BUZZ", effect: "+5 hype · free" },
        ],
      };
    case "backlash":
      return {
        id,
        kind,
        week,
        expiresWeek: week + 3,
        projectId: project?.id,
        text: `A loud corner of the fandom is furious about the direction of ${title} and organising a boycott.`,
        choices: [
          { id: "adjust", label: "APOLOGISE & ADJUST", effect: "−£25,000 · −4 hype · +2 issues · +3,000 fans" },
          { id: "double", label: "DOUBLE DOWN", effect: "+3 hype · −6,000 fans" },
          { id: "ignore", label: "IGNORE IT", effect: "−8 hype" },
        ],
      };
    case "convention":
      return {
        id,
        kind,
        week,
        expiresWeek: week + 3,
        projectId: project?.id,
        franchiseKey: project ? undefined : fr?.key,
        text: `A major convention wants ${title} on the main stage this season — your biggest public moment of the year.`,
        choices: [
          { id: "cast", label: "SEND THE FULL CAST", effect: "−£30,000 · +12 hype · +4,000 fans" },
          { id: "teaser", label: "SEND A TEASER REEL", effect: "−£10,000 · +5 hype" },
          { id: "skip", label: "SKIP THIS YEAR", effect: "no cost · no reward" },
        ],
      };
  }
}

/* ------------------------------------------------------------ resolve */

const addPoints = (p: Project, t: PointType, n: number): Project => ({
  ...p,
  points: { ...p.points, [t]: p.points[t] + n },
});

/** apply a chosen response. Returns the new state, or null if unknown. */
export function resolveStudioEvent(run: RunState, eventId: string, choiceId: string): RunState | null {
  const ev = (run.studioEvents ?? []).find((x) => x.id === eventId);
  if (!ev) return null;
  const choice = ev.choices.find((c) => c.id === choiceId);
  if (!choice) return null;
  const rest = (run.studioEvents ?? []).filter((x) => x.id !== eventId);

  let cash = run.cash;
  let fans = run.fans;
  let notices = [...run.notices];
  let staff = run.staff;
  let projects = run.projects;
  let franchises = { ...run.franchises };

  const proj = ev.projectId ? projects.find((p) => p.id === ev.projectId) : undefined;
  const fr = ev.franchiseKey ? franchises[ev.franchiseKey] : undefined;
  const spend = (n: number) => {
    cash -= n;
    return `−£${n.toLocaleString("en-GB")}`;
  };

  const patchProject = (fn: (p: Project) => Project) => {
    if (!proj) return;
    projects = projects.map((p) => (p.id === proj.id ? fn(p) : p));
  };

  switch (ev.kind) {
    case "viral": {
      if (choiceId === "ads") {
        const c = spend(25_000);
        patchProject((p) => ({ ...p, hype: Math.min(100, p.hype + 16) }));
        notices.push(`You pump ads into the viral wave: ${c}, +16 hype.`);
      } else if (choiceId === "organic") {
        patchProject((p) => ({ ...p, hype: Math.min(100, p.hype + 8) }));
        notices.push(`The buzz grows on its own — +8 hype, no spend.`);
      } else {
        patchProject((p) => ({ ...p, hype: Math.min(100, p.hype + 12), issues: p.issues + 2 }));
        notices.push(`You lean into the meme — +12 hype, but the team scrambles (+2 issues).`);
      }
      break;
    }
    case "leak": {
      if (choiceId === "preview") {
        patchProject((p) => ({ ...p, hype: Math.min(100, p.hype + 8), issues: p.issues + 2 }));
        notices.push(`You rebrand the leak a ‘surprise preview’ — +8 hype, +2 issues to patch.`);
      } else if (choiceId === "legal") {
        const c = spend(30_000);
        patchProject((p) => ({ ...p, hype: Math.max(0, p.hype - 2) }));
        notices.push(`The lawyers shut the leak down (${c}) — but the story cools (−2 hype).`);
      } else {
        const c = spend(50_000);
        patchProject((p) => addPoints({ ...p, hype: Math.min(100, p.hype + 4) }, "story", 8));
        notices.push(`You reshoot the ending (${c}): +8 Story, +4 hype. A better show, a heavier bill.`);
      }
      break;
    }
    case "incredible": {
      const animators = staff.filter((s) => s.role === "animator");
      if (choiceId === "bonus") {
        const c = spend(15_000);
        patchProject((p) => addPoints(p, "art", 6));
        if (animators.length) {
          const a = animators[Math.floor(Math.random() * animators.length)];
          staff = staff.map((s) => (s.id === a.id ? moraleDelta(s, 4) : s));
          notices.push(`You pay the animator a bonus (${c}): +6 Art on the show, and ${a.name}'s morale +4.`);
        } else {
          notices.push(`You pay a bonus (${c}) and bank the scene as +6 Art on the show.`);
        }
      } else if (choiceId === "showcase") {
        patchProject((p) => ({ ...p, hype: Math.min(100, p.hype + 5) }));
        notices.push(`The scene headlines your trailer — +5 hype.`);
      } else {
        notices.push(`You keep it quiet. The animator shrugs it off — for now.`);
      }
      break;
    }
    case "argument": {
      const sorted = [...staff].sort((a, b) => moraleOf(a) - moraleOf(b));
      if (choiceId === "mediate") {
        const c = spend(5_000);
        const two = sorted.slice(0, 2);
        staff = staff.map((s) => (two.some((t) => t.id === s.id) ? moraleDelta(s, 3) : s));
        notices.push(`You mediate (${c}) and clear the air — +3 morale for both.`);
      } else if (choiceId === "side") {
        const senior = [...staff].sort((a, b) => b.level - a.level)[0];
        const junior = [...staff].sort((a, b) => a.level - b.level)[0];
        if (senior && junior && senior.id !== junior.id) {
          staff = staff.map((s) => (s.id === senior.id ? moraleDelta(s, 6) : s.id === junior.id ? moraleDelta(s, -8) : s));
          notices.push(`You back ${senior.name} (+6 morale) — ${junior.name} feels frozen out (−8).`);
        } else {
          notices.push(`You pick a side, but the room is too small for a clean split.`);
        }
      } else {
        const two = sorted.slice(0, 2);
        staff = staff.map((s) => (two.some((t) => t.id === s.id) ? moraleDelta(s, -4) : s));
        notices.push(`You let it fester — both of them lose morale.`);
      }
      break;
    }
    case "castpopular": {
      if (choiceId === "spinoff") {
        if (proj) {
          patchProject((p) => ({ ...p, hype: Math.min(100, p.hype + 10), issues: p.issues + 1 }));
          notices.push(`You lock in a spin-off — +10 hype, but scope creeps (+1 issue).`);
        } else if (fr) {
          franchises = { ...franchises, [fr.key]: { ...fr, popularity: Math.min(100, fr.popularity + 4) } };
          notices.push(`You announce a spin-off — “${fr.baseTitle}” +4 popularity.`);
        }
      } else if (choiceId === "pay") {
        const c = spend(40_000);
        if (proj) patchProject((p) => ({ ...p, hype: Math.min(100, p.hype + 12) }));
        else if (fr) franchises = { ...franchises, [fr.key]: { ...fr, popularity: Math.min(100, fr.popularity + 3) } };
        notices.push(`You pay the lead's new rate (${c}) before the agencies move — +12 hype.`);
      } else {
        if (proj) patchProject((p) => ({ ...p, hype: Math.min(100, p.hype + 5) }));
        notices.push(`You ride the buzz and hope — +5 hype, no spend.`);
      }
      break;
    }
    case "backlash": {
      if (choiceId === "adjust") {
        const c = spend(25_000);
        patchProject((p) => ({ ...p, hype: Math.max(0, p.hype - 4), issues: p.issues + 2 }));
        fans += 3_000;
        notices.push(`You apologise and adjust (${c}): −4 hype, +2 issues, but the community respects it (+3,000 fans).`);
      } else if (choiceId === "double") {
        patchProject((p) => ({ ...p, hype: Math.min(100, p.hype + 3) }));
        fans = Math.max(0, fans - 6_000);
        notices.push(`You double down — the core fans roar (+3 hype), the rest walk (−6,000 fans).`);
      } else {
        patchProject((p) => ({ ...p, hype: Math.max(0, p.hype - 8) }));
        notices.push(`You ignore the backlash — hype bleeds (−8).`);
      }
      break;
    }
    case "convention": {
      if (choiceId === "cast") {
        const c = spend(30_000);
        if (proj) patchProject((p) => ({ ...p, hype: Math.min(100, p.hype + 12) }));
        else if (fr) franchises = { ...franchises, [fr.key]: { ...fr, popularity: Math.min(100, fr.popularity + 6) } };
        fans += 4_000;
        notices.push(`Your full cast owns the main stage (${c}): +12 hype, +4,000 fans.`);
      } else if (choiceId === "teaser") {
        const c = spend(10_000);
        if (proj) patchProject((p) => ({ ...p, hype: Math.min(100, p.hype + 5) }));
        else if (fr) franchises = { ...franchises, [fr.key]: { ...fr, popularity: Math.min(100, fr.popularity + 3) } };
        notices.push(`A teaser reel plays to a packed hall (${c}) — +5 hype.`);
      } else {
        notices.push(`You skip the convention and keep your head down.`);
      }
      break;
    }
  }

  return {
    ...run,
    cash,
    fans,
    notices: notices.slice(-40),
    staff,
    projects,
    franchises,
    studioEvents: rest,
  };
}
