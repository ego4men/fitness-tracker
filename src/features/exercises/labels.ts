// Los datos guardan las claves originales (inglés); aquí se traducen para mostrar.

export const MUSCLE_LABELS: Record<string, string> = {
  abdominals: 'Abdominales',
  abductors: 'Abductores',
  adductors: 'Aductores',
  biceps: 'Bíceps',
  calves: 'Gemelos',
  chest: 'Pecho',
  forearms: 'Antebrazos',
  glutes: 'Glúteos',
  hamstrings: 'Isquiotibiales',
  lats: 'Dorsales',
  'lower back': 'Zona lumbar',
  'middle back': 'Espalda media',
  neck: 'Cuello',
  quadriceps: 'Cuádriceps',
  shoulders: 'Hombros',
  traps: 'Trapecios',
  triceps: 'Tríceps',
}

export const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  cable: 'Polea',
  machine: 'Máquina',
  'body only': 'Peso corporal',
  kettlebells: 'Kettlebell',
  bands: 'Bandas',
  'e-z curl bar': 'Barra Z',
  'medicine ball': 'Balón medicinal',
  'exercise ball': 'Fitball',
  'foam roll': 'Rodillo de espuma',
  other: 'Otro',
}

export const CATEGORY_LABELS: Record<string, string> = {
  strength: 'Fuerza',
  stretching: 'Estiramiento',
  plyometrics: 'Pliometría',
  strongman: 'Strongman',
  powerlifting: 'Powerlifting',
  cardio: 'Cardio',
  'olympic weightlifting': 'Halterofilia',
}

export const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  expert: 'Avanzado',
}

export const muscleLabel = (m: string) => MUSCLE_LABELS[m] ?? m
export const equipmentLabel = (e: string | null) => (e ? (EQUIPMENT_LABELS[e] ?? e) : 'Sin equipo')
