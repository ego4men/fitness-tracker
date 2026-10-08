import Dexie, { type EntityTable } from 'dexie'
import type {
  BodyMetric,
  DiaryEntry,
  Exercise,
  Fast,
  Food,
  Measurement,
  ProgressPhoto,
  Routine,
  SetLog,
  Setting,
  WaterLog,
  WorkoutSession,
} from './types'

export class FitnessDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  sessions!: EntityTable<WorkoutSession, 'id'>
  sets!: EntityTable<SetLog, 'id'>
  foods!: EntityTable<Food, 'id'>
  diary!: EntityTable<DiaryEntry, 'id'>
  water!: EntityTable<WaterLog, 'id'>
  body!: EntityTable<BodyMetric, 'id'>
  settings!: EntityTable<Setting, 'key'>
  measurements!: EntityTable<Measurement, 'id'>
  photos!: EntityTable<ProgressPhoto, 'id'>
  fasts!: EntityTable<Fast, 'id'>

  constructor(name = 'fitness-tracker') {
    super(name)
    // Solo se declaran los campos indexados. Cambios de esquema = nueva versión.
    this.version(1).stores({
      exercises: 'id, name, category, *primaryMuscles, custom',
      routines: 'id, name, createdAt',
      sessions: 'id, routineId, startedAt',
      sets: 'id, sessionId, exerciseId, [exerciseId+createdAt]',
      foods: 'id, name, barcode, source',
      diary: 'id, date, [date+meal]',
      water: 'id, date',
      body: 'id, date',
      settings: 'key',
    })
    // v2 (fase 3): medidas corporales y fotos de progreso.
    this.version(2).stores({
      measurements: 'id, date, kind, [kind+date]',
      photos: 'id, date',
    })
    // v3 (fase 4): registro de ayunos.
    this.version(3).stores({
      fasts: 'id, startedAt',
    })
  }
}

export const db = new FitnessDB()

export const newId = () => crypto.randomUUID()
