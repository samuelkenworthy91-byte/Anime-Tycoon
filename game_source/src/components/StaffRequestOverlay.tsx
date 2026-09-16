import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Btn } from "../fx/fx";
import { dateLabel, formatGBP, GENRES, workerLook } from "../engine/data";
import { respondPoach, respondSalary, type RunState } from "../engine/state";
import { expansionOf, gameDay, pitchAction } from "../engine/studioExpansion";
import { resolveStaffStory, storyChoices } from "../engine/staffStories";
import Portrait from "./Portrait";

type SetRun = (fn: (r: RunState) => RunState) => void;

type PendingRequest =
  | { id: string; kind: "staff"; eventId: string }
  | { id: string; kind: "story"; storyId: string }
  | { id: string; kind: "pitch"; pitchId: string };

export function pendingStaffRequests(run: RunState, dismissed: ReadonlySet<string> = new Set()): PendingRequest[] {
  const x = expansionOf(run);
  const requests: PendingRequest[] = [
    ...run.staffEvents.map((event) => ({ id: `staff:${event.id}`, kind: "staff" as const, eventId: event.id })),
    ...(x.stories ?? [])
      .filter((story) => story.status === "offered" && gameDay(run) <= story.expiresDay)
      .map((story) => ({ id: `story:${story.id}`, kind: "story" as const, storyId: story.id })),
    ...x.pitches
      .filter((pitch) => pitch.status === "offered" || pitch.status === "developed")
      .map((pitch) => ({ id: `pitch:${pitch.id}`, kind: "pitch" as const, pitchId: pitch.id })),
  ];
  return requests.filter((request) => !dismissed.has(request.id));
}

export function totalStaffRequestCount(run: RunState): number {
  return pendingStaffRequests(run).length;
}

export function nextStaffRequestId(run: RunState, dismissed: ReadonlySet<string> = new Set()): string | null {
  return pendingStaffRequests(run, dismissed)[0]?.id ?? null;
}

