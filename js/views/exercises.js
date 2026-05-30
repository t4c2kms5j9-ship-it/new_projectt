async function renderExercises() {
  const el = document.getElementById('view-exercises');
  el.innerHTML = `
    <div class="page-hd" style="display:flex;align-items:center;justify-content:space-between">
      <h1 class="page-title">Упражнения</h1>
      <button class="btn btn-secondary" id="btn-add-ex" style="padding:8px 14px;font-size:13px">+ Своё</button>
    </div>
    <div class="px mb-8">
      <div class="search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="input search-input" id="ex-search" placeholder="Поиск..." type="search">
      </div>
    </div>
    <div class="filter-pills" id="ex-pills">
      <button class="filter-pill active" data-mg="all">Все</button>
      ${Object.entries(MUSCLE_GROUPS).map(([k,v]) => `<button class="filter-pill" data-mg="${k}">${v}</button>`).join('')}
    </div>
    <div class="card px" style="padding:0;margin:0 16px;border-radius:12px;overflow:hidden">
      <div id="ex-list"><div class="loading">Загрузка...</div></div>
    </div>
  `;

  let exercises = await db.exercises.orderBy('name').toArray();
  let currentMg = 'all';
  let searchQ = '';

  function render() {
    const filtered = exercises.filter(ex => {
      const mgOk = currentMg === 'all' || ex.muscleGroup === currentMg;
      const searchOk = !searchQ || ex.name.toLowerCase().includes(searchQ.toLowerCase());
      return mgOk && searchOk;
    });
    const listEl = document.getElementById('ex-list');
    if (!listEl) return;
    if (!filtered.length) {
      listEl.innerHTML = '<div class="empty-state"><p>Ничего не найдено</p></div>';
      return;
    }
    listEl.innerHTML = filtered.map(ex => `
      <div class="ex-item" data-id="${ex.id}">
        <div>
          <div class="ex-item-name">${escHtml(ex.name)}</div>
          <div class="ex-item-meta">${MUSCLE_GROUPS[ex.muscleGroup] || ''} · ${EQUIPMENT_LABELS[ex.equipment] || ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          ${ex.isCustom ? `<button class="btn-icon delete-ex text-danger" data-id="${ex.id}" title="Удалить">✕</button>` : ''}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted)"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>`).join('');
  }

  render();

  el.querySelector('#ex-search').addEventListener('input', e => { searchQ = e.target.value; render(); });
  el.querySelector('#ex-pills').addEventListener('click', e => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    currentMg = pill.dataset.mg;
    el.querySelectorAll('.filter-pill').forEach(p => p.classList.toggle('active', p === pill));
    render();
  });

  el.querySelector('#btn-add-ex').addEventListener('click', () => {
    const name = prompt('Название упражнения:');
    if (!name || !name.trim()) return;
    const mgKeys = Object.keys(MUSCLE_GROUPS);
    const mgLabels = Object.values(MUSCLE_GROUPS);
    const mgChoice = prompt(`Группа мышц:\n${mgLabels.map((v,i) => `${i+1}. ${v}`).join('\n')}\n\nВведи номер:`);
    const mgIdx = parseInt(mgChoice) - 1;
    if (isNaN(mgIdx) || mgIdx < 0 || mgIdx >= mgKeys.length) { alert('Неверный номер'); return; }
    db.exercises.add({ name: name.trim(), muscleGroup: mgKeys[mgIdx], equipment: 'barbell', isCustom: true })
      .then(async () => {
        exercises = await db.exercises.orderBy('name').toArray();
        render();
      });
  });

  el.querySelector('#ex-list').addEventListener('click', async e => {
    const delBtn = e.target.closest('.delete-ex');
    if (delBtn) {
      e.stopPropagation();
      if (!confirm('Удалить упражнение?')) return;
      await db.exercises.delete(parseInt(delBtn.dataset.id));
      exercises = await db.exercises.orderBy('name').toArray();
      render();
      return;
    }
  });
}
