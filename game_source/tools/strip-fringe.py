#!/usr/bin/env python3
"""Strip the translucent "cutout" rim from the painted people PNGs.

Two jobs, run automatically per file:

1. If an image still sits on a (near-)white studio background, that
   background is flood-removed from the borders inward, leaving real alpha.
2. Every partially-transparent pixel that forms part of the OUTER skin of
   the silhouette — i.e. ghost pixels of the old backdrop left behind by
   background-removal — gets its opacity turned fully down to zero, as the
   art director requested. Interior partial pixels (genuine antialiasing on
   the character's outline and translucent details like lenses) are kept.

Usage:
    python3 tools/strip-fringe.py img/sprite-worker-16.png [more.png ...]
    python3 tools/strip-fringe.py            # all sprite/portrait people art

Requires Pillow. Never touches opaque pixels or fully transparent ones,
so re-running it is a no-op (idempotent).
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - environment help
    sys.exit("Pillow is required: pip install pillow")

IMG_DIR = Path(__file__).resolve().parent.parent / "public" / "img"

# pixels this close to white are treated as studio backdrop
BG_MIN = 228
# spread between channels allowed for "neutral" backdrop white
BG_SPREAD = 26
# stricter test for enclosed white POCKETS (between limbs / hair strands) —
# tight so warm creams on the character itself are never eaten
POCKET_MIN = 225
POCKET_SPREAD = 12
# passes of outer translucent skin to dissolve
SKIN_PASSES = 3


def _near_white(r: int, g: int, b: int) -> bool:
    return min(r, g, b) >= BG_MIN and (max(r, g, b) - min(r, g, b)) <= BG_SPREAD


def remove_studio_bg(im: Image.Image) -> Image.Image:
    """Flood-erase the connected near-white backdrop starting at the borders."""
    px = im.load()
    w, h = im.size
    seen = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        r, g, b, _ = px[x, y]
        if _near_white(r, g, b) and not seen[y * w + x]:
            seen[y * w + x] = 1
            q.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                r, g, b, _ = px[nx, ny]
                if _near_white(r, g, b):
                    seen[ny * w + nx] = 1
                    q.append((nx, ny))

    changed = 0
    for y in range(h):
        for x in range(w):
            if seen[y * w + x]:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0)
                changed += 1
    if changed:
        print(f"      removed {changed} backdrop px")
    return im


def kill_enclosed_white_regions(im: Image.Image, min_size: int) -> Image.Image:
    """Erase opaque near-white REGIONS of >= min_size pixels entirely.

    Backdrop islands sealed inside the silhouette (between twin-tails, under
    an arm) never touch the outside transparency, so flood passes miss
    them. Drawn-on-purpose whites (eye highlights, paper, piano keys) are
    tiny or slightly warm-shaded; a size threshold keeps them safe. Opt in
    per file via --kill-white-above.
    """
    px = im.load()
    w, h = im.size
    seen = bytearray(w * h)
    killed = 0
    for y in range(h):
        for x in range(w):
            if seen[y * w + x]:
                continue
            r, g, b, a = px[x, y]
            if a == 255 and min(r, g, b) >= POCKET_MIN and (max(r, g, b) - min(r, g, b)) <= POCKET_SPREAD:
                q: deque[tuple[int, int]] = deque([(x, y)])
                seen[y * w + x] = 1
                region: list[tuple[int, int]] = []
                while q:
                    X, Y = q.popleft()
                    region.append((X, Y))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = X + dx, Y + dy
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                            rr, gg, bb, aa = px[nx, ny]
                            if (
                                aa == 255
                                and min(rr, gg, bb) >= POCKET_MIN
                                and (max(rr, gg, bb) - min(rr, gg, bb)) <= POCKET_SPREAD
                            ):
                                seen[ny * w + nx] = 1
                                q.append((nx, ny))
                if len(region) >= min_size:
                    for X, Y in region:
                        rr, gg, bb, _ = px[X, Y]
                        px[X, Y] = (rr, gg, bb, 0)
                    killed += len(region)
    if killed:
        print(f"      killed {killed} enclosed white-region px (>= {min_size})")
    return im


def eat_white_pockets(im: Image.Image) -> Image.Image:
    """Erase enclosed opaque near-white regions that touch transparency.

    Background-removal often misses the backdrop islands trapped between
    hair strands, arms and props. They can only be reached through genuinely
    transparent pixels; white details that are part of the character
    (sketchbook pages, keyboard keys) are sealed off by dark outline pixels
    and by the stricter neutrality test, so they survive.
    """
    px = im.load()
    w, h = im.size
    seen = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def neutral_white(x: int, y: int) -> bool:
        r, g, b, _ = px[x, y]
        return min(r, g, b) >= POCKET_MIN and (max(r, g, b) - min(r, g, b)) <= POCKET_SPREAD

    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0:
                seen[y * w + x] = 1
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if (
                        0 <= nx < w
                        and 0 <= ny < h
                        and not seen[ny * w + nx]
                        and px[nx, ny][3] == 255
                        and neutral_white(nx, ny)
                    ):
                        seen[ny * w + nx] = 1
                        q.append((nx, ny))

    ate = 0
    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        ate += 1
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if (
                0 <= nx < w
                and 0 <= ny < h
                and not seen[ny * w + nx]
                and px[nx, ny][3] == 255
                and neutral_white(nx, ny)
            ):
                seen[ny * w + nx] = 1
                q.append((nx, ny))
    if ate:
        print(f"      ate {ate} enclosed white-pocket px")
    return im


def dissolve_translucent_rim(im: Image.Image) -> Image.Image:
    """Alpha-zero any partial-alpha pixel that touches the transparent outside.

    Repeated a few times so multi-pixel ghost skins dissolve entirely; a
    partial-pixel ring that only touches other opaque pixels (real outline
    antialiasing, lens glass) survives every pass.
    """
    px = im.load()
    w, h = im.size
    total = 0
    for _ in range(SKIN_PASSES):
        kill: list[tuple[int, int]] = []
        for y in range(h):
            for x in range(w):
                a = px[x, y][3]
                if a == 0 or a == 255:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                        kill.append((x, y))
                        break
        if not kill:
            break
        for x, y in kill:
            r, g, b, _ = px[x, y]
            px[x, y] = (r, g, b, 0)
        total += len(kill)
    if total:
        print(f"      dissolved {total} ghost-rim px")
    return im


def autotrim(im: Image.Image, pad: int = 6) -> Image.Image:
    """Crop to the opaque bounding box (so sprite anchors stay consistent)."""
    alpha = im.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    if (x0, y0, x1, y1) == (0, 0, im.width, im.height):
        return im
    print(f"      trimmed to {x1 - x0}x{y1 - y0}")
    return im.crop((x0, y0, x1, y1))


def process(path: Path, kill_above: int | None) -> None:
    im = Image.open(path).convert("RGBA")
    original = im.tobytes()
    hist = im.getchannel("A").histogram()
    fully_opaque = hist[255] == sum(hist)
    print(f"  {path.name} {im.width}x{im.height}")
    if fully_opaque:
        im = remove_studio_bg(im)
    im = eat_white_pockets(im)
    if kill_above is not None:
        im = kill_enclosed_white_regions(im, kill_above)
    im = dissolve_translucent_rim(im)
    im = autotrim(im)
    after_hist = im.getchannel("A").histogram()
    partials = sum(after_hist[1:255])
    if im.tobytes() != original:
        im.save(path)
    else:
        print("      no change")
    print(f"      -> {partials} partial-alpha px remain (interior antialiasing)")


def main(argv: list[str]) -> None:
    kill_above: int | None = None
    args: list[str] = []
    it = iter(argv)
    for a in it:
        if a == "--kill-white-above":
            kill_above = int(next(it))
        else:
            args.append(a)
    if args:
        files = [Path(a) for a in args]
    else:
        files = sorted(
            p
            for p in IMG_DIR.glob("*.png")
            if p.name.startswith(("sprite-", "portrait-worker-", "portrait-showrunner-"))
        )
    if not files:
        sys.exit(f"no art found in {IMG_DIR}")
    for f in files:
        process(f, kill_above)


if __name__ == "__main__":
    main(sys.argv[1:])
