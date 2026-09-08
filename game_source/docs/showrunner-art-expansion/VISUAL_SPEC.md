> Historical art approval audit. See INTEGRATION.md for the approved live implementation. Comparison boards and original generation outputs are in the separately delivered approval pack.

# Showrunner expansion: pre-generation visual specification

Audit base: current main `34692db2746df0739c0bbfda0fd4fd63751188c3`.
Child branch: `work/showrunner-art-expansion`. Approval stage only; no live roster, gameplay or public asset replacement.

## Evidence inspected
All 23 numbered worker portrait/sprite pairs (look 6 is Akari), all three named showrunner pairs, all four legacy showrunner cards, and staff-1 through staff-4 sheets were visually reviewed. See live comparison boards and LIVE_ASSET_INVENTORY.csv. Read WORKER_SHOWRUNNER_AUDIT.md, WORKER_SHOWRUNNER_ASSET_AUDIT.csv, ART_STYLE_AUDIT.md, QC_NOTES.md, ASSET_ALLOCATION_SYSTEM.md and both worker manifests; inspected OfficeScene.tsx and the Showrunner interface/roster in data.ts.

The old audit is historical, not current truth: Haruto now has the compact replacement. Worker 13–16 and legacy cards diverge from the strongest workforce anchors. The staff JPGs are environmental portrait sheets, not source masters for the current cutout workforce. No worker/showrunner magenta master or original cutout source sheet was found in this checkout, including art_src. A pixel scan of non-cast PNG/JPG/WebP files found no substantial opaque magenta backgrounds. QC_NOTES documents a magenta-to-RGBA pipeline, but the missing originals prevent verification of its historical exact RGB value. Use the user's explicitly specified #FF00FF for new masters.

## Observed visual rules
- Fine, slightly irregular dark umber contours; exterior line roughly 1–2 px at 640 px height, interior finer. No thick vector border. Paint creates most volume.
- Large rounded cranium, compact cheek/jaw; eyes dark almond/oval with clear upper lids and small restrained glints. Eyes are expressive, not huge glossy irises. Nose is a small wedge/short mark; mouth a tiny asymmetric line. Older faces retain brows, restrained under-eye/cheek lines and simplified stubble.
- Workers 1–10 stand about 3–4 head-heights tall. Short limbs, broad small hands, sturdy shoes and compact torso. Not adult anatomical proportions shrunk to a sprite. Older worker 8 is the useful stockier adult anchor.
- Softly painted, warm paper-like mottling inside skin/hair/fabric; matte ochre, faded indigo, moss, charcoal and cream. Restrained saturation. Broad angular warm shadows with subtle brush transitions, no glossy specular or rim lights. Moderate visible cloth folds and seams; simplify pockets/tools at office scale.
- Upright quiet weight shifts, front/three-quarter faces and torsos, mildly elevated view showing tops of shoes. One clear activity/prop, arms mostly near torso. No action splash-art poses or deep perspective.
- Portraits are cut from the same painting, crown close to the top, face large, shoulders/upper torso exiting the bottom. Workers 1/3/8 are the strongest crop references. Face including hair occupies roughly 65–78% of portrait height; avoid independent portrait redraw.
- Early runtime sprites have variable widths/heights, often alpha touching canvas edges. Current normalized production convention (workers 17–23 and Haruto) is 448×640 RGBA, occupied y=26..627 (602 px), foot baseline 628, with variable silhouette width. Use that documented normalization without stretching anatomy. All new portraits use the current 224×224 RGBA convention (early files vary from 153–224 px wide).
- OfficeScene renders height at 28%, 24%, or 19% of stage height, multiplied by depth 0.82–1.18, then portrait-layout boss 0.95/worker 0.82. Width stays automatic. CSS supplies ground/drop shadows and optional horizontal flipping. Do not paint a ground shadow or floor into the source.
- Generate one spacious full-body master per person with all props/feet visible and flat #FF00FF, no magenta clothing. Preserve source and derive transparent sprite plus portrait from the same pixels.

## Identity direction
Genji/steady: keep swept salt-and-pepper hair, round dark glasses, strong brows, friendly stubble and red/indigo plaid identity; faded indigo chore jacket over plaid and charcoal tee, loose work trousers, worn trainers, small sketchbook/pencil. Japanese veteran about 55; calm craft mentor.
Elliot/operations: English man about 36, pale freckled complexion, short auburn side-part, practical compact build; moss utility jacket, oatmeal knit, charcoal trousers, grey trainers; tabbed schedule notebook/pencil. Focused capable expression.
Freja/franchise: Scandinavian woman about 43, fair cool complexion, ash-blond low knot, thoughtful hooded eyes; straight charcoal modern coat, rust scarf, cream knit, cropped slate trousers and simple ankle boots; slim tabbed portfolio. No fantasy/Nordic costume imagery.
Amara/mentor: Black British woman of Nigerian heritage about 45, deep brown complexion, broad cheekbones, natural coiled updo, warm decisive expression, fuller grounded build; ochre cropped jacket, ink-blue wide-leg trousers, cream top, small brass hoops, notebook held relaxed. No ethnic costume shorthand.
Ravi/research: British Indian man about 31, medium brown complexion, wavy dark hair, light stubble, narrow rectangular glasses; teal technical overshirt, mustard knit, charcoal cuffed trousers and off-white trainers; compact tablet/notebook, headphones around neck. Curious, absorbed, contemporary creative-tech identity.

Stable IDs are reserved in a non-runtime approval manifest only. Ravi's future effect is a research-duration multiplier of 0.75 (projects take 25% less time). No weekly RD grant and no gameplay implementation in this art branch.
