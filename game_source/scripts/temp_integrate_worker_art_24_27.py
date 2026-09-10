from __future__ import annotations

from collections import deque
from pathlib import Path
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / "game_source"
PUBLIC = GAME / "public" / "img"
SOURCE = GAME / "art_source" / "workers_24_27"

PAIRS = [
    (24, "punk_01_female"),
    (25, "punk_02_male"),
    (26, "bohemian_01_female"),
    (27, "bohemian_02_male"),
]


def magenta_connected_to_edge(im: Image.Image) -> Image.Image:
    """Remove only edge-connected #FF00FF-ish pixels, preserving pink hair/clothes inside the silhouette."""
    rgba = im.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size

    def is_bg(x: int, y: int) -> bool:
        r, g, b, _ = px[x, y]
        # Tight around chroma-magenta, but tolerant enough for anti-aliased fringe.
        return r >= 205 and b >= 205 and g <= 105 and abs(r - b) <= 55

    q: deque[tuple[int, int]] = deque()
    seen = bytearray(w * h)
    for x in range(w):
        if is_bg(x, 0): q.append((x, 0))
        if is_bg(x, h - 1): q.append((x, h - 1))
    for y in range(h):
        if is_bg(0, y): q.append((0, y))
        if is_bg(w - 1, y): q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        idx = y * w + x
        if seen[idx] or not is_bg(x, y):
            continue
        seen[idx] = 1
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        if x: q.append((x - 1, y))
        if x + 1 < w: q.append((x + 1, y))
        if y: q.append((x, y - 1))
        if y + 1 < h: q.append((x, y + 1))

    return rgba


def alpha_bbox(im: Image.Image):
    a = im.getchannel("A")
    return a.getbbox()


def sprite_runtime(src: Path, dst: Path):
    im = magenta_connected_to_edge(Image.open(src))
    box = alpha_bbox(im)
    if not box:
        raise RuntimeError(f"No foreground found in {src}")
    fg = im.crop(box)
    canvas = Image.new("RGBA", (448, 640), (0, 0, 0, 0))
    scale = min(416 / fg.width, 608 / fg.height)
    fg = fg.resize((max(1, round(fg.width * scale)), max(1, round(fg.height * scale))), Image.Resampling.LANCZOS)
    x = (448 - fg.width) // 2
    y = 640 - 16 - fg.height
    canvas.alpha_composite(fg, (x, y))
    canvas.save(dst, optimize=True)


def portrait_runtime(src: Path, dst: Path):
    im = magenta_connected_to_edge(Image.open(src))
    box = alpha_bbox(im)
    if not box:
        raise RuntimeError(f"No foreground found in {src}")
    l, t, r, b = box
    bw, bh = r - l, b - t
    side = int(max(bw * 1.05, bh * 0.46))
    side = min(side, im.width, im.height)
    cx = (l + r) / 2
    left = int(round(cx - side / 2))
    top = max(0, int(t - side * 0.025))
    left = max(0, min(left, im.width - side))
    top = max(0, min(top, im.height - side))
    crop = im.crop((left, top, left + side, top + side)).resize((224, 224), Image.Resampling.LANCZOS)
    crop.save(dst, optimize=True)


def qc_png(path: Path, size: tuple[int, int]):
    im = Image.open(path).convert("RGBA")
    if im.size != size:
        raise AssertionError(f"{path}: expected {size}, got {im.size}")
    if im.getbbox() is None:
        raise AssertionError(f"{path}: fully transparent")
    # All four corners must be transparent after chroma extraction.
    for p in ((0, 0), (im.width - 1, 0), (0, im.height - 1), (im.width - 1, im.height - 1)):
        if im.getpixel(p)[3] != 0:
            raise AssertionError(f"{path}: background not transparent at {p}")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing integration anchor: {label}")
    return text.replace(old, new, 1)


SOURCE.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)

# Preserve the original magenta masters in a non-runtime source folder.
for _, stem in PAIRS:
    for kind in ("portrait", "sprite"):
        root_src = ROOT / f"{kind}_{stem}.png"
        kept_src = SOURCE / root_src.name
        if root_src.exists():
            shutil.move(str(root_src), str(kept_src))
        if not kept_src.exists():
            raise FileNotFoundError(kept_src)

