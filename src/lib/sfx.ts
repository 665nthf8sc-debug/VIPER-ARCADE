let audioCtx: AudioContext | null = null

function ctx() {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

function beep(
  freq: number,
  duration: number,
  type: OscillatorType = 'square',
  volume = 0.05,
  slideTo?: number,
) {
  try {
    const ac = ctx()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, ac.currentTime)
    if (slideTo != null) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + duration)
    }
    gain.gain.setValueAtTime(volume, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + duration)
  } catch {
    // Audio may be blocked until user gesture
  }
}

export const sfx = {
  coin: () => beep(880, 0.08, 'square', 0.06),
  select: () => beep(520, 0.06, 'triangle', 0.05),
  hop: () => beep(320, 0.05, 'square', 0.04, 520),
  splash: () => beep(180, 0.15, 'sawtooth', 0.04, 60),
  shoot: () => beep(660, 0.04, 'square', 0.035, 220),
  explode: () => beep(120, 0.2, 'sawtooth', 0.06, 40),
  hit: () => beep(200, 0.08, 'square', 0.05),
  special: () => {
    beep(440, 0.08, 'square', 0.05)
    setTimeout(() => beep(660, 0.1, 'square', 0.05), 60)
    setTimeout(() => beep(880, 0.12, 'square', 0.05), 120)
  },
  win: () => {
    ;[523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => beep(f, 0.12, 'square', 0.05), i * 90)
    })
  },
  lose: () => beep(220, 0.35, 'sawtooth', 0.05, 80),
  start: () => {
    beep(330, 0.1, 'square', 0.05)
    setTimeout(() => beep(440, 0.1, 'square', 0.05), 100)
    setTimeout(() => beep(660, 0.15, 'square', 0.055), 200)
  },
}
