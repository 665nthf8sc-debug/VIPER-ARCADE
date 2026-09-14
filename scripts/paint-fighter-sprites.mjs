/**
 * Paint original 1987-style VIPER & HAYATE sprite atlases (64×80 cells, 4×8 grid).
 * No commercial rips — hand-authored pixel art.
 *
 * Run: node scripts/paint-fighter-sprites.mjs
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'sprites')

const CELL_W = 64
const CELL_H = 80
const COLS = 4
const ROWS = 8
const ATLAS_W = CELL_W * COLS
const ATLAS_H = CELL_H * ROWS

/** @typedef {[number, number, number, number]} RGBA */

/** @type {Record<string, RGBA>} */
const V = {
  skin: [232, 184, 150, 255],
  skinDk: [200, 148, 120, 255],
  body: [20, 20, 24, 255],
  bodyHi: [40, 40, 48, 255],
  pink: [255, 45, 149, 255],
  teal: [45, 226, 230, 255],
  hair: [26, 26, 26, 255],
  shoe: [18, 18, 22, 255],
  eye: [20, 20, 28, 255],
  white: [255, 255, 255, 255],
  outline: [8, 8, 12, 255],
}

/** @type {Record<string, RGBA>} */
const H = {
  skin: [240, 200, 160, 255],
  skinDk: [210, 160, 120, 255],
  gi: [242, 242, 240, 255],
  giDk: [210, 210, 205, 255],
  belt: [26, 26, 46, 255],
  band: [196, 30, 58, 255],
  hair: [26, 21, 32, 255],
  shoe: [40, 36, 48, 255],
  eye: [20, 16, 24, 255],
  special: [110, 200, 255, 255],
  outline: [12, 10, 16, 255],
}

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcBuf))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function makeAtlas() {
  return Buffer.alloc(ATLAS_W * ATLAS_H * 4)
}

function px(buf, ax, ay, color) {
  if (ax < 0 || ay < 0 || ax >= ATLAS_W || ay >= ATLAS_H) return
  if (!color || color[3] === 0) return
  const i = (ay * ATLAS_W + ax) * 4
  buf[i] = color[0]
  buf[i + 1] = color[1]
  buf[i + 2] = color[2]
  buf[i + 3] = color[3]
}

function fillRect(buf, ox, oy, x, y, w, h, color) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) px(buf, ox + x + i, oy + y + j, color)
  }
}

function outlineRect(buf, ox, oy, x, y, w, h, color) {
  fillRect(buf, ox, oy, x, y, w, 1, color)
  fillRect(buf, ox, oy, x, y + h - 1, w, 1, color)
  fillRect(buf, ox, oy, x, y, 1, h, color)
  fillRect(buf, ox, oy, x + w - 1, y, 1, h, color)
}

/** Soft shadow under feet */
function shadow(buf, ox, oy, cx = 32) {
  fillRect(buf, ox, oy, cx - 12, 76, 24, 3, [0, 0, 0, 90])
  fillRect(buf, ox, oy, cx - 8, 77, 16, 1, [0, 0, 0, 120])
}

/**
 * VIPER base standing body. Options tweak limbs for poses.
 * Local coords: feet at y≈74, center ~32.
 */
