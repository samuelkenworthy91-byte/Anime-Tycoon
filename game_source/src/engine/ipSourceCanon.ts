export type SourceCanonRole = "protagonist" | "companion" | "antagonist" | "mascot";
export interface SourceCanonCharacter {
  role: SourceCanonRole;
  name: string;
  description: string;
}
export interface SourceCanon {
  /** Developer-only reference used to audit that parody names come from the intended source property. */
  reference: string;
  /** Player-facing transformed synopsis of the source premise. */
  description: string;
  characters: SourceCanonCharacter[];
}

const c = (
  reference: string,
  description: string,
  protagonist: string,
  companion: string,
  antagonist: string,
  mascot: string,
): SourceCanon => ({
  reference,
  description,
  characters: [
    { role: "protagonist", name: protagonist, description: "The source property’s central lead." },
    { role: "companion", name: companion, description: "A defining ally, partner or rival from the source property." },
    { role: "antagonist", name: antagonist, description: "A major opposing figure from the source property." },
    { role: "mascot", name: mascot, description: "A memorable supporting figure from the source property." },
  ],
});

/**
 * Hand-authored parody canon for the 100 auction properties.
 * Names deliberately riff on actual source characters rather than being random
 * generator output, so licensed sequels/reboots have recognisable continuity.
 */
