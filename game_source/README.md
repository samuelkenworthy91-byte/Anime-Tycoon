# Anime Runner

A game-dev-story-style anime studio tycoon. Plan shows, cast 186 characters
(54 leads, 44 supporting, 43 pets/mascots, 45 villains — every genre and all
190 genre pairs castable; see docs/cast-coverage.md), pop the point bubbles
your staff make, discover secret genre combos and cast chemistry by
experimenting, and compete for the London Anime Awards.

Six persistent rival studios (Toe-i Animation, Sunnyrise, Boneworks, Kyo-Hani,
Madcap House, Turtle Line) run on the same 48-week industry calendar you do.
Each has its own personality — a blockbuster action house, a sakuga atelier, an
experimental studio, a prestige drama house, a high-volume mill and a
romance/idol house — plus money/strength, reputation, preferred genres, an
in-flight slate, franchises and momentum. They premiere shows week by week,
flood genre saturation, chase Anime of the Year, poach your elite staff (you
can poach their notables back), drift up and down a shared ranking table, build
rivalries with you, and — rarely — decline, restructure, get acquired, collapse
and return under new management.

Year 12 ends the campaign — not the studio. A career retrospective scores the
twelve years into a rank (Failed Studio → Anime Empire), then the save opens
into **Dynasty Mode**: an endless run where the industry gets hungrier, staff
retire into mentoring legacies, enormous empire investments sink your money, and
the all-time industry records are fought over against the rivals.

## Run the game

```bash
npm install
npm run dev        # dev server with hot reload
npm run build      # production build -> dist/index.html (single file + img/)
npm run preview    # serve the production build
```

## Controls

- Click / tap bubbles on the production floor — keys `1`–`7` pop the top
  bubble of each desk, `SPACE` grabs the top bubble on screen
- `ENTER` advances through create/release flows
- `M` mute, `ESC`/`P` pause

## Reviews & discovery

Four critics score each show out of 10 (40 total). Reviews are relative to
your studio's own all-time best, Game Dev Tycoon style: the first show aims
at a preset bar, and every new best raises the target ~10%, so the Hall of
Fame (32/40) stays hard and 40/40 is effectively unreachable. What the genre
wants from your sliders, which casts click, and which arc pairings amplify
each other are all hidden until you ship and read the post-release breakdown.

## Time

One in-game day ≈ 2 real minutes while you're in the office. Seven days =
one week: wages/rent are charged every 4 weeks and show revenue lands over a
12-week broadcast — a slow build, a decisive peak, then a long tail of
re-runs and word of mouth, like the Game Dev Tycoon sales chart.

## Showrunners

Four founding showrunners open a studio, each with a painted chibi model who
walks your office floor and a matching head portrait:

- **Genji Ashida** — Steady Hand: bubbles float longer, editing notes rarer.
- **Akari Natsume** — Vision: dramatic arcs hit harder, no review below 3/10.
- **Haruto Mori** — Golden Rolodex: contract jobs pay +40%, commission advances +30%.
- **Sana Kobayashi** — Buzz Engine: shows open with +10 hype, marketing runs hot (+50% hype).

## Auto manage & studio events

From Sakuga Tower onward you can hand a show's milestone sprints to a
department head (AUTO MANAGE). Delegated quality scales with the head's
own skill, the assigned team, your facilities, morale and the project's
difficulty — and always lands below what a well-played hands-on sprint
reaches. When a deadline is threatened, a production is drowning in
issues, or a major film hits a critical stage, the show pauses and asks
you to step in (or tell the crew to keep going).

The industry also throws real dilemmas at you — a trailer going viral, an
episode leak, a cast suddenly in demand, a fan backlash. Each offers 2–3
responses with concrete trade-offs, rolled on a slow cadence so they feel
like an occasion rather than a weekly nag.

## Build the Android APK

The repo is set up with [Capacitor](https://capacitorjs.com). You need:

- Node 18+
- Android Studio (or the Android SDK + platform-tools)
- JDK 17

Then:

```bash
npm install
npm run apk:sync    # builds the web app and copies it into the android project
npm run apk:build   # compiles the debug APK
```

The APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`.
Install it on a device/emulator with:

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

`npm run apk:open` opens the android project in Android Studio (useful for
release builds, icons and signing). The app id is `com.kirameki.studio` (package id; the launcher name is **Anime Runner**).

### Build via GitHub Actions

A ready-made workflow lives at `.github/workflows/apk.yml` (not committed —
the sandbox bot cannot push workflow files). Drop it into the repo and it
builds the debug APK on every push and on manual dispatch, uploading it as
the `kirameki-studio-apk` artifact.

## Project layout

- `src/engine/` — data (cast, genres, arcs), rivals (persistent rival studios,
  rankings, rivalries, poaching), state (calendar, payouts, awards), scoring
  (reviews, revenue, combos, chemistry), legacy (career evaluation, dynasty
  difficulty, empire investments, mentoring, industry records)
- `src/components/` — Title, Office (animated GDS-style scene + management),
  Create (planning + casting), Produce / ProductionFloor (bubble mini-game),
  ContractJob, Release (premiere), Retrospective (year-12 evaluation),
  Dynasty (empire investments/records/legacies), GameOver
- `public/img/` — environment art and character sheets (2x2 portrait grids)
- `src/engine/poster.ts` + `src/components/Poster.tsx` — the key-visual
  poster system. `posterDesign(draft)` is the pure design function: it picks
  a genre-appropriate display font for the title (Anton for shonen/sports/
  racing, Black Ops One for military, Chakra Petch for mecha/cyber/space,
  Comfortaa for shojo/idol/magical, Cinzel for fantasy/isekai/supernatural,
  Playfair Display for romance/noir/mystery, Lilita One for slice/comedy/
  cooking, Creepster for horror — each with its own casing, tracking, skew
  and genre-coloured glow), word-balances the title, and decides the extras:
  a "STUDIO PRESENTS" / "SEASON n — THE CONTINUING STORY" kicker, a
  SEASON/MOVIE/OVA ribbon tab, the cinema-style billing block, per-genre
  decorations (speedline bursts, petals, checker strips, reticle corners,
  runes, drips, steam…), gold laurels for hall-of-famers and a deterministic
  paper tilt. `Poster.tsx` renders two variants: the full premiere poster
  (Release screen) and the taped mini wall tiles on the office stage. The
  hall-of-fame list rows also render in their genre font.
- `src/fonts.css` — all fonts bundled (OFL, via @fontsource, latin woff2):
  the eight poster display families plus the UI faces (Bricolage Grotesque,
  Space Grotesk, DotGothic16). vite-plugin-singlefile base64-inlines them
  into dist/index.html, so the build has zero CDN dependencies and genre
  title faces render offline and inside the APK WebView.
- `tools/strip-fringe.py` — art pipeline: after generating a new
  `sprite-*.png` / `portrait-*.png`, run
  `python tools/strip-fringe.py public/img/sprite-new.png`
  (Pillow). It border-floods any near-white studio backdrop, dissolves the
  partial-alpha ghost rim (source of the "fuzzy cutout halo" on dark
  scenes), and autotrims stray catslide padding.
  `--kill-white-above N` also deletes enclosed neutral-white islands
  bigger than N px (e.g. backdrop sealed between twin-tails). The script
  is idempotent — re-running it reports "no change". New arrivals keep
  sibling proportions (~640 px tall) so every walker matches the office
  scene scale; a vitest suite (`src/engine/__tests__/assets.test.ts`)
  fails CI if any referenced portrait/sprite is missing from the build.
- `android/` — generated Capacitor Android project (regenerate with
  `npm run apk:add` if deleted)
