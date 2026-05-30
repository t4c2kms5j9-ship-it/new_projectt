async function renderHistory() {
  const el = document.getElementById('view-history');
  el.innerHTML = `
    <div class="page-hd">
      <h1 class="page-title">История</h1>
    </div>
    <div class="px mb-12">
      <div class="search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="input search-input" id="history-search" placeholder="Поиск тренировки..." type="search">
      </div>
    </div>
    <div class="px" id="history-list"><div class="loading">Загрузка...</div></div>
  `;

  let allWorkouts = await db.workouts.orderBy('date').reverse().toArray();
  let query = '';

  async function render(workouts) {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;
    if (!workouts.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Нет тренировок</p></div>`;
      return;
    }
    // Group by month
    const groups = {};
    for (const w of workouts) {
      const key = new Date(w.date).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(w);
    }
    let html = '';
    for (const [month, ws] of Object.entries(groups)) {
      html += `<div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:16px 0 8px">${month}</div>`;
      for (const w of ws) {
        // Count exercises
        const weCount = await db.workoutExercises.where('workoutId').equals(w.id).count();
        html += `
          <div class="workout-item" data-id="${w.id}">
            <div class="workout-item-name">${escHtml(w.name)}</div>
            <div class="workout-item-meta">
              <span>${formatDate(w.date)}</span>
              <span>${formatDuration(w.durationSeconds)}</span>
              <span>${weCount} упр.</span>
            </div>
          </div>`;
      }
    }
    listEl.innerHTML = html;
    listEl.querySelectorAll('.workout-item').forEach(item => {
      item.addEventListener('click', () => showWorkoutDetail(parseInt(item.dataset.id)));
    });
  }

  await render(allWorkouts);

  document.getElementById('history-search').addEventListener('input', async e => {
    query = e.target.value.trim().toLowerCase();
    const filtered = query ? allWorkouts.filter(w => w.name.toLowerCase().includes(query)) : allWorkouts;
    await render(filtered);
  });
}
