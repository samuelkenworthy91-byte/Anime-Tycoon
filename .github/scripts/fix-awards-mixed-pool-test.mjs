#!/usr/bin/env node
import fs from "node:fs";

const path = "game_source/src/engine/__tests__/awards.test.ts";
let source = fs.readFileSync(path, "utf8");
const oldText = 'const c = runCeremony(1, [mk({ title: "Mine", player: true, score: 24, audience: 12_000 })], world);';
const newText = 'const c = runCeremony(1, [mk({ title: "Mine", player: true, score: 40, story: 80, art: 80, sound: 80, audience: 1_000_000 })], world);';

if (source.includes(newText)) {
  console.log("Awards mixed-pool test is already deterministic.");
  process.exit(0);
}
if (!source.includes(oldText)) throw new Error("Could not locate the awards mixed-pool integration fixture");
source = source.replace(oldText, newText);
fs.writeFileSync(path, source);
console.log("Made awards mixed-pool integration fixture deterministic.");
