#!/usr/bin/env python3
"""Chroma-key AI masters → assets/source/1942 drop-ins, then pack atlases."""
from __future__ import annotations

import math
import sys
from collections import Counter, deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
GEN = Path(
    "/Users/heavyreality/.cursor/projects/Users-heavyreality-VIPER-ARCADE/assets"
)
SRC = ROOT / "assets" / "source" / "1942"


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def color_dist(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def sample_edge_key(im: Image.Image) -> tuple[int, int, int]:
    """Median-ish most common edge RGB — AI often uses hot-pink not pure magenta."""
    px = im.load()
    w, h = im.size
    edge: list[tuple[int, int, int]] = []
    step = max(1, w // 256)
    for x in range(0, w, step):
        edge.append(px[x, 0][:3])
        edge.append(px[x, h - 1][:3])
    for y in range(0, h, step):
        edge.append(px[0, y][:3])
        edge.append(px[w - 1, y][:3])
    # Quantize slightly to stabilize
    q = [((r // 4) * 4, (g // 4) * 4, (b // 4) * 4) for r, g, b in edge]
    (qr, qg, qb), _ = Counter(q).most_common(1)[0]
    # Average originals near that bucket
    matched = [c for c in edge if abs(c[0] - qr) < 8 and abs(c[1] - qg) < 8 and abs(c[2] - qb) < 8]
    if not matched:
        matched = edge
    n = len(matched)
    return (
        sum(c[0] for c in matched) // n,
        sum(c[1] for c in matched) // n,
        sum(c[2] for c in matched) // n,
    )


def edge_flood_key(im: Image.Image, thresh: float = 55.0) -> Image.Image:
    """Remove background keyed from edge-sampled color, flood from borders."""
    key = sample_edge_key(im)
    w, h = im.size
    px = im.load()
    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def is_bg(r: int, g: int, b: int, a: int) -> bool:
        if a < 8:
            return True
        return color_dist((r, g, b), key) <= thresh

    def try_seed(x: int, y: int) -> None:
        r, g, b, a = px[x, y]
        if not visited[y][x] and is_bg(r, g, b, a):
            visited[y][x] = True
            q.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                r, g, b, a = px[nx, ny]
                if is_bg(r, g, b, a):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    # Soft fringe: any remaining near-key with low saturation vs key
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and color_dist((r, g, b), key) <= thresh * 0.65:
                px[x, y] = (0, 0, 0, 0)
    return im


def green_key(im: Image.Image, thresh: float = 90.0) -> Image.Image:
    """Key lime/green chroma (#00FF00 family)."""
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a:
                continue
            # Strong green, low red+blue
            if g > 140 and g > r + 40 and g > b + 40:
                px[x, y] = (0, 0, 0, 0)
            elif color_dist((r, g, b), (0, 255, 0)) <= thresh and g > r and g > b:
                px[x, y] = (0, 0, 0, 0)
    return edge_flood_key(im, thresh=70)


def bbox_alpha(im: Image.Image, pad: int = 4) -> Image.Image:
    a = im.split()[-1]
    bb = a.getbbox()
    if not bb:
        return im
    x0, y0, x1, y1 = bb
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def fit(im: Image.Image, tw: int, th: int) -> Image.Image:
    im = im.convert("RGBA")
    sw, sh = im.size
    if sw <= 0 or sh <= 0:
        return Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    scale = min(tw / sw, th / sh)
    nw = max(1, int(round(sw * scale)))
    nh = max(1, int(round(sh * scale)))
    scaled = im.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    out.alpha_composite(scaled, ((tw - nw) // 2, (th - nh) // 2))
    return out


def prep_sprite(path: Path, tw: int, th: int, *, green: bool = False, thresh: float = 55.0) -> Image.Image:
    im = load_rgba(path)
    im = green_key(im) if green else edge_flood_key(im, thresh=thresh)
    im = bbox_alpha(im, pad=8)
    return fit(im, tw, th)


def prep_fullbleed(path: Path, tw: int, th: int) -> Image.Image:
    return load_rgba(path).resize((tw, th), Image.Resampling.LANCZOS)


def prop_variant(im: Image.Image, phase: int) -> Image.Image:
    out = im.copy()
    overlay = Image.new("RGBA", out.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    cx, cy = out.width // 2, int(out.height * 0.22)
    r = max(3, out.width // 14)
    for a in (phase * 22, phase * 22 + 90):
        rad = math.radians(a)
        x1 = cx + int(math.cos(rad) * r)
        y1 = cy + int(math.sin(rad) * r)
        x0 = cx - int(math.cos(rad) * r)
        y0 = cy - int(math.sin(rad) * r)
        d.line([(x0, y0), (x1, y1)], fill=(220, 240, 255, 70 + (phase % 2) * 30), width=1)
    out.alpha_composite(overlay)
    if phase % 2:
        out = ImageEnhance.Brightness(out).enhance(1.03)
    return out


def loop_frame(im: Image.Image, i: int) -> Image.Image:
    scales = [1.0, 0.85, 0.55, 0.35, 0.55, 0.85]
    angles = [0, 40, 100, 180, 260, 320]
    s, a = scales[i], angles[i]
    w, h = im.size
    nw, nh = max(1, int(w * s)), max(1, int(h * s))
    small = im.resize((nw, nh), Image.Resampling.LANCZOS)
    small = small.rotate(a, resample=Image.Resampling.BICUBIC, expand=True)
    if i in (2, 3):
        small = small.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        small = ImageEnhance.Brightness(small).enhance(0.75)
    return fit(small, w, h)


def connected_components(im: Image.Image, min_area: int = 80) -> list[Image.Image]:
    w, h = im.size
    px = im.load()
    visited = [[False] * w for _ in range(h)]
    blobs: list[tuple[int, Image.Image]] = []

    for y in range(h):
        for x in range(w):
            if visited[y][x]:
                continue
            _r, _g, _b, a = px[x, y]
            if a < 16:
                visited[y][x] = True
                continue
            q: deque[tuple[int, int]] = deque([(x, y)])
            visited[y][x] = True
            cells: list[tuple[int, int]] = []
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                        visited[ny][nx] = True
                        _rr, _gg, _bb, aa = px[nx, ny]
                        if aa >= 16:
                            q.append((nx, ny))
            if len(cells) < min_area:
                continue
            xs = [c[0] for c in cells]
            ys = [c[1] for c in cells]
            x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
            crop = Image.new("RGBA", (x1 - x0 + 1, y1 - y0 + 1), (0, 0, 0, 0))
            cp = crop.load()
            for cx, cy in cells:
                cp[cx - x0, cy - y0] = px[cx, cy]
            blobs.append((x0, crop))
    blobs.sort(key=lambda t: t[0])
    return [b for _, b in blobs]


def save(im: Image.Image, name: str) -> None:
    path = SRC / name
    im.save(path)
    # Sanity: opaque corner means key failed
    px = im.getpixel((0, 0))
    flag = " ⚠ opaque corner" if px[3] > 10 else ""
    print(f"  wrote {name} {im.size[0]}×{im.size[1]}{flag}")


def main() -> None:
    SRC.mkdir(parents=True, exist_ok=True)
    print("processing AI masters →", SRC)

    # Player — hot-pink bg; use moderate threshold
    center = prep_sprite(GEN / "gen_player_center.png", 96, 96, thresh=50)
    left = prep_sprite(GEN / "gen_player_left.png", 96, 96, thresh=50)
    right = prep_sprite(GEN / "gen_player_right.png", 96, 96, thresh=50)
    save(center, "player_center.png")
    save(left, "player_left.png")
    save(right, "player_right.png")
    for i in range(6):
        save(loop_frame(center, i), f"player_loop{i}.png")

    # Enemies — red plane bg is close to body; tighter thresh
    for kind, src_name, thresh in (
        ("scout", "gen_scout.png", 50),
        ("red", "gen_red.png", 38),
        ("ace", "gen_ace.png", 50),
        ("bomber_small", "gen_bomber_small.png", 50),
    ):
        base = prep_sprite(GEN / src_name, 96, 96, thresh=thresh)
        for i in range(4):
            save(prop_variant(base, i), f"{kind}_{i}.png")

    heavy = prep_sprite(GEN / "gen_heavy.png", 144, 72, thresh=50)
    for i in range(4):
        save(prop_variant(heavy, i), f"heavy_{i}.png")

    # Explosions — individual green-keyed frames
    for i in range(8):
        p = GEN / f"gen_ex{i}.png"
        if not p.is_file():
            print("missing", p, file=sys.stderr)
            sys.exit(1)
        save(prep_sprite(p, 96, 96, green=True), f"explosion_{i}.png")

    # Bullets — green key strip
    bul_path = GEN / "gen_bullets2.png"
    if not bul_path.is_file():
        bul_path = GEN / "gen_bullets.png"
    bul = green_key(load_rgba(bul_path)) if "2" in bul_path.name else edge_flood_key(load_rgba(bul_path), 50)
    bul = bbox_alpha(bul, pad=4)
    bblobs = connected_components(bul, min_area=30)
    print(f"  bullet blobs: {len(bblobs)}")
    if len(bblobs) >= 3:
        # Prefer tall thin = player, round = enemy, dual = widest
        scored = sorted(bblobs, key=lambda im: im.width)
        # Heuristic: sort by aspect
        by_area = sorted(bblobs, key=lambda im: im.width * im.height, reverse=True)
        # leftmost three from original order
        save(fit(bblobs[0], 32, 48), "bullet_player.png")
        save(fit(bblobs[1], 32, 48), "bullet_enemy.png")
        save(fit(bblobs[2], 48, 48), "bullet_dual.png")
    else:
        bp = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        d = ImageDraw.Draw(bp)
        d.rectangle([14, 6, 17, 42], fill=(255, 255, 220, 255))
        d.rectangle([13, 8, 18, 40], fill=(45, 226, 230, 180))
        save(bp, "bullet_player.png")
        be = Image.new("RGBA", (32, 48), (0, 0, 0, 0))
        d = ImageDraw.Draw(be)
        d.ellipse([10, 16, 22, 28], fill=(255, 90, 40, 255))
        d.ellipse([13, 18, 17, 22], fill=(255, 240, 180, 220))
        save(be, "bullet_enemy.png")
        bd = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
        d = ImageDraw.Draw(bd)
        for ox in (14, 30):
            d.rectangle([ox, 8, ox + 3, 40], fill=(255, 255, 220, 255))
        save(bd, "bullet_dual.png")

    save(prep_sprite(GEN / "gen_pow.png", 40, 40, thresh=50), "pow.png")
    save(prep_sprite(GEN / "gen_life.png", 32, 32, thresh=50), "life.png")

    save(prep_fullbleed(GEN / "gen_ocean_0.png", 192, 192), "ocean_0.png")
    save(prep_fullbleed(GEN / "gen_ocean_1.png", 192, 192), "ocean_1.png")
    save(prep_sprite(GEN / "gen_island.png", 160, 120, thresh=48), "island.png")
    # Clouds — closer to true magenta
    save(prep_sprite(GEN / "gen_cloud_0.png", 128, 64, thresh=60), "cloud_0.png")
    save(prep_sprite(GEN / "gen_cloud_1.png", 128, 64, thresh=60), "cloud_1.png")

    print("packing atlases…")
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "pack1942", ROOT / "scripts" / "pack-1942-atlases.py"
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    # Sources are already cell-sized; packer will contain-fit again (fine)
    mod.pack()
    print("done")


if __name__ == "__main__":
    main()
