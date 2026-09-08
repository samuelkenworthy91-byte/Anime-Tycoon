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

/* The repairs above alter literals the main patcher also used as search
 * targets. Apply those two title-generation source edits here first. */
const rivalsPath = "game_source/src/engine/rivals.ts";
let rivals = fs.readFileSync(rivalsPath, "utf8");

const oldOriginalBlock = [
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
const newOriginalBlock = [
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
if (!rivals.includes(newOriginalBlock)) {
  if (!rivals.includes(oldOriginalBlock)) throw new Error("Could not locate original rival title-generation block");
  rivals = rivals.replace(oldOriginalBlock, newOriginalBlock);
}

const oldSurpriseBlock = [
  '      const fr = maybeContinue(studio);',
  '      const genres = fr ? [...fr.genres] : pickGenres(studio);',
  '      const kind: RivalEntryKind = fr ? "season" : "original";',
  '      let title = fr ? makeTitle(fr, kind) : pick(PUN_TITLES);',
  '      if (!fr) while (studio.franchises.some((f) => f.baseTitle === title)) title = `${title} 2`;',
  '      const id = `rp${++rivalProdSeq}_surp_${week}`;',
  '      const animeType = fr?.animeType ?? (studio.persona === "idol" || studio.persona === "prestige" ? "shojo" : "shonen");',
].join("\n");
const newSurpriseBlock = [
  '      const fr = maybeContinue(studio);',
  '      const genres = fr ? [...fr.genres] : pickGenres(studio);',
  '      const kind: RivalEntryKind = fr ? "season" : "original";',
  '      const animeType = fr?.animeType ?? (studio.persona === "idol" || studio.persona === "prestige" ? "shojo" : "shonen");',
  '      const usedTitles = new Set(world.studios.flatMap((s) => [',
  '        ...s.releases.map((release) => release.title.toLowerCase()),',
  '        ...s.productions.map((production) => production.title.toLowerCase()),',
  '        ...s.franchises.map((franchise) => franchise.baseTitle.toLowerCase()),',
  '      ]));',
  '      const title = uniqueTitle(fr ? makeTitle(fr, kind) : makeOriginalTitle(genres, animeType), usedTitles);',
  '      const id = `rp${++rivalProdSeq}_surp_${week}`;',
].join("\n");
if (!rivals.includes(newSurpriseBlock)) {
  if (!rivals.includes(oldSurpriseBlock)) throw new Error("Could not locate surprise rival title-generation block");
  rivals = rivals.replace(oldSurpriseBlock, newSurpriseBlock);
}

fs.writeFileSync(rivalsPath, rivals);
console.log("Awards polish bootstrap repaired and both rival title blocks prepatched.");
