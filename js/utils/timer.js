const RestTimer = (() => {
  let _interval = null;
  let _total = 0;
  let _remaining = 0;
  let _inOverlay = false;

  const bar = () => document.getElementById('rest-timer-bar');
  const fill = () => document.getElementById('rest-timer-fill');
  const timeEl = () => document.getElementById('rest-timer-time');

  function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function update() {
    const t = timeEl(), f = fill();
    if (!t || !f) return;
    t.textContent = fmt(_remaining);
    const pct = _total > 0 ? (_remaining / _total) * 100 : 0;
    f.style.width = pct + '%';
  }

  function stop() {
    if (_interval) { clearInterval(_interval); _interval = null; }
    const b = bar();
    if (b) b.classList.add('hidden');
  }

  function start(seconds, inOverlay = false) {
    stop();
    _total = seconds;
    _remaining = seconds;
    _inOverlay = inOverlay;
    const b = bar();
    if (!b) return;
    b.classList.remove('hidden');
    if (inOverlay) b.classList.add('in-overlay');
    else b.classList.remove('in-overlay');
    update();
    _interval = setInterval(() => {
      _remaining--;
      update();
      if (_remaining <= 0) stop();
    }, 1000);
  }

  function skip() { stop(); }

  return { start, stop, skip, isRunning: () => !!_interval };
})();
