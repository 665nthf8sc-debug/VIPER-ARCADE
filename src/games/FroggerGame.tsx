import { useEffect, useRef, useState } from 'react'
import { pressed, useKeyboard } from '../hooks/useKeyboard'
import { sfx } from '../lib/sfx'
import {
  atlasesReady,
  drawDenSprite,
  drawLaneTile,
  drawLifeIcon,
  drawPlatformSprite,
  drawVehicleSprite,
  drawViperSprite,
  loadFroggerAtlases,
  pickVehicleKind,
  type Facing,
  type ViperPose,
} from './frogger/atlas'

type LaneType = 'safe' | 'road' | 'water' | 'goal'

interface LaneObj {
  x: number
  w: number
  kind: number
}

interface Lane {
  type: LaneType
  speed: number
  dir: 1 | -1
  gap: number
  size: number
  objects: LaneObj[]
}

interface FroggerGameProps {
  onExit: () => void
}

const W = 480
const H = 560
const ROWS = 14
const COL = W / 12
const ROW = H / ROWS

function makeLanes(): Lane[] {
  const specs: Omit<Lane, 'objects'>[] = [
    { type: 'goal', speed: 0, dir: 1, gap: 0, size: 0 },
    { type: 'water', speed: 1.2, dir: 1, gap: 110, size: 70 },
    { type: 'water', speed: 1.6, dir: -1, gap: 130, size: 80 },
    { type: 'water', speed: 1.0, dir: 1, gap: 100, size: 60 },
    { type: 'water', speed: 1.8, dir: -1, gap: 140, size: 90 },
    { type: 'water', speed: 1.3, dir: 1, gap: 120, size: 75 },
    { type: 'safe', speed: 0, dir: 1, gap: 0, size: 0 },
    { type: 'road', speed: 1.4, dir: -1, gap: 120, size: 48 },
    { type: 'road', speed: 2.0, dir: 1, gap: 150, size: 42 },
    { type: 'road', speed: 1.1, dir: -1, gap: 100, size: 55 },
    { type: 'road', speed: 1.7, dir: 1, gap: 130, size: 46 },
    { type: 'road', speed: 2.3, dir: -1, gap: 160, size: 40 },
    { type: 'safe', speed: 0, dir: 1, gap: 0, size: 0 },
    { type: 'safe', speed: 0, dir: 1, gap: 0, size: 0 },
  ]

  return specs.map((s, laneIndex) => {
    const objects: LaneObj[] = []
    if (s.type === 'road' || s.type === 'water') {
      let x = Math.random() * 40
      while (x < W + 200) {
        objects.push({
          x,
          w: s.size,
          kind: s.type === 'road' ? pickVehicleKind(s.dir, s.size, laneIndex) : laneIndex,
        })
        x += s.gap + Math.random() * 40
      }
    }
    return { ...s, objects }
  })
}

