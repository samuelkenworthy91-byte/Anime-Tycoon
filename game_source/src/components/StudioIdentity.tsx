import { Check, Crown, Lock, Target, TrendingUp } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { GENRES, OFFICES, formatGBP } from "../engine/data";
import type { RunState } from "../engine/state";
import {
  PRIMARY_SPECIALISATION_MIN_OFFICE,
  SECONDARY_SPECIALISATION_CASH,
  SECONDARY_SPECIALISATION_MIN_OFFICE,
  SECONDARY_SPECIALISATION_RD,
  choosePrimarySpecialisation,
  chooseSecondarySpecialisation,
  secondarySpecialisationBlock,
  specialisationBenefits,
  studioSpecialisationProfile,
} from "../engine/specialisation";
import { cn } from "../utils/cn";
import { studioReputationTraits } from "../engine/studioReputation";

const rankLabel = {
  none: "UNDECLARED",
  studio: "GENRE STUDIO",
  authority: "GENRE AUTHORITY",
  institution: "GENRE INSTITUTION",
} as const;

const genreName = (id: string | null) => GENRES.find((genre) => genre.id === id)?.label ?? id ?? "—";

export default function StudioIdentity({
  run,
  setRun,
}: {
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
}) {
  const profile = studioSpecialisationProfile(run);
  const reputation = studioReputationTraits(run);
  const benefits = specialisationBenefits(run);
  const primaryReady = run.officeLevel >= PRIMARY_SPECIALISATION_MIN_OFFICE;
  const unlocked = GENRES.filter((genre) => run.genresUnlocked.includes(genre.id));

  const pickPrimary = (genreId: (typeof GENRES)[number]["id"]) => {
    const label = genreName(genreId);
    if (!window.confirm(`MAKE ${String(label).toUpperCase()} YOUR SIGNATURE GENRE?\n\nThis is a permanent studio identity choice. Productions containing it become your house speciality; productions outside it become slightly less efficient and less predictable.`)) return;
    sfx.fanfare();
    setRun((state) => choosePrimarySpecialisation(state, genreId) ?? state);
  };

  const pickSecondary = (genreId: (typeof GENRES)[number]["id"]) => {
    const label = genreName(genreId);
    if (!window.confirm(`ADD ${String(label).toUpperCase()} AS A SECOND SIGNATURE GENRE?\n\nThis costs ${formatGBP(SECONDARY_SPECIALISATION_CASH)} + ${SECONDARY_SPECIALISATION_RD} RD and is permanent.`)) return;
    sfx.fanfare();
    setRun((state) => chooseSecondarySpecialisation(state, genreId) ?? state);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cyanx/35 bg-cyanx/[.06] p-3">
        <div className="text-[9px] font-black tracking-[0.22em] text-cyanx">INDUSTRY REPUTATION · EARNED, NOT CHOSEN</div>
        {reputation.length === 0 ? (
          <div className="mt-1 text-[10px] text-paper/50">The industry has not seen enough of your work to put the studio in a box yet.</div>
        ) : (
          <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
            {reputation.map((trait) => (
              <div key={trait.id} className="rounded-lg border border-line bg-panel2/55 p-2">
                <div className="text-[10px] font-extrabold text-cyanx">{trait.label.toUpperCase()}</div>
                <div className="mt-0.5 text-[8px] leading-relaxed text-paper/50">{trait.description}</div>
                <div className="mt-1 text-[7px] font-bold text-paper/35">{trait.evidence}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-xl border border-gold/35 bg-gold/[.06] p-3">
        <div className="flex items-start gap-2">
          <Target size={18} className="mt-0.5 shrink-0 text-gold" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-display text-base font-extrabold text-gold">HOUSE SPECIALISATION</div>
              <span className="rounded border border-gold/35 px-1.5 py-0.5 text-[8px] font-black tracking-wider text-gold">{rankLabel[profile.rank]}</span>
            </div>
            <div className="mt-1 text-[10px] leading-relaxed text-paper/55">
              Choose a house genre to build exceptional institutional expertise. Signature work gets stronger production output, faster pacing, better intervention economics, sharper forecasts and a direct Story / Art / Sound scoring lift. Work outside the house remains viable, but carries a small scoring penalty because the studio is operating away from its strongest identity.
            </div>
            <div className="mt-1 text-[9px] font-bold text-cyanx">Licensed adaptations use their real underlying genres here — exactly the same rule as original productions.</div>
          </div>
        </div>
      </div>

      {!profile.primary ? (
        <div className="ink-card p-3">
          <div className="flex items-center gap-2">
            <Crown size={15} className="text-gold" />
            <div>
              <div className="font-display text-sm font-extrabold">CHOOSE YOUR SIGNATURE GENRE</div>
              <div className="text-[9px] text-paper/45">Permanent. One primary genre. No respec.</div>
            </div>
          </div>
          {!primaryReady ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-panel2/60 p-3 text-[10px] font-bold text-paper/50">
              <Lock size={13} /> Requires {OFFICES[PRIMARY_SPECIALISATION_MIN_OFFICE]?.name ?? "Studio 2"} or larger.
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {unlocked.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => pickPrimary(genre.id)}
                  className="btn-press rounded-lg border border-line bg-panel2/60 p-2 text-left hover:border-gold/60"
                >
                  <div className="text-[10px] font-black" style={{ color: genre.color }}>{genre.label}</div>
                  <div className="mt-0.5 text-[8px] text-paper/40">LOCK AS SIGNATURE GENRE</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="ink-card border-gold/45 p-3">
              <div className="text-[8px] font-black tracking-[0.2em] text-paper/40">PRIMARY SIGNATURE</div>
              <div className="mt-1 font-display text-xl font-extrabold text-gold">{genreName(profile.primary)}</div>
              <div className="mt-1 text-[9px] text-paper/45">Chosen in week {profile.selectedWeek}. Permanent studio credit and production identity.</div>
              {profile.secondary && (
                <div className="mt-2 rounded-lg border border-cyanx/30 bg-cyanx/5 px-2 py-1.5">
                  <div className="text-[7px] font-black tracking-wider text-cyanx">SECONDARY SIGNATURE</div>
                  <div className="text-sm font-extrabold text-cyanx">{genreName(profile.secondary)}</div>
                </div>
              )}
            </div>

            <div className="ink-card p-3">
              <div className="flex items-center gap-1.5"><TrendingUp size={13} className="text-mint"/><div className="text-[8px] font-black tracking-[0.2em] text-paper/40">MASTERY</div></div>
              <div className="mt-1 font-display text-lg font-extrabold text-mint">{rankLabel[profile.rank]}</div>
              <div className="mt-1 grid grid-cols-3 gap-1 text-center">
                <div className="rounded bg-panel2/70 p-1.5"><b className="block text-sm text-paper">{profile.releases}</b><span className="text-[7px] text-paper/35">RELEASES</span></div>
                <div className="rounded bg-panel2/70 p-1.5"><b className="block text-sm text-mint">{profile.hits}</b><span className="text-[7px] text-paper/35">HITS</span></div>
                <div className="rounded bg-panel2/70 p-1.5"><b className="block text-sm text-gold">{profile.masterpieces}</b><span className="text-[7px] text-paper/35">HOF</span></div>
              </div>
              {profile.nextRank && (
                <div className="mt-2 rounded-lg border border-line bg-panel2/50 p-2">
                  <div className="text-[8px] font-black text-paper/55">NEXT: {rankLabel[profile.nextRank]}</div>
                  {profile.nextRequirements.map((requirement) => <div key={requirement} className="mt-0.5 text-[8px] text-paper/40">○ {requirement}</div>)}
                </div>
              )}
            </div>
          </div>

          {benefits && (
            <div className="ink-card p-3">
              <div className="text-[8px] font-black tracking-[0.2em] text-gold">CURRENT HOUSE EFFECT</div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <div className="rounded-lg border border-mint/25 bg-mint/5 p-2"><b className="text-[10px] text-mint">+{benefits.signatureOutputPct}% OUTPUT</b><div className="text-[7px] text-paper/40">signature productions</div></div>
                <div className="rounded-lg border border-mint/25 bg-mint/5 p-2"><b className="text-[10px] text-mint">+{benefits.signaturePacePct}% PACE</b><div className="text-[7px] text-paper/40">signature productions</div></div>
                <div className="rounded-lg border border-gold/25 bg-gold/5 p-2"><b className="text-[10px] text-gold">−{benefits.signatureInterventionDiscountPct}% RESCUE COST</b><div className="text-[7px] text-paper/40">+{benefits.signatureInterventionEffectPct}% intervention effect</div></div>
                <div className="rounded-lg border border-neon/20 bg-neon/[.04] p-2"><b className="text-[10px] text-neon">OUTSIDE HOUSE</b><div className="text-[7px] text-paper/40">Small all-craft scoring penalty only. Production pace, rescue cost and issue risk are not broadly punished.</div></div>
              </div>
              {profile.rankLevel >= 2 && <div className="mt-2 text-[8px] font-bold text-cyanx"><Check size={9} className="mr-1 inline"/>Your recruitment ads now attract genre-aligned specialists.</div>}
            </div>
          )}

          {!profile.secondary && (
            <div className="ink-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-display text-sm font-extrabold">SECONDARY SPECIALISATION</div>
                  <div className="text-[9px] text-paper/45">Very-late expansion: {formatGBP(SECONDARY_SPECIALISATION_CASH)} + {SECONDARY_SPECIALISATION_RD} RD · permanent.</div>
                </div>
                <span className={cn("rounded border px-1.5 py-0.5 text-[8px] font-black", profile.rankLevel >= 3 && run.officeLevel >= SECONDARY_SPECIALISATION_MIN_OFFICE ? "border-mint/40 text-mint" : "border-line text-paper/35")}>{profile.rankLevel >= 3 ? "INSTITUTION" : "LOCKED"}</span>
              </div>
              {profile.rankLevel < 3 || run.officeLevel < SECONDARY_SPECIALISATION_MIN_OFFICE ? (
                <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-paper/40"><Lock size={10}/> Requires Genre Institution + {OFFICES[SECONDARY_SPECIALISATION_MIN_OFFICE]?.name ?? "Studio 4"}.</div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {unlocked.filter((genre) => genre.id !== profile.primary).map((genre) => {
                    const block = secondarySpecialisationBlock(run, genre.id);
                    return (
                      <Btn key={genre.id} variant="ghost" className="justify-start !px-2 !py-1.5 text-[9px]" disabled={!!block} title={block ?? undefined} onClick={() => pickSecondary(genre.id)}>
                        <span style={{ color: genre.color }}>★</span> {genre.label}
                      </Btn>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
