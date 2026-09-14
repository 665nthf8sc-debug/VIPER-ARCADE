#!/usr/bin/env python3
"""Pack HD AI Frogger sheets into runtime atlases.

Source: assets/source/frogger/frogger-*-sheet.png
Output: public/sprites/frogger/{viper,vehicles,platforms,world}.png

Regen: npm run sprites:frogger
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "source" / "frogger"
OUT = ROOT / "public" / "sprites" / "frogger"
OUT.mkdir(parents=True, exist_ok=True)

VIPER_W, VIPER_H = 128, 160
VEH_SLOT_W, VEH_SLOT_H = 160, 88
PLAT_H = 72
TILE_W, TILE_H = 96, 56
DEN_W, DEN_H = 112, 72


def key_black(im: Image.Image, luma: int = 28) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                px[x, y] = (0, 0, 0, 0)
                continue
            if max(r, g, b) <= luma and (max(r, g, b) - min(r, g, b)) <= 12:
                px[x, y] = (0, 0, 0, 0)
    return im


def flood_key(im: Image.Image, tol: int = 36) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    stack: list[tuple[int, int]] = []

    def dark(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        if a < 8:
            return True
        return max(r, g, b) <= tol and (max(r, g, b) - min(r, g, b)) <= 18

    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))

    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y][x]:
            continue
        seen[y][x] = True
        if not dark(x, y):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im


def fit(im: Image.Image, tw: int, th: int, anchor: str = "center") -> Image.Image:
    im = im.convert("RGBA")
    bb = im.split()[-1].getbbox()
    if not bb:
        return Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    crop = im.crop(bb)
    sw, sh = crop.size
    scale = min(tw / sw, th / sh) * 0.92
    nw, nh = max(1, int(sw * scale)), max(1, int(sh * scale))
    resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    ox = (tw - nw) // 2
    if anchor == "feet":
        oy = th - nh
    elif anchor == "top":
        oy = 0
    else:
        oy = (th - nh) // 2
    out.paste(resized, (ox, oy), resized)
    return out


def grid_cells(im: Image.Image, cols: int, rows: int, pad: int = 4) -> list[Image.Image]:
    w, h = im.size
    cw, ch = w // cols, h // rows
    cells: list[Image.Image] = []
    for r in range(rows):
        for c in range(cols):
            box = (c * cw + pad, r * ch + pad, (c + 1) * cw - pad, (r + 1) * ch - pad)
            cells.append(im.crop(box))
    return cells


def find_sprites(im: Image.Image, min_area: int = 800) -> list[Image.Image]:
    """Connected-component extract opaque sprites, sorted top-to-bottom then left-to-right."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    sprites: list[tuple[int, int, int, int, Image.Image]] = []

    def opaque(x: int, y: int) -> bool:
        return px[x, y][3] > 40

    for y in range(h):
        for x in range(w):
            if seen[y][x] or not opaque(x, y):
                continue
            stack = [(x, y)]
            seen[y][x] = True
            minx = maxx = x
            miny = maxy = y
            pts: list[tuple[int, int]] = []
            while stack:
                cx, cy = stack.pop()
                pts.append((cx, cy))
                minx = min(minx, cx)
                maxx = max(maxx, cx)
                miny = min(miny, cy)
                maxy = max(maxy, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and opaque(nx, ny):
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            area = (maxx - minx + 1) * (maxy - miny + 1)
            if area < min_area:
                continue
            # pad bbox
            pad = 2
            x0 = max(0, minx - pad)
            y0 = max(0, miny - pad)
            x1 = min(w, maxx + pad + 1)
            y1 = min(h, maxy + pad + 1)
            sprites.append((miny, minx, x1 - x0, y1 - y0, im.crop((x0, y0, x1, y1))))

    sprites.sort(key=lambda t: (t[0] // 80, t[1]))
    return [s[4] for s in sprites]


def pack_viper() -> Image.Image:
    src = key_black(Image.open(SRC / "frogger-viper-sheet.png"))
    src = flood_key(src)
    # Source is 8×2 but bottom row only has 6 poses — still slice 8×2 and skip empties
    cells = grid_cells(src, 8, 2, pad=6)
    atlas = Image.new("RGBA", (VIPER_W * 8, VIPER_H * 2), (0, 0, 0, 0))
    # Prefer first 8 top + first 6 bottom that have content
    top = cells[:8]
    bottom_raw = cells[8:]
    bottom: list[Image.Image] = []
    for c in bottom_raw:
        if c.split()[-1].getbbox():
            bottom.append(c)
        if len(bottom) >= 6:
            break
    while len(bottom) < 6:
        bottom.append(Image.new("RGBA", (10, 10), (0, 0, 0, 0)))

    for i, cell in enumerate(top):
        fitted = fit(cell, VIPER_W, VIPER_H, anchor="feet")
        atlas.paste(fitted, (i * VIPER_W, 0), fitted)
    for i, cell in enumerate(bottom[:6]):
        fitted = fit(cell, VIPER_W, VIPER_H, anchor="feet")
        atlas.paste(fitted, (i * VIPER_W, VIPER_H), fitted)
    return atlas


def pack_vehicles() -> tuple[Image.Image, list[dict[str, int]]]:
    src = key_black(Image.open(SRC / "frogger-vehicles-sheet.png"), luma=22)
    src = flood_key(src, tol=30)
    sprites = find_sprites(src, min_area=2500)
    # Expect ~10; take up to 10
    sprites = sprites[:10]
    cols = 5
    rows = 2
    atlas = Image.new("RGBA", (VEH_SLOT_W * cols, VEH_SLOT_H * rows), (0, 0, 0, 0))
    rects: list[dict[str, int]] = []
    for i, sp in enumerate(sprites):
        r, c = divmod(i, cols)
        if r >= rows:
            break
        fitted = fit(sp, VEH_SLOT_W - 8, VEH_SLOT_H - 8, anchor="center")
        x = c * VEH_SLOT_W + 4
        y = r * VEH_SLOT_H + 4
        atlas.paste(fitted, (x, y), fitted)
        bb = fitted.split()[-1].getbbox() or (0, 0, fitted.width, fitted.height)
        rects.append(
            {
                "sx": x + bb[0],
                "sy": y + bb[1],
                "sw": bb[2] - bb[0],
                "sh": bb[3] - bb[1],
            }
        )
    return atlas, rects


def pack_platforms() -> tuple[Image.Image, list[int]]:
    src = key_black(Image.open(SRC / "frogger-platforms-sheet.png"), luma=22)
    src = flood_key(src, tol=30)
    # Equal column slices — AI sheet is one row of 8 rafts
    cells = grid_cells(src, 8, 1, pad=8)
    fitted_list: list[Image.Image] = []
    for cell in cells:
        if not cell.split()[-1].getbbox():
            continue
        bb = cell.split()[-1].getbbox()
        assert bb
        crop = cell.crop(bb)
        sw, sh = crop.size
        nh = PLAT_H - 8
        nw = max(56, int(sw * (nh / max(1, sh))))
        fitted_list.append(fit(crop, nw, nh, anchor="center"))
    fitted_list = fitted_list[:8]
    total_w = 8 + sum(f.width + 8 for f in fitted_list)
    atlas = Image.new("RGBA", (max(total_w, 64), PLAT_H), (0, 0, 0, 0))
    x = 8
    out_widths: list[int] = []
    for fitted in fitted_list:
        atlas.paste(fitted, (x, 4), fitted)
        out_widths.append(fitted.width)
        x += fitted.width + 8
    return atlas, out_widths


def pack_world() -> Image.Image:
    src = key_black(Image.open(SRC / "frogger-world-sheet.png"), luma=18)
    src = flood_key(src, tol=26)
    w, h = src.size
    # Three bands from the generated layout
    bands = [
        src.crop((0, 0, w, int(h * 0.30))),
        src.crop((0, int(h * 0.30), w, int(h * 0.58))),
        src.crop((0, int(h * 0.58), w, h)),
    ]
    atlas = Image.new("RGBA", (640, 220), (0, 0, 0, 0))

    def slice_row(band: Image.Image, n: int) -> list[Image.Image]:
        bw, bh = band.size
        cw = bw // n
        out = []
        for i in range(n):
            cell = band.crop((i * cw + 6, 6, (i + 1) * cw - 6, bh - 6))
            out.append(fit(cell, TILE_W, TILE_H, anchor="center"))
        return out

    water = slice_row(bands[0], 4)
    road = slice_row(bands[1], 4)
    for i, t in enumerate(water):
        atlas.paste(t, (i * TILE_W, 0), t)
    for i, t in enumerate(road):
        atlas.paste(t, (i * TILE_W, TILE_H), t)

    # Bottom band: extract sprites (safe tiles, dens, bank)
    bottom = bands[2]
    sprites = find_sprites(bottom, min_area=900)
    # Heuristic: first ~4 tall/narrow = safe, next dens by aspect, last bank wide
    safe: list[Image.Image] = []
    dens: list[Image.Image] = []
    bank: Image.Image | None = None
    for sp in sprites:
        sw, sh = sp.size
        aspect = sw / max(1, sh)
        if aspect > 2.2 and bank is None:
            bank = sp
        elif aspect < 0.85 and len(safe) < 4:
            safe.append(sp)
        elif 0.7 <= aspect <= 1.6 and len(dens) < 2:
            dens.append(sp)
        elif len(safe) < 4:
            safe.append(sp)

    while len(safe) < 4:
        safe.append(Image.new("RGBA", (TILE_W, TILE_H), (40, 20, 50, 255)))
    for i, sp in enumerate(safe[:4]):
        t = fit(sp, TILE_W, TILE_H, anchor="center")
        atlas.paste(t, (i * TILE_W, TILE_H * 2), t)

    for i, sp in enumerate(dens[:2]):
        t = fit(sp, DEN_W, DEN_H, anchor="center")
        atlas.paste(t, (i * DEN_W, TILE_H * 3), t)
    if bank is not None:
        t = fit(bank, TILE_W * 2, TILE_H, anchor="center")
        atlas.paste(t, (DEN_W * 2 + 8, TILE_H * 3), t)
    return atlas


def write_rects_ts(rects: list[dict[str, int]], widths: list[int]) -> None:
    """Keep atlas.ts vehicle/platform constants in sync via a small generated module."""
    path = ROOT / "src" / "games" / "frogger" / "atlasMeta.ts"
    lines = [
        "/* Auto-generated by scripts/pack-frogger-atlases.py — do not edit. */",
        "export const VIPER_CELL_W = 128",
        "export const VIPER_CELL_H = 160",
        "export const VEHICLE_RECTS = [",
    ]
    for r in rects:
        lines.append(f"  {{ sx: {r['sx']}, sy: {r['sy']}, sw: {r['sw']}, sh: {r['sh']} }},")
    lines.append("] as const")
    lines.append(f"export const PLATFORM_WIDTHS = {widths}")
    lines.append("export const PLATFORM_SRC_Y = 4")
    lines.append("export const PLATFORM_SRC_H = 64")
    lines.append("export const TILE_W = 96")
    lines.append("export const TILE_H = 56")
    lines.append("export const DEN_W = 112")
    lines.append("export const DEN_H = 72")
    path.write_text("\n".join(lines) + "\n")
    print(f"wrote {path.relative_to(ROOT)}")


def main() -> None:
    missing = [
        n
        for n in (
            "frogger-viper-sheet.png",
            "frogger-vehicles-sheet.png",
            "frogger-platforms-sheet.png",
            "frogger-world-sheet.png",
        )
        if not (SRC / n).exists()
    ]
    if missing:
        raise SystemExit(f"Missing source sheets in {SRC}: {missing}")

    viper = pack_viper()
    vehicles, rects = pack_vehicles()
    platforms, widths = pack_platforms()
    world = pack_world()

    viper.save(OUT / "viper.png")
    vehicles.save(OUT / "vehicles.png")
    platforms.save(OUT / "platforms.png")
    world.save(OUT / "world.png")
    write_rects_ts(rects, widths)

    for name, im in (
        ("viper.png", viper),
        ("vehicles.png", vehicles),
        ("platforms.png", platforms),
        ("world.png", world),
    ):
        print(f"wrote public/sprites/frogger/{name} ({im.width}×{im.height})")


if __name__ == "__main__":
    main()
