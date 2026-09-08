#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(here, "patch-cast-multifilter.mjs");
let source = fs.readFileSync(target, "utf8");

const mapPos = source.indexOf("castFilters.map((filter)");
if (mapPos < 0) throw new Error("Could not find active cast-filter map in patcher");
const keyStart = source.indexOf("key={", mapPos);
if (keyStart < 0) throw new Error("Could not find malformed key start in patcher");
const onClickPos = source.indexOf("\\n                        onClick", keyStart);
if (onClickPos < 0) throw new Error("Could not find onClick after malformed key in patcher");

source = source.slice(0, keyStart) + 'key={filter.kind + ":" + filter.value}' + source.slice(onClickPos);
fs.writeFileSync(target, source);
console.log("Repaired cast multi-filter patcher escaping.");
