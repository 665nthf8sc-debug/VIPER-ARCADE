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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,8,0.72)_0%,rgba(5,5,8,0.45)_40%,rgba(5,5,8,0.88)_100%)]" />

      <header className="relative z-20 flex items-center justify-between px-5 py-4 md:px-8">
        <button
          onClick={onBack}
          className="font-[family-name:var(--font-display)] text-xs tracking-[0.2em] text-white/70 transition hover:text-viper-teal"
        >
          ← LOBBY
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

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-6">
        <div className="mb-2 font-[family-name:var(--font-pixel)] text-[9px] tracking-[0.3em] text-white/50">
          SELECT A CABINET · ← → TO BROWSE
        </div>

        <div className="relative flex w-full max-w-6xl items-center justify-center gap-2 md:gap-6">
          <button
            aria-label="Previous cabinet"
            onClick={() => go(-1)}
            className="z-20 flex h-12 w-12 shrink-0 items-center justify-center border border-viper-teal/40 bg-black/40 text-2xl text-viper-teal transition hover:bg-viper-teal/15"
          >
            ‹
          </button>

          <div className="relative flex h-[min(62vh,560px)] w-full max-w-3xl items-end justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={machine.id}
                initial={{ opacity: 0, scale: 0.92, x: 40 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.92, x: -40 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="cabinet-glow absolute inset-0 flex items-end justify-center"
              >
                <img
                  src={machine.cabinetImage}
                  alt={`${machine.title} arcade cabinet`}
                  className="max-h-full w-auto max-w-full object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
                  draggable={false}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            aria-label="Next cabinet"
            onClick={() => go(1)}
            className="z-20 flex h-12 w-12 shrink-0 items-center justify-center border border-viper-pink/40 bg-black/40 text-2xl text-viper-pink transition hover:bg-viper-pink/15"
          >
            ›
          </button>
        </div>

        {/* thumbnail strip */}
        <div className="mt-4 flex gap-3">
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

        <motion.div
          key={machine.id + '-info'}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 max-w-xl text-center"
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
      </div>
    </div>
  )
}
