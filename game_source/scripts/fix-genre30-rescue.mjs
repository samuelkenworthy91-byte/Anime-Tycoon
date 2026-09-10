import { readFileSync, writeFileSync } from "node:fs";
const path = "game_source/docs/content-v6/GENRE30_ARCS.json";
let s = readFileSync(path, "utf8");
const from = '"arcs":["g30_kj_firstsiren","g30_kj_evacline","narr_rescue"]';
const to = '"arcs":["g30_kj_firstsiren","g30_kj_evacline","g30_kj_citybreaker"]';
if (!s.includes(from)) throw new Error("Kaiju survival combo patch target not found");
s = s.replace(from, to);
writeFileSync(path, s);
console.log("Replaced invalid narr_rescue reference with the live V6 City Breaker climax.");
