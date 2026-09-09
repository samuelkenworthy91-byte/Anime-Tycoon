import { access, readFile, readdir, stat } from "node:fs/promises";

const root = new URL("../public/auction-ip/", import.meta.url);
const slots = await readFile(new URL("../docs/AUCTION_IP_POSTER_SLOTS.csv", import.meta.url), "utf8");
const expected = new Map(slots.split("\n").slice(1).filter((line) => line.endsWith('"assigned"')).map((line) => {
  const [,filename,ipId,,] = line.match(/^"[^"]*","([^"]*)","([^"]*)","([^"]*)","([^"]*)"$/) ?? [];
  return [filename, { id: ipId }];
}));
const problems = [];
let files = [];
try { files = await readdir(root); } catch { problems.push("public/auction-ip/ does not exist"); }
for (const [filename, ip] of expected) {
  try {
    await access(new URL(filename, root));
    const info = await stat(new URL(filename, root));
    if (info.size > 300_000) problems.push(`${filename} (${ip.id}) exceeds 300 KB`);
  } catch { problems.push(`${filename} (${ip.id}) is missing`); }
}
for (const filename of files.filter((name) => /^poster_\d{3}\.webp$/i.test(name))) {
  const slot = Number(filename.slice(7, 10));
  if (slot < 1 || slot > 80) problems.push(`${filename} is outside reserved slots 001–080`);
}
console.log(`Auction IP posters: ${expected.size - problems.filter((p) => p.includes("is missing")).length}/${expected.size} assigned assets present; ${files.filter((name) => /^poster_\d{3}\.webp$/i.test(name)).length}/80 reserved slots populated.`);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
}
