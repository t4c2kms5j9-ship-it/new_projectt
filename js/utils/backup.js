const Backup = (() => {
  async function exportData() {
    const exercises = await db.exercises.toArray();
    const workouts = await db.workouts.toArray();
    const workoutExercises = await db.workoutExercises.toArray();
    const sets = await db.sets.toArray();
    const bodyWeight = await db.bodyWeight.toArray();
    const settings = await db.settings.toArray();
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      exercises, workouts, workoutExercises, sets, bodyWeight, settings
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `workouts-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.version || !data.workouts) throw new Error('Неверный формат файла');
          // Clear existing
          await db.sets.clear();
          await db.workoutExercises.clear();
          await db.workouts.clear();
          await db.bodyWeight.clear();
          await db.settings.clear();
          // Restore exercises (keep built-ins, add custom)
          const existingExercises = await db.exercises.toArray();
          if (existingExercises.length === 0 && data.exercises) {
            await db.exercises.bulkAdd(data.exercises.map(e => ({ ...e, id: undefined })));
          } else if (data.exercises) {
            const customExs = data.exercises.filter(e => e.isCustom);
            for (const ex of customExs) {
              const exists = existingExercises.find(e => e.name === ex.name);
              if (!exists) await db.exercises.add({ ...ex, id: undefined });
            }
          }
          // Map old exercise ids to new ones
          const allExercises = await db.exercises.toArray();
          const exIdMap = {};
          if (data.exercises) {
            for (const oldEx of data.exercises) {
              const match = allExercises.find(e => e.name === oldEx.name && e.muscleGroup === oldEx.muscleGroup);
              if (match) exIdMap[oldEx.id] = match.id;
            }
          }
          // Restore workouts
          const wIdMap = {};
          for (const w of (data.workouts || [])) {
            const oldId = w.id;
            const newId = await db.workouts.add({ ...w, id: undefined });
            wIdMap[oldId] = newId;
          }
          // Restore workoutExercises
          const weIdMap = {};
          for (const we of (data.workoutExercises || [])) {
            const oldId = we.id;
            const newId = await db.workoutExercises.add({
              ...we, id: undefined,
              workoutId: wIdMap[we.workoutId] || we.workoutId,
              exerciseId: exIdMap[we.exerciseId] || we.exerciseId
            });
            weIdMap[oldId] = newId;
          }
          // Restore sets
          for (const s of (data.sets || [])) {
            await db.sets.add({
              ...s, id: undefined,
              workoutExerciseId: weIdMap[s.workoutExerciseId] || s.workoutExerciseId
            });
          }
          // Restore body weight and settings
          for (const bw of (data.bodyWeight || [])) {
            await db.bodyWeight.add({ ...bw, id: undefined });
          }
          for (const s of (data.settings || [])) {
            await db.settings.put(s);
          }
          resolve({ workouts: (data.workouts || []).length });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsText(file);
    });
  }

  return { exportData, importData };
})();