function paintViper(buf, col, row, pose = 'idle0') {
  const ox = col * CELL_W
  const oy = row * CELL_H
  shadow(buf, ox, oy)

  const bob = pose === 'idle1' || pose === 'idle3' ? 1 : 0
  const walk = pose.startsWith('walk')
  const walkPhase = pose === 'walk1' || pose === 'walk3' ? 1 : 0
  const punch = pose.startsWith('punch')
  const kick = pose.startsWith('kick')
  const special = pose.startsWith('special')
  const hit = pose.startsWith('hit')
  const jump = pose.startsWith('jump')
  const portrait = pose === 'portrait'

  if (portrait) {
    // Bust portrait for VS screen
    fillRect(buf, ox, oy, 14, 18, 36, 48, V.body)
    fillRect(buf, ox, oy, 14, 18, 6, 48, V.pink)
    fillRect(buf, ox, oy, 44, 18, 6, 48, V.teal)
    fillRect(buf, ox, oy, 20, 28, 24, 26, V.skin)
    fillRect(buf, ox, oy, 18, 24, 28, 10, V.hair)
    fillRect(buf, ox, oy, 16, 30, 6, 10, V.pink)
    fillRect(buf, ox, oy, 42, 30, 6, 10, V.pink)
    fillRect(buf, ox, oy, 18, 24, 28, 3, V.pink)
    // cobra
    fillRect(buf, ox, oy, 28, 40, 8, 3, V.teal)
    fillRect(buf, ox, oy, 26, 43, 12, 5, V.teal)
    fillRect(buf, ox, oy, 30, 48, 4, 4, V.teal)
    // eyes
    fillRect(buf, ox, oy, 24, 36, 4, 3, V.eye)
    fillRect(buf, ox, oy, 36, 36, 4, 3, V.eye)
    fillRect(buf, ox, oy, 25, 36, 2, 2, V.white)
    fillRect(buf, ox, oy, 37, 36, 2, 2, V.white)
    outlineRect(buf, ox, oy, 14, 18, 36, 48, V.outline)
    return
  }

  const footY = jump ? 62 : hit ? 72 : 74
  const torsoY = (jump ? 28 : hit ? 36 : 34) - bob
  const headY = torsoY - 16

  // legs
  if (kick && pose === 'kick1') {
    fillRect(buf, ox, oy, 24, footY - 18, 7, 18, V.body)
    fillRect(buf, ox, oy, 31, footY - 14, 26, 7, V.body)
    fillRect(buf, ox, oy, 54, footY - 14, 6, 5, V.pink)
    fillRect(buf, ox, oy, 24, footY - 4, 7, 4, V.shoe)
  } else if (walk) {
    const a = walkPhase ? 4 : -4
    const b = walkPhase ? -4 : 4
    fillRect(buf, ox, oy, 24 + a, footY - 18, 7, 18, V.body)
    fillRect(buf, ox, oy, 33 + b, footY - 18, 7, 18, V.body)
    fillRect(buf, ox, oy, 24 + a, footY - 10, 7, 3, V.pink)
    fillRect(buf, ox, oy, 33 + b, footY - 6, 7, 3, V.teal)
    fillRect(buf, ox, oy, 24 + a, footY - 2, 7, 3, V.shoe)
    fillRect(buf, ox, oy, 33 + b, footY - 2, 7, 3, V.shoe)
  } else if (jump) {
    fillRect(buf, ox, oy, 22, footY - 16, 7, 14, V.body)
    fillRect(buf, ox, oy, 35, footY - 14, 7, 12, V.body)
    fillRect(buf, ox, oy, 22, footY - 4, 7, 3, V.shoe)
    fillRect(buf, ox, oy, 35, footY - 4, 7, 3, V.shoe)
  } else if (hit) {
    fillRect(buf, ox, oy, 20, footY - 16, 7, 16, V.body)
    fillRect(buf, ox, oy, 36, footY - 16, 7, 16, V.body)
    fillRect(buf, ox, oy, 20, footY - 2, 7, 3, V.shoe)
    fillRect(buf, ox, oy, 36, footY - 2, 7, 3, V.shoe)
  } else {
    fillRect(buf, ox, oy, 24, footY - 18, 7, 18, V.body)
    fillRect(buf, ox, oy, 33, footY - 18, 7, 18, V.body)
    fillRect(buf, ox, oy, 24, footY - 10, 7, 3, V.pink)
    fillRect(buf, ox, oy, 33, footY - 6, 7, 3, V.teal)
    fillRect(buf, ox, oy, 24, footY - 2, 7, 3, V.shoe)
    fillRect(buf, ox, oy, 33, footY - 2, 7, 3, V.shoe)
  }

  // torso hoodie
  const tx = hit ? 20 : 21
  fillRect(buf, ox, oy, tx, torsoY, 22, 22, V.body)
  fillRect(buf, ox, oy, tx, torsoY, 5, 22, V.pink)
  fillRect(buf, ox, oy, tx + 17, torsoY, 5, 22, V.teal)
  fillRect(buf, ox, oy, tx + 2, torsoY + 2, 18, 2, V.bodyHi)
  // cobra crest
  fillRect(buf, ox, oy, tx + 8, torsoY + 6, 6, 2, V.teal)
  fillRect(buf, ox, oy, tx + 7, torsoY + 8, 8, 4, V.teal)
  fillRect(buf, ox, oy, tx + 9, torsoY + 12, 4, 4, V.teal)

  // arms
  if (punch && pose === 'punch1') {
    fillRect(buf, ox, oy, tx - 4, torsoY + 4, 5, 14, V.skin)
    fillRect(buf, ox, oy, tx + 18, torsoY + 6, 24, 5, V.skin)
    fillRect(buf, ox, oy, tx + 40, torsoY + 4, 7, 8, V.pink)
    fillRect(buf, ox, oy, tx + 41, torsoY + 5, 3, 3, V.white)
  } else if (special && pose === 'special1') {
    fillRect(buf, ox, oy, tx - 4, torsoY + 4, 5, 14, V.skin)
    fillRect(buf, ox, oy, tx + 18, torsoY + 2, 18, 5, V.skin)
    fillRect(buf, ox, oy, tx + 34, torsoY - 4, 10, 10, V.pink)
    fillRect(buf, ox, oy, tx + 36, torsoY - 2, 6, 6, V.teal)
  } else if (kick && pose === 'kick1') {
    fillRect(buf, ox, oy, tx - 2, torsoY + 4, 5, 14, V.skin)
    fillRect(buf, ox, oy, tx + 18, torsoY + 6, 5, 12, V.skin)
  } else if (jump) {
    fillRect(buf, ox, oy, tx - 4, torsoY + 2, 5, 12, V.skin)
    fillRect(buf, ox, oy, tx + 21, torsoY + 2, 5, 12, V.skin)
  } else if (hit) {
    fillRect(buf, ox, oy, tx - 6, torsoY + 2, 5, 10, V.skin)
    fillRect(buf, ox, oy, tx + 22, torsoY + 8, 5, 10, V.skin)
  } else {
    const armBob = bob
    fillRect(buf, ox, oy, tx - 4, torsoY + 4 + armBob, 5, 14, V.skin)
    fillRect(buf, ox, oy, tx + 21, torsoY + 4 - armBob, 5, 14, V.skin)
    fillRect(buf, ox, oy, tx - 4, torsoY + 14 + armBob, 5, 3, V.skinDk)
    fillRect(buf, ox, oy, tx + 21, torsoY + 14 - armBob, 5, 3, V.skinDk)
  }

  // head
  const hx = hit ? tx + 2 : tx + 3
  fillRect(buf, ox, oy, hx, headY, 16, 15, V.skin)
  fillRect(buf, ox, oy, hx - 1, headY - 3, 18, 6, V.hair)
  // headphones
  fillRect(buf, ox, oy, hx - 3, headY + 4, 4, 8, V.pink)
  fillRect(buf, ox, oy, hx + 15, headY + 4, 4, 8, V.pink)
  fillRect(buf, ox, oy, hx - 1, headY - 1, 18, 2, V.pink)
  // face
  fillRect(buf, ox, oy, hx + 3, headY + 5, 3, 3, V.eye)
  fillRect(buf, ox, oy, hx + 10, headY + 5, 3, 3, V.eye)
  fillRect(buf, ox, oy, hx + 4, headY + 5, 1, 1, V.white)
  fillRect(buf, ox, oy, hx + 11, headY + 5, 1, 1, V.white)
  if (!hit) fillRect(buf, ox, oy, hx + 6, headY + 10, 4, 2, V.skinDk)
  else fillRect(buf, ox, oy, hx + 5, headY + 9, 6, 3, V.skinDk)

  // light outline accents
  outlineRect(buf, ox, oy, tx, torsoY, 22, 22, V.outline)
}

