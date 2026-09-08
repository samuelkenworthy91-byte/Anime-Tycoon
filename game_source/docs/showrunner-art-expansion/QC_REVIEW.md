> Historical art approval audit. See INTEGRATION.md for the approved live implementation. Comparison boards and original generation outputs are in the separately delivered approval pack.

# Showrunner art approval review

Base main: 34692db2746df0739c0bbfda0fd4fd63751188c3
Branch: work/showrunner-art-expansion
Status: 10 finished staged assets; user visual approval pending. No live integration.

## Reference comparison
Each new portrait/sprite pair was compared directly with workers 1, 3 and 8 and all four live showrunners (Genji, Akari via worker 6, Haruto, Sana). Additional female identity/rendering anchors: workers 4 and 7. The complete audit also inspected every numbered worker pair and all legacy staff/showrunner cards. Prior Cast V3 generated art was not used.

The QC boards use equal sprite canvas height, preserving each asset's aspect ratio and actual alpha margins. The first comparison layout incorrectly constrained sprite width, making normalized 448-wide canvases appear smaller; this was corrected before final evaluation. Portrait crops were tightened from 51% to 40% of full-body cutout height to match the large head/shoulder framing of the primary workers.

| Character | Review result | Observed variation |
|---|---|---|
| Genji | Ready for user approval | Recognizable swept silver hair, round glasses, brows and stubble. More restrained outlines than old Genji, aligned with worker 8; layered indigo/plaid clothing replaces the plain plaid silhouette. Shoe marking was regenerated away. |
| Elliot | Ready for user approval | Narrower face and freckled pale complexion; compact build comparable to worker 1. Concerned expression and tabbed notebook distinguish operations role. |
| Freja | Ready for user approval | Narrow coat silhouette comparable to worker 4; ash-blond knot and delicate glasses. Coat texture has somewhat larger angular paint patches than worker 4. |
| Amara | Ready for user approval | Deep complexion, natural coiled updo and fuller trouser silhouette distinct from the others. Face construction and fabric finish compare well with workers 3/7. |
| Ravi | Ready for user approval | Rectangular glasses, brown complexion, stubble, headphones and teal knit layers. Compact build comparable to worker 1; same tablet painting retained in both exports. |

The five are cohesive with the selected workforce anchors at small display sizes. Remaining stylistic variation: their fabric paint patches are slightly more angular/contrasty than the softest early workers; this is visible at source resolution. Genji has more facial detail than younger workers, intentionally preserving seniority. Freja has the narrowest silhouette. This is a reference-based judgment, not a claim of an exact brush-for-brush match or of user approval.

## Source and alpha pipeline
Five built-in image-generation full-body masters, plus one targeted Genji shoe revision, produced the artwork. Portraits are crops of their corresponding source painting, not separately generated faces. Original generation outputs are preserved as generated-showrunner-*.png. Their near-magenta background was not numerically exact; source-showrunner-*-magenta.png are the normalized production sources with flat #FF00FF, no floor/shadow, and 123 px top/bottom safety margins on 1024×1536 canvases. Runtime-ready exports have real alpha. Chroma extraction includes edge unmixing and magenta spill cleanup. Reviewed on pale and dark backgrounds after cleanup.

All five sprites: 448×640 RGBA PNG, occupied vertical bounds 26..627, foot baseline 628. All five portraits: 224×224 RGBA PNG, matching head/shoulder crops. The manifest records actual SHA-256 values, bounds and crop coordinates for all ten. All source paintings retain complete hair, feet and props; portrait cropping intentionally trims the lower body/props like the live portraits. No text, logos, watermark, environment or extra characters in final assets.

## Approval boundary
All proposed runtime filenames are staged under art_src/showrunners/expansion/runtime/img. Nothing was copied into public/img, including Genji. Existing images, engine data, Showrunner union, roster and mechanics remain unchanged. APPROVAL_CHARACTERS.json reserves steady, operations, franchise, mentor and research without being imported by the game. Ravi's future duration multiplier is explicitly 0.75, meaning research takes 25% less time; no weekly RD mechanic.

Runtime placement has not been enabled or browser-tested because the user requested approval before integration. Asset geometry was checked against OfficeScene's height-based scaling. A gameplay test/build is unnecessary for these unreferenced staged images and documents; no gameplay validation is claimed. Asset validation and unchanged-tracked-file checks are recorded in VALIDATION.json.
