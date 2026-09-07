/* Rival poster art direction plan — 6 studios × 24 slots = 144 key visuals.
 *
 * This module is the single source of truth for the rival poster backlog:
 * each slot has an id, studio, anime-type compatibility, genre tags,
 * an optional franchise visual family, and the generation prompt.
 *
 * Waves: entries are generated in waves (see ART_WAVE below). Slots whose art
 * does not exist yet are written into the runtime manifest with
 * `"pending": true`; the engine never selects them until the file lands.
 *
 * Run `node scripts/rivalPosterPlan.mjs` to (re)write
 * src/engine/generated/rivalPosterManifest.json from this plan.
 */
import { writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = join(here, "..");
const PUBLIC_DIR = join(gameDir, "public");

/* slot: [slug, animeTypes, genres, family|null, wave, prompt] */

const STYLE = {
  "Toe-i Animation":
    "high-energy blockbuster anime key visual, dramatic low-angle dynamic perspective, strong silhouettes, cinematic scale, explosive motion, theatrical rim light",
  Sunnyrise:
    "technically pristine anime key visual, extremely crisp line rendering, intricate mechanical and environmental detail, polished studio lighting, precise composed framing",
  Boneworks:
    "avant-garde experimental anime key visual, unusual asymmetric composition, distinctive limited-but-bold colour language, surreal graphic imagery, daring negative space",
  "Kyo-Hani":
    "prestige cinematic anime film key visual, mature character drama framing, subtle naturalistic lighting, quiet emotional depth, film-grain theatrical composition",
  "Madcap House":
    "bright commercial anime key visual, broad appealing character designs, colourful high-readability composition, cheerful polished mainstream poster look",
  "Turtle Line":
    "fashion-forward idol anime key visual, elegant stage lighting, expressive graceful character posing, luminous performance glow, premium concert sparkle",
};

const STUDIOS = {
  "Toe-i Animation": { prefix: "toei", audience: "shonen" },
  Sunnyrise: { prefix: "sunrise", audience: "shonen" },
  Boneworks: { prefix: "bones", audience: "shonen" },
  "Kyo-Hani": { prefix: "kyo", audience: "shojo" },
  "Madcap House": { prefix: "madcap", audience: "shojo" },
  "Turtle Line": { prefix: "ttl", audience: "shojo" },
};

const NO_TEXT =
  "IMPORTANT: absolutely no text, no title, no letters, no logo, no watermark, no signature anywhere in the image; pure illustration only";

/* ------------------------------------------------------------------ slots
 * 24 slots per studio. Families cluster 2–3 related visuals so sequels can
 *  share a world without reusing one image. Wave 1 = first 12 per studio. */

const SLOTS = [
  /* ---------------------------------------------------- TOE-I (blockbuster) */
  { st: "Toe-i Animation", slug: "titanrise", types: ["shonen"], genres: ["mecha"], family: "iron-titans", wave: 1,
    prompt: "colossal heroic mecha towering over a burning city at dawn, pilot standing small in foreground" },
  { st: "Toe-i Animation", slug: "titanwreck", types: ["shonen"], genres: ["mecha", "military"], family: "iron-titans", wave: 1,
    prompt: "battle-scarred giant robot kneeling in rain surrounded by wreckage, emergency lights reflecting on wet armour" },
  { st: "Toe-i Animation", slug: "titannova", types: ["shonen"], genres: ["mecha", "space"], family: "iron-titans", wave: 1,
    prompt: "gleaming mecha launching from a space hangar toward a ringed planet, engine flare lighting the frame" },
  { st: "Toe-i Animation", slug: "ironfist", types: ["shonen"], genres: ["martial"], wave: 1,
    prompt: "martial artist throwing a devastating punch with shockwave debris, tournament arena roaring crowd behind" },
  { st: "Toe-i Animation", slug: "grandpitch", types: ["shonen"], genres: ["sports"], wave: 1,
    prompt: "floodlit stadium final match, striker mid-kick with motion streaks, dramatic low camera on turf" },
  { st: "Toe-i Animation", slug: "steelstorm", types: ["shonen"], genres: ["military"], family: "steel-front", wave: 1,
    prompt: "armoured squad advancing through smoke and searchlights, cinematic war poster composition" },
  { st: "Toe-i Animation", slug: "steelash", types: ["shonen"], genres: ["military", "survival"], family: "steel-front", wave: 1,
    prompt: "lone soldier standing on a ruined bridge at dusk, tattered banner, embers in the wind" },
  { st: "Toe-i Animation", slug: "stormcorsair", types: ["shonen"], genres: ["pirate"], wave: 1,
    prompt: "sky pirate captain on the prow of a flying ship charging into a lightning storm, coat flowing" },
  { st: "Toe-i Animation", slug: "orbitfall", types: ["shonen"], genres: ["space"], wave: 1,
    prompt: "astronaut squad silhouetted against an enormous explosion of a starship above an alien horizon" },
  { st: "Toe-i Animation", slug: "apexduel", types: ["shonen"], genres: ["martial", "sports"], wave: 2,
    prompt: "two rival fighters colliding mid-air above a packed arena, impact frame with speed lines" },
  { st: "Toe-i Animation", slug: "warhorn", types: ["shonen"], genres: ["military", "mythology"], wave: 2,
    prompt: "epic fantasy war host marching under a colossal war-horn monument, banners and ravens" },
  { st: "Toe-i Animation", slug: "voltagirl", types: ["shojo"], genres: ["magical", "sports"], wave: 2,
    prompt: "electrifying magical heroine vaulting over a stadium spotlight with crackling energy trail" },
  { st: "Toe-i Animation", slug: "neonsaber", types: ["shonen"], genres: ["cyber"], wave: 2,
    prompt: "street samurai drawing a glowing energy katana in neon-drenched alley, rain and signage glow" },
  { st: "Toe-i Animation", slug: "kaijunight", types: ["shonen"], genres: ["supernatural"], wave: 2,
    prompt: "towering spectral beast looming over midnight city rooftops, tiny exorcist hero silhouetted" },
  { st: "Toe-i Animation", slug: "grandchef", types: ["shonen"], genres: ["cooking"], wave: 2,
    prompt: "flamboyant chef flambeing a dish that erupts like a volcano, arena kitchen crowd, dramatic flames" },
  { st: "Toe-i Animation", slug: "blaststage", types: ["shonen", "shojo"], genres: ["idol"], wave: 2,
    prompt: "explosive idol concert with pyrotechnics and massive arena crowd, performer leaping off the stage" },
  { st: "Toe-i Animation", slug: "siege", types: ["shonen"], genres: ["military", "space"], wave: 2,
    prompt: "orbital drop troops descending on a besieged fortress world, tracer fire and drop pods" },
  { st: "Toe-i Animation", slug: "roninblade", types: ["shonen"], genres: ["samurai"], family: "ashen-ronin", wave: 2,
    prompt: "masterless swordsman in a bamboo forest at golden hour, blade half-drawn, drifting leaves" },
  { st: "Toe-i Animation", slug: "ronindusk", types: ["shonen"], genres: ["samurai"], family: "ashen-ronin", wave: 2,
    prompt: "the same wandering swordsman silhouetted on a battlefield of broken banners at red dusk" },
  { st: "Toe-i Animation", slug: "shadowstrike", types: ["shonen"], genres: ["shinobi"], wave: 2,
    prompt: "ninja squad dropping from moonlit rooftops, smoke bombs and drawn blades, graphic action" },
  { st: "Toe-i Animation", slug: "lastbastion", types: ["shonen"], genres: ["survival", "military"], wave: 2,
    prompt: "survivors holding a fortified rooftop against a night swarm, flare light, desperate last stand" },
  { st: "Toe-i Animation", slug: "mythforge", types: ["shonen"], genres: ["mythology"], wave: 2,
    prompt: "god-smith forging a legendary blade amid divine fire, heroic mythological scale" },
  { st: "Toe-i Animation", slug: "stormcourt", types: ["shonen"], genres: ["sports"], wave: 3,
    prompt: "basketball ace poster dunk through a storm of thunderous arena energy, comic-Boom impact" },
  { st: "Toe-i Animation", slug: "galaxyrun", types: ["shonen"], genres: ["space", "pirate"], wave: 3,
    prompt: "rogue starship crew racing through a debris field with the galaxy edge behind, swashbuckling" },

  /* ---------------------------------------------------- SUNNYRISE (technical) */
  { st: "Sunnyrise", slug: "orbknights", types: ["shonen"], genres: ["mecha", "space"], family: "orbital-knights", wave: 1,
    prompt: "precision-rendered knightly mecha standing on a space elevator platform, immaculate armour panel detail" },
  { st: "Sunnyrise", slug: "orbknights2", types: ["shonen"], genres: ["mecha", "space"], family: "orbital-knights", wave: 1,
    prompt: "the same knightly mecha in zero-gravity duel above Earth, exquisitely detailed mechanical joints" },
  { st: "Sunnyrise", slug: "orbknights3", types: ["shonen"], genres: ["space"], family: "orbital-knights", wave: 1,
    prompt: "orbital knight mecha docked inside a vast cathedral-like space station, god rays through glass" },
  { st: "Sunnyrise", slug: "chrome1", types: ["shonen"], genres: ["cyber"], family: "chrome-initiative", wave: 1,
    prompt: "cybernetics agent in a pristine white server cathedral, holographic data rings, surgical lighting" },
  { st: "Sunnyrise", slug: "chrome2", types: ["shonen"], genres: ["cyber"], family: "chrome-initiative", wave: 1,
    prompt: "the same cyber agent sprinting across a rain-slick skybridge of a chrome megacity at night" },
  { st: "Sunnyrise", slug: "fineworks", types: ["shonen"], genres: ["mecha"], wave: 1,
    prompt: "master mechanic girl before a half-assembled precision mecha in a spotless hangar, blueprint holograms" },
  { st: "Sunnyrise", slug: "zerog", types: ["shonen"], genres: ["space"], wave: 1,
    prompt: "astronaut floating through an immaculately detailed space station interior, earthlight through window" },
  { st: "Sunnyrise", slug: "dronecompany", types: ["shonen"], genres: ["military", "cyber"], wave: 1,
    prompt: "drone operator surrounded by a halo of recon drones above a frost-covered firebase" },
  { st: "Sunnyrise", slug: "circuitheart", types: ["shojo"], genres: ["cyber", "romance"], wave: 2,
    prompt: "android girl holding a glowing fibre-cable heart in a neon greenhouse of circuitry flowers" },
  { st: "Sunnyrise", slug: "jetstream", types: ["shonen"], genres: ["sports"], wave: 2,
    prompt: "anti-gravity racers threading an aerial checkpoint ring over a glittering bay, perfect motion clarity" },
  { st: "Sunnyrise", slug: "icebound", types: ["shojo"], genres: ["nordic", "mystery"], family: "icebound-protocol", wave: 2,
    prompt: "researcher in arctic gear before a frozen monolith under aurora, breath fog, meticulous snow detail" },
  { st: "Sunnyrise", slug: "icebound2", types: ["shojo"], genres: ["nordic"], family: "icebound-protocol", wave: 2,
    prompt: "the same arctic researcher studying glowing runes inside an ice cavern, precise crystalline rendering" },
  { st: "Sunnyrise", slug: "exoframe", types: ["shonen"], genres: ["mecha", "military"], wave: 2,
    prompt: "soldier in a detailed powered exoskeleton carrying a crate through a dust storm convoy" },
  { st: "Sunnyrise", slug: "datalumen", types: ["shonen", "shojo"], genres: ["mystery", "cyber"], wave: 2,
    prompt: "detective girl examining a shimmering hologram evidence wall in a darkened lab" },
  { st: "Sunnyrise", slug: "terraform", types: ["shonen"], genres: ["space", "survival"], wave: 2,
    prompt: "engineers walking across a half-terraformed red plain with towering atmosphere processors" },
  { st: "Sunnyrise", slug: "gearsaint", types: ["shonen", "shojo"], genres: ["mecha", "fantasy"], wave: 2,
    prompt: "saintly figure blessing a brass-and-crystal automaton in a clockwork basilica" },
  { st: "Sunnyrise", slug: "signalidol", types: ["shojo"], genres: ["idol", "cyber"], wave: 2,
    prompt: "holographic idol performing inside a prism of light panels, flawless reflective stage floor" },
  { st: "Sunnyrise", slug: "nanoswarm", types: ["shonen"], genres: ["cyber", "horror"], wave: 2,
    prompt: "figure backlit against a rising swarm of silver nanomachines forming a silhouette" },
  { st: "Sunnyrise", slug: "clockworkcafe", types: ["shojo"], genres: ["cooking"], wave: 2,
    prompt: "clockwork cafe where automaton waiters serve perfect pastries, warm brass and glass detail" },
  { st: "Sunnyrise", slug: "arclight", types: ["shojo"], genres: ["magical", "cyber"], wave: 2,
    prompt: "magical engineer conjuring a circuit-rune spell above a rooftop of server spires" },
  { st: "Sunnyrise", slug: "deepfield", types: ["shonen"], genres: ["space", "mystery"], wave: 2,
    prompt: "survey ship crew before an impossible cathedral structure on a dark planet" },
  { st: "Sunnyrise", slug: "sentinel", types: ["shonen"], genres: ["military"], wave: 2,
    prompt: "lone sentinel mech standing watch over a snowy border wall at dawn, exacting mechanical detail" },
  { st: "Sunnyrise", slug: "photonblade", types: ["shonen"], genres: ["samurai", "cyber"], wave: 3,
    prompt: "cyber-samurai in lacquered armour with photon katana on a neon suspension bridge" },
  { st: "Sunnyrise", slug: "nightops", types: ["shonen"], genres: ["shinobi", "cyber"], wave: 3,
    prompt: "operative cloaked in refractive camo infiltrating a server vault, laser grid, tech-noir" },

  /* ---------------------------------------------------- BONEWORKS (experimental) */
  { st: "Boneworks", slug: "hollowtide", types: ["shonen"], genres: ["horror"], family: "the-hollow-tide", wave: 1,
    prompt: "drowned fishing village under a vast tidal wave frozen mid-crash, small figures on the shore, surreal dread" },
  { st: "Boneworks", slug: "hollowtide2", types: ["shonen"], genres: ["horror", "supernatural"], family: "the-hollow-tide", wave: 1,
    prompt: "the same village beneath the ocean surface now inverted in the sky, jellyfish lights, uncanny calm" },
  { st: "Boneworks", slug: "hollowtide3", types: ["shonen"], genres: ["survival", "horror"], family: "the-hollow-tide", wave: 1,
    prompt: "one survivor rowing a coffin-boat through a flooded cathedral, moon well in the ceiling" },
  { st: "Boneworks", slug: "papermoon", types: ["shojo"], genres: ["supernatural", "mystery"], family: "paper-moon", wave: 1,
    prompt: "girl in a paper-cut world where the moon is a taped paper disc pulling loose, torn edges reveal void" },
  { st: "Boneworks", slug: "papermoon2", types: ["shojo"], genres: ["mystery"], family: "paper-moon", wave: 1,
    prompt: "the same girl reading a letter that unfolds into a staircase to nowhere, collage textures" },
  { st: "Boneworks", slug: "marrow", types: ["shonen"], genres: ["horror"], wave: 1,
    prompt: "skeletal orchard growing bone-white fruit under a green sky, lone figure harvests them" },
  { st: "Boneworks", slug: "staticdream", types: ["shonen"], genres: ["supernatural", "cyber"], wave: 1,
    prompt: "boy dissolving into television static on a midnight rooftop, fragment shapes become birds" },
  { st: "Boneworks", slug: "funhouse", types: ["shonen", "shojo"], genres: ["comedy", "horror"], wave: 1,
    prompt: "grinning funhouse mirror maze where reflections move wrong, candy-coloured menace" },
  { st: "Boneworks", slug: "limbos", types: ["shojo"], genres: ["mystery", "isekai"], wave: 2,
    prompt: "girl waking in a hotel hallway with no doors, carpet pattern climbs the walls, vertigo framing" },
  { st: "Boneworks", slug: "teeth", types: ["shonen"], genres: ["survival"], wave: 2,
    prompt: "mountain range revealed as a sleeping jaw, climbers tiny on the ridge, dread wonder" },
  { st: "Boneworks", slug: "mothlight", types: ["shojo"], genres: ["supernatural", "romance"], wave: 2,
    prompt: "two lovers reaching across a lamplit library as moths carry their letters into the dark" },
  { st: "Boneworks", slug: "redroom", types: ["shonen", "shojo"], genres: ["mystery", "horror"], wave: 2,
    prompt: "single red room with three identical women seated for tea, one light source, unsettling symmetry" },
  { st: "Boneworks", slug: "waxworks", types: ["shojo"], genres: ["horror", "mystery"], wave: 2,
    prompt: "wax museum figures softly melting among visitors who may not be alive, candle glow" },
  { st: "Boneworks", slug: "oddsaint", types: ["shonen"], genres: ["supernatural", "mythology"], wave: 2,
    prompt: "street saint with a halo of broken bottle glass blessing pigeons on a shrine of rubbish" },
  { st: "Boneworks", slug: "fevergreen", types: ["shojo"], genres: ["slice", "supernatural"], wave: 2,
    prompt: "schoolgirl watering a plant that is quietly growing a second school, fever-dream green palette" },
  { st: "Boneworks", slug: "hungers", types: ["shonen"], genres: ["cooking", "horror"], wave: 2,
    prompt: "banquet table where the meal is arranged like an anatomical diagram, guests with empty plates" },
  { st: "Boneworks", slug: "mirrorsalt", types: ["shojo"], genres: ["nordic", "supernatural"], wave: 2,
    prompt: "girl skating across a salt flat that reflects a different sky, white-out surreal composition" },
  { st: "Boneworks", slug: "crowsong", types: ["shonen"], genres: ["mythology", "horror"], wave: 2,
    prompt: "crow-headed trickster spirit playing a bone flute above a ritual bonfire" },
  { st: "Boneworks", slug: "nullpoint", types: ["shonen"], genres: ["space", "horror"], wave: 2,
    prompt: "astronaut before an airlock that opens onto an endless hallway of itself, void composition" },
  { st: "Boneworks", slug: "pilgrim", types: ["shonen"], genres: ["nordic", "survival"], wave: 2,
    prompt: "masked pilgrim crossing a tundra of frozen facing-statues, each turned toward him" },
  { st: "Boneworks", slug: "inverted", types: ["shojo"], genres: ["magical", "horror"], wave: 2,
    prompt: "magical girl transformation where the sparkle reveals a shadow-version behind her, duality" },
  { st: "Boneworks", slug: "madronin", types: ["shonen"], genres: ["samurai", "horror"], wave: 2,
    prompt: "samurai duelling his own severed shadow under a persimmon tree, brush-stroke violence" },
  { st: "Boneworks", slug: "paleoperative", types: ["shonen"], genres: ["shinobi", "mystery"], wave: 3,
    prompt: "albino ninja in a paper lantern festival crowd, every face a pale mask, graphic white-on-red" },
  { st: "Boneworks", slug: "throng", types: ["shojo"], genres: ["idol", "supernatural"], wave: 3,
    prompt: "idol singing to an audience of gentle featureless apparitions holding glowsticks of mist" },

  /* ---------------------------------------------------- KYO-HANI (prestige) */
  { st: "Kyo-Hani", slug: "winters", types: ["shojo"], genres: ["nordic", "slice"], family: "winters-light", wave: 1,
    prompt: "widow and child walking a fjord village lane in low winter sun, long shadow, tender cinematic stillness" },
  { st: "Kyo-Hani", slug: "winters2", types: ["shojo"], genres: ["nordic", "mystery"], family: "winters-light", wave: 1,
    prompt: "the same widow years later reading a letter on the fjord ferry at blue hour, cinematic two-shot framing" },
  { st: "Kyo-Hani", slug: "mapleave", types: ["shojo"], genres: ["slice", "romance"], family: "maple-avenue", wave: 1,
    prompt: "two students sheltering from autumn rain under a maple tree avenue, golden leaves, quiet longing" },
  { st: "Kyo-Hani", slug: "mapleave2", types: ["shojo"], genres: ["romance"], family: "maple-avenue", wave: 1,
    prompt: "the same pair meeting again in spring on the same avenue, cherry blossoms replacing maple, mature warmth" },
  { st: "Kyo-Hani", slug: "quietsea", types: ["shojo"], genres: ["slice"], wave: 1,
    prompt: "grandmother teaching granddaughter to mend fishing nets on a sea wall, late afternoon, gentle realism" },
  { st: "Kyo-Hani", slug: "lastletter", types: ["shojo"], genres: ["romance", "mystery"], wave: 1,
    prompt: "woman on a night train pressing an unsent letter to the window as the city streaks past" },
  { st: "Kyo-Hani", slug: "embershield", types: ["shonen", "shojo"], genres: ["military"], wave: 1,
    prompt: "exhausted field medic shielding a wounded soldier in a bombed chapel, ember light through stained glass" },
  { st: "Kyo-Hani", slug: "valkyriefall", types: ["shonen", "shojo"], genres: ["mythology"], wave: 1,
    prompt: "aging valkyrie laying down her spear in a wildflower battlefield, mourning doves, operatic composition" },
  { st: "Kyo-Hani", slug: "snowcourt", types: ["shojo"], genres: ["nordic"], wave: 2,
    prompt: "figure skating duo in an empty frozen palace courtyard at dawn, breath and sequins, regal framing" },
  { st: "Kyo-Hani", slug: "afterrain", types: ["shojo"], genres: ["slice", "supernatural"], wave: 2,
    prompt: "girl sharing an umbrella with the small river spirit nobody else can see after the rain stops" },
  { st: "Kyo-Hani", slug: "thedetective", types: ["shonen", "shojo"], genres: ["mystery"], wave: 2,
    prompt: "retired detective feeding crows on his office balcony, case board visible through glass, noir dusk" },
  { st: "Kyo-Hani", slug: "calligrapher", types: ["shonen", "shojo"], genres: ["samurai", "slice"], wave: 2,
    prompt: "old swordmaster grinding ink and writing one perfect character at dawn, katana resting beside paper" },
  { st: "Kyo-Hani", slug: "foxshrine", types: ["shojo"], genres: ["mythology", "supernatural"], wave: 2,
    prompt: "shrine maiden sharing tea with a nine-tailed fox spirit beneath crimson torii gates" },
  { st: "Kyo-Hani", slug: "greymarket", types: ["shonen", "shojo"], genres: ["mystery", "cyber"], wave: 2,
    prompt: "courier woman pausing in a monochrome night market, single red umbrella, echo-noir mood" },
  { st: "Kyo-Hani", slug: "pianoline", types: ["shojo"], genres: ["idol"], wave: 2,
    prompt: "retired pianist listening to her daughter's debut from the theatre wing, silhouette against stage light" },
  { st: "Kyo-Hani", slug: "orchard", types: ["shojo"], genres: ["cooking", "slice"], wave: 2,
    prompt: "three generations bottling plum jam in a farmhouse kitchen, steam and laughter, golden window light" },
  { st: "Kyo-Hani", slug: "longwinter", types: ["shonen", "shojo"], genres: ["survival", "nordic"], wave: 2,
    prompt: "keeper of a lighthouse walking supplies across a frozen causeway under immense sky" },
  { st: "Kyo-Hani", slug: "glassangel", types: ["shojo"], genres: ["magical", "romance"], wave: 2,
    prompt: "glassblower crafting an angel ornament while the memory of her lover watches in the furnace glow" },
  { st: "Kyo-Hani", slug: "shoreline", types: ["shojo"], genres: ["fantasy"], wave: 2,
    prompt: "librarian walking the shoreline where a beached dragon sleep-dreams, respectful distance, dusk" },
  { st: "Kyo-Hani", slug: "oniabacus", types: ["shonen", "shojo"], genres: ["supernatural"], wave: 2,
    prompt: "demon accountant in a smoky back room tallying human fortunes on a brass abacus" },
  { st: "Kyo-Hani", slug: "gildedcage", types: ["shojo"], genres: ["romance", "horror"], wave: 2,
    prompt: "bride in a gilded birdcage elevator descending through a mansion, mascara intact, quiet terror" },
  { st: "Kyo-Hani", slug: "shadowless", types: ["shonen", "shojo"], genres: ["shinobi"], wave: 3,
    prompt: "swordswoman who casts no shadow kneeling before her master's grave in falling snow" },
  { st: "Kyo-Hani", slug: "starfarer", types: ["shonen", "shojo"], genres: ["space"], wave: 3,
    prompt: "old astronaut watching his granddaughter's launch from a hospital window, two eras framed in one" },
  { st: "Kyo-Hani", slug: "shogi", types: ["shonen", "shojo"], genres: ["sports", "mystery"], wave: 3,
    prompt: "two masters over a shogi board in a silent hall, one piece trembling mid-air, psychological duel" },

  /* ---------------------------------------------------- MADCAP HOUSE (volume) */
  { st: "Madcap House", slug: "goblin1", types: ["shonen"], genres: ["isekai", "comedy"], family: "goblin-delivery", wave: 1,
    prompt: "cheerful goblin delivery courier with an absurdly stacked parcel bike in a fantasy market street" },
  { st: "Madcap House", slug: "goblin2", types: ["shonen"], genres: ["isekai"], family: "goblin-delivery", wave: 1,
    prompt: "the same goblin courier delivering to a dragon's cave doorbell, deadpan dragon, sunny palette" },
  { st: "Madcap House", slug: "cafe1", types: ["shojo"], genres: ["cooking", "slice"], family: "cafe-parade", wave: 1,
    prompt: "bustling corner cafe with animal waiters and a towering pancake parade float outside, candy colours" },
  { st: "Madcap House", slug: "cafe2", types: ["shojo"], genres: ["cooking"], family: "cafe-parade", wave: 1,
    prompt: "the same cafe crew catering a royal picnic gone slightly chaotic, flying cupcakes, bright fun" },
  { st: "Madcap House", slug: "overdrive", types: ["shonen", "shojo"], genres: ["comedy"], wave: 1,
    prompt: "student council racing down a school hallway in a homemade go-cart, pure slapstick speed" },
  { st: "Madcap House", slug: "roommates", types: ["shojo"], genres: ["slice", "comedy"], wave: 1,
    prompt: "four mismatched roommates enduring laundry day chaos in a tiny sunny apartment" },
  { st: "Madcap House", slug: "otherworld", types: ["shonen"], genres: ["isekai"], wave: 1,
    prompt: "ordinary salaryman summoned to a fantasy kingdom where he just wants to open a convenience store" },
  { st: "Madcap House", slug: "bento", types: ["shonen", "shojo"], genres: ["cooking", "comedy"], wave: 1,
    prompt: "school lunch box duel: two grandmothers weaponising octopus-sausage presentation, dramatic parody" },
  { st: "Madcap House", slug: "classrep", types: ["shojo"], genres: ["slice"], wave: 2,
    prompt: "overachieving class representative juggling notebooks, brooms and festival banners with a smile" },
  { st: "Madcap House", slug: "magicaloops", types: ["shojo"], genres: ["magical", "comedy"], wave: 2,
    prompt: "rookie magical girl whose transformation accidentally filled the street with bubbles and cats" },
  { st: "Madcap House", slug: "petshop", types: ["shojo"], genres: ["slice", "magical"], wave: 2,
    prompt: "girl minding a pet shop where the animals politely transform after closing time" },
  { st: "Madcap House", slug: "easyquest", types: ["shonen"], genres: ["fantasy", "comedy"], wave: 2,
    prompt: "party of adventurers exhausted at the quest board picking the easiest errand, dungeon mop in hand" },
  { st: "Madcap House", slug: "dungeonmart", types: ["shonen"], genres: ["fantasy", "isekai"], wave: 2,
    prompt: "bright cheerful convenience store built inside a dungeon, slime mascot greeting customers" },
  { st: "Madcap House", slug: "pirateprank", types: ["shonen"], genres: ["pirate", "comedy"], wave: 2,
    prompt: "pirate crew discovering their treasure map leads to a novelty gift shop, captain facepalming" },
  { st: "Madcap House", slug: "mechahelper", types: ["shonen"], genres: ["mecha", "comedy"], wave: 2,
    prompt: "tiny housekeeping robot standing proudly atop the giant mecha it cleans, hangar scale joke" },
  { st: "Madcap House", slug: "sportsgag", types: ["shonen", "shojo"], genres: ["sports", "comedy"], wave: 2,
    prompt: "underdog volleyball team celebrating a lost point because of an inside joke, sunlit gym" },
  { st: "Madcap House", slug: "ghostroomie", types: ["shojo"], genres: ["supernatural", "comedy"], wave: 2,
    prompt: "girl arguing with her ghost roommate about whose turn to vacuum, the ghost holding the cord" },
  { st: "Madcap House", slug: "idolfail", types: ["shojo"], genres: ["idol", "comedy"], wave: 2,
    prompt: "idol group striking a final pose as the stage curtain tangles, everyone laughing anyway" },
  { st: "Madcap House", slug: "romcom", types: ["shojo"], genres: ["romance", "comedy"], wave: 2,
    prompt: "two stubborn leads holding one umbrella but facing opposite directions, both blushing" },
  { st: "Madcap House", slug: "ninjanap", types: ["shonen"], genres: ["shinobi", "comedy"], wave: 2,
    prompt: "elite ninja fast asleep dangling from a ceiling beam above the oblivious target, sunbeam nap" },
  { st: "Madcap House", slug: "vikingolympic", types: ["shonen"], genres: ["mythology", "sports"], wave: 2,
    prompt: "norse gods competing in an absurdly modern track-and-field day, lightning javelin, playful scale" },
  { st: "Madcap House", slug: "spacecamp", types: ["shonen"], genres: ["space", "comedy"], wave: 2,
    prompt: "space camp kids building a wonky rocket from a vending machine manual, flags and enthusiasm" },
  { st: "Madcap House", slug: "hauntedbaker", types: ["shonen", "shojo"], genres: ["cooking", "supernatural"], wave: 3,
    prompt: "baker boxing a birthday cake while three tiny well-mannered ghosts help tie the ribbon" },
  { st: "Madcap House", slug: "survivalgag", types: ["shonen"], genres: ["survival", "comedy"], wave: 3,
    prompt: "castaway on a tiny island running a surprisingly professional lost-and-found for the ocean" },

  /* ---------------------------------------------------- TURTLE LINE (idol) */
  { st: "Turtle Line", slug: "star1", types: ["shojo"], genres: ["idol"], family: "starlight-cascade", wave: 1,
    prompt: "idol group in crystal-white costumes under an explosion of starlight stage effects, luminous joy" },
  { st: "Turtle Line", slug: "star2", types: ["shojo"], genres: ["idol"], family: "starlight-cascade", wave: 1,
    prompt: "the same idol group mid-dance formation on a water-mirror stage, reflections and rose-gold light" },
  { st: "Turtle Line", slug: "star3", types: ["shojo"], genres: ["idol", "romance"], family: "starlight-cascade", wave: 1,
    prompt: "the group's centre idol alone on the dark stage after the show, single spotlight, held hand-mic" },
  { st: "Turtle Line", slug: "velvet1", types: ["shojo"], genres: ["idol", "romance"], family: "velvet-stage", wave: 1,
    prompt: "duet pair in velvet evening wear under antique theatre spotlights, dust motes in the beam" },
  { st: "Turtle Line", slug: "velvet2", types: ["shojo"], genres: ["romance"], family: "velvet-stage", wave: 1,
    prompt: "the same pair sharing one umbrella outside the stage door in snowfall, marquee glow behind" },
  { st: "Turtle Line", slug: "prismduet", types: ["shojo"], genres: ["idol"], wave: 1,
    prompt: "two idols singing back-to-back inside a rotating prism of stage lasers, fashion-magazine styling" },
  { st: "Turtle Line", slug: "moonwaltz", types: ["shojo"], genres: ["romance", "magical"], wave: 1,
    prompt: "girl waltzing with her moon-lit reflection on a rooftop ballroom of clouds" },
  { st: "Turtle Line", slug: "encore", types: ["shojo"], genres: ["idol", "slice"], wave: 1,
    prompt: "idol in training gear practising one move at 2am in the rehearsal mirror, glowing phone playlist" },
  { st: "Turtle Line", slug: "heartantenna", types: ["shojo"], genres: ["magical", "romance"], wave: 2,
    prompt: "magical girl broadcasting love signals from a rooftop antenna tower at sunset, heart radio waves" },
  { st: "Turtle Line", slug: "backstage", types: ["shojo"], genres: ["slice", "idol"], wave: 2,
    prompt: "warm backstage corridor moment: senpai idol fixing kouhai's collar before the curtain rises" },
  { st: "Turtle Line", slug: "neonsymphony", types: ["shojo"], genres: ["idol", "cyber"], wave: 2,
    prompt: "virtual idol conductor leading an orchestra of hologram instruments above a neon city" },
  { st: "Turtle Line", slug: "roseduel", types: ["shojo"], genres: ["romance"], wave: 2,
    prompt: "duelling pianists on a rose-petal stage trading melodies filled hostilities, dramatic elegance" },
  { st: "Turtle Line", slug: "fantasia", types: ["shojo"], genres: ["magical"], wave: 2,
    prompt: "conductor girl whose baton paints constellations across a midnight concert hall ceiling" },
  { st: "Turtle Line", slug: "laceparade", types: ["shojo"], genres: ["idol", "military"], wave: 2,
    prompt: "idol marching band in lace-trimmed uniforms crossing a spring parade square, brass and ribbons" },
  { st: "Turtle Line", slug: "swansong", types: ["shojo"], genres: ["romance", "mystery"], wave: 2,
    prompt: "ballerina discovering a secret score hidden inside the lake's swan feathers, twilight mystery" },
  { st: "Turtle Line", slug: "candystage", types: ["shojo"], genres: ["idol", "comedy"], wave: 2,
    prompt: "idol trio tumbling out of a giant candy prop during a cheerful stage mishap, pastel chaos" },
  { st: "Turtle Line", slug: "debutante", types: ["shojo"], genres: ["slice", "romance"], wave: 2,
    prompt: "country girl seeing the city concert hall chandeliers for the first time, wonder on her face" },
  { st: "Turtle Line", slug: "stardustrevue", types: ["shojo"], genres: ["idol", "space"], wave: 2,
    prompt: "zero-gravity idol revue aboard an orbital cruise liner, gowns floating like nebulae" },
  { st: "Turtle Line", slug: "violinprince", types: ["shojo"], genres: ["romance", "idol"], wave: 2,
    prompt: "princely violinist serenading from a grand staircase balcony, rose gold, shoujo sparkle" },
  { st: "Turtle Line", slug: "gildedmelody", types: ["shojo"], genres: ["idol", "fantasy"], wave: 3,
    prompt: "songstress in a gilded aviary cathedral whose song frees golden birds, high fantasy couture" },
  { st: "Turtle Line", slug: "sweetdiva", types: ["shojo"], genres: ["cooking", "idol"], wave: 3,
    prompt: "patissiere idol presenting a jewel-box dessert tower under patisserie spotlights, delectable glamour" },
  { st: "Turtle Line", slug: "seaserenade", types: ["shojo"], genres: ["romance", "fantasy"], wave: 3,
    prompt: "mermaid songstress performing for a sunken ballroom audience of fish and prince in a diving bell" },
  { st: "Turtle Line", slug: "clockball", types: ["shojo"], genres: ["magical", "mystery"], wave: 3,
    prompt: "midnight masquerade inside a giant clockwork ballroom, dancer hiding a glowing key" },
  { st: "Turtle Line", slug: "kwaiimech", types: ["shojo"], genres: ["mecha", "magical"], wave: 3,
    prompt: "pastel magical mecha with ribbon detailing standing guard over a dreamlike flower city" },
];

/* ----------------------------------------------------------------- emit */

const waveOf = (slot) => slot.wave ?? 2;
const idOf = (slot) => `${STUDIOS[slot.st].prefix}_${slot.slug}`;

export const PLAN = SLOTS.map((s, i) => ({
  id: idOf(s),
  img: `rival-posters/${idOf(s)}.webp`,
  studio: s.st,
  persona: { "Toe-i Animation": "blockbuster", Sunnyrise: "technical", Boneworks: "experimental", "Kyo-Hani": "prestige", "Madcap House": "volume", "Turtle Line": "idol" }[s.st],
  animeTypes: s.types,
  genres: s.genres,
  family: s.family ?? null,
  wave: waveOf(s),
  prompt: `${STYLE[s.st]}, ${s.prompt}. Original anime series key visual, portrait 4:5 poster composition with clear space near the top for a title overlay. ${NO_TEXT}.`,
  order: i,
}));

/** which planned slots currently have generated art on disk */
export function artAvailable(slot) {
  return existsSync(join(PUBLIC_DIR, slot.img));
}

export function manifestEntries() {
  return PLAN.map((p) => {
    const { wave, prompt, order, ...keep } = p;
    return artAvailable(p) ? keep : { ...keep, pending: true };
  });
}

export function writeManifest() {
  const entries = manifestEntries();
  const available = entries.filter((e) => !e.pending).length;
  const manifest = {
    schema: 1,
    capacity: { perStudio: 24, studios: 6, total: entries.length },
    generated: available,
    pending: entries.length - available,
    posters: entries,
  };
  const out = join(gameDir, "src", "engine", "generated", "rivalPosterManifest.json");
  writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`manifest: ${entries.length} slots (${available} generated, ${entries.length - available} pending) → ${out}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) writeManifest();
