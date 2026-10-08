import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { confirmDialog } from '../../components/dialog'
import { BackLink, Button, Card, Page } from '../../components/ui'
import { db } from '../../db/db'
import type { Food, Meal } from '../../db/types'
import { toISODate } from '../../lib/date'
import { AmountSheet } from './AmountSheet'
import { emptyFood, logFood } from './foods'

const field = 'min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 focus:border-accent focus:outline-none'

/** Crear/editar un alimento propio (p. ej. con los datos de la etiqueta). */
export function FoodEditorPage() {
  const { id = 'nuevo' } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const isNew = id === 'nuevo'
  const existing = useLiveQuery(async () => (isNew ? null : ((await db.foods.get(id)) ?? null)), [id])
  const [food, setFood] = useState<Food | null>(null)
  const [nums, setNums] = useState({ kcal: '', protein: '', carbs: '', fat: '', servingG: '' })
  const [toLog, setToLog] = useState<Food | null>(null)

  useEffect(() => {
    if (food || existing === undefined) return
    const f = existing ?? emptyFood('custom', search.get('codigo'))
    setFood(f)
    if (existing) {
      const s = (n: number | null) => (n ? String(n) : '')
      setNums({ kcal: s(f.per100g.kcal), protein: s(f.per100g.protein), carbs: s(f.per100g.carbs), fat: s(f.per100g.fat), servingG: s(f.servingG) })
    }
  }, [existing, food, search])

  if (!food) return null
  const n = (s: string) => Math.max(0, Number(s.replace(',', '.')) || 0)
  const valid = food.name.trim() && n(nums.kcal) > 0

  const onSave = async () => {
    const saved: Food = {
      ...food,
      name: food.name.trim(),
      brand: food.brand?.trim() || null,
      barcode: food.barcode?.trim() || null,
      per100g: { kcal: n(nums.kcal), protein: n(nums.protein), carbs: n(nums.carbs), fat: n(nums.fat) },
      servingG: n(nums.servingG) || null,
      servingName: n(nums.servingG) ? food.servingName?.trim() || '1 porción' : null,
    }
    await db.foods.put(saved)
    const meal = search.get('comida') as Meal | null
    if (meal) setToLog(saved)
    else navigate(-1)
  }

  const onDelete = async () => {
    const ok = await confirmDialog({ title: `Borrar "${food.name}"`, message: 'Tus registros pasados en el diario se conservan.', confirmText: 'Borrar', danger: true })
    if (!ok) return
    await db.foods.delete(food.id)
    navigate(-1)
  }

  const set = (patch: Partial<Food>) => setFood({ ...food, ...patch })

  return (
    <Page title={isNew ? 'Nuevo alimento' : 'Editar alimento'} back={<BackLink to={-1} label="Atrás" />}>
      <Card>
        <div className="flex flex-col gap-3">
          <label className="text-xs text-muted">
            Nombre
            <input value={food.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej.: Barra de proteína chocolate" className={`${field} mt-1`} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted">
              Marca (opcional)
              <input value={food.brand ?? ''} onChange={(e) => set({ brand: e.target.value })} className={`${field} mt-1`} />
            </label>
            <label className="text-xs text-muted">
              Código de barras
              <input inputMode="numeric" value={food.barcode ?? ''} onChange={(e) => set({ barcode: e.target.value })} className={`${field} mt-1`} />
            </label>
          </div>
        </div>
      </Card>
      <Card title="Por 100 g (o 100 ml)">
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ['kcal', 'kcal'],
              ['protein', 'Prot. g'],
              ['carbs', 'Carb. g'],
              ['fat', 'Grasa g'],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="text-xs text-muted">
              {label}
              <input inputMode="decimal" value={nums[k]} onChange={(e) => setNums({ ...nums, [k]: e.target.value })} className={`${field} mt-1 text-center tabular-nums`} />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Copia la columna “por 100 g” de la etiqueta nutricional.</p>
      </Card>
      <Card title="Porción (opcional)">
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <label className="text-xs text-muted">
            Gramos
            <input inputMode="decimal" value={nums.servingG} onChange={(e) => setNums({ ...nums, servingG: e.target.value })} className={`${field} mt-1 tabular-nums`} />
          </label>
          <label className="text-xs text-muted">
            Nombre de la porción
            <input value={food.servingName ?? ''} onChange={(e) => set({ servingName: e.target.value })} placeholder="1 barra" className={`${field} mt-1`} />
          </label>
        </div>
      </Card>
      <Button variant="primary" disabled={!valid} onClick={onSave}>
        Guardar
      </Button>
      {!isNew && (
        <Button variant="danger" onClick={onDelete}>
          Borrar alimento
        </Button>
      )}

      {toLog && (
        <AmountSheet
          food={toLog}
          meal={search.get('comida') as Meal}
          onConfirm={async (grams, meal) => {
            const date = search.get('fecha') ?? toISODate()
            await logFood(date, meal, toLog, grams)
            navigate(date === toISODate() ? '/nutricion' : `/nutricion?fecha=${date}`, { replace: true })
          }}
          onClose={() => navigate(-1)}
        />
      )}
    </Page>
  )
}
