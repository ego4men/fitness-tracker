import type { Macros } from '../../db/types'

const MACROS = [
  { key: 'protein', label: 'Proteína', color: 'var(--color-protein)' },
  { key: 'carbs', label: 'Carbos', color: 'var(--color-carbs)' },
  { key: 'fat', label: 'Grasa', color: 'var(--color-fat)' },
] as const

function Ring({ value, goal }: { value: number; goal: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const pct = goal > 0 ? Math.min(1, value / goal) : 0
  const over = goal > 0 && value > goal
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={over ? 'var(--color-danger)' : 'var(--color-accent)'}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${pct * c} ${c}`}
        className="transition-[stroke-dasharray] duration-500"
      />
    </svg>
  )
}

export function MacroSummary({ consumed, goals }: { consumed: Macros; goals: Macros }) {
  const left = Math.round(goals.kcal - consumed.kcal)
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <Ring value={consumed.kcal} goal={goals.kcal} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold tabular-nums ${left < 0 ? 'text-danger' : ''}`}>{Math.abs(left)}</span>
          <span className="text-[11px] text-muted">{left < 0 ? 'kcal de más' : 'kcal restantes'}</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <p className="text-sm text-muted">
          <span className="font-semibold text-text tabular-nums">{Math.round(consumed.kcal)}</span> / {goals.kcal} kcal
        </p>
        {MACROS.map((m) => {
          const v = consumed[m.key]
          const g = goals[m.key]
          return (
            <div key={m.key}>
              <div className="mb-1 flex justify-between text-xs">
                <span>{m.label}</span>
                <span className="tabular-nums text-muted">
                  {Math.round(v)} / {g} g
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${g ? Math.min(100, (v / g) * 100) : 0}%`, background: m.color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
