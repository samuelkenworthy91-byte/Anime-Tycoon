# Auction IP poster drop folder

Place user-created WebP files here using the stable names `poster_001.webp` through `poster_100.webp`. Slots 001–037 are currently assigned to the live Work-built catalogue; slots 038–100 are reserved for catalogue expansion and user-supplied replacements. Missing files automatically use the in-game labelled fallback card.

The user-created 100-poster catalogue and its intended Shonen/Shojo + two-genre mapping are recorded in `docs/USER_AUCTION_IP_CATALOG.csv`. Do not assume that catalogue has replaced the live 37-entry auction seed data until the runtime switchover is explicitly implemented.

Run `npm run auction-ip:validate-posters` to report missing, oversized, or out-of-range poster assets.