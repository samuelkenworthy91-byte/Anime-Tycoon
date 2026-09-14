from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text()
    found = text.count(old)
    if found < count:
        raise SystemExit(f"{path}: expected {count} occurrence(s), found {found}: {old[:120]!r}")
    p.write_text(text.replace(old, new, count))


# Stage 8 exposed a latent Stage 7 integration bug: playerCraftFor takes
# (score, points), not just points, and returns story/art/sound (not score).
replace(
    "game_source/src/engine/bigThree.ts",
    "  const craft = playerCraftFor(input.points);\n  const craftFloor = Math.min(craft.story, craft.art, craft.score);\n",
    "  const craft = playerCraftFor(input.score, input.points);\n  const craftFloor = Math.min(craft.story, craft.art, craft.sound);\n",
)
