const ROLE_TOKENS = { protag: "lead", secondary: "sidekick", pet: "mascot", villain: "villain" };
const TYPES = ["shonen", "shojo"];
const ROLES = ["protag", "secondary", "pet", "villain"];
const GIVEN = [
  "Aster","Bastien","Cassian","Darya","Eiran","Farah","Galen","Hanae","Ilyas","Juno","Kestrel","Leona","Marek","Nadia","Orin","Priya","Quill","Rhea","Soren","Talia","Uri","Veda","Wren",
  "Amara","Anika","Ayodele","Caio","Dae","Elif","Esme","Faris","Freja","Hadi","Imani","Ines","Jae","Kaori","Kofi","Laleh","Lucan","Mina","Niko","Omar","Petra","Rafi","Sana","Tariq","Vera","Yara","Zuri",
  "Akari","Dmitri","Elena","Fumiko","Giulia","Harun","Idris","Jun","Kavya","Lindiwe","Mateo","Nari","Osei","Pavel","Reina","Samira","Thiago","Valen","Ximena","Yuna",
  "Adisa","Bruna","Chidi","Dalia","Emre","Hyejin","Isolde","Kenzo","Maia","Naveen","Runa","Sade","Tomas","Vanya","Zoya"
];
const SURNAMES = ["Ashcombe","Velasco","Morcant","Drazic","Bellamy","Okafor","Kowalski","Navarro","Haddad","Varga","Te Rangi","Mensah","Petrov","Laurent","Chen","Bennett","Ibarra","Khatri","Solberg","Adebayo","Moretti","Park","Alvarez","Rahman","Novak","Silva","Mori","Diallo","Costa","Yilmaz","Bekele","Serrano","Kaur","Nielsen","Morales","Tan","Ortega","Bako","Fischer","Yamane","Gomez","Aziz","Ivanov","Reyes","Nakamura","Adeyemi","Kovacs","Marin","Saad","Kim","Torres","Lind","Patel","Voss","Okoye","Mendes","Rossi","Fujita","Osei","Marlow","Ito","Khan","Santos","Volkov","Hale","Duval","Choi","Ramos","Dahl","Mercer","Amani","Jensen","Nguyen","Hassan","Nowak","Berg","Mendoza","Arslan","Njeri","Castillo","Bae","Ferreira","Kozlov","Hart","Lavigne","Cho","Vega","Dlamini","Serrat","Kade","Morrow","Vale","Roux"];
const MASCOT_STEMS = ["Nox","Morrow","Cinder","Velvet","Gloom","Pip","Rune","Orbit","Miso","Fanglet","Bramble","Hex","Rooklet","Ember","Mothkin","Grit","Poppet","Vanta","Kettle","Talon","Biscuit","Sablewing","Lumen","Ash","Briar","Cobble","Dusk","Echo","Fable","Glim","Hush","Ink","Jinx","Mallow","Murk","Nyx","Pebble","Quirk","Soot","Thimble","Umber","Whisp","Yarrow","Zig","Clover","Flicker","Mottle","Pooka","Tallow","Wisp","Cricket","Omen","Ravel","Skein"];
const LABELS = { mecha:"Mecha", isekai:"Isekai", slice:"Slice of Life", horror:"Horror", romance:"Romance", sports:"Sports", cyber:"Cyberpunk", fantasy:"Fantasy", idol:"Idol", mystery:"Mystery", comedy:"Comedy", cooking:"Cooking", military:"Military", supernatural:"Supernatural", space:"Space", magical:"Magical", survival:"Survival", pirate:"Pirate", martial:"Martial Arts", mythology:"Mythology", nordic:"Nordic", samurai:"Samurai", shinobi:"Shinobi" };

const LEAD_SHONEN_GRIMDARK = new Set(["sports","fantasy","mystery","military","space","magical","survival","pirate","martial","mythology","nordic","samurai","shinobi"]);
const MASCOT_SHOJO_GRIMDARK = new Set(["isekai","horror","mythology"]);
const VILLAIN_SHOJO_GRIMDARK = new Set(["cyber","survival","pirate","martial","mythology"]);

