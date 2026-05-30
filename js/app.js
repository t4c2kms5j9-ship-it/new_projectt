const App = (() => {
  const views = ['dashboard', 'history', 'progress', 'exercises', 'settings'];
  const renderers = {
    dashboard: renderDashboard,
    history: renderHistory,
    progress: renderProgress,
    exercises: renderExercises,
    settings: renderSettings
  };
  let current = 'dashboard';
  const rendered = new Set();

  function navigate(view) {
    if (!views.includes(view)) return;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    current = view;
    // Always re-render dashboard and history (live data)
    if (view === 'dashboard' || view === 'history' || !rendered.has(view)) {
      renderers[view]();
      rendered.add(view);
    }
  }

  async function init() {
    await initDB();
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.view));
    });
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
    navigate('dashboard');
  }

  return { init, navigate };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
