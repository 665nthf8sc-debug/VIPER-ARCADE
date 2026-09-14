import { AnimatePresence, motion } from 'framer-motion'
import { CHANNEL_HANDLE, MACHINES, type MachineId, YOUTUBE_URL } from '../data/machines'
import { sfx } from '../lib/sfx'

interface ArcadeLobbyProps {
  selected: MachineId
  onSelect: (id: MachineId) => void
  onPlay: () => void
  onBack: () => void
}

export function ArcadeLobby({ selected, onSelect, onPlay, onBack }: ArcadeLobbyProps) {
  const index = MACHINES.findIndex((m) => m.id === selected)
  const machine = MACHINES[index]

  const go = (dir: -1 | 1) => {
    const next = (index + dir + MACHINES.length) % MACHINES.length
    sfx.select()
    onSelect(MACHINES[next].id)
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* Shared plate — slight scale so cabinets sit in-room */}
      <div
        className="absolute inset-0 scale-[1.08] bg-cover bg-center brightness-[0.88] saturate-[1.12]"
        style={{ backgroundImage: "url('/images/arcade-bg.png')" }}
      />

      {/* Synthwave grade: magenta left / teal right, like rim light across the whole frame */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_40%,rgba(255,45,149,0.28),transparent_55%),radial-gradient(ellipse_at_80%_45%,rgba(45,226,230,0.22),transparent_50%),radial-gradient(ellipse_at_50%_100%,rgba(123,44,191,0.35),transparent_55%)] mix-blend-soft-light" />

      {/* Keep UI readable without crushing midground where cabinets live */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,8,0.68)_0%,rgba(5,5,8,0.1)_34%,rgba(5,5,8,0.05)_55%,rgba(5,5,8,0.7)_100%)]" />

      {/* Atmospheric bloom / haze that wraps bg + cabinets together */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,45,149,0.07)_0%,transparent_45%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-[14%] h-36 bg-gradient-to-t from-viper-pink/12 via-viper-teal/5 to-transparent blur-2xl" />

      <header className="relative z-20 flex items-center justify-between px-5 py-4 md:px-8">
        <button
          onClick={onBack}
          className="font-[family-name:var(--font-display)] text-xs tracking-[0.2em] text-white/70 transition hover:text-viper-teal"
        >
          ← TITLE
        </button>
        <h1 className="font-[family-name:var(--font-display)] text-lg font-black tracking-[0.18em] text-viper-pink neon-text sm:text-xl">
          VIPER&apos;S GAMES
        </h1>
        <a
          href={YOUTUBE_URL}
          target="_blank"
          rel="noreferrer"
          className="font-[family-name:var(--font-display)] text-xs tracking-[0.15em] text-viper-teal hover:underline"
        >
          {CHANNEL_HANDLE}
        </a>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-4">
        <div className="mb-3 font-[family-name:var(--font-pixel)] text-[9px] tracking-[0.3em] text-white/50">
          WALK THE FLOOR · ← → · ENTER TO PLAY
        </div>

        <div className="relative flex w-full max-w-6xl items-end justify-center gap-1 md:gap-3">
          <button
            aria-label="Previous cabinet"
            onClick={() => go(-1)}
            className="absolute left-0 top-1/2 z-30 flex h-12 w-10 -translate-y-1/2 items-center justify-center border border-viper-teal/40 bg-black/40 text-2xl text-viper-teal backdrop-blur-sm transition hover:bg-viper-teal/15 md:static md:translate-y-0 md:self-center"
          >
            ‹
          </button>

          <div className="relative flex h-[min(58vh,520px)] w-full items-end justify-center gap-0 perspective-[1200px] md:gap-1">
            {/* Shared glossy floor plane under the row — reflections/puddles glue machines to the aisle */}
            <div className="pointer-events-none absolute inset-x-[8%] bottom-0 h-24 rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(45,226,230,0.16)_0%,rgba(255,45,149,0.1)_40%,transparent_72%)] blur-md" />
            {/* Soft fog over cabinet feet so still edges melt into the corridor floor */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[25] h-20 bg-gradient-to-t from-viper-black/45 via-viper-purple/12 to-transparent" />

            {MACHINES.map((m, i) => {
              const offset = i - index
              const isActive = m.id === selected
              return (
                <motion.button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (isActive) {
                      sfx.coin()
                      onPlay()
                    } else {
                      sfx.select()
                      onSelect(m.id)
                    }
                  }}
                  animate={{
                    scale: isActive ? 1 : 0.82,
                    y: isActive ? 0 : 22,
                    opacity: isActive ? 1 : 0.72,
                    zIndex: isActive ? 20 : 10 - Math.abs(offset),
                    rotateY: offset * -8,
                  }}
                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  className={`relative origin-bottom ${
                    isActive
                      ? 'w-[min(100%,360px)] shrink-0'
                      : 'hidden w-[200px] shrink-0 sm:block'
                  }`}
                >
                  <img
                    src={m.cabinetImage}
                    alt={`${m.title} arcade cabinet`}
                    className={`cabinet-scene-blend h-auto max-h-[min(58vh,520px)] w-full object-contain ${
                      isActive ? 'cabinet-scene-blend--active' : 'cabinet-scene-blend--dim'
                    }`}
                    draggable={false}
                  />
                  <img
                    src={m.cabinetImage}
                    alt=""
                    aria-hidden
                    className={`cabinet-reflection cabinet-scene-blend absolute top-[92%] left-0 h-auto max-h-[min(22vh,200px)] w-full object-contain object-top ${
                      isActive ? '' : 'opacity-40'
                    }`}
                    draggable={false}
                  />
                  {isActive && (
                    <span className="arcade-floor-pool pointer-events-none absolute -bottom-1 left-1/2 h-12 w-[75%] -translate-x-1/2" />
                  )}
                </motion.button>
              )
            })}
          </div>

          <button
            aria-label="Next cabinet"
            onClick={() => go(1)}
            className="absolute right-0 top-1/2 z-30 flex h-12 w-10 -translate-y-1/2 items-center justify-center border border-viper-pink/40 bg-black/40 text-2xl text-viper-pink backdrop-blur-sm transition hover:bg-viper-pink/15 md:static md:translate-y-0 md:self-center"
          >
            ›
          </button>
        </div>

        <div className="relative z-20 mt-5 flex gap-3">
          {MACHINES.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                sfx.select()
                onSelect(m.id)
              }}
              className={`h-2 w-10 transition ${
                m.id === selected
                  ? 'bg-viper-pink shadow-[0_0_12px_rgba(255,45,149,0.8)]'
                  : 'bg-white/25 hover:bg-white/40'
              }`}
              aria-label={`Select ${m.title}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={machine.id + '-info'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative z-20 mt-5 max-w-xl px-2 text-center"
          >
            <p className="font-[family-name:var(--font-pixel)] text-[10px] text-viper-teal">
              {machine.year} · {machine.subtitle.toUpperCase()}
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-black tracking-wide text-white sm:text-4xl">
              {machine.title}
            </h2>
            <p className="mt-2 text-base text-white/75 sm:text-lg">{machine.tagline}</p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                sfx.coin()
                onPlay()
              }}
              className="mt-5 bg-viper-teal px-10 py-3.5 font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.22em] text-black shadow-[0_0_28px_rgba(45,226,230,0.45)]"
            >
              PLAY
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
