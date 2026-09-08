#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(here, "patch-cast-multifilter.mjs");
const source = fs.readFileSync(target, "utf8");
const lines = source.split(/\r?\n/);
let changed = false;
const fixed = lines.map((line) => {
  if (line.includes("key={") && line.includes("filter.kind") && line.includes("filter.value")) {
    changed = true;
    return '                        key={filter.kind + ":" + filter.value}';
  }
  return line;
});
if (!changed) throw new Error("Could not find malformed cast-filter key line to repair");
fs.writeFileSync(target, fixed.join("\n"));
console.log("Repaired cast multi-filter patcher escaping.");
