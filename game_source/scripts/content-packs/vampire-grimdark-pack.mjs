const GRIMDARK_VISIBLE = new Set([
  "vg_lead_shonen_sports",
  "vg_lead_shonen_fantasy",
  "vg_lead_shonen_mystery",
  "vg_lead_shonen_military",
  "vg_lead_shonen_space",
  "vg_lead_shonen_magical",
  "vg_lead_shonen_survival",
  "vg_lead_shonen_pirate",
  "vg_lead_shonen_martial",
  "vg_lead_shonen_mythology",
  "vg_lead_shonen_nordic",
  "vg_lead_shonen_samurai",
  "vg_lead_shonen_shinobi",
  "vg_sidekick_shonen_mecha",
  "vg_sidekick_shonen_isekai",
  "vg_sidekick_shonen_slice",
  "vg_sidekick_shonen_horror",
  "vg_sidekick_shonen_romance",
  "vg_sidekick_shonen_sports",
  "vg_sidekick_shonen_cyber",
  "vg_sidekick_shonen_fantasy",
  "vg_sidekick_shonen_idol",
  "vg_sidekick_shonen_mystery",
  "vg_sidekick_shonen_comedy",
  "vg_sidekick_shonen_cooking",
  "vg_sidekick_shonen_military",
  "vg_sidekick_shonen_supernatural",
  "vg_sidekick_shonen_space",
  "vg_sidekick_shonen_magical",
  "vg_sidekick_shonen_survival",
  "vg_sidekick_shonen_pirate",
  "vg_sidekick_shonen_martial",
  "vg_sidekick_shonen_mythology",
  "vg_sidekick_shonen_nordic",
  "vg_sidekick_shonen_samurai",
  "vg_sidekick_shonen_shinobi",
  "vg_mascot_shonen_mecha",
  "vg_mascot_shonen_isekai",
  "vg_mascot_shonen_slice",
  "vg_mascot_shonen_horror",
  "vg_mascot_shonen_romance",
  "vg_mascot_shonen_sports",
  "vg_mascot_shonen_cyber",
  "vg_mascot_shonen_fantasy",
  "vg_mascot_shonen_idol",
  "vg_mascot_shonen_mystery",
  "vg_mascot_shonen_comedy",
  "vg_mascot_shonen_cooking",
  "vg_mascot_shonen_military",
  "vg_mascot_shonen_supernatural",
  "vg_mascot_shonen_space",
  "vg_mascot_shonen_magical",
  "vg_mascot_shonen_survival",
  "vg_mascot_shonen_pirate",
  "vg_mascot_shonen_martial",
  "vg_mascot_shonen_mythology",
  "vg_mascot_shonen_nordic",
  "vg_mascot_shonen_samurai",
  "vg_mascot_shonen_shinobi",
  "vg_mascot_shojo_isekai",
  "vg_mascot_shojo_horror",
  "vg_mascot_shojo_mythology",
  "vg_villain_shonen_mecha",
  "vg_villain_shonen_isekai",
  "vg_villain_shonen_slice",
  "vg_villain_shonen_horror",
  "vg_villain_shonen_romance",
  "vg_villain_shonen_sports",
  "vg_villain_shonen_cyber",
  "vg_villain_shonen_fantasy",
  "vg_villain_shonen_idol",
  "vg_villain_shonen_mystery",
  "vg_villain_shonen_comedy",
  "vg_villain_shonen_cooking",
  "vg_villain_shonen_military",
  "vg_villain_shonen_supernatural",
  "vg_villain_shonen_space",
  "vg_villain_shonen_magical",
  "vg_villain_shonen_survival",
  "vg_villain_shonen_pirate",
  "vg_villain_shonen_martial",
  "vg_villain_shonen_mythology",
  "vg_villain_shonen_nordic",
  "vg_villain_shonen_samurai",
  "vg_villain_shonen_shinobi",
  "vg_villain_shojo_cyber",
  "vg_villain_shojo_survival",
  "vg_villain_shojo_pirate",
  "vg_villain_shojo_martial",
  "vg_villain_shojo_mythology"
]);

const ROLE_TOKENS = { protag: "lead", secondary: "sidekick", pet: "mascot", villain: "villain" };
const TYPES = ["shonen", "shojo"];
const ROLES = ["protag", "secondary", "pet", "villain"];
const GIVEN = ["Aster","Bastien","Cassian","Darya","Eiran","Farah","Galen","Hanae","Ilyas","Juno","Kestrel","Leona","Marek","Nadia","Orin","Priya","Quill","Rhea","Soren","Talia","Uri","Veda","Wren"];
const SURNAMES = ["Ashcombe","Velasco","Morcant","Drazic","Bellamy","Okafor","Kowalski","Navarro","Haddad","Varga","Te Rangi","Mensah","Petrov","Laurent","Chen","Bennett","Ibarra","Khatri","Solberg","Adebayo","Moretti","Park","Alvarez","Rahman","Novak","Silva","Mori","Diallo","Costa","Yilmaz","Bekele","Serrano","Kaur","Nielsen","Morales","Tan","Ortega","Bako","Fischer","Yamane","Gomez","Aziz","Ivanov","Reyes","Nakamura","Adeyemi","Kovacs","Marin","Saad","Kim","Torres","Lind","Patel","Voss","Okoye","Mendes","Rossi","Fujita","Osei","Marlow","Ito","Khan","Santos","Volkov","Hale","Duval","Choi","Ramos","Dahl","Mercer","Amani","Jensen","Nguyen","Hassan","Nowak","Berg","Mendoza","Arslan","Njeri","Castillo","Bae","Ferreira","Kozlov","Hart","Lavigne","Cho","Vega","Dlamini","Serrat","Kade","Morrow","Vale","Roux"];
const MASCOT_STEMS = ["Nox","Morrow","Cinder","Velvet","Gloom","Pip","Rune","Orbit","Miso","Fanglet","Bramble","Hex","Rooklet","Ember","Mothkin","Grit","Poppet","Vanta","Kettle","Talon","Biscuit","Sablewing","Lumen"];
const LABELS = { mecha:"Mecha", isekai:"Isekai", slice:"Slice of Life", horror:"Horror", romance:"Romance", sports:"Sports", cyber:"Cyberpunk", fantasy:"Fantasy", idol:"Idol", mystery:"Mystery", comedy:"Comedy", cooking:"Cooking", military:"Military", supernatural:"Supernatural", space:"Space", magical:"Magical", survival:"Survival", pirate:"Pirate", martial:"Martial Arts", mythology:"Mythology", nordic:"Nordic", samurai:"Samurai", shinobi:"Shinobi" };

function humanName(genreIndex, bucketIndex) {
  const given = GIVEN[(genreIndex * 3 + bucketIndex * 7) % GIVEN.length];
  const surname = SURNAMES[(genreIndex * 11 + bucketIndex * 17) % SURNAMES.length];
  return `${given} ${surname}`;
}

function identity(id, role, type, genre, genreIndex, bucketIndex) {
  const label = LABELS[genre] ?? genre;
  const primary = GRIMDARK_VISIBLE.has(id) ? "grimdark" : "vampire";
  const other = primary === "vampire" ? "grimdark" : "vampire";
  if (role === "pet") {
    const stem = MASCOT_STEMS[genreIndex % MASCOT_STEMS.length];
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
        const ident = identity(id, role, type, genre, genreIndex, bucketIndex);
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
