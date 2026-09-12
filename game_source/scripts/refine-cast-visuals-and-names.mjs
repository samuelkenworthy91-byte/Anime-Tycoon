import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { parseCsv } from "./content-packs/genre30-pack.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const write = (p, s) => writeFileSync(resolve(root, p), s);
const replace = (s, a, b, label) => { if (!s.includes(a)) throw new Error(`Missing ${label}`); return s.replace(a,b); };

// ---------------------------------------------------------------- visual mapping
{
  const p = "src/engine/castCatalog.ts";
  let s = read(p);
  s = replace(s,
`const VISUAL_SIGNATURE_GENRES = new Set<GenreId>([
  "mecha", "sports", "cyber", "idol", "cooking", "military", "space", "magical",
  "pirate", "martial", "nordic", "samurai", "shinobi", "vampire", "monster_taming",
  "kaiju", "arabia",
]);`,
`const VISUAL_SIGNATURE_GENRES = new Set<GenreId>([
  // Literal / strongly themed portrait language. These source-visible genres
  // may never be silently relabelled out of an active character's block.
  "mecha", "sports", "cyber", "fantasy", "horror", "idol", "cooking", "military",
  "supernatural", "space", "magical", "survival", "pirate", "martial", "mythology",
  "nordic", "samurai", "shinobi", "vampire", "grimdark", "monster_taming", "crime",
  "kaiju", "cosmic_horror", "arabia",
]);`, "visual signature genre set");

  s = replace(s,
`  let score = 0;
  if (pinned.has(member.id)) score += 100_000_000_000;
  if (signatureOverlap.length) score += 1_000_000_000;
  if (visualOverlap.length) score += 100_000_000;
  score += signatureOverlap.length * 50_000;
  score += visualOverlap.length * 20_000;
  if (visibleInside) score += 30_000;
  if (exactPair) score += 20_000;
  if (exactTriple) score += 15_000;`,
`  let score = 0;
  if (pinned.has(member.id)) score += 100_000_000_000;
  // Most important after pinned chemistry: if the block actually contains the
  // TWO genres the portrait was authored to depict, keep that pair together.
  // This outranks a one-genre literal match elsewhere.
  if (visibleInside) score += 20_000_000_000;
  if (exactPair) score += 4_000_000_000;
  if (exactTriple) score += 2_000_000_000;
  if (signatureOverlap.length) score += 700_000_000;
  if (visualOverlap.length) score += 120_000_000;
  score += signatureOverlap.length * 80_000;
  score += visualOverlap.length * 30_000;`, "visual score priority");
  write(p, s);
}

// ------------------------------------------------ Vampire / Grimdark naming
{
  const p = "scripts/content-packs/vampire-grimdark-pack.mjs";
  let s = read(p);
  s = replace(s,
`const GIVEN = ["Aster","Bastien","Cassian","Darya","Eiran","Farah","Galen","Hanae","Ilyas","Juno","Kestrel","Leona","Marek","Nadia","Orin","Priya","Quill","Rhea","Soren","Talia","Uri","Veda","Wren"];`,
`const GIVEN = [
  "Aster","Bastien","Cassian","Darya","Eiran","Farah","Galen","Hanae","Ilyas","Juno","Kestrel","Leona","Marek","Nadia","Orin","Priya","Quill","Rhea","Soren","Talia","Uri","Veda","Wren",
  "Amara","Anika","Ayodele","Caio","Dae","Elif","Esme","Faris","Freja","Hadi","Imani","Ines","Jae","Kaori","Kofi","Laleh","Lucan","Mina","Niko","Omar","Petra","Rafi","Sana","Tariq","Vera","Yara","Zuri",
  "Akari","Dmitri","Elena","Fumiko","Giulia","Harun","Idris","Jun","Kavya","Lindiwe","Mateo","Nari","Osei","Pavel","Reina","Samira","Thiago","Valen","Ximena","Yuna",
  "Adisa","Bruna","Chidi","Dalia","Emre","Hyejin","Isolde","Kenzo","Maia","Naveen","Runa","Sade","Tomas","Vanya","Zoya"
];`, "VG given names");
  s = replace(s,
`const MASCOT_STEMS = ["Nox","Morrow","Cinder","Velvet","Gloom","Pip","Rune","Orbit","Miso","Fanglet","Bramble","Hex","Rooklet","Ember","Mothkin","Grit","Poppet","Vanta","Kettle","Talon","Biscuit","Sablewing","Lumen"];`,
`const MASCOT_STEMS = ["Nox","Morrow","Cinder","Velvet","Gloom","Pip","Rune","Orbit","Miso","Fanglet","Bramble","Hex","Rooklet","Ember","Mothkin","Grit","Poppet","Vanta","Kettle","Talon","Biscuit","Sablewing","Lumen","Ash","Briar","Cobble","Dusk","Echo","Fable","Glim","Hush","Ink","Jinx","Mallow","Murk","Nyx","Pebble","Quirk","Soot","Thimble","Umber","Whisp","Yarrow","Zig","Clover","Flicker","Mottle","Pooka","Tallow","Wisp","Cricket","Omen","Ravel","Skein"];`, "VG mascot names");
  s = replace(s,
`function humanName(genreIndex, bucketIndex) {
  const given = GIVEN[genreIndex % GIVEN.length];
  const surname = SURNAMES[(bucketIndex * 23 + genreIndex) % SURNAMES.length];
  return \`${"${given} ${surname}"}\`;
}`,
`function humanName(genreIndex, bucketIndex) {
  const ordinal = bucketIndex * 23 + genreIndex;
  const given = GIVEN[ordinal % GIVEN.length];
  const surname = SURNAMES[(ordinal * 37 + bucketIndex * 11) % SURNAMES.length];
  return \`${"${given} ${surname}"}\`;
}`, "VG human name indexing");
  s = replace(s,
`    const stem = MASCOT_STEMS[genreIndex % MASCOT_STEMS.length];`,
`    const stem = MASCOT_STEMS[(bucketIndex * 23 + genreIndex) % MASCOT_STEMS.length];`, "VG mascot indexing");
  write(p, s);
}

