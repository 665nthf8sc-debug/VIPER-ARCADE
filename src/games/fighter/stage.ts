import { getStageImage } from './atlas'

const PW = 320
const PH = 180
const GROUND = 148

function wrap(n: number, period: number) {
  return ((n % period) + period) % period
}

/** Draw a horizontally tiled strip of the stage image. */
function tileX(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  scroll: number,
  dy: number,
  dh: number,
  sy: number,
  sh: number,
  alpha = 1,
) {
  const tw = img.width
  const ox = -wrap(scroll, tw)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.imageSmoothingEnabled = false
  for (let x = ox - tw; x < PW + tw; x += tw) {
    ctx.drawImage(img, 0, sy, tw, sh, Math.round(x), dy, tw, dh)
  }
  ctx.restore()
}

/**
 * Neon alley stage — multi-parallax tiles that track the fighters' midpoint.
 * scrollHint: world focus x (average fighter x).
 */
export function drawScrollingStage(
  ctx: CanvasRenderingContext2D,
  time: number,
  focusX: number,
) {
  const img = getStageImage()
  const cam = (focusX - PW / 2) * 0.55

  // Fallback flat fill if stage missing
  if (!img) {
    ctx.fillStyle = '#1a1028'
    ctx.fillRect(0, 0, PW, PH)
    return
  }

  const ih = img.height
  // Far sky + city (top ~100px of tile) — slow parallax
  tileX(ctx, img, cam * 0.25, 0, 100, 0, Math.floor(ih * (100 / 180)), 1)

  // Mid brick wall — medium parallax
  tileX(ctx, img, cam * 0.55, 100, 48, Math.floor(ih * (100 / 180)), Math.floor(ih * (48 / 180)), 1)

  // Ground strip — matches fighter scroll most closely
  tileX(ctx, img, cam * 0.85, GROUND, PH - GROUND, Math.floor(ih * (148 / 180)), Math.floor(ih * (32 / 180)), 1)

  // Soft ground highlight / ring
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(0, GROUND, PW, 2)
  const ringX = PW / 2 + Math.sin(time * 0.3) * 4
  ctx.fillStyle = 'rgba(255,45,149,0.35)'
  ctx.fillRect(ringX - 28, GROUND + 3, 56, 2)

  // Floating dust / neon motes that drift with camera
  for (let i = 0; i < 10; i++) {
    const dx = wrap(cam * 0.4 + Math.sin(time * 0.5 + i) * 30 + i * 37, PW)
    const dy = 70 + ((i * 17 + Math.sin(time * 0.8 + i * 0.7) * 18) % 60)
    ctx.fillStyle = i % 2 ? 'rgba(255,45,149,0.45)' : 'rgba(40,220,200,0.4)'
    ctx.fillRect(Math.round(dx), Math.round(dy), 1, 1)
  }

  // Foreground curb shadow (fastest parallax cue)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  const curb = -wrap(cam * 1.1, 48)
  for (let x = curb - 48; x < PW + 48; x += 48) {
    ctx.fillRect(Math.round(x), PH - 6, 28, 3)
  }
}
