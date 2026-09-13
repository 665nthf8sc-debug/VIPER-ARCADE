interface MobileControlsProps {
  mode: 'frogger' | '1942' | 'fighter'
}

function emitKey(key: string, type: 'keydown' | 'keyup') {
  window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }))
}

function PadButton({
  label,
  keyName,
  className = '',
}: {
  label: string
  keyName: string
  className?: string
}) {
  return (
    <button
      type="button"
      className={`select-none touch-manipulation rounded-md border border-white/20 bg-black/55 px-3 py-3 font-[family-name:var(--font-display)] text-xs font-bold tracking-wider text-white active:bg-viper-pink/40 ${className}`}
      onPointerDown={(e) => {
        e.preventDefault()
        emitKey(keyName, 'keydown')
      }}
      onPointerUp={(e) => {
        e.preventDefault()
        emitKey(keyName, 'keyup')
      }}
      onPointerLeave={() => emitKey(keyName, 'keyup')}
      onPointerCancel={() => emitKey(keyName, 'keyup')}
    >
      {label}
    </button>
  )
}

export function MobileControls({ mode }: MobileControlsProps) {
  return (
    <div className="mt-3 flex w-full max-w-[640px] items-end justify-between gap-3 px-1 md:hidden">
      <div className="grid grid-cols-3 gap-1.5">
        <div />
        <PadButton label="▲" keyName="ArrowUp" />
        <div />
        <PadButton label="◀" keyName="ArrowLeft" />
        <PadButton label="▼" keyName="ArrowDown" />
        <PadButton label="▶" keyName="ArrowRight" />
      </div>

      {mode === '1942' && (
        <div className="flex gap-2">
          <PadButton label="FIRE" keyName=" " className="min-w-16 bg-viper-teal/25" />
          <PadButton label="LOOP" keyName="x" className="min-w-16 bg-viper-pink/25" />
        </div>
      )}
      {mode === 'fighter' && (
        <div className="flex gap-2">
          <PadButton label="J" keyName="j" className="min-w-12 bg-viper-pink/25" />
          <PadButton label="K" keyName="k" className="min-w-12 bg-viper-teal/25" />
          <PadButton label="L" keyName="l" className="min-w-12 bg-viper-purple/30" />
        </div>
      )}
      {mode === 'frogger' && (
        <div className="max-w-28 text-right font-[family-name:var(--font-pixel)] text-[8px] leading-relaxed text-white/50">
          TAP PADS TO HOP
        </div>
      )}
    </div>
  )
}
