# Auction IP poster drop folder

Place the user-created WebP posters here using the stable names `poster_001.webp` through `poster_080.webp`. These 80 slots map directly to the live auction IP catalogue. Missing files automatically use the in-game labelled fallback card, so the auction system remains playable before the art drop is installed.

The 80-IP Shonen/Shojo and genre mapping is recorded in `docs/USER_AUCTION_IP_CATALOG.csv`. The old Work-built 37-property seed catalogue has been replaced by this live 80-property catalogue.

Run `npm run auction-ip:validate-posters` to report missing, oversized, or out-of-range poster assets.
