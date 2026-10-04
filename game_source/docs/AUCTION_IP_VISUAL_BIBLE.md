# Auction IP Visual Bible

- Runtime target: portrait 4:5 WebP, mobile-readable at a displayed width of roughly 96 px; aim for 120–180 KB where practical and remain below the validator's 300 KB ceiling.
- The live catalogue uses 137 stable slots: `public/auction-ip/poster_001.webp` through `poster_137.webp`. Every assignment is exported to `AUCTION_IP_POSTER_SLOTS.csv`; existing slots remain unchanged.
- `USER_AUCTION_IP_CATALOG.csv` records each series title, homage, Shonen/Shojo type and both canonical genres. Slots 101–137 are the October homage expansion; `HOMAGE_IP_EXPANSION.json` audits their exact poster titles and source-character spoof names.
- Original title treatment, silhouettes, costume language and composition. No copied franchise names, logos, signature outfits, weapons or traced layouts.
- Catalogue variety: 1980s painted sci-fi/JRPG boxes, 1990s OVA lighting, 2000s cel/digital hybrids, modern prestige key art, shojo linework, horror ink, sports speed lines, magical-girl colour scripts and restrained adult drama.
- Preserve each manifest palette and keep the title legible over the bottom third. No tiny ensemble faces as the only focal point.
- Property characters belong only to that IP. Do not reuse employee-cast portraits.

The live UI tries the assigned WebP first and automatically provides a deterministic palette/title fallback when it is absent or fails to decode. Adding a correctly named poster requires no code change or manifest edit for an already-assigned live slot.
