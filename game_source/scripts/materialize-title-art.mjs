import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const chunksDir = path.join(root, "public", "img", "title-london-b64");
const output = path.join(root, "public", "img", "title-london.webp");

const files = (await readdir(chunksDir))
  .filter((name) => /^\d+\.txt$/.test(name))
  .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));

if (!files.length) throw new Error("No London title-art chunks found");

const parts = await Promise.all(files.map((name) => readFile(path.join(chunksDir, name), "utf8")));
const encoded = parts.join("").replace(/\s+/g, "");
const bytes = Buffer.from(encoded, "base64");

// RIFF....WEBP header. Fail loudly rather than silently publishing the fallback artwork.
if (bytes.length < 20 || bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WEBP") {
  throw new Error(`Decoded London title art is not a valid WEBP (${bytes.length} bytes)`);
}

await writeFile(output, bytes);
console.log(`Materialized London title art: ${files.length} chunks -> ${bytes.length} bytes`);
