import "./refine-arc-plot-summaries.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ipPath = resolve(root, "src/engine/ipHiddenArcs.ts");
let text = readFileSync(ipPath, "utf8");

// The first refinement pass deliberately works on one-line JSON-like TS records.
// Normalise the closing quote it writes so each desc remains valid TypeScript.
text = text.replaceAll('\\"},', '"},');
writeFileSync(ipPath, text);

if (text.includes("The characters face a conflict built around")) {
  throw new Error("A generic IP arc fallback description remains");
}
if (/\\"},/.test(text)) {
  throw new Error("Escaped closing quote remains in an IP arc record");
}

console.log("Normalised refined IP arc records.");
