import { motion } from 'framer-motion'
import { CHANNEL_HANDLE, YOUTUBE_URL } from '../data/machines'
import { sfx } from '../lib/sfx'

interface WelcomeScreenProps {
  onEnter: () => void
}

export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* Full-bleed VIPER ROYALE splash — object-position keeps the character readable */}
      <div
        className="absolute inset-0 scale-105 bg-cover bg-[position:72%_center] sm:bg-[position:65%_center] md:bg-[position:58%_center]"
        style={{ backgroundImage: "url('/images/viper-royale-hero.jpg')" }}
      />

      {/* Soft grade so neon stays vivid without washing the character */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_40%,transparent_0%,rgba(5,5,8,0.2)_50%,rgba(5,5,8,0.65)_100%)]" />

      {/* Left veil — live UI plate over baked splash chrome */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black via-black/75 to-transparent md:from-black/95 md:via-black/50 md:to-transparent" />

      <div className="relative z-10 flex h-full min-h-0 flex-col justify-end px-6 pb-10 pt-8 sm:justify-center sm:px-10 md:px-14 lg:px-20">
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex max-w-xl flex-col items-start"
        >
          <p className="mb-3 font-[family-name:var(--font-pixel)] text-[10px] tracking-[0.35em] text-viper-teal neon-text-teal">
            EST. 198X · NEON DISTRICT
          </p>
          <h1 className="flicker font-[family-name:var(--font-display)] text-5xl font-black leading-[0.95] tracking-wide text-white sm:text-6xl lg:text-7xl">
            <span className="neon-text text-viper-pink">VIPER&apos;S</span>
            <br />
            <span className="neon-text-teal text-viper-teal">GAMES</span>
          </h1>
          <p className="mt-5 max-w-md text-lg font-medium leading-relaxed text-white/85 sm:text-xl">
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

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="mt-8 font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.28em] text-white/45 sm:text-sm"
          >
            <span className="text-viper-teal/80">STRIKE FAST</span>
            <span className="mx-2 text-white/25">·</span>
            <span className="text-viper-pink/80">STAY VIPER</span>
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
