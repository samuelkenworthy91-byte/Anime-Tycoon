import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CORE = {
  hook: "The story opens with an immediate dramatic event that introduces the central conflict before the normal setup.",
  lore: "The story pauses to explain the setting, history or rules that make the current conflict understandable.",
  montage: "A character trains over a compressed period, showing gradual improvement before a later test.",
  tournament: "Characters enter an organised competition and advance through a series of matches against increasingly difficult opponents.",
  beach: "The cast takes a break from the main conflict for a relaxed outing focused on relationships and comedy.",
  festival: "The cast attends a public festival where relationships develop through shared activities and private conversations.",
  launch: "A new machine or vehicle is deployed for the first time, establishing its abilities and the stakes of using it.",
  live: "The characters perform a major live concert that tests their preparation and relationships under public pressure.",
  case: "The characters investigate an apparently impossible incident by gathering clues and identifying what really happened.",
  twist: "A major revelation changes the meaning of earlier events and forces the characters to reassess the conflict.",
  filler: "The story follows a self-contained side conflict that does not significantly advance the main plot.",
  timeskip: "The story jumps forward in time and returns to the characters after they have changed, trained or grown apart.",
  crossover: "Characters from two or more existing series meet and face a conflict that requires their separate casts to work together.",
  finale: "The central conflicts and character arcs come together in a decisive confrontation that resolves the season's main story.",
  origin: "The story shows the villain's earlier life and the events that shaped their motives.",
  redemption: "A former antagonist rejects their previous goal and attempts to help the people they once opposed.",
  mascot: "The usual supporting mascot becomes the focus of a self-contained problem that they must solve or influence.",
  musical: "The story is told through a sequence of songs in which characters express decisions, conflicts and relationships.",
  confession: "A character openly admits their romantic feelings, forcing the relationship to change.",
  cliffhanger: "The story ends at a major unresolved danger or revelation, delaying the outcome until the next episode or season.",
  sakuga: "A major action sequence becomes the centrepiece of the episode, with the plot built around an especially important confrontation.",
  collab: "The cast takes part in a collaboration that creates a light side story around another group, event or activity.",
  ova: "A bonus side story follows the established cast outside the main season and explores an event the central plot skipped.",
  war: "Multiple factions enter open conflict, forcing the full cast to choose sides and fight toward a decisive outcome.",
  movienight: "The cast spends a quiet evening together, using a low-stakes activity to develop relationships between major conflicts.",
  heist: "A team plans and carries out a theft, with the story following preparation, infiltration, complications and escape.",
  cookingbattle: "Characters compete by preparing food under rules and time pressure, with the result decided by judges or rivals.",
  grandprix: "Competitors race through a championship event where strategy, endurance and final placement determine the outcome.",
  bootcamp: "Characters undergo intensive training under strict supervision before being tested on what they learned.",
  ghosthunt: "The characters investigate a reported haunting and try to identify, confront or escape the supernatural cause.",
  orbital: "A rescue mission in space forces the characters to reach stranded people before time, fuel or life support runs out.",
  raincity: "The characters chase a suspect or clue through the city while new evidence changes who they believe is responsible.",
  transformation: "A character gains or tests a new form or power, but must learn its limits during a dangerous situation.",
  directorscut: "The story revisits earlier events with restored scenes or a different perspective that changes how those events are understood.",
  fanservice: "The episode pauses the main plot for familiar characters, costumes, jokes and relationship moments.",
  mega: "Several established franchises are brought into one shared conflict, with each cast contributing to the same resolution.",
  awardpush: "The story centres on characters pursuing public recognition through a major showcase, performance or judging event.",
  guildwar: "Rival organisations enter an escalating conflict involving alliances, betrayals and a battle for control of territory or power.",
  expansion: "The story follows a group growing its organisation, recruiting new members and dealing with problems created by rapid expansion.",
  idolfest: "Performers prepare for and take part in a multi-act festival where rival groups, pressure and relationships shape the final performance.",
  bottle_episode: "Most of the cast is confined to one location, so the episode focuses on dialogue, tension and relationships rather than outside action.",
  underworld_journey: "The characters descend into a dangerous supernatural realm to recover someone, learn a truth or complete an impossible task.",
  body_swap: "Two characters exchange bodies and must impersonate each other while trying to reverse the change.",
  corruption: "A character gradually compromises their values until they begin acting against the people or principles they once protected.",
  graduation: "Characters reach the end of a shared stage of life and must decide how their relationships will continue after they separate.",
  multiverse: "Characters encounter alternate versions of people or worlds, then must resolve a conflict caused by those realities crossing.",
  narr_slowburn: "The story spends time establishing the cast, their routines and relationships before introducing the main conflict.",
  narr_flashforward: "The story briefly shows a later event first, then returns to the present so the audience can discover how the characters reach it.",
  narr_mediasres: "The story opens during an ongoing crisis, then reveals the earlier events needed to explain how the characters got there.",
  narr_rivalintro: "A new rival is introduced whose goals and abilities directly challenge a main character.",
  narr_mentor: "An experienced character guides the protagonist through a problem and teaches a lesson that becomes important later.",
  narr_foundfamily: "Characters who begin as unrelated allies gradually form a close group that treats one another like family.",
  narr_journey: "The characters travel toward a distant goal, with each new location creating a separate obstacle or relationship change.",
  narr_politics: "Competing factions use alliances, negotiation and deception to gain power without immediately resorting to open conflict.",
  narr_explore: "The characters enter an unfamiliar place to map it, understand it and discover what danger or opportunity lies there.",
  narr_siege: "Characters are trapped while an enemy surrounds and attacks their location, forcing them to defend it until they escape or the siege ends.",
  narr_survival: "Characters are placed under rules where limited resources and direct threats force them to outlast or outmanoeuvre one another.",
  narr_rescue: "A character is captured, stranded or missing, and the others organise a mission to reach and recover them.",
  narr_revenge: "A character sets out to punish the person or group responsible for an earlier loss, betrayal or defeat.",
  narr_betrayal: "A trusted ally turns against the group or reveals that their loyalties were divided.",
  narr_secretid: "A character maintains a hidden identity or second life until keeping the two roles separate becomes impossible.",
  narr_falsewin: "The characters believe they have won, but new information reveals that the victory was incomplete, staged or part of a larger plan.",
  narr_villainreveal: "The true antagonist behind earlier events is identified, connecting previous clues and conflicts to one responsible figure.",
  narr_quiet: "The episode reduces external action so two or more characters can confront a personal issue through conversation.",
  narr_pov: "The story retells or continues the conflict from another character's perspective, revealing information the usual viewpoint missed.",
  narr_sacrifice: "A character knowingly gives up their safety, freedom or life so others can survive or complete the goal.",
};

