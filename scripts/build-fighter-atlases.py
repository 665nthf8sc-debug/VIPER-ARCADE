#!/usr/bin/env python3
"""Slice Venice VIPER / PEELY sheets into game atlases (4×8 cells)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "source"
OUT = ROOT / "public" / "sprites"

COLS, ROWS = 6, 3
# Drawn size in the 320×180 fighter buffer (feet-anchored)
CELL_W, CELL_H = 72, 96
ATLAS_COLS, ATLAS_ROWS = 4, 8

# Source sheet indices (row, col) → atlas clip rows
# Atlas rows: idle, walk, punch, kick, special, hit, jump, portrait
VIPER_MAP = {
    "idle": [(1, 2), (1, 3), (1, 5), (1, 4)],
    "walk": [(0, 1), (0, 2), (0, 0), (2, 0)],
    "punch": [(2, 0), (1, 2)],
    "kick": [(2, 2), (2, 3)],
    "special": [(1, 0), (2, 1)],
    "hit": [(2, 1), (1, 1)],
    "jump": [(2, 3), (2, 2)],
    "portrait": [(0, 3)],
}

# Prefer naked banana combat frames; costume flashes for special / portrait
PEELY_MAP = {
    "idle": [(2, 4), (2, 5), (1, 4), (0, 5)],
    "walk": [(1, 2), (2, 2), (2, 1), (1, 0)],
    "punch": [(0, 4), (1, 4)],
    "kick": [(1, 0), (2, 1)],
    "special": [(1, 3), (2, 3)],
    "hit": [(1, 1), (1, 0)],
    "jump": [(2, 0), (1, 0)],
    "portrait": [(0, 0)],
}

CLIP_ORDER = ["idle", "walk", "punch", "kick", "special", "hit", "jump", "portrait"]


def is_bg(r: int, g: int, b: int, a: int = 255) -> bool:
    if a < 20:
        return True
    # Near-white / light gray checkerboard (low chroma, high luma)
    mx, mn = max(r, g, b), min(r, g, b)
    if mx - mn <= 18 and mx >= 228:
        return True
    if mx - mn <= 12 and mx >= 210:
        return True
    return False


def key_background(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_bg(r, g, b, a):
                px[x, y] = (0, 0, 0, 0)
    return im


def flood_clean_edges(im: Image.Image, tol: int = 24) -> Image.Image:
    """Remove residual edge bg via flood from borders."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    visited = [[False] * w for _ in range(h)]
    stack: list[tuple[int, int]] = []

    def seed(x: int, y: int) -> None:
        r, g, b, a = px[x, y]
        if a == 0 or is_bg(r, g, b, a) or (max(r, g, b) - min(r, g, b) <= tol and max(r, g, b) >= 200):
            stack.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        r, g, b, a = px[x, y]
        if a == 0:
            pass
        elif is_bg(r, g, b, a) or (max(r, g, b) - min(r, g, b) <= tol and max(r, g, b) >= 195):
            px[x, y] = (0, 0, 0, 0)
        else:
            continue
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im


