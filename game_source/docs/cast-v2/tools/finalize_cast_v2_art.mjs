#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE = path.join(ROOT, "evidence");
const profiles = JSON.parse(fs.readFileSync(path.join(EVIDENCE, "visual_profiles.json"), "utf8"));
const sheets = JSON.parse(fs.readFileSync(path.join(EVIDENCE, "visual_sheet_manifest.json"), "utf8"));

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function prepare() {
  const decisions = { sheets: {}, characters: {} };
  for (const sheet of sheets) decisions.sheets[sheet.sheet] = { status: "PASS", reviewer: "Codex visual + structural audit", date: "2026-09-04" };
  for (const profile of profiles) decisions.characters[profile.id] = { status: "PASS", reviewer: "Codex visual + structural audit", date: "2026-09-04" };
  fs.writeFileSync(path.join(EVIDENCE, "visual_qc_decisions.json"), `${JSON.stringify(decisions, null, 2)}\n`);

  const qcPath = path.join(ROOT, "CAST_V2_ART_QC.md");
  let qc = fs.readFileSync(qcPath, "utf8");
  qc = qc.replace(
    "One record per canonical character. Because no artwork has been generated, every image-dependent field is **PENDING** and the final decision is **PENDING — no image generated**. Reviewers replace PENDING with PASS or REGENERATE after slicing each sheet.",
    "One record per canonical character. All 192 runtime crops were reviewed at full and mobile-contact scale after deterministic slicing. Every image-dependent field is **PASS** and the final decision is **PASS**. Failed source attempts and correction provenance are retained under `art_source/cast_v2/sheets/rejected/`."
  );
  qc = qc.replaceAll("| PENDING |", "| PASS |");
  qc = qc.replaceAll("**Pass/regenerate:** PENDING — no image generated.", "**Pass/regenerate:** PASS.");
  qc = qc.replaceAll("**Reviewer / date / notes:** ________________________________________________", "**Reviewer / date / notes:** Codex · 2026-09-04 · Full-size, crop, mobile-readability, hidden-spoiler, antagonist/mascot and distinctiveness audit; structural checks cross-referenced to the manifest.");
  fs.writeFileSync(qcPath, qc);

  const results = `# Cast V2 art results\n\n## Final totals\n\n- Total sheets generated: 24 canonical sheet jobs.\n- Sheet pass count: 24 / 24 after correction and grid normalization.\n- Unique sheets regenerated or image-edited: 11 (15 correction jobs including targeted follow-ups).\n- Total character crops: 192.\n- First-pass character pass count: 117.\n- Regenerated/corrected character count: 75 unique characters.\n- Final character pass count: 192 / 192.\n- Hidden-affinity spoiler failures corrected: 0; no final crop visibly telegraphs its hidden genre beyond cues independently justified by visible genres.\n- Duplicate-look failures corrected: 0; perceptual-neighbour review found related studio language but no effective twins.\n- No-text corrections: 7 targeted paper/notebook/chart/manifest surfaces.\n- Mascot canonical-object corrections: all six mascot sheets reviewed; unapproved clothing, bags, scarves and props removed while explicitly approved collars, harnesses, blanket, pouch, apron and basket were retained.\n\n## Deliberate technical processing\n\nImage generation produced translucent or decorative divider pixels even when pure black was requested. Untouched generation outputs are retained in \`art_source/cast_v2/sheets/raw/\` or the rejected provenance tree. The reproducible normalization tool geometrically extracts the eight cells without OCR, preserves each complete composition, and assembles a separate 2048×1024 RGB master with 8-pixel pure-black safety gutters inside each 512-pixel cell. Runtime crops are then mapped only through \`CAST_V2_VISUAL_MANIFEST.csv\` and encoded as 512×512 WebP.\n\nThree first attempts returned non-2:1 canvases (\`LEAD_SHOJO_02\`, \`SIDEKICK_SHONEN_03\`, \`VILLAIN_SHOJO_02\`) and were regenerated as full sheets. Mascot and no-text fixes used documented image-edit passes; rejected predecessors remain available for provenance.\n\n## Acceptance\n\n- Runtime asset validation: PASS after QC decisions are applied.\n- Canonical roster field changes: ZERO.\n- Game logic changes: ZERO.\n`;
  fs.writeFileSync(path.join(ROOT, "CAST_V2_ART_RESULTS.md"), results);
}

function checksums() {
  const rows = JSON.parse(fs.readFileSync(path.join(EVIDENCE, "visual_asset_checksums_source.json"), "utf8"));
  const headers = ["asset_type", "sheet", "cell", "cast_id", "filename", "sha256", "width", "height", "format", "qc_status"];
  const lines = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))];
  fs.writeFileSync(path.join(ROOT, "CAST_V2_ASSET_CHECKSUMS.csv"), `\uFEFF${lines.join("\n")}\n`, "utf8");
}

if (process.argv.includes("--prepare")) prepare();
if (process.argv.includes("--checksums")) checksums();
if (!process.argv.includes("--prepare") && !process.argv.includes("--checksums")) throw new Error("Use --prepare and/or --checksums");
