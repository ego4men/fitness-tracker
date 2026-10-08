import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { confirmDialog } from '../../components/dialog'
import { BackLink, Button, Card, Page, Stepper } from '../../components/ui'
import { db } from '../../db/db'
import type { Food } from '../../db/types'
import { AmountSheet, MacroLine } from './AmountSheet'
import { emptyFood, foodLabel, rememberFood, resolveIngredients, summarizeRecipe } from './foods'
import { FoodSearch } from './FoodSearch'
import { scaleMacros } from './goals'

type Item = { food: Food; grams: number }

export function RecipeEditorPage() {
  const { id = 'nueva' } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'nueva'
  const existing = useLiveQuery(async () => {
    if (isNew) return null
    const f = await db.foods.get(id)
    return f ? { recipe: f, items: await resolveIngredients(f.ingredients ?? []) } : null
  }, [id])

  const [recipe, setRecipe] = useState<Food | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [picking, setPicking] = useState(false)
  const [pending, setPending] = useState<Food | null>(null)
  const [editIndex, setEditIndex] = useState<number | null>(null)

  useEffect(() => {
    if (recipe || existing === undefined) return
    setRecipe(existing?.recipe ?? emptyFood('recipe'))
    setItems(existing?.items.map(({ food, grams }) => ({ food, grams })) ?? [])
  }, [existing, recipe])

  const summary = useMemo(() => summarizeRecipe(items), [items])
  if (!recipe) return null
  const servings = recipe.servings ?? 1
  const valid = recipe.name.trim() && items.length > 0 && summary.totalGrams > 0

  const onSave = async () => {
    // Los ingredientes de Open Food Facts/básicos se guardan para que la receta funcione offline.
    for (const i of items) if (i.food.source === 'off' || i.food.source === 'basic') await rememberFood(i.food)
    await db.foods.put({
      ...recipe,
      name: recipe.name.trim(),
      ingredients: items.map((i) => ({ foodId: i.food.id, grams: i.grams })),
      per100g: summary.per100g,
      servingG: Math.round(summary.totalGrams / servings),
      servingName: '1 porción',
    })
    navigate(-1)
  }

  const onDelete = async () => {
    const ok = await confirmDialog({ title: `Borrar "${recipe.name}"`, message: 'Tus registros pasados se conservan.', confirmText: 'Borrar', danger: true })
    if (!ok) return
    await db.foods.delete(recipe.id)
    navigate(-1)
  }

  return (
    <Page title={isNew ? 'Nueva receta' : 'Editar receta'} back={<BackLink to={-1} label="Atrás" />}>
      <Card>
        <label className="text-xs text-muted">
          Nombre
          <input
            value={recipe.name}
            onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
            placeholder="Ej.: Avena con plátano"
            className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 focus:border-accent focus:outline-none"
          />
        </label>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm">Rinde (porciones)</span>
          <Stepper value={servings} min={1} onChange={(v) => setRecipe({ ...recipe, servings: v })} />
        </div>
      </Card>

      <Card title={`Ingredientes · ${Math.round(summary.totalGrams)} g`}>
        {items.length === 0 && <p className="text-sm text-muted">Añade los ingredientes con su peso.</p>}
        <ul className="divide-y divide-line">
          {items.map((i, k) => (
            <li key={`${i.food.id}-${k}`} className="flex items-center gap-2 py-2">
              <button onClick={() => setEditIndex(k)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm">{foodLabel(i.food)}</p>
                <p className="text-xs text-muted">
                  {i.grams} g · {Math.round(scaleMacros(i.food.per100g, i.grams).kcal)} kcal
                </p>
              </button>
              <button onClick={() => setItems(items.filter((_, j) => j !== k))} className="min-h-11 w-8 text-muted" aria-label="Quitar">
                ✕
              </button>
            </li>
          ))}
        </ul>
        <Button className="mt-2 w-full" onClick={() => setPicking(true)}>
          + Ingrediente
        </Button>
      </Card>

      {items.length > 0 && (
        <Card title={`Por porción (${Math.round(summary.totalGrams / servings)} g)`}>
          <MacroLine m={scaleMacros(summary.total, 100 / servings)} />
        </Card>
      )}

      <Button variant="primary" disabled={!valid} onClick={onSave}>
        Guardar receta
      </Button>
      {!isNew && (
        <Button variant="danger" onClick={onDelete}>
          Borrar receta
        </Button>
      )}

      {picking && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-bg">
          <div className="pt-safe pb-safe mx-auto max-w-lg px-4">
            <div className="flex items-center justify-between py-3">
              <h2 className="text-xl font-bold">Ingrediente</h2>
              <button onClick={() => setPicking(false)} className="min-h-11 px-2 text-accent">
                Cerrar
              </button>
            </div>
            <FoodSearch onSelect={(f) => setPending(f)} />
          </div>
        </div>
      )}
      {pending && (
        <AmountSheet
          food={pending}
          showMeal={false}
          confirmText="Añadir ingrediente"
          onConfirm={(grams) => {
            setItems([...items, { food: pending, grams }])
            setPending(null)
            setPicking(false)
          }}
          onClose={() => setPending(null)}
        />
      )}
      {editIndex != null && items[editIndex] && (
        <AmountSheet
          food={items[editIndex].food}
          showMeal={false}
          initialGrams={items[editIndex].grams}
          confirmText="Guardar"
          onConfirm={(grams) => {
            setItems(items.map((it, j) => (j === editIndex ? { ...it, grams } : it)))
            setEditIndex(null)
          }}
          onClose={() => setEditIndex(null)}
        />
      )}
    </Page>
  )
}