const NAME_OVERRIDES = new Map([
  ["The Sworn Oath", "A character makes a promise that protects someone now but creates an obligation they must honour later."],
  ["Duel at the Crossing", "Two characters settle a conflict in a direct duel, forcing the winner to decide what victory is worth."],
  ["The Clan Hearing", "A public accusation forces a family or clan to examine evidence, loyalties and responsibility."],
  ["The Broken Standard", "A leader rejects inherited orders and chooses the people they are responsible for instead."],
  ["The Dead Letter", "A delayed or undelivered message reveals information that should have reached someone earlier."],
  ["The Silent Entry", "The group infiltrates a guarded location using timing, stealth and trust between team members."],
  ["The Double Agent", "A character works between opposing sides, passing information while hiding divided loyalties and a private agenda."],
  ["The Burned Network", "The characters' safe contacts and hideouts are exposed, forcing them to choose which people and secrets they can still save."],
  ["A Retainer’s Day Off", "A duty-bound character gets a rare ordinary day away from their role, allowing their personal life and relationships to take focus."],
  ["The Rooftop Courier", "A vulnerable team member must carry an important message or object across a dangerous city before the route closes."],
  ["A Duel Without Blades", "Two enemies confront one another through argument, negotiation or a moral choice instead of physical combat."],
  ["Home Without a Mask", "A former operative returns to someone who knew only their cover identity and must reveal who they really are."],
  ["The Last Retainer", "A loyal companion continues an old promise after the organisation or leader that created it is gone."],
  ["Winter Harbour", "A storm traps the characters at a closed port and forces them to find the last safe route out."],
  ["A Borrowed World", "A visitor must learn the customs and rules of an unfamiliar society in order to survive and earn local trust."],
  ["The Shared Table", "Characters share a meal that creates enough trust for an important truth or conflict to be discussed openly."],
  ["The Last Broadcast", "A character sends a final message across a dangerous distance in the hope that one specific person will hear it."],
  ["The Broken Record", "A seemingly perfect result is exposed as unfair because a hidden rule or manipulation made honest victory impossible."],
  ["The Inherited Mask", "A character takes over a familiar role or identity but chooses to change the expectations and ending attached to it."],
  ["The Room That Waits", "A character refuses to enter an apparently harmless place, leading the group to discover why the location is dangerous."],
  ["A School Without Masters", "Students must decide which lessons and traditions to keep after the teachers or leaders who guided them are gone."],
  ["The Empty Throne", "A ruler disappears or dies, and the characters compete with rivals over the power, duties and problems left behind."],
]);

