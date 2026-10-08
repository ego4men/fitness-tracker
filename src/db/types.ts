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

export interface Food {
  id: string
  name: string
  brand: string | null
  barcode: string | null
  per100g: Macros
  source: 'off' | 'usda' | 'custom'
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
