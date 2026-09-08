#!/usr/bin/env node
import fs from "node:fs";

/* Repair nested template literals in the one-shot patcher itself. */
const patchPath = ".github/scripts/awards-polish-pass.mjs";
let src = fs.readFileSync(patchPath, "utf8");
const replacements = [
  ['return `${base}!`;', 'return base + "!";'],
  ['const candidate = `${base}: ${tag}`;', 'const candidate = base + ": " + tag;'],
  ['while (usedTitles.has(`${base} ${n}`.toLowerCase())) n += 1;', 'while (usedTitles.has((base + " " + n).toLowerCase())) n += 1;'],
  ['return `${base} ${n}`;', 'return base + " " + n;'],
  ['title = `${title} 2`;', 'title = title + " 2";'],
];
for (const [from, to] of replacements) src = src.split(from).join(to);
fs.writeFileSync(patchPath, src);

/* The repair above necessarily alters a literal that the patcher was using as
 * a source-search string. Apply that one source edit here first; the main
 * patcher sees its desired output already present and safely skips the edit. */
const rivalsPath = "game_source/src/engine/rivals.ts";
let rivals = fs.readFileSync(rivalsPath, "utf8");
const oldBlock = [
  '    } else {',
  '      kind = "original";',
  '      title = makeTitle({ key: "", baseTitle: "", genres: [], animeType: "shonen", season: 0, popularity: 0, bestScore: 0, lastScore: 0, lastEntryWeek: 0, entries: 0 }, "original");',
  '      while (usedTitles.has(title) || franchises.some((f) => f.baseTitle === title)) title = `${title} 2`;',
  '      usedTitles.add(title);',
  '      genres = pickGenres(studio);',
  '      animeType = studio.persona === "idol" || studio.persona === "prestige" ? "shojo" : Math.random() < 0.5 ? "shonen" : "shojo";',
  '      franchiseKey = null;',
  '    }',
].join("\n");
const newBlock = [
  '    } else {',
  '      kind = "original";',
  '      genres = pickGenres(studio);',
  '      animeType = studio.persona === "idol" || studio.persona === "prestige" ? "shojo" : Math.random() < 0.5 ? "shonen" : "shojo";',
  '      title = uniqueTitle(makeOriginalTitle(genres, animeType), usedTitles);',
  '      franchiseKey = null;',
  '    }',
  '    title = uniqueTitle(title, usedTitles);',
  '    usedTitles.add(title.toLowerCase());',
].join("\n");
if (!rivals.includes(newBlock)) {
  if (!rivals.includes(oldBlock)) throw new Error("Could not locate original rival title-generation block");
  rivals = rivals.replace(oldBlock, newBlock);
  fs.writeFileSync(rivalsPath, rivals);
}

console.log("Awards polish bootstrap repaired and rival title block prepatched.");
