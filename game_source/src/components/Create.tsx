import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Dices,
  Check,
  Tv,
  Clapperboard,
  Smartphone,
  Coins,
  Banknote,
  Gem,
  Moon,
  Sunset,
  Crown,
  Globe,
  Baby,
  Zap,
  Briefcase,
  Users,
  AlertTriangle,
  Plus,
  X,
  PawPrint,
  Skull,
} from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import Portrait from "./Portrait";
import { castById } from "../engine/data";
import {
  ARCS,
  AUDIENCES,
  BUDGETS,
  CAST_ROLE_LABEL,
  GENRES,
  MEDIUMS,
  PETS,
  PROTAGONISTS,
  SECONDARY,
  SLOTS,
  VILLAINS,
  comboKey,
  comboLabel,
  comboLevelBonus,
  formatGBP,
  randomTitle,
  type AudienceId,
  type BudgetId,
  type CastMember,
  type Draft,
  type GenreId,
  type MediumId,
  type SlotId,
} from "../engine/data";
import type { RunState } from "../engine/state";
import { cn } from "../utils/cn";

const STEPS = ["CONCEPT", "GENRES", "AUDIENCE", "CAST", "STORY ARCS", "GREENLIGHT"];

export function freshDraft(run: RunState, sequelKey?: string): Draft {
  const fr = sequelKey ? run.franchises[sequelKey] : undefined;
  return {
    title: fr ? `${fr.baseTitle} S${fr.season + 1}` : randomTitle(),
    medium: "tv",
    budget: "standard",
    slot: "midnight",
    genres: [],
    audience: "teens",
    protag: "kai",
    protagName: "Kai",
    secondary: SECONDARY[0].id,
    pet: PETS[0].id,
    villain: VILLAINS[0].id,
    arcs: [],
    sliders: [50, 50, 50],
    franchiseKey: sequelKey,
    season: (fr?.season ?? 0) + 1,
  };
}

export function draftCost(d: Draft, _run?: RunState): number {
  void _run;
  const arcCost = d.arcs.reduce((a, id) => a + (ARCS.find((x) => x.id === id)?.cost ?? 0), 0);
  return Math.round(BUDGETS[d.budget].cost * MEDIUMS[d.medium].costMult + SLOTS[d.slot].cost + arcCost);
}

export function draftWeeks(d: Draft): number {
  return 11 + MEDIUMS[d.medium].weeks + Math.max(0, d.arcs.length - 3);
}

