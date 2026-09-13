import { useEffect, useRef, useState } from 'react'
import { pressed, useKeyboard } from '../hooks/useKeyboard'
import { sfx } from '../lib/sfx'

type LaneType = 'safe' | 'road' | 'water' | 'goal'

interface Lane {
  type: LaneType
  speed: number
  dir: 1 | -1
  gap: number
  size: number
  color: string
  objects: { x: number; w: number }[]
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
    { type: 'goal', speed: 0, dir: 1, gap: 0, size: 0, color: '#102018' },
    { type: 'water', speed: 1.2, dir: 1, gap: 110, size: 70, color: '#0a2840' },
    { type: 'water', speed: 1.6, dir: -1, gap: 130, size: 80, color: '#0a3048' },
    { type: 'water', speed: 1.0, dir: 1, gap: 100, size: 60, color: '#0a2840' },
    { type: 'water', speed: 1.8, dir: -1, gap: 140, size: 90, color: '#0a3048' },
    { type: 'water', speed: 1.3, dir: 1, gap: 120, size: 75, color: '#0a2840' },
    { type: 'safe', speed: 0, dir: 1, gap: 0, size: 0, color: '#1a1030' },
    { type: 'road', speed: 1.4, dir: -1, gap: 120, size: 48, color: '#121218' },
    { type: 'road', speed: 2.0, dir: 1, gap: 150, size: 42, color: '#16161e' },
    { type: 'road', speed: 1.1, dir: -1, gap: 100, size: 55, color: '#121218' },
    { type: 'road', speed: 1.7, dir: 1, gap: 130, size: 46, color: '#16161e' },
    { type: 'road', speed: 2.3, dir: -1, gap: 160, size: 40, color: '#121218' },
    { type: 'safe', speed: 0, dir: 1, gap: 0, size: 0, color: '#1a1030' },
    { type: 'safe', speed: 0, dir: 1, gap: 0, size: 0, color: '#221840' },
  ]

  return specs.map((s) => {
    const objects: { x: number; w: number }[] = []
    if (s.type === 'road' || s.type === 'water') {
      let x = Math.random() * 40
      while (x < W + 200) {
        objects.push({ x, w: s.size })
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
    running: true,
    time: 45,
  })

  useEffect(() => {
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
      if (full) {
        s.lanes = makeLanes()
        s.goals = [false, false, false, false, false]
      }
    }

    const die = () => {
      const s = state.current
      sfx.lose()
      s.lives -= 1
      s.deadFlash = 0.6
      if (s.lives <= 0) {
        s.running = false
        setHud((h) => ({ ...h, lives: 0, message: 'GAME OVER — PRESS ESC' }))
      } else {
        resetFrog()
        setHud((h) => ({ ...h, lives: s.lives, message: 'TRY AGAIN' }))
      }
    }

    const drawViper = (x: number, y: number, scale = 1) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(scale, scale)
      // hoodie body
      ctx.fillStyle = '#111'
      ctx.fillRect(-10, -6, 20, 18)
      // neon panels
      ctx.fillStyle = '#ff2d95'
      ctx.fillRect(-10, -4, 5, 14)
      ctx.fillStyle = '#2de2e6'
      ctx.fillRect(5, -4, 5, 14)
      // head
      ctx.fillStyle = '#e8c4a0'
      ctx.beginPath()
      ctx.arc(0, -12, 7, 0, Math.PI * 2)
      ctx.fill()
      // hair
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(-8, -20, 16, 8)
      // headphones
      ctx.strokeStyle = '#ff2d95'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(0, -12, 10, Math.PI * 1.1, Math.PI * 1.9)
      ctx.stroke()
      ctx.fillStyle = '#ff2d95'
      ctx.beginPath()
      ctx.arc(-10, -12, 3, 0, Math.PI * 2)
      ctx.arc(10, -12, 3, 0, Math.PI * 2)
      ctx.fill()
      // cobra emblem
      ctx.fillStyle = '#2de2e6'
      ctx.beginPath()
      ctx.moveTo(0, -2)
      ctx.lineTo(4, 6)
      ctx.lineTo(0, 4)
      ctx.lineTo(-4, 6)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const s = state.current

      if (s.running) {
        s.time -= dt
        if (s.time <= 0) die()

        s.hopCool = Math.max(0, s.hopCool - dt)
        s.deadFlash = Math.max(0, s.deadFlash - dt)
        s.winFlash = Math.max(0, s.winFlash - dt)

        if (s.hopCool <= 0) {
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
            sfx.hop()
          }
        }

        // move hazards / logs
        for (const lane of s.lanes) {
          if (!lane.speed) continue
          for (const o of lane.objects) {
            o.x += lane.speed * lane.dir * (1 + (s.level - 1) * 0.15)
            if (lane.dir === 1 && o.x > W + 40) o.x = -o.w - 20
            if (lane.dir === -1 && o.x < -o.w - 40) o.x = W + 20
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
            sfx.splash()
            die()
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
        ctx.fillStyle = lane.color
        ctx.fillRect(0, i * ROW, W, ROW)

        if (lane.type === 'road') {
          ctx.strokeStyle = 'rgba(255,255,255,0.15)'
          ctx.setLineDash([8, 10])
          ctx.beginPath()
          ctx.moveTo(0, i * ROW + ROW / 2)
          ctx.lineTo(W, i * ROW + ROW / 2)
          ctx.stroke()
          ctx.setLineDash([])
          for (const o of lane.objects) {
            // neon cars
            ctx.fillStyle = i % 2 ? '#ff2d95' : '#2de2e6'
            ctx.fillRect(o.x, i * ROW + 6, o.w, ROW - 12)
            ctx.fillStyle = '#111'
            ctx.fillRect(o.x + 6, i * ROW + 10, o.w - 12, ROW - 20)
            ctx.fillStyle = '#ffe566'
            ctx.fillRect(
              lane.dir === 1 ? o.x + o.w - 6 : o.x + 2,
              i * ROW + ROW / 2 - 3,
              4,
              6,
            )
          }
        } else if (lane.type === 'water') {
          // toxic shimmer
          ctx.fillStyle = 'rgba(45,226,230,0.08)'
          ctx.fillRect(0, i * ROW, W, ROW)
          for (const o of lane.objects) {
            ctx.fillStyle = '#2a1a10'
            ctx.fillRect(o.x, i * ROW + 8, o.w, ROW - 16)
            ctx.fillStyle = '#ff2d95'
            ctx.fillRect(o.x + 4, i * ROW + 10, o.w - 8, 3)
            ctx.fillStyle = '#2de2e6'
            ctx.fillRect(o.x + 4, i * ROW + ROW - 13, o.w - 8, 3)
          }
        } else if (lane.type === 'goal') {
          for (let g = 0; g < 5; g++) {
            const gx = g * (W / 5) + 12
            ctx.fillStyle = s.goals[g] ? '#2de2e6' : '#0a1810'
            ctx.fillRect(gx, i * ROW + 4, W / 5 - 24, ROW - 8)
            if (s.goals[g]) {
              drawViper(gx + (W / 5 - 24) / 2, i * ROW + ROW / 2, 0.55)
            } else {
              ctx.strokeStyle = '#ff2d95'
              ctx.strokeRect(gx, i * ROW + 4, W / 5 - 24, ROW - 8)
              ctx.fillStyle = '#ff2d95'
              ctx.font = '10px monospace'
              ctx.fillText('DEN', gx + 18, i * ROW + ROW / 2 + 3)
            }
          }
        } else if (lane.type === 'safe') {
          ctx.fillStyle = 'rgba(255,45,149,0.12)'
          for (let x = 0; x < W; x += 16) {
            ctx.fillRect(x, i * ROW + ROW - 3, 8, 2)
          }
        }
      })

      // player
      const frogX = s.px * COL
      const frogY = s.py * ROW + ROW / 2
      if (s.deadFlash <= 0 || Math.floor(s.deadFlash * 20) % 2 === 0) {
        drawViper(frogX, frogY, 0.9)
      }

      // HUD bar
      ctx.fillStyle = 'rgba(0,0,0,0.65)'
      ctx.fillRect(0, 0, W, 22)
      ctx.fillStyle = '#2de2e6'
      ctx.font = '12px monospace'
      ctx.fillText(`SCORE ${s.score}`, 8, 15)
      ctx.fillStyle = '#ff2d95'
      ctx.fillText(`LIVES ${s.lives}`, 160, 15)
      ctx.fillStyle = '#fff'
      ctx.fillText(`LV ${s.level}`, 280, 15)
      ctx.fillStyle = s.time < 10 ? '#ff2d95' : '#2de2e6'
      ctx.fillRect(340, 8, Math.max(0, (s.time / 45) * 120), 8)

      if (!s.running) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        ctx.fillRect(0, H / 2 - 40, W, 80)
        ctx.fillStyle = '#ff2d95'
        ctx.font = 'bold 28px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('GAME OVER', W / 2, H / 2)
        ctx.fillStyle = '#2de2e6'
        ctx.font = '12px monospace'
        ctx.fillText('ESC to return to arcade', W / 2, H / 2 + 24)
        ctx.textAlign = 'left'
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [keys])

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
        <span>{hud.message}</span>
        <span className="text-viper-pink">R = restart · ESC = exit</span>
      </div>
      <div className="crt-scanlines relative overflow-hidden rounded-sm border-4 border-[#222] shadow-[0_0_40px_rgba(45,226,230,0.25)]">
        <canvas ref={canvasRef} width={W} height={H} className="block bg-black" />
      </div>
    </div>
  )
}
