import type { Food } from '../../db/types'

// Open Food Facts (datos ODbL). Límites: búsqueda 10 peticiones/min, producto
// 100/min → buscamos solo al confirmar, nunca en cada tecla.
// La API nueva (search.openfoodfacts.org) no permite CORS; usamos cgi/search.pl.

const BASE = 'https://world.openfoodfacts.org'
const FIELDS = 'code,product_name,product_name_es,brands,nutriments,serving_quantity,serving_quantity_unit,serving_size'

interface OffProduct {
  code?: string
  product_name?: string
  product_name_es?: string
  brands?: string | string[]
  nutriments?: Record<string, number | string | undefined>
  serving_quantity?: number | string
  serving_quantity_unit?: string
  serving_size?: string
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/** Convierte un producto de OFF en Food; null si le faltan nombre o calorías. */
export function parseOffProduct(p: OffProduct): Food | null {
  const name = (p.product_name_es || p.product_name || '').trim()
  const n = p.nutriments ?? {}
  const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g'])
  const kcal = num(n['energy-kcal_100g']) ?? (kj != null ? kj / 4.184 : null)
  if (!name || !p.code || kcal == null) return null
  const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(',')[0]
  const serving = num(p.serving_quantity)
  const servingInGrams = serving && serving > 0 && (!p.serving_quantity_unit || /^(g|ml)$/i.test(p.serving_quantity_unit))
  return {
    id: `off:${p.code}`,
    name,
    brand: brand?.trim() || null,
    barcode: p.code,
    per100g: {
      kcal: Math.round(kcal),
      protein: num(n['proteins_100g']) ?? 0,
      carbs: num(n['carbohydrates_100g']) ?? 0,
      fat: num(n['fat_100g']) ?? 0,
    },
    servingG: servingInGrams ? serving : null,
    // "125 g" no aporta como nombre (ya mostramos los gramos): mejor "1 porción".
    servingName: servingInGrams
      ? p.serving_size && !/^\s*[\d.,]+\s*(g|ml)\s*$/i.test(p.serving_size)
        ? p.serving_size.trim()
        : '1 porción'
      : null,
    source: 'off',
    lastUsedAt: null,
  }
}

export async function searchOff(query: string, signal?: AbortSignal): Promise<Food[]> {
  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&page_size=30&lc=es&sort_by=unique_scans_n&fields=${FIELDS}`
  const res = await fetch(url, { signal })
  if (res.status === 429) throw new Error('Open Food Facts limita las búsquedas: espera un minuto.')
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`)
  const data = (await res.json()) as { products?: OffProduct[] }
  return (data.products ?? []).map(parseOffProduct).filter((f): f is Food => f != null)
}

/** null = producto no encontrado (o sin datos nutricionales). */
export async function fetchOffByBarcode(barcode: string, signal?: AbortSignal): Promise<Food | null> {
  const res = await fetch(`${BASE}/api/v2/product/${encodeURIComponent(barcode)}?fields=${FIELDS}`, { signal })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`)
  const data = (await res.json()) as { status?: number; product?: OffProduct }
  if (!data.product) return null
  return parseOffProduct({ ...data.product, code: data.product.code ?? barcode })
}
