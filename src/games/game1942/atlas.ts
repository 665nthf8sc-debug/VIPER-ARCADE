/** Sprite atlas loader + blit helpers for VIPER 1942.
 *
 * Sheets (2× detail): public/sprites/1942/{planes,bomber,fx,tiles}.png
 * Pack from AI drop-ins: python3 scripts/pack-1942-atlases.py
 * Layout: assets/source/1942/README.md
 */

export const PLANE_CELL = 96
/** Draw multiplier — 0.75 keeps on-screen size ≈ legacy 48×1.5. */
export const SCALE = 0.75

const HEAVY_W = 144
const HEAVY_H = 72

const PATHS = {
  planes: '/sprites/1942/planes.png',
  bomber: '/sprites/1942/bomber.png',
  fx: '/sprites/1942/fx.png',
  tiles: '/sprites/1942/tiles.png',
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

export function load1942Atlases(): Promise<void> {
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
  return Boolean(sheets.planes && sheets.bomber && sheets.fx && sheets.tiles)
}

function sheet(id: SheetId): HTMLImageElement | null {
  return sheets[id] ?? null
}

/** Nearest-neighbor blit from sheet rect to dest center. */
export function blit(
  ctx: CanvasRenderingContext2D,
  id: SheetId,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw = sw * SCALE,
  dh = sh * SCALE,
  opts?: { flipY?: boolean; alpha?: number },
) {
  const img = sheet(id)
  if (!img) return
  ctx.save()
  ctx.imageSmoothingEnabled = false
  if (opts?.alpha != null) ctx.globalAlpha = opts.alpha
  ctx.translate(Math.round(dx), Math.round(dy))
  if (opts?.flipY) ctx.scale(1, -1)
  ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
}

export type PlayerFrame = 'center' | 'left' | 'right' | `loop${0 | 1 | 2 | 3 | 4 | 5}`

const PLAYER_COL: Record<PlayerFrame, { col: number; row: number }> = {
  center: { col: 0, row: 0 },
  left: { col: 1, row: 0 },
  right: { col: 2, row: 0 },
  loop0: { col: 3, row: 0 },
  loop1: { col: 4, row: 0 },
  loop2: { col: 5, row: 0 },
  loop3: { col: 6, row: 0 },
  loop4: { col: 7, row: 0 },
  loop5: { col: 0, row: 1 },
}

export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: PlayerFrame,
) {
  const { col, row } = PLAYER_COL[frame]
  blit(ctx, 'planes', col * PLANE_CELL, row * PLANE_CELL, PLANE_CELL, PLANE_CELL, x, y)
}

export type EnemyKind = 'scout' | 'red' | 'ace' | 'bomber' | 'heavy'

export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  kind: EnemyKind,
  x: number,
  y: number,
  anim: number,
) {
  const f = Math.floor(anim) % 4
  if (kind === 'heavy') {
    blit(
      ctx,
      'bomber',
      f * HEAVY_W,
      0,
      HEAVY_W,
      HEAVY_H,
      x,
      y,
      HEAVY_W * SCALE * 0.9,
      HEAVY_H * SCALE * 0.9,
    )
    return
  }
  const row = kind === 'scout' ? 2 : kind === 'red' ? 3 : kind === 'ace' ? 4 : 5
  blit(ctx, 'planes', f * PLANE_CELL, row * PLANE_CELL, PLANE_CELL, PLANE_CELL, x, y)
}

export function drawBulletSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fromPlayer: boolean,
  dual: boolean,
) {
  if (!fromPlayer) {
    blit(ctx, 'fx', 32, 0, 32, 48, x, y, 12, 18)
    return
  }
  if (dual) {
    blit(ctx, 'fx', 64, 0, 48, 48, x, y, 18, 20)
  } else {
    blit(ctx, 'fx', 0, 0, 32, 48, x, y, 10, 16)
  }
}

export function drawExplosionSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
) {
  const f = Math.min(7, Math.max(0, Math.floor(frame)))
  const col = f % 4
  const row = Math.floor(f / 4)
  blit(ctx, 'fx', col * 96, 96 + row * 96, 96, 96, x, y, 96 * SCALE, 96 * SCALE)
}

export function drawPowSprite(ctx: CanvasRenderingContext2D, x: number, y: number) {
  blit(ctx, 'fx', 0, 48, 40, 40, x, y, 22, 22)
}

export function drawLifeIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  blit(ctx, 'fx', 48, 48, 32, 32, x, y, 18, 18)
}

export function drawOceanTile(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  variant = 0,
) {
  const sx = variant % 2 === 0 ? 0 : 192
  const img = sheet('tiles')
  if (!img) return
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, sx, 0, 192, 192, Math.round(dx), Math.round(dy), 96, 96)
  ctx.restore()
}

export function drawIslandSprite(ctx: CanvasRenderingContext2D, x: number, y: number) {
  blit(ctx, 'tiles', 0, 192, 160, 120, x, y, 100, 75)
}

export function drawCloudSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: 0 | 1,
  alpha = 0.85,
) {
  const sy = kind === 0 ? 192 : 256
  blit(ctx, 'tiles', 192, sy, 128, 64, x, y, 80, 40, { alpha })
}
