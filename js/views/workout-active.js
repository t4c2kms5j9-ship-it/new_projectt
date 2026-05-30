const WorkoutActive = (() => {
  let state = null; // { name, startTime, exercises: [{exerciseId, name, sets:[{weight,reps,isWarmup,done}]}] }
  let elapsedInterval = null;

  function start() {
    state = {
      name: 'Тренировка',
      startTime: Date.now(),
      exercises: []
    };
    render();
  }

  function render() {
    const overlay = document.getElementById('workout-overlay');
    overlay.classList.remove('hidden');
    overlay.innerHTML = buildHTML();
    attachEvents();
    startElapsedTimer();
  }

  function buildHTML() {
    const exercisesHTML = state.exercises.map((ex, ei) => buildExerciseBlock(ex, ei)).join('');
    return `
      <div class="workout-hd">
        <button class="btn-icon" id="wk-cancel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <input class="workout-name-input" id="wk-name" value="${escHtml(state.name)}" placeholder="Название тренировки">
        <span class="workout-elapsed" id="wk-elapsed">0:00</span>
      </div>
      <div class="overlay-body" id="wk-body">
        <div class="px mt-12" id="exercises-list">${exercisesHTML}</div>
        <div class="px mt-8">
          <button class="btn btn-secondary" id="btn-add-exercise" style="width:100%">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Добавить упражнение
          </button>
        </div>
      </div>
      <div class="workout-footer">
        <button class="btn btn-primary" id="btn-finish-workout">Завершить тренировку</button>
      </div>
    `;
  }

  function buildExerciseBlock(ex, ei) {
    const setsHTML = ex.sets.map((s, si) => buildSetRow(s, ei, si)).join('');
    const prevHTML = ex.prevSets && ex.prevSets.length
      ? `Прошлый раз: ${ex.prevSets.slice(0,3).map(s => `${s.weightKg}×${s.reps}`).join(', ')}`
      : 'Первый раз — вперёд!';
    return `
      <div class="ex-block" data-ei="${ei}">
        <div class="ex-block-hd">
          <span class="ex-block-name">${escHtml(ex.name)}</span>
          <button class="btn-icon remove-ex" data-ei="${ei}" title="Убрать">✕</button>
        </div>
        <div class="ex-block-body">
          <div class="prev-hint">${escHtml(prevHTML)}</div>
          <div class="sets-header">
            <span class="col-lbl">#</span>
            <span class="col-lbl">Вес, кг</span>
            <span class="col-lbl">Повторения</span>
            <span class="col-lbl"></span>
          </div>
          <div class="sets-list" id="sets-${ei}">${setsHTML}</div>
          <button class="btn btn-ghost add-set" data-ei="${ei}" style="margin-top:6px;padding:6px 0;font-size:13px">
            + Добавить сет
          </button>
        </div>
      </div>`;
  }

  function buildSetRow(s, ei, si) {
    const doneClass = s.done ? 'is-done' : '';
    const warmupClass = s.isWarmup ? 'active' : '';
    return `
      <div class="set-cols ${doneClass}" id="set-${ei}-${si}">
        <span class="set-num">${si + 1}</span>
        <input type="number" inputmode="decimal" class="input-num set-weight" data-ei="${ei}" data-si="${si}" value="${s.weight || ''}" placeholder="0">
        <input type="number" inputmode="numeric" class="input-num set-reps" data-ei="${ei}" data-si="${si}" value="${s.reps || ''}" placeholder="0">
        <button class="btn-icon done-set ${s.done ? 'text-accent' : ''}" data-ei="${ei}" data-si="${si}" title="Готово">
          ${s.done ? '✓' : '○'}
        </button>
      </div>`;
  }

  function attachEvents() {
    const overlay = document.getElementById('workout-overlay');

    overlay.querySelector('#wk-name').addEventListener('input', e => { state.name = e.target.value; });

    overlay.querySelector('#wk-cancel').addEventListener('click', () => {
      if (state.exercises.length > 0 && !confirm('Отменить тренировку? Данные не сохранятся.')) return;
      cancel();
    });

    overlay.querySelector('#btn-finish-workout').addEventListener('click', finish);
    overlay.querySelector('#btn-add-exercise').addEventListener('click', openExercisePicker);

    overlay.addEventListener('click', e => {
      // Done set
      const doneBtn = e.target.closest('.done-set');
      if (doneBtn) {
        const ei = parseInt(doneBtn.dataset.ei);
        const si = parseInt(doneBtn.dataset.si);
        toggleDone(ei, si);
        return;
      }
      // Add set
      const addSetBtn = e.target.closest('.add-set');
      if (addSetBtn) {
        addSet(parseInt(addSetBtn.dataset.ei));
        return;
      }
      // Remove exercise
      const removeBtn = e.target.closest('.remove-ex');
      if (removeBtn) {
        removeExercise(parseInt(removeBtn.dataset.ei));
        return;
      }
    });

    overlay.addEventListener('change', e => {
      const weightInput = e.target.closest('.set-weight');
      if (weightInput) {
        const ei = parseInt(weightInput.dataset.ei), si = parseInt(weightInput.dataset.si);
        state.exercises[ei].sets[si].weight = parseFloat(weightInput.value) || 0;
        return;
      }
      const repsInput = e.target.closest('.set-reps');
      if (repsInput) {
        const ei = parseInt(repsInput.dataset.ei), si = parseInt(repsInput.dataset.si);
        state.exercises[ei].sets[si].reps = parseInt(repsInput.value) || 0;
        return;
      }
    });

    document.getElementById('rest-timer-skip').addEventListener('click', () => RestTimer.skip());
  }

  function toggleDone(ei, si) {
    const s = state.exercises[ei].sets[si];
    // Read current input values
    const weightEl = document.querySelector(`.set-weight[data-ei="${ei}"][data-si="${si}"]`);
    const repsEl = document.querySelector(`.set-reps[data-ei="${ei}"][data-si="${si}"]`);
    if (weightEl) s.weight = parseFloat(weightEl.value) || 0;
    if (repsEl) s.reps = parseInt(repsEl.value) || 0;
    s.done = !s.done;
    // Re-render set row
    const rowEl = document.getElementById(`set-${ei}-${si}`);
    if (rowEl) rowEl.outerHTML = buildSetRow(s, ei, si);
    // Re-attach events for new elements (via event delegation already handled)
    if (s.done) startRestTimer();
  }

  function addSet(ei) {
    const ex = state.exercises[ei];
    const lastSet = ex.sets[ex.sets.length - 1];
    ex.sets.push({
      weight: lastSet ? lastSet.weight : 0,
      reps: lastSet ? lastSet.reps : 0,
      isWarmup: false,
      done: false
    });
    const si = ex.sets.length - 1;
    const listEl = document.getElementById(`sets-${ei}`);
    if (listEl) {
      const div = document.createElement('div');
      div.innerHTML = buildSetRow(ex.sets[si], ei, si);
      listEl.appendChild(div.firstElementChild);
    }
  }

  function removeExercise(ei) {
    state.exercises.splice(ei, 1);
    reRenderExercises();
  }

  function reRenderExercises() {
    const list = document.getElementById('exercises-list');
    if (list) list.innerHTML = state.exercises.map((ex, ei) => buildExerciseBlock(ex, ei)).join('');
  }

  async function openExercisePicker() {
    const exercises = await db.exercises.orderBy('name').toArray();
    const backdrop = document.createElement('div');
    backdrop.className = 'sheet-backdrop';
    const sheet = document.createElement('div');
    sheet.className = 'sheet';

    const groups = Object.entries(MUSCLE_GROUPS);
    const pillsHTML = `<button class="filter-pill active" data-mg="all">Все</button>` +
      groups.map(([k, v]) => `<button class="filter-pill" data-mg="${k}">${v}</button>`).join('');

    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <div class="sheet-hd">
        <h3>Выбрать упражнение</h3>
        <button class="btn-icon" id="picker-close">✕</button>
      </div>
      <div style="padding:10px 16px 0">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="input search-input" id="picker-search" placeholder="Поиск..." type="search">
        </div>
        <div class="filter-pills" id="picker-pills" style="padding:0;margin-bottom:8px">${pillsHTML}</div>
      </div>
      <div class="sheet-body" id="picker-list"></div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);
    requestAnimationFrame(() => { backdrop.classList.add('open'); sheet.classList.add('open'); });

    let currentMg = 'all';
    let searchQ = '';

    function renderList() {
      const filtered = exercises.filter(ex => {
        const mgOk = currentMg === 'all' || ex.muscleGroup === currentMg;
        const searchOk = !searchQ || ex.name.toLowerCase().includes(searchQ.toLowerCase());
        return mgOk && searchOk;
      });
      const listEl = document.getElementById('picker-list');
      if (!listEl) return;
      if (!filtered.length) {
        listEl.innerHTML = '<div class="empty-state"><p>Ничего не найдено</p></div>';
        return;
      }
      listEl.innerHTML = filtered.map(ex => `
        <div class="ex-item" data-id="${ex.id}" data-name="${escHtml(ex.name)}">
          <div>
            <div class="ex-item-name">${escHtml(ex.name)}</div>
            <div class="ex-item-meta">${MUSCLE_GROUPS[ex.muscleGroup] || ''} · ${EQUIPMENT_LABELS[ex.equipment] || ''}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted)"><polyline points="9 18 15 12 9 6"/></svg>
        </div>`).join('');
    }

    renderList();

    function close() {
      backdrop.classList.remove('open'); sheet.classList.remove('open');
      setTimeout(() => { backdrop.remove(); sheet.remove(); }, 300);
    }

    sheet.querySelector('#picker-close').addEventListener('click', close);
    backdrop.addEventListener('click', close);

    sheet.querySelector('#picker-search').addEventListener('input', e => {
      searchQ = e.target.value;
      renderList();
    });

    sheet.querySelector('#picker-pills').addEventListener('click', e => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      currentMg = pill.dataset.mg;
      sheet.querySelectorAll('.filter-pill').forEach(p => p.classList.toggle('active', p === pill));
      renderList();
    });

    sheet.querySelector('#picker-list').addEventListener('click', async e => {
      const item = e.target.closest('.ex-item');
      if (!item) return;
      const exerciseId = parseInt(item.dataset.id);
      const name = item.dataset.name;
      const prevSets = await getLastSetsForExercise(exerciseId);
      state.exercises.push({
        exerciseId,
        name,
        sets: [{ weight: prevSets[0] ? prevSets[0].weightKg : 0, reps: prevSets[0] ? prevSets[0].reps : 0, isWarmup: false, done: false }],
        prevSets
      });
      reRenderExercises();
      close();
      // Scroll to new exercise
      setTimeout(() => {
        const list = document.getElementById('wk-body');
        if (list) list.scrollTop = list.scrollHeight;
      }, 350);
    });
  }

  async function startRestTimer() {
    const secs = await getRestTimerSeconds();
    RestTimer.start(secs, true);
    const bar = document.getElementById('rest-timer-bar');
    if (bar) bar.classList.add('in-overlay');
  }

  function startElapsedTimer() {
    if (elapsedInterval) clearInterval(elapsedInterval);
    elapsedInterval = setInterval(() => {
      const el = document.getElementById('wk-elapsed');
      if (!el || !state) { clearInterval(elapsedInterval); return; }
      const s = Math.floor((Date.now() - state.startTime) / 1000);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      el.textContent = `${m}:${String(sec).padStart(2, '0')}`;
    }, 1000);
  }

  async function finish() {
    const completedExercises = state.exercises.filter(ex => ex.sets.some(s => s.done));
    if (!completedExercises.length) {
      alert('Отметь хотя бы один сет как выполненный.');
      return;
    }
    const durationSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    const workoutData = {
      name: state.name || 'Тренировка',
      startTime: state.startTime,
      durationSeconds,
      notes: '',
      exercises: completedExercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets.filter(s => s.done).map((s, i) => ({
          order: i,
          reps: s.reps || 0,
          weightKg: s.weight || 0,
          isWarmup: s.isWarmup || false
        }))
      }))
    };
    await saveWorkout(workoutData);
    cancel();
    renderDashboard();
    renderHistory();
  }

  function cancel() {
    if (elapsedInterval) { clearInterval(elapsedInterval); elapsedInterval = null; }
    RestTimer.stop();
    state = null;
    const overlay = document.getElementById('workout-overlay');
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    const bar = document.getElementById('rest-timer-bar');
    if (bar) bar.classList.remove('in-overlay');
  }

  return { start };
})();
