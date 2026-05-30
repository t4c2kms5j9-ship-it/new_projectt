function calc1RM(weight, reps) {
  if (reps === 1) return weight;
  if (reps <= 0 || weight <= 0) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

function calcVolume(sets) {
  return sets.reduce((sum, s) => sum + (s.weightKg * s.reps), 0);
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function calcStreak(workouts) {
  if (!workouts.length) return 0;
  const days = new Set(workouts.map(w => {
    const d = new Date(w.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }));
  const sorted = Array.from(days).sort((a, b) => b - a);
  const DAY = 86400000;
  const today = todayStart();
  let streak = 0;
  let cur = today;
  for (const d of sorted) {
    if (d === cur || d === cur - DAY) {
      streak++;
      cur = d;
    } else {
      break;
    }
  }
  return streak;
}
