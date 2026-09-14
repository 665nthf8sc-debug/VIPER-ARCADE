/** Animation clips for VIPER / PEELY HD sprite atlases (72×96 cells). */

export type AnimName =
  | 'idle'
  | 'walk'
  | 'punch'
  | 'kick'
  | 'special'
  | 'hit'
  | 'jump'
  | 'portrait'

export interface AnimClip {
  /** Row index in the atlas grid */
  row: number
  /** Number of frames in this clip */
  frames: number
  /** Playback speed */
  fps: number
  /** Hold last frame when finished (attacks) */
  holdLast?: boolean
}

/** Uniform cell size shared by both character atlases */
export const CELL_W = 72
export const CELL_H = 96
export const ATLAS_COLS = 4

export const CLIPS: Record<AnimName, AnimClip> = {
  idle: { row: 0, frames: 4, fps: 6 },
  walk: { row: 1, frames: 4, fps: 10 },
  punch: { row: 2, frames: 2, fps: 12, holdLast: true },
  kick: { row: 3, frames: 2, fps: 10, holdLast: true },
  special: { row: 4, frames: 2, fps: 10, holdLast: true },
  hit: { row: 5, frames: 2, fps: 8, holdLast: true },
  jump: { row: 6, frames: 2, fps: 8, holdLast: true },
  portrait: { row: 7, frames: 1, fps: 1 },
}

export interface AnimDriverInput {
  vx: number
  jumping: boolean
  hitstun: number
  attacking: number
  attackType: 'punch' | 'kick' | 'special' | null
}

/** Map fighter combat state → clip name (priority: hit > attack > jump > walk > idle). */
export function resolveAnim(f: AnimDriverInput): AnimName {
  if (f.hitstun > 0) return 'hit'
  if (f.attacking > 0 && f.attackType) return f.attackType
  if (f.jumping) return 'jump'
  if (Math.abs(f.vx) > 8) return 'walk'
  return 'idle'
}

/** Frame index within the current clip based on elapsed anim time. */
export function clipFrame(name: AnimName, animTime: number): number {
  const clip = CLIPS[name]
  const raw = Math.floor(animTime * clip.fps)
  if (clip.holdLast) return Math.min(clip.frames - 1, raw)
  return ((raw % clip.frames) + clip.frames) % clip.frames
}
