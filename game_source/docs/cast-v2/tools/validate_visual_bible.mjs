#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE = path.join(ROOT, "evidence");
const roster = JSON.parse(fs.readFileSync(path.join(ROOT, "CAST_V2_MASTER.json"), "utf8"));
const profiles = JSON.parse(fs.readFileSync(path.join(EVIDENCE, "visual_profiles.json"), "utf8"));
const sheets = JSON.parse(fs.readFileSync(path.join(EVIDENCE, "visual_sheet_manifest.json"), "utf8"));
const conceptAuditPath = path.join(EVIDENCE, "visual_concept_audit.json");
const conceptAudit = JSON.parse(fs.readFileSync(conceptAuditPath, "utf8"));

const ROLE_TOKENS = [["Lead", "LEAD"], ["Sidekick", "SIDEKICK"], ["Mascot", "MASCOT"], ["Villain", "VILLAIN"]];
const TYPES = ["SHONEN", "SHOJO"];
const CELLS = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4"];
const LOCKED_FIELDS = [
  "id", "old_name", "new_name", "role", "anime_type", "gender", "age_band", "species",
  "cultural_basis", "archetype", "visible_genre_1", "visible_genre_2", "hidden_genre"
];
const REQUIRED_FILES = [
  "CAST_V2_VISUAL_BIBLE.md", "CAST_V2_VISUAL_MANIFEST.csv", "CAST_V2_SHEET_PLAN.md",
  "CAST_V2_SHEET_PROMPTS.md", "CAST_V2_SHEET_PROMPTS_GENERATOR.md", "CAST_V2_GENERATION_BATCHES.md", "CAST_V2_ART_QC.md"
];
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted && char === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ',') { row.push(field); field = ""; }
    else if (!quoted && char === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

for (const file of REQUIRED_FILES) check(fs.existsSync(path.join(ROOT, file)), `Missing output: ${file}`);
check(roster.length === 192, `Canonical source has ${roster.length} records, expected 192`);
check(new Set(roster.map((member) => member.id)).size === 192, "Canonical source IDs are not unique");
check(profiles.length === 192, `Visual profiles have ${profiles.length} records, expected 192`);

const sourceById = new Map(roster.map((member) => [member.id, member]));
const profileById = new Map(profiles.map((member) => [member.id, member]));
check(profileById.size === 192, "Visual profile IDs are not unique");
for (const source of roster) {
  const profile = profileById.get(source.id);
  check(Boolean(profile), `Missing visual profile: ${source.id}`);
  if (!profile) continue;
  for (const field of LOCKED_FIELDS) check(profile[field] === source[field], `Canonical delta ${source.id}.${field}: ${JSON.stringify(source[field])} -> ${JSON.stringify(profile[field])}`);
  const prompt = profile.prompt;
  const requiredPromptTokens = [
    profile.new_name, `Stable technical ID: ${profile.id}`, `Canonical role: ${profile.role}`, `Anime Type: ${profile.anime_type}`,
    `Gender/presentation: ${profile.gender}`, `Approximate age band: ${profile.age_band}`, `Species: ${profile.species}`,
    `Cultural/design basis: ${profile.cultural_basis}`, "Height impression:", "Physical build:", "Skin/complexion or surface:",
    "Face structure:", "Eyes:", "Hair/crown:", "Distinguishing detail:", "Exact clothing and canonical object design:",
    "Clothing/material construction:", "Footwear/lower-body treatment:", "Accessories, props, and equipment:", "Primary palette:",
    "Secondary/accent palette:", "Silhouette:", "Body language:", "Facial expression:",
    `Visible ${profile.visible_genre_1.replace(/^./, (c) => c.toUpperCase())}`, `Hidden affinity: ${profile.hidden_genre.toUpperCase()}`,
    "Action-shot concept:", "Pose type:", "Movement direction:", "Torso orientation:", "Head orientation:", "Camera angle:",
    "Character-specific background:", "Time/weather:", "Lighting:", "Foreground/environmental effect:", "Crop-safe framing:",
    "Differentiation instruction:", `${profile.role === "Villain" ? "Antagonist" : profile.role} readability:`, `${profile.anime_type} visual language:`, "Premium prestige television-anime character rendering"
  ];
  for (const token of requiredPromptTokens) check(prompt.includes(token), `${profile.id} prompt missing token: ${token}`);
  check(prompt.includes("must not be guessable from the base portrait"), `${profile.id} lacks comprehensive hidden anti-spoiler direction`);
}

const expectedSheetNames = [];
for (const [, roleToken] of ROLE_TOKENS) for (const type of TYPES) for (let index = 1; index <= 3; index += 1) expectedSheetNames.push(`${roleToken}_${type}_${String(index).padStart(2, "0")}`);
check(sheets.length === 24, `Found ${sheets.length} sheets, expected 24`);
check(JSON.stringify(sheets.map((sheet) => sheet.sheet)) === JSON.stringify(expectedSheetNames), "Sheet order or naming differs from the approved 24-sheet structure");

const assignments = [];
for (const sheet of sheets) {
  check(Object.keys(sheet.cells).length === 8, `${sheet.sheet} does not have exactly eight cells`);
  check(JSON.stringify(Object.keys(sheet.cells)) === JSON.stringify(CELLS), `${sheet.sheet} cell order is not A1-A4/B1-B4`);
  for (const cell of CELLS) {
    const assigned = sheet.cells[cell];
    if (!assigned) continue;
    assignments.push({ sheet: sheet.sheet, cell, ...assigned });
    const profile = profileById.get(assigned.id);
    check(Boolean(profile), `${sheet.sheet} ${cell} references unknown ID ${assigned.id}`);
    if (!profile) continue;
    check(profile.new_name === assigned.name, `${sheet.sheet} ${cell} name mismatch for ${assigned.id}`);
    check(profile.role === sheet.role && profile.anime_type === sheet.anime_type, `${sheet.sheet} ${cell} violates Role × Type block`);
  }
}
check(assignments.length === 192, `Found ${assignments.length} sheet assignments, expected 192`);
check(new Set(assignments.map((row) => row.id)).size === 192, "A canonical ID is missing or duplicated in sheet assignments");
check([...sourceById.keys()].every((id) => assignments.some((row) => row.id === id)), "At least one canonical ID is absent from the sheets");
check(new Set(assignments.map((row) => `${row.sheet}|${row.cell}`)).size === 192, "Duplicate sheet/cell coordinate found");
for (const [role, roleToken] of ROLE_TOKENS) for (const type of TYPES) {
  check(sheets.filter((sheet) => sheet.role === role && sheet.anime_type === type).length === 3, `${role} × ${type} does not have exactly three sheets`);
  check(assignments.filter((row) => row.sheet.startsWith(`${roleToken}_${type}_`)).length === 24, `${role} × ${type} does not contain exactly 24 characters`);
}

const csvRows = parseCsv(fs.readFileSync(path.join(ROOT, "CAST_V2_VISUAL_MANIFEST.csv"), "utf8"));
const expectedCsvHeader = ["sheet", "cell", "id", "name", "role", "anime_type", "visible_genre_1", "visible_genre_2", "hidden_genre", "gender", "species", "age_band", "cultural_basis", "visual_summary", "primary_palette", "secondary_palette", "crop_filename"];
check(JSON.stringify(csvRows[0]) === JSON.stringify(expectedCsvHeader), "Visual manifest CSV header differs from the required 17 columns");
check(csvRows.length === 193, `Visual manifest CSV has ${csvRows.length - 1} data rows, expected 192`);
const csvObjects = csvRows.slice(1).map((row) => Object.fromEntries(expectedCsvHeader.map((header, index) => [header, row[index]])));
check(new Set(csvObjects.map((row) => row.id)).size === 192, "Visual manifest CSV IDs are missing or duplicated");
check(new Set(csvObjects.map((row) => row.crop_filename)).size === 192, "Visual manifest CSV crop filenames are missing or duplicated");
for (const assignment of assignments) {
  const row = csvObjects.find((candidate) => candidate.sheet === assignment.sheet && candidate.cell === assignment.cell);
  const profile = profileById.get(assignment.id);
  check(Boolean(row), `Manifest CSV missing ${assignment.sheet} ${assignment.cell}`);
  if (!row || !profile) continue;
  const expected = {
    id: profile.id, name: profile.new_name, role: profile.role, anime_type: profile.anime_type,
    visible_genre_1: profile.visible_genre_1, visible_genre_2: profile.visible_genre_2, hidden_genre: profile.hidden_genre,
    gender: profile.gender, species: profile.species, age_band: profile.age_band, cultural_basis: profile.cultural_basis,
    visual_summary: profile.visual_summary, primary_palette: profile.primary, secondary_palette: profile.secondary,
    crop_filename: `${assignment.sheet.toLowerCase()}__${assignment.cell.toLowerCase()}__${assignment.id}.webp`
  };
  for (const [field, value] of Object.entries(expected)) check(row[field] === value, `Manifest CSV mismatch ${assignment.sheet} ${assignment.cell} ${field}`);
}

const promptDocument = fs.readFileSync(path.join(ROOT, "CAST_V2_SHEET_PROMPTS.md"), "utf8");
const generatorPromptDocument = fs.readFileSync(path.join(ROOT, "CAST_V2_SHEET_PROMPTS_GENERATOR.md"), "utf8");
const promptBlocks = [...promptDocument.matchAll(/^## (\d{2}) — ([A-Z]+_(?:SHONEN|SHOJO)_\d{2})$/gm)];
check(promptBlocks.length === 24, `Sheet prompt document has ${promptBlocks.length} prompt headings, expected 24`);
for (const sheet of sheets) {
  const headingAt = promptDocument.indexOf(`## ${String(sheet.sheet_number).padStart(2, "0")} — ${sheet.sheet}`);
  const nextAt = promptDocument.indexOf("\n## ", headingAt + 4);
  const section = promptDocument.slice(headingAt, nextAt < 0 ? undefined : nextAt);
  for (const phrase of ["exactly one 2×4", "exactly eight equal", "thick pure-black divider", "thick pure-black outer frame", "No text of any kind", "No character, hair", "Exactly one featured character appears in each cell", "approximately knees-up/three-quarter-body framing"]) check(section.includes(phrase), `${sheet.sheet} standalone prompt missing layout phrase: ${phrase}`);
  for (const cell of CELLS) {
    const assigned = sheet.cells[cell];
    check(section.includes(`${cell} — ${assigned.id} — ${assigned.name}`), `${sheet.sheet} prompt missing ordered identity ${cell} ${assigned.id}`);
    check(section.includes(`Hidden affinity: ${profileById.get(assigned.id).hidden_genre.toUpperCase()}`), `${sheet.sheet} prompt missing hidden anti-spoiler rule for ${assigned.id}`);
  }
}

const generatorHeadings = [...generatorPromptDocument.matchAll(/^## (\d{2}) — ([A-Z]+_(?:SHONEN|SHOJO)_\d{2})$/gm)];
check(generatorHeadings.length === 24, `Generator-safe prompt document has ${generatorHeadings.length} headings, expected 24`);
for (const sheet of sheets) {
  const heading = `## ${String(sheet.sheet_number).padStart(2, "0")} — ${sheet.sheet}`;
  const headingAt = generatorPromptDocument.indexOf(heading);
  const fenceStart = generatorPromptDocument.indexOf("```text\n", headingAt) + 8;
  const fenceEnd = generatorPromptDocument.indexOf("\n```", fenceStart);
  const section = generatorPromptDocument.slice(fenceStart, fenceEnd);
  check(section.length > 0 && section.length <= 32000, `${sheet.sheet} generator prompt length ${section.length} is outside 1–32000`);
  for (const phrase of ["exactly one 2×4", "thick pure-black divider", "thick pure-black outer frame", "GLOBAL HIDDEN-AFFINITY RULE", "FINAL ENFORCEMENT", "absolutely no text"]) check(section.includes(phrase), `${sheet.sheet} generator prompt missing ${phrase}`);
  for (const cell of CELLS) {
    const assigned = sheet.cells[cell];
    const profile = profileById.get(assigned.id);
    for (const token of [`${cell} — ${assigned.id} — ${assigned.name}`, `Stable technical ID: ${assigned.id}`, profile.visual_summary, profile.visible1, profile.visible2, `HIDDEN AFFINITY — ${profile.hidden_genre.toUpperCase()}`, profile.action_shot, profile.background_location, `visibly distinct from ${profile.differentiation_peer}`]) {
      check(section.includes(token), `${sheet.sheet} generator prompt lost character-specific token for ${assigned.id}: ${token.slice(0, 80)}`);
    }
  }
}

for (const sheet of sheets) {
  const members = Object.values(sheet.cells).map((entry) => profileById.get(entry.id));
  check(new Set(members.map((member) => member.movement_direction)).size === 8, `${sheet.sheet} lacks eight distinct movement directions`);
  check(new Set(members.map((member) => member.camera_angle)).size >= 6, `${sheet.sheet} lacks sufficient camera variety`);
  check(new Set(members.map((member) => member.background_location)).size === 8, `${sheet.sheet} lacks eight distinct character backgrounds`);
  check(new Set(members.map((member) => `${member.background_time_weather}|${member.lighting_concept}`)).size === 8, `${sheet.sheet} lacks eight distinct time/lighting signatures`);
}

const planDocument = fs.readFileSync(path.join(ROOT, "CAST_V2_SHEET_PLAN.md"), "utf8");
for (const assignment of assignments) check(planDocument.includes(`${assignment.cell} | \`${assignment.id}\` | ${assignment.name}`), `Sheet plan missing ${assignment.sheet} ${assignment.cell} ${assignment.id}`);
const batchDocument = fs.readFileSync(path.join(ROOT, "CAST_V2_GENERATION_BATCHES.md"), "utf8");
for (const [batch, first, last] of [[1, 1, 8], [2, 9, 16], [3, 17, 24]]) check(batchDocument.includes(`## Batch ${batch} — sheets ${first}–${last}`), `Missing Batch ${batch} heading`);
check(batchDocument.includes("Every batch contains exactly 64 unique canonical characters"), "Generation-batch preamble must state the exact 64-character count");

const qcDocument = fs.readFileSync(path.join(ROOT, "CAST_V2_ART_QC.md"), "utf8");
check((qcDocument.match(/^## [A-Z]+_(?:SHONEN|SHOJO)_\d{2} [AB][1-4] — /gm) || []).length === 192, "QC file does not contain exactly 192 character records");
const pendingQc = (qcDocument.match(/^\*\*Pass\/regenerate:\*\* PENDING — no image generated\./gm) || []).length;
const passedQc = (qcDocument.match(/^\*\*Pass\/regenerate:\*\* PASS\./gm) || []).length;
check((pendingQc === 192 && passedQc === 0) || (pendingQc === 0 && passedQc === 192), "QC file must contain exactly 192 consistent PENDING or PASS verdicts");
if (fs.existsSync(path.join(ROOT, "CAST_V2_ASSET_CHECKSUMS.csv"))) check(passedQc === 192, "Final art package requires 192 PASS verdicts");

const faceEyeCollisions = profiles.length - new Set(profiles.map((member) => `${member.face}|${member.eyes}`)).size;
const faceEyeHairCollisions = profiles.length - new Set(profiles.map((member) => `${member.face}|${member.eyes}|${member.hair}`)).size;
const fullSignatureCollisions = profiles.length - new Set(profiles.map((member) => `${member.face}|${member.eyes}|${member.hair}|${member.silhouette}|${member.primary}`)).size;
check(faceEyeCollisions === 0, `${faceEyeCollisions} duplicate face/eye signatures found`);
check(faceEyeHairCollisions === 0, `${faceEyeHairCollisions} duplicate face/eye/hair signatures found`);
check(fullSignatureCollisions === 0, `${fullSignatureCollisions} duplicate full visual signatures found`);

const cropNames = assignments.map((assignment) => `${assignment.sheet.toLowerCase()}__${assignment.cell.toLowerCase()}__${assignment.id}.webp`);
check(new Set(cropNames).size === 192, "Crop filenames are not unique");
const generatedImageFiles = fs.readdirSync(ROOT).filter((name) => /\.(png|jpe?g|webp|gif)$/i.test(name));
check(generatedImageFiles.length === 0, `Artwork exists despite the no-generation instruction: ${generatedImageFiles.join(", ")}`);

const validation = {
  result: errors.length === 0 ? "PASS" : "FAIL",
  errors,
  canonical_ids: roster.length,
  visual_profiles: profiles.length,
  locked_field_deltas: errors.filter((error) => error.startsWith("Canonical delta")).length,
  sheet_count: sheets.length,
  assignments: assignments.length,
  unique_assignment_ids: new Set(assignments.map((row) => row.id)).size,
  characters_per_sheet: [...new Set(sheets.map((sheet) => Object.keys(sheet.cells).length))],
  role_type_sheet_counts: Object.fromEntries(ROLE_TOKENS.flatMap(([role]) => TYPES.map((type) => [`${role}|${type}`, sheets.filter((sheet) => sheet.role === role && sheet.anime_type === type).length]))),
  unique_sheet_cells: new Set(assignments.map((row) => `${row.sheet}|${row.cell}`)).size,
  unique_crop_filenames: new Set(cropNames).size,
  face_eye_signature_collisions: faceEyeCollisions,
  face_eye_hair_signature_collisions: faceEyeHairCollisions,
  full_visual_signature_collisions: fullSignatureCollisions,
  generated_artwork_files: generatedImageFiles,
  note: passedQc === 192 ? "Rendered-art QC ledger contains 192 PASS verdicts; asset-level validation is recorded separately." : "Structural validation cannot judge rendered-art execution; QC remains pending until artwork exists."
};
fs.writeFileSync(path.join(EVIDENCE, "visual_final_validation.json"), `${JSON.stringify(validation, null, 2)}\n`);
conceptAudit.validation = validation.result;
fs.writeFileSync(conceptAuditPath, `${JSON.stringify(conceptAudit, null, 2)}\n`);
console.log(JSON.stringify(validation, null, 2));
if (errors.length) process.exitCode = 1;
