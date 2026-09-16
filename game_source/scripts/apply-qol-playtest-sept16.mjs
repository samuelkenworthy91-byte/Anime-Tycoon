import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function replaceOnce(relativePath, before, after) {
  const path = resolve(root, relativePath);
  const source = readFileSync(path, "utf8");
  if (source.includes(after)) return false;
  if (!source.includes(before)) throw new Error(`Patch anchor missing in ${relativePath}`);
  writeFileSync(path, source.replace(before, after));
  return true;
}

let changed = false;

changed = replaceOnce(
  "src/App.tsx",
  "const [timeSpeed, setTimeSpeed] = useState<0 | 1 | 4 | 8 | 12>(1);",
  "const [timeSpeed, setTimeSpeed] = useState<0 | 1 | 4 | 8 | 12 | 30>(1);",
) || changed;
changed = replaceOnce(
  "src/App.tsx",
  "const lastClockSpeedRef = useRef<1 | 4 | 8 | 12>(1);",
  "const lastClockSpeedRef = useRef<1 | 4 | 8 | 12 | 30>(1);",
) || changed;
changed = replaceOnce(
  "src/App.tsx",
  "([0, 1, 4, 8, 12] as const).map((speed) => (",
  "([0, 1, 4, 8, 12, 30] as const).map((speed) => (",
) || changed;

const quickTypeButton = `                  {(() => {\n                    const active = isCastFilterActive(\"type\", d.animeType);\n                    const hasTypeFilter = castFilters.some((filter) => filter.kind === \"type\");\n                    const blocked = castFilterAtLimit && !active && !hasTypeFilter;\n                    return (\n                      <button\n                        disabled={blocked}\n                        onClick={() => toggleCastFilter({ kind: \"type\", value: d.animeType })}\n                        className={cn(\n                          \"btn-press rounded-lg border px-2 py-1.5 text-[9px] font-bold\",\n                          active ? \"border-neon bg-neon/10 text-neon\" : \"border-line text-paper/50\",\n                          blocked && \"cursor-not-allowed opacity-35\"\n                        )}\n                      >\n                        {active ? \"FILTERING: \" : \"FILTER: \"}{ANIME_TYPE_LABEL[d.animeType]}\n                      </button>\n                    );\n                  })()}\n                  {d.genres.map((genre) => {`;
changed = replaceOnce(
  "src/components/Create.tsx",
  "                  {d.genres.map((genre) => {",
  quickTypeButton,
) || changed;

changed = replaceOnce(
  "src/components/Ship.tsx",
  '<span className="font-display text-sm font-extrabold text-gold">{hype}%</span>',
  '<span className="font-display text-sm font-extrabold text-gold">{Math.ceil(hype)}%</span>',
) || changed;

console.log(changed ? "QoL source patches applied." : "QoL source patches already present.");