function plainFromName(name, current = "") {
  if (NAME_OVERRIDES.has(name)) return NAME_OVERRIDES.get(name);
  const n = name.toLowerCase();
  const has = (...words) => words.some((w) => n.includes(w));

  if (has("betray", "traitor", "double agent")) return "A trusted character is revealed to be serving another side, forcing the group to deal with divided loyalties and the damage caused by the deception.";
  if (has("revenge", "vendetta", "vengeance")) return "A character pursues the person or group responsible for an earlier wrong and must decide how far they are willing to go for revenge.";
  if (has("redemption", "atonement")) return "A character who caused harm changes sides and tries to repair the damage they previously created.";
  if (has("rescue", "retrieval", "recovery")) return "A character is captured, stranded or missing, and the others organise a mission to reach and recover them.";
  if (has("reunion")) return "Separated characters are brought back together and must deal with how their loyalties, relationships or circumstances changed while they were apart.";
  if (has("pilgrimage", "journey", "voyage", "expedition", "odyssey")) return "The characters travel toward a distant goal, with each stage of the journey creating a new obstacle, discovery or change in their relationships.";
  if (has("dungeon", "labyrinth", "maze")) return "The characters enter a dangerous enclosed location and progress by overcoming traps, enemies and discoveries until they reach its centre or escape.";
  if (has("heir", "succession", "throne", "crown")) return "A dispute over inheritance or leadership forces characters to choose who should hold power and what responsibilities come with it.";
  if (has("academy", "school", "exam", "examination")) return "Characters face a formal test or institutional conflict that divides loyalties and determines who can advance to the next stage.";
  if (has("pursuit", "hunt", "chase")) return "The characters track a dangerous target while the target tries to stay ahead, turning new clues and encounters into an escalating pursuit.";
  if (has("siege")) return "An enemy surrounds and attacks a defended location, forcing the characters to hold out, break through or find another way to end the siege.";
  if (has("war", "crusade", "campaign", "rebellion", "uprising", "invasion")) return "Opposing factions enter open conflict, forcing the characters to choose sides and pursue a decisive military or political objective.";
  if (has("battle")) return "The story builds around a major confrontation in which opposing characters or teams fight to settle a clear objective.";
  if (has("league", "tournament", "championship", "grand prix", "contest")) return "Characters enter an organised competition and progress through opponents or stages until a final result determines the winner.";
  if (has("liberation", "revolt")) return "The characters try to free a place or group from an occupying power, building support before confronting the people in control.";
  if (has("timeline", "second chance", "time loop", "rewind")) return "A character is given another chance to revisit earlier events and must change a key decision before the same outcome happens again.";
  if (has("contract", "bargain", "deal", "pact")) return "A character accepts an agreement with serious conditions, then has to manage the consequences when the promised price comes due.";
  if (has("investigation", "case", "mystery", "inquest", "hearing")) return "The characters investigate a disputed event by gathering evidence, testing explanations and identifying who or what is responsible.";
  if (has("transformation", "evolution", "ascension", "awakening")) return "A character gains a new form or ability and must learn what it can do, what it costs and whether they can control it.";
  if (has("ritual", "ceremony", "summoning")) return "The characters prepare for a formal ritual whose completion will change the balance of the conflict, while opponents try to control or stop it.";
  if (has("broadcast", "concert", "live", "festival", "performance", "idol")) return "Characters prepare for a public performance or broadcast where pressure, rivalry and personal relationships affect whether they can complete it successfully.";
  if (has("heist", "robbery", "caper")) return "A team plans and carries out a theft, with the story following preparation, infiltration, complications and escape.";
  if (has("escape", "breakout")) return "Characters trapped by an enemy or location must coordinate an escape before they are caught or conditions become impossible.";
  if (has("confession", "romance", "wedding", "date")) return "A relationship reaches a turning point when characters openly confront their feelings and decide what they want from one another.";
  if (has("survival", "hunger", "winter")) return "Characters are isolated with limited resources and must make difficult choices to survive long enough to reach safety.";
  if (has("monster", "creature", "taming", "beast")) return "Characters encounter powerful creatures and must capture, befriend or overcome them while learning the rules that govern them.";
  if (has("relic", "artifact", "crystal")) return "The characters search for an important object whose history and power are tied to the main conflict.";
  if (has("identity", "mask", "disguise", "impostor")) return "A character hides who they really are until maintaining the false identity begins to threaten their relationships or mission.";
  if (has("origin", "past", "memory")) return "The story reveals earlier events that explain a character's current motives, loyalties or fears.";
  if (has("sacrifice")) return "A character knowingly gives up their safety, freedom or life so others can survive or complete the goal.";
  if (has("duel")) return "Two characters face one another directly to settle a personal conflict, with the outcome changing their relationship or place in the larger story.";
  if (has("trial")) return "A character must pass a dangerous test that proves their ability, loyalty or right to continue toward the larger goal.";

  const meta = /(critics|fans|merch|budget|financial|wiki|rewatch|glowstick|toys? sell|screeners|galas|site crash|department working overtime|nobody asked|true believers|source material|learned from|native genres|transferable)/i;
  const cleaned = String(current ?? "").trim();
  if (cleaned && !meta.test(cleaned) && cleaned.length >= 35) {
    const first = cleaned.split(/(?<=[.!?])\s+/)[0].replace(/;\s*[^.]+\.?$/, ".");
    if (first.length >= 30 && first.length <= 220) return first.endsWith(".") ? first : `${first}.`;
  }

  const subject = name.replace(/^The\s+/i, "").replace(/[’']/g, "'").toLowerCase();
  return `The characters face a conflict built around ${subject}, and their choices determine how the situation is resolved.`;
}

function escapeTsString(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function rewriteCoreData() {
  const path = resolve(root, "src/engine/data.ts");
  const text = readFileSync(path, "utf8");
  const start = text.indexOf("export const ARCS: Arc[] = [");
  const end = text.indexOf("/* ------------------------------------------- hidden arc synergies", start);
  if (start < 0 || end < 0) throw new Error("Could not locate ARCS section in data.ts");

  const before = text.slice(0, start);
  const section = text.slice(start, end);
  const after = text.slice(end);
  let changed = 0;
  const rewritten = section.split("\n").map((line) => {
    const idMatch = line.match(/\bid: "([^"]+)"/);
    const nameMatch = line.match(/\bname: "([^"]+)"/);
    const descMatch = line.match(/\bdesc: "((?:\\.|[^"])*)"/);
    if (!idMatch || !nameMatch || !descMatch) return line;
    const summary = CORE[idMatch[1]] ?? plainFromName(nameMatch[1], descMatch[1]);
    const next = line.replace(descMatch[0], `desc: "${escapeTsString(summary)}"`);
    if (next !== line) changed += 1;
    return next;
  }).join("\n");
  writeFileSync(path, before + rewritten + after);
  return changed;
}

