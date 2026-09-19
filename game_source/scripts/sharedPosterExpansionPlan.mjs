#!/usr/bin/env node
/**
 * Shared industry poster expansion validator / applier.
 *
 * This file deliberately does NOT generate placeholder manifest entries.
 * The 96 planned rows live in rivalPosterExpansionPlan.json until every real
 * image exists. --apply is transactional: it refuses to mutate the runtime
 * manifest unless all assets and metadata pass validation.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const PUBLIC = path.join(ROOT, "public");
const MANIFEST_PATH = path.join(ROOT, "src", "engine", "generated", "rivalPosterManifest.json");
const PLAN_PATH = path.join(ROOT, "src", "engine", "generated", "rivalPosterExpansionPlan.json");
const GENRES_PATH = path.join(ROOT, "src", "engine", "generated", "genreV3.json");
const CATALOG_PATH = path.join(ROOT, "docs", "shared-poster-expansion-map.csv");

const STUDIO_META = {
  "Toe-i Animation": "blockbuster",
  Sunnyrise: "technical",
  Boneworks: "experimental",
  "Kyo-Hani": "prestige",
  "Madcap House": "volume",
  "Turtle Line": "idol",
};

const STUDIO_STYLE = {
  "Toe-i Animation": "high-energy blockbuster anime key visual, dramatic low-angle perspective, strong silhouettes, cinematic scale, explosive motion, theatrical rim light",
  Sunnyrise: "technically pristine anime key visual, crisp line rendering, intricate mechanical and environmental detail, polished studio lighting, precise composed framing",
  Boneworks: "avant-garde experimental anime key visual, unusual asymmetric composition, bold limited colour language, surreal graphic imagery, daring negative space",
  "Kyo-Hani": "prestige cinematic anime key visual, mature character-drama framing, subtle naturalistic lighting, quiet emotional depth, film-grain theatrical composition",
  "Madcap House": "bright commercial anime key visual, broad appealing character designs, colourful high-readability composition, cheerful polished mainstream poster look",
  "Turtle Line": "fashion-forward performance anime key visual, elegant stage lighting, expressive graceful posing, luminous glow, premium concert sparkle",
};

const HOUSE_STYLE = [
  "standalone portrait-format anime key visual",
  "painterly 2D illustration",
  "thick confident variable-weight contour lines",
  "bold cel shading",
  "detailed expressive faces",
  "textured cinematic environment",
  "strong silhouette readable at small poster size",
  "leave natural negative space near the upper third for the game's separate title overlay",
  "absolutely NO title text, NO letters, NO Japanese characters, NO logos, NO watermarks, NO signatures and NO UI",
].join(", ");

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const manifest = readJson(MANIFEST_PATH);
const plan = readJson(PLAN_PATH);
const genreData = readJson(GENRES_PATH);
const activeGenres = new Set(genreData.genres.map((g) => g.id));
const reservedIds = new Set(["sunrise_p003"]);
const additions = plan.additions;

function fail(message) {
  throw new Error(message);
}

function sameArray(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function validatePlan() {
  if (!Array.isArray(additions) || additions.length !== 96) fail(`Expected 96 planned additions, got ${additions?.length ?? "none"}`);
  const ids = additions.map((p) => p.id);
  if (new Set(ids).size !== ids.length) fail("Expansion plan has duplicate poster IDs");
  const images = additions.map((p) => p.img);
  if (new Set(images).size !== images.length) fail("Expansion plan has duplicate image paths");

  const byStudio = new Map();
  const families = new Map();
  for (const p of additions) {
    if (!STUDIO_META[p.studio]) fail(`Unknown studio for ${p.id}: ${p.studio}`);
    if (p.persona !== STUDIO_META[p.studio]) fail(`Wrong persona for ${p.id}: expected ${STUDIO_META[p.studio]}, got ${p.persona}`);
    if (!Array.isArray(p.animeTypes) || !p.animeTypes.length || p.animeTypes.some((t) => !["shonen", "shojo"].includes(t))) {
      fail(`Bad animeTypes for ${p.id}`);
    }
    if (new Set(p.animeTypes).size !== p.animeTypes.length) fail(`Duplicate anime type on ${p.id}`);
    if (!Array.isArray(p.genres) || p.genres.length < 1 || p.genres.length > 3) fail(`${p.id} must have 1-3 genre tags`);
    for (const g of p.genres) if (!activeGenres.has(g)) fail(`${p.id} uses inactive genre ${g}`);
    if (!p.concept?.trim()) fail(`${p.id} has no art concept`);
    if (reservedIds.has(p.id)) fail(`${p.id} collides with a Big Three reserved ID`);
    byStudio.set(p.studio, (byStudio.get(p.studio) ?? 0) + 1);
    if (p.family) {
      if (!families.has(p.family)) families.set(p.family, []);
      families.get(p.family).push(p);
    }
  }
  for (const studio of Object.keys(STUDIO_META)) {
    if (byStudio.get(studio) !== 16) fail(`${studio}: expected 16 additions, got ${byStudio.get(studio) ?? 0}`);
  }
  for (const [family, rows] of families) {
    if (rows.length < 2 || rows.length > 4) fail(`${family}: family must contain 2-4 planned images, got ${rows.length}`);
    if (new Set(rows.map((p) => p.studio)).size !== 1) fail(`${family}: family crosses studios`);
  }

  const existing = new Map(manifest.posters.map((p) => [p.id, p]));
  for (const p of additions) {
    const prior = existing.get(p.id);
    if (!prior) continue;
    const equivalent =
      prior.img === p.img &&
      prior.studio === p.studio &&
      prior.persona === p.persona &&
      sameArray(prior.animeTypes, p.animeTypes) &&
      sameArray(prior.genres, p.genres) &&
      (prior.family ?? null) === (p.family ?? null) &&
      !prior.pending;
    if (!equivalent) fail(`Existing poster ID ${p.id} conflicts with expansion metadata`);
  }
  return { byStudio, families };
}

function assetPath(p) {
  return path.join(PUBLIC, p.img.replace(/^\//, ""));
}

function missingAssets() {
  return additions.filter((p) => {
    const file = assetPath(p);
    return !fs.existsSync(file) || fs.statSync(file).size === 0;
  });
}

function promptFor(p) {
  return `${HOUSE_STYLE}. ${STUDIO_STYLE[p.studio]}. ${p.concept}`;
}

function writeCatalog() {
  const q = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = ["id,studio,persona,anime_types,genres,family,img,generation_prompt"];
  for (const p of additions) {
    lines.push([
      p.id,
      p.studio,
      p.persona,
      p.animeTypes.join("|"),
      p.genres.join("|"),
      p.family ?? "",
      p.img,
      promptFor(p),
    ].map(q).join(","));
  }
  fs.writeFileSync(CATALOG_PATH, `${lines.join("\n")}\n`);
}

function coverage(rows) {
  const out = Object.fromEntries([...activeGenres].map((g) => [g, 0]));
  for (const p of rows) for (const g of p.genres ?? []) if (g in out) out[g] += 1;
  return out;
}

function apply() {
  const missing = missingAssets();
  if (missing.length) {
    fail(`Refusing --apply: ${missing.length}/96 real poster assets are missing or empty. First missing: ${missing.slice(0, 8).map((p) => p.img).join(", ")}`);
  }

  const newIds = new Set(additions.map((p) => p.id));
  const baseRows = manifest.posters.filter((p) => !newIds.has(p.id));
  const newRows = additions.map(({ concept, ...p }) => ({ ...p, pending: false }));
  const posters = [...baseRows, ...newRows];

  if (new Set(posters.map((p) => p.id)).size !== posters.length) fail("Final manifest would contain duplicate poster IDs");
  if (new Set(posters.filter((p) => p.img).map((p) => p.img)).size !== posters.filter((p) => p.img).length) {
    fail("Final manifest would contain duplicate image paths");
  }

  const studioCounts = Object.fromEntries(Object.keys(STUDIO_META).map((studio) => [studio, posters.filter((p) => p.studio === studio).length]));
  const distinctCounts = new Set(Object.values(studioCounts));
  if (distinctCounts.size !== 1) fail(`Final studio capacities are uneven: ${JSON.stringify(studioCounts)}`);
  const perStudio = Object.values(studioCounts)[0];
  const generated = posters.filter((p) => !p.pending).length;
  const pending = posters.filter((p) => !!p.pending).length;

  if (perStudio !== 44 || posters.length !== 264 || generated !== 262 || pending !== 2) {
    fail(`Unexpected final counts: perStudio=${perStudio}, total=${posters.length}, generated=${generated}, pending=${pending}`);
  }

  const finalManifest = {
    ...manifest,
    schema: Math.max(2, manifest.schema ?? 0),
    capacity: { perStudio, studios: Object.keys(STUDIO_META).length, total: posters.length },
    generated,
    pending,
    posters,
  };
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(finalManifest, null, 2)}\n`);
  writeCatalog();
  console.log(`Applied 96 real shared-pool posters. Runtime manifest: ${generated}/${posters.length} generated, ${pending} pending.`);
}

const { byStudio, families } = validatePlan();
const currentLive = manifest.posters.filter((p) => !p.pending);
const afterRows = [...currentLive.filter((p) => !additions.some((a) => a.id === p.id)), ...additions];
const missing = missingAssets();
console.log(`Shared poster expansion plan: ${additions.length} additions, ${families.size} families, ${additions.filter((p) => !p.family).length} standalones.`);
for (const studio of Object.keys(STUDIO_META)) console.log(`  ${studio}: +${byStudio.get(studio)}`);
console.log(`Art readiness: ${additions.length - missing.length}/${additions.length} files present; ${missing.length} missing.`);
console.log("Coverage after planned expansion:");
for (const [genre, count] of Object.entries(coverage(afterRows)).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${genre}: ${count}`);
}

if (process.argv.includes("--write-catalog")) {
  writeCatalog();
  console.log(`Wrote ${path.relative(ROOT, CATALOG_PATH)}`);
}
if (process.argv.includes("--apply")) apply();
