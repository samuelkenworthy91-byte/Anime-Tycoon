#!/usr/bin/env node
import fs from "node:fs";

const path = ".github/scripts/awards-polish-pass.mjs";
let src = fs.readFileSync(path, "utf8");
const replacements = [
  ['return `${base}!`;', 'return base + "!";'],
  ['const candidate = `${base}: ${tag}`;', 'const candidate = base + ": " + tag;'],
  ['while (usedTitles.has(`${base} ${n}`.toLowerCase())) n += 1;', 'while (usedTitles.has((base + " " + n).toLowerCase())) n += 1;'],
  ['return `${base} ${n}`;', 'return base + " " + n;'],
  ['while (usedTitles.has(title) || franchises.some((f) => f.baseTitle === title)) title = `${title} 2`;', 'while (usedTitles.has(title) || franchises.some((f) => f.baseTitle === title)) title = title + " 2";'],
];
for (const [from, to] of replacements) src = src.split(from).join(to);
fs.writeFileSync(path, src);
console.log("Awards polish bootstrap repaired.");
