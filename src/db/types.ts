// Modelo de datos. Ideas de wger (rutina → ejercicios → series) y
// OpenNutriTracker (diario por comidas, agua, peso). IDs string (UUID) para
// poder fusionar respaldos o sincronizar en el futuro sin colisiones.

export type ISODate = string // 'YYYY-MM-DD' en hora local

export interface Exercise {
  id: string
  name: string // español
  nameEn: string
  category: string // strength, cardio, stretching… (claves en inglés, ver exercises/labels.ts)
  force: 'push' | 'pull' | 'static' | null
  mechanic: 'compound' | 'isolation' | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string | null
  level: string | null
  instructions: string[]
  images: string[]
  custom: boolean
}

export interface RoutineExercise {
  exerciseId: string
  sets: number
  reps: number
  restSec: number
}

export interface Routine {
  id: string
  name: string
  notes: string
  exercises: RoutineExercise[]
  order: number // posición en la rotación (Push → Pull → Legs)
  createdAt: number
}

export interface WorkoutSession {
  id: string
  routineId: string | null
  name: string
  startedAt: number
  endedAt: number | null
  notes: string
}

export interface SetLog {
  id: string
  sessionId: string
  exerciseId: string
  order: number
  weightKg: number
  reps: number
  rpe: number | null
  done: boolean
  createdAt: number
}

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface RecipeIngredient {
  foodId: string
  grams: number
}

export interface Food {
  id: string // 'off:<código>', 'basic:<slug>' o UUID (propios y recetas)
  name: string
  brand: string | null
  barcode: string | null
  per100g: Macros // líquidos: por 100 ml
  servingG: number | null // tamaño de una porción
  servingName: string | null // "1 huevo", "1 taza"…
  source: 'off' | 'basic' | 'custom' | 'recipe'
  ingredients?: RecipeIngredient[] // solo recetas
  servings?: number // solo recetas: porciones que rinde
  lastUsedAt: number | null
}

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very'
export type Goal = 'lose' | 'maintain' | 'gain'

export interface Profile {
  sex: Sex
  birthYear: number
  heightCm: number
  activity: ActivityLevel
  goal: Goal
}

export interface NutritionGoals extends Macros {
  waterMl: number
  custom: boolean // true = el usuario editó las metas a mano
}

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface DiaryEntry extends Macros {
  id: string
  date: ISODate
  meal: Meal
  foodId: string | null // null = "quick add"
  name: string
  grams: number | null
  createdAt: number
}

export interface WaterLog {
  id: string
  date: ISODate
  ml: number
  createdAt: number
}

export interface BodyMetric {
  id: string
  date: ISODate
  weightKg: number
}

export interface Setting {
  key: string
  value: unknown
}
