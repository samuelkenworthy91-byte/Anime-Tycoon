from pathlib import Path
import csv
import io

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text()

def write(path, text):
    (ROOT / path).write_text(text)

def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing expected source for {label}")
    return text.replace(old, new, 1)

print("[1/5] Tightening active cast visual-pair assignment", flush=True)
p = "src/engine/castCatalog.ts"
s = read(p)
old_sig = '''const VISUAL_SIGNATURE_GENRES = new Set<GenreId>([
  "mecha", "sports", "cyber", "idol", "cooking", "military", "space", "magical",
  "pirate", "martial", "nordic", "samurai", "shinobi", "vampire", "monster_taming",
  "kaiju", "arabia",
]);'''
new_sig = '''const VISUAL_SIGNATURE_GENRES = new Set<GenreId>([
  "mecha", "sports", "cyber", "horror", "idol", "cooking", "military", "space", "magical",
  "pirate", "martial", "nordic", "samurai", "shinobi", "vampire", "grimdark", "monster_taming",
  "crime", "kaiju", "cosmic_horror", "arabia",
]);'''
s = replace_once(s, old_sig, new_sig, "visual signature genre set")
old_score = '''  let score = 0;
  if (pinned.has(member.id)) score += 100_000_000_000;
  if (signatureOverlap.length) score += 1_000_000_000;
  if (visualOverlap.length) score += 100_000_000;
  score += signatureOverlap.length * 50_000;
  score += visualOverlap.length * 20_000;
  if (visibleInside) score += 30_000;
  if (exactPair) score += 20_000;
  if (exactTriple) score += 15_000;'''
new_score = '''  let score = 0;
  if (pinned.has(member.id)) score += 100_000_000_000;
  // Preserve the exact two source-visible genres whenever the catalogue block
  // can carry them. The portrait was authored for that pair, so this outranks
  // preserving only one visually literal genre in a different block.
  if (visibleInside) score += 20_000_000_000;
  if (exactPair) score += 4_000_000_000;
  if (exactTriple) score += 2_000_000_000;
  if (signatureOverlap.length) score += 700_000_000;
  if (visualOverlap.length) score += 120_000_000;
  score += signatureOverlap.length * 80_000;
  score += visualOverlap.length * 30_000;'''
s = replace_once(s, old_score, new_score, "visual score priority")
write(p, s)

print("[2/5] Expanding Vampire/Grimdark canonical name variety", flush=True)
p = "scripts/content-packs/vampire-grimdark-pack.mjs"
s = read(p)
old_given = 'const GIVEN = ["Aster","Bastien","Cassian","Darya","Eiran","Farah","Galen","Hanae","Ilyas","Juno","Kestrel","Leona","Marek","Nadia","Orin","Priya","Quill","Rhea","Soren","Talia","Uri","Veda","Wren"];'
new_given = '''const GIVEN = [
  "Aster","Bastien","Cassian","Darya","Eiran","Farah","Galen","Hanae","Ilyas","Juno","Kestrel","Leona","Marek","Nadia","Orin","Priya","Quill","Rhea","Soren","Talia","Uri","Veda","Wren",
  "Amara","Anika","Ayodele","Caio","Dae","Elif","Esme","Faris","Freja","Hadi","Imani","Ines","Jae","Kaori","Kofi","Laleh","Lucan","Mina","Niko","Omar","Petra","Rafi","Sana","Tariq","Vera","Yara","Zuri",
  "Akari","Dmitri","Elena","Fumiko","Giulia","Harun","Idris","Jun","Kavya","Lindiwe","Mateo","Nari","Osei","Pavel","Reina","Samira","Thiago","Valen","Ximena","Yuna",
  "Adisa","Bruna","Chidi","Dalia","Emre","Hyejin","Isolde","Kenzo","Maia","Naveen","Runa","Sade","Tomas","Vanya","Zoya"
];'''
s = replace_once(s, old_given, new_given, "VG given names")
old_pet = 'const MASCOT_STEMS = ["Nox","Morrow","Cinder","Velvet","Gloom","Pip","Rune","Orbit","Miso","Fanglet","Bramble","Hex","Rooklet","Ember","Mothkin","Grit","Poppet","Vanta","Kettle","Talon","Biscuit","Sablewing","Lumen"];'
new_pet = 'const MASCOT_STEMS = ["Nox","Morrow","Cinder","Velvet","Gloom","Pip","Rune","Orbit","Miso","Fanglet","Bramble","Hex","Rooklet","Ember","Mothkin","Grit","Poppet","Vanta","Kettle","Talon","Biscuit","Sablewing","Lumen","Ash","Briar","Cobble","Dusk","Echo","Fable","Glim","Hush","Ink","Jinx","Mallow","Murk","Nyx","Pebble","Quirk","Soot","Thimble","Umber","Whisp","Yarrow","Zig","Clover","Flicker","Mottle","Pooka","Tallow","Wisp","Cricket","Omen","Ravel","Skein"];'
s = replace_once(s, old_pet, new_pet, "VG mascot stems")
old_human = '''function humanName(genreIndex, bucketIndex) {
  const given = GIVEN[genreIndex % GIVEN.length];
  const surname = SURNAMES[(bucketIndex * 23 + genreIndex) % SURNAMES.length];
  return `${given} ${surname}`;
}'''
new_human = '''function humanName(genreIndex, bucketIndex) {
  const ordinal = bucketIndex * 23 + genreIndex;
  const given = GIVEN[ordinal % GIVEN.length];
  const surname = SURNAMES[(ordinal * 37 + bucketIndex * 11) % SURNAMES.length];
  return `${given} ${surname}`;
}'''
s = replace_once(s, old_human, new_human, "VG human name indexing")
s = replace_once(s, '    const stem = MASCOT_STEMS[genreIndex % MASCOT_STEMS.length];', '    const stem = MASCOT_STEMS[(bucketIndex * 23 + genreIndex) % MASCOT_STEMS.length];', "VG mascot indexing")
write(p, s)

