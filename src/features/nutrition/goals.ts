import type { ActivityLevel, Goal, Macros, NutritionGoals, Profile, Sex } from '../../db/types'

// Gasto energético: Mifflin-St Jeor (1990), la ecuación de BMR más validada en
// adultos, × factor de actividad. Proteína por kg según objetivo (rango
// 1.6–2.2 g/kg recomendado para quien entrena fuerza), grasa 25 % de las kcal,
// carbohidratos el resto.

export const ACTIVITY: Record<ActivityLevel, { factor: number; label: string; hint: string }> = {
  sedentary: { factor: 1.2, label: 'Sedentario', hint: 'Trabajo sentado, casi sin ejercicio' },
  light: { factor: 1.375, label: 'Ligero', hint: 'Ejercicio 1–3 días por semana' },
  moderate: { factor: 1.55, label: 'Moderado', hint: 'Ejercicio 3–5 días por semana' },
  active: { factor: 1.725, label: 'Activo', hint: 'Ejercicio intenso 6–7 días' },
  very: { factor: 1.9, label: 'Muy activo', hint: 'Doble sesión o trabajo físico pesado' },
}

export const GOALS: Record<Goal, { kcalFactor: number; proteinPerKg: number; label: string; hint: string }> = {
  lose: { kcalFactor: 0.8, proteinPerKg: 2.0, label: 'Bajar grasa', hint: 'Déficit del 20 %' },
  maintain: { kcalFactor: 1, proteinPerKg: 1.6, label: 'Mantener', hint: 'Mismas calorías que gastas' },
  gain: { kcalFactor: 1.1, proteinPerKg: 1.8, label: 'Ganar músculo', hint: 'Superávit del 10 %' },
}

const FAT_SHARE = 0.25
const MIN_KCAL: Record<Sex, number> = { male: 1500, female: 1200 }

export function ageFrom(birthYear: number, now = new Date()): number {
  return now.getFullYear() - birthYear
}

export function bmrMifflin(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161)
}

export function tdee(profile: Profile, weightKg: number, now = new Date()): number {
  return bmrMifflin(profile.sex, weightKg, profile.heightCm, ageFrom(profile.birthYear, now)) * ACTIVITY[profile.activity].factor
}

export function recommendedGoals(profile: Profile, weightKg: number, now = new Date()): NutritionGoals {
  const g = GOALS[profile.goal]
  const kcal = Math.max(MIN_KCAL[profile.sex], Math.round((tdee(profile, weightKg, now) * g.kcalFactor) / 10) * 10)
  const protein = Math.round(weightKg * g.proteinPerKg)
  const fat = Math.round((kcal * FAT_SHARE) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  // Agua: ~35 ml por kg, redondeado a 250 ml.
  const waterMl = Math.round((weightKg * 35) / 250) * 250
  return { kcal, protein, carbs, fat, waterMl, custom: false }
}

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

export function addMacros(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat }
}

export function scaleMacros(per100g: Macros, grams: number): Macros {
  const f = grams / 100
  return { kcal: per100g.kcal * f, protein: per100g.protein * f, carbs: per100g.carbs * f, fat: per100g.fat * f }
}

export function roundMacros(m: Macros): Macros {
  const r1 = (n: number) => Math.round(n * 10) / 10
  return { kcal: Math.round(m.kcal), protein: r1(m.protein), carbs: r1(m.carbs), fat: r1(m.fat) }
}
