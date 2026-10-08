import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Button } from '../../components/ui'
import type { Food, Macros, Meal } from '../../db/types'
import { foodLabel, MEALS } from './foods'
import { roundMacros, scaleMacros } from './goals'

export function MacroLine({ m }: { m: Macros }) {
  const r = roundMacros(m)
  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {(
        [
          ['kcal', r.kcal, ''],
          ['Proteína', r.protein, 'g'],
          ['Carbos', r.carbs, 'g'],
          ['Grasa', r.fat, 'g'],
        ] as const
      ).map(([label, v, unit]) => (
        <div key={label} className="rounded-xl bg-surface-2 py-2">
          <p className="text-lg font-bold tabular-nums">
            {v}
            <span className="text-xs font-normal text-muted">{unit}</span>
          </p>
          <p className="text-[11px] text-muted">{label}</p>
        </div>
      ))}
    </div>
  )
}

export function MealPicker({ value, onChange }: { value: Meal; onChange: (m: Meal) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
      {MEALS.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`min-h-10 rounded-lg text-xs font-semibold ${value === m.id ? 'bg-accent text-accent-ink' : 'text-muted'}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

/** Elegir cantidad de un alimento (y comida) antes de registrarlo. */
export function AmountSheet({
  food,
  meal: initialMeal,
  showMeal = true,
  initialGrams,
  confirmText = 'Añadir',
  onConfirm,
  onDelete,
  onClose,
}: {
  onDelete?: () => void
  food: Food
  meal?: Meal
  showMeal?: boolean
  initialGrams?: number
  confirmText?: string
  onConfirm: (grams: number, meal: Meal) => void | Promise<void>
  onClose: () => void
}) {
  const [grams, setGrams] = useState(String(initialGrams ?? food.servingG ?? 100))
  const [meal, setMeal] = useState<Meal>(initialMeal ?? 'snack')
  const g = Number(grams.replace(',', '.'))
  const valid = Number.isFinite(g) && g > 0

  const presets: { label: string; grams: number }[] = []
  if (food.servingG) presets.push({ label: food.servingName ?? '1 porción', grams: food.servingG })
  if (food.servingG) presets.push({ label: `2 × ${food.servingName ?? 'porción'}`, grams: food.servingG * 2 })
  presets.push({ label: '100 g', grams: 100 })

  return (
    <Sheet title={foodLabel(food)} onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => setGrams(String(Math.round(p.grams * 10) / 10))}
            className={`min-h-9 rounded-full border px-3 text-sm ${g === p.grams ? 'border-accent text-accent' : 'border-line text-muted'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-3">
        <input
          inputMode="decimal"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="min-h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-center text-2xl font-bold tabular-nums focus:border-accent focus:outline-none"
        />
        <span className="text-muted">gramos</span>
      </label>
      <MacroLine m={valid ? scaleMacros(food.per100g, g) : food.per100g} />
      {showMeal && <MealPicker value={meal} onChange={setMeal} />}
      <Button variant="primary" disabled={!valid} onClick={() => onConfirm(g, meal)}>
        {confirmText}
      </Button>
      {onDelete && (
        <Button variant="danger" onClick={onDelete}>
          Eliminar
        </Button>
      )}
    </Sheet>
  )
}
