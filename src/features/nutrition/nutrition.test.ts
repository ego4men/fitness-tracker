import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import type { Profile } from '../../db/types'
import { BASIC_FOODS } from './basics'
import { findByBarcode, logFood, rememberFood, saveProfile, searchLocal, summarizeRecipe, totals, updateEntry } from './foods'
import { bmrMifflin, recommendedGoals } from './goals'
import { parseOffProduct } from './off'

const profile: Profile = { sex: 'male', birthYear: 1996, heightCm: 178, activity: 'moderate', goal: 'gain' }
const NOW = new Date('2026-10-07')

describe('metas', () => {
  it('calcula BMR con Mifflin-St Jeor', () => {
    expect(bmrMifflin('male', 80, 180, 30)).toBe(1780)
    expect(bmrMifflin('female', 60, 165, 30)).toBeCloseTo(1320.25, 2)
  })

  it('reparte calorías y macros según objetivo', () => {
    // BMR = 800 + 1112.5 − 150 + 5 = 1767.5; ×1.55 = 2739.6; ×1.1 = 3013.6 → 3010
    const g = recommendedGoals(profile, 80, NOW)
    expect(g.kcal).toBe(3010)
    expect(g.protein).toBe(144) // 1.8 g/kg
    expect(g.fat).toBe(84) // 25 %
    expect(g.protein * 4 + g.carbs * 4 + g.fat * 9).toBeGreaterThan(g.kcal - 10)
    expect(g.waterMl).toBe(2750)
  })

  it('no baja de un mínimo seguro al bajar grasa', () => {
    const g = recommendedGoals({ ...profile, sex: 'female', goal: 'lose', activity: 'sedentary', heightCm: 150 }, 45, NOW)
    expect(g.kcal).toBe(1200)
  })
})

describe('Open Food Facts', () => {
  it('convierte un producto y calcula kcal desde kJ si falta', () => {
    const f = parseOffProduct({
      code: '123',
      product_name: 'Yogurt',
      product_name_es: 'Yogur griego',
      brands: 'Marca, Otra',
      nutriments: { 'energy-kj_100g': 418.4, proteins_100g: 10, carbohydrates_100g: '4', fat_100g: 0 },
      serving_quantity: 150,
      serving_size: '150 g',
    })
    expect(f).toMatchObject({ id: 'off:123', name: 'Yogur griego', brand: 'Marca', servingG: 150, per100g: { kcal: 100, protein: 10, carbs: 4, fat: 0 } })
    expect(parseOffProduct({ code: '1', product_name: 'Sin datos' })).toBeNull()
  })
})

describe('diario', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('registra un alimento escalando sus macros y lo recuerda como reciente', async () => {
    const huevo = BASIC_FOODS.find((f) => f.id === 'basic:huevo')!
    await logFood('2026-10-07', 'breakfast', huevo, 100)
    const [e] = await db.diary.toArray()
    expect(e).toMatchObject({ kcal: 143, protein: 12.6, grams: 100, meal: 'breakfast' })
    expect(searchLocal(await db.foods.toArray(), '')[0].id).toBe('basic:huevo')

    await updateEntry(e, { grams: 50 })
    expect((await db.diary.get(e.id))?.kcal).toBe(72)
    expect(totals(await db.diary.toArray()).protein).toBeCloseTo(6.3)
  })

  it('no pisa un alimento propio con datos de fuera y lo encuentra por código', async () => {
    await rememberFood({ ...BASIC_FOODS[0], id: 'mine', name: 'Mío', source: 'custom', barcode: '777' })
    await rememberFood({ ...BASIC_FOODS[0], id: 'mine', name: 'De fuera', source: 'off' })
    expect((await findByBarcode('777'))?.name).toBe('Mío')
  })

  it('busca sin acentos en básicos', () => {
    expect(searchLocal([], 'platano').map((f) => f.id)).toContain('basic:platano')
    expect(searchLocal([], 'CAFE')[0].id).toBe('basic:cafe-negro')
  })

  it('calcula una receta por 100 g', () => {
    const arroz = BASIC_FOODS.find((f) => f.id === 'basic:arroz-blanco')!
    const pollo = BASIC_FOODS.find((f) => f.id === 'basic:pechuga-pollo-cocida')!
    const r = summarizeRecipe([
      { food: arroz, grams: 200 },
      { food: pollo, grams: 200 },
    ])
    expect(r.totalGrams).toBe(400)
    expect(r.total.kcal).toBe(590)
    expect(r.per100g.kcal).toBe(148)
  })

  it('guarda perfil, peso y metas', async () => {
    await saveProfile(profile, 80)
    expect((await db.body.toArray())[0].weightKg).toBe(80)
    expect(((await db.settings.get('nutritionGoals'))?.value as { kcal: number }).kcal).toBeGreaterThan(2000)
  })
})
