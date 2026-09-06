/* taxonomy.js — tag filter + article list for /tags/ page
   Reads POSTS[] and currentTag from inline script in tag.html */

let activeTag = currentTag;
let gridVisible = !currentTag;

function renderArticles() {
  const list = document.getElementById('tagArticles');
  const filtered = activeTag ? POSTS.filter(p => p.tags.includes(activeTag)) : POSTS;
  if (!filtered.length) {
    list.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:16px 0">No articles found.</div>';
    return;
  }
  list.innerHTML = filtered.map(p => {
    const tagHtml = p.tagLabels.slice(0, 2)
      .map(label => `<span class="tag">${label}</span>`)
      .join('');
    return `<a href="${p.url}" class="post-card">
      <div class="post-card-meta">
        <span class="post-date">${p.date}</span>${tagHtml}
      </div>
      <div class="post-card-title">${p.title}</div>
      ${p.summary ? `<div class="post-card-desc">${p.summary}</div>` : ''}
    </a>`;
  }).join('');
}

function buildTagGrid() {
  const counts = {};
  const labels = {};
  POSTS.forEach(p => {
    p.tags.forEach((slug, i) => {
      counts[slug] = (counts[slug] || 0) + 1;
      labels[slug] = p.tagLabels[i];
    });
  });
  const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const grid = document.getElementById('tagsGrid');
  grid.innerHTML =
    `<button class="tag tag-lg tag-filter" data-tag="">All <span class="count">${POSTS.length}</span></button>` +
    sorted.map(slug =>
      `<button class="tag tag-lg tag-filter" data-tag="${slug}">${labels[slug]} <span class="count">${counts[slug]}</span></button>`
    ).join('');
  document.querySelectorAll('.tag-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tag-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTag = btn.dataset.tag;
      gridVisible = false;
      renderArticles();
      updateUI();
    });
    if (btn.dataset.tag === activeTag) btn.classList.add('active');
  });
}

const tagCount = Object.keys((() => { const c = {}; POSTS.forEach(p => p.tags.forEach(t => c[t] = 1)); return c; })()).length;

function updateUI() {
  const grid   = document.getElementById('tagsGrid');
  const toggle = document.getElementById('tagsGridToggle');
  const pill   = document.getElementById('tagsBarPill');

  grid.style.display = gridVisible ? '' : 'none';
  toggle.textContent = gridVisible ? `▲ Hide tags` : `▼ Browse all tags (${tagCount})`;

  if (activeTag) {
    const btn   = document.querySelector(`.tag-filter[data-tag="${activeTag}"]`);
    const label = btn ? btn.firstChild.textContent.trim() : activeTag;
    const count = btn ? btn.querySelector('.count').textContent : '';
    pill.innerHTML = `${label} <span class="count">${count}</span><span class="pill-close">×</span>`;
    pill.style.display = 'inline-flex';
  } else {
    pill.style.display = 'none';
  }
}

document.getElementById('tagsGridToggle').addEventListener('click', () => {
  gridVisible = !gridVisible;
  updateUI();
});

document.getElementById('tagsBarPill').addEventListener('click', () => {
  activeTag = '';
  gridVisible = true;
  document.querySelectorAll('.tag-filter').forEach(b => b.classList.remove('active'));
  document.querySelector('.tag-filter[data-tag=""]').classList.add('active');
  renderArticles();
  updateUI();
});

buildTagGrid();
renderArticles();
updateUI();
