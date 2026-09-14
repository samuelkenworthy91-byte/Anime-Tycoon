import { Award, CheckCircle2, Trophy } from "lucide-react";
import { Btn } from "../fx/fx";
import type { RunState } from "../engine/state";
import { acknowledgeNominationAnnouncement, pendingNominationAnnouncement } from "../engine/awardCycle";

export default function AwardsNominationAnnouncement({
  run,
  setRun,
}: {
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
}) {
  const pending = pendingNominationAnnouncement(run);
  if (!pending) return null;

  const playerRows = pending.slate.categories
    .map((category) => ({
      category,
      mine: category.nominees.filter((nominee) => nominee.player),
    }))
    .filter((row) => row.mine.length > 0);
  const total = playerRows.reduce((sum, row) => sum + row.mine.length, 0);

  return (
    <div className="fixed inset-0 z-[108] flex items-center justify-center bg-abyss/92 p-3 backdrop-blur-xl">
      <div className="anim-pop nice-scroll max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-gold/50 bg-panel p-5 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10 text-gold">
            <Trophy size={28} />
          </div>
          <div className="mt-3 text-[10px] font-black tracking-[0.35em] text-gold">THE LONDON ANIME AWARDS</div>
          <h2 className="mt-1 font-display text-3xl font-black">NOMINATIONS ANNOUNCED</h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-paper/55">
            The Year {pending.year} shortlist is now locked. These are the nominations that will carry through to the ceremony.
          </p>
        </div>

        {playerRows.length > 0 ? (
          <div className="mt-5 space-y-2">
            <div className="rounded-xl border border-mint/30 bg-mint/5 px-3 py-2 text-center text-xs font-bold text-mint">
              <CheckCircle2 size={14} className="mr-1 inline" /> Your studio received {total} nomination{total === 1 ? "" : "s"}.
            </div>
            {playerRows.map(({ category, mine }) => (
              <div key={category.id} className="rounded-2xl border border-line bg-panel2/65 p-3">
                <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-gold">
                  <Award size={13} /> {category.name.toUpperCase()}
                </div>
                <div className="mt-1 space-y-1">
                  {mine.map((nominee) => (
                    <div key={`${category.id}-${nominee.sourceId ?? nominee.title}`} className="font-display text-lg font-extrabold text-paper">
                      {nominee.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-line bg-panel2/65 p-4 text-center">
            <div className="font-display text-xl font-extrabold text-paper/75">No player nominations this year</div>
            <p className="mt-1 text-xs leading-relaxed text-paper/45">
              The industry shortlist is still locked now, so the ceremony cannot later reshuffle the field.
            </p>
          </div>
        )}

        <div className="mt-4 text-center text-[9px] leading-relaxed text-paper/40">
          A studio can normally place no more than two productions in one category; the shortlist aims for at least three studios whenever enough qualifying work exists.
        </div>
        <Btn
          big
          variant="gold"
          className="mt-4 w-full"
          onClick={() => setRun((r) => acknowledgeNominationAnnouncement(r, pending.year))}
        >
          CONTINUE
        </Btn>
      </div>
    </div>
  );
}
