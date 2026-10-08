import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { confirmDialog } from '../../components/dialog'
import { Button, Card } from '../../components/ui'
import { db } from '../../db/db'
import { activeFast, endFast, FAST_PRESETS, formatHours, isFastingEnabled, startFast } from './fasting'

const time = (ms: number) => new Date(ms).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

/** Temporizador de ayuno (solo si el usuario lo activó en Ajustes). */
export function FastingCard() {
  const data = useLiveQuery(async () => ({
    enabled: await isFastingEnabled(),
    active: await activeFast(),
    recent: (await db.fasts.orderBy('startedAt').reverse().limit(4).toArray()).filter((f) => f.endedAt),
  }), [])
  const [target, setTarget] = useState<number>(16)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!data?.active) return
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [data?.active])

  if (!data?.enabled) return null
  const { active, recent } = data

  if (active) {
    const elapsed = now - active.startedAt
    const goal = active.targetHours * 3_600_000
    const pct = Math.min(100, (elapsed / goal) * 100)
    const done = elapsed >= goal
    return (
      <Card title="Ayuno en curso">
        <p className="text-3xl font-bold">{formatHours(elapsed)}</p>
        <p className="mb-3 text-sm text-muted">
          Meta {active.targetHours} h · {done ? '¡meta alcanzada!' : `termina a las ${time(active.startedAt + goal)}`}
        </p>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <Button
          variant={done ? 'primary' : 'secondary'}
          className="w-full"
          onClick={async () => {
            if (!done && !(await confirmDialog({ title: 'Terminar ayuno', message: `Llevas ${formatHours(elapsed)} de ${active.targetHours} h.`, confirmText: 'Terminar' }))) return
            await endFast(active.id)
          }}
        >
          Terminar ayuno
        </Button>
      </Card>
    )
  }

  return (
    <Card title="Ayuno">
      <div className="mb-3 flex flex-wrap gap-2">
        {FAST_PRESETS.map((h) => (
          <button
            key={h}
            onClick={() => setTarget(h)}
            className={`min-h-9 rounded-full border px-3 text-sm ${target === h ? 'border-accent text-accent' : 'border-line text-muted'}`}
          >
            {h}:{24 - h}
          </button>
        ))}
      </div>
      <Button className="w-full" onClick={() => startFast(target)}>
        Empezar ayuno de {target} h ahora
      </Button>
      {recent.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {recent.map((f) => {
            const dur = f.endedAt! - f.startedAt
            return (
              <li key={f.id} className="flex justify-between">
                <span>{new Date(f.startedAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="tabular-nums">
                  {formatHours(dur)} {dur >= f.targetHours * 3_600_000 ? '✓' : `/ ${f.targetHours} h`}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
