#!/usr/bin/env python3
"""Paint high-detail VIPER Frogger sprite sheets (PIL).

Outputs (2× paint, runtime scales down):
  public/sprites/frogger/viper.png      768×192  (8×2 cells of 96×96)
  public/sprites/frogger/vehicles.png  768×128  (car / truck strip)
  public/sprites/frogger/platforms.png 768×96   (toxic rafts / barrels)
  public/sprites/frogger/world.png     640×200  (tiles, dens, fx)

Regen: python3 scripts/build-frogger-atlases.py
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "sprites" / "frogger"
OUT.mkdir(parents=True, exist_ok=True)

# VIPER palette
PINK = (255, 45, 149, 255)
PINK_D = (180, 20, 100, 255)
PINK_H = (255, 140, 200, 255)
TEAL = (45, 226, 230, 255)
TEAL_D = (20, 140, 150, 255)
TEAL_H = (160, 245, 250, 255)
BLK = (12, 12, 18, 255)
GRY = (40, 42, 52, 255)
GRY_H = (70, 74, 88, 255)
SKIN = (232, 196, 160, 255)
SKIN_D = (190, 150, 120, 255)
HAIR = (18, 18, 22, 255)
ROAD = (28, 28, 36, 255)
ROAD_L = (48, 48, 58, 255)
WATER = (8, 36, 58, 255)
WATER_H = (18, 70, 95, 255)
SAFE = (32, 18, 48, 255)
GOAL_BG = (8, 28, 20, 255)
WOOD = (58, 36, 22, 255)
WOOD_H = (98, 62, 36, 255)
WOOD_D = (36, 22, 14, 255)
YEL = (255, 229, 102, 255)
WHT = (240, 244, 250, 255)
OUTL = (8, 8, 12, 255)


def new(w: int, h: int) -> Image.Image:
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def p(im: Image.Image, x: int, y: int, c: tuple[int, int, int, int]) -> None:
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), c)


def ellipse(im: Image.Image, cx: int, cy: int, rx: int, ry: int, c: tuple) -> None:
    for y in range(cy - ry, cy + ry + 1):
        for x in range(cx - rx, cx + rx + 1):
            if rx and ry and ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                p(im, x, y, c)


def poly(im: Image.Image, pts: list[tuple[int, int]], c: tuple) -> None:
    layer = new(im.width, im.height)
    ImageDraw.Draw(layer).polygon(pts, fill=c)
    im.alpha_composite(layer)


def rect(im: Image.Image, x0: int, y0: int, x1: int, y1: int, c: tuple) -> None:
    for y in range(y0, y1):
        for x in range(x0, x1):
            p(im, x, y, c)


def outline_rect(im: Image.Image, x0: int, y0: int, x1: int, y1: int, c: tuple = OUTL) -> None:
    for x in range(x0, x1):
        p(im, x, y0, c)
        p(im, x, y1 - 1, c)
    for y in range(y0, y1):
        p(im, x0, y, c)
        p(im, x1 - 1, y, c)


def soft_glow(im: Image.Image, color: tuple, passes: int = 1) -> Image.Image:
    """Expand neon edges slightly for CRT punch."""
    out = im.copy()
    for _ in range(passes):
        blur = out.filter(ImageFilter.MaxFilter(3))
        glow = new(im.width, im.height)
        px = blur.load()
        gp = glow.load()
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, a = px[x, y]
                if a > 40:
                    gp[x, y] = (color[0], color[1], color[2], min(90, a // 3))
        out = Image.alpha_composite(glow, out)
    return out


def blit(dst: Image.Image, src: Image.Image, x: int, y: int) -> None:
    dst.alpha_composite(src, (x, y))


# ─── VIPER character (96×96 cell) ───────────────────────────────────────────

def paint_viper(facing: str = "n", hop: bool = False, frame: int = 0, pose: str = "idle") -> Image.Image:
    S = 96
    im = new(S, S)
    cx, cy = 48, 52

    bob = 0
    if pose == "idle":
        bob = (0, -1, 0, 1)[frame % 4]
    elif pose == "hop":
        bob = -10
    elif pose == "splash":
        bob = 4 + frame * 2
    elif pose == "dead":
        bob = 6
    elif pose == "den":
        bob = -2

    cy += bob

    # shadow
    ellipse(im, cx, 82, 16, 5, (0, 0, 0, 90))

    # legs / shoes
    if pose != "splash":
        lx = cx - 10
        rx = cx + 4
        if facing == "e":
            lx, rx = cx - 4, cx + 8
        elif facing == "w":
            lx, rx = cx - 14, cx - 2
        if hop:
            if facing in ("n", "s"):
                lx -= 3
                rx += 3
            elif facing == "e":
                lx += 4
                rx += 6
            else:
                lx -= 6
                rx -= 4
        for ox in (lx, rx):
            rect(im, ox, cy + 18, ox + 8, cy + 28, BLK)
            rect(im, ox, cy + 26, ox + 8, cy + 30, PINK if ox == lx else TEAL)

    # hoodie body
    body_y0 = cy - 2
    body_y1 = cy + 20
    if pose == "dead":
        # slumped
        poly(im, [(cx - 16, body_y0 + 8), (cx + 16, body_y0 + 6), (cx + 14, body_y1), (cx - 14, body_y1)], BLK)
    else:
        poly(
            im,
            [
                (cx - 15, body_y0),
                (cx + 15, body_y0),
                (cx + 17, body_y1 - 4),
                (cx + 12, body_y1),
                (cx - 12, body_y1),
                (cx - 17, body_y1 - 4),
            ],
            BLK,
        )
    # neon side panels
    rect(im, cx - 15, body_y0 + 2, cx - 9, body_y1 - 2, PINK)
    rect(im, cx - 15, body_y0 + 2, cx - 13, body_y0 + 8, PINK_H)
    rect(im, cx + 9, body_y0 + 2, cx + 15, body_y1 - 2, TEAL)
    rect(im, cx + 13, body_y0 + 2, cx + 15, body_y0 + 8, TEAL_H)
    # hoodie pocket / crease
    rect(im, cx - 6, body_y0 + 10, cx + 6, body_y0 + 11, GRY)

    # cobra emblem
    poly(
        im,
        [(cx, body_y0 + 4), (cx + 5, body_y0 + 14), (cx, body_y0 + 11), (cx - 5, body_y0 + 14)],
        TEAL,
    )
    p(im, cx, body_y0 + 7, TEAL_H)

    # arms
    if pose == "hop":
        if facing == "n":
            rect(im, cx - 20, body_y0 + 2, cx - 14, body_y0 + 14, BLK)
            rect(im, cx + 14, body_y0 + 2, cx + 20, body_y0 + 14, BLK)
        elif facing == "s":
            rect(im, cx - 18, body_y0 + 6, cx - 12, body_y0 + 16, BLK)
            rect(im, cx + 12, body_y0 + 6, cx + 18, body_y0 + 16, BLK)
        elif facing == "e":
            rect(im, cx + 14, body_y0, cx + 28, body_y0 + 8, BLK)
            rect(im, cx + 26, body_y0 + 2, cx + 30, body_y0 + 6, SKIN)
        else:
            rect(im, cx - 28, body_y0, cx - 14, body_y0 + 8, BLK)
            rect(im, cx - 30, body_y0 + 2, cx - 26, body_y0 + 6, SKIN)
    else:
        rect(im, cx - 18, body_y0 + 4, cx - 14, body_y0 + 16, BLK)
        rect(im, cx + 14, body_y0 + 4, cx + 18, body_y0 + 16, BLK)
        rect(im, cx - 18, body_y0 + 14, cx - 12, body_y0 + 18, SKIN)
        rect(im, cx + 12, body_y0 + 14, cx + 18, body_y0 + 18, SKIN)

    # head
    hx, hy = cx, cy - 16
    if facing == "e":
        hx += 3
    elif facing == "w":
        hx -= 3
    elif facing == "s":
        hy += 1
    ellipse(im, hx, hy, 11, 12, SKIN)
    ellipse(im, hx - 2, hy + 2, 9, 10, SKIN_D)

    # hair / beanie
    poly(
        im,
        [
            (hx - 12, hy - 2),
            (hx + 12, hy - 2),
            (hx + 11, hy - 14),
            (hx + 4, hy - 18),
            (hx - 4, hy - 18),
            (hx - 11, hy - 14),
        ],
        HAIR,
    )
    # neon beanie stripe
    rect(im, hx - 10, hy - 12, hx + 10, hy - 9, PINK)
    rect(im, hx - 8, hy - 11, hx - 2, hy - 10, PINK_H)

    # headphones
    ImageDraw.Draw(im).arc([hx - 14, hy - 10, hx + 14, hy + 10], 200, 340, fill=PINK, width=3)
    ellipse(im, hx - 13, hy + 1, 4, 5, PINK)
    ellipse(im, hx + 13, hy + 1, 4, 5, TEAL)
    ellipse(im, hx - 13, hy + 1, 2, 3, PINK_H)
    ellipse(im, hx + 13, hy + 1, 2, 3, TEAL_H)

    # face
    if pose == "dead":
        # X eyes
        for dx in (-4, 4):
            for t in range(-2, 3):
                p(im, hx + dx + t, hy - 1 + t, PINK)
                p(im, hx + dx + t, hy - 1 - t, PINK)
    elif pose == "splash":
        ellipse(im, hx - 4, hy, 2, 3, BLK)
        ellipse(im, hx + 4, hy, 2, 3, BLK)
        # open mouth
        ellipse(im, hx, hy + 6, 3, 4, BLK)
    else:
        # eyes toward facing
        ex = 0
        if facing == "e":
            ex = 2
        elif facing == "w":
            ex = -2
        ellipse(im, hx - 4 + ex, hy, 2, 3, BLK)
        ellipse(im, hx + 4 + ex, hy, 2, 3, BLK)
        p(im, hx - 4 + ex, hy - 1, WHT)
        p(im, hx + 4 + ex, hy - 1, WHT)
        # smile / grit
        if hop:
            rect(im, hx - 3, hy + 5, hx + 3, hy + 7, BLK)
        else:
            ImageDraw.Draw(im).arc([hx - 4, hy + 2, hx + 4, hy + 10], 20, 160, fill=BLK, width=1)

    if pose == "splash":
        # toxic splash rings
        for r, col in ((18 + frame * 4, TEAL), (26 + frame * 5, PINK), (34 + frame * 4, TEAL_H)):
            ImageDraw.Draw(im).ellipse(
                [cx - r, 70 - r // 3, cx + r, 78 + r // 3],
                outline=(*col[:3], 160),
                width=2,
            )

    if pose == "den":
        # mini crown of dens
        for i, col in enumerate((PINK, TEAL, PINK)):
            ellipse(im, cx - 10 + i * 10, cy - 34, 3, 3, col)

    return soft_glow(im, PINK if frame % 2 == 0 else TEAL, passes=1)


def build_viper_sheet() -> Image.Image:
    sheet = new(768, 192)
    # row 0: idle ×4, hop n/s/e/w
    for i in range(4):
        blit(sheet, paint_viper("n", False, i, "idle"), i * 96, 0)
    blit(sheet, paint_viper("n", True, 0, "hop"), 4 * 96, 0)
    blit(sheet, paint_viper("s", True, 0, "hop"), 5 * 96, 0)
    blit(sheet, paint_viper("e", True, 0, "hop"), 6 * 96, 0)
    blit(sheet, paint_viper("w", True, 0, "hop"), 7 * 96, 0)
    # row 1: splash ×3, dead, den, life
    for i in range(3):
        blit(sheet, paint_viper("n", False, i, "splash"), i * 96, 96)
    blit(sheet, paint_viper("n", False, 0, "dead"), 3 * 96, 96)
    blit(sheet, paint_viper("n", False, 0, "den"), 4 * 96, 96)
    # life icon (compact)
    life = paint_viper("n", False, 0, "idle")
    life = life.resize((48, 48), Image.Resampling.LANCZOS)
    blit(sheet, life, 5 * 96 + 24, 96 + 24)
    return sheet


# ─── Vehicles ───────────────────────────────────────────────────────────────

def paint_car(kind: str, facing: int, accent: tuple) -> Image.Image:
    """kind: sedan | truck | hotrod | van. facing: 1 right, -1 left."""
    h = 56
    widths = {"sedan": 72, "truck": 96, "hotrod": 64, "van": 84}
    w = widths[kind]
    im = new(w, h)
    accent_h = tuple(min(255, c + 60) for c in accent[:3]) + (255,)
    accent_d = tuple(max(0, c - 50) for c in accent[:3]) + (255,)

    # body
    y0, y1 = 14, 44
    if kind == "truck":
        # cab + trailer
        rect(im, 8, y0, 36, y1, accent_d)
        rect(im, 34, y0 + 4, w - 6, y1, accent)
        rect(im, 36, y0 + 6, w - 10, y0 + 10, accent_h)
        # cab window
        rect(im, 14, y0 + 4, 30, y0 + 16, (30, 40, 55, 255))
        rect(im, 16, y0 + 5, 22, y0 + 10, TEAL_H)
    elif kind == "van":
        rect(im, 6, y0 - 4, w - 6, y1, accent)
        rect(im, 8, y0 - 2, w - 10, y0 + 4, accent_h)
        rect(im, 10, y0 + 6, 28, y0 + 20, (28, 36, 50, 255))
        rect(im, 12, y0 + 8, 18, y0 + 14, WHT)
        # side stripe
        rect(im, 6, 28, w - 6, 32, TEAL if accent[0] > 100 else PINK)
    elif kind == "hotrod":
        poly(im, [(8, 36), (18, 18), (w - 10, 18), (w - 4, 36), (w - 8, 42), (10, 42)], accent)
        rect(im, 22, 20, w - 18, 28, (20, 24, 34, 255))
        rect(im, 24, 21, 30, 26, TEAL_H)
        # flame decal
        poly(im, [(12, 34), (20, 28), (18, 36)], YEL)
    else:  # sedan
        poly(
            im,
            [
                (6, 36),
                (14, 18),
                (w - 20, 18),
                (w - 8, 28),
                (w - 4, 40),
                (8, 42),
            ],
            accent,
        )
        rect(im, 8, 30, w - 8, 34, accent_h)
        # cabin
        poly(im, [(20, 18), (w - 26, 18), (w - 18, 28), (28, 28)], (24, 32, 48, 255))
        rect(im, 24, 20, 34, 26, TEAL_H if accent[2] > 150 else PINK_H)

    # wheels
    for wx in (14, w - 22):
        ellipse(im, wx + 6, 44, 8, 8, BLK)
        ellipse(im, wx + 6, 44, 4, 4, GRY_H)
        p(im, wx + 6, 44, WHT)

    # headlights / taillights (paint right-facing; flip later for left)
    rect(im, w - 8, 30, w - 4, 38, YEL)
    rect(im, 4, 30, 8, 36, PINK_D)

    # chrome bumper
    rect(im, 6, 40, w - 6, 43, GRY_H)
    outline_rect(im, 4, y0 - 2 if kind == "van" else y0, w - 4, y1 + 1)

    if facing < 0:
        im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return soft_glow(im, accent, passes=1)


# Fixed slots — must match src/games/frogger/atlas.ts VEHICLE_RECTS
VEHICLE_SLOTS: list[tuple[str, int, tuple, int, int]] = [
    ("sedan", 1, PINK, 8, 8),
    ("sedan", -1, PINK, 88, 8),
    ("sedan", 1, TEAL, 168, 8),
    ("sedan", -1, TEAL, 248, 8),
    ("truck", 1, PINK, 328, 8),
    ("truck", -1, TEAL, 432, 8),
    ("hotrod", 1, YEL, 536, 8),
    ("hotrod", -1, PINK, 608, 8),
    ("van", 1, TEAL, 8, 68),
    ("van", -1, PINK, 100, 68),
]


def build_vehicles_sheet() -> Image.Image:
    sheet = new(768, 128)
    for kind, facing, accent, x, y in VEHICLE_SLOTS:
        blit(sheet, paint_car(kind, facing, accent), x, y)
    return sheet


# ─── Platforms (toxic rafts) ────────────────────────────────────────────────

def paint_raft(width: int, style: int = 0) -> Image.Image:
    h = 48
    im = new(width, h)
    # barrel / plank body
    for i in range(0, width, 18):
        bw = min(16, width - i - 2)
        shade = WOOD_H if (i // 18 + style) % 2 == 0 else WOOD
        rect(im, i + 1, 8, i + 1 + bw, 40, shade)
        rect(im, i + 2, 10, i + 1 + bw - 1, 14, WOOD_H)
        rect(im, i + 2, 34, i + 1 + bw - 1, 38, WOOD_D)
        # metal band
        rect(im, i + 1, 22, i + 1 + bw, 26, GRY)
        p(im, i + bw // 2, 24, WHT)

    # neon edge trim
    top = PINK if style % 2 == 0 else TEAL
    bot = TEAL if style % 2 == 0 else PINK
    rect(im, 2, 6, width - 2, 9, top)
    rect(im, 2, 39, width - 2, 42, bot)
    # toxic drip
    for dx in range(8, width - 8, 20):
        ellipse(im, dx, 44, 3, 2, (*TEAL[:3], 180))

    # cobra rivets
    for dx in range(12, width - 8, 28):
        ellipse(im, dx, 24, 2, 2, TEAL_H)

    outline_rect(im, 1, 6, width - 1, 42)
    return soft_glow(im, top, passes=1)


def build_platforms_sheet() -> Image.Image:
    sheet = new(768, 96)
    widths = [56, 64, 72, 80, 88, 96, 112, 128]
    x = 8
    for i, w in enumerate(widths):
        raft = paint_raft(w, i)
        blit(sheet, raft, x, 24)
        x += w + 8
    return sheet


# ─── World tiles ────────────────────────────────────────────────────────────

def paint_water(variant: int) -> Image.Image:
    im = new(64, 40)
    base = WATER if variant % 2 == 0 else WATER_H
    rect(im, 0, 0, 64, 40, base)
    for i in range(6):
        y = 6 + i * 6 + (variant % 3)
        col = TEAL if i % 2 == 0 else (*TEAL_D[:3], 120)
        for x in range(0, 64, 8):
            ox = (x + variant * 3 + i * 5) % 64
            p(im, ox, y, col)
            p(im, (ox + 1) % 64, y, (*col[:3], 80) if len(col) == 4 else col)
    # toxic sheen
    for x in range(0, 64, 16):
        ellipse(im, x + 8, 20 + (variant % 2) * 4, 10, 3, (*TEAL[:3], 40))
    return im


def paint_road(variant: int) -> Image.Image:
    im = new(64, 40)
    rect(im, 0, 0, 64, 40, ROAD if variant % 2 == 0 else ROAD_L)
    # lane dash
    for x in range(4, 64, 16):
        rect(im, x, 18, x + 8, 21, (*WHT[:3], 50))
    # curb grit
    for x in range(0, 64, 3):
        if (x + variant) % 5 == 0:
            p(im, x, 2, GRY)
            p(im, x, 37, GRY)
    return im


def paint_safe(variant: int) -> Image.Image:
    im = new(64, 40)
    rect(im, 0, 0, 64, 40, SAFE)
    for x in range(0, 64, 16):
        rect(im, x, 34, x + 8, 37, (*PINK[:3], 90))
        rect(im, x + 8, 4, x + 12, 7, (*TEAL[:3], 70))
    # grid dots
    for y in range(8, 32, 8):
        for x in range(8, 60, 12):
            p(im, x + variant, y, (*PINK[:3], 60))
    return im


def paint_den(filled: bool) -> Image.Image:
    im = new(80, 40)
    rect(im, 4, 4, 76, 36, GOAL_BG if not filled else (*TEAL_D[:3], 255))
    # cobra den arch
    ImageDraw.Draw(im).arc([12, 2, 68, 48], 200, 340, fill=PINK if not filled else TEAL, width=3)
    # fangs / posts
    rect(im, 18, 18, 24, 36, PINK_D)
    rect(im, 56, 18, 62, 36, TEAL_D)
    if filled:
        # neon fill glow
        ellipse(im, 40, 22, 14, 10, (*TEAL[:3], 80))
        # check mark
        for t in range(6):
            p(im, 32 + t, 24 + t, TEAL_H)
        for t in range(10):
            p(im, 38 + t, 30 - t, TEAL_H)
    else:
        # DEN label pixels
        for dx, ch in enumerate("DEN"):
            # simple block letters
            bx = 28 + dx * 10
            rect(im, bx, 18, bx + 7, 28, PINK)
            rect(im, bx + 1, 19, bx + 6, 27, GOAL_BG)
        rect(im, 29, 19, 34, 21, PINK)
        rect(im, 39, 19, 44, 21, PINK)
        rect(im, 49, 19, 54, 21, PINK)
    outline_rect(im, 4, 4, 76, 36, PINK if not filled else TEAL)
    return soft_glow(im, TEAL if filled else PINK, passes=1)


def paint_goal_bank() -> Image.Image:
    im = new(64, 40)
    rect(im, 0, 0, 64, 40, (10, 24, 18, 255))
    for x in range(0, 64, 8):
        h = 12 + (x * 3) % 10
        rect(im, x, 40 - h, x + 6, 40, (20, 60, 40, 255))
        p(im, x + 2, 40 - h, TEAL)
    return im


def build_world_sheet() -> Image.Image:
    sheet = new(640, 200)
    # water variants
    for i in range(4):
        blit(sheet, paint_water(i), i * 64, 0)
    # road
    for i in range(4):
        blit(sheet, paint_road(i), i * 64, 40)
    # safe
    for i in range(4):
        blit(sheet, paint_safe(i), i * 64, 80)
    # dens
    blit(sheet, paint_den(False), 0, 120)
    blit(sheet, paint_den(True), 80, 120)
    blit(sheet, paint_goal_bank(), 160, 120)
    # time bar / hud chrome scrap
    bar = new(120, 16)
    rect(bar, 0, 0, 120, 16, BLK)
    rect(bar, 2, 2, 118, 14, GRY)
    rect(bar, 4, 4, 80, 12, TEAL)
    rect(bar, 4, 4, 20, 8, TEAL_H)
    blit(sheet, bar, 240, 128)
    return sheet


def main() -> None:
    sheets = {
        "viper.png": build_viper_sheet(),
        "vehicles.png": build_vehicles_sheet(),
        "platforms.png": build_platforms_sheet(),
        "world.png": build_world_sheet(),
    }
    for name, im in sheets.items():
        path = OUT / name
        im.save(path, "PNG")
        print(f"wrote {path.relative_to(ROOT)} ({im.width}×{im.height})")


if __name__ == "__main__":
    main()
