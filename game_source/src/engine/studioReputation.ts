import type { GenreId } from "./data";
import type { RunState } from "./state";

export type StudioReputationId =
  | "hit_factory"
  | "auteur"
  | "franchise_machine"
  | "experimental"
  | "talent_academy"
  | "global_house"
  | "collector_empire"
  | "genre_authority"
  | "cult_house"
  | "prestige_house";

export interface StudioReputationTrait {
  id: StudioReputationId;
  label: string;
  description: string;
  score: number;
  evidence: string;
  genre?: GenreId;
}

function entries(run: Pick<RunState, "franchises">) {
  return Object.values(run.franchises ?? {}).flatMap((franchise) =>
    franchise.entries.map((entry) => ({ ...entry, franchise }))
  );
}

export function studioReputationTraits(run: RunState): StudioReputationTrait[] {
  const releases = entries(run);
  const traits: StudioReputationTrait[] = [];
  if (!releases.length) return traits;

  const hits = releases.filter((row) => row.score >= 27).length;
  const hof = releases.filter((row) => row.score >= 32).length;
  const franchiseCount = Object.values(run.franchises).filter((franchise) => franchise.entries.length >= 3).length;
  const originals = Object.values(run.franchises).filter((franchise) => !franchise.licensedIpId);
  const genreCounts = new Map<GenreId, number>();
  for (const row of releases) for (const genre of row.franchise.genres) genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
  const genreLeader = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const genreShare = genreLeader ? genreLeader[1] / Math.max(1, releases.length) : 0;
  const diverseGenres = genreCounts.size;
  const cults = Object.values(run.franchises).filter((franchise) => franchise.cult).length;
  const legends = run.legends?.length ?? 0;
  const totalMerch = Object.values(run.franchises).reduce((sum, franchise) => sum + (franchise.merchValue ?? 0), 0);
  const overseasDepth = Object.values(run.overseas?.recognition ?? {}).filter((value) => (value ?? 0) > 0).length;

  traits.push({
    id: "hit_factory", label: "Mainstream Hit Factory",
    description: "Known for repeatedly turning releases into broad critical and commercial successes.",
    score: hits * 8 + hof * 12 + Math.min(25, run.fans / 100_000),
    evidence: `${hits} hit releases · ${hof} Hall of Fame`,
  });
  traits.push({
    id: "auteur", label: "Auteur Studio",
    description: "A house associated with unusually consistent high-end critical work.",
    score: hof * 18 + (releases.length ? releases.reduce((sum, row) => sum + row.score, 0) / releases.length : 0),
    evidence: `${hof} Hall of Fame releases · best ${run.bestScore}/40`,
  });
  traits.push({
    id: "franchise_machine", label: "Franchise Machine",
    description: "The industry expects this studio to build, extend and monetise long-running properties.",
    score: franchiseCount * 20 + Object.values(run.franchises).reduce((sum, franchise) => sum + Math.max(0, franchise.entries.length - 1) * 3, 0),
    evidence: `${franchiseCount} franchises with 3+ entries`,
  });
  traits.push({
    id: "experimental", label: "Experimental Storytellers",
    description: "A studio with a reputation for unusual pairings and a broad creative catalogue.",
    score: diverseGenres * 3 + Object.keys(run.comboLevels ?? {}).filter((key) => (run.comboLevels[key] ?? 0) > 0).length * 1.5,
    evidence: `${diverseGenres} genres shipped · ${Object.keys(run.comboLevels ?? {}).length} pairing records`,
  });
  traits.push({
    id: "talent_academy", label: "Talent Academy",
    description: "Creators are expected to grow here and leave with meaningful careers behind them.",
    score: legends * 25 + run.staff.filter((staff) => staff.level >= 8).length * 8 + (run.staffRelationships ?? []).filter((relationship) => !!relationship.formalMentorId).length * 10,
    evidence: `${legends} retired legends · ${run.staff.filter((staff) => staff.level >= 8).length} senior creators`,
  });
  traits.push({
    id: "global_house", label: "Global Studio",
    description: "Known for treating overseas audiences as a core business rather than an afterthought.",
    score: overseasDepth * 12 + (run.capitalProjects.includes("localisation_campus") ? 25 : 0) + (run.capitalProjects.includes("distribution_network") ? 25 : 0),
    evidence: `${overseasDepth} developed regional markets`,
  });
  traits.push({
    id: "collector_empire", label: "Collector Empire",
    description: "A studio whose characters and franchises reliably turn into products people want to own.",
    score: Math.min(100, totalMerch / 200_000) + (run.activeMerchBets ? Object.keys(run.activeMerchBets).length * 4 : 0),
    evidence: `Merch portfolio ≈£${Math.round(totalMerch).toLocaleString("en-GB")}`,
  });
  if (genreLeader) {
    traits.push({
      id: "genre_authority", label: "Genre Authority",
      description: "The industry strongly associates the studio with one recurring creative lane.",
      score: genreShare * 80 + genreLeader[1] * 2,
      evidence: `${Math.round(genreShare * 100)}% of releases include the signature genre`,
      genre: genreLeader[0],
    });
  }
  traits.push({
    id: "cult_house", label: "Cult Favourite",
    description: "A smaller but unusually devoted audience follows the studio's stranger work.",
    score: cults * 24 + Math.max(0, originals.length - hits) * 2,
    evidence: `${cults} recognised cult franchises`,
  });
  traits.push({
    id: "prestige_house", label: "Prestige House",
    description: "Awards and high-end releases shape the studio's public reputation.",
    score: run.awards * 12 + hof * 10 + Object.values(run.franchises).filter((franchise) => franchise.bigThree).length * 20,
    evidence: `${run.awards} awards · ${Object.values(run.franchises).filter((franchise) => franchise.bigThree).length} Big Three properties`,
  });

  return traits
    .filter((trait) => trait.score >= 18)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
