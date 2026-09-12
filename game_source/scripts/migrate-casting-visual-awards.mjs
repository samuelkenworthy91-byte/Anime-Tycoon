import fs from "node:fs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, text) { fs.writeFileSync(path, text); }
function replaceRange(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  if (start < 0) throw new Error(`${label}: start marker not found`);
  const end = text.indexOf(endMarker, start);
  if (end < 0) throw new Error(`${label}: end marker not found`);
  return text.slice(0, start) + replacement + text.slice(end);
}
function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`${label}: target not found`);
  if (text.indexOf(from, first + from.length) >= 0) throw new Error(`${label}: target is not unique`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

// ---------------------------------------------------------------- cast catalogue
const castPath = "src/engine/castCatalog.ts";
let cast = read(castPath);
if (!cast.includes("maximumWeightCatalogAssignment")) {
  cast = replaceRange(
    cast,
    "function scoreMemberForBlock",
    "function chooseTriplePresentation",
`const VISUAL_SIGNATURE_GENRES = new Set<GenreId>([
  "mecha", "sports", "cyber", "idol", "cooking", "military", "space", "magical",
  "pirate", "martial", "nordic", "samurai", "shinobi", "vampire", "monster_taming",
  "kaiju", "arabia",
]);

/**
 * The source visible affinities are no longer mechanical wiring, but they ARE
 * valuable art-direction metadata: those are the genres the portrait was
 * actually designed to communicate. Score them far above legacy hidden
 * affinity so visually literal portraits stay with a genre they look like.
 *
 * Score bands are deliberately lexicographic at whole-bucket scale:
 *  - pinned chemistry cast must remain active
 *  - preserve a visually distinctive source genre whenever possible
 *  - preserve at least one source-visible genre on every active portrait
 *  - then prefer both old visibles / exact old blocks / hidden affinity
 */
function scoreMemberForBlock(member: CastMember, block: CatalogBlock, pinned: ReadonlySet<string>) {
  const oldVisible = member.visibleAff.filter((genre) => String(genre) !== String(NO_SECRET));
  const blockSet = new Set(block.genres);
  const visualOverlap = oldVisible.filter((genre) => blockSet.has(genre));
  const signatureOverlap = visualOverlap.filter((genre) => VISUAL_SIGNATURE_GENRES.has(genre));
  const visibleInside = oldVisible.length === 2 && oldVisible.every((genre) => blockSet.has(genre));
  const exactPair = block.kind === "pair" && visibleInside &&
    castingPairKey(oldVisible[0], oldVisible[1]) === block.pairKeys[0];
  const oldAll = [...oldVisible, member.hiddenAff].filter((genre) => String(genre) !== String(NO_SECRET));
  const exactTriple = block.kind === "triple" && oldAll.length === 3 &&
    new Set(oldAll).size === 3 && oldAll.every((genre) => blockSet.has(genre));

  let score = 0;
  if (pinned.has(member.id)) score += 100_000_000_000;
  if (signatureOverlap.length) score += 1_000_000_000;
  if (visualOverlap.length) score += 100_000_000;
  score += signatureOverlap.length * 50_000;
  score += visualOverlap.length * 20_000;
  if (visibleInside) score += 30_000;
  if (exactPair) score += 20_000;
  if (exactTriple) score += 15_000;
  // Old hidden affinity is retained only as a very weak semantic tie-breaker;
  // it must never overpower what the portrait visibly depicts.
  if (blockSet.has(member.hiddenAff)) score += 100;
  return score;
}

/** Rectangular Hungarian assignment (blocks <= portraits), maximizing weight. */
function maximumWeightCatalogAssignment(
  blocks: readonly CatalogBlock[],
  members: readonly CastMember[],
  pinned: ReadonlySet<string>,
  role: CastRole,
  type: AnimeType,
): Map<string, CastMember> {
  const n = blocks.length;
  const m = members.length;
  if (n > m) throw new Error(`${role}/${type}: ${m} portraits cannot cover ${n} blocks.`);

  const weights = blocks.map((block) => members.map((member) =>
    scoreMemberForBlock(member, block, pinned) + (hash32(`${role}|${type}|${block.id}|${member.id}`) % 97)
  ));
  const maxWeight = Math.max(...weights.flat());
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(m + 1).fill(0);
  const p = new Array<number>(m + 1).fill(0);
  const way = new Array<number>(m + 1).fill(0);

  for (let i = 1; i <= n; i += 1) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(m + 1).fill(Number.POSITIVE_INFINITY);
    const used = new Array<boolean>(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Number.POSITIVE_INFINITY;
      let j1 = 0;
      for (let j = 1; j <= m; j += 1) {
        if (used[j]) continue;
        const cost = maxWeight - weights[i0 - 1][j - 1];
        const cur = cost - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j += 1) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
        else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const out = new Map<string, CastMember>();
  for (let j = 1; j <= m; j += 1) {
    const blockIndex = p[j] - 1;
    if (blockIndex >= 0) out.set(blocks[blockIndex].id, members[j - 1]);
  }
  if (out.size !== n) throw new Error(`${role}/${type}: global catalogue assignment produced ${out.size}/${n} owners.`);
  return out;
}

`,
    "cast scoring"
  );

  cast = replaceRange(
    cast,
    "      // Full bipartite candidate list, greedily consuming the strongest",
    "      for (const block of blocks) {",
`      // Solve the whole bucket at once. Greedy assignment could consume a
      // locally good match and strand an unmistakably themed portrait in an
      // unrelated block. Maximum-weight matching preserves the exact 435-pair
      // catalogue while globally maximizing visual-art alignment.
      const ownerForBlock = maximumWeightCatalogAssignment(blocks, bucket, pinned, role, type);
      const usedMembers = new Set([...ownerForBlock.values()].map((member) => member.id));
      for (const member of pinnedHere) {
        if (!usedMembers.has(member.id)) throw new Error(`${role}/${type}: pinned cast ${member.id} fell into reserve.`);
      }

`,
    "cast assignment"
  );
  write(castPath, cast);
}

// ---------------------------------------------------------------- awards engine
const awardsPath = "src/engine/awards.ts";
let awards = read(awardsPath);
if (!awards.includes("licensedAwardPosterAsset")) {
  awards = replaceOnce(
    awards,
    'import type { RivalRelease } from "./rivals";\n',
    'import type { RivalRelease } from "./rivals";\nimport { ipById } from "./ip";\n',
    "awards IP import"
  );
  const marker = "/* ----------------------------------------------------------- categories */";
  const helper = `/** Canonical key art for a player release adapted from an auction IP. */\nexport function licensedAwardPosterAsset(n: AwardNominee): string | null {\n  if (!n.player) return null;\n  const licensedIpId = n.draft?.licensedIpId;\n  if (!licensedIpId) return null;\n  return ipById(licensedIpId)?.posterAsset ?? null;\n}\n\n`;
  awards = replaceOnce(awards, marker, helper + marker, "awards poster helper");
  write(awardsPath, awards);
}

// ---------------------------------------------------------------- ceremony UI
const ceremonyPath = "src/components/AwardsCeremony.tsx";
let ceremony = read(ceremonyPath);
if (!ceremony.includes("licensedAwardPosterAsset")) {
  ceremony = replaceOnce(
    ceremony,
    'import type { AwardCategory, AwardCeremony, AwardNominee } from "../engine/awards";',
    'import { licensedAwardPosterAsset, type AwardCategory, type AwardCeremony, type AwardNominee } from "../engine/awards";',
    "ceremony awards import"
  );
  ceremony = replaceRange(
    ceremony,
    "function WinnerPoster({ nominee }: { nominee: AwardNominee }) {",
    "function NomineeList",
`function WinnerPoster({ nominee }: { nominee: AwardNominee }) {
  if (nominee.player) {
    const licensedPoster = licensedAwardPosterAsset(nominee);
    if (licensedPoster) {
      return (
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gold/55 bg-[#0d0a17] shadow-[0_24px_90px_rgba(0,0,0,.75)]">
          <img src={licensedPoster} alt={`${nominee.title} poster`} className="absolute inset-0 h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
        </div>
      );
    }

    const draft = nominee.draft ?? fallbackDraft(nominee);
    const lead = castById(draft.protag);
    return (
      <Poster
        draft={draft}
        studio={nominee.studio}
        score={nominee.score}
        portrait={{ img: lead.img, name: draft.protagName || lead.name }}
        className="w-full shadow-[0_24px_90px_rgba(0,0,0,.75)]"
      />
    );
  }

  const rival = nominee.posterId ? rivalPosterById(nominee.posterId) : null;
  if (!rival) return <GeneratedFallbackPoster nominee={nominee} />;

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gold/55 bg-[#0d0a17] shadow-[0_24px_90px_rgba(0,0,0,.75)]">
      <img src={rival.img} alt={`${nominee.title} poster`} className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}

`,
    "ceremony winner poster"
  );
  write(ceremonyPath, ceremony);
}

console.log("Casting visual alignment + auction-IP awards migration applied.");
