import { useEffect, useMemo, useState } from "react";
import { Crown, Radio, Sparkles, Star, Users } from "lucide-react";
import {
  acknowledgeBigThreeReveal,
  resolveBigThreeSlotOwner,
  type BigThreeReveal as BigThreeRevealData,
  type BigThreeSlot,
} from "../engine/bigThree";
import type { RunState } from "../engine/state";
import { Btn } from "../fx/fx";
import { primeAudio, sfx } from "../engine/audio";
import { BigThreeMountain } from "./BigThreeMountain";
import "./bigThreeReveal.css";

type RevealBeat = "blackout" | "consensus" | "wall" | "impact" | "legacy";

const BEATS: RevealBeat[] = ["blackout", "consensus", "wall", "impact", "legacy"];

export default function BigThreeReveal({
  run,
  presentation,
  setRun,
}: {
  run: RunState;
  presentation: { reveal: BigThreeRevealData; slot: BigThreeSlot };
  setRun: (fn: (r: RunState) => RunState) => void;
}) {
  const { reveal, slot } = presentation;
  const intro = reveal.kind === "era";
  const [beat, setBeat] = useState<RevealBeat>("blackout");
  const remaining = Math.max(0, 3 - run.bigThree.slots.length);
  const resolvedSlots = useMemo(
    () => run.bigThree.slots.slice(0, 3).map((entry) => resolveBigThreeSlotOwner(run, entry)),
    [run]
  );
  const incomingIndex = Math.max(0, resolvedSlots.findIndex((entry) => entry.id === slot.id));
  const chatter = useMemo(() => culturalChatter(slot, intro), [slot, intro]);

  useEffect(() => {
    primeAudio();
    sfx.stopCeremony();
    sfx.bigThreeSignal();
    return () => sfx.stopCeremony();
  }, []);

  useEffect(() => {
    if (beat === "consensus") sfx.bigThreePulse();
    if (beat === "wall") sfx.bigThreeWall();
    if (beat === "impact") sfx.bigThreeImpact();
    if (beat === "legacy") sfx.bigThreeLegacy();
  }, [beat]);

  const next = () => {
    const index = BEATS.indexOf(beat);
    if (index >= 0 && index < BEATS.length - 1) setBeat(BEATS[index + 1]);
  };

  const finish = () => {
    sfx.bigThreeLegacy();
    setRun((current) => acknowledgeBigThreeReveal(current, reveal.id));
  };

  return (
    <div className="big3-reveal fixed inset-0 z-[118] overflow-y-auto px-3 pb-[max(18px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] text-paper">
      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-5xl items-center justify-center py-3">
        {beat === "blackout" && <BlackoutBeat intro={intro} next={next} />}
        {beat === "consensus" && <ConsensusBeat chatter={chatter} next={next} />}
        {beat === "wall" && (
          <WallBeat
            slots={resolvedSlots}
            incomingIndex={incomingIndex}
            intro={intro}
            next={next}
          />
        )}
        {beat === "impact" && <ImpactBeat slot={slot} slots={resolvedSlots} intro={intro} next={next} />}
        {beat === "legacy" && (
          <LegacyBeat
            slot={slot}
            intro={intro}
            remaining={remaining}
            finish={finish}
          />
        )}
      </div>
    </div>
  );
}

function BlackoutBeat({ intro, next }: { intro: boolean; next: () => void }) {
  return (
    <div className="big3-stage w-full max-w-3xl text-center">
      <div className="big3-signal mx-auto flex w-fit items-center gap-2 text-[9px] font-black uppercase tracking-[0.34em] text-gold/70">
        <Radio size={13} /> Fandom signal spike
      </div>
      <div className="mx-auto mt-12 h-px w-24 bg-gradient-to-r from-transparent via-gold/55 to-transparent" />
      <h1 className="big3-wordmark mt-7 font-display text-4xl font-black uppercase leading-[0.92] tracking-tight text-paper sm:text-6xl">
        {intro ? "Something has changed." : "The conversation changed."}
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-xs leading-relaxed text-paper/50 sm:text-sm">
        {intro
          ? "Not a premiere. Not an awards campaign. Across forums, screenings, merch queues and studio pitch rooms, the same phrase has started appearing."
          : "It stopped being a question of whether this anime belonged in the conversation. Fans started speaking as though the answer had already been decided."}
      </p>
      <Btn big variant="gold" className="mx-auto mt-10 w-full max-w-sm" onClick={next}>FOLLOW THE SIGNAL</Btn>
    </div>
  );
}

