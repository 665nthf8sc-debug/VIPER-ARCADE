#!/usr/bin/env python3
"""Pack AI drop-in sprites into VIPER 1942 atlases (2× cell sizes).

Source: assets/source/1942/*.png
Output: public/sprites/1942/{planes,bomber,fx,tiles}.png

Layout matches src/games/game1942/atlas.ts — see assets/source/1942/README.md.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "source" / "1942"
OUT = ROOT / "public" / "sprites" / "1942"

PLANE_CELL = 96
HEAVY_W, HEAVY_H = 144, 72

# (filename, dest sheet key, sx, sy, sw, sh)
PLANE_SLOTS: list[tuple[str, int, int]] = [
    ("player_center.png", 0, 0),
    ("player_left.png", 1, 0),
    ("player_right.png", 2, 0),
    ("player_loop0.png", 3, 0),
    ("player_loop1.png", 4, 0),
    ("player_loop2.png", 5, 0),
    ("player_loop3.png", 6, 0),
    ("player_loop4.png", 7, 0),
    ("player_loop5.png", 0, 1),
]
for i in range(4):
    PLANE_SLOTS.append((f"scout_{i}.png", i, 2))
for i in range(4):
    PLANE_SLOTS.append((f"red_{i}.png", i, 3))
for i in range(4):
    PLANE_SLOTS.append((f"ace_{i}.png", i, 4))
for i in range(4):
    PLANE_SLOTS.append((f"bomber_small_{i}.png", i, 5))

HEAVY_FILES = [f"heavy_{i}.png" for i in range(4)]

FX_SLOTS: list[tuple[str, int, int, int, int]] = [
    ("bullet_player.png", 0, 0, 32, 48),
    ("bullet_enemy.png", 32, 0, 32, 48),
    ("bullet_dual.png", 64, 0, 48, 48),
    ("pow.png", 0, 48, 40, 40),
    ("life.png", 48, 48, 32, 32),
]
for i in range(8):
    FX_SLOTS.append((f"explosion_{i}.png", (i % 4) * 96, 96 + (i // 4) * 96, 96, 96))

TILE_SLOTS: list[tuple[str, int, int, int, int]] = [
    ("ocean_0.png", 0, 0, 192, 192),
    ("ocean_1.png", 192, 0, 192, 192),
    ("island.png", 0, 192, 160, 120),
    ("cloud_0.png", 192, 192, 128, 64),
    ("cloud_1.png", 192, 256, 128, 64),
]


def required_files() -> list[str]:
    names = [n for n, _, _ in PLANE_SLOTS]
    names.extend(HEAVY_FILES)
    names.extend(n for n, *_ in FX_SLOTS)
    names.extend(n for n, *_ in TILE_SLOTS)
    return names


def fit_into(im: Image.Image, tw: int, th: int) -> Image.Image:
    """Contain-fit im into tw×th with transparent padding, preserving aspect."""
    im = im.convert("RGBA")
    sw, sh = im.size
    if sw <= 0 or sh <= 0:
        return Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    scale = min(tw / sw, th / sh)
    nw = max(1, int(round(sw * scale)))
    nh = max(1, int(round(sh * scale)))
    # Prefer nearest for pixel art; fall back to box if huge downscale looks muddy — use NEAREST for crisp sprites
    resample = Image.Resampling.NEAREST if scale >= 0.5 else Image.Resampling.LANCZOS
    scaled = im.resize((nw, nh), resample)
    out = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    out.alpha_composite(scaled, ((tw - nw) // 2, (th - nh) // 2))
    return out


def load_fit(path: Path, tw: int, th: int) -> Image.Image:
    return fit_into(Image.open(path), tw, th)


def missing_sources() -> list[str]:
    return [name for name in required_files() if not (SRC / name).is_file()]


def pack() -> None:
    missing = missing_sources()
    if missing:
        print("ERROR: missing required source PNGs under", SRC, file=sys.stderr)
        for name in missing:
            print(f"  - {name}", file=sys.stderr)
        print(
            f"\n{len(missing)} file(s) missing. See assets/source/1942/README.md",
            file=sys.stderr,
        )
        sys.exit(1)

    OUT.mkdir(parents=True, exist_ok=True)

    planes = Image.new("RGBA", (8 * PLANE_CELL, 6 * PLANE_CELL), (0, 0, 0, 0))
    for name, col, row in PLANE_SLOTS:
        cell = load_fit(SRC / name, PLANE_CELL, PLANE_CELL)
        planes.alpha_composite(cell, (col * PLANE_CELL, row * PLANE_CELL))
    planes.save(OUT / "planes.png")

    bomber = Image.new("RGBA", (HEAVY_W * 4, HEAVY_H), (0, 0, 0, 0))
    for i, name in enumerate(HEAVY_FILES):
        cell = load_fit(SRC / name, HEAVY_W, HEAVY_H)
        bomber.alpha_composite(cell, (i * HEAVY_W, 0))
    bomber.save(OUT / "bomber.png")

    fx = Image.new("RGBA", (384, 384), (0, 0, 0, 0))
    for name, sx, sy, sw, sh in FX_SLOTS:
        cell = load_fit(SRC / name, sw, sh)
        fx.alpha_composite(cell, (sx, sy))
    fx.save(OUT / "fx.png")

    tiles = Image.new("RGBA", (384, 384), (0, 0, 0, 0))
    for name, sx, sy, sw, sh in TILE_SLOTS:
        cell = load_fit(SRC / name, sw, sh)
        tiles.alpha_composite(cell, (sx, sy))
    tiles.save(OUT / "tiles.png")

    print(f"wrote atlases to {OUT}")
    for n in ("planes.png", "bomber.png", "fx.png", "tiles.png"):
        p = OUT / n
        im = Image.open(p)
        print(f"  {n}: {im.size[0]}×{im.size[1]}")


def _crop(im: Image.Image, x: int, y: int, w: int, h: int) -> Image.Image:
    return im.crop((x, y, x + w, y + h)).convert("RGBA")


def seed_from_public() -> None:
    """Slice public atlases into source PNGs (supports 1× legacy or 2× packed)."""
    SRC.mkdir(parents=True, exist_ok=True)
    planes_path = OUT / "planes.png"
    bomber_path = OUT / "bomber.png"
    fx_path = OUT / "fx.png"
    tiles_path = OUT / "tiles.png"
    for p in (planes_path, bomber_path, fx_path, tiles_path):
        if not p.is_file():
            print(f"ERROR: cannot seed — missing {p}", file=sys.stderr)
            sys.exit(1)

    planes = Image.open(planes_path).convert("RGBA")
    bomber = Image.open(bomber_path).convert("RGBA")
    fx = Image.open(fx_path).convert("RGBA")
    tiles = Image.open(tiles_path).convert("RGBA")

    # Detect scale from planes width (384 = 1×, 768 = 2×)
    scale = 2 if planes.width >= 700 else 1
    pc = 48 * scale
    print(f"seeding from public sheets (detected {scale}×, cell {pc})")

    slot_names_xy = [
        ("player_center.png", 0, 0),
        ("player_left.png", 1, 0),
        ("player_right.png", 2, 0),
        ("player_loop0.png", 3, 0),
        ("player_loop1.png", 4, 0),
        ("player_loop2.png", 5, 0),
        ("player_loop3.png", 6, 0),
        ("player_loop4.png", 7, 0),
        ("player_loop5.png", 0, 1),
    ]
    for i in range(4):
        slot_names_xy.append((f"scout_{i}.png", i, 2))
    for i in range(4):
        slot_names_xy.append((f"red_{i}.png", i, 3))
    for i in range(4):
        slot_names_xy.append((f"ace_{i}.png", i, 4))
    for i in range(4):
        slot_names_xy.append((f"bomber_small_{i}.png", i, 5))

    for name, col, row in slot_names_xy:
        cell = _crop(planes, col * pc, row * pc, pc, pc)
        if scale == 1:
            cell = cell.resize((PLANE_CELL, PLANE_CELL), Image.Resampling.NEAREST)
        cell.save(SRC / name)

    hw, hh = 72 * scale, 36 * scale
    for i in range(4):
        cell = _crop(bomber, i * hw, 0, hw, hh)
        if scale == 1:
            cell = cell.resize((HEAVY_W, HEAVY_H), Image.Resampling.NEAREST)
        cell.save(SRC / f"heavy_{i}.png")

    # FX — legacy layout × scale
    fx_map = [
        ("bullet_player.png", 0, 0, 16, 24, 32, 48),
        ("bullet_enemy.png", 16, 0, 16, 24, 32, 48),
        ("bullet_dual.png", 32, 0, 24, 24, 48, 48),
        ("pow.png", 0, 24, 20, 20, 40, 40),
        ("life.png", 24, 24, 16, 16, 32, 32),
    ]
    for name, x, y, w, h, tw, th in fx_map:
        cell = _crop(fx, x * scale, y * scale, w * scale, h * scale)
        if scale == 1:
            cell = cell.resize((tw, th), Image.Resampling.NEAREST)
        cell.save(SRC / name)
    for i in range(8):
        x = (i % 4) * 48 * scale
        y = (48 + (i // 4) * 48) * scale
        cell = _crop(fx, x, y, 48 * scale, 48 * scale)
        if scale == 1:
            cell = cell.resize((96, 96), Image.Resampling.NEAREST)
        cell.save(SRC / f"explosion_{i}.png")

    tile_map = [
        ("ocean_0.png", 0, 0, 96, 96, 192, 192),
        ("ocean_1.png", 96, 0, 96, 96, 192, 192),
        ("island.png", 0, 96, 80, 60, 160, 120),
        ("cloud_0.png", 96, 96, 64, 32, 128, 64),
        ("cloud_1.png", 96, 128, 64, 32, 128, 64),
    ]
    for name, x, y, w, h, tw, th in tile_map:
        cell = _crop(tiles, x * scale, y * scale, w * scale, h * scale)
        if scale == 1:
            cell = cell.resize((tw, th), Image.Resampling.NEAREST)
        cell.save(SRC / name)

    print(f"wrote {len(required_files())} source PNGs to {SRC}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--seed-from-public",
        action="store_true",
        help="Extract source PNGs from public/sprites/1942 (1× or 2×), then exit",
    )
    ap.add_argument(
        "--seed-and-pack",
        action="store_true",
        help="Seed from public (if sources missing) then pack atlases",
    )
    args = ap.parse_args()

    if args.seed_from_public:
        seed_from_public()
        return

    if args.seed_and_pack:
        if missing_sources():
            seed_from_public()
        pack()
        return

    pack()


if __name__ == "__main__":
    main()