// -------------------------------------------------------- Genre 30 canonical names
const CULTURE_POOLS = {
  japanese: {
    given: ["Akari","Aoi","Asuka","Chihiro","Daichi","Eiji","Emi","Fumiko","Hana","Haruka","Hikari","Itsuki","Jun","Kaede","Kaori","Kenta","Makoto","Mio","Minato","Nao","Rei","Ren","Riku","Rin","Sakura","Satomi","Shun","Sora","Taiga","Toma","Yuki","Yuna","Ayame","Keiko","Koharu","Natsuki","Ryo","Takara","Yori","Maki"],
    last: ["Abe","Araki","Endo","Fujimoto","Hayashi","Hirasawa","Ishikawa","Ito","Kobayashi","Kondo","Maeda","Miura","Mori","Nakajima","Nakamura","Okabe","Ogawa","Sasaki","Sato","Shinohara","Tanaka","Tsukishima","Ueda","Wakamatsu","Yamada","Yamamoto","Fujita","Matsuda","Kawahara","Akiyama","Nomura","Hoshino","Kuroda","Morita","Shimada","Tachibana","Miyazaki","Oshima","Sakurai","Uchida"]
  },
  westasian: {
    given: ["Amina","Amir","Dalia","Darya","Farah","Hadi","Idris","Ilyas","Laleh","Layla","Nadia","Omar","Rafi","Rami","Sana","Samira","Tariq","Yara","Zoya","Azra","Basil","Cem","Elif","Iman","Karim","Leila","Mina","Naveed","Noor","Rana","Sahir","Soraya","Zain","Mariam","Adil","Noura","Kamran","Roya","Salma","Yusuf"],
    last: ["Aziz","Darzi","Haddad","Hassan","Karim","Khalil","Khan","Mansour","Nassar","Rahman","Saad","Saleh","Yilmaz","Arslan","Amani","Farouq","Jafari","Khatib","Mahmoud","Nasri","Qadir","Rashid","Sabbagh","Taheri","Wahid","Zaman","Abbasi","Demir","Erdem","Fahmi","Habib","Kader","Masri","Najjar","Osman","Sayegh","Shakir","Touma","Zahir","Barakat"]
  },
  nordic: {
    given: ["Astrid","Elias","Freja","Ingrid","Jonas","Leif","Liv","Niko","Runa","Soren","Tove","Viggo","Alva","Eira","Emil","Frida","Gunnar","Kari","Lars","Maja","Oskar","Saga","Signe","Stellan","Thea","Tor","Yrsa","Anders","Elin","Kjell","Nils","Solveig"],
    last: ["Andersen","Berg","Dahl","Eklund","Falk","Hagen","Holm","Jensen","Lind","Lindholm","Nielsen","Nygaard","Olsen","Solberg","Strand","Sund","Vik","Aasen","Bakke","Engen","Fjell","Haugen","Lund","Mikkelsen","Nordby","Roed","Skov","Storm","Voss","Winther","Ostberg","Sundberg"]
  },
  global: {
    given: ["Adaeze","Adisa","Alejandra","Amara","Anika","Arjun","Ayodele","Bruna","Caio","Camila","Casey","Chidi","Dev","Diego","Drew","Eden","Elena","Ellis","Eshe","Giulia","Haejin","Imani","Ines","Isha","Jae","Javier","Jiho","Jordan","Kavya","Kofi","Leona","Lindiwe","Luca","Lucia","Maia","Mandla","Mateo","Mira","Morgan","Nari","Nia","Osei","Petra","Priya","Quinn","Ravi","Riley","Robin","Rowan","Sade","Sage","Seojun","Sofia","Talia","Taylor","Theo","Thiago","Valentina","Vera","Vikram","Ximena","Zuri","Minseo","Doyun","Jiwon","Ara","Pavel","Isolde","Valen","Kestrel","Rhea","Uri","Veda","Wren","Bastien","Cassian","Galen","Juno","Leona","Marek"],
    last: ["Adebayo","Alvarez","Bae","Bekele","Bellamy","Bennett","Castillo","Chen","Choi","Costa","Cruz","Delgado","Diallo","Dlamini","Dubois","Ferreira","Fischer","Garcia","Gomez","Grey","Hale","Hart","Herrera","Ibarra","Ivanov","Kaur","Kim","Kovac","Kovacs","Kowalski","Lavigne","Laurent","Marin","Mendes","Mensah","Mercer","Mendoza","Moreau","Morales","Moretti","Navarro","Nguyen","Njeri","Novak","Nowak","Okafor","Okoye","Ortega","Park","Patel","Petrov","Reyes","Rossi","Roux","Santos","Serrano","Silva","Singh","Tan","Te Rangi","Torres","Traore","Varga","Vega","Velasco","Volkov","Voss","Adeyemi","Bako","Ibarra","Morrow","Vale","Marlow","Serrat","Ibarra","Mori","Nakamura"]
  }
};
const PET_STEMS = ["Bibi","Bramble","Clover","Comet","Cricket","Dango","Doodle","Echo","Fable","Flick","Gizmo","Glim","Hachi","Hush","Jinx","Kiko","Luma","Mallow","Miso","Mochi","Momo","Nibi","Nori","Nova","Orbit","Pebble","Piko","Pip","Pocky","Pooka","Puff","Quirk","Raku","Rune","Sable","Sumi","Tama","Taro","Thimble","Tiki","Toto","Vanta","Wisp","Yuzu","Zig","Biscuit","Bumble","Cinder","Dusk","Ember","Fuwa","Kettle","Lumen","Mottle","Nyx","Omen","Rooklet","Skein","Soot","Tallow","Velvet","Whisp","Yarrow","Bunbun","Kumo","Mimi","Peko","Rinri","Churu","Mogu"];
const PET_SUFFIX = ["bit","bun","cub","dot","fin","fox","ling","mew","puff","spark","sprig","tail","wing","whisk","fang","bloom","bell","bean","hop","kip","nib","pop","roo","zip"];
function hash32(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function cultureFor(row){const genres=[row.visible_genre_1,row.visible_genre_2,row.hidden_genre];if(genres.includes("arabia"))return "westasian";if(genres.includes("nordic"))return "nordic";if(genres.includes("samurai")||genres.includes("shinobi"))return "japanese";const choices=["global","japanese","westasian","nordic"];return choices[hash32(row.character_id+"|culture")%choices.length];}
function diverseName(row){const seed=hash32(row.character_id+"|name-v2");if(row.role==="pet"){const stem=PET_STEMS[seed%PET_STEMS.length];const suffix=PET_SUFFIX[Math.floor(seed/PET_STEMS.length)%PET_SUFFIX.length];return `${"${stem}${suffix}"}`;}const pool=CULTURE_POOLS[cultureFor(row)];const given=pool.given[seed%pool.given.length];const last=pool.last[Math.floor(seed/pool.given.length)%pool.last.length];return `${"${given} ${last}"}`;}
function encodeCsv(rows, headers){const field=(v)=>{const t=String(v??"");return /[",\r\n]/.test(t)?`"${"${t.replaceAll('"','""')}"}"`:t;};return [headers.join(","),...rows.map(row=>headers.map(h=>field(row[h])).join(","))].join("\n")+"\n";}

const v6Paths=[
  "docs/content-v6/GENRE30_CAST_ROSTER.csv",
  "art_src/cast_v6_genre30_upload_staging/manifest/final_manifest.csv",
  "art_src/cast_v6_genre30_upload_staging/manifest/final_manifest_webp.csv",
];
const canonicalNames = new Map();
{
  const rows=parseCsv(read(v6Paths[0]));
  const used=new Set();
  for(const row of rows){let name=diverseName(row);let n=2;while(used.has(name)){name=`${"${name} ${n++}"}`;}used.add(name);canonicalNames.set(row.character_id,name);}
  assert.equal(canonicalNames.size,520);
}
for(const p of v6Paths){const rows=parseCsv(read(p));const headers=Object.keys(rows[0]??{});assert.equal(rows.length,520,`${"${p}: expected 520 rows"}`);for(const row of rows){const name=canonicalNames.get(row.character_id);assert(name,`${"${row.character_id}: missing name"}`);row.name=name;}assert.equal(new Set(rows.map(r=>r.name)).size,520,`${"${p}: names must be unique"}`);write(p,encodeCsv(rows,headers));}

// -------------------------------------------------- diversity validator
{
  const p="scripts/generate-content-v3-runtime.mjs";
  let s=read(p);
  const anchor=`for (const [name, ids] of byName) {
  if (ids.length <= 1) continue;
  const allowed = allowedDuplicateNames.get(name);
  assert(allowed, \`duplicate full name not allow-listed: ${"${name}"} (${"${ids.join(\", \")}"})\`);
  assert.deepEqual(new Set(ids), allowed, \`unexpected IDs for allow-listed duplicate ${"${name}"}\`);
}`;
  const validator=`${anchor}

// Generated expansion names must remain genuinely varied, not merely unique
// combinations of the same handful of given names.
const generatedNamed = cast.cast.filter((c) => c.id.startsWith("vg_") || c.id.startsWith("g30_"));
const humanGenerated = generatedNamed.filter((c) => c.name.includes(" ") && c.role !== "pet");
const countToken = (index) => humanGenerated.reduce((map, c) => { const parts=c.name.split(/\\s+/); const token=index===0?parts[0]:parts[parts.length-1]; map.set(token,(map.get(token)??0)+1); return map; }, new Map());
const firstCounts=countToken(0), lastCounts=countToken(-1);
const maxFirst=Math.max(...firstCounts.values()), maxLast=Math.max(...lastCounts.values());
assert(maxFirst <= 8, \`generated cast given-name repetition too high: ${"${maxFirst}"}\`);
assert(maxLast <= 10, \`generated cast surname repetition too high: ${"${maxLast}"}\`);
const generatedPets=generatedNamed.filter((c)=>c.role==="pet");
assert.equal(new Set(generatedPets.map((c)=>c.name)).size, generatedPets.length, "generated mascot names must be unique");`;
  s=replace(s,anchor,validator,"runtime name diversity validator");
  write(p,s);
}

// ------------------------------------------------ visual alignment regression test
write("src/engine/__tests__/cast-visual-alignment.test.ts", `import { describe, expect, it } from "vitest";
import raw from "../generated/castV3.json";
import { CAST_V2 } from "../castV2";
import { isCastingActive } from "../castCatalog";

const pairKey=(a:string,b:string)=>[a,b].sort().join("|");

describe("active cast visual alignment",()=>{
  it("keeps source art-directed genres visible wherever the catalogue permits",()=>{
    const source=new Map(raw.cast.map((m)=>[m.id,m]));
    const active=CAST_V2.filter(isCastingActive);
    let exact=0, one=0, zero=0;
    for(const member of active){const old=source.get(member.id)!;const overlap=member.visibleAff.filter((g)=>old.visibleAff.includes(g)).length;if(pairKey(...member.visibleAff)===pairKey(...old.visibleAff))exact++;else if(overlap===1)one++;else zero++;}
    console.log(\`Cast visual alignment: exact source pair ${"${exact}"}/${"${active.length}"}; one source genre ${"${one}"}; zero source genres ${"${zero}"}.\`);
    expect(zero).toBe(0);
    expect(exact).toBeGreaterThan(active.length*0.45);
  });
});
`);

console.log("Refined cast visual assignment and canonical name diversity.");