print("[3/5] Rebuilding Genre-30 names with broader cultural pools", flush=True)
POOLS = {
    "japanese": (
        ["Akari","Aoi","Asuka","Chihiro","Daichi","Eiji","Emi","Fumiko","Hana","Haruka","Hikari","Itsuki","Jun","Kaede","Kaori","Kenta","Makoto","Mio","Minato","Nao","Rei","Ren","Riku","Rin","Sakura","Satomi","Shun","Sora","Taiga","Toma","Yuki","Yuna","Ayame","Keiko","Koharu","Natsuki","Ryo","Takara","Yori","Maki"],
        ["Abe","Araki","Endo","Fujimoto","Hayashi","Hirasawa","Ishikawa","Ito","Kobayashi","Kondo","Maeda","Miura","Mori","Nakajima","Nakamura","Okabe","Ogawa","Sasaki","Sato","Shinohara","Tanaka","Tsukishima","Ueda","Wakamatsu","Yamada","Yamamoto","Fujita","Matsuda","Kawahara","Akiyama","Nomura","Hoshino","Kuroda","Morita","Shimada","Tachibana","Miyazaki","Oshima","Sakurai","Uchida"]
    ),
    "westasian": (
        ["Amina","Amir","Dalia","Darya","Farah","Hadi","Idris","Ilyas","Laleh","Layla","Nadia","Omar","Rafi","Rami","Sana","Samira","Tariq","Yara","Zoya","Azra","Basil","Cem","Elif","Iman","Karim","Leila","Mina","Naveed","Noor","Rana","Sahir","Soraya","Zain","Mariam","Adil","Noura","Kamran","Roya","Salma","Yusuf"],
        ["Aziz","Darzi","Haddad","Hassan","Karim","Khalil","Khan","Mansour","Nassar","Rahman","Saad","Saleh","Yilmaz","Arslan","Amani","Farouq","Jafari","Khatib","Mahmoud","Nasri","Qadir","Rashid","Sabbagh","Taheri","Wahid","Zaman","Abbasi","Demir","Erdem","Fahmi","Habib","Kader","Masri","Najjar","Osman","Sayegh","Shakir","Touma","Zahir","Barakat"]
    ),
    "nordic": (
        ["Astrid","Elias","Freja","Ingrid","Jonas","Leif","Liv","Niko","Runa","Soren","Tove","Viggo","Alva","Eira","Emil","Frida","Gunnar","Kari","Lars","Maja","Oskar","Saga","Signe","Stellan","Thea","Tor","Yrsa","Anders","Elin","Kjell","Nils","Solveig","Aksel","Ebba","Hanne","Ivar","Malin","Sven","Tuva","Vidar"],
        ["Andersen","Berg","Dahl","Eklund","Falk","Hagen","Holm","Jensen","Lind","Lindholm","Nielsen","Nygaard","Olsen","Solberg","Strand","Sund","Vik","Aasen","Bakke","Engen","Fjell","Haugen","Lund","Mikkelsen","Nordby","Roed","Skov","Storm","Voss","Winther","Ostberg","Sundberg","Bjerke","Gran","Holt","Krogh","Moen","Ravn","Torp","Wold"]
    ),
    "global": (
        ["Adaeze","Adisa","Alejandra","Amara","Anika","Arjun","Ayodele","Bruna","Caio","Camila","Casey","Chidi","Dev","Diego","Drew","Eden","Elena","Ellis","Eshe","Giulia","Haejin","Imani","Ines","Isha","Jae","Javier","Jiho","Jordan","Kavya","Kofi","Leona","Lindiwe","Luca","Lucia","Maia","Mandla","Mateo","Mira","Morgan","Nari","Nia","Osei","Petra","Priya","Quinn","Ravi","Riley","Robin","Rowan","Sade","Sage","Seojun","Sofia","Talia","Taylor","Theo","Thiago","Valentina","Vera","Vikram","Ximena","Zuri","Minseo","Doyun","Jiwon","Ara","Pavel","Isolde","Valen","Kestrel","Rhea","Uri","Veda","Wren","Bastien","Cassian","Galen","Juno","Marek"],
        ["Adebayo","Alvarez","Bae","Bekele","Bellamy","Bennett","Castillo","Chen","Choi","Costa","Cruz","Delgado","Diallo","Dlamini","Dubois","Ferreira","Fischer","Garcia","Gomez","Grey","Hale","Hart","Herrera","Ibarra","Ivanov","Kaur","Kim","Kovac","Kovacs","Kowalski","Lavigne","Laurent","Marin","Mendes","Mensah","Mercer","Mendoza","Moreau","Morales","Moretti","Navarro","Nguyen","Njeri","Novak","Nowak","Okafor","Okoye","Ortega","Park","Patel","Petrov","Reyes","Rossi","Roux","Santos","Serrano","Silva","Singh","Tan","Te Rangi","Torres","Traore","Varga","Vega","Velasco","Volkov","Voss","Adeyemi","Bako","Morrow","Vale","Marlow","Serrat","Mori","Nakamura","Okada","Pereira","Sato","Mensimah"]
    ),
}
PET_STEMS = ["Bibi","Bramble","Clover","Comet","Cricket","Dango","Doodle","Echo","Fable","Flick","Gizmo","Glim","Hachi","Hush","Jinx","Kiko","Luma","Mallow","Miso","Mochi","Momo","Nibi","Nori","Nova","Orbit","Pebble","Piko","Pip","Pocky","Pooka","Puff","Quirk","Raku","Rune","Sable","Sumi","Tama","Taro","Thimble","Tiki","Toto","Vanta","Wisp","Yuzu","Zig","Biscuit","Bumble","Cinder","Dusk","Ember","Fuwa","Kettle","Lumen","Mottle","Nyx","Omen","Rooklet","Skein","Soot","Tallow","Velvet","Whisp","Yarrow","Bunbun","Kumo","Mimi","Peko","Rinri","Churu","Mogu"]
PET_SUFFIX = ["bit","bun","cub","dot","fin","fox","ling","mew","puff","spark","sprig","tail","wing","whisk","fang","bloom","bell","bean","hop","kip","nib","pop","roo","zip"]

