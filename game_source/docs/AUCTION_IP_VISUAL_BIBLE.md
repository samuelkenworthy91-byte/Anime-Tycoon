# Auction IP Visual Bible

- Runtime target: portrait 4:5 WebP, mobile-readable at a displayed width of roughly 96 px; aim for 120–180 KB where practical and remain below the validator's 300 KB ceiling.
- The importer contract reserves 100 stable slots: `public/auction-ip/poster_001.webp` through `poster_100.webp`. The first 37 are assigned in `AUCTION_IP_POSTER_SLOTS.csv`; slots 038–100 are reserved for catalogue expansion and will not shift existing assignments.
- The user-created 100-poster catalogue is recorded separately in `USER_AUCTION_IP_CATALOG.csv`, including each intended Shonen/Shojo type and its two canonical game genres. This staging catalogue does not silently replace the live 37-entry auction seed data.
- Original title treatment, silhouettes, costume language and composition. No copied franchise names, logos, signature outfits, weapons or traced layouts.
- Catalogue variety: 1980s painted sci-fi/JRPG boxes, 1990s OVA lighting, 2000s cel/digital hybrids, modern prestige key art, shojo linework, horror ink, sports speed lines, magical-girl colour scripts and restrained adult drama.
- Preserve each manifest palette and keep the title legible over the bottom third. No tiny ensemble faces as the only focal point.
- Property characters belong only to that IP. Do not reuse employee-cast portraits.

The live UI tries the assigned WebP first and automatically provides a deterministic palette/title fallback when it is absent or fails to decode. Adding a correctly named poster requires no code change or manifest edit for an already-assigned live slot.