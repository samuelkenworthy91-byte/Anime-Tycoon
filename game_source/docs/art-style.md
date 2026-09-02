# Cast art bible & rework pipeline

## House style (post-"wit pass")

Prompts must render **painterly 2D anime key art in the vein of Wit Studio's
Attack on Titan era**. Distilled from style research:

- Thick, confident contour lines with variable weight; subtly sketch-textured edges
- Bold block cel shading; deep, shadowed eye sockets for drama; hyper-detailed eyes
- Weathered, earthy, filmic palette — greys, dust, olive, off-white — with ONE
  strong accent colour per character
- Luminous, clouded skies / textured environment backdrops; strong warm rim light
- Slightly stylised facial anatomy (approx. Wit: softened seinen, not chibi)
- Hair carries strong streaky highlights; costumes are weathered, tactile
- Never any rendered text/labels inside the artwork

Stem used verbatim in sheet prompts:

> in the painterly 2D anime key-art style of Wit Studio's Attack on Titan era:
> thick confident contour lines, bold block cel shading, weathered earthy
> palette dominated by greys, dust and olive with one strong accent colour per
> panel, luminous oversky behind each character, subtle sketch-textured line
> edges, dramatic warm rim light, highly detailed faces with shadowed eyes,
> muted filmic grading; NO text or lettering anywhere

## Sheet pipeline (6 per sheet)

1. Generate ONE image containing exactly six equal rectangular panels,
   3 columns x 2 rows, thin gutters, one bust portrait per panel.
   Panel order in the prompt is the canonical identity mapping
   (top-left -> top-middle -> top-right -> bottom-left -> ...).
2. QA-view the generated sheet; if the model reordered characters, fix the
   identity mapping in the split script, not the files.
3. Split into cells (width/3 x height/2, small inset to dodge gutter bleed),
   downscale longest side to 768px, save JPG q88 under
   `public/img/cast4/<member-id>.jpg`.
4. Point the member's `img` at the new path and drop its `pos` (Portrait
   renders full-frame when pos is absent).
5. `assets.test.ts` enforces the files exist; grid-montage the splits for the
   final visual check before committing.

## Rework queue (60 slots, affinity-affected first)

| Sheet | Members | Status / Why |
|---|---|---|
| 1 | sen, zuri, ash, kuro, tsubasa, itsuki | **DONE (turn 11)** — wave-two protags; affinities grew. Wired to `img/cast4/*.jpg`. |
| 2 | airi, rei, suzume, leo, shiori, daichi | **DONE (turn 11)** — idol x mecha stage pilot, supernatural mecha pilot, foxfire maiden, skater, wispkeeper, military Earthbreaker. Wired. |
| 3 | sora*, mira*, n_chisato**, rin, jin, taro | **DONE (turn 11)** — space skyblade, nebula idol, striker×racing, racer sprinter, ghost driver, wok-chef. Wired to `img/cast4/*.jpg`. |
| 4 | hikari**, emi**, kenta, akira, renji, n_ryoko | **DONE (turn 12)** — re-slated (zuri shipped). magical-girl moon, comedy boxer, cottage-witch tea, neon-ronin noir, silent-snow noir, moonlight mechanic. Wired. |
| 5 | s_boone, s_peko, s_reina, s_amber, s_kanna, s_alfred | **DONE (turn 12)** — wave-two secondaries: grease mentor, hype idol, mil-noir president, spirit-lantern traveller, one-eyed bodyguard, noir butler. Wired. |
| 6 | s_tobi, s_maki, s_haruto, s_takeshi, s_gen, s_chiaki | **DONE (turn 13)** — space-noir reporter, racing/military rival ace, streetwise racer cat (solo fix: model humanised him in sheet; regenerated as standalone cat tile), drill coach, lazy ops genius, spectral shadow transfer. Wired. |
| 7 | s_shin, s_aoi, s_kiki, s_sosuke, s_koko, s_okada | **DONE (turn 13)** — noir blob alien, rooftop storm weather girl, banana-peel klutz, chrome butler wink, cauldron mystic cat, rice-pot sensei. Wired. |
| 8 | v_tempest, v_kairos, v_plague, v_moth, v_nocturne, v_gravemark | **DONE (turn 13)** — storm-lord racer, noir CEO star-boardroom, plague flask, luring moth matron, violet-moon shadow queen, cracked-plate warlord. Wired. |
| 9 | v_amethyst, v_harlequin, v_onikage, v_hollowchild, v_bioform, v_kurogane | **DONE (turn 13)** — shard-crown empress, echo-laugh jester, cracked oni half-mask, galaxy-gown void empress, silo experiment, molten-seam iron tyrant. Wired. |
| 10 | p_pudding, p_nitro, p_stellar, p_loader, p_baku, p_hachi | **DONE (turn 13)** — toque blob dog, pit ferret, comet-soup kitten, mess-tin bulldog, crescent dream-eater, garrison-cap bee. Wired. |

\* still to be finalised against their current tile art
\** optional — dedicated art already exists; only if budget allows

## Identity anchors (must survive the rework)

sen = ash-silver short hair + cheek scar + dark high-collar coat + katana;
zuri = curly auburn hair + brass goggles + tank top + tools;
ash = silver-white hair + elf ears + green ranger cloak + bow;
kuro = black undercut + crimson coat + neon implants;
tsubasa = teal hair + flight goggles + fur-collared flight jacket + wrench;
itsuki = warm brown hair + rolled sleeves + fountain pen + library.