function CastPick({
  m,
  on,
  match,
  weight,
  onPick,
  compact,
}: {
  m: CastMember;
  on: boolean;
  match: number;
  weight: number;
  onPick: () => void;
  compact?: boolean;
}) {
  const bonus = Math.round(match * 2.6 * weight * 10) / 10;
  return (
    <button
      onClick={onPick}
      className={cn(
        "btn-press group relative overflow-hidden rounded-2xl border text-left",
        on ? "border-neon shadow-[0_0_26px_rgba(255,77,141,.4)]" : "border-line hover:border-neon/40",
        compact ? "aspect-square" : "aspect-[4/5]"
      )}
    >
      <Portrait
        img={m.img}
        pos={m.pos}
        name={m.name}
        alt={m.name}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-abyss via-transparent to-transparent" />
      {bonus > 0 && (
        <div className="absolute right-1.5 top-1.5 rounded-full bg-mint px-2 py-0.5 text-[9px] font-extrabold text-ink">
          +{bonus}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-2">
        <div className="font-display text-sm font-extrabold leading-tight">{m.name}</div>
        <div className="text-[10px] font-bold text-cyanx">{m.archetype}</div>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {m.aff.map((a) => (
            <span key={a} className="rounded bg-ink/70 px-1.5 py-0.5 text-[9px] font-bold text-paper/70">
              {GENRES.find((g) => g.id === a)!.label}
            </span>
          ))}
        </div>
      </div>
      {on && (
        <div className="absolute left-1.5 top-1.5 rounded-full bg-neon p-1 text-white">
          <Check size={12} />
        </div>
      )}
    </button>
  );
}

export default function Create({
  run,
  sequelKey,
  paused,
  onBegin,
  onCancel,
}: {
  run: RunState;
  sequelKey?: string;
  paused?: boolean;
  onBegin: (d: Draft) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(() => freshDraft(run, sequelKey));

  const set = (patch: Partial<Draft>) => setD((old) => ({ ...old, ...patch }));
  const protag = PROTAGONISTS.find((p) => p.id === d.protag) ?? PROTAGONISTS[0];
  const comboDiscovered = d.genres.length === 2 && (comboKey(d.genres) in run.comboLevels);
  const combo = comboLabel(d.genres, comboDiscovered);
  const comboLv = run.comboLevels[comboKey(d.genres)] ?? 0;
  const cost = draftCost(d, run);
  const after = run.cash - cost;
  const weeks = draftWeeks(d);

  const ideal = useMemo<[number, number, number]>(() => {
    if (!d.genres.length) return [50, 50, 50];
    const sum = [0, 0, 0];
    d.genres.forEach((g) => {
      const it = GENRES.find((x) => x.id === g)!.ideal;
      sum[0] += it[0];
      sum[1] += it[1];
      sum[2] += it[2];
    });
    return [
      Math.round(sum[0] / d.genres.length),
      Math.round(sum[1] / d.genres.length),
      Math.round(sum[2] / d.genres.length),
    ];
  }, [d.genres]);

  const stepValid = [d.title.trim().length > 0, d.genres.length >= 1, true, !!d.protag && !!d.secondary && !!d.pet && !!d.villain, d.arcs.length >= 3][step] ?? true;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (paused) return;
      if (e.key === "Enter" && stepValid) {
        if (step < STEPS.length - 1) {
          sfx.select();
          setStep((s) => Math.min(STEPS.length - 1, s + 1));
        } else {
          onBegin(d);
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [step, stepValid, d, onBegin, paused]);

  const toggleGenre = (id: GenreId) => {
    sfx.click();
    setD((old) => {
      if (old.genres.includes(id)) return { ...old, genres: old.genres.filter((g) => g !== id) };
      if (old.genres.length >= 2) return { ...old, genres: [old.genres[1], id] };
      return { ...old, genres: [...old.genres, id] };
    });
  };

  const arcCastFit = (a: (typeof ARCS)[number], d: Draft) => {
    if (!a.cast) return false;
    const m = castById(d[a.cast]);
    return m.aff.some((g) => d.genres.includes(g));
  };

  const toggleArc = (id: string) => {
    sfx.click();
    setD((old) => {
      if (old.arcs.includes(id)) return { ...old, arcs: old.arcs.filter((a) => a !== id) };
      if (old.arcs.length >= 6) return old;
      return { ...old, arcs: [...old.arcs, id] };
    });
  };

  const arcTotals = useMemo(() => {
    let q = 0;
    let f = 0;
    d.arcs.forEach((id, idx) => {
      const a = ARCS.find((x) => x.id === id)!;
      q += a.q;
      f += a.f;
      if (a.syn?.some((s) => d.genres.includes(s))) {
        q += a.synQ ?? 0;
        f += a.synF ?? 0;
      }
      if (a.id === "finale" && idx === d.arcs.length - 1 && d.arcs.length >= 4) q += 3;
    });
    return { q, f };
  }, [d.arcs, d.genres]);

  const castRows: { role: "protag" | "secondary" | "pet" | "villain"; title: string; hint: string; icon: React.ReactNode; list: CastMember[] }[] = [
    { role: "protag", title: "LEAD ROLE", hint: "The face of the show.", icon: <Users size={14} />, list: PROTAGONISTS },
    { role: "secondary", title: "SUPPORTING", hint: "The trusty best friend / mentor / rival.", icon: <Users size={14} />, list: SECONDARY },
    { role: "pet", title: "PET / MASCOT", hint: "Merch sales depend on them.", icon: <PawPrint size={14} />, list: PETS },
    { role: "villain", title: "VILLAIN", hint: "Every hero needs a foil.", icon: <Skull size={14} />, list: VILLAINS },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-ink">
      <img src="img/bg-boardroom.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-abyss/70 via-abyss/35 to-abyss/80" />
      <div className="pointer-events-none absolute inset-0 gridlines opacity-30" />
      <div className="pointer-events-none absolute inset-0 screentone opacity-30" />
      {/* header + stepper */}
      <div className="relative z-10 border-b border-line/60 bg-ink/70 px-3 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-2 pr-[76px]">
          <Btn variant="ghost" className="!px-3" onClick={onCancel}>
            <ChevronLeft size={16} />
          </Btn>
          <div className="font-display text-sm font-extrabold md:text-base">
            {sequelKey ? "SEASON GREENLIGHT" : "NEW PRODUCTION"}
          </div>
          <div className="ml-auto hidden gap-1 md:flex">
            {STEPS.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(i)}
                className={cn(
                  "btn-press rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider",
                  i === step ? "border-neon bg-neon/15 text-neon" : i < step ? "border-line text-paper/50" : "border-line/50 text-paper/30"
                )}
              >
                {i + 1}. {s}
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs font-bold text-neon md:hidden">
            {step + 1}/{STEPS.length}
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 gap-4 p-3 md:p-4">
        {/* main step content */}
        <div className="nice-scroll min-w-0 flex-1 overflow-y-auto pr-1">
          {step === 0 && (
            <div className="space-y-4 anim-up">
              <Section title="SHOW TITLE">
                <div className="flex gap-2">
                  <input
                    value={d.title}
                    onChange={(e) => set({ title: e.target.value.slice(0, 32) })}
                    className="ink-input flex-1 px-4 py-3 font-display text-lg font-extrabold"
                  />
                  <Btn variant="ghost" onClick={() => set({ title: randomTitle() })} aria-label="Random title">
                    <Dices size={18} />
                  </Btn>
                </div>
              </Section>
              <Section title="FORMAT">
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(MEDIUMS) as MediumId[]).map((m) => {
                    const locked = !run.mediumsUnlocked.includes(m);
                    return (
                      <Pick key={m} active={d.medium === m} disabled={locked} onClick={() => set({ medium: m })}>
                        {m === "tv" ? <Tv size={18} /> : m === "movie" ? <Clapperboard size={18} /> : <Smartphone size={18} />}
                        <div className="font-display text-sm font-extrabold">{MEDIUMS[m].label}</div>
                        <div className="text-[10px] text-paper/50">{locked ? `Research to unlock (${MEDIUMS[m].rd} RD)` : MEDIUMS[m].desc}</div>
                      </Pick>
                    );
                  })}
                </div>
              </Section>
              <Section title="PRODUCTION BUDGET">
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(BUDGETS) as BudgetId[]).map((b) => (
                    <Pick key={b} active={d.budget === b} onClick={() => set({ budget: b })}>
                      {b === "indie" ? <Coins size={18} className="text-mint" /> : b === "standard" ? <Banknote size={18} className="text-cyanx" /> : <Gem size={18} className="text-gold" />}
                      <div className="font-display text-sm font-extrabold">{BUDGETS[b].label.split(" ")[0]}</div>
                      <div className="text-[10px] font-bold text-gold">{formatGBP(BUDGETS[b].cost)}</div>
                      <div className="text-[10px] text-paper/50">{BUDGETS[b].desc}</div>
                    </Pick>
                  ))}
                </div>
              </Section>
              <Section title="BROADCAST SLOT">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {(Object.keys(SLOTS) as SlotId[]).map((s) => (
                    <Pick key={s} active={d.slot === s} onClick={() => set({ slot: s })}>
                      {s === "midnight" ? <Moon size={16} className="text-viol" /> : s === "evening" ? <Sunset size={16} className="text-neon2" /> : s === "prime" ? <Crown size={16} className="text-gold" /> : <Globe size={16} className="text-cyanx" />}
                      <div className="font-display text-xs font-extrabold leading-tight">{SLOTS[s].label}</div>
                      <div className="text-[10px] font-bold text-gold">{formatGBP(SLOTS[s].cost)}</div>
                      <div className="text-[10px] text-paper/50">{SLOTS[s].desc}</div>
                    </Pick>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 anim-up">
              <Section title={`PICK 1–2 GENRES (${d.genres.length}/2)`}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {GENRES.map((g) => {
                    const on = d.genres.includes(g.id);
                    const locked = !run.genresUnlocked.includes(g.id);
                    const Icon = g.icon;
                    return (
                      <Pick key={g.id} active={on} disabled={locked} onClick={() => toggleGenre(g.id)} ring={g.color}>
                        <div className="flex items-center gap-1.5">
                          <Icon size={16} style={{ color: g.color }} />
                          <span className="font-display text-sm font-extrabold">{g.label}</span>
                        </div>
                        <div className="text-[10px] text-paper/50">{locked ? `Licence: ${g.rd} RD in R&D` : g.desc}</div>
                      </Pick>
                    );
                  })}
                </div>
              </Section>
              <div className={cn("ink-card p-3", combo.mult > 1.05 && "border-gold/60")}>
                <span className={cn("font-display text-sm font-extrabold", combo.cls)}>{combo.label}</span>
                {!combo.secret && <span className="ml-2 text-xs text-paper/50">×{combo.mult.toFixed(2)} review score</span>}
                {combo.secret && !comboDiscovered && (
                  <span className="ml-2 text-xs italic text-viol">Experimental pairing — nobody knows if it works…</span>
                )}
                {combo.secret && comboDiscovered && (
                  <span className="ml-2 text-xs text-viol">✦ ×{combo.mult.toFixed(2)} review score — you discovered this!</span>
                )}
                {d.genres.length > 0 && (
                  <span className="ml-2 text-xs text-gold">
                    combo knowledge Lv{comboLv} (×{comboLevelBonus(comboLv).toFixed(2)})
                  </span>
                )}
              </div>
              {d.genres.length > 0 && (
                <Section title="IDEAL PRODUCTION FOCUS (MEMO FROM THE DIRECTOR)">
                  <div className="space-y-1.5 text-xs">
                    {(["Pre-Production", "Animation", "Sound & Voice"] as const).map((label, i) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="w-28 shrink-0 font-bold text-paper/60">{label}</span>
                        <div className="relative h-2 flex-1 rounded-full bg-abyss">
                          <div
                            className="absolute top-0 h-2 w-1.5 -translate-x-1/2 rounded bg-gold shadow-[0_0_8px_rgba(255,209,102,.8)]"
                            style={{ left: `${ideal[i]}%` }}
                          />
                        </div>
                        <span className="w-9 text-right font-bold text-gold">{ideal[i]}%</span>
                      </div>
                    ))}
                    <div className="pt-1 text-[10px] text-paper/40">
                      Shown: Story vs Characters · Sakuga vs Consistency · OST vs Voice — you'll set these next.
                    </div>
                  </div>
                </Section>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 anim-up">
              <Section title="TARGET AUDIENCE">
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(AUDIENCES) as AudienceId[]).map((a) => {
                    const fit = d.genres.length
                      ? d.genres.reduce((acc, g) => acc + (AUDIENCES[a].fit[g] ?? 1), 0) / d.genres.length
                      : 1;
                    return (
                      <Pick key={a} active={d.audience === a} onClick={() => set({ audience: a })}>
                        <div className="flex items-center gap-1.5">
                          {a === "kids" ? <Baby size={16} className="text-gold" /> : a === "teens" ? <Zap size={16} className="text-neon" /> : a === "adults" ? <Briefcase size={16} className="text-cyanx" /> : <Users size={16} className="text-mint" />}
                          <span className="font-display text-sm font-extrabold">{AUDIENCES[a].label}</span>
                        </div>
                        <div className="text-[10px] text-paper/50">{AUDIENCES[a].desc}</div>
                        <div className={cn("mt-1 text-[10px] font-bold", fit >= 1.05 ? "text-mint" : fit < 0.95 ? "text-neon" : "text-paper/50")}>
                          Genre fit ×{fit.toFixed(2)} · Market ×{AUDIENCES[a].mult.toFixed(2)}
                        </div>
                      </Pick>
                    );
                  })}
                </div>
              </Section>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 anim-up">
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-extrabold">CAST THE SHOW</span>
                <span className="text-[11px] text-paper/50">Pick one from each row — genre fit adds casting score.</span>
              </div>
              {castRows.map((row) => (
                <Section key={row.role} title={`${row.title} — ${CAST_ROLE_LABEL[row.role]}`}>
                  <div className="mb-1 text-[10px] text-paper/40">{row.hint}</div>
                  <div className={cn("grid grid-cols-4 gap-2 sm:grid-cols-6", row.list.length > 24 && "lg:grid-cols-8")}>
                    {row.list.map((m) => {
                      const on = d[row.role] === m.id;
                      const match = m.aff.filter((g) => d.genres.includes(g)).length;
                      const weight = { protag: 1, secondary: 0.55, villain: 0.45, pet: 0.3 }[row.role];
                      return (
                        <CastPick
                          key={m.id}
                          m={m}
                          on={on}
                          match={match}
                          weight={weight}
                          onPick={() => {
                            sfx.select();
                            set({ [row.role]: m.id } as Partial<Draft>);
                          }}
                          compact={row.role !== "protag"}
                        />
                      );
                    })}
                  </div>
                </Section>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-bold text-paper/50">HERO NAME:</span>
                <input
                  value={d.protagName}
                  onChange={(e) => set({ protagName: e.target.value.slice(0, 18) })}
                  className="ink-input w-48 px-3 py-2 text-sm font-bold"
                />
                <span className="text-[10px] italic text-paper/40">“{protag.tag}”</span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 anim-up">
              <Section title={`PLAN THE SEASON — PICK 3–6 ARCS (${d.arcs.length}/6)`}>
                {/* timeline */}
                <div className="ink-card flex min-h-[4.5rem] flex-wrap items-center gap-1.5 p-2.5">
                  {d.arcs.length === 0 && <span className="px-2 text-xs text-paper/40">Episode board is empty… add arcs below.</span>}
                  {d.arcs.map((id, i) => {
                    const a = ARCS.find((x) => x.id === id)!;
                    const syn = a.syn?.some((s) => d.genres.includes(s));
                    return (
                      <button
                        key={id}
                        onClick={() => toggleArc(id)}
                        className={cn(
                          "btn-press flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold",
                          syn ? "border-gold/60 bg-gold/10 text-gold" : "border-line bg-panel2 text-paper/80"
                        )}
                      >
                        {i + 1}. {a.name} <X size={10} />
                      </button>
                    );
                  })}
                  {d.arcs.length >= 3 && (
                    <span className="ml-auto text-right text-[10px] leading-tight text-paper/60">
                      Σ quality <b className={arcTotals.q >= 0 ? "text-mint" : "text-neon"}>{arcTotals.q >= 0 ? "+" : ""}{arcTotals.q}</b>
                      <br />
                      fans <b className="text-cyanx">+{Math.round(arcTotals.f * 100)}%</b>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ARCS.map((a) => {
                    const on = d.arcs.includes(a.id);
                    const syn = a.syn?.some((s) => d.genres.includes(s));
                    const locked = a.franchiseOnly && !d.franchiseKey && Object.keys(run.franchises).length === 0;
                    return (
                      <button
                        key={a.id}
                        disabled={locked}
                        onClick={() => toggleArc(a.id)}
                        className={cn(
                          "btn-press relative rounded-2xl border p-2.5 text-left",
                          on ? "border-neon bg-neon/10" : "border-line bg-panel2/70 hover:border-neon/40",
                          locked && "opacity-35 saturate-0"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-xs font-extrabold">{a.name}</span>
                          <span className={cn("ml-auto text-[10px] font-bold", a.cost < 0 ? "text-mint" : "text-gold")}>
                            {a.cost < 0 && "SAVES "}
                            {formatGBP(Math.abs(a.cost))}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-paper/50">{a.desc}</div>
                        <div className="mt-1 flex items-center gap-2 text-[9px] font-bold">
                          <span className={a.q >= 0 ? "text-mint" : "text-neon"}>
                            Q {a.q >= 0 ? "+" : ""}
                            {a.q}
                          </span>
                          {a.f !== 0 && <span className="text-cyanx">Fans +{Math.round(a.f * 100)}%</span>}
                          {a.syn && <span className={syn ? "text-gold" : "text-paper/30"}>★ {a.syn.map((s) => GENRES.find((g) => g.id === s)!.label).join("/")}</span>}
                          {a.cast && (
                            <span className={cn("rounded px-1 py-0.5", arcCastFit(a, d) ? "bg-mint/15 text-mint" : "bg-panel3 text-paper/40")}>
                              {a.cast === "pet" ? "🐾" : a.cast === "villain" ? "☠" : "⭐"} {a.cast.toUpperCase()}
                              {arcCastFit(a, d) ? " +" + a.castQ : ""}
                            </span>
                          )}
                        </div>
                        {!on && !locked && <Plus size={13} className="absolute right-2 top-2 text-paper/30" />}
                      </button>
                    );
                  })}
                </div>
              </Section>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 anim-up">
              <Section title="GREENLIGHT REVIEW">
                <div className="ink-card space-y-1.5 p-4 text-sm">
                  <Row k="Title" v={`${d.title}${d.franchiseKey ? ` — Season ${d.season}` : ""}`} />
                  <Row k="Format" v={MEDIUMS[d.medium].label} />
                  <Row k="Genre" v={d.genres.map((g) => GENRES.find((x) => x.id === g)!.label).join(" × ")} />
                  <Row k="Audience" v={AUDIENCES[d.audience].label} />
                  <Row k="Lead" v={`${d.protagName} (${protag.archetype})`} />
                  <Row k="Supporting" v={SECONDARY.find((x) => x.id === d.secondary)?.name ?? ""} />
                  <Row k="Pet / Mascot" v={PETS.find((x) => x.id === d.pet)?.name ?? ""} />
                  <Row k="Villain" v={VILLAINS.find((x) => x.id === d.villain)?.name ?? ""} />
                  <Row k="Arcs" v={`${d.arcs.length} planned`} />
                  <Row k="Slot" v={SLOTS[d.slot].label} />
                  <Row k="Schedule" v={`${weeks} weeks in production`} />
                  <div className="my-2 border-t border-line/60" />
                  <Row k="Production" v={formatGBP(Math.round(BUDGETS[d.budget].cost * MEDIUMS[d.medium].costMult))} money />
                  <Row k="Broadcast slot" v={formatGBP(SLOTS[d.slot].cost)} money />
                  <Row k="Arcs total" v={formatGBP(d.arcs.reduce((a, id) => a + (ARCS.find((x) => x.id === id)?.cost ?? 0), 0))} money />
                  <Row k="Wages during run" v={`≈ ${formatGBP(run.staff.reduce((a, s) => a + s.salary, 0) * weeks)}`} money />
                  <div className="my-2 border-t border-line/60" />
                  <Row k="UP-FRONT COST" v={formatGBP(cost)} money big />
                  <Row
                    k="Cash after"
                    v={formatGBP(after)}
                    money
                    big
                    bad={after < 0}
                  />
                  {after < 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-neon/40 bg-neon/10 p-2 text-[11px] text-neon2">
                      <AlertTriangle size={14} /> Overdraft! The studio will sink if this show flops…
                    </div>
                  )}
                </div>
              </Section>
              <Btn big variant="gold" className="w-full" onClick={() => onBegin(d)}>
                <Gem size={20} /> PAY & START PRODUCTION
              </Btn>
            </div>
          )}
        </div>

        {/* side production bible */}
        <div className="hidden w-64 shrink-0 lg:block">
          <div className="ink-card sticky top-0 overflow-hidden">
            <div className="relative h-44">
              <Portrait img={protag.img} pos={protag.pos} name={protag.name} alt={protag.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-transparent" />
              <div className="absolute bottom-2 left-3 right-3">
                <div className="font-display text-lg font-extrabold leading-tight drop-shadow">{d.title || "Untitled"}</div>
                <div className="text-[10px] font-bold text-cyanx">starring {d.protagName}</div>
              </div>
            </div>
            <div className="space-y-2 p-3 text-xs">
              <div className="flex flex-wrap gap-1">
                {d.genres.map((g) => {
                  const gg = GENRES.find((x) => x.id === g)!;
                  return (
                    <span key={g} className="rounded-full border px-2 py-0.5 font-bold" style={{ borderColor: gg.color, color: gg.color }}>
                      {gg.label}
                    </span>
                  );
                })}
                {d.genres.length === 0 && <span className="text-paper/40">No genre yet</span>}
              </div>
              {d.genres.length === 2 && (
                <div className={cn("font-display text-xs font-extrabold", combo.cls)}>{combo.label}</div>
              )}
              <div className="border-t border-line/60 pt-2">
                <div className="flex justify-between text-paper/60">
                  <span>Cost</span>
                  <span className="font-bold text-gold">{formatGBP(cost)}</span>
                </div>
                <div className="flex justify-between text-paper/60">
                  <span>Cash after</span>
                  <span className={cn("font-bold", after < 0 ? "text-neon" : "text-mint")}>{formatGBP(after)}</span>
                </div>
                <div className="flex justify-between text-paper/60">
                  <span>Schedule</span>
                  <span className="font-bold text-cyanx">{weeks} weeks</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* footer nav */}
      <div className="relative z-10 flex items-center justify-between border-t border-line/60 bg-ink/70 px-3 py-2.5 backdrop-blur-md md:px-6">
        <Btn variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          <ChevronLeft size={16} /> BACK
        </Btn>
        <div className="text-[11px] text-paper/40">ENTER ↵ advances</div>
        {step < STEPS.length - 1 ? (
          <Btn variant="primary" disabled={!stepValid} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
            NEXT <ChevronRight size={16} />
          </Btn>
        ) : (
          <Btn variant="gold" onClick={() => onBegin(d)}>
            START <Gem size={16} />
          </Btn>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 font-display text-sm font-extrabold tracking-wide text-paper/80">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Pick({
  active,
  onClick,
  children,
  ring,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ring?: string;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => {
        sfx.click();
        onClick();
      }}
      className={cn(
        "btn-press relative flex flex-col items-start gap-1 rounded-2xl border p-2.5 text-left transition-shadow",
        active ? "bg-neon/10 shadow-[0_0_18px_rgba(255,77,141,.25)]" : "border-line bg-panel2/70 hover:border-neon/40",
        disabled && "pointer-events-none opacity-35 saturate-0"
      )}
      style={active ? { borderColor: ring ?? "#ff4d8d", boxShadow: `0 0 18px ${ring ?? "#ff4d8d"}44` } : undefined}
    >
      {children}
      {active && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-neon p-0.5 text-white">
          <Check size={10} />
        </span>
      )}
    </button>
  );
}

function Row({ k, v, money, big, bad }: { k: string; v: string; money?: boolean; big?: boolean; bad?: boolean }) {
  return (
    <div className={cn("flex justify-between", big && "font-display text-base font-extrabold")}>
      <span className="text-paper/60">{k}</span>
      <span className={cn("font-bold", money && (bad ? "text-neon" : "text-gold"), !money && "text-paper/90")}>{v}</span>
    </div>
  );
}
