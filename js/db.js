const db = new Dexie('WorkoutTrackerDB');

db.version(1).stores({
  exercises: '++id, name, muscleGroup, equipment',
  workouts: '++id, date',
  workoutExercises: '++id, workoutId, exerciseId',
  sets: '++id, workoutExerciseId',
  bodyWeight: '++id, date',
  settings: '&key'
});

const MUSCLE_GROUPS = {
  chest: 'Грудь', back: 'Спина', legs: 'Ноги',
  shoulders: 'Плечи', biceps: 'Бицепс', triceps: 'Трицепс', core: 'Пресс'
};

const EQUIPMENT_LABELS = {
  barbell: 'Штанга', dumbbell: 'Гантели',
  machine: 'Тренажёр', bodyweight: 'Своё тело'
};

const BUILT_IN_EXERCISES = [
  // Грудь
  { name: 'Жим штанги лёжа',            muscleGroup: 'chest',     equipment: 'barbell',    isCustom: false },
  { name: 'Жим гантелей лёжа',           muscleGroup: 'chest',     equipment: 'dumbbell',   isCustom: false },
  { name: 'Жим на наклонной скамье',     muscleGroup: 'chest',     equipment: 'barbell',    isCustom: false },
  { name: 'Разводка гантелей лёжа',      muscleGroup: 'chest',     equipment: 'dumbbell',   isCustom: false },
  { name: 'Отжимания',                   muscleGroup: 'chest',     equipment: 'bodyweight', isCustom: false },
  { name: 'Кроссовер на блоке',          muscleGroup: 'chest',     equipment: 'machine',    isCustom: false },
  // Спина
  { name: 'Становая тяга',               muscleGroup: 'back',      equipment: 'barbell',    isCustom: false },
  { name: 'Тяга штанги в наклоне',       muscleGroup: 'back',      equipment: 'barbell',    isCustom: false },
  { name: 'Тяга гантели в наклоне',      muscleGroup: 'back',      equipment: 'dumbbell',   isCustom: false },
  { name: 'Подтягивания',                muscleGroup: 'back',      equipment: 'bodyweight', isCustom: false },
  { name: 'Тяга верхнего блока',         muscleGroup: 'back',      equipment: 'machine',    isCustom: false },
  { name: 'Тяга горизонтального блока',  muscleGroup: 'back',      equipment: 'machine',    isCustom: false },
  { name: 'Шраги со штангой',            muscleGroup: 'back',      equipment: 'barbell',    isCustom: false },
  // Ноги
  { name: 'Приседания со штангой',       muscleGroup: 'legs',      equipment: 'barbell',    isCustom: false },
  { name: 'Жим ногами',                  muscleGroup: 'legs',      equipment: 'machine',    isCustom: false },
  { name: 'Румынская тяга',              muscleGroup: 'legs',      equipment: 'barbell',    isCustom: false },
  { name: 'Выпады со штангой',           muscleGroup: 'legs',      equipment: 'barbell',    isCustom: false },
  { name: 'Разгибание ног в тренажёре',  muscleGroup: 'legs',      equipment: 'machine',    isCustom: false },
  { name: 'Сгибание ног в тренажёре',    muscleGroup: 'legs',      equipment: 'machine',    isCustom: false },
  { name: 'Подъём на носки стоя',        muscleGroup: 'legs',      equipment: 'machine',    isCustom: false },
  { name: 'Болгарские сплит-приседания', muscleGroup: 'legs',      equipment: 'dumbbell',   isCustom: false },
  // Плечи
  { name: 'Жим штанги стоя',             muscleGroup: 'shoulders', equipment: 'barbell',    isCustom: false },
  { name: 'Жим гантелей сидя',           muscleGroup: 'shoulders', equipment: 'dumbbell',   isCustom: false },
  { name: 'Махи гантелями в стороны',    muscleGroup: 'shoulders', equipment: 'dumbbell',   isCustom: false },
  { name: 'Махи в наклоне (зад. дельта)',muscleGroup: 'shoulders', equipment: 'dumbbell',   isCustom: false },
  { name: 'Тяга к подбородку',           muscleGroup: 'shoulders', equipment: 'barbell',    isCustom: false },
  { name: 'Жим Арнольда',               muscleGroup: 'shoulders', equipment: 'dumbbell',   isCustom: false },
  // Бицепс
  { name: 'Подъём штанги на бицепс',     muscleGroup: 'biceps',    equipment: 'barbell',    isCustom: false },
  { name: 'Подъём гантелей на бицепс',   muscleGroup: 'biceps',    equipment: 'dumbbell',   isCustom: false },
  { name: 'Молотковые сгибания',         muscleGroup: 'biceps',    equipment: 'dumbbell',   isCustom: false },
  { name: 'Подъём на бицепс на блоке',   muscleGroup: 'biceps',    equipment: 'machine',    isCustom: false },
  { name: 'Концентрированный подъём',    muscleGroup: 'biceps',    equipment: 'dumbbell',   isCustom: false },
  // Трицепс
  { name: 'Жим узким хватом',            muscleGroup: 'triceps',   equipment: 'barbell',    isCustom: false },
  { name: 'Французский жим',             muscleGroup: 'triceps',   equipment: 'barbell',    isCustom: false },
  { name: 'Разгибание на блоке',         muscleGroup: 'triceps',   equipment: 'machine',    isCustom: false },
  { name: 'Отжимания на брусьях',        muscleGroup: 'triceps',   equipment: 'bodyweight', isCustom: false },
  { name: 'Разгибание гантели из-за головы', muscleGroup: 'triceps', equipment: 'dumbbell', isCustom: false },
  // Пресс
  { name: 'Скручивания',                 muscleGroup: 'core',      equipment: 'bodyweight', isCustom: false },
  { name: 'Планка',                      muscleGroup: 'core',      equipment: 'bodyweight', isCustom: false },
  { name: 'Подъём ног в висе',           muscleGroup: 'core',      equipment: 'bodyweight', isCustom: false },
  { name: 'Скручивания на блоке',        muscleGroup: 'core',      equipment: 'machine',    isCustom: false },
  { name: 'Русские скручивания',         muscleGroup: 'core',      equipment: 'bodyweight', isCustom: false },
];

