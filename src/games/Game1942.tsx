import { useEffect, useRef, useState } from 'react'
import { pressed, useKeyboard } from '../hooks/useKeyboard'
import { sfx } from '../lib/sfx'
import {
  atlasesReady,
  drawBulletSprite,
  drawCloudSprite,
  drawEnemySprite,
  drawExplosionSprite,
  drawIslandSprite,
  drawLifeIcon,
  drawOceanTile,
  drawPlayerSprite,
  drawPowSprite,
  load1942Atlases,
  type EnemyKind,
  type PlayerFrame,
} from './game1942/atlas'

interface Game1942Props {
  onExit: () => void
}

/** Close to classic vertical shooter aspect (scaled for web CRT). */
const W = 384
const H = 512

interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  fromPlayer: boolean
  dual: boolean
}

interface Enemy {
  x: number
  y: number
  vx: number
  vy: number
  hp: number
  kind: EnemyKind
  shootCd: number
  anim: number
  score: number
  dropPow: boolean
  /** Formation path: sine sway amplitude */
  sway: number
  swayPhase: number
  age: number
}

interface Pow {
  x: number
  y: number
  vy: number
}

interface Explosion {
  x: number
  y: number
  frame: number
  age: number
}

interface Deco {
  x: number
  y: number
  kind: 'island' | 'cloud0' | 'cloud1'
  speed: number
}

interface Hud {
  score: number
  lives: number
  rolls: number
  stage: number
  power: number
  message: string
}

function enemyStats(kind: EnemyKind): { hp: number; score: number } {
  switch (kind) {
    case 'scout':
      return { hp: 1, score: 50 }
    case 'red':
      return { hp: 1, score: 100 }
    case 'ace':
      return { hp: 2, score: 200 }
    case 'bomber':
      return { hp: 4, score: 400 }
    case 'heavy':
      return { hp: 8, score: 1000 }
  }
}

