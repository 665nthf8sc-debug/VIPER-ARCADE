import {
  CELL_H,
  CELL_W,
  CLIPS,
  clipFrame,
  resolveAnim,
  type AnimDriverInput,
  type AnimName,
} from './anims'

export type FighterSpriteId = 'viper' | 'peely'

const PATHS: Record<FighterSpriteId, string> = {
  viper: '/sprites/viper.png',
  peely: '/sprites/peely.png',
}

const STAGE_PATH = '/sprites/stage-alley.png'

interface AtlasEntry {
  img: HTMLImageElement
  ready: boolean
}

const atlases: Partial<Record<FighterSpriteId, AtlasEntry>> = {}
let stageImg: HTMLImageElement | null = null
let loadPromise: Promise<void> | null = null

/** Reused for white hit-flash composite (avoids per-frame alloc). */
const flashCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
if (flashCanvas) {
  flashCanvas.width = CELL_W
  flashCanvas.height = CELL_H
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'sync'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${src}`))
    img.src = src
  })
}

/** Preload character atlases + stage tile. Safe to call multiple times. */
export function loadFighterAtlases(): Promise<void> {
  if (loadPromise) return loadPromise
  loadPromise = Promise.all([
    ...((Object.keys(PATHS) as FighterSpriteId[]).map(async (id) => {
      const img = await loadImage(PATHS[id])
      atlases[id] = { img, ready: true }
    })),
    loadImage(STAGE_PATH).then((img) => {
      stageImg = img
    }),
  ]).then(() => undefined)
  return loadPromise
}

export function atlasesReady(): boolean {
  return Boolean(atlases.viper?.ready && atlases.peely?.ready && stageImg)
}

export function getStageImage(): HTMLImageElement | null {
  return stageImg
}

function blitCell(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  col: number,
  row: number,
  x: number,
  y: number,
  facing: 1 | -1,
  flash: boolean,
) {
  const sx = col * CELL_W
  const sy = row * CELL_H
  const dx = Math.round(x)
  const dy = Math.round(y)

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.translate(dx, dy)
  ctx.scale(facing, 1)

  if (flash && flashCanvas) {
    const tctx = flashCanvas.getContext('2d')
    if (tctx) {
      tctx.imageSmoothingEnabled = true
      tctx.clearRect(0, 0, CELL_W, CELL_H)
      tctx.globalCompositeOperation = 'source-over'
      tctx.drawImage(img, sx, sy, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H)
      tctx.globalCompositeOperation = 'source-in'
      tctx.fillStyle = '#ffffff'
      tctx.fillRect(0, 0, CELL_W, CELL_H)
      ctx.drawImage(flashCanvas, -CELL_W / 2, -CELL_H)
    }
  } else {
    ctx.drawImage(img, sx, sy, CELL_W, CELL_H, -CELL_W / 2, -CELL_H, CELL_W, CELL_H)
  }
  ctx.restore()
}

export interface DrawFighterSpriteOpts {
  id: FighterSpriteId
  x: number
  y: number
  facing: 1 | -1
  animTime: number
  flash: number
  state: AnimDriverInput
}

/** Draw fighter anchored at feet (x, y). */
export function drawFighterSprite(ctx: CanvasRenderingContext2D, opts: DrawFighterSpriteOpts) {
  const entry = atlases[opts.id]
  if (!entry?.ready) return

  const name = resolveAnim(opts.state)
  const frame = clipFrame(name, opts.animTime)
  const clip = CLIPS[name]
  blitCell(ctx, entry.img, frame, clip.row, opts.x, opts.y, opts.facing, opts.flash > 0)
}

/** Draw VS / HUD portrait cell centered at (x, y). */
export function drawPortraitSprite(
  ctx: CanvasRenderingContext2D,
  id: FighterSpriteId,
  x: number,
  y: number,
  facing: 1 | -1 = 1,
) {
  const entry = atlases[id]
  if (!entry?.ready) return
  const clip = CLIPS.portrait
  blitCell(ctx, entry.img, 0, clip.row, x, y + CELL_H / 2, facing, false)
}

/** Force a specific clip (e.g. idle on VS screen companions). */
export function drawAnimFrame(
  ctx: CanvasRenderingContext2D,
  id: FighterSpriteId,
  name: AnimName,
  frame: number,
  x: number,
  y: number,
  facing: 1 | -1,
) {
  const entry = atlases[id]
  if (!entry?.ready) return
  const clip = CLIPS[name]
  const col = Math.min(frame, clip.frames - 1)
  blitCell(ctx, entry.img, col, clip.row, x, y, facing, false)
}
