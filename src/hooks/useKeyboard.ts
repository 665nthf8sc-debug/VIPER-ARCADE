import { useEffect, useRef } from 'react'

type KeyMap = Record<string, boolean>

export function useKeyboard() {
  const keys = useRef<KeyMap>({})

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true
      if (
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(
          e.key.toLowerCase(),
        )
      ) {
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false
    }
    const blur = () => {
      keys.current = {}
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  return keys
}

export function pressed(keys: KeyMap, ...names: string[]) {
  return names.some((n) => keys[n.toLowerCase()])
}