export function Game1942({ onExit }: Game1942Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keys = useKeyboard()
  const [hud, setHud] = useState<Hud>({
    score: 0,
    lives: 3,
    rolls: 3,
    stage: 1,
    power: 0,
    message: 'READY',
  })
  const [ready, setReady] = useState(false)

  const state = useRef({
    px: W / 2,
    py: H - 80,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    particles: [] as Explosion[],
    pows: [] as Pow[],
    deco: [] as Deco[],
    score: 0,
    lives: 3,
    rolls: 3,
    stage: 1,
    power: 0, // 0 single, 1 dual, 2 rapid dual
    fireCd: 0,
    looping: 0,
    invuln: 0,
    spawnTimer: 0.5,
    scroll: 0,
    running: true,
    bank: 0 as -1 | 0 | 1,
    waveQuota: 0,
    killed: 0,
    msgTimer: 2,
    msg: 'STAGE 1',
    time: 0,
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
    void load1942Atlases()
      .then(mark)
      .catch((err) => {
        console.error('1942 atlas load failed', err)
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
    const s = state.current

    // Seed scrolling decor
    s.deco = [
      { x: 80, y: -40, kind: 'cloud0', speed: 28 },
      { x: 280, y: 120, kind: 'cloud1', speed: 22 },
      { x: 200, y: -200, kind: 'island', speed: 40 },
      { x: 60, y: 300, kind: 'cloud0', speed: 26 },
      { x: 300, y: -360, kind: 'island', speed: 40 },
    ]

    const setMsg = (text: string, dur = 2) => {
      s.msg = text
      s.msgTimer = dur
    }

    const explode = (x: number, y: number) => {
      s.particles.push({ x, y, frame: 0, age: 0 })
      sfx.explode()
    }

    const pushEnemy = (
      kind: EnemyKind,
      x: number,
      y: number,
      vx: number,
      vy: number,
      opts?: Partial<Pick<Enemy, 'dropPow' | 'sway' | 'swayPhase'>>,
    ) => {
      const st = enemyStats(kind)
      s.enemies.push({
        x,
        y,
        vx,
        vy,
        hp: st.hp,
        kind,
        shootCd: 0.8 + Math.random() * 1.4,
        anim: Math.random() * 4,
        score: st.score,
        dropPow: opts?.dropPow ?? kind === 'red',
        sway: opts?.sway ?? 0,
        swayPhase: opts?.swayPhase ?? 0,
        age: 0,
      })
    }

    /** Classic-style formation spawns keyed by stage. */
    const spawnFormation = () => {
      const stage = s.stage
      const roll = Math.random()
      const top = -30 - Math.random() * 40

      if (roll < 0.28) {
        // V formation scouts
        const cx = 60 + Math.random() * (W - 120)
        for (let i = 0; i < 5; i++) {
          const wing = i - 2
          pushEnemy('scout', cx + wing * 28, top - Math.abs(wing) * 22, 0, 55 + stage * 4, {
            sway: 18,
            swayPhase: i * 0.4,
          })
        }
      } else if (roll < 0.48) {
        // Side-sweep line
        const fromLeft = Math.random() < 0.5
        for (let i = 0; i < 6; i++) {
          pushEnemy(
            'scout',
            fromLeft ? -20 - i * 28 : W + 20 + i * 28,
            40 + i * 18,
            fromLeft ? 90 + stage * 5 : -(90 + stage * 5),
            35,
          )
        }
      } else if (roll < 0.62) {
        // Red POW wing
        const cx = 80 + Math.random() * (W - 160)
        for (let i = 0; i < 3; i++) {
          pushEnemy('red', cx + (i - 1) * 36, top - i * 20, (i - 1) * 20, 50 + stage * 3, {
            dropPow: i === 1,
          })
        }
      } else if (roll < 0.78) {
        // Aces diving
        for (let i = 0; i < 3; i++) {
          pushEnemy(
            'ace',
            40 + Math.random() * (W - 80),
            top - i * 50,
            (Math.random() - 0.5) * 80,
            70 + stage * 5,
          )
        }
      } else if (roll < 0.92) {
        // Mid bomber
        pushEnemy('bomber', 60 + Math.random() * (W - 120), top, (Math.random() - 0.5) * 30, 28 + stage)
      } else {
        // Heavy bomber (rarer / later)
        if (stage >= 2) {
          pushEnemy('heavy', W / 2 + (Math.random() - 0.5) * 80, top - 20, 0, 22 + stage)
        } else {
          pushEnemy('bomber', W / 2, top, 15, 30)
        }
      }

      s.waveQuota += 1
    }

    const syncHud = (message?: string) => {
      setHud({
        score: s.score,
        lives: s.lives,
        rolls: s.rolls,
        stage: s.stage,
        power: s.power,
        message: message ?? s.msg,
      })
    }

    const resetRun = () => {
      s.px = W / 2
      s.py = H - 80
      s.bullets = []
      s.enemies = []
      s.particles = []
      s.pows = []
      s.score = 0
      s.lives = 3
      s.rolls = 3
      s.stage = 1
      s.power = 0
      s.fireCd = 0
      s.looping = 0
      s.invuln = 1.2
      s.spawnTimer = 0.8
      s.scroll = 0
      s.running = true
      s.waveQuota = 0
      s.killed = 0
      setMsg('STAGE 1')
      syncHud('STAGE 1')
      sfx.start()
    }

    const hurtPlayer = () => {
      if (s.invuln > 0 || s.looping > 0) return
      explode(s.px, s.py)
      s.lives -= 1
      s.invuln = 2
      s.power = Math.max(0, s.power - 1)
      s.rolls = 3
      if (s.lives <= 0) {
        s.running = false
        setMsg('GAME OVER', 99)
        syncHud('GAME OVER')
        sfx.lose()
      } else {
        setMsg('FIGHTER DOWN', 1.2)
        syncHud()
      }
    }

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      s.time += dt

      if (s.running) {
        s.scroll += dt * 48
        s.fireCd = Math.max(0, s.fireCd - dt)
        s.invuln = Math.max(0, s.invuln - dt)
        s.looping = Math.max(0, s.looping - dt)
        s.spawnTimer -= dt
        s.msgTimer = Math.max(0, s.msgTimer - dt)

        // Movement
        const speed = 210
        let mx = 0
        let my = 0
        if (pressed(keys.current, 'arrowleft', 'a')) mx -= 1
        if (pressed(keys.current, 'arrowright', 'd')) mx += 1
        if (pressed(keys.current, 'arrowup', 'w')) my -= 1
        if (pressed(keys.current, 'arrowdown', 's')) my += 1
        if (mx !== 0 && my !== 0) {
          mx *= 0.707
          my *= 0.707
        }
        s.px += mx * speed * dt
        s.py += my * speed * dt
        s.px = Math.max(24, Math.min(W - 24, s.px))
        s.py = Math.max(36, Math.min(H - 28, s.py))
        s.bank = mx < -0.2 ? -1 : mx > 0.2 ? 1 : 0

        // Fire
        const wantFire = pressed(keys.current, ' ', 'z')
        const fireRate = s.power >= 2 ? 0.09 : 0.14
        if (wantFire && s.fireCd <= 0 && s.looping <= 0) {
          const dual = s.power >= 1
          if (dual) {
            s.bullets.push(
              { x: s.px - 10, y: s.py - 22, vx: 0, vy: -460, fromPlayer: true, dual: true },
              { x: s.px + 10, y: s.py - 22, vx: 0, vy: -460, fromPlayer: true, dual: true },
            )
          } else {
            s.bullets.push({
              x: s.px,
              y: s.py - 24,
              vx: 0,
              vy: -440,
              fromPlayer: true,
              dual: false,
            })
          }
          s.fireCd = fireRate
          sfx.shoot()
        }

        // Loop (classic roll / barrel)
        if (pressed(keys.current, 'x') && s.looping <= 0 && s.rolls > 0) {
          s.looping = 0.65
          s.rolls -= 1
          s.invuln = Math.max(s.invuln, 0.65)
          sfx.special()
          syncHud()
        }

        // Spawns
        if (s.spawnTimer <= 0) {
          spawnFormation()
          s.spawnTimer = Math.max(1.1, 2.4 - s.stage * 0.12 + Math.random() * 0.6)
        }

        // Stage advance
        if (s.killed >= 18 + s.stage * 6) {
          s.stage += 1
          s.killed = 0
          s.rolls = Math.min(9, s.rolls + 2)
          s.score += 1000 * s.stage
          setMsg(`STAGE ${s.stage}`)
          syncHud()
          sfx.win()
        }

        // Bullets
        for (const b of s.bullets) {
          b.x += b.vx * dt
          b.y += b.vy * dt
        }
        s.bullets = s.bullets.filter((b) => b.y > -30 && b.y < H + 30 && b.x > -20 && b.x < W + 20)

        // Enemies
        for (const e of s.enemies) {
          e.age += dt
          e.anim += dt * 8
          e.x += e.vx * dt
          e.y += e.vy * dt
          if (e.sway) {
            e.x += Math.sin(e.age * 3 + e.swayPhase) * e.sway * dt
          }
          // bounce soft at edges for some types
          if (e.kind !== 'scout' && (e.x < 20 || e.x > W - 20)) e.vx *= -1

          e.shootCd -= dt
          const canShoot =
            e.y > 10 &&
            e.y < H * 0.72 &&
            (e.kind === 'ace' || e.kind === 'bomber' || e.kind === 'heavy' || e.kind === 'red')
          if (canShoot && e.shootCd <= 0) {
            const aimed = e.kind === 'ace' || e.kind === 'heavy'
            const dx = aimed ? (s.px - e.x) * 0.35 : 0
            s.bullets.push({
              x: e.x,
              y: e.y + 14,
              vx: dx,
              vy: 160 + s.stage * 8 + (e.kind === 'heavy' ? 40 : 0),
              fromPlayer: false,
              dual: false,
            })
            if (e.kind === 'heavy') {
              s.bullets.push(
                {
                  x: e.x - 20,
                  y: e.y + 10,
                  vx: -30,
                  vy: 150,
                  fromPlayer: false,
                  dual: false,
                },
                {
                  x: e.x + 20,
                  y: e.y + 10,
                  vx: 30,
                  vy: 150,
                  fromPlayer: false,
                  dual: false,
                },
              )
            }
            e.shootCd =
              e.kind === 'heavy' ? 1.1 : e.kind === 'ace' ? 0.85 : e.kind === 'bomber' ? 1.3 : 1.8
          }
        }

        // Player bullets vs enemies
        for (const b of s.bullets) {
          if (!b.fromPlayer) continue
          for (const e of s.enemies) {
            const hitR = e.kind === 'heavy' ? 28 : e.kind === 'bomber' ? 22 : 16
            if (Math.hypot(b.x - e.x, b.y - e.y) < hitR) {
              b.y = -999
              e.hp -= 1
              sfx.hit()
              if (e.hp <= 0) {
                explode(e.x, e.y)
                s.score += e.score
                s.killed += 1
                if (e.dropPow) {
                  s.pows.push({ x: e.x, y: e.y, vy: 55 })
                }
                e.y = 9999
              }
            }
          }
        }
        s.enemies = s.enemies.filter((e) => e.y < H + 50 && e.y > -120 && e.x > -80 && e.x < W + 80)

        // POW pickup
        for (const p of s.pows) {
          p.y += p.vy * dt
          if (Math.hypot(p.x - s.px, p.y - s.py) < 22) {
            p.y = 9999
            s.power = Math.min(2, s.power + 1)
            s.score += 500
            setMsg(s.power >= 2 ? 'MAX POWER' : 'POWER UP', 1.2)
            sfx.special()
            syncHud()
          }
        }
        s.pows = s.pows.filter((p) => p.y < H + 20)

        // Enemy bullets / ramming
        if (s.invuln <= 0 && s.looping <= 0) {
          for (const b of s.bullets) {
            if (b.fromPlayer) continue
            if (Math.hypot(b.x - s.px, b.y - s.py) < 12) {
              b.y = 9999
              hurtPlayer()
              break
            }
          }
          for (const e of s.enemies) {
            const hitR = e.kind === 'heavy' ? 26 : 18
            if (Math.hypot(e.x - s.px, e.y - s.py) < hitR) {
              e.y = 9999
              hurtPlayer()
              break
            }
          }
        }

        // Explosions
        for (const p of s.particles) {
          p.age += dt
          p.frame = p.age * 14
        }
        s.particles = s.particles.filter((p) => p.frame < 8)

        // Decor scroll
        for (const d of s.deco) {
          d.y += d.speed * dt
          if (d.y > H + 80) {
            d.y = -60 - Math.random() * 200
            d.x = 40 + Math.random() * (W - 80)
            if (d.kind === 'island') {
              d.kind = Math.random() < 0.45 ? 'island' : Math.random() < 0.5 ? 'cloud0' : 'cloud1'
            }
          }
        }

        const nextMsg = s.msgTimer > 0 ? s.msg : ''
        setHud((h) =>
          h.score !== s.score ||
          h.lives !== s.lives ||
          h.rolls !== s.rolls ||
          h.stage !== s.stage ||
          h.power !== s.power ||
          h.message !== nextMsg
            ? {
                score: s.score,
                lives: s.lives,
                rolls: s.rolls,
                stage: s.stage,
                power: s.power,
                message: nextMsg,
              }
            : h,
        )
      }

      // ── DRAW ──────────────────────────────────────────────────────────
      // Sky wash under ocean tiles
      ctx.fillStyle = '#143878'
      ctx.fillRect(0, 0, W, H)

      if (atlasesReady()) {
        const scrollY = s.scroll % 96
        for (let row = -1; row < Math.ceil(H / 96) + 1; row++) {
          for (let col = 0; col < Math.ceil(W / 96); col++) {
            drawOceanTile(ctx, col * 96, row * 96 + scrollY, (col + row) & 1)
          }
        }

        for (const d of s.deco) {
          if (d.kind === 'island') drawIslandSprite(ctx, d.x, d.y)
          else drawCloudSprite(ctx, d.x, d.y, d.kind === 'cloud0' ? 0 : 1, 0.75)
        }

        for (const b of s.bullets) {
          drawBulletSprite(ctx, b.x, b.y, b.fromPlayer, b.dual)
        }

        for (const e of s.enemies) {
          drawEnemySprite(ctx, e.kind, e.x, e.y, e.anim)
        }

        for (const p of s.pows) {
          drawPowSprite(ctx, p.x, p.y)
        }

        for (const p of s.particles) {
          drawExplosionSprite(ctx, p.x, p.y, p.frame)
        }

        // Player
        if (s.invuln <= 0 || Math.floor(s.invuln * 16) % 2 === 0 || s.looping > 0) {
          let pf: PlayerFrame = 'center'
          if (s.looping > 0) {
            const phase = Math.min(5, Math.floor((1 - s.looping / 0.65) * 6)) as 0 | 1 | 2 | 3 | 4 | 5
            pf = `loop${phase}`
          } else if (s.bank < 0) pf = 'left'
          else if (s.bank > 0) pf = 'right'
          drawPlayerSprite(ctx, s.px, s.py, pf)
        }
      }

      // HUD bar (arcade style)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(0, 0, W, 28)
      ctx.fillRect(0, H - 22, W, 22)

      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#ffe66d'
      ctx.fillText(`SCORE ${String(s.score).padStart(6, '0')}`, 8, 18)

      ctx.fillStyle = '#9ad1ff'
      ctx.fillText(`STAGE ${s.stage}`, 140, 18)

      // lives icons
      for (let i = 0; i < s.lives; i++) {
        drawLifeIcon(ctx, 240 + i * 20, 14)
      }

      // rolls
      ctx.fillStyle = s.rolls > 0 ? '#7dffb3' : '#666'
      ctx.fillText(`ROLL×${s.rolls}`, 8, H - 7)

      ctx.fillStyle = '#ffb4d9'
      const powLabel = s.power === 0 ? 'GUN' : s.power === 1 ? 'TWIN' : 'RAPID'
      ctx.fillText(powLabel, 100, H - 7)

      ctx.fillStyle = '#ccc'
      ctx.fillText('SPACE fire · X roll', W - 130, H - 7)

      if (s.msgTimer > 0 && s.msg) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(W / 2 - 90, H / 2 - 22, 180, 36)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 16px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(s.msg, W / 2, H / 2 + 4)
        ctx.textAlign = 'left'
      }

      if (!s.running) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'
        ctx.fillRect(0, H / 2 - 50, W, 100)
        ctx.fillStyle = '#ff4d4d'
        ctx.font = 'bold 28px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('GAME OVER', W / 2, H / 2 - 8)
        ctx.fillStyle = '#9ad1ff'
        ctx.font = '12px monospace'
        ctx.fillText(`SCORE ${s.score}`, W / 2, H / 2 + 18)
        ctx.fillText('R restart · ESC exit', W / 2, H / 2 + 38)
        ctx.textAlign = 'left'
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
      if (e.key.toLowerCase() === 'r' && !state.current.running) resetRun()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [keys, onExit, ready])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="flex w-full max-w-[384px] items-center justify-between px-1 font-[family-name:var(--font-pixel)] text-[9px] text-viper-teal">
        <span>{hud.message || `STAGE ${hud.stage}`}</span>
        <span className="text-viper-pink">
          {ready ? 'SPACE fire · X roll' : 'LOADING SPRITES…'}
        </span>
      </div>
      <div className="crt-scanlines relative overflow-hidden rounded-sm border-4 border-[#222] shadow-[0_0_40px_rgba(255,45,149,0.3)]">
        <canvas ref={canvasRef} width={W} height={H} className="block bg-[#0a2048]" />
      </div>
    </div>
  )
}