function rewriteJson(relativePath) {
  const path = resolve(root, relativePath);
  const data = JSON.parse(readFileSync(path, "utf8"));
  let changed = 0;
  for (const arc of data.add_arcs ?? []) {
    const summary = CORE[arc.id] ?? plainFromName(arc.name, arc.desc);
    if (arc.desc !== summary) {
      arc.desc = summary;
      changed += 1;
    }
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  return changed;
}

function rewriteIpSeeds() {
  const path = resolve(root, "src/engine/ipHiddenArcs.ts");
  const lines = readFileSync(path, "utf8").split("\n");
  let changed = 0;
  const out = lines.map((line) => {
    const id = line.match(/"id":"([^"]+)"/)?.[1];
    const name = line.match(/"name":"([^"]+)"/)?.[1];
    const desc = line.match(/"desc":"((?:\\.|[^"])*)"/)?.[1];
    if (!id || !name || desc == null) return line;
    const summary = CORE[id] ?? plainFromName(name, desc);
    const escaped = JSON.stringify(summary).slice(1, -1);
    const next = line.replace(/"desc":"((?:\\.|[^"])*)"/, `"desc":"${escaped}"`);
    if (next !== line) changed += 1;
    return next;
  });
  writeFileSync(path, out.join("\n"));
  return changed;
}