function ConsensusBeat({ chatter, next }: { chatter: string[]; next: () => void }) {
  return (
    <div className="big3-stage w-full max-w-4xl">
      <div className="text-center">
        <div className="font-jp text-[9px] tracking-[0.45em] text-paper/35">CULTURAL CONSENSUS</div>
        <h2 className="big3-wordmark mt-2 font-display text-3xl font-black sm:text-5xl">NO JUDGES. NO BALLOT.</h2>
        <div className="mt-2 text-[10px] font-black tracking-[0.28em] text-gold/75 sm:text-xs">NO CAMPAIGN CAN BUY THIS.</div>
      </div>
      <div className="mx-auto mt-8 grid max-w-3xl gap-2 sm:grid-cols-2">
        {chatter.map((line, index) => (
          <div
            key={line}
            className="big3-chatter rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3 text-[10px] leading-relaxed text-paper/62 sm:text-xs"
            style={{ animationDelay: `${index * 0.16}s` }}
          >
            <span className="mr-2 text-gold/65">#{String(index + 1).padStart(2, "0")}</span>{line}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-7 flex max-w-xl items-center justify-center gap-4 text-[9px] font-black tracking-[0.18em] text-paper/35">
        <span className="flex items-center gap-1"><Users size={12} /> FANS</span>
        <span>×</span>
        <span>REACH</span>
        <span>×</span>
        <span>CRAFT</span>
        <span>×</span>
        <span>MOMENTUM</span>
      </div>
      <Btn big variant="gold" className="mx-auto mt-8 w-full max-w-sm" onClick={next}>SHOW ME THE MONUMENT</Btn>
    </div>
  );
}

function WallBeat({
  slots,
  incomingIndex,
  intro,
  next,
}: {
  slots: BigThreeSlot[];
  incomingIndex: number;
  intro: boolean;
  next: () => void;
}) {
  const wall = Array.from({ length: 3 }, (_, index) => slots[index] ?? null);
  return (
    <div className="big3-stage w-full max-w-5xl text-center">
      <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-gold/25 bg-gold/[0.06] px-3 py-1 text-[9px] font-black tracking-[0.25em] text-gold/80">
        <Crown size={12} /> THE BIG THREE
      </div>
      <h2 className="big3-wordmark mt-3 font-display text-3xl font-black sm:text-5xl">THREE NAMES ARE CARVED INTO AN ERA.</h2>
      <p className="mx-auto mt-2 max-w-2xl text-[10px] text-paper/45 sm:text-xs">
        {intro ? "One place in the mountain is about to stop being blank. Two remain for history to decide." : "The cliff face is changing again. Another name has become too large to fade."}
      </p>
      <div className="mt-6">
        <BigThreeMountain slots={wall} incomingIndex={incomingIndex} concealIncoming />
      </div>
      <Btn big variant="gold" className="mx-auto mt-7 w-full max-w-sm" onClick={next}>CARVE THE NAME</Btn>
    </div>
  );
}

function ImpactBeat({ slot, slots, intro, next }: { slot: BigThreeSlot; slots: BigThreeSlot[]; intro: boolean; next: () => void }) {
  const wall = Array.from({ length: 3 }, (_, index) => slots[index] ?? null);
  return (
    <div className="big3-stage w-full max-w-5xl text-center">
      <div className="big3-flash pointer-events-none fixed inset-0 z-20" />
      <div className="relative z-30">
        <div className="big3-impact mx-auto w-full">
          <BigThreeMountain slots={wall} focusSlotId={slot.id} />
        </div>
        <div className="big3-impact mt-5" style={{ animationDelay: ".14s" }}>
          <div className="font-jp text-[9px] tracking-[0.48em] text-gold/60">{intro ? "THE FIRST MONUMENT" : "THE NEW MONUMENT"}</div>
          <h2 className="big3-wordmark mx-auto mt-2 max-w-3xl font-display text-4xl font-black leading-[0.9] text-gold sm:text-6xl">{slot.title}</h2>
          <div className="mt-3 text-sm font-black tracking-[0.22em] text-paper/72">{slot.originalStudio}</div>
          <div className="mx-auto mt-5 h-px w-40 bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
          <div className="mt-4 text-[10px] font-black tracking-[0.28em] text-paper/40">CARVED INTO THE BIG THREE</div>
        </div>
        <Btn big variant="gold" className="mx-auto mt-8 w-full max-w-sm" onClick={next}>SEE WHY IT ENDURES</Btn>
      </div>
    </div>
  );
}

function LegacyBeat({
  slot,
  intro,
  remaining,
  finish,
}: {
  slot: BigThreeSlot;
  intro: boolean;
  remaining: number;
  finish: () => void;
}) {
  return (
    <div className="big3-stage w-full max-w-4xl">
      <div className="text-center">
        <div className="big3-lockline mx-auto w-fit font-jp text-[9px] tracking-[0.45em] text-gold/65">LOCKED INTO HISTORY</div>
        <h2 className="mt-3 font-display text-3xl font-black sm:text-5xl">{slot.title}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-[10px] leading-relaxed text-paper/50 sm:text-xs">
          {intro
            ? "The era now has its first monument. From this point onward, every studio is competing not just for scores or trophies, but to have its work carved beside it."
            : `No committee can revoke this. “${slot.title}” now occupies a permanent place in the cultural landscape of this era.`}
        </p>
      </div>

      <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="CRITICS" value={`${slot.score}/40`} />
        <Metric label="AUDIENCE REACH" value={Math.round(slot.reach).toLocaleString("en-GB")} />
        <Metric label="CRAFT FLOOR" value={slot.craftFloor.toFixed(1)} />
        <Metric label="CULTURAL MOMENTUM" value={`${Math.round(slot.momentum)}/100`} />
      </div>

      {slot.player && (
        <div className="mx-auto mt-4 max-w-3xl rounded-2xl border border-mint/35 bg-mint/[0.07] p-3 text-center text-[9px] leading-relaxed text-mint sm:text-[10px]">
          <Sparkles size={13} className="mr-1 inline" />
          Your studio gains +75,000 fans, +60 RD, permanent franchise prestige and stronger renewal leverage for a licensed property.
        </div>
      )}

      <div className="mt-5 text-center">
        <div className="inline-flex items-center gap-2 text-[9px] font-black tracking-[0.22em] text-paper/42">
          <Star size={11} className="text-gold" />
          {remaining ? `${remaining} BIG THREE PLACE${remaining === 1 ? "" : "S"} REMAIN` : "THE ERA'S BIG THREE IS COMPLETE"}
        </div>
      </div>

      <Btn big variant="gold" className="mx-auto mt-6 w-full max-w-sm" onClick={finish}>LEAVE IT IN STONE</Btn>
    </div>
  );
}

function culturalChatter(slot: BigThreeSlot, intro: boolean): string[] {
  if (intro) {
    return [
      `“${slot.title} isn't just the biggest show this season anymore.”`,
      "Fan rankings have stopped treating the phrase ‘Big Three’ as a joke.",
      "Retailers are reporting queues before new merchandise even reaches shelves.",
      "Rival studios are now referencing the same title inside greenlight meetings.",
      "Convention crowds are chanting the opening before the band reaches the chorus.",
      "The question online has changed from ‘is there a new era?’ to ‘what joins it?’",
    ];
  }
  if (slot.player) {
    return [
      `Clips from “${slot.title}” are dominating fan feeds without paid placement.`,
      "Weekly ranking threads have stopped debating whether it qualifies.",
      "Cosplay groups are organising around characters before the season has cooled.",
      "Rival studios are citing your production in internal pitch comparisons.",
      "Merch demand is outlasting the release-window spike.",
      `Fans now type “Big Three” and “${slot.title}” in the same sentence by default.`,
    ];
  }
  return [
    `“${slot.title}” has escaped its launch window and become part of the wider culture.`,
    "Fan rankings have stopped debating whether it qualifies.",
    "Convention crowds are treating its cast like established icons.",
    "Other studios are already chasing its production language.",
    "Merch demand is holding long after the initial campaign ended.",
    `The phrase “Big Three” now produces one unavoidable answer: “${slot.title}”.`,
  ];
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gold/16 bg-white/[0.025] p-3 text-center">
      <div className="text-[7px] font-black tracking-[0.18em] text-paper/32 sm:text-[8px]">{label}</div>
      <div className="mt-1 font-display text-base font-black text-paper sm:text-lg">{value}</div>
    </div>
  );
}
