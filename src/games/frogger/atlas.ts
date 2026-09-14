/** Sprite atlas loader + blit helpers for VIPER Frogger (HD AI sheets).
 *
 * Sheets: public/sprites/frogger/{viper,vehicles,platforms,world}.png
 * Source: assets/source/frogger/frogger-*-sheet.png
 * Regen: npm run sprites:frogger
 */

import {
  DEN_H,
  DEN_W,
  PLATFORM_SRC_H,
  PLATFORM_SRC_Y,
  PLATFORM_WIDTHS,
  TILE_H,
  VEHICLE_RECTS,
  VIPER_CELL_H,
  VIPER_CELL_W,
} from './atlasMeta'

/** On-screen scale — HD cells painted large, drawn into Frogger rows. */
export const SCALE = 0.4

const PATHS = {
  viper: '/sprites/frogger/viper.png',
  vehicles: '/sprites/frogger/vehicles.png',
  platforms: '/sprites/frogger/platforms.png',
  world: '/sprites/frogger/world.png',
} as const

type SheetId = keyof typeof PATHS

const sheets: Partial<Record<SheetId, HTMLImageElement>> = {}
let loadPromise: Promise<void> | null = null

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'sync'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${src}`))
    img.src = src
  })
}

export function loadFroggerAtlases(): Promise<void> {
  if (loadPromise) return loadPromise
  loadPromise = Promise.all(
    (Object.keys(PATHS) as SheetId[]).map(async (id) => {
      sheets[id] = await loadImage(PATHS[id])
    }),
  )
    .then(() => undefined)
    .catch((err) => {
      loadPromise = null
      throw err
    })
  return loadPromise
}

export function atlasesReady(): boolean {
  return Boolean(sheets.viper && sheets.vehicles && sheets.platforms && sheets.world)
}

function sheet(id: SheetId): HTMLImageElement | null {
  return sheets[id] ?? null
}

function blit(
  ctx: CanvasRenderingContext2D,
  id: SheetId,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  opts?: { flipX?: boolean; alpha?: number },
) {
  const img = sheet(id)
  if (!img) return
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (opts?.alpha != null) ctx.globalAlpha = opts.alpha
  ctx.translate(Math.round(dx), Math.round(dy))
  if (opts?.flipX) ctx.scale(-1, 1)
  ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
}

export type Facing = 'n' | 's' | 'e' | 'w'
export type ViperPose = 'idle' | 'hop' | 'splash' | 'dead' | 'den'

export function drawViperSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pose: ViperPose,
  facing: Facing,
  anim: number,
) {
  let col = 0
  let row = 0
  if (pose === 'idle') {
    col = Math.floor(anim * 6) % 4
    row = 0
  } else if (pose === 'hop') {
    col = facing === 'n' ? 4 : facing === 's' ? 5 : facing === 'e' ? 6 : 7
    row = 0
  } else if (pose === 'splash') {
    col = Math.min(2, Math.floor(anim * 8))
    row = 1
  } else if (pose === 'dead') {
    col = 3
    row = 1
  } else {
    col = 4
    row = 1
  }
  const dw = VIPER_CELL_W * SCALE
  const dh = VIPER_CELL_H * SCALE
  blit(
    ctx,
    'viper',
    col * VIPER_CELL_W,
    row * VIPER_CELL_H,
    VIPER_CELL_W,
    VIPER_CELL_H,
    x,
    y,
    dw,
    dh,
  )
}

export function drawLifeIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  blit(ctx, 'viper', 5 * VIPER_CELL_W, VIPER_CELL_H, VIPER_CELL_W, VIPER_CELL_H, x, y, 20, 24)
}

export type VehicleKind = number

/** Prefer distinct vehicle types; flip at draw time for lane direction. */
export function pickVehicleKind(_laneDir: 1 | -1, size: number, laneIndex: number): VehicleKind {
  const n = VEHICLE_RECTS.length
  if (n <= 0) return 0
  if (size >= 70) return Math.min(n - 1, laneIndex % 2 === 0 ? 0 : 5) // trucks
  if (size >= 55) return Math.min(n - 1, 6 + (laneIndex % 2)) // vans
  if (size <= 42) return Math.min(n - 1, 8 + (laneIndex % 2)) // hotrods
  return Math.min(n - 1, 1 + (laneIndex % 4)) // sedans
}

export function drawVehicleSprite(
  ctx: CanvasRenderingContext2D,
  kind: VehicleKind,
  x: number,
  y: number,
  destW: number,
  destH: number,
  flipX = false,
) {
  const r = VEHICLE_RECTS[Math.max(0, Math.min(VEHICLE_RECTS.length - 1, kind))]
  blit(ctx, 'vehicles', r.sx, r.sy, r.sw, r.sh, x, y, destW, Math.max(destH, destW * 0.45), {
    flipX,
  })
}

function platformSource(width: number): { sx: number; sw: number } {
  let sx = 8
  let best = PLATFORM_WIDTHS[0] ?? 64
  let bestSx = 8
  for (const w of PLATFORM_WIDTHS) {
    if (Math.abs(w - width) < Math.abs(best - width)) {
      best = w
      bestSx = sx
    }
    sx += w + 8
  }
  return { sx: bestSx, sw: best }
}

export function drawPlatformSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  destW: number,
  destH: number,
) {
  const { sx, sw } = platformSource(destW * 1.4)
  blit(ctx, 'platforms', sx, PLATFORM_SRC_Y, sw, PLATFORM_SRC_H, x, y, destW, destH)
}

/** Soft mid-tone lanes so dark VIPER reads clearly — no noisy atlas patterns. */
export function drawLaneTile(
  ctx: CanvasRenderingContext2D,
  type: 'water' | 'road' | 'safe' | 'goalBank',
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  _variant = 0,
) {
  const x = Math.round(dx)
  const y = Math.round(dy)
  const w = Math.round(dw)
  const h = Math.round(dh)
  ctx.save()

  if (type === 'water') {
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, '#6a8fa0')
    g.addColorStop(0.55, '#557a8c')
    g.addColorStop(1, '#4a6d7e')
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = 'rgba(200, 230, 240, 0.12)'
    ctx.fillRect(x, y + Math.floor(h * 0.35), w, Math.max(2, Math.floor(h * 0.18)))
  } else if (type === 'road') {
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, '#7e8494')
    g.addColorStop(0.5, '#6c7282')
    g.addColorStop(1, '#5e6474')
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = 'rgba(28, 30, 38, 0.28)'
    ctx.fillRect(x, y, w, 2)
    ctx.fillRect(x, y + h - 2, w, 2)
    ctx.fillStyle = 'rgba(235, 238, 245, 0.22)'
    const mid = y + Math.floor(h / 2) - 1
    for (let lx = x + 10; lx < x + w; lx += 28) {
      ctx.fillRect(lx, mid, 14, 2)
    }
  } else if (type === 'safe') {
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, '#9aa3a8')
    g.addColorStop(0.5, '#8b949a')
    g.addColorStop(1, '#7e878e')
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = 'rgba(45, 226, 230, 0.1)'
    ctx.fillRect(x, y + h - 3, w, 3)
  } else {
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, '#6f8578')
    g.addColorStop(0.45, '#5f7568')
    g.addColorStop(1, '#4e6358')
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
  }

  ctx.restore()
}

export function drawDenSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  filled: boolean,
  destW: number,
  destH: number,
) {
  const sx = filled ? DEN_W : 0
  blit(ctx, 'world', sx, TILE_H * 3, DEN_W, DEN_H, x, y, destW, destH)
}
