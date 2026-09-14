#!/usr/bin/env python3
"""LEGACY 1× PIL painter — superseded by scripts/pack-1942-atlases.py.

Prefer AI drop-ins under assets/source/1942/ + pack-1942-atlases.py.
This script still writes 1× sheets (384×288 planes, etc.) for reference only;
runtime atlas.ts expects 2× sheets from the packer.

Layout (legacy 1×):
  planes.png  384×288 (8×6 cells of 48×48)
  bomber.png  288×36  (4 frames of 72×36)
  fx.png      192×192
  tiles.png   192×192
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "sprites" / "1942"
OUT.mkdir(parents=True, exist_ok=True)

OUTL = (12, 14, 20, 255)
P_HI = (236, 240, 248, 255); P_M = (176, 184, 198, 255); P_L = (98, 108, 124, 255); P_D = (52, 58, 70, 255)
P_GL = (70, 150, 210, 255); P_GH = (170, 220, 250, 255); P_RD = (220, 36, 44, 255)
P_EX = (255, 190, 70, 255); P_EX2 = (255, 70, 30, 255)
G_H = (140, 210, 110, 255); G_M = (60, 150, 70, 255); G_L = (30, 90, 42, 255); G_W = (44, 120, 54, 255); G_N = (220, 210, 90, 255)
R_H = (255, 140, 120, 255); R_M = (210, 36, 40, 255); R_L = (130, 18, 28, 255); R_W = (170, 30, 34, 255)
Y_H = (255, 235, 140, 255); Y_M = (220, 170, 40, 255); Y_L = (150, 100, 24, 255)
B_H = (210, 200, 170, 255); B_M = (150, 140, 110, 255); B_L = (86, 78, 60, 255); B_G = (55, 105, 145, 255)
SEA = [(18, 60, 140, 255), (26, 82, 168, 255), (34, 108, 190, 255), (48, 130, 205, 255), (60, 148, 215, 255)]
FOAM = (200, 220, 235, 255)


def new(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def p(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), c)


def ellipse(im, cx, cy, rx, ry, c):
    for y in range(cy - ry, cy + ry + 1):
        for x in range(cx - rx, cx + rx + 1):
            if rx and ry and ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                p(im, x, y, c)


def poly(im, pts, c):
    layer = new(im.width, im.height)
    ImageDraw.Draw(layer).polygon(pts, fill=c)
    im.alpha_composite(layer)


def line(im, x0, y0, x1, y1, c):
    layer = new(im.width, im.height)
    ImageDraw.Draw(layer).line([(x0, y0), (x1, y1)], fill=c, width=1)
    im.alpha_composite(layer)


def blit(d, s, x, y):
    d.alpha_composite(s, (x, y))


def _player_body(bank=0):
    S = 48
    im = new(S, S)
    dx = bank * (-2)
    sk = bank * (-3)
    for bx0 in (12 + dx, 30 + dx):
        for y in range(8, 40):
            for x in range(bx0, bx0 + 6):
                t = (x - bx0) / 5
                if t < 0.25:
                    c = P_L
                elif t < 0.5:
                    c = P_HI
                elif t < 0.75:
                    c = P_M
                else:
                    c = P_D
                if y > 34:
                    c = P_D
                if y < 10:
                    c = P_HI if t < 0.6 else P_M
                p(im, x, y, c)
        for y in range(8, 40):
            p(im, bx0 - 1, y, OUTL)
            p(im, bx0 + 6, y, OUTL)
        ellipse(im, bx0 + 2, 6, 3, 3, P_M)
        ellipse(im, bx0 + 2, 5, 2, 2, P_RD)
        p(im, bx0 + 2, 3, P_HI)
        p(im, bx0 + 1, 40, P_EX)
        p(im, bx0 + 2, 40, P_EX2)
        p(im, bx0 + 3, 40, P_EX)
        p(im, bx0 + 2, 41, P_EX2)
        p(im, bx0 + 2, 42, P_EX2)
    ellipse(im, 24 + dx, 22, 6, 12, P_M)
    ellipse(im, 24 + dx, 20, 5, 10, P_HI)
    ellipse(im, 24 + dx, 18, 4, 6, P_M)
    ellipse(im, 24 + dx, 14, 3, 5, P_GL)
    ellipse(im, 24 + dx, 13, 2, 3, P_GH)
    p(im, 24 + dx, 12, P_HI)
    for y in range(18, 30):
        p(im, 24 + dx, y, P_RD)
        p(im, 23 + dx, y, P_RD)
    poly(im, [(4 + sk, 22), (44 + sk, 22), (42 + sk, 28), (6 + sk, 28)], P_M)
    poly(im, [(6 + sk, 22), (42 + sk, 22), (40 + sk, 24), (8 + sk, 24)], P_HI)
    poly(im, [(2 + sk, 24), (6 + sk, 22), (6 + sk, 28)], P_L)
    poly(im, [(46 + sk, 24), (42 + sk, 22), (42 + sk, 28)], P_L)
    for gx in (8 + sk, 40 + sk):
        p(im, gx, 21, P_D)
        p(im, gx, 20, P_L)
    poly(im, [(16 + dx, 38), (32 + dx, 38), (30 + dx, 42), (18 + dx, 42)], P_M)
    poly(im, [(18 + dx, 38), (30 + dx, 38), (28 + dx, 40), (20 + dx, 40)], P_HI)
    for bx0 in (12 + dx, 30 + dx):
        poly(im, [(bx0 + 1, 36), (bx0 + 5, 36), (bx0 + 3, 44)], P_L)
        p(im, bx0 + 3, 37, P_RD)
    if bank != 0:
        far = 4 + sk if bank > 0 else 38 + sk
        for y in range(22, 28):
            for x in range(far, far + 4):
                p(im, x, y, P_D)
    return im


def player(bank=0, loop=-1):
    S = 48
    im = new(S, S)
    if loop >= 0:
        scales = [(1, 1), (0.9, 0.75), (0.6, 0.45), (0.4, 0.55), (0.75, 0.9), (1, 1)]
        sx, sy = scales[loop % 6]
        base = _player_body(0)
        tw, th = max(2, int(S * sx)), max(2, int(S * sy))
        sc = base.resize((tw, th), Image.Resampling.NEAREST)
        if 0.35 < loop / 6 < 0.8:
            sc = sc.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        blit(im, sc, (S - tw) // 2, (S - th) // 2)
        return im
    return _player_body(bank)


def enemy_green(f=0):
    im = new(40, 40)
    w = f % 2
    poly(im, [(20, 36), (14, 10), (26, 10)], G_M)
    poly(im, [(20, 34), (15, 12), (25, 12)], G_H)
    ellipse(im, 20, 16, 3, 4, G_L)
    p(im, 20, 15, G_N)
    poly(im, [(4, 16 + w), (36, 16 - w), (34, 22 - w), (6, 22 + w)], G_W)
    poly(im, [(8, 16 + w), (32, 16 - w), (30, 18), (10, 18)], G_H)
    poly(im, [(2, 18), (6, 16 + w), (6, 22 + w)], G_L)
    poly(im, [(38, 18), (34, 16 - w), (34, 22 - w)], G_L)
    poly(im, [(17, 8), (23, 8), (20, 3)], G_L)
    line(im, 20, 12, 20, 30, G_L)
    p(im, 20, 36, G_N)
    p(im, 20, 37, OUTL)
    return im


def enemy_red(f=0):
    im = new(40, 40)
    w = f % 2
    poly(im, [(20, 36), (13, 9), (27, 9)], R_M)
    poly(im, [(20, 34), (15, 11), (25, 11)], R_H)
    ellipse(im, 20, 15, 3, 4, R_L)
    poly(im, [(3, 15 + w), (37, 15 - w), (35, 21 - w), (5, 21 + w)], R_W)
    poly(im, [(7, 15 + w), (33, 15 - w), (31, 17), (9, 17)], R_H)
    poly(im, [(17, 7), (23, 7), (20, 2)], R_L)
    for x in range(14, 27):
        p(im, x, 19, P_HI)
    return im


def enemy_yellow(f=0):
    im = new(40, 40)
    w = -(f % 2)
    poly(im, [(20, 37), (14, 8), (26, 8)], Y_M)
    poly(im, [(20, 35), (15, 10), (25, 10)], Y_H)
    ellipse(im, 20, 14, 3, 3, Y_L)
    poly(im, [(5, 14 + w), (35, 14 - w), (33, 20), (7, 20)], Y_L)
    poly(im, [(8, 14 + w), (32, 14 - w), (30, 16), (10, 16)], Y_H)
    poly(im, [(17, 6), (23, 6), (20, 1)], Y_M)
    return im


def bomber_small(f=0):
    im = new(48, 40)
    poly(im, [(2, 16), (46, 16), (44, 24), (4, 24)], B_M)
    poly(im, [(4, 16), (44, 16), (42, 18), (6, 18)], B_H)
    ellipse(im, 24, 18, 6, 12, B_M)
    ellipse(im, 24, 16, 5, 10, B_H)
    ellipse(im, 24, 10, 3, 4, B_G)
    p(im, 24, 9, P_GH)
    for ex in (10, 38):
        ellipse(im, ex, 18, 3, 4, B_L)
        if f % 2 == 0:
            p(im, ex - 2, 14, P_HI)
            p(im, ex + 2, 14, P_HI)
        else:
            p(im, ex, 13, P_HI)
            p(im, ex, 15, P_HI)
    poly(im, [(20, 30), (28, 30), (26, 36), (22, 36)], B_L)
    poly(im, [(14, 28), (34, 28), (32, 32), (16, 32)], B_M)
    return im


def wide_bomber(f=0):
    im = new(72, 36)
    poly(im, [(2, 12), (70, 12), (66, 22), (6, 22)], B_M)
    poly(im, [(6, 12), (66, 12), (62, 15), (10, 15)], B_H)
    ellipse(im, 36, 16, 8, 12, B_M)
    ellipse(im, 36, 14, 6, 10, B_H)
    ellipse(im, 36, 8, 4, 4, B_G)
    for ex in (14, 24, 48, 58):
        ellipse(im, ex, 16, 3, 4, B_L)
        if f % 2:
            p(im, ex, 11, P_HI)
            p(im, ex, 13, P_D)
        else:
            p(im, ex - 2, 12, P_HI)
            p(im, ex + 2, 12, P_HI)
    poly(im, [(30, 28), (42, 28), (40, 34), (32, 34)], B_L)
    ellipse(im, 36, 18, 3, 2, B_L)
    return im


def bullet(player=True):
    im = new(16, 24)
    if player:
        for y in range(2, 20):
            p(im, 7, y, (255, 255, 200, 255))
            p(im, 8, y, (255, 255, 255, 255))
            p(im, 9, y, (255, 255, 200, 255))
        p(im, 8, 1, (255, 255, 255, 255))
        p(im, 8, 20, P_EX)
    else:
        poly(im, [(8, 2), (12, 12), (8, 22), (4, 12)], (255, 70, 70, 255))
        p(im, 8, 12, (255, 200, 80, 255))
    return im


def dual_bullet():
    im = new(24, 24)
    for ox in (4, 16):
        for y in range(2, 20):
            p(im, ox, y, (255, 255, 210, 255))
            p(im, ox + 1, y, (255, 255, 255, 255))
    return im


def explosion(frame):
    im = new(48, 48)
    radii = [4, 8, 12, 16, 18, 14, 8, 3]
    cols = [
        (255, 255, 220, 255),
        (255, 230, 80, 255),
        (255, 170, 40, 255),
        (255, 90, 20, 255),
        (200, 50, 20, 255),
        (140, 40, 20, 255),
        (80, 30, 20, 255),
        (40, 20, 16, 255),
    ]
    r = radii[frame % 8]
    c = cols[frame % 8]
    ellipse(im, 24, 24, r, r, c)
    if frame < 5:
        ellipse(im, 24, 24, max(1, r - 4), max(1, r - 4), (255, 255, 240, 255))
    for i in range(8):
        a = i * math.pi / 4
        sx = int(24 + math.cos(a) * (r + 2))
        sy = int(24 + math.sin(a) * (r + 2))
        if frame < 6:
            p(im, sx, sy, (255, 255, 200, 255))
    return im


def pow_icon():
    im = new(20, 20)
    ellipse(im, 10, 10, 9, 9, (255, 120, 40, 255))
    ellipse(im, 10, 10, 8, 8, (24, 24, 48, 255))
    for y in range(5, 16):
        p(im, 6, y, (255, 220, 60, 255))
        p(im, 7, y, (255, 220, 60, 255))
    for x in range(6, 13):
        p(im, x, 5, (255, 220, 60, 255))
        p(im, x, 10, (255, 220, 60, 255))
    for y in range(6, 10):
        p(im, 13, y, (255, 220, 60, 255))
    return im


def ocean():
    im = new(96, 96)
    for y in range(96):
        for x in range(96):
            band = (y // 5) % 5
            c = SEA[band]
            n = (x * 3 + y * 5) % 31
            if n == 0:
                c = SEA[min(4, band + 1)]
            if n == 7:
                c = SEA[max(0, band - 1)]
            wave = math.sin((x + y * 0.4) * 0.35) * 2
            if abs((y % 16) - 8 - wave) < 0.8 and (x + y) % 2 == 0:
                c = FOAM if band >= 3 else SEA[4]
            p(im, x, y, c)
    return im


def island():
    im = new(80, 60)
    ellipse(im, 40, 30, 36, 24, (210, 190, 130, 255))
    ellipse(im, 40, 30, 32, 21, (50, 130, 50, 255))
    ellipse(im, 28, 24, 12, 10, (34, 100, 40, 255))
    ellipse(im, 52, 34, 11, 9, (34, 100, 40, 255))
    ellipse(im, 40, 28, 8, 6, (28, 80, 32, 255))
    ellipse(im, 22, 36, 5, 3, (95, 85, 65, 255))
    ellipse(im, 58, 20, 4, 3, (95, 85, 65, 255))
    for tx, ty in [(30, 22), (34, 26), (48, 32), (44, 20), (36, 34)]:
        ellipse(im, tx, ty, 2, 2, (20, 70, 28, 255))
    for t in range(0, 360, 2):
        a = math.radians(t)
        x = int(40 + 35 * math.cos(a))
        y = int(30 + 23 * math.sin(a))
        if t % 4 == 0:
            p(im, x, y, FOAM)
    return im


def cloud(k=0):
    im = new(64, 32)
    if k == 0:
        ellipse(im, 20, 16, 16, 10, (240, 244, 250, 190))
        ellipse(im, 36, 14, 14, 9, (240, 244, 250, 200))
        ellipse(im, 28, 18, 12, 8, (200, 210, 230, 150))
    else:
        ellipse(im, 28, 16, 22, 9, (200, 210, 230, 150))
        ellipse(im, 16, 14, 10, 6, (240, 244, 250, 180))
        ellipse(im, 40, 18, 12, 7, (240, 244, 250, 170))
    return im


def main():
    CW, CH = 48, 48
    planes = new(8 * CW, 6 * CH)
    frames = [player(0), player(-1), player(1)] + [player(0, i) for i in range(5)]
    for i, fr in enumerate(frames):
        blit(planes, fr, i * CW, 0)
    blit(planes, player(0, 5), 0, CH)
    for i in range(4):
        blit(planes, enemy_green(i), i * CW + 4, 2 * CH + 4)
        blit(planes, enemy_red(i), i * CW + 4, 3 * CH + 4)
        blit(planes, enemy_yellow(i), i * CW + 4, 4 * CH + 4)
        blit(planes, bomber_small(i), i * CW, 5 * CH + 4)
    planes.save(OUT / "planes.png")

    bomber = new(72 * 4, 36)
    for i in range(4):
        blit(bomber, wide_bomber(i), i * 72, 0)
    bomber.save(OUT / "bomber.png")

    fx = new(192, 192)
    blit(fx, bullet(True), 0, 0)
    blit(fx, bullet(False), 16, 0)
    blit(fx, dual_bullet(), 32, 0)
    blit(fx, pow_icon(), 0, 24)
    blit(fx, player(0).resize((16, 16), Image.Resampling.NEAREST), 24, 24)
    for i in range(8):
        blit(fx, explosion(i), (i % 4) * 48, 48 + (i // 4) * 48)
    fx.save(OUT / "fx.png")

    tiles = new(192, 192)
    blit(tiles, ocean(), 0, 0)
    blit(tiles, ocean().transpose(Image.Transpose.FLIP_LEFT_RIGHT), 96, 0)
    blit(tiles, island(), 0, 96)
    blit(tiles, cloud(0), 96, 96)
    blit(tiles, cloud(1), 96, 128)
    tiles.save(OUT / "tiles.png")
    print(f"wrote atlases to {OUT}")


if __name__ == "__main__":
    main()
