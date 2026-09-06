# Art style audit — pinned Arena integration

Source branch arena/01a0759f-anime-tycoon, live HEAD 2701f638f614eccce0e58a48f705918570b1f78c. All public images used were verified against the Git blob hashes in its full tree. Visual review covered all 192 runtime cast portraits, worker looks 1–16, all four showrunners (including their legacy cards), and all three office backgrounds. The screenshot referenced in the brief is absent; screenshot comparison remains unavailable. This does not prevent a branch-asset audit, but no screenshot-based conclusion is claimed.

## A. Cast
The runtime portraits are 512 × 512 RGB WebP. Strong examples frame a single human from head to thighs or knees, with hands and props leading a diagonal toward the viewer; mascots occupy a similar fraction of the square despite different anatomical scale. Not every existing crop is equally successful: some props sit too close to the border, some faces are too small, and darker villains lose separation. Copy the successful examples rather than those defects.

The cast uses detailed anime drawing, fine dark contours, painted material modelling, layered hair highlights, fabric folds and environmental bounce light. It is neither a flat vector style nor a blank-background visual-novel bust. Warm skin/key light contrasts with cool blue or violet depth. Each portrait has a specific inhabited setting—hangar, harbour, dojo, studio, snow trail—with quieter distant detail. Faces and the main action stay clearer and brighter than the surroundings. Dynamic does not mean everyone crouches or reaches identically: use pivots, glances, defensive steps, running, careful craft and confident stillness.

New work must preserve these material-rich square compositions, adult human proportions, readable silhouettes, a strong focal face and one distinct gesture. Aim human face height about 18–24% of the square and mascot body height 65–82%; allow sensible species variation. No text, labels, logos or UI. Keep backgrounds character-specific but never depict the hidden genre. Mecha visual machinery requires visible mecha; a hidden mecha affinity never authorises a mech. Samurai uses swords, retainers or feudal duty; Shinobi uses covert action; Martial Arts remains distinct. Nordic is grounded northern maritime or modern life, without compulsory horned helmets or rune magic.

## B. Workers
Primary anchors are sprite-worker-1/2/3/4/5/7/8/9/10.png and their matching portrait-worker files under game_source/public/img/. Warm parchment-like paint texture, soft amber lighting, large expressive eyes and approximately 3–4 heads of height define this group. Modern hoodies, denim, cardigans, lanyards, glasses, sketchbooks and microphones make these studio people. Hair and clothing have softly modelled volume, outlines remain delicate, hands and tools are simple enough for small display. Keep the same character identity between full-body sprite and portrait by cropping the portrait from the approved sprite master.

Preserve the silhouette, warm finish and alpha cutout; no scenery, floor slab, chair, fantasy armour or embedded lettering. Runtime renders sprites by height with a depth multiplier and CSS shadow. Export a consistent 640px sprite canvas height, feet at the bottom inset and 94% occupied body height. Portraits are transparent 224px squares, head and shoulders. Existing files vary in width/height; new canvases should remove that variability without distorting anatomy.

## C. Showrunners
| Entity | Sprite | Portrait | Decision |
|---|---|---|---|
| Genji Ashida / steady | sprite-showrunner-steady.png | portrait-showrunner-steady.png | KEEP: compact grey-haired plaid-shirt artist matches the warm worker language. |
| Akari Natsume / vision | sprite-worker-6.png | portrait-worker-6.png | KEEP: slightly sharper black-clad director, but chibi silhouette and paired identity fit. Preserve live visual identity. |
| Haruto Mori / producer | sprite-showrunner-producer.png | portrait-showrunner-producer.png | REPLACE RECOMMENDED: sprite is unusually tall/thin with a tiny head; portrait is much more realistically mature. Replace as one coherent worker-style pair, keeping silver hair, glasses, suit and assured producer identity. |
| Sana Kobayashi / marketer | sprite-showrunner-marketer.png | portrait-showrunner-marketer.png | WEAK MATCH: brighter eyes and busier badge-covered clothing, but sprite proportions fit the later worker group. KEEP for this replacement scope; do not use as the primary style anchor. |

The legacy showrunner-a/b/c/d.jpg cards are environmental illustration cards rather than office cutouts. KEEP as a separate card format; do not use their full-size anatomy to define office sprites. showrunner-d.jpg has lettering and brand-like patches already present; new art must avoid reproducing that text. The user-reported outlier cannot be confirmed against the absent screenshot; the producer is the strongest observable mismatch in the branch.

## D. Exact reference set
All following paths are relative to game_source/public/.

Cast:
- cast/v2/lead_shonen_01__a1__kai.webp
- cast/v2/lead_shonen_01__a2__rei.webp
- cast/v2/lead_shonen_02__b1__rin.webp
- cast/v2/lead_shonen_03__a3__yuki.webp
- cast/v2/sidekick_shonen_01__a3__s_ichiro.webp
- cast/v2/sidekick_shonen_03__a3__s_maki.webp
- cast/v2/mascot_shonen_01__a4__p_pochi.webp
- cast/v2/mascot_shonen_03__a4__p_pomu.webp
- cast/v2/mascot_shojo_01__a4__p_maru.webp
- cast/v2/villain_shonen_01__b1__v_scuttle.webp
- cast/v2/villain_shonen_03__a2__v_warden.webp
- cast/v2/villain_shojo_03__b1__v_moth.webp

Workers: img/sprite-worker-1.png, img/portrait-worker-1.png, img/sprite-worker-3.png, img/portrait-worker-3.png, img/sprite-worker-4.png, img/portrait-worker-4.png, img/sprite-worker-8.png, img/portrait-worker-8.png.

Showrunners: img/sprite-showrunner-steady.png and img/portrait-showrunner-steady.png for seniority in the worker language; img/sprite-worker-6.png and img/portrait-worker-6.png for director costume finish. Existing producer pair supplies identity only, never proportions.

Workstations: img/bg-office-1.jpg (wood, lamp and drawing tablet); img/bg-office-2.jpg (production monitor and desk); img/bg-office-3.jpg (professional hardware, restrained violet-blue reflections).

## Workstations
OfficeScene.tsx draws a brown desktop and dark monitor/tablet from positioned CSS spans. They are live foreground overlays, distinct from furniture already painted into the room backgrounds. Replace only these foreground visual layers during later Arena integration. Supply three transparent compact desktop assemblies: standard, animation and audio. Use gently elevated three-quarter/front view, warm wood, dark graphite hardware, soft painted highlights and restrained screen glow. No chair or person, no giant full-height furniture, no room backdrop. Export 768 × 512 transparent PNG; object width 94%, baseline at 94% height. Suggested placement is bottom centre over the working sprite, with aspect ratio preserved; exact CSS allocation needs Arena's preview. Keep existing energy bars, movement, click targets, z-order mechanics and production effects unchanged.

## Generation gate
Branch-art audit complete before generation. Revised roster target is 208 new / 400 final, 52 per role, 26 Shonen and 26 Shojo per role. Character generation still requires validated manifest and coverage. Original screenshot validation is explicitly outstanding, not silently marked passed.
