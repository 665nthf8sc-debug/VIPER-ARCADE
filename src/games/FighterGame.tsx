import { useEffect, useRef, useState } from 'react'
import { pressed, useKeyboard } from '../hooks/useKeyboard'
import { sfx } from '../lib/sfx'

interface FighterGameProps {
  onExit: () => void
}

const W = 640
const H = 360
const GROUND = 300

type FighterId = 'viper' | 'rival'

interface Fighter {
  id: FighterId
  x: number
  y: number
  vx: number
  facing: 1 | -1
  hp: number
  maxHp: number
  attacking: number
  attackType: 'punch' | 'kick' | 'special' | null
  hitstun: number
  jumping: boolean
  vy: number
  cooldown: number
  color: string
  accent: string
}

function makeFighters(): [Fighter, Fighter] {
  return [
    {
      id: 'viper',
      x: 160,
      y: GROUND,
      vx: 0,
      facing: 1,
      hp: 100,
      maxHp: 100,
      attacking: 0,
      attackType: null,
      hitstun: 0,
      jumping: false,
      vy: 0,
      cooldown: 0,
      color: '#111',
      accent: '#ff2d95',
    },
    {
      id: 'rival',
      x: 480,
      y: GROUND,
      vx: 0,
      facing: -1,
      hp: 100,
      maxHp: 100,
      attacking: 0,
      attackType: null,
      hitstun: 0,
      jumping: false,
      vy: 0,
      cooldown: 0,
      color: '#1a1030',
      accent: '#2de2e6',
    },
  ]
}