def fnv(text):
    h = 2166136261
    for ch in text:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h

def culture(row):
    genres = [row["visible_genre_1"], row["visible_genre_2"], row["hidden_genre"]]
    if "arabia" in genres:
        return "westasian"
    if "nordic" in genres:
        return "nordic"
    if "samurai" in genres or "shinobi" in genres:
        return "japanese"
    return ["global","japanese","westasian","nordic"][fnv(row["character_id"] + "|culture-v3") % 4]

def parse_csv(path):
    return list(csv.DictReader(io.StringIO(read(path))))

def encode_csv(rows, headers):
    buf = io.StringIO(newline="")
    writer = csv.DictWriter(buf, fieldnames=headers, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue()

roster_path = "docs/content-v6/GENRE30_CAST_ROSTER.csv"
roster = parse_csv(roster_path)
if len(roster) != 520:
    raise RuntimeError(f"Expected 520 Genre-30 rows, got {len(roster)}")
used = set()
per_culture = {k: 0 for k in POOLS}
pet_index = 0
names = {}
for row in roster:
    if row["role"] == "pet":
        while True:
            stem = PET_STEMS[pet_index % len(PET_STEMS)]
            suffix = PET_SUFFIX[(pet_index // len(PET_STEMS) + pet_index * 7) % len(PET_SUFFIX)]
            pet_index += 1
            name = stem + suffix
            if name not in used:
                break
    else:
        c = culture(row)
        given, last = POOLS[c]
        idx = per_culture[c]
        per_culture[c] += 1
        attempt = 0
        while True:
            g = given[(idx + attempt * 11) % len(given)]
            family = last[(idx * 17 + idx // len(given) + attempt * 13) % len(last)]
            name = f"{g} {family}"
            if name not in used:
                break
            attempt += 1
            if attempt > len(given) * len(last):
                raise RuntimeError(f"Name pool exhausted for {c}")
    used.add(name)
    names[row["character_id"]] = name

if len(names) != 520 or len(set(names.values())) != 520:
    raise RuntimeError("Genre-30 canonical names are not unique")
for path in [
    roster_path,
    "art_src/cast_v6_genre30_upload_staging/manifest/final_manifest.csv",
    "art_src/cast_v6_genre30_upload_staging/manifest/final_manifest_webp.csv",
]:
    rows = parse_csv(path)
    if len(rows) != 520:
        raise RuntimeError(f"{path}: expected 520 rows")
    headers = list(rows[0].keys())
    for row in rows:
        row["name"] = names[row["character_id"]]
    write(path, encode_csv(rows, headers))

print("[4/5] Adding name-diversity validation", flush=True)
p = "scripts/generate-content-v3-runtime.mjs"
s = read(p)
anchor = '''for (const [name, ids] of byName) {
  if (ids.length <= 1) continue;
  const allowed = allowedDuplicateNames.get(name);
  assert(allowed, `duplicate full name not allow-listed: ${name} (${ids.join(", ")})`);
  assert.deepEqual(new Set(ids), allowed, `unexpected IDs for allow-listed duplicate ${name}`);
}'''
validator = anchor + '''

// Generated expansions must remain genuinely varied, not merely unique full
// names built from the same tiny handful of first names.
const generatedNamed = cast.cast.filter((c) => c.id.startsWith("vg_") || c.id.startsWith("g30_"));
const humanGenerated = generatedNamed.filter((c) => c.role !== "pet" && c.name.includes(" "));
const tokenCounts = (which) => humanGenerated.reduce((map, c) => {
  const parts = c.name.split(/\\s+/);
  const token = which === "first" ? parts[0] : parts[parts.length - 1];
  map.set(token, (map.get(token) ?? 0) + 1);
  return map;
}, new Map());
const firstCounts = tokenCounts("first");
const lastCounts = tokenCounts("last");
assert(Math.max(...firstCounts.values()) <= 12, `generated cast given-name repetition too high: ${Math.max(...firstCounts.values())}`);
assert(Math.max(...lastCounts.values()) <= 14, `generated cast surname repetition too high: ${Math.max(...lastCounts.values())}`);
const generatedPets = generatedNamed.filter((c) => c.role === "pet");
assert.equal(new Set(generatedPets.map((c) => c.name)).size, generatedPets.length, "generated mascot names must be unique");'''
s = replace_once(s, anchor, validator, "runtime name diversity validator")
write(p, s)

print("[5/5] Adding active portrait/genre alignment regression", flush=True)
test = '''import { describe, expect, it } from "vitest";
import raw from "../generated/castV3.json";
import { CAST_V2 } from "../castV2";
import { isCastingActive } from "../castCatalog";

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

describe("active cast visual alignment", () => {
  it("does not relabel active portraits completely away from their source art direction", () => {
    const source = new Map(raw.cast.map((m) => [m.id, m]));
    const active = CAST_V2.filter(isCastingActive);
    let exact = 0;
    let one = 0;
    let zero = 0;
    for (const member of active) {
      const old = source.get(member.id)!;
      const overlap = member.visibleAff.filter((g) => old.visibleAff.includes(g)).length;
      if (pairKey(member.visibleAff[0], member.visibleAff[1]) === pairKey(old.visibleAff[0], old.visibleAff[1])) exact += 1;
      else if (overlap === 1) one += 1;
      else zero += 1;
    }
    console.log(`Cast visual alignment: exact source pair ${exact}/${active.length}; one source genre ${one}; zero source genres ${zero}.`);
    expect(zero).toBe(0);
    expect(exact).toBeGreaterThan(active.length * 0.30);
  });
});
'''
write("src/engine/__tests__/cast-visual-alignment.test.ts", test)
print("Cast playtest finalizer completed.", flush=True)
