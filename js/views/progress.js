let progressChart = null;
let bwChart = null;

async function renderProgress() {
  const el = document.getElementById('view-progress');
  const exercises = await db.exercises.orderBy('name').toArray();

  const optionsHTML = exercises.map(ex =>
    `<option value="${ex.id}">${escHtml(ex.name)}</option>`
  ).join('');

  el.innerHTML = `
    <div class="page-hd">
      <h1 class="page-title">Прогресс</h1>
    </div>

    <div class="px mb-8">
      <select class="input" id="progress-exercise">
        <option value="">— Выбери упражнение —</option>
        ${optionsHTML}
      </select>
    </div>

    <div class="period-pills mb-8">
      <button class="period-pill" data-p="30">1 мес</button>
      <button class="period-pill active" data-p="90">3 мес</button>
      <button class="period-pill" data-p="180">6 мес</button>
      <button class="period-pill" data-p="365">1 год</button>
      <button class="period-pill" data-p="0">Всё</button>
    </div>

    <div class="px">
      <div class="card mb-12">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Макс. расч. 1RM (кг)</div>
        <div class="chart-wrap"><canvas id="chart-strength"></canvas></div>
      </div>
      <div id="progress-stats" class="stats-row" style="display:none"></div>
    </div>

    <div class="section-hd px mt-8 mb-8">
      <h3>Вес тела</h3>
      <button class="btn btn-secondary" id="btn-add-bw" style="padding:6px 12px;font-size:13px">+ Записать</button>
    </div>
    <div class="px">
      <div class="card mb-12">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Вес тела (кг)</div>
        <div class="chart-wrap"><canvas id="chart-bw"></canvas></div>
      </div>
    </div>
  `;

  let selectedExId = null;
  let periodDays = 90;

  const chartDefaults = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', borderWidth: 1, titleColor: '#e8e8e8', bodyColor: '#e8e8e8' } },
    scales: {
      x: { ticks: { color: '#666', font: { size: 11 } }, grid: { color: '#1f1f1f' } },
      y: { ticks: { color: '#666', font: { size: 11 } }, grid: { color: '#1f1f1f' } }
    }
  };

  async function loadStrengthChart() {
    if (!selectedExId) return;
    const since = periodDays > 0 ? Date.now() - periodDays * 86400000 : 0;
    const wes = await db.workoutExercises.where('exerciseId').equals(selectedExId).toArray();
    const points = [];
    for (const we of wes) {
      const workout = await db.workouts.get(we.workoutId);
      if (!workout || (since && workout.date < since)) continue;
      const sets = await db.sets.where('workoutExerciseId').equals(we.id).toArray();
      const workingSets = sets.filter(s => !s.isWarmup && s.weightKg > 0 && s.reps > 0);
      if (!workingSets.length) continue;
      const best1RM = Math.max(...workingSets.map(s => calc1RM(s.weightKg, s.reps)));
      points.push({ x: formatDateShort(workout.date), y: Math.round(best1RM * 10) / 10, date: workout.date });
    }
    points.sort((a, b) => a.date - b.date);

    const statsEl = document.getElementById('progress-stats');
    if (points.length) {
      const best = Math.max(...points.map(p => p.y));
      const last = points[points.length - 1].y;
      const first = points[0].y;
      const diff = Math.round((last - first) * 10) / 10;
      statsEl.style.display = 'grid';
      statsEl.innerHTML = `
        <div class="stat-card"><div class="stat-val">${best}</div><div class="stat-lbl">Лучший 1RM</div></div>
        <div class="stat-card"><div class="stat-val">${last}</div><div class="stat-lbl">Последний</div></div>
        <div class="stat-card"><div class="stat-val ${diff >= 0 ? 'text-accent' : 'text-danger'}">${diff >= 0 ? '+' : ''}${diff}</div><div class="stat-lbl">Прогресс</div></div>
      `;
    } else {
      statsEl.style.display = 'none';
    }

    if (progressChart) { progressChart.destroy(); progressChart = null; }
    const ctx = document.getElementById('chart-strength');
    if (!ctx) return;
    if (!points.length) {
      ctx.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-muted);font-size:13px">Нет данных за период</div>';
      return;
    }
    progressChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: points.map(p => p.x),
        datasets: [{ data: points.map(p => p.y), borderColor: '#e8ff6e', backgroundColor: 'rgba(232,255,110,0.08)', tension: 0.3, pointRadius: 4, pointBackgroundColor: '#e8ff6e', fill: true }]
      },
      options: { ...chartDefaults }
    });
  }

  async function loadBWChart() {
    const bwData = await db.bodyWeight.orderBy('date').toArray();
    if (bwChart) { bwChart.destroy(); bwChart = null; }
    const ctx = document.getElementById('chart-bw');
    if (!ctx) return;
    if (!bwData.length) {
      ctx.parentElement.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-muted);font-size:13px">Нет данных</div><canvas id="chart-bw"></canvas>`;
      return;
    }
    bwChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: bwData.map(b => formatDateShort(b.date)),
        datasets: [{ data: bwData.map(b => b.weightKg), borderColor: '#888', backgroundColor: 'rgba(136,136,136,0.06)', tension: 0.3, pointRadius: 4, pointBackgroundColor: '#888', fill: true }]
      },
      options: { ...chartDefaults }
    });
  }

  el.querySelector('#progress-exercise').addEventListener('change', async e => {
    selectedExId = e.target.value ? parseInt(e.target.value) : null;
    await loadStrengthChart();
  });

  el.querySelector('.period-pills').addEventListener('click', async e => {
    const pill = e.target.closest('.period-pill');
    if (!pill) return;
    el.querySelectorAll('.period-pill').forEach(p => p.classList.toggle('active', p === pill));
    periodDays = parseInt(pill.dataset.p);
    await loadStrengthChart();
  });

  el.querySelector('#btn-add-bw').addEventListener('click', () => {
    const w = prompt('Введи вес тела (кг):');
    if (!w || isNaN(parseFloat(w))) return;
    db.bodyWeight.add({ date: Date.now(), weightKg: parseFloat(w) }).then(() => loadBWChart());
  });

  await loadBWChart();
}
