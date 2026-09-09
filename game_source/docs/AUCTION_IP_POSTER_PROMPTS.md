# Auction IP Poster Prompts

Use one independent image generation per manifest row. Never create a sheet, collage, grid or multi-panel image.

Base prompt:

> Create exactly one standalone vertical 4:5 fictional anime/manga/JRPG property poster for **{TITLE}**. Premise: {DESCRIPTION}. Show the original property characters {CHARACTERS}. Visual era and genre direction: {SOURCE_TYPE}, {GENRES}, {TONES}. Use palette {PALETTE}. Strong mobile-readable silhouette and title hierarchy, transformative original designs, polished commercial key art. No real franchise names, existing characters, copied logos, traced compositions, watermark, border, inset, collage, grid or multi-panel layout.

The exact per-IP values are exported in `docs/AUCTION_IP_MANIFEST.csv`; keep each generation separate and inspect it before the next integration step.

