import { motion } from 'framer-motion'
import { CHANNEL_HANDLE, YOUTUBE_URL } from '../data/machines'
import { sfx } from '../lib/sfx'

interface WelcomeScreenProps {
  onEnter: () => void
}

export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/arcade-bg.png')" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(5,5,8,0.55)_55%,rgba(5,5,8,0.92)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/70" />

      <div className="relative z-10 grid h-full min-h-0 grid-cols-1 items-center gap-6 px-6 py-8 md:grid-cols-[1.05fr_0.95fr] md:px-12 lg:px-16">
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-start"
        >
          <p className="mb-3 font-[family-name:var(--font-pixel)] text-[10px] tracking-[0.35em] text-viper-teal neon-text-teal">
            EST. 198X · NEON DISTRICT
          </p>
          <h1 className="flicker font-[family-name:var(--font-display)] text-5xl font-black leading-[0.95] tracking-wide text-white sm:text-6xl lg:text-7xl">
            <span className="neon-text text-viper-pink">VIPER&apos;S</span>
            <br />
            <span className="neon-text-teal text-viper-teal">GAMES</span>
          </h1>
          <p className="mt-5 max-w-md text-lg font-medium leading-relaxed text-white/80 sm:text-xl">
            Three legendary cabinets. One neon arcade. Play VIPER-themed
            classics and fuel the channel.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                sfx.coin()
                onEnter()
              }}
              className="bg-viper-pink px-8 py-3.5 font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.2em] text-black shadow-[0_0_30px_rgba(255,45,149,0.55)] transition hover:shadow-[0_0_45px_rgba(255,45,149,0.8)]"
            >
              INSERT COIN
            </motion.button>
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noreferrer"
              className="border border-viper-teal/60 px-6 py-3 font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.15em] text-viper-teal transition hover:bg-viper-teal/10"
            >
              YOUTUBE {CHANNEL_HANDLE}
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto flex h-full max-h-[78vh] w-full max-w-lg items-end justify-center"
        >
          <div className="pointer-events-none absolute bottom-8 h-40 w-64 rounded-full bg-viper-pink/25 blur-3xl" />
          <div className="pointer-events-none absolute bottom-16 h-32 w-48 rounded-full bg-viper-teal/20 blur-3xl" />
          <img
            src="/images/viper.png"
            alt="VIPER — neon gamer mascot"
            className="relative z-10 h-auto max-h-[72vh] w-auto object-contain drop-shadow-[0_0_40px_rgba(255,45,149,0.35)]"
          />
        </motion.div>
      </div>
    </div>
  )
}
