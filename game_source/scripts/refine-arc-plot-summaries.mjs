import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const OVERRIDES = {
  vg_blooddebt: "A character owes a dangerous favour or obligation, and the person holding the debt demands payment at the worst possible moment.",
  g30_ch_cultplain: "The characters discover that an apparently ordinary group is secretly serving a hidden power and must expose it without alerting its members.",
  g30_ar_palacecoup: "Conspirators attempt to remove the ruler from power, forcing the characters to decide whether to defend, join or stop the takeover.",

  ip_arc_009: "Two characters make an exchange governed by equal cost, and the plot turns on what each is willing to sacrifice to get what they want.",
  ip_arc_010: "The characters hunt a supernatural target while bound by a dangerous contract whose conditions complicate how they can defeat it.",
  ip_arc_012: "Several rivals compete in a ritual conflict for a powerful prize, forming temporary alliances while trying to eliminate the other claimants.",
  ip_arc_014: "A struggling competitor gets a chance to reach the next level of their career and must perform under pressure to prove they belong there.",
  ip_arc_018: "The characters enter a shifting labyrinth after accepting a bargain, and must reach its goal without violating the deal that allowed them inside.",
  ip_arc_025: "Three rival factions compete for control through shifting alliances, feints and battlefield plans, with every victory changing the balance of power.",
  ip_arc_029: "Characters accept an invitation to an isolated winter location, then discover they are trapped there with a threat they must identify and survive.",
  ip_arc_031: "Former bandmates reunite for one performance and must resolve the dispute that originally split them before they can work together again.",
  ip_arc_032: "The characters must solve a chain of seven clues before a deadline, with each answer revealing the next step toward the final mystery.",
  ip_arc_033: "Several suspects give conflicting accounts of the same event, forcing the investigators to determine whose version can actually be trusted.",
  ip_arc_034: "A dangerous host gathers potential victims together, and the group must identify the threat before someone at the table is singled out.",
  ip_arc_037: "Veteran fighters defend a position or principle they know they may not survive, buying time for the next generation to continue the fight.",
  ip_arc_038: "A live broadcast begins to collapse through technical and personal disasters, forcing the cast to keep the show going while solving each new problem.",
  ip_arc_040: "Several characters awaken new supernatural abilities at the same time and must learn how their powers interact before the group loses control of them.",
  ip_arc_041: "Characters from a distorted parallel world cross into the main setting, forcing both sides to confront how their counterparts differ.",
  ip_arc_042: "A small team secretly enters a guarded location to obtain information, sabotage a target or recover someone without being detected.",
  ip_arc_043: "Two performance houses compete for status, pushing their members through escalating showcases and personal rivalries before a final face-off.",
  ip_arc_044: "A damaging secret is leaked by an unknown source, and the characters must uncover who exposed it before the fallout destroys a relationship or career.",
  ip_arc_045: "Three characters on a shared trip are forced to confront overlapping romantic feelings and decide what each relationship means.",
  ip_arc_047: "A prophecy predicts that history will repeat in a fixed cycle, and the characters must decide whether to fulfil that pattern or break it.",
  ip_arc_049: "The cast tracks a different wanted target in a self-contained hunt, with each bounty revealing another part of the larger conflict.",
  ip_arc_052: "Characters flee with dangerous or banned technology while authorities and rivals pursue them to seize or destroy it.",
  ip_arc_055: "The party explores a dangerous dungeon and survives by turning the creatures and ingredients they find there into meals as they travel deeper.",
  ip_arc_056: "Competitors cook under strict time pressure, and each round eliminates the weakest performer until only the finalists remain.",
  ip_arc_057: "A chef must create a successful dish from unusual or seemingly unusable ingredients while meeting a difficult set of rules.",
  ip_arc_058: "Characters compete under rules that remove one participant at a time, forcing alliances and betrayals as the group becomes smaller.",
  ip_arc_059: "Students and their teacher are given a task everyone expects them to fail, and must combine the class's different strengths to complete it.",
  ip_arc_060: "Characters are trapped on a deadly level and can only escape by clearing its rules, enemies or puzzle before they are killed.",
  ip_arc_063: "A group challenges the social leaders controlling their community, using alliances and reputation to overturn the existing hierarchy.",
  ip_arc_066: "The cast crosses a dangerous frontier where ordinary tasks become lethal set pieces, forcing them to improvise their way from one trap to the next.",
  ip_arc_067: "A character attempts a dangerous feat that requires careful preparation, then has to adapt when the stunt goes wrong during execution.",
  ip_arc_068: "A barrier to a hostile supernatural realm breaks, allowing dangerous beings through until the characters can close and seal the breach.",
  ip_arc_075: "A dysfunctional family learns that an approaching supernatural disaster is tied to them, forcing estranged relatives to work together to stop it.",
  ip_arc_076: "One character wakes alone during a long journey and forms a relationship with the only other person they can reach while trying to understand why they are awake.",
  ip_arc_077: "A person develops an intimate relationship with an artificial or synthetic being, forcing both to question whether the bond is genuine and what it means.",
  ip_arc_078: "A romance is reconstructed through memories from different points in the relationship, gradually revealing why the couple came together or fell apart.",
  ip_arc_079: "Two people from opposing martial traditions fall in love and must choose between their relationship and the duties their factions demand.",
  ip_arc_080: "An investigator follows a violent noir case in which altered perception and slowed moments reveal clues hidden inside confrontations.",
  ip_arc_081: "The characters travel through a damaged world restoring key places one by one, with each repair changing what becomes possible next.",
  ip_arc_082: "The cast jumps between different worlds to collect a required set of objects, with each destination functioning as its own obstacle or comic problem.",
  ip_arc_083: "A minor everyday problem triggers another, then another, until the cast is dealing with a chain of increasingly dangerous consequences.",
  ip_arc_084: "The characters uncover a secret military facility studying psychic phenomena and must expose what is happening while evading the people protecting it.",
  ip_arc_088: "Young performers challenge a rule banning dance, building support through secret performances until the conflict becomes a public movement.",
  ip_arc_089: "A gifted but unwilling student is paired with a mentor who must earn their trust before the prodigy will accept guidance or responsibility.",
  ip_arc_090: "A struggling family deliberately changes how they live and relate to one another, with each member taking on a new role as they rebuild their home life.",
  ip_arc_091: "An underdog team builds its identity around its own culture and playing style, then tests that approach across a season against better-funded rivals.",
  ip_arc_093: "A small community survives the aftermath of a nuclear disaster, dealing with shortages, contamination and conflict over how the town should rebuild.",
  ip_arc_095: "Someone alters a character's memories, and each attempt to repair or rewrite them changes other relationships and events in unexpected ways.",
  ip_arc_096: "A character is gradually pulled into criminal life, with each compromise making it harder to return to the person they were before.",
  ip_arc_098: "Two divided cities are drawn into the same uprising, forcing characters on both sides to decide whether to preserve the old order or join the revolution.",
  ip_arc_099: "A crew takes on a dangerous job for money, but the mission becomes personal as the teammates begin treating one another like family.",
  ip_arc_100: "The characters investigate an event that follows dream logic, testing impossible clues and changing assumptions until they discover the rule connecting them.",
};

