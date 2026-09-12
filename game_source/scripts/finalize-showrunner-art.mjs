// Temporary finalizer created by ChatGPT. Reconstructs approved showrunner art package from staged chunks,
// rewrites the four save-stable placeholder archetypes to the approved characters, then self-removes via workflow.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const chunksDir = path.join(root, '.tmp_showrunner_art');
const chunks = fs.readdirSync(chunksDir).filter(f => /^\d\d\.txt$/.test(f)).sort();
if (chunks.length !== 19) throw new Error(`Expected 19 art chunks, found ${chunks.length}`);
const b64 = chunks.map(f => fs.readFileSync(path.join(chunksDir, f), 'utf8').trim()).join('');
const zip = '/tmp/showrunner_art.zip';
fs.writeFileSync(zip, Buffer.from(b64, 'base64'));
execFileSync('unzip', ['-o', zip, '-d', path.dirname(root)], { stdio: 'inherit' });
const expected = [
  'portrait-hype.webp','sprite-hype.webp','portrait-contrarian.webp','sprite-contrarian.webp',
  'portrait-savant.webp','sprite-savant.webp','portrait-trailblazer.webp','sprite-trailblazer.webp',
];
for (const f of expected) {
  const p = path.join(root, 'public/img', f);
  if (!fs.existsSync(p) || fs.statSync(p).size < 5000) throw new Error(`Missing/invalid ${f}`);
}

function replaceIn(file, from, to) {
  const p = path.join(root, file);
  let s = fs.readFileSync(p, 'utf8');
  if (!s.includes(from)) throw new Error(`Pattern not found in ${file}: ${from.slice(0,100)}`);
  s = s.replace(from, to);
  fs.writeFileSync(p, s);
}

replaceIn('src/engine/data.ts',
`  { id: "casting", name: "Keiko Arata", title: "The Casting Director", img: "img/portrait-showrunner-mentor.png", sprite: "img/sprite-showrunner-mentor.png", portrait: "img/portrait-showrunner-mentor.png", perk: "Ensemble Eye — casting contribution +25% and mismatched casting penalties are substantially softened.", artPending: true },
  { id: "festival", name: "Mateo Voss", title: "The Festival Strategist", img: "img/portrait-showrunner-marketer.png", sprite: "img/sprite-showrunner-marketer.png", portrait: "img/portrait-showrunner-marketer.png", perk: "For Your Consideration — player award entries receive +8% craft strength and +10% judged audience reach.", artPending: true },
  { id: "dealmaker", name: "Dalia Haddad", title: "The Rights Broker", img: "img/portrait-showrunner-producer.png", sprite: "img/sprite-showrunner-producer.png", portrait: "img/portrait-showrunner-producer.png", perk: "Deal Heat — completed-show buyers pay 15% more and bidders push harder when you auction a studio-owned IP.", artPending: true },
  { id: "genre", name: "Minseo Park", title: "The Genre Savant", img: "img/portrait-showrunner-research.png", sprite: "img/sprite-showrunner-research.png", portrait: "img/portrait-showrunner-research.png", perk: "Pattern Breaker — good genre pairings hit 30% harder while bad pairings are softened by 30%.", artPending: true },`,
`  { id: "casting", name: "Kai Mercer", title: "The Hype Architect", img: "img/portrait-hype.webp", sprite: "img/sprite-hype.webp", portrait: "img/portrait-hype.webp", perk: "Narrative Momentum — coherent stories turn into fandom: stronger arc contribution and up to 1.5× creator-fan growth when Story leads the finished show." },
  { id: "festival", name: "Soren Vale", title: "The Contrarian", img: "img/portrait-contrarian.webp", sprite: "img/sprite-contrarian.webp", portrait: "img/portrait-contrarian.webp", perk: "Against the Grain — Strange genre blends gain +15% production effectiveness, suffer far less compatibility drag, and keep a full critical ceiling." },
  { id: "dealmaker", name: "Mara Kessler", title: "The Production Savant", img: "img/portrait-savant.webp", sprite: "img/sprite-savant.webp", portrait: "img/portrait-savant.webp", perk: "Engineer’s Eye — every show and licensed IP gets a 20-point slider-range hint even on an unseen blend; near-miss slider penalties are 25% softer." },
  { id: "genre", name: "Rin Vex", title: "The Trailblazer", img: "img/portrait-trailblazer.webp", sprite: "img/sprite-trailblazer.webp", portrait: "img/portrait-trailblazer.webp", perk: "No Blueprint — a genre blend your studio has never released gets +20% production progress, +15% staff contribution and fewer production notes." },`);

replaceIn('src/engine/showrunnerCareer.ts',
`  casting: { story: 78, art: 76, sound: 68 },
  festival: { story: 86, art: 76, sound: 76 },
  dealmaker: { story: 68, art: 70, sound: 80 },
  genre: { story: 88, art: 72, sound: 70 },`,
`  casting: { story: 88, art: 72, sound: 70 },
  festival: { story: 82, art: 78, sound: 74 },
  dealmaker: { story: 74, art: 88, sound: 70 },
  genre: { story: 84, art: 82, sound: 76 },`);

console.log('Approved showrunner art unpacked and identities wired.');