export function FroggerGame({ onExit }: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keys = useKeyboard()
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1, message: 'INSERT COIN' })
  const [ready, setReady] = useState(false)
  const state = useRef({
    lanes: makeLanes(),
    px: 5.5,
    py: 13,
    goals: [false, false, false, false, false],
    score: 0,
    lives: 3,
    level: 1,
    hopCool: 0,
    deadFlash: 0,
    winFlash: 0,
    splash: 0,
    facing: 'n' as Facing,
    pose: 'idle' as ViperPose,
    anim: 0,
    running: true,
    time: 45,
  })

  useEffect(() => {
    let cancelled = false
    const mark = () => {
      if (!cancelled) setReady(true)
    }
    if (atlasesReady()) {
      mark()
      return () => {
        cancelled = true
      }
    }
    void loadFroggerAtlases()
      .then(mark)
      .catch((err) => {
        console.error('Frogger atlas load failed', err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    sfx.start()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()

    const resetFrog = (full = false) => {
      const s = state.current
      s.px = 5.5
      s.py = 13
      s.time = 45
      s.facing = 'n'
      s.pose = 'idle'
      s.splash = 0
      if (full) {
        s.lanes = makeLanes()
        s.goals = [false, false, false, false, false]
      }
    }

    const die = (splash = false) => {
      const s = state.current
      if (s.deadFlash > 0) return
      if (splash) sfx.splash()
      else sfx.lose()
      s.lives -= 1
      s.deadFlash = 0.55
      s.pose = splash ? 'splash' : 'dead'
      s.splash = splash ? 0.55 : 0
      if (s.lives <= 0) {
        s.running = false
        setHud((h) => ({ ...h, lives: 0, message: 'GAME OVER — PRESS R' }))
      } else {
        setHud((h) => ({ ...h, lives: s.lives, message: 'TRY AGAIN' }))
      }
    }

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const s = state.current
      s.anim += dt

      if (s.running) {
        if (s.deadFlash <= 0) s.time -= dt
        if (s.time <= 0) die()

        s.hopCool = Math.max(0, s.hopCool - dt)
        const wasDead = s.deadFlash
        s.deadFlash = Math.max(0, s.deadFlash - dt)
        s.winFlash = Math.max(0, s.winFlash - dt)
        s.splash = Math.max(0, s.splash - dt)
        if (wasDead > 0 && s.deadFlash <= 0 && s.lives > 0 && s.running) {
          resetFrog()
        }

        // hazards always scroll
        for (const lane of s.lanes) {
          if (!lane.speed) continue
          for (const o of lane.objects) {
            o.x += lane.speed * lane.dir * (1 + (s.level - 1) * 0.15)
            if (lane.dir === 1 && o.x > W + 40) o.x = -o.w - 20
            if (lane.dir === -1 && o.x < -o.w - 40) o.x = W + 20
          }
        }

        if (s.deadFlash <= 0) {
          if (s.hopCool <= 0) {
            s.pose = 'idle'
            let dx = 0
            let dy = 0
            if (pressed(keys.current, 'arrowleft', 'a')) dx = -1
            else if (pressed(keys.current, 'arrowright', 'd')) dx = 1
            else if (pressed(keys.current, 'arrowup', 'w')) dy = -1
            else if (pressed(keys.current, 'arrowdown', 's')) dy = 1
            if (dx || dy) {
              s.px = Math.max(0.5, Math.min(11.5, s.px + dx))
              s.py = Math.max(0, Math.min(13, s.py + dy))
              s.hopCool = 0.16
              s.pose = 'hop'
              s.facing = dy < 0 ? 'n' : dy > 0 ? 's' : dx > 0 ? 'e' : 'w'
              sfx.hop()
            }
          }

          const row = Math.round(s.py)
          const lane = s.lanes[row]
          const frogX = s.px * COL

          if (lane?.type === 'road') {
            for (const o of lane.objects) {
              if (frogX > o.x - 8 && frogX < o.x + o.w + 8) {
                die()
                break
              }
            }
          } else if (lane?.type === 'water') {
            let onLog = false
            for (const o of lane.objects) {
              if (frogX > o.x && frogX < o.x + o.w) {
                onLog = true
                s.px += (lane.speed * lane.dir * (1 + (s.level - 1) * 0.15)) / COL
                break
              }
            }
            if (!onLog) {
              die(true)
            } else if (s.px < 0.3 || s.px > 11.7) {
              die()
            }
          } else if (lane?.type === 'goal') {
            const slot = Math.floor(s.px / 2.4)
            const idx = Math.min(4, Math.max(0, slot))
            if (!s.goals[idx] && s.px > idx * 2.4 + 0.4 && s.px < idx * 2.4 + 2) {
              s.goals[idx] = true
              s.score += 200 + Math.floor(s.time * 5)
              sfx.win()
              s.winFlash = 0.5
              s.pose = 'den'
              if (s.goals.every(Boolean)) {
                s.level += 1
                s.score += 1000
                resetFrog(true)
                setHud({
                  score: s.score,
                  lives: s.lives,
                  level: s.level,
                  message: `LEVEL ${s.level}`,
                })
              } else {
                resetFrog()
                setHud({
                  score: s.score,
                  lives: s.lives,
                  level: s.level,
                  message: 'DEN SECURED',
                })
              }
            } else if (s.goals[idx]) {
              die()
            }
          }
        }

        setHud((h) =>
          h.score !== s.score || h.lives !== s.lives
            ? { ...h, score: s.score, lives: s.lives, level: s.level }
            : h,
        )
      }

      // DRAW
      ctx.fillStyle = '#050508'
      ctx.fillRect(0, 0, W, H)

      s.lanes.forEach((lane, i) => {
        const y = i * ROW
        if (lane.type === 'road') {
          drawLaneTile(ctx, 'road', 0, y, W, ROW)
          for (const o of lane.objects) {
            drawVehicleSprite(
              ctx,
              o.kind,
              o.x + o.w / 2,
              y + ROW / 2,
              o.w,
              ROW - 6,
              lane.dir === 1,
            )
          }
        } else if (lane.type === 'water') {
          drawLaneTile(ctx, 'water', 0, y, W, ROW)
          for (const o of lane.objects) {
            drawPlatformSprite(ctx, o.x + o.w / 2, y + ROW / 2, o.w, ROW - 10)
          }
        } else if (lane.type === 'goal') {
          drawLaneTile(ctx, 'goalBank', 0, y, W, ROW)
          for (let g = 0; g < 5; g++) {
            const gx = g * (W / 5) + (W / 5) / 2
            drawDenSprite(ctx, gx, y + ROW / 2, s.goals[g], W / 5 - 16, ROW - 6)
            if (s.goals[g]) {
              drawViperSprite(ctx, gx, y + ROW / 2, 'den', 'n', s.anim)
            }
          }
        } else {
          drawLaneTile(ctx, 'safe', 0, y, W, ROW)
        }
      })

      const frogX = s.px * COL
      const frogY = s.py * ROW + ROW / 2
      const dying = s.deadFlash > 0
      const blink = dying && s.pose === 'dead' && Math.floor(s.deadFlash * 20) % 2 === 1
      if (!blink) {
        const pose: ViperPose = dying ? (s.pose === 'splash' ? 'splash' : 'dead') : s.pose
        drawViperSprite(ctx, frogX, frogY, pose, s.facing, s.anim)
      }

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(0, 0, W, 24)
      ctx.fillStyle = '#2de2e6'
      ctx.font = '12px monospace'
      ctx.fillText(`SCORE ${s.score}`, 8, 16)
      for (let i = 0; i < s.lives; i++) {
        drawLifeIcon(ctx, 150 + i * 22, 12)
      }
      ctx.fillStyle = '#fff'
      ctx.fillText(`LV ${s.level}`, 280, 16)
      ctx.fillStyle = '#222'
      ctx.fillRect(340, 8, 120, 10)
      ctx.fillStyle = s.time < 10 ? '#ff2d95' : '#2de2e6'
      ctx.fillRect(340, 8, Math.max(0, (s.time / 45) * 120), 10)

      if (s.winFlash > 0) {
        ctx.fillStyle = `rgba(45,226,230,${s.winFlash * 0.25})`
        ctx.fillRect(0, 0, W, H)
      }

      if (!s.running) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'
        ctx.fillRect(0, H / 2 - 40, W, 80)
        ctx.fillStyle = '#ff2d95'
        ctx.font = 'bold 28px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('GAME OVER', W / 2, H / 2)
        ctx.fillStyle = '#2de2e6'
        ctx.font = '12px monospace'
        ctx.fillText('R restart · ESC arcade', W / 2, H / 2 + 24)
        ctx.textAlign = 'left'
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [keys, ready])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
      if (e.key.toLowerCase() === 'r' && state.current.lives <= 0) {
        state.current = {
          lanes: makeLanes(),
          px: 5.5,
          py: 13,
          goals: [false, false, false, false, false],
          score: 0,
          lives: 3,
          level: 1,
          hopCool: 0,
          deadFlash: 0,
          winFlash: 0,
          splash: 0,
          facing: 'n',
          pose: 'idle',
          anim: 0,
          running: true,
          time: 45,
        }
        setHud({ score: 0, lives: 3, level: 1, message: 'INSERT COIN' })
        sfx.start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="flex w-full max-w-[480px] items-center justify-between px-1 font-[family-name:var(--font-pixel)] text-[10px] text-viper-teal">
        <span>{ready ? hud.message : 'LOADING SPRITES…'}</span>
        <span className="text-viper-pink">R = restart · ESC = exit</span>
      </div>
      <div className="crt-scanlines relative overflow-hidden rounded-sm border-4 border-[#222] shadow-[0_0_40px_rgba(45,226,230,0.25)]">
        <canvas ref={canvasRef} width={W} height={H} className="block bg-black" />
      </div>
    </div>
  )
}
