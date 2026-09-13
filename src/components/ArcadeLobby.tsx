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
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/arcade-bg.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,8,0.75)_0%,rgba(5,5,8,0.4)_38%,rgba(5,5,8,0.9)_100%)]" />

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
            className="absolute left-0 top-1/2 z-30 flex h-12 w-10 -translate-y-1/2 items-center justify-center border border-viper-teal/40 bg-black/50 text-2xl text-viper-teal backdrop-blur-sm transition hover:bg-viper-teal/15 md:static md:translate-y-0 md:self-center"
          >
            ‹
          </button>

          <div className="flex h-[min(58vh,520px)] w-full items-end justify-center gap-2 perspective-[1200px] md:gap-4">
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
                    scale: isActive ? 1 : 0.78,
                    y: isActive ? 0 : 28,
                    opacity: isActive ? 1 : 0.55,
                    zIndex: isActive ? 20 : 10 - Math.abs(offset),
                    rotateY: offset * -12,
                    filter: isActive
                      ? 'drop-shadow(0 0 28px rgba(255,45,149,0.45))'
                      : 'grayscale(0.35) brightness(0.7)',
                  }}
                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  className={`relative origin-bottom ${
                    isActive
                      ? 'w-[min(100%,340px)] shrink-0'
                      : 'hidden w-[180px] shrink-0 sm:block'
                  }`}
                >
                  <img
                    src={m.cabinetImage}
                    alt={`${m.title} arcade cabinet`}
                    className="h-auto max-h-[min(58vh,520px)] w-full object-contain"
                    draggable={false}
                  />
                  {isActive && (
                    <span className="pointer-events-none absolute -bottom-1 left-1/2 h-3 w-2/3 -translate-x-1/2 rounded-full bg-viper-teal/40 blur-md" />
                  )}
                </motion.button>
              )
            })}
          </div>

          <button
            aria-label="Next cabinet"
            onClick={() => go(1)}
            className="absolute right-0 top-1/2 z-30 flex h-12 w-10 -translate-y-1/2 items-center justify-center border border-viper-pink/40 bg-black/50 text-2xl text-viper-pink backdrop-blur-sm transition hover:bg-viper-pink/15 md:static md:translate-y-0 md:self-center"
          >
            ›
          </button>
        </div>

        <div className="mt-5 flex gap-3">
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
            className="mt-5 max-w-xl px-2 text-center"
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