for number, stem in PAIRS:
    portrait_runtime(SOURCE / f"portrait_{stem}.png", PUBLIC / f"portrait-worker-{number}.png")
    sprite_runtime(SOURCE / f"sprite_{stem}.png", PUBLIC / f"sprite-worker-{number}.png")
    qc_png(PUBLIC / f"portrait-worker-{number}.png", (224, 224))
    qc_png(PUBLIC / f"sprite-worker-{number}.png", (448, 640))

# Register all four looks. Appending preserves every existing explicit look index.
data_path = GAME / "src" / "engine" / "data.ts"
data = data_path.read_text(encoding="utf-8")
data = replace_once(
    data,
    "[1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((n)",
    "[1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27].map((n)",
    "WORKER_LOOKS list",
)
data_path.write_text(data, encoding="utf-8")

# Update content contract to cover the expanded appearance pool.
test_path = GAME / "src" / "engine" / "__tests__" / "content-v3.test.ts"
test = test_path.read_text(encoding="utf-8")ntest = replace_once(
    test,
    'it("adds seven worker looks after the existing fifteen", () => {\n    expect(WORKER_LOOKS).toHaveLength(22);\n    expect(WORKER_LOOKS[14].sprite).toContain("sprite-worker-16.png");\n    expect(WORKER_LOOKS[15].sprite).toContain("sprite-worker-17.png");\n    expect(WORKER_LOOKS[21].sprite).toContain("sprite-worker-23.png");\n  });',
    'it("adds eleven worker looks after the original fifteen", () => {\n    expect(WORKER_LOOKS).toHaveLength(26);\n    expect(WORKER_LOOKS[14].sprite).toContain("sprite-worker-16.png");\n    expect(WORKER_LOOKS[15].sprite).toContain("sprite-worker-17.png");\n    expect(WORKER_LOOKS[21].sprite).toContain("sprite-worker-23.png");\n    expect(WORKER_LOOKS[22].sprite).toContain("sprite-worker-24.png");\n    expect(WORKER_LOOKS[25].sprite).toContain("sprite-worker-27.png");\n  });',
    "worker look test",
)
test_path.write_text(test, encoding="utf-8")

# Extend the runtime art manifest.
manifest_path = GAME / "docs" / "content-v3" / "WORKER_RUNTIME_MANIFEST.csv"
manifest = manifest_path.read_text(encoding="utf-8")
if "worker_24,sprite" not in manifest:
    if not manifest.endswith("\n"):
        manifest += "\n"
    rows = []
    for number, stem in PAIRS:
        idx = number - 2  # worker 24 -> zero-based WORKER_LOOKS index 22
        rows.append(f'worker_{number},sprite,sprite-worker-{number}.png,448,640,worker_{number},{idx},game_source/public/img/sprite-worker-{number}.png,"magenta master: sprite_{stem}.png",PASS_RUNTIME_QC')
        rows.append(f'worker_{number},portrait,portrait-worker-{number}.png,224,224,worker_{number},{idx},game_source/public/img/portrait-worker-{number}.png,"magenta master: portrait_{stem}.png",PASS_RUNTIME_QC')
    manifest += "\n".join(rows) + "\n"
    manifest_path.write_text(manifest, encoding="utf-8")

notes = GAME / "docs" / "content-v3" / "WORKER_ART_24_27.md"
notes.write_text("""# Worker Art 24–27\n\nFour additional hire-pool appearances derived from the approved magenta masters.\n\n| Worker | Look index | Direction | Runtime sprite | Runtime portrait |\n|---|---:|---|---|---|\n| worker_24 | 22 | modern / punk woman | `sprite-worker-24.png` | `portrait-worker-24.png` |\n| worker_25 | 23 | modern / punk man | `sprite-worker-25.png` | `portrait-worker-25.png` |\n| worker_26 | 24 | hippie / bohemian woman | `sprite-worker-26.png` | `portrait-worker-26.png` |\n| worker_27 | 25 | hippie / bohemian man | `sprite-worker-27.png` | `portrait-worker-27.png` |\n\nThe original #FF00FF masters are retained under `game_source/art_source/workers_24_27/`. Runtime assets use edge-connected magenta removal so deliberately pink/red character details are preserved. Sprites are normalized to 448×640 and portraits to 224×224 to match the established worker pipeline.\n""", encoding="utf-8")

print("Integrated worker looks 24-27; runtime PNG QC passed.")