async function initDB() {
  const count = await db.exercises.count();
  if (count === 0) {
    await db.exercises.bulkAdd(BUILT_IN_EXERCISES);
  }
  const rt = await db.settings.get('restTimerSeconds');
  if (!rt) await db.settings.put({ key: 'restTimerSeconds', value: 90 });
}

// Helpers
async function getRestTimerSeconds() {
  const r = await db.settings.get('restTimerSeconds');
  return r ? r.value : 90;
}

async function setRestTimerSeconds(v) {
  await db.settings.put({ key: 'restTimerSeconds', value: Number(v) });
}

async function getLastSetsForExercise(exerciseId, excludeWorkoutId = null) {
  // Find the most recent workoutExercise for this exercise
  let weQuery = db.workoutExercises.where('exerciseId').equals(exerciseId);
  const wes = await weQuery.toArray();
  if (!wes.length) return [];
  // Sort by workoutId desc (higher id = newer)
  const sorted = wes.sort((a, b) => b.workoutId - a.workoutId);
  const target = excludeWorkoutId
    ? sorted.find(w => w.workoutId !== excludeWorkoutId)
    : sorted[0];
  if (!target) return [];
  const sets = await db.sets.where('workoutExerciseId').equals(target.id).toArray();
  return sets.sort((a, b) => a.order - b.order);
}

async function saveWorkout(workoutData) {
  // workoutData: { name, startTime, durationSeconds, notes, exercises }
  // exercises: [{ exerciseId, sets: [{ order, reps, weightKg, isWarmup }] }]
  const workoutId = await db.workouts.add({
    date: workoutData.startTime,
    name: workoutData.name,
    durationSeconds: workoutData.durationSeconds,
    notes: workoutData.notes || ''
  });
  for (let i = 0; i < workoutData.exercises.length; i++) {
    const ex = workoutData.exercises[i];
    const weId = await db.workoutExercises.add({
      workoutId,
      exerciseId: ex.exerciseId,
      order: i,
      notes: ex.notes || ''
    });
    for (const s of ex.sets) {
      await db.sets.add({
        workoutExerciseId: weId,
        order: s.order,
        reps: s.reps,
        weightKg: s.weightKg,
        isWarmup: s.isWarmup || false,
        completedAt: Date.now()
      });
    }
  }
  return workoutId;
}

async function getWorkoutDetail(workoutId) {
  const workout = await db.workouts.get(workoutId);
  const wes = await db.workoutExercises.where('workoutId').equals(workoutId).toArray();
  wes.sort((a, b) => a.order - b.order);
  const result = [];
  for (const we of wes) {
    const exercise = await db.exercises.get(we.exerciseId);
    const sets = await db.sets.where('workoutExerciseId').equals(we.id).toArray();
    sets.sort((a, b) => a.order - b.order);
    result.push({ ...we, exercise, sets });
  }
  return { ...workout, exercises: result };
}

async function deleteWorkout(workoutId) {
  const wes = await db.workoutExercises.where('workoutId').equals(workoutId).toArray();
  for (const we of wes) {
    await db.sets.where('workoutExerciseId').equals(we.id).delete();
  }
  await db.workoutExercises.where('workoutId').equals(workoutId).delete();
  await db.workouts.delete(workoutId);
}