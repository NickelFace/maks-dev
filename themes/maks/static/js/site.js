/**
 * site.js — global scripts for maks.top
 * Handles: theme toggle, language toggle, mobile menu
 * Loaded on every page via baseof.html
 */

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const icon = isDark ? '☀️' : '🌙';
  document.querySelectorAll('#themeBtn,#themeBtnMob').forEach(b => b.textContent = icon);
}

function setLang(lang, btn) {
  localStorage.setItem('lang', lang);
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.lang-btn').forEach(b => {
    if (b.textContent.trim() === lang.toUpperCase()) b.classList.add('active');
  });
}

function toggleMobMenu() {
  const d = document.getElementById('mobDrawer');
  const o = document.getElementById('mobOverlay');
  const b = document.getElementById('burgerBtn');
  const open = d.classList.toggle('open');
  o.classList.toggle('open', open);
  b.classList.toggle('open', open);
}

function closeMobMenu() {
  document.getElementById('mobDrawer').classList.remove('open');
  document.getElementById('mobOverlay').classList.remove('open');
  document.getElementById('burgerBtn').classList.remove('open');
}

// ── Restore theme + lang from localStorage on page load ──────────
(function () {
  const t = localStorage.getItem('theme');
  if (t === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    document.querySelectorAll('#themeBtn,#themeBtnMob').forEach(b => b.textContent = '☀️');
  }
  const lang = localStorage.getItem('lang') || 'en';
  if (lang === 'ru') {
    document.querySelectorAll('.lang-btn').forEach(b => {
      if (b.textContent.trim() === 'RU') b.classList.add('active');
      else b.classList.remove('active');
    });
  }
})();