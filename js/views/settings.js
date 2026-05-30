async function renderSettings() {
  const el = document.getElementById('view-settings');
  const rtSecs = await getRestTimerSeconds();
  const workoutCount = await db.workouts.count();

  el.innerHTML = `
    <div class="page-hd">
      <h1 class="page-title">Настройки</h1>
    </div>

    <div class="px">
      <div class="card mb-16" style="padding:0;overflow:hidden">
        <div class="settings-row">
          <div>
            <div class="settings-row-lbl">Таймер отдыха</div>
            <div style="font-size:12px;color:var(--text-muted)">По умолчанию между сетами</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <button class="btn-icon" id="rt-minus">−</button>
            <span id="rt-display" style="font-weight:700;min-width:40px;text-align:center">${formatDuration(rtSecs)}</span>
            <button class="btn-icon" id="rt-plus">+</button>
          </div>
        </div>
      </div>

      <div class="card mb-16" style="padding:0;overflow:hidden">
        <div class="settings-row">
          <div>
            <div class="settings-row-lbl">Экспорт данных</div>
            <div style="font-size:12px;color:var(--text-muted)">${workoutCount} тренировок · JSON файл</div>
          </div>
          <button class="btn btn-secondary" id="btn-export" style="padding:8px 14px;font-size:13px">Экспорт</button>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-lbl">Импорт данных</div>
            <div style="font-size:12px;color:var(--text-muted)">Восстановить из JSON файла</div>
          </div>
          <button class="btn btn-secondary" id="btn-import" style="padding:8px 14px;font-size:13px">Импорт</button>
        </div>
      </div>

      <div class="card mb-16" style="padding:0;overflow:hidden">
        <div class="settings-row">
          <div>
            <div class="settings-row-lbl">Сбросить все данные</div>
            <div style="font-size:12px;color:var(--text-muted)">Удалит все тренировки навсегда</div>
          </div>
          <button class="btn btn-danger" id="btn-clear" style="padding:8px 14px;font-size:13px">Сбросить</button>
        </div>
      </div>

      <div class="card" style="background:none;border-color:var(--border)">
        <div style="font-size:12px;color:var(--text-muted);text-align:center;line-height:1.8">
          Тренировки · Личное приложение<br>
          Все данные хранятся локально в браузере<br>
          <strong style="color:var(--text)">Регулярно делай экспорт для резервной копии</strong>
        </div>
      </div>
    </div>

    <input type="file" id="import-file" accept=".json" style="display:none">
  `;

  let currentRt = rtSecs;

  el.querySelector('#rt-minus').addEventListener('click', async () => {
    currentRt = Math.max(15, currentRt - 15);
    await setRestTimerSeconds(currentRt);
    el.querySelector('#rt-display').textContent = formatDuration(currentRt);
  });
  el.querySelector('#rt-plus').addEventListener('click', async () => {
    currentRt = Math.min(600, currentRt + 15);
    await setRestTimerSeconds(currentRt);
    el.querySelector('#rt-display').textContent = formatDuration(currentRt);
  });

  el.querySelector('#btn-export').addEventListener('click', async () => {
    try {
      await Backup.exportData();
    } catch(e) {
      alert('Ошибка экспорта: ' + e.message);
    }
  });

  el.querySelector('#btn-import').addEventListener('click', () => {
    el.querySelector('#import-file').click();
  });

  el.querySelector('#import-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Импорт заменит все текущие данные. Продолжить?')) return;
    try {
      const result = await Backup.importData(file);
      alert(`Импортировано ${result.workouts} тренировок!`);
      await renderDashboard();
      await renderHistory();
      await renderSettings();
    } catch(e) {
      alert('Ошибка импорта: ' + e.message);
    }
    e.target.value = '';
  });

  el.querySelector('#btn-clear').addEventListener('click', async () => {
    if (!confirm('Удалить ВСЕ тренировки? Это действие необратимо.')) return;
    if (!confirm('Точно? Это нельзя отменить.')) return;
    await db.sets.clear();
    await db.workoutExercises.clear();
    await db.workouts.clear();
    await db.bodyWeight.clear();
    await renderDashboard();
    await renderHistory();
    await renderSettings();
  });
}
