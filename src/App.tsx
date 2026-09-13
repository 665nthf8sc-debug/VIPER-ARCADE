import { useEffect, useState } from 'react'
import { ArcadeLobby } from './components/ArcadeLobby'
import { PlayingView } from './components/PlayingView'
import { WelcomeScreen } from './components/WelcomeScreen'
import { type AppView, type MachineId } from './data/machines'
import { sfx } from './lib/sfx'

const PRELOAD = [
  '/images/viper.png',
  '/images/arcade-bg.png',
  '/images/cabinet-frogger.png',
  '/images/cabinet-1942.png',
  '/images/cabinet-fighter.png',
]

export default function App() {
  const [view, setView] = useState<AppView>('welcome')
  const [selected, setSelected] = useState<MachineId>('frogger')

  useEffect(() => {
    for (const src of PRELOAD) {
      const img = new Image()
      img.src = src
    }
  }, [])

  useEffect(() => {
    if (view !== 'arcade') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        sfx.select()
        setSelected((cur) =>
          cur === 'frogger' ? 'fighter' : cur === '1942' ? 'frogger' : '1942',
        )
      }
      if (e.key === 'ArrowRight') {
        sfx.select()
        setSelected((cur) =>
          cur === 'frogger' ? '1942' : cur === '1942' ? 'fighter' : 'frogger',
        )
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        sfx.coin()
        setView('playing')
      }
      if (e.key === 'Escape') setView('welcome')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  return (
    <div className="h-full w-full">
      {view === 'welcome' && (
        <WelcomeScreen onEnter={() => setView('arcade')} />
      )}
      {view === 'arcade' && (
        <ArcadeLobby
          selected={selected}
          onSelect={setSelected}
          onPlay={() => setView('playing')}
          onBack={() => setView('welcome')}
        />
      )}
      {view === 'playing' && (
        <PlayingView machineId={selected} onExit={() => setView('arcade')} />
      )}
    </div>
  )
}
