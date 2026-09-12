from pathlib import Path

p = Path('src/components/Create.tsx')
s = p.read_text()

anchor = '''  }, [d.genres, d.arcs, run, run.arcGenreKnowledge]);

  const searchableArcs = useMemo('''
insert = '''  }, [d.genres, d.arcs, run, run.arcGenreKnowledge]);

  /** One-tap story plan built strictly from knowledge the studio has earned.
   *  Individual arcs must be known GOOD/STRONG for every selected genre.
   *  Known positive structures can contribute their full ordered sequence as
   *  long as none of their arcs has a revealed genre risk. Known clashes are
   *  never introduced by the shortcut. */
  const researchedArcPlan = useMemo(() => {
    if (!d.genres.length) return [] as string[];

    const knownGood = ARCS
      .filter((arc) => !arcLockReason(arc, run))
      .map((arc) => {
        const scores = d.genres.map((genre) => {
          const known = (run.arcGenreKnowledge[arcGenreKey(arc.id, genre)] ?? 0) > 0;
          return known ? arcGenreFit(arc, genre).score : null;
        });
        if (scores.some((score) => score === null)) return null;
        const clean = scores as number[];
        const worst = Math.min(...clean);
        if (worst < 1) return null;
        return { arc, worst, total: clean.reduce((sum, score) => sum + score, 0) };
      })
      .filter((row): row is NonNullable<typeof row> => !!row)
      .sort((a, b) => b.worst - a.worst || b.total - a.total || a.arc.name.localeCompare(b.arc.name));

    const plan: string[] = [];
    const createsKnownClash = (ids: string[]) =>
      arcClashesFor(ids).some((clash) => run.arcCombos.includes(clash.id));
    const hasKnownGenreRisk = (arcId: string) => {
      const arc = ARCS.find((item) => item.id === arcId);
      if (!arc || arcLockReason(arc, run)) return true;
      return d.genres.some((genre) => {
        const known = (run.arcGenreKnowledge[arcGenreKey(arc.id, genre)] ?? 0) > 0;
        return known && arcGenreFit(arc, genre).score < 0;
      });
    };

    const knownStructures = ARC_COMBOS
      .filter((combo) => run.arcCombos.includes(combo.id) && (combo.q > 0 || combo.f > 0))
      .filter((combo) => combo.arcs.every((id) => !hasKnownGenreRisk(id)))
      .sort((a, b) => (b.q + b.f * 100) - (a.q + a.f * 100) || b.arcs.length - a.arcs.length);

    for (const combo of knownStructures) {
      const fresh = combo.arcs.filter((id) => !plan.includes(id));
      if (!fresh.length || plan.length + fresh.length > arcLimit) continue;
      const trial = [...plan, ...fresh];
      if (createsKnownClash(trial)) continue;
      if (!arcCombosFor(trial).some((known) => known.id === combo.id)) continue;
      plan.push(...fresh);
    }

    for (const { arc } of knownGood) {
      if (plan.length >= arcLimit || plan.includes(arc.id)) continue;
      const trial = [...plan, arc.id];
      if (createsKnownClash(trial)) continue;
      plan.push(arc.id);
    }

    return plan.slice(0, arcLimit);
  }, [d.genres, arcLimit, run]);

  const searchableArcs = useMemo('''
if anchor not in s:
    raise SystemExit('planner insertion anchor not found')
s = s.replace(anchor, insert, 1)

ui_anchor = '''              </div>
              <Section title={`PLAN THE SEASON — PICK 3–${arcLimit} ARCS (${d.arcs.length}/${arcLimit})`}>'''
ui_insert = '''              </div>
              {d.genres.length > 0 && (
                <div className="rounded-2xl border border-mint/35 bg-mint/5 p-3 shadow-lg">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] font-black tracking-[0.18em] text-mint">QUICK STORY PLAN</div>
                      <div className="mt-0.5 text-[10px] text-paper/60">
                        Fill the episode board with arcs proven GOOD/STRONG for every selected genre, plus positive story structures your studio has researched or proven. Known bad structures are avoided.
                      </div>
                      {researchedArcPlan.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {researchedArcPlan.map((id, index) => {
                            const arc = ARCS.find((item) => item.id === id);
                            return arc ? <span key={id} className="rounded border border-line bg-panel2/70 px-1.5 py-0.5 text-[8px] font-bold text-paper/65">{index + 1}. {arc.name}</span> : null;
                          })}
                        </div>
                      )}
                    </div>
                    <Btn
                      variant="primary"
                      className="shrink-0"
                      disabled={researchedArcPlan.length === 0}
                      onClick={() => {
                        sfx.select();
                        set({ arcs: researchedArcPlan });
                      }}
                    >
                      USE KNOWN GOOD PLAN
                    </Btn>
                  </div>
                  {researchedArcPlan.length === 0 && (
                    <div className="mt-1 text-[9px] italic text-paper/40">No safe researched plan yet — research or release more shows to build story knowledge.</div>
                  )}
                  {researchedArcPlan.length > 0 && researchedArcPlan.length < 3 && (
                    <div className="mt-1 text-[9px] italic text-gold">Your studio only knows {researchedArcPlan.length} safe pick{researchedArcPlan.length === 1 ? "" : "s"} for this genre set. Use the shortcut, then choose the remaining arcs manually.</div>
                  )}
                </div>
              )}
              <Section title={`PLAN THE SEASON — PICK 3–${arcLimit} ARCS (${d.arcs.length}/${arcLimit})`}>'''
if ui_anchor not in s:
    raise SystemExit('story intelligence UI anchor not found')
s = s.replace(ui_anchor, ui_insert, 1)
p.write_text(s)
print('Patched researched arc quick plan into Create.tsx')
