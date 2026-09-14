import { useEffect, useRef, useState } from 'react'
import { pressed, useKeyboard } from '../hooks/useKeyboard'
import { sfx } from '../lib/sfx'
import {
  atlasesReady,
  drawFighterSprite,
  drawPortraitSprite,
  loadFighterAtlases,
} from './fighter/atlas'
import { resolveAnim } from './fighter/anims'
import { drawScrollingStage } from './fighter/stage'

interface FighterGameProps {
  onExit: () => void
}

/** Internal pixel buffer — scaled nearest-neighbor for 1987 arcade look */
const PW = 320
const PH = 180
const SCALE = 2
const W = PW * SCALE
const H = PH * SCALE
const GROUND = 148

type FighterId = 'viper' | 'peely'
type AttackType = 'punch' | 'kick' | 'special' | null
type Phase = 'vs' | 'round' | 'fight' | 'ko' | 'match'

interface Fighter {
  id: FighterId
  name: string
  x: number
  y: number
  vx: number
  facing: 1 | -1
  hp: number
  maxHp: number
  attacking: number
  attackType: AttackType
  hitstun: number
  jumping: boolean
  vy: number
  cooldown: number
  flash: number
  animTime: number
  animName: string
}

interface Projectile {
  x: number
  y: number
  vx: number
  owner: FighterId
  life: number
  color: string
}

interface Spark {
  x: number
  y: number
  life: number
  color: string
}

