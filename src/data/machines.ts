export type MachineId = 'frogger' | '1942' | 'fighter'

export type AppView = 'welcome' | 'arcade' | 'playing'

export interface Machine {
  id: MachineId
  title: string
  subtitle: string
  tagline: string
  cabinetImage: string
  accent: 'pink' | 'teal'
  year: string
  controls: string[]
}

export const MACHINES: Machine[] = [
  {
    id: 'frogger',
    title: 'VIPER FROGGER',
    subtitle: 'Cross the Neon Grid',
    tagline: 'Guide VIPER through traffic and toxic sludge. One wrong hop and you\'re toast.',
    cabinetImage: '/images/cabinet-frogger.png',
    accent: 'teal',
    year: '1981',
    controls: ['Arrow keys / WASD to hop', 'Reach the cobra dens'],
  },
  {
    id: '1942',
    title: 'VIPER 1942',
    subtitle: 'Sky Serpent Strike',
    tagline: 'Pilot the VIPER interceptor through endless enemy waves. Loop, lock, and unload.',
    cabinetImage: '/images/cabinet-1942.png',
    accent: 'pink',
    year: '1984',
    controls: ['Arrow keys / WASD to fly', 'Space / Z to fire', 'X to loop'],
  },
  {
    id: 'fighter',
    title: 'VIPER FIGHTER',
    subtitle: 'Street Brawl \'87',
    tagline: 'Play as VIPER against PEELY, the banana brawler. HD sprites, neon alley stage, best of 3.',
    cabinetImage: '/images/cabinet-fighter.png',
    accent: 'pink',
    year: '1987',
    controls: ['A/D or ←/→ move', 'W / ↑ jump', 'J punch · K kick · L wave'],
  },
]

export const YOUTUBE_URL = 'https://www.youtube.com/@VIPER'
export const CHANNEL_HANDLE = '@VIPER'
