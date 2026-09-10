import fs from "node:fs";

const path = "game_source/src/components/Create.tsx";
let src = fs.readFileSync(path, "utf8");
const current = `                {combo.secret && comboDiscovered && (\n                  <span className="ml-2 text-xs text-viol">✦ ×{combo.mult.toFixed(2)} review score — {comboResearchKnown ? "R&D confirmed this!" : "you discovered this!"}</span>\n                )}`;
const expectedByV1 = `                {combo.secret && comboDiscovered && (\n                  <span className="ml-2 text-xs text-viol">✦ ×{combo.mult.toFixed(2)} review score — you discovered this!</span>\n                )}`;
if (!src.includes(current)) throw new Error("Create.tsx secret-combo label target changed unexpectedly");
src = src.replace(current, expectedByV1);
fs.writeFileSync(path, src);
await import(`./finish-consequences-branch.mjs?run=${Date.now()}`);
