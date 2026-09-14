import { useMemo, useState } from "react";
import { BookOpenCheck, GraduationCap } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  GENRES,
  POINT_COLOR,
  formatGBPShort,
  type GenreId,
  type PointType,
  type Staff,
} from "../engine/data";
import {
  genreExperienceLabel,
  genreExperienceMultiplier,
  genreFamiliarity,
} from "../engine/careers";
import {
  GENRE_COURSES,
  SKILL_COURSES,
  applyGenreTraining,
  applySkillTraining,
  genreTrainingQuote,
  skillTrainingQuote,
  trainingBlockReason,
} from "../engine/training";
import type { RunState } from "../engine/state";
import { cn } from "../utils/cn";

export default function StaffTrainingPanel({
  staff,
  run,
  setRun,
}: {
  staff: Staff;
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
}) {
  const tier = run.facilities.training ?? 0;
  const availableGenres = useMemo(
    () => GENRES.filter((g) => run.genresUnlocked.includes(g.id)),
    [run.genresUnlocked]
  );
  const [genre, setGenre] = useState<GenreId>(availableGenres[0]?.id ?? GENRES[0].id);
  const chosenGenre = availableGenres.find((g) => g.id === genre) ?? availableGenres[0] ?? GENRES[0];
  const familiarity = genreFamiliarity(staff, chosenGenre.id);
  const genreMult = genreExperienceMultiplier(familiarity);
  const generalBlock = trainingBlockReason(run, staff.id, 1);

  if (tier <= 0) return null;

  const doSkill = (focus: PointType, courseId: "foundation" | "advanced" | "masterclass") => {
    const next = applySkillTraining(run, staff.id, focus, courseId);
    if (!next) return;
    sfx.fanfare();
    setRun(() => next);
  };

  const doGenre = (courseId: "familiarity" | "competence" | "specialist") => {
    const next = applyGenreTraining(run, staff.id, chosenGenre.id, courseId);
    if (!next) return;
    sfx.fanfare();
    setRun(() => next);
  };

  return (
    <div className="rounded-xl border border-cyanx/30 bg-cyanx/5 p-2.5">
      <div className="flex items-start gap-2">
        <GraduationCap size={13} className="mt-0.5 shrink-0 text-cyanx" />
        <div className="min-w-0 flex-1">
          <div className="text-[8px] font-black tracking-[0.2em] text-cyanx">TRAINING ROOM · TIER {tier}</div>
          <div className="mt-0.5 text-[8px] leading-relaxed text-paper/45">
            Courses resolve instantly. Higher tiers spend substantially more cash and Research Data for larger gains. Each employee can complete one paid course per industry week.
          </div>
        </div>
      </div>

      {generalBlock && (
        <div className="mt-2 rounded-lg border border-neon/25 bg-neon/5 px-2 py-1.5 text-[8px] font-bold text-neon">
          {generalBlock}
        </div>
      )}

      <div className="mt-2 space-y-2">
        {SKILL_COURSES.map((course) => {
          const unlocked = tier >= course.minTier;
          return (
            <div key={course.id} className={cn("rounded-lg border border-line bg-panel2/45 p-2", !unlocked && "opacity-45")}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[9px] font-black text-paper/80">{course.name.toUpperCase()} · +{course.gain}</div>
                  <div className="text-[7px] text-paper/35">{course.description}</div>
                </div>
                {!unlocked && <span className="shrink-0 text-[7px] font-black text-viol">T{course.minTier} REQUIRED</span>}
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1">
                {(["story", "art", "sound"] as PointType[]).map((focus) => {
                  const quote = skillTrainingQuote(staff, focus, course.id, tier);
                  const affordable = !!quote && run.cash >= quote.cash && run.rd >= quote.rd;
                  return (
                    <Btn
                      key={focus}
                      variant="ghost"
                      className="min-w-0 !px-1 !py-1 text-[7px]"
                      disabled={!quote || !!generalBlock || !affordable}
                      onClick={() => doSkill(focus, course.id)}
                    >
                      <span className="min-w-0 text-center">
                        <span className="block font-black" style={{ color: POINT_COLOR[focus] }}>
                          {focus.toUpperCase()} {quote ? `${quote.current}→${quote.after}` : "MAX"}
                        </span>
                        {quote && <span className="block whitespace-nowrap text-paper/45">{formatGBPShort(quote.cash)} + {quote.rd} RD</span>}
                      </span>
                    </Btn>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 border-t border-line/60 pt-2">
        <div className="flex items-center gap-1 text-[8px] font-black tracking-[0.18em] text-gold">
          <BookOpenCheck size={10} /> PRE-PRODUCTION GENRE TRAINING
        </div>
        <div className="mt-1 text-[8px] text-paper/40">
          Prepare someone for an unfamiliar genre before assigning them. Related genres and existing specialisms are cheaper.
        </div>
        <select
          className="ink-input mt-1.5 w-full px-2 py-1.5 text-[10px] font-bold"
          value={chosenGenre.id}
          onChange={(e) => setGenre(e.target.value as GenreId)}
        >
          {availableGenres.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
        <div className="mt-1 flex items-center justify-between text-[8px] text-paper/45">
          <span>{chosenGenre.label}: <b className="text-paper/70">{genreExperienceLabel(familiarity)}</b></span>
          <span className={genreMult < 1 ? "text-neon" : genreMult > 1 ? "text-mint" : "text-paper/60"}>personal output ×{genreMult.toFixed(2)}</span>
        </div>
        <div className="mt-1.5 grid gap-1 sm:grid-cols-3">
          {GENRE_COURSES.map((course) => {
            const quote = genreTrainingQuote(staff, chosenGenre.id, course.id, tier);
            const unlocked = tier >= course.minTier;
            const affordable = !!quote && run.cash >= quote.cash && run.rd >= quote.rd;
            return (
              <Btn
                key={course.id}
                variant={course.id === "specialist" ? "gold" : "ghost"}
                className="!px-1.5 !py-1 text-[7px]"
                disabled={!quote || !!generalBlock || !affordable}
                onClick={() => doGenre(course.id)}
              >
                <span className="text-center">
                  <span className="block font-black">{course.name.toUpperCase()}</span>
                  {!unlocked ? (
                    <span className="block text-viol">T{course.minTier} REQUIRED</span>
                  ) : quote ? (
                    <>
                      <span className="block text-paper/55">×{quote.currentMultiplier.toFixed(2)}→×{quote.afterMultiplier.toFixed(2)}</span>
                      <span className="block whitespace-nowrap text-paper/40">{formatGBPShort(quote.cash)} + {quote.rd} RD{quote.adjacencyMult < 1 ? " · affinity discount" : ""}</span>
                    </>
                  ) : (
                    <span className="block text-mint">STANDARD MET</span>
                  )}
                </span>
              </Btn>
            );
          })}
        </div>
      </div>
    </div>
  );
}
