# BATCH-1 SHEET → SLOT ASSIGNMENT (10 sheets × 8 cells, row-major)

Cell order: top row L→R (1–4), bottom row L→R (5–8).
Empty slot = deferred to batch 2 (spares pool absorbs leftovers).
Matches picked by persona first, then genre, then family continuity.

| sheet | filename (attachment order) | slot ids (8, row-major) |
|-------|------------------------------|--------------------------|
| 01 | file_0000000074e481f4820dd09a752e4c22.png | toei_orbitfall, kyo_mapleave, toei_kaijunight, kyo_mapleave2, kyo_thedetective, ttl_moonwaltz, —(sky pirates, defer), —(gothic court, defer) |
| 02 | file_00000000c45082468f7b4ae1aa7813d8.png | sunrise_orbknights3, —(letter romance→kyo_lastletter alt), —(demon knight, defer), kyo_quietsea, —(fox montage, defer), —(rococo tea, defer), toei_steelash?, ttl_velvet2 |
| 03 | file_00000000e68c821096ebfc1533e622a3.png | —(eclipse knight, defer), toei_voltagirl, toei_sparesun, ttl_starfalls→ttl_sparestarfall, kyo_snowcourt, —(bench couple, defer), sunrise_orbknights2, ttl_velvet1 |
| 04 | file_00000000108c8210bb31ea84626fef21.png | sunrise_chrome1, —(roman romance, defer), bones_sparevale, ttl_fantasia, ttl_star1, madcap_easyquest, ttl_twinkle→ttl_neonsymphony, —(red queen, defer) |
| 05 | file_00000000adf481f4a7dacaf20232c541.png | toei_sparezero, —(family slice, defer), —(void seer, defer), —(rose pair, defer), —(wolf squire, defer), kyo_spareharvest, kyo_winters2?, —(lighthouse noir, defer) |
| 06 | file_00000000316c82109fbb1600bbbcc69b.png | —(night biker, defer), ttl_sparepetal?, toei_roninblade, madcap_sparenightout, —(dark agent, defer), —(maple couple, defer), toei_stormcourt, bones_redroom(?) |
| 07 | file_000000003540820abd1e40475ff2b02b.png | toei_mythforge, —(garden couple→ttl_roseduel alt), sunrise_orbknights, —(gold princess→laceparade alt), —(burn glove→sparesun alt), —(desert royals, defer), —(skull biker, defer), —(vampires→bones defer) |
| 08 | file_00000000667882109ae1f5748309ff31.png | toei_apexduel, ttl_star3, —(airship knights→warhorn alt), ttl_star2, toei_sparekaiju?(red jet mech), kyo_winters, —(street gang→sparesun alt2), ttl_laceparade |
| 09 | file_000000009fc0821089f7e6324b6792ca.png | toei_warhorn, kyo_lastletter?, toei_neonsaber, kyo_spareharvest?=window letter — resolve, —(dragon cloud→easyquest alt), kyo_winters2?, sunrise_sentinel, ttl_sparearia? |
| 10 | file_00000000391c8210bbb620a13ec6c50a.png | toei_sparekaiju?, —(white wedding, defer), sunrise_sentinel?=mecha+earth lineup, ttl_roseduel, toei_stormcorsair, kyo_lastletter), kyo_sparearia?, kyo_sparezephyr? |

Final locked mapping will be written into `SHEET_MAP` in `scripts/rivalPosterPack.py`
once the sheet PNGs land in `art_src/rival/external/sheets/`. Any `?`/`alt`
entries get resolved at QA time by re-reading the extracted crops as montages.
