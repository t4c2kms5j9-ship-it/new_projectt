async function renderDashboard() {
  const el = document.getElementById('view-dashboard');
  el.innerHTML = '<div class="loading">Загрузка...</div>';

  const allWorkouts = await db.workouts.orderBy('date').reverse().toArray();
  const streak = calcStreak(allWorkouts);
  const recent = allWorkouts.slice(0, 5);

  const today = todayStart();
  const weekAgo = today - 7 * 86400000;
  const weekWorkouts = allWorkouts.filter(w => w.date >= weekAgo);
  const totalVolumeWeek = await (async () => {
    let vol = 0;
    for (const w of weekWorkouts) {
      const wes = await db.workoutExercises.where('workoutId').equals(w.id).toArray();
      for (const we of wes) {
        const sets = await db.sets.where('workoutExerciseId').equals(we.id).toArray();
        vol += calcVolume(sets);
      }
    }
    return Math.round(vol);
  })();

  const todayGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  const recentHTML = recent.length === 0
    ? `<div class="empty-state"><div class="empty-icon">🏋️</div><p>Ещё нет тренировок</p></div>`
    : recent.map(w => `
      <div class="workout-item" data-id="${w.id}">
        <div class="workout-item-name">${escHtml(w.name)}</div>
        <div class="workout-item-meta">
          <span>${formatDate(w.date)}</span>
          <span>${formatDuration(w.durationSeconds)}</span>
        </div>
      </div>`).join('');

  el.innerHTML = `
    <div class="page-hd">
      <div class="page-sub">${todayGreeting()}</div>
      <h1 class="page-title">${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</h1>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-val text-accent">${streak}</div>
        <div class="stat-lbl">Стрик дней</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${allWorkouts.length}</div>
        <div class="stat-lbl">Тренировок</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${totalVolumeWeek >= 1000 ? (totalVolumeWeek/1000).toFixed(1)+'т' : totalVolumeWeek+'кг'}</div>
        <div class="stat-lbl">Объём 7 дней</div>
      </div>
    </div>

    <div class="px mb-16">
      <button class="btn btn-primary" id="btn-start-workout">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Начать тренировку
      </button>
    </div>

    <div class="section-hd">
      <h3>Последние тренировки</h3>
    </div>
    <div class="px" id="recent-list">${recentHTML}</div>
  `;

  document.getElementById('btn-start-workout').addEventListener('click', () => {
    WorkoutActive.start();
  });

  el.querySelectorAll('.workout-item').forEach(item => {
    item.addEventListener('click', () => {
      showWorkoutDetail(parseInt(item.dataset.id));
    });
  });
}

async function showWorkoutDetail(workoutId) {
  const detail = await getWorkoutDetail(workoutId);
  const overlay = document.getElementById('workout-overlay');

  const exercisesHTML = detail.exercises.map(ex => {
    const setsHTML = ex.sets.map((s, i) => {
      const label = s.isWarmup ? '<span class="badge" style="margin-left:4px;font-size:10px">Р</span>' : '';
      return `<div style="display:flex;gap:12px;padding:4px 0;font-size:14px;color:var(--text-muted)">
        <span style="color:var(--text-muted);min-width:20px;text-align:center">${i+1}</span>
        <span>${s.weightKg} кг</span>
        <span>×</span>
        <span>${s.reps} повт${label}</span>
        <span style="margin-left:auto;color:var(--text-muted);font-size:12px">${calc1RM(s.weightKg, s.reps).toFixed(1)} 1RM</span>
      </div>`;
    }).join('');
    return `<div class="card mb-12">
      <div style="font-weight:600;margin-bottom:8px">${escHtml(ex.exercise ? ex.exercise.name : 'Упражнение')}</div>
      ${setsHTML}
    </div>`;
  }).join('');

  const totalVol = detail.exercises.reduce((sum, ex) => sum + calcVolume(ex.sets), 0);

  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="workout-hd">
      <button class="btn-icon" id="detail-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      </button>
      <span style="font-weight:700;font-size:17px;flex:1">${escHtml(detail.name)}</span>
      <button class="btn-ghost text-danger" id="detail-delete">Удалить</button>
    </div>
    <div class="overlay-body px mt-16">
      <div class="flex gap-12 mb-16">
        <div class="stat-card flex-1"><div class="stat-val">${formatDate(detail.date)}</div><div class="stat-lbl">Дата</div></div>
        <div class="stat-card flex-1"><div class="stat-val">${formatDuration(detail.durationSeconds)}</div><div class="stat-lbl">Длительность</div></div>
        <div class="stat-card flex-1"><div class="stat-val">${Math.round(totalVol)}кг</div><div class="stat-lbl">Объём</div></div>
      </div>
      ${exercisesHTML}
    </div>
  `;

  document.getElementById('detail-close').addEventListener('click', () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
  });
  document.getElementById('detail-delete').addEventListener('click', async () => {
    if (!confirm('Удалить эту тренировку?')) return;
    await deleteWorkout(workoutId);
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    renderDashboard();
    renderHistory();
  });
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
