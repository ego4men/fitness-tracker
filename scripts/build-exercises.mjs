// Genera public/data/exercises.json a partir de free-exercise-db (Unlicense)
// + nombres en español (scripts/data/nombres-es.txt, misma posición que el JSON).
// Uso: node scripts/build-exercises.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const src = JSON.parse(readFileSync('scripts/data/free-exercise-db.json', 'utf8'))
const names = readFileSync('scripts/data/nombres-es.txt', 'utf8').split(/\r?\n/).filter(Boolean)

if (names.length !== src.length) {
  throw new Error(`nombres-es.txt tiene ${names.length} líneas; se esperaban ${src.length}`)
}

const out = src.map((e, i) => ({
  id: e.id,
  name: names[i],
  nameEn: e.name,
  category: e.category,
  force: e.force ?? null,
  mechanic: e.mechanic ?? null,
  primaryMuscles: e.primaryMuscles,
  secondaryMuscles: e.secondaryMuscles,
  equipment: e.equipment ?? null,
  level: e.level ?? null,
  instructions: e.instructions,
  images: e.images,
  custom: false,
}))

mkdirSync('public/data', { recursive: true })
writeFileSync('public/data/exercises.json', JSON.stringify(out))
console.log(`✓ ${out.length} ejercicios → public/data/exercises.json`)
