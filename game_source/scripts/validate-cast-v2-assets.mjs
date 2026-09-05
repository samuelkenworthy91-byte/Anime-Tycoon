import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const game = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(game, "..");
const docs = join(game, "docs", "cast-v2");
const runtime = join(game, "public", "cast", "v2");
const approved = join(repo, "public", "cast", "v2");
const temp = mkdtempSync(join(tmpdir(), "cast-v2-assets-"));
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const result = spawnSync("python3", [
  join(docs, "tools", "validate_cast_v2_assets.py"),
  "--manifest", join(docs, "CAST_V2_VISUAL_MANIFEST.csv"),
  "--masters", join(repo, "art_source", "cast_v2", "sheets", "approved"),
  "--runtime", runtime,
  "--output", join(temp, "validation.json"),
  "--checksum-source", join(temp, "checksums.json"),
  "--mobile-previews", join(temp, "mobile"),
  "--qc-decisions", join(docs, "evidence", "visual_qc_decisions.json"),
  "--expected-size", "512",
], { encoding: "utf8" });

process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);

const sourceFiles = readdirSync(approved).filter((file) => file.endsWith(".webp")).sort();
const runtimeFiles = readdirSync(runtime).filter((file) => file.endsWith(".webp")).sort();
if (sourceFiles.length !== 192 || JSON.stringify(sourceFiles) !== JSON.stringify(runtimeFiles)) {
  throw new Error("Approved/runtime Cast V2 filename sets differ");
}
for (const file of sourceFiles) {
  if (sha256(join(approved, file)) !== sha256(join(runtime, file))) {
    throw new Error(`Runtime portrait differs from approved source: ${file}`);
  }
}
console.log("Approved/runtime portrait hashes: 192/192 identical");
