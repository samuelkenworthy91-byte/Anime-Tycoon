# Anime Runner

A game-dev-story-style anime studio tycoon. Plan shows, cast 136 characters
(40 leads, 32 supporting, 32 pets/mascots, 32 villains), pop the point bubbles
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
one week: wages/rent are charged every 4 weeks and show revenue trickles in
week by week over the 8-week broadcast.

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
- `android/` — generated Capacitor Android project (regenerate with
  `npm run apk:add` if deleted)
