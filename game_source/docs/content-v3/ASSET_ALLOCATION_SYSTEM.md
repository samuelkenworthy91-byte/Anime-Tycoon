# Unified asset allocation

ASSET_ALLOCATION_MANIFEST.csv is the single mapping authority for all 227 delivered runtime assets. Identical copies are included in all three packs. Every source filename is unique. The archive_member column identifies its exact ZIP location; target_repo_path identifies its upload destination and target_runtime_path its root-relative browser URL. SHA-256 and dimensions are recorded per file.

There are 208 cast portraits, seven worker sprites, seven matching worker portraits, one replacement producer/showrunner sprite, one matching replacement portrait, and three workstation assets. Only the two producer files replace existing art. Source sheets and QC contact sheets are reference material, not runtime assets.

Import order 1 places images. Order 2 installs reviewed content payloads; order 3 connects appearance selections and workstation foreground art through Arena's current system. A file upload alone does not register new workers or switch canonical data loaders. Keep existing worker look indexes 0–14; append file numbers 17–23 at indexes 15–21. Do not fill reserved file number 6 or infer an index from a filename. Worker portrait and sprite pair_id must remain together. Producer uses the existing producer career identity and existing file paths.

Cast filenames are exact new canonical IDs, cv3_lead/sidekick/mascot/villain_001–052. Runtime cast img fields omit the leading slash (cast/v3/...), consistent with the existing payload; the allocation browser URL includes /cast/v3/.... The existing 192 portraits are deliberately not duplicated in these packs.

All worker and workstation runtime PNGs have real alpha. Worker sprites: 448×640 with common foot baseline 628; portraits: 224×224. Cast: 512×512 WebP, precisely separated from 4-column × 2-row sheets. Workstations: 768×512, bottom-centre anchor, art baseline 482. Apparent head sizes vary with intentional poses; see QC notes before engine placement. Do not use magenta sources directly in the engine.