export default function StaffRequestOverlay({
  run,
  setRun,
  dismissed,
  onDismiss,
}: {
  run: RunState;
  setRun: SetRun;
  dismissed: ReadonlySet<string>;
  onDismiss: (id: string) => void;
}) {
  const request = pendingStaffRequests(run, dismissed)[0];
  if (!request) return null;
  const x = expansionOf(run);
  const act = (fn: (r: RunState) => RunState | null) => setRun((r) => fn(r) ?? r);

  if (request.kind === "staff") {
    const event = run.staffEvents.find((item) => item.id === request.eventId);
    const staff = event ? run.staff.find((item) => item.id === event.staffId) : null;
    if (!event || !staff) return null;
    return (
      <Shell title={event.kind === "raise" ? "PAY REQUEST" : "POACHING APPROACH"} onDismiss={() => onDismiss(request.id)}>
        <Person staff={staff} />
        <p className="mt-3 text-sm leading-relaxed text-paper/70">
          {event.kind === "raise" ? (
            <><b>{staff.name}</b> is asking for <b className="text-gold">{formatGBP(event.amount)}/week</b>. They currently earn {formatGBP(staff.salary)}/week.</>
          ) : (
            <>A rival studio has offered <b>{staff.name}</b> <b className="text-neon2">{formatGBP(event.amount)}/week</b>. You currently pay {formatGBP(staff.salary)}/week.</>
          )}
        </p>
        <p className="mt-1 text-[10px] text-paper/45">Answer by {dateLabel(event.expiresWeek)}. Closing this popup leaves the request in Staff.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {event.kind === "raise" ? <>
            <Btn variant="gold" onClick={() => act((r) => respondSalary(r, event.id, "accept"))}>ACCEPT</Btn>
            <Btn variant="cyan" onClick={() => act((r) => respondSalary(r, event.id, "counter"))}>MEET HALFWAY</Btn>
            <Btn variant="ghost" onClick={() => act((r) => respondSalary(r, event.id, "refuse"))}>REFUSE</Btn>
          </> : <>
            <Btn variant="gold" onClick={() => act((r) => respondPoach(r, event.id, "match"))}>MATCH OFFER</Btn>
            <Btn variant="cyan" onClick={() => act((r) => respondPoach(r, event.id, "promote"))}>PROMOTE</Btn>
            <Btn variant="ghost" onClick={() => act((r) => respondPoach(r, event.id, "release"))}>LET THEM GO</Btn>
          </>}
        </div>
      </Shell>
    );
  }

  if (request.kind === "story") {
    const story = (x.stories ?? []).find((item) => item.id === request.storyId);
    if (!story) return null;
    const primary = run.staff.find((item) => item.id === story.staffIds[0]);
    return (
      <Shell title="STAFF REQUEST" onDismiss={() => onDismiss(request.id)}>
        {primary && <Person staff={primary} />}
        <h3 className="mt-3 font-display text-xl font-black">{story.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-paper/70">{story.text}</p>
        <p className="mt-1 text-[10px] text-paper/45">Respond by day {story.expiresDay}. Closing this popup leaves the request in Staff / Studio Culture.</p>
        <div className="mt-4 grid gap-2">
          {storyChoices[story.kind].map((choice) => (
            <Btn key={choice.id} variant={choice.cost ? "gold" : "ghost"} disabled={run.cash < choice.cost || gameDay(run) > story.expiresDay} onClick={() => act((r) => resolveStaffStory(r, story.id, choice.id))}>
              {choice.label}{choice.cost ? ` · ${formatGBP(choice.cost)}` : ""}
            </Btn>
          ))}
        </div>
      </Shell>
    );
  }

  const pitch = x.pitches.find((item) => item.id === request.pitchId);
  const staff = pitch ? run.staff.find((item) => item.id === pitch.staffId) : null;
  if (!pitch || !staff) return null;
  const genre = GENRES.find((g) => g.id === pitch.genre)?.label ?? pitch.genre;
  return (
    <Shell title="PASSION PROJECT" onDismiss={() => onDismiss(request.id)}>
      <Person staff={staff} />
      <h3 className="mt-3 font-display text-xl font-black">{staff.name} wants to lead a {genre} project</h3>
      <p className="mt-2 text-sm leading-relaxed text-paper/70">{pitch.report ?? "They have brought you an original concept and want a decision on whether the studio should back it."}</p>
      <p className="mt-1 text-[10px] text-paper/45">Closing this popup leaves the pitch in the employee profile / Studio Culture.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {pitch.status === "offered" && <Btn variant="cyan" disabled={run.cash < pitch.cost} onClick={() => act((r) => pitchAction(r, pitch.id, "develop"))}>DEVELOP · {formatGBP(pitch.cost)}</Btn>}
        <Btn variant="gold" onClick={() => act((r) => pitchAction(r, pitch.id, "accept"))}>ACCEPT LEADERSHIP BRIEF</Btn>
        <Btn variant="ghost" onClick={() => act((r) => pitchAction(r, pitch.id, "decline"))}>DECLINE</Btn>
      </div>
    </Shell>
  );
}

function Person({ staff }: { staff: RunState["staff"][number] }) {
  return (
    <div className="flex items-center gap-3">
      <Portrait img={workerLook(staff).portrait} name={staff.name} alt={staff.name} className="h-16 w-16 rounded-xl border border-line object-cover" />
      <div><div className="font-display text-lg font-black">{staff.name}</div><div className="text-[10px] text-paper/45">A decision is waiting for you.</div></div>
    </div>
  );
}

function Shell({ title, onDismiss, children }: { title: string; onDismiss: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[91] flex items-end justify-center bg-abyss/75 p-3 backdrop-blur-sm sm:items-center">
      <div className="anim-pop max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gold/45 bg-panel p-4 shadow-2xl">
        <div className="flex items-center gap-2"><div className="text-[10px] font-extrabold tracking-[0.28em] text-gold">{title}</div><button type="button" aria-label="Deal with this later" title="Deal with this later" onClick={onDismiss} className="btn-press ml-auto rounded-lg border border-line p-1.5 text-paper/50"><X size={16}/></button></div>
        {children}
      </div>
    </div>
  );
}
