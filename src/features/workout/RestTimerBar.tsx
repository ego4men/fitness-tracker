import { useEffect, useRef, useState } from 'react'
import { beep, useRestTimer } from './restTimer'

/** Barra flotante del descanso, visible en cualquier pestaña. */
export function RestTimerBar() {
  const { endsAt, duration, add, stop } = useRestTimer()
  const [now, setNow] = useState(Date.now())
  const beeped = useRef<number | null>(null)

  useEffect(() => {
    if (!endsAt) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [endsAt])

  const remaining = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0

  useEffect(() => {
    if (endsAt && remaining === 0 && beeped.current !== endsAt) {
      beeped.current = endsAt
      beep()
      const t = setTimeout(stop, 4000)
      return () => clearTimeout(t)
    }
  }, [endsAt, remaining, stop])

  if (!endsAt) return null
  const done = remaining === 0
  const pct = done ? 100 : 100 - (remaining / duration) * 100
  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div className="mx-auto mb-2 w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-line bg-surface-2">
      <div className="flex items-center gap-2 p-2 pl-4">
        <div className="flex-1">
          <p className="text-xs text-muted">{done ? '¡A darle!' : 'Descanso'}</p>
          <p className={`text-2xl font-bold tabular-nums ${done ? 'text-accent' : ''}`}>
            {done ? '0:00' : `${mm}:${ss}`}
          </p>
        </div>
        {!done && (
          <>
            <button onClick={() => add(-15)} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-muted">
              −15
            </button>
            <button onClick={() => add(15)} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-muted">
              +15
            </button>
          </>
        )}
        <button onClick={stop} className="min-h-11 rounded-xl bg-surface px-4 text-sm font-semibold">
          {done ? 'OK' : 'Saltar'}
        </button>
      </div>
      <div className="h-1 bg-surface">
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
