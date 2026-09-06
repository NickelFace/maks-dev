(function () {
  const root = document.querySelector('.rdm-page');
  if (!root) return;
  const storeKey = root.dataset.storeKey;
  if (!storeKey) return;

  const total = parseInt(root.dataset.total || '0', 10);
  const totalLabel = root.dataset.totalLabel || 'topics';
  const checkboxes = Array.from(root.querySelectorAll('.topic-cb'));
  const domains = {};
  checkboxes.forEach(cb => {
    const d = cb.dataset.domain;
    if (!d) return;
    if (!domains[d]) domains[d] = [];
    domains[d].push(cb.dataset.key);
  });

  const defaultChecked = root.dataset.defaultChecked === 'true';

  function load() {
    try {
      const raw = localStorage.getItem(storeKey);
      const stored = raw ? JSON.parse(raw) : {};
      if (defaultChecked) {
        let touched = false;
        checkboxes.forEach(cb => {
          const k = cb.dataset.key;
          if (!(k in stored)) { stored[k] = true; touched = true; }
        });
        if (touched) localStorage.setItem(storeKey, JSON.stringify(stored));
      }
      return stored;
    } catch (e) { return {}; }
  }
  function save(data) { localStorage.setItem(storeKey, JSON.stringify(data)); }

  function updateUI(data) {
    let grand = 0;
    Object.entries(domains).forEach(([dKey, keys]) => {
      const done = keys.filter(k => data[k]).length;
      grand += done;
      const pct = keys.length ? Math.round(done / keys.length * 100) : 0;
      const bar = document.getElementById(dKey + '-bar');
      const txt = document.getElementById(dKey + '-txt');
      const sp = document.getElementById(dKey + 'p');
      if (bar) bar.style.width = pct + '%';
      if (txt) txt.textContent = done + '/' + keys.length;
      if (sp) sp.textContent = done + '/' + keys.length;
    });
    const grandPct = total ? Math.round(grand / total * 100) : 0;
    const fill = document.getElementById('op-fill');
    const count = document.getElementById('op-count');
    if (fill) fill.style.width = grandPct + '%';
    if (count) count.textContent = grand + ' / ' + total + ' ' + totalLabel + ' · ' + grandPct + '%';
  }

  const data = load();
  checkboxes.forEach(cb => {
    const key = cb.dataset.key;
    cb.checked = !!data[key];
    const item = cb.closest('.topic-item');
    if (cb.checked && item) item.classList.add('done');
    cb.addEventListener('change', () => {
      const d = load();
      d[key] = cb.checked;
      save(d);
      const it = cb.closest('.topic-item');
      if (it) it.classList.toggle('done', cb.checked);
      updateUI(d);
    });
  });
  updateUI(data);
})();