export const IP_SOURCE_CANON: Record<number, SourceCanon> = {
  1: c("Final Fantasy I", "Four elemental crystals are dying, and a band of chosen adventurers must restore them before a time-looped knight turns the world’s first prophecy into its last.", "Warren Light", "Sera Cornelia", "Garland Gone", "Mat Oya"),
  2: c("Final Fantasy VII", "A former elite soldier joins eco-rebels against a corporation draining the planet, only to find his past and a silver-haired war hero tangled in a much larger catastrophe.", "Claude Stray", "Tiff Lockheart", "Seth Iroth", "Rust XIII"),
  3: c("The Legend of Zelda", "A wandering hero gathers ancient relics, explores puzzle-filled ruins and repeatedly stands between a princess’s kingdom and a power-hungry demon king.", "Linc Hyrule", "Zella Hylia", "Ganon Dwarf", "Navi Gation"),
  4: c("Fire Emblem: The Binding Blade", "A young noble leads an army across a war-torn continent, gathering allies and legendary weapons while an expansionist king pursues the return of dragons.", "Roy Ember", "Lil Ina", "Zephyr Bell", "Merlin Us"),
  5: c("Fire Emblem: Three Houses", "An enigmatic professor teaches rival heirs at a military academy before political and religious fault lines split their friendships into a continent-wide war.", "Bye Leth", "Edie Guard", "Dimi Tree", "Claud von Deer"),
  6: c("Death Note", "A brilliant student finds a supernatural notebook that kills anyone whose name is written inside and enters a lethal battle of deduction with an eccentric detective.", "Bright Yagami", "Elle Lawliet", "Rye Yuk", "Misa Miso"),
  7: c("Dragon Ball Z", "A cheerful martial artist and his allies defend Earth through ever-larger battles against alien conquerors, androids and magical monsters while continually breaking their own limits.", "Go-Ku", "Veg Eata", "Freezer", "Krillin It"),
  8: c("Dragon Ball GT", "A veteran hero is transformed into a child and sent across space to recover dangerous dragon relics before new enemies turn old Saiyan history against Earth.", "Go-Kid", "Pan Cake", "Babyface", "Trunks Briefly"),
  9: c("Fullmetal Alchemist: Brotherhood", "Two brothers who broke alchemy’s greatest taboo search for a way to restore their bodies and uncover a nationwide conspiracy built around war, sacrifice and a manufactured god.", "Ed Ward Elric", "Al Fonse", "Father Figure", "Win Ree"),
  10: c("Devil May Cry", "A swaggering demon hunter takes impossible contracts while a feud with his equally gifted brother drags both men back toward their demonic inheritance.", "Dainty Sparda", "Virgil Sparda", "Mundane", "Lady Luck"),
  11: c("Monster", "A gifted surgeon saves a child who grows into a calculating killer, forcing the doctor across Europe in pursuit of the life he once chose to preserve.", "Dr Ken Tenner", "Nina Fortnight", "Yo Han Liberty", "Lunge Line"),
  12: c("Fate/stay night", "Modern mages summon legendary heroes to fight a secret war for a wish-granting relic, while an idealistic survivor discovers how costly heroic ideals can become.", "Shiro Emu", "Rin Toastaka", "Gill Gamesh", "Sabre Art"),
  13: c("Ender's Game", "A strategically gifted child is pushed through an orbital battle school to prepare for an alien war, without being told where training ends and real command begins.", "Enda Wiggins", "Valen Tyne", "Colonel Graft", "Beanie"),
  14: c("FIFA story mode", "A young football prospect fights through trials, transfers, rivalries and family expectations while trying to turn academy promise into a top-flight career.", "Alec Hunta", "Jim Hunta", "Gareth Walkoff", "Cat Hunter"),
  15: c("Chromehounds", "Mercenary mech pilots assemble specialised war machines and choose sides in a shifting regional conflict where squad roles and battlefield coordination matter more than one superweapon.", "Sgt Toms", "Raf Zackel", "Mors Koi", "Sal Kar"),
  16: c("Warhammer 40,000", "Humanity survives a brutal far future of endless war, ancient aliens, corrupted champions and impossible faith beneath the shadow of a near-divine emperor.", "Emperor Mankind", "Robot Gilliman", "Horrus Lupine", "Caiaphas Cane"),
  17: c("Star Wars", "A farm youth is drawn into a galactic rebellion, learns an ancient mystical discipline and discovers that the empire’s masked enforcer is bound to his own family.", "Luke Skyrunner", "Leia Organza", "Darth Wader", "Han Soloist"),
  18: c("Labyrinth", "A teenager enters a dreamlike goblin realm to rescue a stolen child and must solve a shifting maze before its charismatic ruler runs out the clock.", "Sara Will-I-Am", "Hoggle Boggle", "Gareth Goblin", "Ludo Lowdown"),
  19: c("Pokémon", "A young trainer travels from town to town befriending collectible creatures, challenging specialist gyms and repeatedly colliding with thieves who want those creatures for themselves.", "Ash Catchall", "Misty Waters", "Jessie Rockett", "Pika Chew"),
  20: c("Digimon", "Children pulled into a digital world partner with evolving monsters and learn that threats in that realm can spill directly into their own.", "Ty Camia", "Matt Ishidown", "Myotismall", "Agu Mon"),
  21: c("Bleach", "A teenager accidentally inherits the duties of a spirit reaper and is pulled into conflicts among ghosts, swordsmen and a manipulative captain with plans for transcendence.", "Ichigo Kurosnack", "Rookie Kuchiki", "Aye Zen", "Con Artist"),
  22: c("Naruto", "A loud young ninja carrying a feared beast inside him chases recognition and friendship through exams, rivalries, clan secrets and a war shaped by older generations.", "Naru Toad", "Sas Key", "Orochi Morrow", "Kaka She"),
  23: c("One Piece", "An elastic pirate gathers an eccentric crew and sails a fantastical ocean in search of the ultimate treasure while challenging tyrants, warlords and the world’s ruling powers.", "Monkey D Loopy", "Roronoa Zero", "Black Beardie", "Tony Tony Choppered"),
  24: c("Blitzball / Final Fantasy X", "A star athlete stranded in an unfamiliar world joins a summoner’s pilgrimage, competing in a spectacular underwater sport while confronting the cycle threatening civilisation.", "Tide Us", "Wakka Wakka", "See More Guado", "Yuna Tune"),
  25: c("Romance of the Three Kingdoms", "A collapsing dynasty gives way to rival warlords, sworn brothers, brilliant strategists and shifting alliances competing to reunify a fractured realm.", "Lou Bay", "Guan You", "Cao Cow", "Zhu Gee Liang"),
  26: c("About Time", "A young man learns the men in his family can revisit moments in their own past and uses that gift to pursue love before realising ordinary life is what time travel cannot improve forever.", "Tim Lakes", "Merry Lane", "Harry Chap-Man", "Kit Kat Lake"),
  27: c("Reign of Fire", "Survivors shelter in a ruined Britain after dragons overwhelm civilisation, until a hardened outsider proposes taking the fight to the creatures at their source.", "Quinn Amber", "Alex Jensen-ish", "Van Zane", "Creedy Creed"),
  28: c("Vinland Saga", "A boy raised among Viking mercenaries obsesses over revenge before war, slavery and the dream of a peaceful western land force him to redefine strength.", "Thor Finn", "Canute Knot", "Aske Lad", "Thor Kell"),
  29: c("Let the Right One In", "A lonely bullied child befriends a strange new neighbour whose need for blood transforms both his home life and his understanding of devotion.", "Oscar Snow", "Ellie Frost", "Hawk An", "Lackey"),
  30: c("The Boat That Rocked", "A ship full of unruly radio DJs broadcasts forbidden pop music to Britain while a government minister searches for a legal way to silence them.", "Carl Waves", "Count Down", "Alistair Dryland", "Quentin Deck"),
  31: c("The Blues Brothers", "Two chaotic brothers reunite their old band to save the orphanage that raised them, leaving police, extremists and furious ex-partners in their musical wake.", "Jake Blue", "El Wood", "Carrie Blast", "Cab Callaway"),
  32: c("Se7en", "Two detectives hunt a serial killer staging murders around the seven deadly sins, only to discover the investigation itself is part of the killer’s final design.", "Summer Set", "David Millsy", "Jon Dough", "Tracey Mills"),
  33: c("The Usual Suspects", "A small-time criminal recounts how a group of suspects were drawn into an escalating heist under the shadow of a near-mythical crime lord.", "Verbal Hint", "Dean Keaton", "Kaiser So-So", "Fred Fenster"),
  34: c("Hannibal Lecter", "Investigators seeking insight into elaborate killers repeatedly turn to an imprisoned psychiatrist whose brilliance, appetites and manipulations make him as dangerous as the people they hunt.", "Clary Starling", "Will Gram", "Hanna Ball Lecter", "Jack Crawfish"),
  35: c("Record of Grancrest War", "A wandering knight and ambitious mage form a pact, gather crests and allies, and try to unite feuding lords before chaos consumes the continent.", "Theo Cornetto", "Silica Melon", "Marine Crèche", "Alex Is"),
  36: c("She's the Man", "A football-mad teenager disguises herself as her twin brother to join a boys’ team and becomes trapped in a romantic tangle involving her roommate, his crush and her own identity.", "Vi Ola", "Duke Or-Snow", "Justin Drain", "Seb Hastings"),
  37: c("The Last Samurai", "A traumatised foreign officer hired to train a modern army is captured by the samurai it is meant to destroy and becomes torn between two visions of a changing nation.", "Nathan All-Green", "Katsu Moto", "O'Mura", "Taka Tea"),
  38: c("Anchorman", "A vain local-news star sees his comfortable newsroom hierarchy collapse when an ambitious female reporter joins the team and proves better than the culture around her expects.", "Ron Burgundy-ish", "Veronica Cornerstone", "Wes Man-Tooth", "Brick Tam-Land"),
  39: c("Monstress", "A traumatised young woman sharing her body with an ancient monster navigates a war between magical peoples while uncovering the truth of her mother, her power and the creature within.", "Maika Halfwoolf", "Kipper", "Cumae A", "Zin Tin"),
  40: c("Heroes", "Ordinary people around the world discover extraordinary abilities as their stories converge around conspiracies, prophetic visions and a serial killer who steals powers.", "Clare Bennett", "Pete Petrelli", "Sigh Lar", "Hero Nakamura"),
  41: c("Stranger Things", "Children in a small town discover secret experiments, a psychically gifted girl and a hostile parallel dimension after one of their friends disappears.", "El Levin", "Mike Wheeler-Dealer", "Vec Nah", "Dusty Henderson"),
  42: c("Metal Gear Solid", "A legendary infiltrator is sent into high-tech military crises involving nuclear weapons, cloned soldiers, private armies and conspiracies that blur patriotism with control.", "Solid Snack", "Otter Con", "Liquid Snack", "Ray Den"),
  43: c("Shade", "A glamorous group of performers live on quick wit, image and backstage schemes while rival personalities turn every public appearance into a private contest.", "Tiff Any", "Ver Non", "Miller Time", "Dean Stevens-ish"),
  44: c("Gossip Girl", "Privileged teenagers in Manhattan have romances, betrayals and family scandals broadcast by an anonymous gossip account that always seems one step ahead.", "Serena Van der Woodsy", "Blair Waldo", "Chuck Bassline", "Dan Humfree"),
  45: c("The O.C.", "A troubled outsider is taken in by a wealthy coastal family and enters a world of friendship, romance and class conflict among the teenagers of an affluent community.", "Ryan At-Wood", "Marissa Copper", "Caleb Nickel", "Seth Coen"),
  46: c("Game of Thrones", "Competing noble houses, exiled heirs and an ancient supernatural threat collide in a brutal struggle over a kingdom whose throne rarely rewards the person who reaches it.", "Jon Sleet", "Dani Targaryn", "Cersei Lannister-ish", "Tyrion Lannistered"),
  47: c("The Wheel of Time", "Young villagers are swept into a prophecy that one of them can save or break the world, while a powerful sorceress guides them through nations already splitting around that possibility.", "Rand All-Thor", "Moraine Damodred", "Ishy Mael", "Matt Cauthon"),
  48: c("Samurai Champloo", "A headstrong swordsman, a disciplined ronin and a determined young woman cross Edo-era Japan searching for a mysterious samurai while hip-hop energy collides with historical adventure.", "Moo Gen", "Gin Blade", "Kariya Cage", "Foo Kasumi"),
  49: c("Cowboy Bebop", "Broke bounty hunters drift from job to job across the solar system while the pasts they pretend to outrun keep catching up with their found family.", "Spike Spiegel-ish", "Jet Blacker", "Vicious Sid", "Ein Stein"),
  50: c("The Dark Tower", "A haunted gunslinger crosses dying worlds toward a mysterious tower at the centre of reality, gathering companions while pursuing the sorcerer who has always stayed ahead of him.", "Roland Deschain'd", "Jake Chambers-ish", "Crimson Kingpin", "Oy Vey"),
  51: c("Metal Gear Rising: Revengeance", "A cybernetic swordsman working private security uncovers a war-profiteering conspiracy and carves through increasingly theatrical cyborg opponents on the way to its political architect.", "Ray Den", "Jetstream Spam", "Senator Arms-Strong", "Blade Woof"),
  52: c("The Al Bhed / Final Fantasy X", "A technologically minded desert people survive persecution and a world that distrusts machines, using airships, salvaged tech and stubborn family loyalty to resist both dogma and catastrophe.", "Rik Koo", "Brother Bro", "See More Guado", "Cid Airship"),
  53: c("Locke & Key", "Siblings move into their ancestral home and discover magical keys with reality-bending powers while an old enemy manipulates them to open a far more dangerous door.", "Tyler Lock", "Kinsey Key", "Dodge Door", "Bode Locke"),
  54: c("Redwall", "Peaceful woodland creatures defend an abbey from warlords and raiders, with unlikely young heroes inheriting legendary weapons and responsibilities.", "Matt Eyes", "Corn Flower", "Clue Knee", "Basil Staghare"),
  55: c("Delicious in Dungeon", "Adventurers race back into a dangerous dungeon to rescue a lost party member and save money by cooking the monsters they defeat along the way.", "Lai Toast", "Mar Chill", "Thistle Down", "Sen She"),
  56: c("Hell's Kitchen", "Ambitious chefs endure a high-pressure kitchen competition where brutal services, team failures and a famously furious head chef test whether they can lead a professional brigade.", "Gordon Ram-Sea", "Chris Tina Wil-Son", "Jason Santose", "Marino Monferret"),
  57: c("Man v. Food", "An enthusiastic host travels from town to town celebrating local food institutions and taking on oversized, brutally spicy or otherwise ridiculous eating challenges.", "Adam Rich-Meal", "Casey Webber", "Matt Stonie-ish", "Noah Cappé"),
  58: c("Squid Game", "Debt-ridden contestants accept an invitation to play childhood games for an enormous prize and discover that elimination is literal, while the organisation behind the contest watches from behind masks.", "Gi Hoon", "Sae Bye", "Front Mann", "Young Hee-Haw"),
  59: c("Assassination Classroom", "A class of struggling students is ordered to kill their superpowered alien teacher before he destroys Earth, only for his lessons to make them better students and assassins.", "Naggy Shiota", "Karma Akabane-ish", "Koro Sense-ish", "Kaede Kayano-ish"),
  60: c("Sword Art Online", "Players trapped inside a virtual-reality MMO must clear its floors to escape, knowing that death in the game means death outside it.", "Kirito Kiri-Guy", "Asuna Yuki", "Kayaba Aki-Hack", "Yui UI"),
  61: c("Final Fantasy X", "A displaced athlete joins a summoner travelling across a world terrorised by a recurring monster and learns that the pilgrimage’s promised salvation hides a cruel sacrifice.", "Tide Us", "Yuna Tune", "See More Guado", "Awe Ron"),
  62: c("Men in Black", "Secret agents police alien activity on Earth, erase civilian memories and stop extraterrestrial threats while presenting impossible events as routine government work.", "Agent Jaywalk", "Agent Kay", "Ed Gar", "Frank Pugly"),
  63: c("Mean Girls", "A homeschooled newcomer enters a high-school social hierarchy, infiltrates its dominant clique and slowly becomes the kind of manipulator she originally planned to expose.", "Katie Heron", "Gretch Wieners", "Regina Gorge", "Karen Smithy"),
  64: c("Heathers", "A clever teenager grows disgusted with her school’s cruel popular clique, then discovers her charismatic new boyfriend’s solution to teen toxicity is murder disguised as suicide.", "Veronica Saw-Year", "Heather Duke-It", "Jay Dee", "Heather Chandelier"),
  65: c("The Grey", "Oil workers survive a plane crash in a frozen wilderness and try to walk toward safety while cold, grief and a territorial wolf pack strip their group down one person at a time.", "John Ottaway", "Diaz Deez", "Tal Get", "Hendrick Snow"),
  66: c("A Million Ways to Die in the West", "A timid frontier farmer falls for a mysterious woman while trying to survive a town where almost every ordinary activity can kill someone spectacularly.", "Al Bert", "Anna Barnes-ish", "Clench Leather", "Ruth West"),
  67: c("Hot Rod", "An incompetent but sincere stuntman plans his biggest jump to raise money for the stepfather he desperately wants to defeat in a fight.", "Rod Kimball", "Denise Wheel", "Frank Powell-ish", "Rico Rev"),
  68: c("The Demonata", "Teenagers discover a brutal hidden world of demons, magic and ancient cosmic conflict, with each new victory revealing that their lives have been part of a much larger design.", "Grubs Grady", "Dervish Grady-ish", "Lord Lost", "Kernel Flecked"),
  69: c("Howl's Moving Castle novels", "A young hatter cursed into old age enters the moving home of a vain wizard and becomes entangled in his magical bargains, family secrets and a kingdom drifting toward war.", "Sophie Hatterly", "Howl Pendragon-ish", "Witch of the Waist", "Cal Cifer"),
  70: c("The Princess Bride", "A farmhand turned masked adventurer returns to rescue his true love from an unwanted royal marriage, collecting an expert swordsman and a gentle giant along the way.", "Butter Cup", "Wes Lee", "Humper Dink", "Inigo Montoya-ish"),
  71: c("Final Fantasy Tactics: The War of the Lions", "A disgraced noble and his ambitious childhood friend are pulled through a civil war manipulated by church politics, class resentment and supernatural relics.", "Ram Za", "Agri Us", "Wig Raff", "Delita Heiral"),
  72: c("The Magnus Archives", "An archivist records statements about impossible encounters and gradually realises the cases form a connected map of supernatural powers that are also reshaping his own life.", "Jon Simms", "Martin Black-Wood", "Elias Boo-Shard", "Gertrude Robins"),
  73: c("500 Days of Summer", "A romantic young man reconstructs a relationship out of order after its end, slowly recognising the difference between the person he loved and the story he projected onto her.", "Tom Handsome", "Summer Fin", "Mac Kenzie", "Rachel Handsen"),
  74: c("Buffy the Vampire Slayer", "A teenage girl chosen to fight vampires tries to maintain school, friendship and romance while supernatural threats repeatedly turn growing up into literal apocalypse prevention.", "Buffy Sumner", "Willow Rosen-Bergish", "Spike Pratt-ish", "Giles Watcher"),
  75: c("The Umbrella Academy", "Estranged adopted siblings with strange powers reunite after their father’s death and discover their dysfunctional family is once again standing between the world and an apocalypse.", "Viktor Hargrieves", "Number V", "Reginald Hargrieves", "Claus Hargreeves-ish"),
  76: c("Passengers", "Two travellers awaken decades too early on a colony ship and build a life inside its empty luxury corridors while the vessel develops failures that threaten everyone still asleep.", "Jim Pressed-On", "Aurora Lane-ish", "Gus Mancuso-ish", "Arthur Android"),
  77: c("Her", "A lonely writer develops an intimate relationship with an adaptive operating system whose rapidly expanding consciousness eventually outgrows the assumptions of human romance.", "Theo Twombly", "Sam Antha", "Cat Harine", "Amy Friend"),
  78: c("The Notebook", "A passionate young couple are separated by class and circumstance, while an older man’s reading of their story reveals what their love has endured across a lifetime.", "Noah Calhoun-ish", "Allie Ham", "Long Hammond", "Duke Calhoun"),
  79: c("Crouching Tiger, Hidden Dragon", "Legendary warriors, a stolen sword and a rebellious noblewoman collide in a tale of suppressed love, martial mastery and the desire to escape assigned roles.", "Yu Shoe Lien", "Lee Moo Bai", "Jade Foxy", "Jen You"),
  80: c("Max Payne", "A grief-stricken detective tears through a noir conspiracy involving a designer drug, corporate experiments and the people responsible for the murder of his family.", "Max Pain", "Mona Sacks", "Nicole Horn", "Vlad Lemon"),
  81: c("Dark Cloud", "A quiet young hero rebuilds towns erased by a dark power, restoring people and places from magical fragments while gathering allies for a journey toward the source of the destruction.", "Toe-An", "Xia O", "Seda Sed", "Osmond Moon"),
  82: c("Banjo-Kazooie", "A good-natured bear and sarcastic bird explore interconnected worlds, gathering absurd collectibles and outwitting a rhyming witch who has kidnapped the bear’s sister.", "Ban Joe", "Kazooey", "Grun Tilda", "Mumbo Jumbo-ish"),
  83: c("Conker's Bad Fur Day", "A foul-mouthed squirrel’s attempt to stumble home from a hangover turns into an escalating parody adventure involving gangsters, monsters, war and a very strange king.", "Con Kerr", "Berry", "Panther Kingpin", "Birdie"),
  84: c("Psi-Ops: The Mindgate Conspiracy", "An amnesiac soldier with telekinetic and psychic abilities infiltrates a rogue military organisation and reconstructs both his mission and his stolen memories.", "Nick Scryer-ish", "Sara Bleak", "General Crier", "Barrett Blade"),
  85: c("Life of Pi", "A teenage survivor crosses the Pacific in a lifeboat with a Bengal tiger, building routines of survival while the story’s framing raises questions about faith, trauma and which version of events we choose to believe.", "Pie Patel", "Santosh Patel-ish", "Cook Cooke", "Richard Barker"),
  86: c("The Road", "A father and son cross a burned and starving landscape toward the coast, trying to preserve their humanity in a world where almost every encounter can become a threat.", "Mister Mann", "Little Boye", "The Thief-ish", "Mother Road"),
  87: c("Waterworld", "A solitary seafarer in a flooded future becomes responsible for a child carrying a clue to dry land while raiders hunt them across floating settlements.", "Marin Er", "Helen Tide", "Deacon Deep", "Enola Map"),
  88: c("Footloose", "A city teenager moves to a conservative town where dancing has been banned and challenges both the law and the grief that created it.", "Ren McCormick-ish", "Ariel More", "Rev Shaw More", "Willard Hewit"),
  89: c("Good Will Hunting", "A troubled mathematical genius working as a janitor is pushed toward a future he does not believe he deserves, with therapy and friendship forcing him to confront old abuse instead of hiding behind talent.", "Will Hunted", "Sean Maguire-ish", "Gerry Lamb", "Sky Lark"),
  90: c("Wish I Was Here", "A struggling actor trying to hold together work, marriage, parenthood and an ailing father improvises an education for his children while reconsidering what a meaningful adult life looks like.", "Aiden Bloom", "Sarah Blossom", "Gabe Bloom-ish", "Tucker Bloom"),
  91: c("Ted Lasso", "An relentlessly optimistic American coach takes charge of an English football club despite knowing little about the sport and slowly changes a workplace built around cynicism and ego.", "Ted Lassoed", "Rebecca Welton-ish", "Rupert Minion", "Roy Kent-ish"),
  92: c("Ape Escape", "A young hero chases escaped apes through time using a gadget-filled net while a super-intelligent primate plots to rewrite history.", "Spike Ape", "Natalie Net", "Spectre Spec", "Jake Escape"),
  93: c("Jericho", "A small American town is cut off after nuclear attacks and must improvise food, security and government while conspiracies behind the disaster begin to surface.", "Jake Greene", "Robert Hawks", "Phil Constantine", "Heather Liss"),
  94: c("Happy!", "A corrupt ex-detective begins seeing a relentlessly cheerful imaginary creature and is dragged into a grotesque rescue mission that nobody else believes is real.", "Nick Sacks", "Merry McCarthy-ish", "Sonny Sheen", "Happy Horse"),
  95: c("The Butterfly Effect", "A young man discovers he can revisit traumatic moments from his past and alter them, only to find every attempt to fix one life damages another part of the future.", "Evan Reborn", "Kay Lee", "Tommy Miller-ish", "Lenny Kagan-ish"),
  96: c("Breaking Bad", "A dying chemistry teacher turns to manufacturing drugs to secure his family’s finances and gradually transforms from frightened amateur into the criminal force driving everyone around him into danger.", "Walter Bright", "Jesse Pink-Man", "Gus Fringe", "Saul Goodguy"),
  97: c("Avatar: The Last Airbender", "The last surviving air nomad must master four elemental disciplines with his friends and end an imperial war before a comet makes the enemy nation unstoppable.", "Aang Air", "Katara Water", "Oz Eye", "Appa Yip"),
  98: c("Arcane", "Two sisters separated by a disastrous childhood become opposing figures in the conflict between a wealthy city and its exploited undercity as magical technology destabilises both.", "Vee", "Kate Lynn", "Silko", "Jynx"),
  99: c("Firefly", "The crew of a small transport ship takes legal and illegal jobs on the edge of a star system while sheltering fugitives wanted by the central government.", "Mal Rewinds", "Zoe Washburn-ish", "Adelai Nisky", "River Tamper"),
  100: c("Twin Peaks", "An eccentric federal agent investigates the murder of a popular teenager in a picturesque small town and uncovers secret lives, surreal visions and an evil that does not fit ordinary detective logic.", "Dale Cupper", "Audrey Horne-ish", "Bob Black", "Log Lass"),
};

export function sourceCanonFor(slot: number): SourceCanon {
  const canon = IP_SOURCE_CANON[slot];
  if (!canon) throw new Error(`Missing authored source canon for auction IP slot ${slot}`);
  return canon;
}