function paintHayate(buf, col, row, pose = 'idle0') {
  const ox = col * CELL_W
  const oy = row * CELL_H
  shadow(buf, ox, oy)

  const bob = pose === 'idle1' || pose === 'idle3' ? 1 : 0
  const walk = pose.startsWith('walk')
  const walkPhase = pose === 'walk1' || pose === 'walk3' ? 1 : 0
  const punch = pose.startsWith('punch')
  const kick = pose.startsWith('kick')
  const special = pose.startsWith('special')
  const hit = pose.startsWith('hit')
  const jump = pose.startsWith('jump')
  const portrait = pose === 'portrait'

  if (portrait) {
    fillRect(buf, ox, oy, 14, 22, 36, 42, H.gi)
    fillRect(buf, ox, oy, 20, 30, 24, 26, H.skin)
    fillRect(buf, ox, oy, 18, 20, 28, 14, H.hair)
    fillRect(buf, ox, oy, 16, 30, 32, 5, H.band)
    fillRect(buf, ox, oy, 44, 26, 6, 8, H.band)
    fillRect(buf, ox, oy, 24, 38, 4, 3, H.eye)
    fillRect(buf, ox, oy, 36, 38, 4, 3, H.eye)
    fillRect(buf, ox, oy, 25, 38, 2, 2, [255, 255, 255, 255])
    fillRect(buf, ox, oy, 37, 38, 2, 2, [255, 255, 255, 255])
    fillRect(buf, ox, oy, 14, 58, 36, 5, H.belt)
    outlineRect(buf, ox, oy, 14, 22, 36, 42, H.outline)
    return
  }

  const footY = jump ? 62 : hit ? 72 : 74
  const torsoY = (jump ? 28 : hit ? 36 : 34) - bob
  const headY = torsoY - 16

  // legs / gi pants
  if (kick && pose === 'kick1') {
    fillRect(buf, ox, oy, 24, footY - 18, 8, 18, H.gi)
    fillRect(buf, ox, oy, 32, footY - 15, 26, 8, H.gi)
    fillRect(buf, ox, oy, 55, footY - 14, 5, 5, H.skin)
    fillRect(buf, ox, oy, 24, footY - 3, 8, 3, H.shoe)
  } else if (walk) {
    const a = walkPhase ? 4 : -4
    const b = walkPhase ? -4 : 4
    fillRect(buf, ox, oy, 23 + a, footY - 18, 8, 18, H.gi)
    fillRect(buf, ox, oy, 33 + b, footY - 18, 8, 18, H.gi)
    fillRect(buf, ox, oy, 23 + a, footY - 2, 8, 3, H.shoe)
    fillRect(buf, ox, oy, 33 + b, footY - 2, 8, 3, H.shoe)
  } else if (jump) {
    fillRect(buf, ox, oy, 22, footY - 16, 8, 14, H.gi)
    fillRect(buf, ox, oy, 34, footY - 14, 8, 12, H.gi)
    fillRect(buf, ox, oy, 22, footY - 3, 8, 3, H.shoe)
    fillRect(buf, ox, oy, 34, footY - 3, 8, 3, H.shoe)
  } else if (hit) {
    fillRect(buf, ox, oy, 20, footY - 16, 8, 16, H.gi)
    fillRect(buf, ox, oy, 36, footY - 16, 8, 16, H.gi)
    fillRect(buf, ox, oy, 20, footY - 2, 8, 3, H.shoe)
    fillRect(buf, ox, oy, 36, footY - 2, 8, 3, H.shoe)
  } else {
    fillRect(buf, ox, oy, 23, footY - 18, 8, 18, H.gi)
    fillRect(buf, ox, oy, 33, footY - 18, 8, 18, H.gi)
    fillRect(buf, ox, oy, 23, footY - 2, 8, 3, H.shoe)
    fillRect(buf, ox, oy, 33, footY - 2, 8, 3, H.shoe)
  }

  // torso gi
  const tx = hit ? 20 : 21
  fillRect(buf, ox, oy, tx, torsoY, 22, 22, H.gi)
  fillRect(buf, ox, oy, tx + 9, torsoY, 4, 18, H.giDk)
  fillRect(buf, ox, oy, tx, torsoY + 18, 22, 4, H.belt)
  fillRect(buf, ox, oy, tx + 16, torsoY + 16, 8, 3, H.belt)

  // arms
  if (punch && pose === 'punch1') {
    fillRect(buf, ox, oy, tx - 4, torsoY + 4, 5, 14, H.skin)
    fillRect(buf, ox, oy, tx + 18, torsoY + 6, 24, 5, H.skin)
    fillRect(buf, ox, oy, tx + 40, torsoY + 4, 7, 8, H.skin)
    fillRect(buf, ox, oy, tx + 41, torsoY + 5, 3, 3, [255, 255, 255, 255])
  } else if (special && pose === 'special1') {
    fillRect(buf, ox, oy, tx - 4, torsoY + 4, 5, 14, H.skin)
    fillRect(buf, ox, oy, tx + 18, torsoY + 2, 16, 5, H.skin)
    fillRect(buf, ox, oy, tx + 32, torsoY - 6, 12, 12, H.special)
    fillRect(buf, ox, oy, tx + 35, torsoY - 3, 6, 6, [255, 255, 255, 255])
  } else if (kick && pose === 'kick1') {
    fillRect(buf, ox, oy, tx - 2, torsoY + 4, 5, 14, H.skin)
    fillRect(buf, ox, oy, tx + 18, torsoY + 6, 5, 12, H.skin)
  } else if (jump) {
    fillRect(buf, ox, oy, tx - 4, torsoY + 2, 5, 12, H.skin)
    fillRect(buf, ox, oy, tx + 21, torsoY + 2, 5, 12, H.skin)
  } else if (hit) {
    fillRect(buf, ox, oy, tx - 6, torsoY + 2, 5, 10, H.skin)
    fillRect(buf, ox, oy, tx + 22, torsoY + 8, 5, 10, H.skin)
  } else {
    fillRect(buf, ox, oy, tx - 4, torsoY + 4 + bob, 5, 14, H.skin)
    fillRect(buf, ox, oy, tx + 21, torsoY + 4 - bob, 5, 14, H.skin)
    fillRect(buf, ox, oy, tx - 4, torsoY + 14 + bob, 5, 3, H.skinDk)
    fillRect(buf, ox, oy, tx + 21, torsoY + 14 - bob, 5, 3, H.skinDk)
  }

  // head
  const hx = hit ? tx + 2 : tx + 3
  fillRect(buf, ox, oy, hx, headY, 16, 15, H.skin)
  fillRect(buf, ox, oy, hx - 1, headY - 5, 18, 8, H.hair)
  fillRect(buf, ox, oy, hx - 2, headY + 2, 20, 4, H.band)
  fillRect(buf, ox, oy, hx + 15, headY + 1, 5, 6, H.band)
  fillRect(buf, ox, oy, hx + 3, headY + 5, 3, 3, H.eye)
  fillRect(buf, ox, oy, hx + 10, headY + 5, 3, 3, H.eye)
  fillRect(buf, ox, oy, hx + 4, headY + 5, 1, 1, [255, 255, 255, 255])
  fillRect(buf, ox, oy, hx + 11, headY + 5, 1, 1, [255, 255, 255, 255])
  if (!hit) fillRect(buf, ox, oy, hx + 6, headY + 10, 4, 2, H.skinDk)
  else fillRect(buf, ox, oy, hx + 5, headY + 9, 6, 3, H.skinDk)

  outlineRect(buf, ox, oy, tx, torsoY, 22, 22, H.outline)
}

