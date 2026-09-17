from pathlib import Path

path = Path('game_source/src/engine/__tests__/big-three.test.ts')
text = path.read_text()
old = 'genres: ["fantasy"] as GenreId[], animeType: "shonen" as const, revenue: 4_000_000, fans: 200_000,'
new = 'genres: ["fantasy"] as GenreId[], animeType: "shonen" as const, revenue: 4_000_000, fans: 300_000,'
if old not in text:
    raise SystemExit('Expected transformed rival Big Three fixture not found')
path.write_text(text.replace(old, new, 1))
