import { db, newId } from '../../db/db'
import type { Progression, Routine, RoutineExercise } from '../../db/types'

const double = (repMax: number, incrementKg = 2.5): Progression => ({ type: 'double', repMax, incrementKg })
const linear = (incrementKg = 2.5): Progression => ({ type: 'linear', incrementKg, deloadAfter: 3 })

const ex = (exerciseId: string, sets: number, reps: number, restSec: number, progression?: Progression): RoutineExercise => ({
  exerciseId,
  sets,
  reps,
  restSec,
  ...(progression ? { progression } : {}),
})

type Template = Pick<Routine, 'name' | 'notes' | 'exercises'>

/** Push/Pull/Legs con doble progresión (hipertrofia). */
export const PPL_TEMPLATE: Template[] = [
  {
    name: 'Push',
    notes: 'Pecho, hombros y tríceps',
    exercises: [
      ex('Barbell_Bench_Press_-_Medium_Grip', 4, 6, 150, double(10)),
      ex('Incline_Dumbbell_Press', 3, 8, 120, double(12, 2)),
      ex('Dumbbell_Shoulder_Press', 3, 8, 120, double(12, 2)),
      ex('Side_Lateral_Raise', 3, 12, 60, double(20, 1)),
      ex('Triceps_Pushdown', 3, 10, 60, double(15, 2.5)),
      ex('Cable_Rope_Overhead_Triceps_Extension', 3, 10, 60, double(15, 2.5)),
    ],
  },
  {
    name: 'Pull',
    notes: 'Espalda, deltoides posterior y bíceps',
    exercises: [
      ex('Pullups', 4, 6, 150),
      ex('Bent_Over_Barbell_Row', 4, 6, 120, double(10)),
      ex('Seated_Cable_Rows', 3, 10, 90, double(15, 2.5)),
      ex('Face_Pull', 3, 12, 60, double(20, 2.5)),
      ex('Barbell_Curl', 3, 8, 60, double(12)),
      ex('Hammer_Curls', 3, 10, 60, double(15, 2)),
    ],
  },
  {
    name: 'Legs',
    notes: 'Cuádriceps, isquios, glúteos y gemelos',
    exercises: [
      ex('Barbell_Squat', 4, 5, 180, double(8, 5)),
      ex('Romanian_Deadlift', 3, 6, 150, double(10, 5)),
      ex('Leg_Press', 3, 10, 120, double(15, 5)),
      ex('Lying_Leg_Curls', 3, 10, 60, double(15, 2.5)),
      ex('Leg_Extensions', 3, 12, 60, double(20, 2.5)),
      ex('Standing_Calf_Raises', 4, 12, 60, double(20, 5)),
    ],
  },
]

/** StrongLifts 5x5: alterna A y B, +2.5 kg cada sesión (+5 kg peso muerto). */
export const STRONGLIFTS_TEMPLATE: Template[] = [
  {
    name: '5x5 A',
    notes: 'Sentadilla, press de banca y remo',
    exercises: [
      ex('Barbell_Squat', 5, 5, 180, linear()),
      ex('Barbell_Bench_Press_-_Medium_Grip', 5, 5, 180, linear()),
      ex('Bent_Over_Barbell_Row', 5, 5, 180, linear()),
    ],
  },
  {
    name: '5x5 B',
    notes: 'Sentadilla, press militar y peso muerto',
    exercises: [
      ex('Barbell_Squat', 5, 5, 180, linear()),
      ex('Standing_Military_Press', 5, 5, 180, linear()),
      ex('Barbell_Deadlift', 1, 5, 180, linear(5)),
    ],
  },
]

export const PROGRAMS = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: '3 rutinas para hipertrofia con doble progresión: subes peso cuando llegas al tope del rango de reps.',
    routines: PPL_TEMPLATE,
  },
  {
    id: 'stronglifts',
    name: 'StrongLifts 5x5',
    description: '2 rutinas (A/B) de fuerza para principiantes con progresión lineal: +2,5 kg cada entreno; descarga tras 3 fallos.',
    routines: STRONGLIFTS_TEMPLATE,
  },
] as const

/** Crea las rutinas de un programa al final de la rotación; opcionalmente archiva las actuales. */
export async function applyProgram(programId: string, archiveCurrent: boolean): Promise<void> {
  const program = PROGRAMS.find((p) => p.id === programId)
  if (!program) return
  await db.transaction('rw', db.routines, async () => {
    const current = await db.routines.toArray()
    if (archiveCurrent) for (const r of current) if (!r.archived) await db.routines.update(r.id, { archived: true })
    const start = current.reduce((m, r) => Math.max(m, r.order + 1), 0)
    const now = Date.now()
    await db.routines.bulkAdd(
      program.routines.map((r, i) => ({ ...r, exercises: r.exercises.map((e) => ({ ...e })), id: newId(), order: start + i, createdAt: now + i })),
    )
  })
}

/** Crea las rutinas PPL una sola vez (si el usuario las borra, no reaparecen). */
export async function ensureDefaultRoutines(): Promise<void> {
  await db.transaction('rw', db.routines, db.settings, async () => {
    if ((await db.settings.get('defaultRoutinesSeeded'))?.value) return
    const now = Date.now()
    await db.routines.bulkAdd(PPL_TEMPLATE.map((r, i) => ({ ...r, id: newId(), order: i, createdAt: now + i })))
    await db.settings.put({ key: 'defaultRoutinesSeeded', value: true })
  })
}