export function FighterGame({ onExit }: FighterGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keys = useKeyboard()
  const [hud, setHud] = useState({
    round: 1,
    message: 'ROUND 1 — FIGHT!',
    wins: 0,
    losses: 0,
  })

  const state = useRef({
    fighters: makeFighters(),
    round: 1,
    wins: 0,
    losses: 0,
    timer: 99,
    running: true,
    roundLock: 0,
    aiTimer: 0,
  })

  useEffect(() => {
    sfx.start()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()

    const attackBox = (f: Fighter) => {
      if (!f.attackType || f.attacking <= 0) return null
      const reach =
        f.attackType === 'special' ? 70 : f.attackType === 'kick' ? 55 : 40
      const height = f.attackType === 'kick' ? 30 : 24
      const yOff = f.attackType === 'kick' ? -20 : -40
      const x = f.facing === 1 ? f.x + 10 : f.x - 10 - reach
      return { x, y: f.y + yOff, w: reach, h: height, dmg: f.attackType === 'special' ? 18 : f.attackType === 'kick' ? 12 : 8 }
    }

    const drawFighter = (f: Fighter) => {
      ctx.save()
      ctx.translate(f.x, f.y)
      ctx.scale(f.facing, 1)

      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.ellipse(0, 4, 22, 6, 0, 0, Math.PI * 2)
      ctx.fill()

      // legs
      ctx.fillStyle = f.color
      ctx.fillRect(-12, -28, 10, 28)
      ctx.fillRect(2, -28, 10, 28)
      ctx.fillStyle = f.accent
      ctx.fillRect(-12, -18, 10, 6)
      ctx.fillRect(2, -10, 10, 6)

      // torso hoodie
      ctx.fillStyle = f.color
      ctx.fillRect(-14, -58, 28, 32)
      ctx.fillStyle = f.accent
      ctx.fillRect(-14, -58, 6, 32)
      ctx.fillStyle = f.id === 'viper' ? '#2de2e6' : '#ff2d95'
      ctx.fillRect(8, -58, 6, 32)

      // cobra emblem
      ctx.fillStyle = f.id === 'viper' ? '#2de2e6' : '#ff2d95'
      ctx.beginPath()
      ctx.moveTo(0, -48)
      ctx.lineTo(5, -38)
      ctx.lineTo(0, -40)
      ctx.lineTo(-5, -38)
      ctx.closePath()
      ctx.fill()

      // arms
      if (f.attacking > 0 && f.attackType) {
        ctx.fillStyle = '#e8c4a0'
        const len = f.attackType === 'special' ? 50 : f.attackType === 'kick' ? 0 : 36
        if (f.attackType !== 'kick') {
          ctx.fillRect(10, -50, len, 8)
          ctx.fillStyle = f.accent
          ctx.beginPath()
          ctx.arc(10 + len, -46, 8, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillStyle = f.color
          ctx.fillRect(4, -20, 40, 10)
        }
        if (f.attackType === 'special') {
          ctx.strokeStyle = f.accent
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(40, -46, 16, 0, Math.PI * 2)
          ctx.stroke()
        }
      } else {
        ctx.fillStyle = '#e8c4a0'
        ctx.fillRect(-18, -52, 8, 22)
        ctx.fillRect(10, -52, 8, 22)
      }

      // head
      ctx.fillStyle = '#e8c4a0'
      ctx.beginPath()
      ctx.arc(0, -70, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(-12, -82, 24, 10)
      // headphones
      ctx.strokeStyle = f.accent
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(0, -70, 14, Math.PI * 1.15, Math.PI * 1.85)
      ctx.stroke()
      ctx.fillStyle = f.accent
      ctx.beginPath()
      ctx.arc(-14, -70, 4, 0, Math.PI * 2)
      ctx.arc(14, -70, 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }

    const startAttack = (f: Fighter, type: Fighter['attackType']) => {
      if (!type || f.cooldown > 0 || f.hitstun > 0 || f.attacking > 0) return
      f.attackType = type
      f.attacking = type === 'special' ? 0.45 : type === 'kick' ? 0.32 : 0.22
      f.cooldown = type === 'special' ? 1.1 : type === 'kick' ? 0.45 : 0.28
      if (type === 'special') sfx.special()
      else sfx.hit()
    }

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const s = state.current
      const [player, rival] = s.fighters

      if (s.roundLock > 0) {
        s.roundLock -= dt
      } else if (s.running) {
        s.timer -= dt
        if (s.timer <= 0) {
          if (player.hp >= rival.hp) {
            s.wins += 1
            setHud((h) => ({
              ...h,
              wins: s.wins,
              message: s.wins >= 2 ? 'YOU WIN!' : 'VIPER WINS ROUND',
            }))
          } else {
            s.losses += 1
            setHud((h) => ({
              ...h,
              losses: s.losses,
              message: s.losses >= 2 ? 'YOU LOSE' : 'RIVAL WINS ROUND',
            }))
          }
          s.roundLock = 2
          s.timer = 99
          if (s.wins >= 2 || s.losses >= 2) {
            s.running = false
            if (s.wins >= 2) sfx.win()
            else sfx.lose()
          } else {
            s.round += 1
            s.fighters = makeFighters()
            setHud((h) => ({ ...h, round: s.round, message: `ROUND ${s.round}` }))
          }
        }

        // player input
        player.vx = 0
        if (player.hitstun <= 0 && player.attacking <= 0) {
          if (pressed(keys.current, 'arrowleft', 'a')) player.vx = -160
          if (pressed(keys.current, 'arrowright', 'd')) player.vx = 160
          if (pressed(keys.current, 'arrowup', 'w') && !player.jumping) {
            player.jumping = true
            player.vy = -420
          }
          if (pressed(keys.current, 'j')) startAttack(player, 'punch')
          if (pressed(keys.current, 'k')) startAttack(player, 'kick')
          if (pressed(keys.current, 'l')) startAttack(player, 'special')
        }

        // simple AI
        s.aiTimer -= dt
        rival.vx = 0
        const dist = rival.x - player.x
        rival.facing = dist > 0 ? -1 : 1
        player.facing = player.x < rival.x ? 1 : -1

        if (rival.hitstun <= 0 && rival.attacking <= 0) {
          if (Math.abs(dist) > 70) {
            rival.vx = dist > 0 ? -120 : 120
          } else if (s.aiTimer <= 0) {
            const roll = Math.random()
            if (roll < 0.45) startAttack(rival, 'punch')
            else if (roll < 0.75) startAttack(rival, 'kick')
            else startAttack(rival, 'special')
            s.aiTimer = 0.35 + Math.random() * 0.5
          }
          if (!rival.jumping && Math.random() < 0.003) {
            rival.jumping = true
            rival.vy = -400
          }
        }

        for (const f of s.fighters) {
          f.x += f.vx * dt
          f.x = Math.max(40, Math.min(W - 40, f.x))
          f.cooldown = Math.max(0, f.cooldown - dt)
          f.hitstun = Math.max(0, f.hitstun - dt)
          if (f.attacking > 0) {
            f.attacking -= dt
            if (f.attacking <= 0) f.attackType = null
          }
          if (f.jumping) {
            f.vy += 1100 * dt
            f.y += f.vy * dt
            if (f.y >= GROUND) {
              f.y = GROUND
              f.vy = 0
              f.jumping = false
            }
          }
        }

        // hit detection
        for (const [atk, def] of [
          [player, rival],
          [rival, player],
        ] as const) {
          const box = attackBox(atk)
          if (!box || def.hitstun > 0) continue
          if (
            def.x > box.x &&
            def.x < box.x + box.w &&
            def.y > box.y &&
            def.y < box.y + box.h + 50
          ) {
            def.hp = Math.max(0, def.hp - box.dmg)
            def.hitstun = 0.35
            def.vx = atk.facing * 120
            def.x += atk.facing * 12
            atk.attacking = 0.05
            sfx.explode()
            if (def.hp <= 0) {
              if (def.id === 'rival') {
                s.wins += 1
                setHud((h) => ({
                  ...h,
                  wins: s.wins,
                  message: s.wins >= 2 ? 'K.O. — YOU WIN!' : 'K.O. — VIPER',
                }))
                if (s.wins >= 2) {
                  s.running = false
                  sfx.win()
                } else {
                  s.roundLock = 2
                  s.round += 1
                  s.timer = 99
                  s.fighters = makeFighters()
                  setHud((h) => ({
                    ...h,
                    round: s.round,
                    wins: s.wins,
                    message: `ROUND ${s.round}`,
                  }))
                }
              } else {
                s.losses += 1
                setHud((h) => ({
                  ...h,
                  losses: s.losses,
                  message: s.losses >= 2 ? 'K.O. — YOU LOSE' : 'K.O. — RIVAL',
                }))
                if (s.losses >= 2) {
                  s.running = false
                  sfx.lose()
                } else {
                  s.roundLock = 2
                  s.round += 1
                  s.timer = 99
                  s.fighters = makeFighters()
                  setHud((h) => ({
                    ...h,
                    round: s.round,
                    losses: s.losses,
                    message: `ROUND ${s.round}`,
                  }))
                }
              }
            }
          }
        }
      }

      // DRAW arena
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, '#0a0618')
      sky.addColorStop(0.55, '#1a0a28')
      sky.addColorStop(1, '#120820')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H)

      // neon city silhouette
      ctx.fillStyle = '#08060f'
      for (let i = 0; i < 12; i++) {
        const bx = i * 58
        const bh = 40 + ((i * 37) % 90)
        ctx.fillRect(bx, GROUND - bh - 20, 50, bh)
        ctx.fillStyle = i % 2 ? 'rgba(255,45,149,0.35)' : 'rgba(45,226,230,0.3)'
        ctx.fillRect(bx + 10, GROUND - bh, 8, 8)
        ctx.fillRect(bx + 28, GROUND - bh + 16, 8, 8)
        ctx.fillStyle = '#08060f'
      }

      // floor
      ctx.fillStyle = '#14101c'
      ctx.fillRect(0, GROUND, W, H - GROUND)
      ctx.strokeStyle = '#ff2d95'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, GROUND)
      ctx.lineTo(W, GROUND)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(45,226,230,0.4)'
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, GROUND)
        ctx.lineTo(x - 30, H)
        ctx.stroke()
      }

      // VIPER logo on floor
      ctx.fillStyle = 'rgba(255,45,149,0.15)'
      ctx.font = 'bold 48px Orbitron, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText("VIPER'S", W / 2, GROUND + 40)
      ctx.textAlign = 'left'

      drawFighter(s.fighters[0])
      drawFighter(s.fighters[1])

      // health bars
      const drawBar = (x: number, name: string, hp: number, max: number, accent: string, align: 'left' | 'right') => {
        ctx.fillStyle = '#111'
        ctx.fillRect(x, 16, 220, 18)
        ctx.fillStyle = accent
        const w = (hp / max) * 220
        if (align === 'left') ctx.fillRect(x, 16, w, 18)
        else ctx.fillRect(x + (220 - w), 16, w, 18)
        ctx.strokeStyle = accent
        ctx.strokeRect(x, 16, 220, 18)
        ctx.fillStyle = '#fff'
        ctx.font = '10px monospace'
        if (align === 'left') ctx.fillText(name, x, 12)
        else {
          ctx.textAlign = 'right'
          ctx.fillText(name, x + 220, 12)
          ctx.textAlign = 'left'
        }
      }

      drawBar(20, 'VIPER', s.fighters[0].hp, 100, '#ff2d95', 'left')
      drawBar(W - 240, 'RIVAL', s.fighters[1].hp, 100, '#2de2e6', 'right')

      ctx.fillStyle = '#fff'
      ctx.font = 'bold 20px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(String(Math.max(0, Math.ceil(s.timer))), W / 2, 30)
      ctx.fillStyle = '#2de2e6'
      ctx.font = '10px monospace'
      ctx.fillText(`ROUND ${s.round}  ${s.wins} - ${s.losses}`, W / 2, 48)
      ctx.textAlign = 'left'

      if (!s.running) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'
        ctx.fillRect(0, H / 2 - 40, W, 80)
        ctx.fillStyle = s.wins >= 2 ? '#2de2e6' : '#ff2d95'
        ctx.font = 'bold 28px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(s.wins >= 2 ? 'YOU WIN' : 'YOU LOSE', W / 2, H / 2)
        ctx.fillStyle = '#fff'
        ctx.font = '11px monospace'
        ctx.fillText('R restart · ESC exit', W / 2, H / 2 + 26)
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
        state.current = {
          fighters: makeFighters(),
          round: 1,
          wins: 0,
          losses: 0,
          timer: 99,
          running: true,
          roundLock: 0,
          aiTimer: 0,
        }
        setHud({ round: 1, message: 'ROUND 1 — FIGHT!', wins: 0, losses: 0 })
        sfx.start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="flex w-full max-w-[640px] items-center justify-between px-1 font-[family-name:var(--font-pixel)] text-[9px] text-viper-teal">
        <span>{hud.message}</span>
        <span className="text-viper-pink">J punch · K kick · L special</span>
      </div>
      <div className="crt-scanlines relative w-full max-w-[640px] overflow-hidden rounded-sm border-4 border-[#222] shadow-[0_0_40px_rgba(255,45,149,0.28)]">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block h-auto w-full bg-black"
        />
      </div>
    </div>
  )
}
