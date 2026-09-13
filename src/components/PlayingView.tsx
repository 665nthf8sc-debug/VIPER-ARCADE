import { MACHINES, type MachineId, YOUTUBE_URL } from '../data/machines'
import { FighterGame } from '../games/FighterGame'
import { FroggerGame } from '../games/FroggerGame'
import { Game1942 } from '../games/Game1942'
import { MobileControls } from './MobileControls'

interface PlayingViewProps {
  machineId: MachineId
  onExit: () => void
}

export function PlayingView({ machineId, onExit }: PlayingViewProps) {
  const machine = MACHINES.find((m) => m.id === machineId)!

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-viper-black">
      <div
        className="pointer-events-none absolute inset-0 opacity-30 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/arcade-bg.png')" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,10,40,0.4),rgba(5,5,8,0.95))]" />

      <header className="relative z-20 flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        <button
          onClick={onExit}
          className="font-[family-name:var(--font-display)] text-xs tracking-[0.18em] text-white/70 transition hover:text-viper-pink"
        >
          ← BACK TO CABINETS
        </button>
        <div className="text-center">
          <div className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.2em] text-viper-pink neon-text">
            {machine.title}
          </div>
          <div className="hidden text-[11px] text-white/50 sm:block">
            {machine.controls.join(' · ')}
          </div>
        </div>
        <a
          href={YOUTUBE_URL}
          target="_blank"
          rel="noreferrer"
          className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.12em] text-viper-teal sm:text-xs"
        >
          SUBSCRIBE
        </a>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-4">
        {machineId === 'frogger' && <FroggerGame onExit={onExit} />}
        {machineId === '1942' && <Game1942 onExit={onExit} />}
        {machineId === 'fighter' && <FighterGame onExit={onExit} />}
        <MobileControls mode={machineId} />
      </div>
    </div>
  )
}