const IDLE = ['idle0', 'idle1', 'idle2', 'idle3']
const WALK = ['walk0', 'walk1', 'walk2', 'walk3']
const PUNCH = ['punch0', 'punch1', 'punch1', 'punch1']
const KICK = ['kick0', 'kick1', 'kick1', 'kick1']
const SPECIAL = ['special0', 'special1', 'special1', 'special1']
const HIT = ['hit0', 'hit1', 'hit1', 'hit1']
const JUMP = ['jump0', 'jump1', 'jump1', 'jump1']
const PORTRAIT = ['portrait', 'portrait', 'portrait', 'portrait']

function paintCharacter(painter) {
  const buf = makeAtlas()
  const rows = [IDLE, WALK, PUNCH, KICK, SPECIAL, HIT, JUMP, PORTRAIT]
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < COLS; c++) {
      painter(buf, c, r, rows[r][c])
    }
  }
  return buf
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'viper.png'), encodePng(ATLAS_W, ATLAS_H, paintCharacter(paintViper)))
writeFileSync(join(OUT_DIR, 'hayate.png'), encodePng(ATLAS_W, ATLAS_H, paintCharacter(paintHayate)))
console.log(`Wrote ${OUT_DIR}/viper.png and hayate.png (${ATLAS_W}×${ATLAS_H})`)