def content_bbox(im: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = im.split()[-1]
    return alpha.getbbox()


def extract_cell(sheet: Image.Image, row: int, col: int) -> Image.Image:
    w, h = sheet.size
    cw, ch = w // COLS, h // ROWS
    # small inset to avoid grid seams
    pad = 2
    box = (col * cw + pad, row * ch + pad, (col + 1) * cw - pad, (row + 1) * ch - pad)
    cell = sheet.crop(box)
    cell = key_background(cell)
    cell = flood_clean_edges(cell)
    bb = content_bbox(cell)
    if not bb:
        return Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    cropped = cell.crop(bb)
    # Fit into CELL keeping aspect, feet toward bottom
    cw0, ch0 = cropped.size
    scale = min(CELL_W / cw0, CELL_H / ch0)
    nw, nh = max(1, int(cw0 * scale)), max(1, int(ch0 * scale))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    ox = (CELL_W - nw) // 2
    oy = CELL_H - nh  # feet on bottom
    out.paste(resized, (ox, oy), resized)
    return out


def build_atlas(sheet_path: Path, mapping: dict) -> Image.Image:
    sheet = Image.open(sheet_path).convert("RGBA")
    atlas = Image.new("RGBA", (CELL_W * ATLAS_COLS, CELL_H * ATLAS_ROWS), (0, 0, 0, 0))
    for row_i, clip in enumerate(CLIP_ORDER):
        frames = mapping[clip]
        for col_i, (sr, sc) in enumerate(frames):
            if col_i >= ATLAS_COLS:
                break
            cell = extract_cell(sheet, sr, sc)
            atlas.paste(cell, (col_i * CELL_W, row_i * CELL_H), cell)
        # pad missing cols with last frame
        if frames:
            last = extract_cell(sheet, frames[-1][0], frames[-1][1])
            for col_i in range(len(frames), ATLAS_COLS):
                atlas.paste(last, (col_i * CELL_W, row_i * CELL_H), last)
    return atlas


def write_stage() -> None:
    """Seamless neon-alley tile used by drawScrollingStage."""
    from PIL import ImageDraw

    w, h = 384, 180
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for y in range(0, 96):
        t = y / 96
        d.line(
            [(0, y), (w, y)],
            fill=(int(12 + t * 36), int(8 + t * 18), int(28 + t * 55), 255),
        )
    for sx, sy in [
        (20, 12),
        (55, 28),
        (90, 8),
        (140, 22),
        (180, 15),
        (230, 30),
        (280, 10),
        (320, 25),
        (360, 18),
    ]:
        d.point((sx, sy), fill=(255, 220, 255, 180))
    buildings = [
        (0, 40, 48),
        (40, 55, 62),
        (78, 32, 44),
        (118, 48, 70),
        (170, 36, 50),
        (214, 52, 58),
        (260, 30, 42),
        (300, 46, 66),
        (340, 38, 52),
        (370, 28, 40),
    ]
    for i, (x, bw, bh) in enumerate(buildings):
        top = 96 - bh
        base_c = (22 + (i % 4) * 4, 16 + (i % 3) * 3, 40 + (i % 5) * 5, 255)
        d.rectangle([x, top, min(x + bw, w), 96], fill=base_c)
        for wy in range(top + 5, 92, 9):
            for wx in range(x + 4, x + bw - 4, 8):
                if wx >= w:
                    break
                if (wx * 3 + wy + i) % 4:
                    glow = (
                        (255, 70 + ((wx * 5) % 100), 150, 210)
                        if (wx + i) % 2
                        else (255, 200, 80, 180)
                    )
                    d.rectangle([wx, wy, wx + 2, wy + 3], fill=glow)
    d.rectangle([0, 96, w, 148], fill=(48, 34, 44, 255))
    for by in range(96, 148, 8):
        offset = 0 if ((by - 96) // 8) % 2 == 0 else 10
        for bx in range(-10 + offset, w + 10, 20):
            d.rectangle([bx, by, bx + 18, by + 6], outline=(68, 48, 58, 255))
    for gx, color in [
        (30, (255, 45, 149, 200)),
        (150, (40, 220, 200, 180)),
        (270, (255, 45, 149, 200)),
    ]:
        d.rectangle([gx, 112, gx + 40, 126], fill=color)
        d.rectangle([gx + 4, 116, gx + 36, 122], fill=(20, 12, 18, 160))
    for nx, ncol in [
        (48, (255, 45, 149, 240)),
        (192, (40, 220, 200, 240)),
        (336, (255, 45, 149, 240)),
    ]:
        d.rectangle([nx + 10, 72, nx + 14, 96], fill=(28, 28, 34, 255))
        d.rectangle([nx, 64, nx + 34, 76], fill=ncol)
    d.rectangle([0, 148, w, h], fill=(36, 30, 34, 255))
    d.rectangle([0, 148, w, 150], fill=(110, 70, 90, 255))
    for x in range(0, w, 24):
        d.rectangle([x, 158, x + 14, 160], fill=(55, 48, 52, 255))
    path = OUT / "stage-alley.png"
    im.save(path, optimize=True)
    print(f"Wrote {path} ({w}×{h})")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    viper = build_atlas(SRC / "viper-sheet.jpg", VIPER_MAP)
    peely = build_atlas(SRC / "peely-sheet.jpg", PEELY_MAP)
    viper_path = OUT / "viper.png"
    peely_path = OUT / "peely.png"
    viper.save(viper_path, optimize=True)
    peely.save(peely_path, optimize=True)
    print(f"Wrote {viper_path} ({viper.size[0]}×{viper.size[1]})")
    print(f"Wrote {peely_path} ({peely.size[0]}×{peely.size[1]})")
    write_stage()
    hayate = OUT / "hayate.png"
    if hayate.exists():
        hayate.unlink()
        print("Removed hayate.png")


if __name__ == "__main__":
    main()
