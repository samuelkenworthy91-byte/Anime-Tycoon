#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "SHA256SUMS.txt");

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(absolute);
    return absolute === target ? [] : [absolute];
  });
}

const lines = filesUnder(root).sort().map((absolute) => {
  const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
  const digest = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
  return `${digest}  ${relative}`;
});
fs.writeFileSync(target, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${lines.length} checksums to ${target}`);
