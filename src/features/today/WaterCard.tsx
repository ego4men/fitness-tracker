import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from '../../db/db'
import { toISODate } from '../../lib/date'
import { Button, Card } from '../../components/ui'

const GOAL_ML = 2500
const STEPS = [250, 500]

export function WaterCard() {
  const today = toISODate()
  const logs = useLiveQuery(() => db.water.where('date').equals(today).sortBy('createdAt'), [today])
  const total = logs?.reduce((s, l) => s + l.ml, 0) ?? 0
  const pct = Math.min(100, Math.round((total / GOAL_ML) * 100))
  const last = logs?.at(-1)

  const add = (ml: number) => db.water.add({ id: newId(), date: today, ml, createdAt: Date.now() })
  const undo = () => last && db.water.delete(last.id)

  return (
    <Card
      title="Agua"
      action={
        last && (
          <button onClick={undo} className="text-sm text-muted underline-offset-2 active:underline">
            Deshacer
          </button>
        )
      }
    >
      <div className="mb-3 flex items-baseline gap-1">
        <span className="text-3xl font-bold tabular-nums">{(total / 1000).toFixed(2)}</span>
        <span className="text-muted">/ {GOAL_ML / 1000} L</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-water transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-2">
        {STEPS.map((ml) => (
          <Button key={ml} className="flex-1" onClick={() => add(ml)}>
            +{ml} ml
          </Button>
        ))}
      </div>
    </Card>
  )
}
