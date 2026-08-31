# Kirameki Studio — Anime Studio Tycoon

A game-dev-story-style anime studio tycoon. Plan shows, cast 136 characters
(40 leads, 32 supporting, 32 pets/mascots, 32 villains), pop the point bubbles
your staff make, discover secret genre combos and cast chemistry by
experimenting, and compete for the London Anime Awards against rival studios
with pun-titled anime.

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
release builds, icons and signing). The app id is `com.kirameki.studio`.

### Build via GitHub Actions

A ready-made workflow lives at `.github/workflows/apk.yml` (not committed —
the sandbox bot cannot push workflow files). Drop it into the repo and it
builds the debug APK on every push and on manual dispatch, uploading it as
the `kirameki-studio-apk` artifact.

## Project layout

- `src/engine/` — data (cast, genres, arcs, rivals), state (calendar, payouts,
  awards), scoring (reviews, revenue, combos, chemistry)
- `src/components/` — Title, Office (animated GDS-style scene + management),
  Create (planning + casting), Produce / ProductionFloor (bubble mini-game),
  ContractJob, Release (premiere), GameOver
- `public/img/` — environment art and character sheets (2x2 portrait grids)
- `android/` — generated Capacitor Android project (regenerate with
  `npm run apk:add` if deleted)