function makeFighters(): [Fighter, Fighter] {
  return [
    {
      id: 'viper',
      name: 'VIPER',
      x: 70,
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
      flash: 0,
      animTime: 0,
      animName: 'idle',
    },
    {
      id: 'peely',
      name: 'PEELY',
      x: 250,
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
      flash: 0,
      animTime: 0,
      animName: 'idle',
    },
  ]
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

function drawFighter(ctx: CanvasRenderingContext2D, f: Fighter) {
  drawFighterSprite(ctx, {
    id: f.id,
    x: f.x,
    y: f.y,
    facing: f.facing,
    animTime: f.animTime,
    flash: f.flash,
    state: {
      vx: f.vx,
      jumping: f.jumping,
      hitstun: f.hitstun,
      attacking: f.attacking,
      attackType: f.attackType,
    },
  })
}

function advanceAnim(f: Fighter, dt: number) {
  const name = resolveAnim({
    vx: f.vx,
    jumping: f.jumping,
    hitstun: f.hitstun,
    attacking: f.attacking,
    attackType: f.attackType,
  })
  if (name !== f.animName) {
    f.animName = name
    f.animTime = 0
  } else {
    f.animTime += dt
  }
}

export function FighterGame({ onExit }: FighterGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keys = useKeyboard()
  const [hud, setHud] = useState({
    round: 1,
    message: 'VIPER  VS  PEELY',
    wins: 0,
    losses: 0,
  })
  const [spritesReady, setSpritesReady] = useState(atlasesReady())

  const state = useRef({
    fighters: makeFighters(),
    projectiles: [] as Projectile[],
    sparks: [] as Spark[],
    round: 1,
    wins: 0,
    losses: 0,
    timer: 99,
    phase: 'vs' as Phase,
    phaseT: 2.4,
    aiTimer: 0,
    announce: 'VIPER  VS  PEELY',
    time: 0,
    hitStop: 0,
  })

  useEffect(() => {
    let cancelled = false
    loadFighterAtlases().then(() => {
      if (!cancelled) setSpritesReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!spritesReady) return
    sfx.start()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const buf = document.createElement('canvas')
    buf.width = PW
    buf.height = PH
    const bctx = buf.getContext('2d')
    if (!bctx) return

    let raf = 0
    let last = performance.now()

    const resetRound = (keepScore = true) => {
      const s = state.current
      s.fighters = makeFighters()
      s.projectiles = []
      s.sparks = []
      s.timer = 99
      s.phase = 'round'
      s.phaseT = 1.6
      s.announce = `ROUND ${s.round}`
      if (keepScore) {
        setHud((h) => ({
          ...h,
          round: s.round,
          wins: s.wins,
          losses: s.losses,
          message: s.announce,
        }))
      }
    }

    const endRound = (winner: FighterId) => {
      const s = state.current
      if (winner === 'viper') {
        s.wins += 1
        s.announce = s.wins >= 2 ? 'YOU WIN' : 'VIPER WINS'
        if (s.wins >= 2) sfx.win()
      } else {
        s.losses += 1
        s.announce = s.losses >= 2 ? 'YOU LOSE' : 'PEELY WINS'
        if (s.losses >= 2) sfx.lose()
      }
      setHud((h) => ({
        ...h,
        wins: s.wins,
        losses: s.losses,
        message: s.announce,
      }))
      s.phase = s.wins >= 2 || s.losses >= 2 ? 'match' : 'ko'
      s.phaseT = 2.2
    }

    const attackBox = (f: Fighter) => {
      if (!f.attackType || f.attacking <= 0 || f.attackType === 'special') return null
      // Reach tuned to 72×96 HD sprite punch/kick extension
      const reach = f.attackType === 'kick' ? 38 : 32
      const height = f.attackType === 'kick' ? 16 : 14
      const yOff = f.attackType === 'kick' ? -20 : -40
      const x = f.facing === 1 ? f.x + 6 : f.x - 6 - reach
      return {
        x,
        y: f.y + yOff,
        w: reach,
        h: height,
        dmg: f.attackType === 'kick' ? 12 : 8,
      }
    }

    const startAttack = (f: Fighter, type: AttackType) => {
      if (!type || f.cooldown > 0 || f.hitstun > 0 || f.attacking > 0) return
      f.attackType = type
      f.attacking = type === 'special' ? 0.38 : type === 'kick' ? 0.28 : 0.18
      f.cooldown = type === 'special' ? 1.0 : type === 'kick' ? 0.4 : 0.24
      f.animTime = 0
      f.animName = type
      if (type === 'special') {
        sfx.special()
        const color = f.id === 'viper' ? '#ff2d95' : '#ffe066'
        state.current.projectiles.push({
          x: f.x + f.facing * 26,
          y: f.y - 42,
          vx: f.facing * 140,
          owner: f.id,
          life: 1.4,
          color,
        })
      } else sfx.hit()
    }

    const spawnSpark = (x: number, y: number, color: string) => {
      state.current.sparks.push({ x, y, life: 0.22, color })
    }

    const applyHit = (atk: Fighter, def: Fighter, dmg: number, knock: number) => {
      def.hp = Math.max(0, def.hp - dmg)
      def.hitstun = 0.32
      def.flash = 0.12
      def.vx = atk.facing * knock
      def.x += atk.facing * 6
      def.animTime = 0
      def.animName = 'hit'
      atk.attacking = Math.min(atk.attacking, 0.06)
      state.current.hitStop = 0.05
      spawnSpark(def.x, def.y - 42, atk.id === 'viper' ? '#ff2d95' : '#ffe066')
      sfx.explode()
      if (def.hp <= 0) endRound(atk.id)
    }

    const frame = (now: number) => {
      let dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const s = state.current
      s.time += dt

      if (s.hitStop > 0) {
        s.hitStop -= dt
        dt *= 0.15
      }

      const [player, rival] = s.fighters

      // —— phase machine ——
      if (s.phase === 'fight' && s.announce === 'FIGHT!' && s.phaseT > 0) {
        s.phaseT -= dt
        if (s.phaseT <= 0) {
          s.announce = ''
          setHud((h) => ({
            ...h,
            message: `ROUND ${s.round}  ${s.wins}-${s.losses}`,
          }))
        }
      }

      if (s.phase !== 'fight' && s.phase !== 'match') {
        s.phaseT -= dt
        if (s.phaseT <= 0) {
          if (s.phase === 'vs') {
            s.phase = 'round'
            s.phaseT = 1.5
            s.announce = `ROUND ${s.round}`
            setHud((h) => ({ ...h, message: s.announce }))
            sfx.start()
          } else if (s.phase === 'round') {
            s.phase = 'fight'
            s.announce = 'FIGHT!'
            s.phaseT = 0.7
            setHud((h) => ({ ...h, message: 'FIGHT!' }))
          } else if (s.phase === 'ko') {
            s.round += 1
            resetRound()
          }
        }
      } else if (s.phase === 'fight') {
        s.timer -= dt
        if (s.timer <= 0) {
          endRound(player.hp >= rival.hp ? 'viper' : 'peely')
        }

        // player
        player.vx = 0
        if (player.hitstun <= 0 && player.attacking <= 0) {
          if (pressed(keys.current, 'arrowleft', 'a')) player.vx = -90
          if (pressed(keys.current, 'arrowright', 'd')) player.vx = 90
          if (pressed(keys.current, 'arrowup', 'w') && !player.jumping) {
            player.jumping = true
            player.vy = -220
            player.animTime = 0
            player.animName = 'jump'
          }
          if (pressed(keys.current, 'j')) startAttack(player, 'punch')
          if (pressed(keys.current, 'k')) startAttack(player, 'kick')
          if (pressed(keys.current, 'l')) startAttack(player, 'special')
        }

        // AI — aggressive classic-fighter pacing
        s.aiTimer -= dt
        rival.vx = 0
        const dist = rival.x - player.x
        rival.facing = dist > 0 ? -1 : 1
        player.facing = player.x < rival.x ? 1 : -1

        if (rival.hitstun <= 0 && rival.attacking <= 0) {
          const abs = Math.abs(dist)
          if (abs > 55) rival.vx = dist > 0 ? -75 : 75
          else if (abs < 28 && Math.random() < 0.02) rival.vx = dist > 0 ? 70 : -70
          else if (s.aiTimer <= 0) {
            const roll = Math.random()
            if (abs > 70 && roll < 0.35) startAttack(rival, 'special')
            else if (roll < 0.4) startAttack(rival, 'punch')
            else if (roll < 0.75) startAttack(rival, 'kick')
            else startAttack(rival, 'special')
            s.aiTimer = 0.28 + Math.random() * 0.45
          }
          if (!rival.jumping && Math.random() < 0.004) {
            rival.jumping = true
            rival.vy = -210
            rival.animTime = 0
            rival.animName = 'jump'
          }
        }

        for (const f of s.fighters) {
          f.x += f.vx * dt
          f.x = Math.max(36, Math.min(PW - 36, f.x))
          f.cooldown = Math.max(0, f.cooldown - dt)
          f.hitstun = Math.max(0, f.hitstun - dt)
          f.flash = Math.max(0, f.flash - dt)
          if (f.attacking > 0) {
            f.attacking -= dt
            if (f.attacking <= 0) f.attackType = null
          }
          if (f.jumping) {
            f.vy += 620 * dt
            f.y += f.vy * dt
            if (f.y >= GROUND) {
              f.y = GROUND
              f.vy = 0
              f.jumping = false
            }
          }
          advanceAnim(f, dt)
        }

        // melee hits
        for (const [atk, def] of [
          [player, rival],
          [rival, player],
        ] as const) {
          if (s.phase !== 'fight') break
          const box = attackBox(atk)
          if (!box || def.hitstun > 0) continue
          if (
            def.x > box.x &&
            def.x < box.x + box.w &&
            def.y > box.y &&
            def.y < box.y + box.h + 48
          ) {
            applyHit(atk, def, box.dmg, 55)
          }
        }

        // projectiles
        s.projectiles = s.projectiles.filter((p) => {
          p.x += p.vx * dt
          p.life -= dt
          if (p.life <= 0 || p.x < -10 || p.x > PW + 10) return false
          const target = p.owner === 'viper' ? rival : player
          if (target.hitstun > 0) return true
          if (Math.abs(target.x - p.x) < 18 && Math.abs(target.y - 42 - p.y) < 26) {
            applyHit(p.owner === 'viper' ? player : rival, target, 16, 70)
            spawnSpark(p.x, p.y, p.color)
            return false
          }
          return true
        })
      } else {
        // animate idle bob on non-fight screens
        for (const f of s.fighters) advanceAnim(f, dt)
      }

      s.sparks = s.sparks.filter((sp) => {
        sp.life -= dt
        return sp.life > 0
      })

      // —— DRAW (pixel buffer) ——
      bctx.imageSmoothingEnabled = false
      const focusX = (s.fighters[0].x + s.fighters[1].x) / 2
      drawScrollingStage(bctx, s.time, focusX)

      if (s.phase === 'vs') {
        bctx.fillStyle = 'rgba(0,0,0,0.72)'
        bctx.fillRect(0, 0, PW, PH)
        drawPortraitSprite(bctx, 'viper', 70, 78, 1)
        drawPortraitSprite(bctx, 'peely', 250, 78, -1)
        bctx.fillStyle = '#ffd040'
        bctx.font = 'bold 14px monospace'
        bctx.textAlign = 'center'
        bctx.fillText('VS', PW / 2, 86)
        bctx.fillStyle = '#ff2d95'
        bctx.font = 'bold 10px monospace'
        bctx.fillText('VIPER', 70, 158)
        bctx.fillStyle = '#ffe066'
        bctx.fillText('PEELY', 250, 158)
        bctx.fillStyle = '#c8d0d8'
        bctx.font = '8px monospace'
        bctx.fillText('NEON ALLEY  ·  BEST OF 3', PW / 2, 172)
        bctx.textAlign = 'left'
      } else {
        drawFighter(bctx, s.fighters[0])
        drawFighter(bctx, s.fighters[1])

        for (const p of s.projectiles) {
          const bob = Math.sin(s.time * 20) > 0 ? 0 : 1
          px(bctx, p.x - 6, p.y - 4 + bob, 12, 8, p.color)
          px(bctx, p.x - 3, p.y - 2 + bob, 6, 4, '#fff')
          px(bctx, p.x - 8, p.y + bob, 3, 3, p.color)
        }

        for (const sp of s.sparks) {
          const n = 4
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + s.time * 8
            const r = (1 - sp.life / 0.22) * 10
            px(bctx, sp.x + Math.cos(a) * r, sp.y + Math.sin(a) * r, 2, 2, sp.color)
          }
        }

        // HUD — classic yellow vitality bars
        const drawBar = (
          x: number,
          name: string,
          hp: number,
          max: number,
          align: 'left' | 'right',
        ) => {
          px(bctx, x - 1, 7, 102, 10, '#000')
          px(bctx, x, 8, 100, 8, '#401010')
          const w = Math.max(0, (hp / max) * 100)
          const fill = hp > 30 ? '#e8c820' : '#e04040'
          if (align === 'left') px(bctx, x, 8, w, 8, fill)
          else px(bctx, x + (100 - w), 8, w, 8, fill)
          bctx.fillStyle = '#fff'
          bctx.font = '7px monospace'
          if (align === 'left') {
            bctx.textAlign = 'left'
            bctx.fillText(name, x, 6)
          } else {
            bctx.textAlign = 'right'
            bctx.fillText(name, x + 100, 6)
            bctx.textAlign = 'left'
          }
        }

        drawBar(8, 'VIPER', s.fighters[0].hp, 100, 'left')
        drawBar(PW - 108, 'PEELY', s.fighters[1].hp, 100, 'right')

        bctx.fillStyle = '#fff'
        bctx.font = 'bold 12px monospace'
        bctx.textAlign = 'center'
        bctx.fillText(String(Math.max(0, Math.ceil(s.timer))), PW / 2, 16)
        bctx.fillStyle = '#ffd040'
        bctx.font = '7px monospace'
        bctx.fillText(`${s.wins}  ROUND ${s.round}  ${s.losses}`, PW / 2, 26)

        // win marks
        for (let i = 0; i < 2; i++) {
          px(bctx, 8 + i * 10, 20, 7, 5, i < s.wins ? '#ff2d95' : '#333')
          px(bctx, PW - 15 - i * 10, 20, 7, 5, i < s.losses ? '#c41e3a' : '#333')
        }

        if (s.phase === 'round' || (s.phase === 'fight' && s.announce === 'FIGHT!')) {
          bctx.fillStyle = 'rgba(0,0,0,0.35)'
          bctx.fillRect(0, PH / 2 - 16, PW, 28)
          bctx.fillStyle = s.announce === 'FIGHT!' ? '#ff4040' : '#ffd040'
          bctx.font = 'bold 16px monospace'
          bctx.fillText(s.announce, PW / 2, PH / 2 + 5)
        }

        if (s.phase === 'ko' || s.phase === 'match') {
          bctx.fillStyle = 'rgba(0,0,0,0.65)'
          bctx.fillRect(0, PH / 2 - 22, PW, 44)
          bctx.fillStyle = s.wins > s.losses ? '#ff2d95' : '#ffd040'
          bctx.font = 'bold 14px monospace'
          bctx.fillText(s.announce, PW / 2, PH / 2)
          if (s.phase === 'match') {
            bctx.fillStyle = '#fff'
            bctx.font = '7px monospace'
            bctx.fillText('R RESTART  ·  ESC EXIT', PW / 2, PH / 2 + 14)
          }
        }
        bctx.textAlign = 'left'
      }

      // CRT phosphor + vignette on buffer
      bctx.fillStyle = 'rgba(0, 255, 120, 0.03)'
      bctx.fillRect(0, 0, PW, PH)
      const vig = bctx.createRadialGradient(PW / 2, PH / 2, 40, PW / 2, PH / 2, 200)
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(1, 'rgba(0,0,0,0.45)')
      bctx.fillStyle = vig
      bctx.fillRect(0, 0, PW, PH)

      // blit nearest-neighbor to display
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(buf, 0, 0, W, H)

      // fine scanlines on display canvas
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      for (let y = 0; y < H; y += 2) {
        ctx.fillRect(0, y, W, 1)
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [keys, spritesReady])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
      if (e.key.toLowerCase() === 'r' && state.current.phase === 'match') {
        state.current = {
          fighters: makeFighters(),
          projectiles: [],
          sparks: [],
          round: 1,
          wins: 0,
          losses: 0,
          timer: 99,
          phase: 'vs',
          phaseT: 2.4,
          aiTimer: 0,
          announce: 'VIPER  VS  PEELY',
          time: 0,
          hitStop: 0,
        }
        setHud({ round: 1, message: 'VIPER  VS  PEELY', wins: 0, losses: 0 })
        sfx.start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="flex w-full max-w-[640px] items-center justify-between px-1 font-[family-name:var(--font-pixel)] text-[8px] text-[#ffd040]">
        <span className="text-viper-pink">{hud.message}</span>
        <span className="text-[#c8d0d8]">J punch · K kick · L wave</span>
      </div>
      <div className="crt-cabinet relative w-full max-w-[640px]">
        <div className="crt-scanlines crt-curve relative overflow-hidden rounded-[12px] border-[6px] border-[#1a1a1a] bg-black shadow-[0_0_0_2px_#333,0_0_40px_rgba(255,45,149,0.25),inset_0_0_60px_rgba(0,0,0,0.8)]">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block h-auto w-full bg-black"
            style={{ imageRendering: 'pixelated' }}
          />
          {!spritesReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 font-[family-name:var(--font-pixel)] text-[10px] text-[#ffd040]">
              LOADING SPRITES…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