function primaryGenre(role, type, genre) {
  if (type === "shonen" && (role === "secondary" || role === "pet" || role === "villain")) return "grimdark";
  if (role === "protag" && type === "shonen" && LEAD_SHONEN_GRIMDARK.has(genre)) return "grimdark";
  if (role === "pet" && type === "shojo" && MASCOT_SHOJO_GRIMDARK.has(genre)) return "grimdark";
  if (role === "villain" && type === "shojo" && VILLAIN_SHOJO_GRIMDARK.has(genre)) return "grimdark";
  return "vampire";
}

function humanName(genreIndex, bucketIndex) {
  const ordinal = bucketIndex * 23 + genreIndex;
  const given = GIVEN[ordinal % GIVEN.length];
  const surname = SURNAMES[(ordinal * 37 + bucketIndex * 11) % SURNAMES.length];
  return `${given} ${surname}`;
}

function identity(role, type, genre, genreIndex, bucketIndex) {
  const label = LABELS[genre] ?? genre;
  const primary = primaryGenre(role, type, genre);
  const other = primary === "vampire" ? "grimdark" : "vampire";
  if (role === "pet") {
    const stem = MASCOT_STEMS[(bucketIndex * 23 + genreIndex) % MASCOT_STEMS.length];
    const name = type === "shonen" ? `${stem}fang` : `${stem}wing`;
    return { name, archetype: `${label} occult familiar`, epithet: `${label} Night Familiar`, gender: "unspecified", species: "supernatural familiar", ageBand: "ageless", culturalBasis: "invented gothic/dark-fantasy familiar", personality: `Seems harmless until danger approaches, then reveals an uncanny instinct for ${label.toLowerCase()} routes, tools and trouble.`, primary, other };
  }
  const name = humanName(genreIndex, bucketIndex);
  const roleText = role === "protag" ? (primary === "vampire" ? "nightborne lead" : "cursed survivor") : role === "secondary" ? (primary === "vampire" ? "hunter ally" : "scarred confidant") : (primary === "vampire" ? "blood-court rival" : "ruin-born antagonist");
  const personality = role === "protag" ? `Refuses easy heroics; studies the rules of ${label.toLowerCase()} before choosing exactly which one to break.` : role === "secondary" ? `Argues with reckless plans, then quietly prepares the ${label.toLowerCase()} contingency that makes them possible.` : `Rarely raises their voice; turns ${label.toLowerCase()} systems into pressure points and lets opponents exhaust themselves.`;
  return { name, archetype: `${label} ${roleText}`, epithet: `${primary === "vampire" ? "Crimson" : "Ashen"} ${label} ${role === "villain" ? "Crown" : role === "secondary" ? "Hand" : "Vow"}`, gender: "unspecified", species: "humanoid", ageBand: "adult", culturalBasis: `invented international gothic/dark-fantasy ${genre} setting`, personality, primary, other };
}

export function buildVampireGrimdarkCast(baseGenreIds) {
  const cast = [];
  let bucketIndex = 0;
  for (const role of ROLES) {
    for (const type of TYPES) {
      for (let genreIndex = 0; genreIndex < baseGenreIds.length; genreIndex += 1) {
        const genre = baseGenreIds[genreIndex];
        const id = `vg_${ROLE_TOKENS[role]}_${type}_${genre}`;
        const ident = identity(role, type, genre, genreIndex, bucketIndex);
        cast.push({
          id,
          name: ident.name,
          archetype: ident.archetype,
          epithet: ident.epithet,
          img: `cast/v5/${id}.png`,
          personality: ident.personality,
          role,
          type,
          visibleAff: [ident.primary, genre],
          hiddenAff: ident.other,
          gender: ident.gender,
          species: ident.species,
          ageBand: ident.ageBand,
          culturalBasis: ident.culturalBasis,
          sourceRoot: `${id}.png`,
          legacyPartnerGenre: genre,
        });
      }
      bucketIndex += 1;
    }
  }
  return cast;
}

export const VAMPIRE_GRIMDARK_NEW_GENRES = ["vampire", "grimdark"];