const SOURCE_JSONS = [
  "docs/content-v3/ARC_V3_RUNTIME.json",
  "docs/content-v5/VAMPIRE_GRIMDARK_ARCS.json",
  "docs/content-v6/GENRE30_ARCS.json",
  "src/engine/generated/arcV3.json",
];

let jsonChanges = 0;
for (const relativePath of SOURCE_JSONS) {
  const path = resolve(root, relativePath);
  const data = JSON.parse(readFileSync(path, "utf8"));
  let changed = false;
  for (const arc of data.add_arcs ?? []) {
    const next = OVERRIDES[arc.id];
    if (next && arc.desc !== next) {
      arc.desc = next;
      jsonChanges += 1;
      changed = true;
    }
  }
  if (changed) writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

const ipPath = resolve(root, "src/engine/ipHiddenArcs.ts");
let ipText = readFileSync(ipPath, "utf8");
let ipChanges = 0;
for (const [id, desc] of Object.entries(OVERRIDES).filter(([id]) => id.startsWith("ip_arc_"))) {
  const escaped = JSON.stringify(desc).slice(1, -1);
  const re = new RegExp(`(\\"id\\":\\"${id}\\"[^\\n]*?\\"desc\\":\\")((?:\\\\.|[^\\"])*)\\"`);
  if (!re.test(ipText)) throw new Error(`Missing IP arc ${id}`);
  const next = ipText.replace(re, `$1${escaped}\\"`);
  if (next !== ipText) {
    ipText = next;
    ipChanges += 1;
  }
}
writeFileSync(ipPath, ipText);

const generic = "The characters face a conflict built around";
const checkFiles = [...SOURCE_JSONS, "src/engine/ipHiddenArcs.ts"];
for (const relativePath of checkFiles) {
  const text = readFileSync(resolve(root, relativePath), "utf8");
  if (text.includes(generic)) throw new Error(`${relativePath}: generic fallback description remains`);
}

for (const [id, desc] of Object.entries(OVERRIDES)) {
  if (desc.length < 60) throw new Error(`${id}: description is too short`);
}

console.log(`Refined ${jsonChanges} generated/source entries and ${ipChanges} IP blueprint descriptions.`);
