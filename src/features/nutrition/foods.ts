import { db, newId } from '../../db/db'
import type { DiaryEntry, Food, ISODate, Macros, Meal, NutritionGoals, Profile, RecipeIngredient } from '../../db/types'
import { toISODate } from '../../lib/date'
import { normalize } from '../exercises/catalog'
import { BASIC_FOODS } from './basics'
import { addMacros, recommendedGoals, roundMacros, scaleMacros, ZERO_MACROS } from './goals'

export const MEALS: { id: Meal; label: string }[] = [
  { id: 'breakfast', label: 'Desayuno' },
  { id: 'lunch', label: 'Almuerzo' },
  { id: 'dinner', label: 'Cena' },
  { id: 'snack', label: 'Snacks' },
]
export const mealLabel = (m: Meal) => MEALS.find((x) => x.id === m)?.label ?? m

/** Comida sugerida según la hora (para el botón rápido y el escáner). */
export function mealForHour(h = new Date().getHours()): Meal {
  if (h < 11) return 'breakfast'
  if (h < 16) return 'lunch'
  if (h < 19) return 'snack'
  return 'dinner'
}

// ---------- Perfil y metas ----------

export async function getProfile(): Promise<Profile | null> {
  return ((await db.settings.get('profile'))?.value as Profile | undefined) ?? null
}

export async function getGoals(): Promise<NutritionGoals | null> {
  return ((await db.settings.get('nutritionGoals'))?.value as NutritionGoals | undefined) ?? null
}

export async function latestWeight(): Promise<number | null> {
  return (await db.body.orderBy('date').last())?.weightKg ?? null
}

export async function logWeight(weightKg: number, date: ISODate = toISODate()) {
  const existing = await db.body.where('date').equals(date).first()
  if (existing) await db.body.update(existing.id, { weightKg })
  else await db.body.add({ id: newId(), date, weightKg })
}

/** Guarda el perfil y el peso; recalcula las metas salvo que el usuario las haya fijado a mano. */
export async function saveProfile(profile: Profile, weightKg: number, manualGoals?: NutritionGoals) {
  await db.transaction('rw', db.settings, db.body, async () => {
    await db.settings.put({ key: 'profile', value: profile })
    await logWeight(weightKg)
    const goals = manualGoals ?? recommendedGoals(profile, weightKg)
    await db.settings.put({ key: 'nutritionGoals', value: goals })
  })
}

// ---------- Alimentos ----------

/** Guarda (o refresca) un alimento en la base local y marca su último uso. */
export async function rememberFood(food: Food): Promise<Food> {
  const existing = await db.foods.get(food.id)
  // Los propios del usuario mandan sobre lo que venga de fuera.
  const merged: Food = existing && existing.source !== 'off' ? existing : { ...existing, ...food }
  merged.lastUsedAt = Date.now()
  await db.foods.put(merged)
  return merged
}

export async function findByBarcode(code: string): Promise<Food | null> {
  return (await db.foods.where('barcode').equals(code).first()) ?? null
}

/** Busca en alimentos guardados + básicos. Sin texto: los usados recientemente primero. */
export function searchLocal(saved: Food[], query: string): Food[] {
  const byId = new Map<string, Food>()
  for (const f of BASIC_FOODS) byId.set(f.id, f)
  for (const f of saved) byId.set(f.id, f)
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const list = [...byId.values()].filter((f) => {
    if (!words.length) return f.lastUsedAt != null || f.source === 'custom' || f.source === 'recipe'
    const hay = normalize(`${f.name} ${f.brand ?? ''}`)
    return words.every((w) => hay.includes(w))
  })
  return list.sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || a.name.localeCompare(b.name, 'es'))
}

export function foodLabel(f: Pick<Food, 'name' | 'brand'>): string {
  return f.brand ? `${f.name} · ${f.brand}` : f.name
}

// ---------- Diario ----------

export async function logFood(date: ISODate, meal: Meal, food: Food, grams: number) {
  const saved = await rememberFood(food)
  await db.diary.add({
    id: newId(),
    date,
    meal,
    foodId: saved.id,
    name: foodLabel(saved),
    grams,
    ...roundMacros(scaleMacros(saved.per100g, grams)),
    createdAt: Date.now(),
  })
}

export async function quickAdd(date: ISODate, meal: Meal, name: string, macros: Macros) {
  await db.diary.add({
    id: newId(),
    date,
    meal,
    foodId: null,
    name: name.trim() || 'Comida rápida',
    grams: null,
    ...roundMacros(macros),
    createdAt: Date.now(),
  })
}

export async function updateEntry(entry: DiaryEntry, patch: { grams?: number; meal?: Meal }) {
  const update: Partial<DiaryEntry> = { meal: patch.meal ?? entry.meal }
  if (patch.grams != null && entry.foodId) {
    const food = (await db.foods.get(entry.foodId)) ?? BASIC_FOODS.find((f) => f.id === entry.foodId)
    if (food) Object.assign(update, { grams: patch.grams, ...roundMacros(scaleMacros(food.per100g, patch.grams)) })
  }
  await db.diary.update(entry.id, update)
}

export function totals(entries: Macros[]): Macros {
  return entries.reduce(addMacros, ZERO_MACROS)
}

// ---------- Recetas ----------

export interface RecipeSummary {
  total: Macros
  totalGrams: number
  per100g: Macros
}

export function summarizeRecipe(items: { food: Food; grams: number }[]): RecipeSummary {
  const total = totals(items.map((i) => scaleMacros(i.food.per100g, i.grams)))
  const totalGrams = items.reduce((s, i) => s + i.grams, 0)
  const per100g = totalGrams > 0 ? scaleMacros(total, (100 / totalGrams) * 100) : ZERO_MACROS
  return { total: roundMacros(total), totalGrams, per100g: roundMacros(per100g) }
}

export async function resolveIngredients(ingredients: RecipeIngredient[]) {
  const foods = await db.foods.bulkGet(ingredients.map((i) => i.foodId))
  return ingredients
    .map((i, k) => ({ ...i, food: foods[k] ?? BASIC_FOODS.find((f) => f.id === i.foodId) }))
    .filter((i): i is RecipeIngredient & { food: Food } => i.food != null)
}

export function emptyFood(source: 'custom' | 'recipe', barcode: string | null = null): Food {
  return {
    id: newId(),
    name: '',
    brand: null,
    barcode,
    per100g: { ...ZERO_MACROS },
    servingG: null,
    servingName: null,
    source,
    ...(source === 'recipe' ? { ingredients: [], servings: 1 } : {}),
    lastUsedAt: null,
  }
}
