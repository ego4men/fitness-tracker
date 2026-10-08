import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Button } from '../../components/ui'
import { db } from '../../db/db'
import type { DiaryEntry } from '../../db/types'
import { AmountSheet, MacroLine, MealPicker } from './AmountSheet'
import { BASIC_FOODS } from './basics'
import { updateEntry } from './foods'

/** Editar o borrar un registro del diario. */
export function EntrySheet({ entry, onClose }: { entry: DiaryEntry; onClose: () => void }) {
  const [meal, setMeal] = useState(entry.meal)
  const food = useLiveQuery(
    async () => (entry.foodId ? ((await db.foods.get(entry.foodId)) ?? BASIC_FOODS.find((f) => f.id === entry.foodId) ?? null) : null),
    [entry.foodId],
  )

  const onDelete = async () => {
    await db.diary.delete(entry.id)
    onClose()
  }

  if (food === undefined) return null

  if (food && entry.grams != null) {
    return (
      <AmountSheet
        food={food}
        meal={entry.meal}
        initialGrams={entry.grams}
        confirmText="Guardar cambios"
        onConfirm={async (grams, meal) => {
          await updateEntry(entry, { grams, meal })
          onClose()
        }}
        onDelete={onDelete}
        onClose={onClose}
      />
    )
  }

  // "Quick add" o alimento ya no disponible: solo cambiar de comida o borrar.
  return (
    <Sheet title={entry.name} onClose={onClose}>
      <MacroLine m={entry} />
      <MealPicker value={meal} onChange={setMeal} />
      <Button
        variant="primary"
        onClick={async () => {
          await updateEntry(entry, { meal })
          onClose()
        }}
      >
        Guardar
      </Button>
      <Button variant="danger" onClick={onDelete}>
        Eliminar
      </Button>
    </Sheet>
  )
}
