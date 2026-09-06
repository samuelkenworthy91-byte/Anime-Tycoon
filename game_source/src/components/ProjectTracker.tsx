import { AlertTriangle, Clock3, KanbanSquare } from "lucide-react";
import type { RunState } from "../engine/state";
import { activeProjects, daysToDeadline, STAGE_LABEL } from "../engine/projects";
import { POINT_COLOR } from "../engine/data";

export default function ProjectTracker({ run, onOpen }: { run: RunState; clockDay: number; onOpen: () => void }) {
  const projects = activeProjects(run.projects);
  if (!projects.length) return null;
  return (
    <div className="relative z-20 shrink-0 border-b border-line/60 bg-panel/92 px-2 py-1 backdrop-blur-md">
      <div className="nice-scroll mx-auto flex max-w-6xl gap-1.5 overflow-x-auto">
        {projects.map((p) => {
          const now = run.day ?? run.week * 7;
          const due = daysToDeadline(p, now);
          const elapsedDays = Math.max(0, now - (p.createdDay ?? p.createdWeek * 7));
          return (
            <button key={p.id} onClick={onOpen} className="btn-press min-w-[285px] flex-1 rounded-lg border border-line/80 bg-panel2/80 px-2.5 py-1.5 text-left sm:min-w-[360px]">
              <div className="flex items-center gap-1.5">
                <KanbanSquare size={11} className="text-cyanx" />
                <span className="min-w-0 flex-1 truncate font-display text-[10px] font-extrabold">{p.draft.title}</span>
                <span className="text-[8px] font-bold text-paper/45">{STAGE_LABEL[p.stage].toUpperCase()}</span>
                <span className={due < 0 ? "text-neon" : due <= 14 ? "text-gold" : "text-paper/45"}>{due < 0 ? <AlertTriangle size={10}/> : <Clock3 size={10}/>}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[9px] font-extrabold tabular-nums">
                <span style={{ color: POINT_COLOR.story }}>STORY {p.points.story}</span>
                <span style={{ color: POINT_COLOR.art }}>ART {p.points.art}</span>
                <span style={{ color: POINT_COLOR.sound }}>SOUND {p.points.sound}</span>
                <span className={p.issues ? "text-gold" : "text-mint"}>NOTES {p.issues}</span>
                <span className="ml-auto text-paper/45">DAY {elapsedDays + 1} · {due < 0 ? `${Math.abs(due)}D LATE` : `${due}D LEFT`}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
