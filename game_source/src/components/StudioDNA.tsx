import { Building2, Crown, Database, Globe2, Sparkles, Users } from "lucide-react";
import { GENRES } from "../engine/data";
import { DYNASTY_PATHS } from "../engine/legacy";
import { managementPolicyOf } from "../engine/management";
import { overseasTierOf } from "../engine/overseas";
import { RESEARCH_TRACKS, researchTrackLevel } from "../engine/researchTracks";
import { specialisationBenefits, studioSpecialisationProfile } from "../engine/specialisation";
import type { RunState } from "../engine/state";

function Card({ title, value, detail, icon }: { title: string; value: string; detail: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line/60 bg-panel2/55 p-3">
      <div className="flex items-center gap-2 text-[9px] font-black tracking-widest text-paper/40">{icon}{title}</div>
      <div className="mt-1 font-display text-sm font-extrabold text-paper">{value}</div>
      <div className="mt-1 text-[9px] leading-relaxed text-paper/45">{detail}</div>
    </div>
  );
}

export default function StudioDNA({ run }: { run: RunState }) {
  const spec = studioSpecialisationProfile(run);
  const benefits = specialisationBenefits(run);
  const genre = spec.primary ? GENRES.find((g) => g.id === spec.primary)?.label ?? spec.primary : "Uncommitted";
  const tracks = RESEARCH_TRACKS
    .map((track) => ({ label: track.name, level: researchTrackLevel(run, track.id) }))
    .filter((row) => row.level > 0)
    .sort((a, b) => b.level - a.level);
  const policy = managementPolicyOf(run);
  const dynastyPath = run.dynasty?.path ? DYNASTY_PATHS[run.dynasty.path] : null;
  const builtRooms = Object.values(run.facilities ?? {}).filter((tier) => (tier ?? 0) > 0).length;
  const heads = Object.values(run.heads ?? {}).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gold/35 bg-gold/5 p-3">
        <div className="text-[10px] font-black tracking-[0.22em] text-gold">STUDIO DNA</div>
        <p className="mt-1 text-[10px] leading-relaxed text-paper/55">
          This is the consolidated identity view: what your studio is genuinely good at, where that advantage comes from, and which systems are shaping how you work. The detailed release report shows the realised numbers on each individual anime.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Card icon={<Sparkles size={12}/>} title="CREATIVE LANGUAGE" value={spec.primary ? `${genre} · ${spec.rank.toUpperCase()}` : "No house genre yet"} detail={spec.primary ? `Signature productions: +${benefits?.signatureOutputPct ?? 0}% live output, +${benefits?.signaturePacePct ?? 0}% pace, only +${benefits?.signatureScorePct ?? 0}% direct craft scoring. Outside genres carry no score penalty.` : "A house identity emerges only after repeated proven work; it is not required to make excellent anime."}/>
        <Card icon={<Database size={12}/>} title="INSTITUTIONAL KNOWLEDGE" value={tracks.length ? tracks.slice(0,2).map((row)=>`${row.label} Lv${row.level}`).join(" · ") : "No developed discipline"} detail={tracks.length > 2 ? `Also developed: ${tracks.slice(2).map((row)=>`${row.label} Lv${row.level}`).join(", ")}.` : "Research tracks represent permanent studio capability rather than one-show bonuses."}/>
        <Card icon={<Users size={12}/>} title="PEOPLE SYSTEM" value={`${heads} department head${heads===1?"":"s"} · ${run.legends.length} legend${run.legends.length===1?"":"s"}`} detail={`${run.staff.length} current staff · management default: ${policy.projectMode.replaceAll("-"," ")}. Staff traits and relationships remain personal rather than being folded into a generic studio multiplier.`}/>
        <Card icon={<Building2 size={12}/>} title="INFRASTRUCTURE" value={`${builtRooms} room${builtRooms===1?"":"s"} · ${run.capitalProjects.length} capital project${run.capitalProjects.length===1?"":"s"}`} detail="Facilities change production conditions; the premiere impact ledger shows their realised contribution instead of hiding it inside final totals."/>
        <Card icon={<Globe2 size={12}/>} title="GLOBAL FOOTPRINT" value={`Overseas tier ${overseasTierOf(run)}/4`} detail={`${run.overseas?.releases?.length ?? 0} regional release${(run.overseas?.releases?.length ?? 0)===1?"":"s"} signed. International growth is commercial identity, not a critical-score multiplier.`}/>
        <Card icon={<Crown size={12}/>} title="LEGACY" value={dynastyPath?.name ?? (run.dynasty ? "Strategy not chosen" : "Career still in progress")} detail={dynastyPath?.blurb ?? "Post-career Dynasty strategy becomes the studio's final strategic identity and can optionally inspire a small New Game+ culture modifier."}/>
      </div>
    </div>
  );
}
