import { readFileSync, writeFileSync } from "node:fs";
const path = "game_source/scripts/finalize-genre30-static.mjs";
let s = readFileSync(path, "utf8");
const from = 's = replaceAllChecked(s, "920", "1440", 2, "canonical roster count");';
const to = 's = replaceAllChecked(s, "920", "1440", 3, "canonical roster count");';
if (!s.includes(from)) throw new Error("expected roster-count patch target not found");
s = s.replace(from, to);
writeFileSync(path, s);
await import("./finalize-genre30-static.mjs?retry=2");
