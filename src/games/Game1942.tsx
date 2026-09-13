import { useEffect, useRef, useState } from 'react'
import { pressed, useKeyboard } from '../hooks/useKeyboard'
import { sfx } from '../lib/sfx'

interface Game1942Props {
  onExit: () => void
}

const W = 400
const H = 560

interface Bullet {
  x: number
  y: number
  vy: number
  fromPlayer: boolean
}

interface Enemy {
  x: number
  y: number
  vx: number
  vy: number
  hp: number
  kind: 'scout' | 'bomber' | 'ace'
  shootCd: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export function Game1942({ onExit }: Game1942Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keys = useKeyboard()
  const [hud, setHud] = useState({ score: 0, lives: 3, wave: 1, message: 'ENGAGE' })

  const state = useRef({
    px: W / 2,
    py: H - 70,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    score: 0,
    lives: 3,
    wave: 1,
    fireCd: 0,
    loopCd: 0,
    looping: 0,
    invuln: 0,
    spawnTimer: 0,
    scroll: 0,
    running: true,
    stars: Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 0.5 + Math.random() * 2,
    })),
  })

  useEffect(() => {
    sfx.start()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()

    const explode = (x: number, y: number, color: string) => {
      for (let i = 0; i < 14; i++) {
        state.current.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 180,
          vy: (Math.random() - 0.5) * 180,
          life: 0.4 + Math.random() * 0.4,
          color,
        })
      }
      sfx.explode()
    }

    const spawnWave = () => {
      const s = state.current
      const count = 4 + s.wave
      for (let i = 0; i < count; i++) {
        const kind: Enemy['kind'] =
          i % 5 === 0 ? 'ace' : i % 3 === 0 ? 'bomber' : 'scout'
        s.enemies.push({
          x: 40 + Math.random() * (W - 80),
          y: -30 - i * 36,
          vx: (Math.random() - 0.5) * (60 + s.wave * 8),
          vy: 30 + Math.random() * 25 + s.wave * 3,
          hp: kind === 'ace' ? 3 : kind === 'bomber' ? 2 : 1,
          kind,
          shootCd: 1 + Math.random() * 2,
        })
      }
    }

    spawnWave()

    const drawPlayer = (x: number, y: number, looping: number) => {
      ctx.save()
      ctx.translate(x, y)
      if (looping > 0) ctx.rotate(looping * Math.PI * 2)
      // fuselage
      ctx.fillStyle = '#111'
      ctx.beginPath()
      ctx.moveTo(0, -22)
      ctx.lineTo(14, 12)
      ctx.lineTo(0, 8)
      ctx.lineTo(-14, 12)
      ctx.closePath()
      ctx.fill()
      // neon stripes
      ctx.fillStyle = '#ff2d95'
      ctx.fillRect(-3, -10, 2, 18)
      ctx.fillStyle = '#2de2e6'
      ctx.fillRect(1, -10, 2, 18)
      // wings
      ctx.fillStyle = '#2de2e6'
      ctx.fillRect(-20, 0, 16, 4)
      ctx.fillStyle = '#ff2d95'
      ctx.fillRect(4, 0, 16, 4)
      // cobra nose
      ctx.fillStyle = '#ff2d95'
      ctx.beginPath()
      ctx.moveTo(0, -22)
      ctx.lineTo(4, -12)
      ctx.lineTo(-4, -12)
      ctx.fill()
      // engine glow
      ctx.fillStyle = '#2de2e6'
      ctx.globalAlpha = 0.7
      ctx.fillRect(-3, 10, 6, 8 + Math.random() * 6)
      ctx.restore()
    }

    const drawEnemy = (e: Enemy) => {
      ctx.save()
      ctx.translate(e.x, e.y)
      const color =
        e.kind === 'ace' ? '#ff2d95' : e.kind === 'bomber' ? '#c9a227' : '#7b2cbf'
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(0, 16)
      ctx.lineTo(12, -10)
      ctx.lineTo(0, -4)
      ctx.lineTo(-12, -10)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#111'
      ctx.fillRect(-3, -4, 6, 10)
      ctx.restore()
    }

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const s = state.current

      if (s.running) {
        s.scroll += dt * 80
        s.fireCd = Math.max(0, s.fireCd - dt)
        s.loopCd = Math.max(0, s.loopCd - dt)
        s.invuln = Math.max(0, s.invuln - dt)
        s.looping = Math.max(0, s.looping - dt)
        s.spawnTimer -= dt

        const speed = 220
        if (pressed(keys.current, 'arrowleft', 'a')) s.px -= speed * dt
        if (pressed(keys.current, 'arrowright', 'd')) s.px += speed * dt
        if (pressed(keys.current, 'arrowup', 'w')) s.py -= speed * dt
        if (pressed(keys.current, 'arrowdown', 's')) s.py += speed * dt
        s.px = Math.max(20, Math.min(W - 20, s.px))
        s.py = Math.max(40, Math.min(H - 30, s.py))

        if (pressed(keys.current, ' ', 'z') && s.fireCd <= 0 && s.looping <= 0) {
          s.bullets.push({ x: s.px, y: s.py - 20, vy: -420, fromPlayer: true })
          s.fireCd = 0.14
          sfx.shoot()
        }

        if (pressed(keys.current, 'x') && s.loopCd <= 0) {
          s.looping = 0.55
          s.loopCd = 3
          s.invuln = 0.55
          sfx.special()
        }

        // bullets
        s.bullets.forEach((b) => {
          b.y += b.vy * dt
        })
        s.bullets = s.bullets.filter((b) => b.y > -20 && b.y < H + 20)

        // enemies
        for (const e of s.enemies) {
          e.x += e.vx * dt
          e.y += e.vy * dt
          if (e.x < 20 || e.x > W - 20) e.vx *= -1
          e.shootCd -= dt
          if (e.shootCd <= 0 && e.y > 0 && e.y < H * 0.7) {
            s.bullets.push({
              x: e.x,
              y: e.y + 12,
              vy: 180 + s.wave * 10,
              fromPlayer: false,
            })
            e.shootCd = e.kind === 'ace' ? 0.8 : 1.6
          }
        }

        // collisions player bullets
        for (const b of s.bullets.filter((x) => x.fromPlayer)) {
          for (const e of s.enemies) {
            if (Math.hypot(b.x - e.x, b.y - e.y) < 18) {
              b.y = -999
              e.hp -= 1
              sfx.hit()
              if (e.hp <= 0) {
                explode(e.x, e.y, '#ff2d95')
                s.score += e.kind === 'ace' ? 300 : e.kind === 'bomber' ? 150 : 100
                e.y = 9999
              }
            }
          }
        }
        s.enemies = s.enemies.filter((e) => e.y < H + 40 && e.y > -80)

        // enemy bullets / ramming
        if (s.invuln <= 0) {
          for (const b of s.bullets.filter((x) => !x.fromPlayer)) {
            if (Math.hypot(b.x - s.px, b.y - s.py) < 14) {
              b.y = 9999
              s.lives -= 1
              s.invuln = 1.5
              explode(s.px, s.py, '#2de2e6')
              if (s.lives <= 0) {
                s.running = false
                setHud((h) => ({ ...h, lives: 0, message: 'SHOT DOWN' }))
                sfx.lose()
              }
            }
          }
          for (const e of s.enemies) {
            if (Math.hypot(e.x - s.px, e.y - s.py) < 22) {
              e.y = 9999
              s.lives -= 1
              s.invuln = 1.5
              explode(s.px, s.py, '#2de2e6')
              if (s.lives <= 0) {
                s.running = false
                setHud((h) => ({ ...h, lives: 0, message: 'SHOT DOWN' }))
                sfx.lose()
              }
            }
          }
        }

        if (s.enemies.length === 0) {
          s.wave += 1
          s.score += 500
          spawnWave()
          setHud({
            score: s.score,
            lives: s.lives,
            wave: s.wave,
            message: `WAVE ${s.wave}`,
          })
          sfx.win()
        }

        // particles
        for (const p of s.particles) {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.life -= dt
        }
        s.particles = s.particles.filter((p) => p.life > 0)

        setHud((h) =>
          h.score !== s.score || h.lives !== s.lives
            ? { score: s.score, lives: s.lives, wave: s.wave, message: h.message }
            : h,
        )
      }

      // DRAW
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#050818')
      g.addColorStop(1, '#12081c')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)

      for (const st of s.stars) {
        st.y = (st.y + st.s * 60 * dt) % H
        ctx.fillStyle = st.s > 1.5 ? '#2de2e6' : '#ffffff88'
        ctx.fillRect(st.x, st.y, st.s, st.s)
      }

      // distant clouds bands
      ctx.fillStyle = 'rgba(255,45,149,0.05)'
      for (let i = 0; i < 4; i++) {
        const y = ((s.scroll * 0.3 + i * 140) % (H + 40)) - 20
        ctx.fillRect(0, y, W, 18)
      }

      for (const b of s.bullets) {
        ctx.fillStyle = b.fromPlayer ? '#2de2e6' : '#ff2d95'
        ctx.fillRect(b.x - 2, b.y - 6, 4, 10)
      }

      for (const e of s.enemies) drawEnemy(e)
      for (const p of s.particles) {
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, 3, 3)
        ctx.globalAlpha = 1
      }

      if (s.invuln <= 0 || Math.floor(s.invuln * 15) % 2 === 0) {
        drawPlayer(s.px, s.py, s.looping > 0 ? 1 - s.looping / 0.55 : 0)
      }

      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, W, 24)
      ctx.font = '12px monospace'
      ctx.fillStyle = '#2de2e6'
      ctx.fillText(`SCORE ${s.score}`, 8, 16)
      ctx.fillStyle = '#ff2d95'
      ctx.fillText(`LIVES ${s.lives}`, 140, 16)
      ctx.fillStyle = '#fff'
      ctx.fillText(`WAVE ${s.wave}`, 240, 16)
      if (s.loopCd > 0) {
        ctx.fillStyle = '#888'
        ctx.fillText(`LOOP ${s.loopCd.toFixed(1)}`, 320, 16)
      } else {
        ctx.fillStyle = '#2de2e6'
        ctx.fillText('LOOP READY', 310, 16)
      }

      if (!s.running) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'
        ctx.fillRect(0, H / 2 - 40, W, 80)
        ctx.fillStyle = '#ff2d95'
        ctx.font = 'bold 26px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('GAME OVER', W / 2, H / 2)
        ctx.fillStyle = '#2de2e6'
        ctx.font = '11px monospace'
        ctx.fillText('R restart · ESC exit', W / 2, H / 2 + 24)
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
      if (e.key.toLowerCase() === 'r' && !state.current.running) {
        state.current.score = 0
        state.current.lives = 3
        state.current.wave = 1
        state.current.bullets = []
        state.current.enemies = []
        state.current.particles = []
        state.current.running = true
        state.current.px = W / 2
        state.current.py = H - 70
        setHud({ score: 0, lives: 3, wave: 1, message: 'ENGAGE' })
        sfx.start()
        // spawn handled next frame by empty enemies check
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="flex w-full max-w-[400px] items-center justify-between px-1 font-[family-name:var(--font-pixel)] text-[9px] text-viper-teal">
        <span>{hud.message}</span>
        <span className="text-viper-pink">SPACE fire · X loop</span>
      </div>
      <div className="crt-scanlines relative overflow-hidden rounded-sm border-4 border-[#222] shadow-[0_0_40px_rgba(255,45,149,0.3)]">
        <canvas ref={canvasRef} width={W} height={H} className="block bg-black" />
      </div>
    </div>
  )
}