const changed = {
  core: rewriteCoreData(),
  baseExpansion: rewriteJson("docs/content-v3/ARC_V3_RUNTIME.json"),
  vampireGrimdark: rewriteJson("docs/content-v5/VAMPIRE_GRIMDARK_ARCS.json"),
  genre30: rewriteJson("docs/content-v6/GENRE30_ARCS.json"),
  generatedRuntime: rewriteJson("src/engine/generated/arcV3.json"),
  ipBlueprints: rewriteIpSeeds(),
};

const banned = /(critics|fans scream|merch prints|merch explodes|wiki needs|glowsticks sold|toys sell|nobody asked for|true believers|learned from .*; exceptional|native genres, but transferable)/i;
const problems = [];

function inspectJson(relativePath) {
  const data = JSON.parse(readFileSync(resolve(root, relativePath), "utf8"));
  for (const arc of data.add_arcs ?? []) {
    if (!arc.desc || arc.desc.length < 25 || banned.test(arc.desc)) problems.push(`${arc.id}: ${arc.desc}`);
  }
}
inspectJson("docs/content-v3/ARC_V3_RUNTIME.json");
inspectJson("docs/content-v5/VAMPIRE_GRIMDARK_ARCS.json");
inspectJson("docs/content-v6/GENRE30_ARCS.json");
inspectJson("src/engine/generated/arcV3.json");

const dataText = readFileSync(resolve(root, "src/engine/data.ts"), "utf8");
for (const [id, summary] of Object.entries(CORE)) {
  if (!dataText.includes(`id: "${id}"`)) throw new Error(`Core arc missing: ${id}`);
  if (!dataText.includes(`desc: "${escapeTsString(summary)}"`)) problems.push(`${id}: core summary was not applied`);
}
const ipText = readFileSync(resolve(root, "src/engine/ipHiddenArcs.ts"), "utf8");
if (/learned from .*exceptional with its native genres/i.test(ipText)) problems.push("IP hidden arcs still contain source/synergy boilerplate");
if (problems.length) throw new Error(`Arc description validation failed:\n${problems.join("\n")}`);

console.log("Arc plot-summary rewrite complete:", changed);
