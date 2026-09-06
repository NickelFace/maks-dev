---
title: "802.11 Standards"
date: 2026-09-06
description: "Six 802.11 standards on one timeline: bands, headline rate, channel widths and MIMO. Click a card for the detail and a memory hook, then check yourself against the comparison table and a five-question quiz."
kind: "tool"
order: 2
topic: "1.7 · Wireless"
keys: "<kbd>Enter</kbd> start the quiz &middot; <kbd>&rarr;</kbd> next question"
---

{{< rawhtml >}}
<style>
  /* Per-standard and per-band colours. Mid-tones for dark, darkened for light,
     so a card name stays readable whichever theme the reader is in. */
  .trainer-page{
    --std-a:#a78bfa; --std-b:#22b8cf; --std-g:#22b8cf;
    --std-n:#34d399; --std-ac:#fbbf24; --std-ax:#f87171;
    --band-24:#38bdf8; --band-5:#a78bfa; --band-6:#34d399;
  }
  [data-theme="light"] .trainer-page{
    --std-a:#6d28d9; --std-b:#0e7490; --std-g:#0e7490;
    --std-n:#047857; --std-ac:#b45309; --std-ax:#b91c1c;
    --band-24:#0369a1; --band-5:#6d28d9; --band-6:#047857;
  }

  .freq-legend { display:flex; gap:16px; margin-bottom:20px; flex-wrap:wrap; }
  .freq-dot { display:flex; align-items:center; gap:6px; font-size:13px; color:var(--muted); }
  .freq-dot .dot { width:11px; height:11px; border-radius:50%; flex-shrink:0; }

  /* Timeline */
  .timeline { position:relative; height:4px; background:var(--surface-2); border-radius:2px; margin-bottom:44px; }
  .tl-dot { position:absolute; top:-4px; width:12px; height:12px; border-radius:50%; cursor:pointer; transform:translateX(-50%); transition:box-shadow .2s; }
  .tl-label { position:absolute; top:12px; font-size:10px; color:var(--faint); transform:translateX(-50%); }

  /* Cards */
  .cards { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px; }
  @media(max-width:580px){ .cards { grid-template-columns:1fr 1fr; } }
  .std-card {
    background:var(--surface); border:1px solid var(--border); border-radius:12px;
    padding:13px; cursor:pointer; transition:border-color .2s, box-shadow .2s;
  }
  .std-card:hover { border-color:var(--muted); }
  .std-card.active { border-color:var(--card-color); box-shadow:0 0 18px var(--card-glow); }
  .card-head { display:flex; justify-content:space-between; align-items:flex-start; }
  .card-name { font-size:13px; font-weight:700; font-family:var(--mono); }
  .card-wifi { font-size:10px; color:var(--faint); margin-top:2px; }
  .card-year { font-size:10px; color:var(--faint); }
  .freq-badges { display:flex; gap:4px; margin:8px 0; flex-wrap:wrap; }
  .freq-badge {
    font-size:10px; padding:2px 6px; border-radius:4px; font-family:var(--mono);
    border:1px solid var(--badge-border); background:var(--badge-bg); color:var(--badge-color);
  }
  .card-speed { font-size:19px; font-weight:800; color:var(--text); }
  .card-detail { margin-top:10px; border-top:1px solid var(--border); padding-top:10px; display:none; }
  .std-card.active .card-detail { display:block; }
  .detail-key { font-size:12px; color:var(--muted); margin-bottom:6px; line-height:1.45; }
  .detail-hint {
    font-size:11px; padding:6px 9px; border-radius:6px;
    border-left:2px solid var(--card-color); background:var(--card-glow);
    color:var(--card-color); font-family:var(--mono); line-height:1.45;
  }
  .detail-ch { font-size:10px; color:var(--faint); margin-top:6px; }

  /* Table */
  .ref-table-wrap { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; margin-bottom:20px; }
  .ref-table-head { padding:8px 14px; border-bottom:1px solid var(--border); font-size:11px; color:var(--faint); text-transform:uppercase; letter-spacing:.1em; }
  .trainer-page table.ref { width:100%; border-collapse:collapse; font-size:12px; font-family:var(--mono); }
  .trainer-page table.ref th { padding:7px 12px; text-align:left; color:var(--faint); font-weight:600; font-size:11px; border-bottom:0; text-transform:none; letter-spacing:0; }
  .trainer-page table.ref td { padding:6px 12px; border-top:1px solid var(--border); border-bottom:0; }
  .trainer-page table.ref .yes { color:var(--ok); }
  .trainer-page table.ref .no { color:var(--border2); }
  .trainer-page table.ref .std-name { font-weight:700; }

  /* Quiz */
  .quiz-wrap { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:18px; }
  .quiz-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
  .quiz-label { font-size:11px; color:var(--faint); text-transform:uppercase; letter-spacing:.1em; }
  .quiz-score { font-size:13px; color:var(--ok); font-family:var(--mono); }
  .quiz-q { font-size:13px; color:var(--text); margin-bottom:12px; line-height:1.5; }
  .quiz-q .qnum { color:var(--faint); }
  .quiz-opts { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .trainer-page .opt-btn {
    background:var(--surface-2); border:1px solid var(--border); color:var(--muted);
    height:auto; padding:8px 11px; border-radius:8px; cursor:pointer; font-size:12px;
    font-family:var(--mono); text-align:left; display:block; transition:all .15s;
  }
  .trainer-page .opt-btn:hover:not([disabled]) { border-color:var(--muted); color:var(--text); }
  .trainer-page .opt-btn.correct { background:color-mix(in srgb, var(--ok) 12%, transparent); border-color:var(--ok); color:var(--ok); }
  .trainer-page .opt-btn.wrong   { background:color-mix(in srgb, var(--bad) 12%, transparent); border-color:var(--bad); color:var(--bad); }
  .trainer-page .opt-btn[disabled] { cursor:default; }
  .trainer-page .quiz-next {
    margin-top:11px; background:transparent; border:1px solid var(--accent); color:var(--accent);
    padding:7px 15px; border-radius:8px; cursor:pointer; font-size:12px; font-family:var(--mono);
    transition:background .15s;
  }
  .trainer-page .quiz-next:hover { background:var(--glow); }
  .trainer-page .quiz-start {
    background:var(--surface-2); border:1px solid var(--border); color:var(--accent);
    padding:9px 20px; border-radius:8px; cursor:pointer; font-size:13px; font-family:var(--mono);
    transition:border-color .15s;
  }
  .trainer-page .quiz-start:hover { border-color:var(--accent); }
</style>

<!-- Freq legend -->
<div class="freq-legend" id="freqLegend"></div>

<!-- Timeline -->
<div class="timeline" id="timeline"></div>

<!-- Cards -->
<div class="cards" id="cards"></div>

<!-- Quick ref table -->
<div class="ref-table-wrap">
  <div class="ref-table-head">Quick comparison</div>
  <table class="ref" id="refTable">
    <thead>
      <tr>
        <th>Standard</th><th>Wi-Fi</th>
        <th>2.4</th><th>5</th><th>6</th>
        <th>Speed</th><th>MIMO</th>
      </tr>
    </thead>
    <tbody id="refBody"></tbody>
  </table>
</div>

<!-- Quiz -->
<div class="quiz-wrap">
  <div class="quiz-header">
    <div class="quiz-label">Mini quiz</div>
    <div class="quiz-score" id="quizScore">Score: 0/5</div>
  </div>
  <div id="quizBody">
    <button class="quiz-start" id="startBtn">Test yourself &rarr;</button>
  </div>
</div>

<script>
(function(){
const STANDARDS = [
  { id:"a",  name:"802.11a",  wifi:null,        year:1999, freq:["5"],          speed:"54 Mbps",   channels:"20 MHz",          mimo:"—",       key:"First standard on 5 GHz, but too expensive to catch on.",  hint:"A = Alone on 5 GHz",                     color:"var(--std-a)"  },
  { id:"b",  name:"802.11b",  wifi:null,        year:1999, freq:["2.4"],        speed:"11 Mbps",   channels:"20 MHz",          mimo:"—",       key:"The first mass-market Wi-Fi. Slow, but everywhere.",       hint:"B = Basic, the slow baseline",           color:"var(--std-b)"  },
  { id:"g",  name:"802.11g",  wifi:null,        year:2003, freq:["2.4"],        speed:"54 Mbps",   channels:"20 MHz",          mimo:"—",       key:"The speed of 'a', on the popular 2.4 GHz band.",           hint:"G = Good upgrade over b",                color:"var(--std-g)"  },
  { id:"n",  name:"802.11n",  wifi:"Wi-Fi 4",   year:2009, freq:["2.4","5"],    speed:"600 Mbps",  channels:"20/40 MHz",       mimo:"MIMO",    key:"First dual-band standard, and where MIMO arrives.",        hint:"N = aNy band (both of them)",            color:"var(--std-n)"  },
  { id:"ac", name:"802.11ac", wifi:"Wi-Fi 5",   year:2013, freq:["5"],          speed:"3.5 Gbps",  channels:"20/40/80/160 MHz",mimo:"MU-MIMO", key:"5 GHz only. MU-MIMO. Wide channels.",                      hint:"AC = 'a' Continued: 5 GHz only again, just far wider", color:"var(--std-ac)" },
  { id:"ax", name:"802.11ax", wifi:"Wi-Fi 6/6E",year:2019, freq:["2.4","5","6"],speed:"9.6 Gbps",  channels:"20/40/80/160 MHz",mimo:"MU-MIMO+",key:"OFDMA + BSS colouring + improved MU-MIMO.",                hint:"AX = All eXtended (all three bands)",    color:"var(--std-ax)" },
];

const FREQ_COLORS = { "2.4":"var(--band-24)", "5":"var(--band-5)", "6":"var(--band-6)" };
const tint = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

const QUIZ = [
  { q:"Which standard was the first to support both bands (dual-band)?", correct:"n",       opts:["a","g","n","ac"] },
  { q:"Which standards run ONLY on 5 GHz?",                              correct:"a+ac",    opts:["a+ac","b+g","n+ax","ac+ax"] },
  { q:"Which standard introduced OFDMA?",                                correct:"ax",      opts:["n","ac","ax","a"] },
  { q:"802.11g — what is the maximum data rate?",                        correct:"54 Mbps", opts:["11 Mbps","54 Mbps","600 Mbps","3.5 Gbps"] },
  { q:"Wi-Fi 5 is which standard?",                                      correct:"ac",      opts:["n","ac","ax","g"] },
];

// ── Freq legend ──────────────────────────────────────────────
const freqLegend = document.getElementById("freqLegend");
["2.4","5","6"].forEach(f => {
  freqLegend.insertAdjacentHTML("beforeend",
    `<div class="freq-dot"><div class="dot" style="background:${FREQ_COLORS[f]}"></div>${f} GHz</div>`);
});

// ── Timeline ─────────────────────────────────────────────────
const tl = document.getElementById("timeline");
const YEARS = [1999,2003,2009,2013,2019];
const MIN_Y = 1999, MAX_Y = 2019;
STANDARDS.forEach(s => {
  const pct = ((s.year - MIN_Y) / (MAX_Y - MIN_Y)) * 100;
  const d = document.createElement("div");
  d.className = "tl-dot";
  d.style.cssText = `left:${pct}%;background:${s.color};`;
  d.title = s.name;
  d.addEventListener("click", () => toggleCard(s.id));
  tl.appendChild(d);
});
YEARS.forEach(y => {
  const pct = ((y - MIN_Y) / (MAX_Y - MIN_Y)) * 100;
  tl.insertAdjacentHTML("beforeend",
    `<div class="tl-label" style="left:${pct}%">${y}</div>`);
});

// ── Cards ─────────────────────────────────────────────────────
const cardsEl = document.getElementById("cards");
let activeId = null;

function renderCard(s) {
  const el = document.createElement("div");
  el.className = "std-card";
  el.id = "card-" + s.id;
  el.style.setProperty("--card-color", s.color);
  el.style.setProperty("--card-glow", tint(s.color, 14));

  const badges = s.freq.map(f =>
    `<span class="freq-badge" style="--badge-bg:${tint(FREQ_COLORS[f],14)};--badge-color:${FREQ_COLORS[f]};--badge-border:${tint(FREQ_COLORS[f],45)}">${f} GHz</span>`
  ).join("");

  el.innerHTML = `
    <div class="card-head">
      <div>
        <div class="card-name" style="color:${s.color}">${s.name}</div>
        ${s.wifi ? `<div class="card-wifi">${s.wifi}</div>` : ""}
      </div>
      <div class="card-year">${s.year}</div>
    </div>
    <div class="freq-badges">${badges}</div>
    <div class="card-speed">${s.speed}</div>
    <div class="card-detail">
      <div class="detail-key">${s.key}</div>
      <div class="detail-hint">💡 ${s.hint}</div>
      <div class="detail-ch">Channels: ${s.channels}</div>
    </div>`;

  el.addEventListener("click", () => toggleCard(s.id));
  cardsEl.appendChild(el);
}

function toggleCard(id) {
  if (activeId && activeId !== id) {
    document.getElementById("card-" + activeId)?.classList.remove("active");
  }
  const el = document.getElementById("card-" + id);
  if (!el) return;
  const isNowActive = el.classList.toggle("active");
  activeId = isNowActive ? id : null;

  // sync timeline dot glow
  document.querySelectorAll(".tl-dot").forEach((d, i) => {
    const s = STANDARDS[i];
    d.style.boxShadow = (isNowActive && s.id === id) ? `0 0 10px ${s.color}` : "none";
  });
}

STANDARDS.forEach(renderCard);

// ── Ref table ─────────────────────────────────────────────────
const refBody = document.getElementById("refBody");
STANDARDS.forEach(s => {
  const yes = `<span class="yes">✓</span>`, no = `<span class="no">✗</span>`;
  refBody.insertAdjacentHTML("beforeend", `
    <tr>
      <td class="std-name" style="color:${s.color}">${s.name}</td>
      <td style="color:var(--faint)">${s.wifi || "—"}</td>
      <td>${s.freq.includes("2.4") ? yes : no}</td>
      <td>${s.freq.includes("5")   ? yes : no}</td>
      <td>${s.freq.includes("6")   ? yes : no}</td>
      <td>${s.speed}</td>
      <td style="color:var(--muted)">${s.mimo}</td>
    </tr>`);
});

// ── Quiz ──────────────────────────────────────────────────────
let quizIdx = 0, score = 0, answered = false, quizActive = false;

document.getElementById("startBtn").addEventListener("click", startQuiz);

function startQuiz() {
  quizIdx = 0; score = 0; answered = false; quizActive = true;
  updateScore();
  renderQuestion();
}

function updateScore() {
  document.getElementById("quizScore").textContent = `Score: ${score}/${QUIZ.length}`;
}

function renderQuestion() {
  answered = false;
  const q = QUIZ[quizIdx];
  const body = document.getElementById("quizBody");
  const optsHtml = q.opts.map(opt =>
    `<button class="opt-btn" data-opt="${opt}">${opt}</button>`
  ).join("");

  body.innerHTML = `
    <div class="quiz-q"><span class="qnum">Q${quizIdx+1}/${QUIZ.length}: </span>${q.q}</div>
    <div class="quiz-opts">${optsHtml}</div>
    <div id="quizNext"></div>`;

  body.querySelectorAll(".opt-btn").forEach(btn => {
    btn.addEventListener("click", () => pickAnswer(btn, q));
  });
}

function pickAnswer(btn, q) {
  if (answered) return;
  answered = true;
  const chosen = btn.dataset.opt;
  if (chosen === q.correct) { btn.classList.add("correct"); score++; }
  else {
    btn.classList.add("wrong");
    document.querySelector(`#quizBody [data-opt="${q.correct}"]`)?.classList.add("correct");
  }
  document.querySelectorAll("#quizBody .opt-btn").forEach(b => b.disabled = true);
  updateScore();

  const nextLabel = (quizIdx + 1 < QUIZ.length) ? "Next question →" : "Start over ↺";
  document.getElementById("quizNext").innerHTML =
    `<button class="quiz-next" id="nextBtn">${nextLabel}</button>`;
  document.getElementById("nextBtn").addEventListener("click", () => {
    if (quizIdx + 1 < QUIZ.length) { quizIdx++; renderQuestion(); }
    else startQuiz();
  });
}

// Hotkeys
document.addEventListener("keydown", e => {
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
  if (e.key === "Enter" && !quizActive) { startQuiz(); return; }
  if (e.key === "ArrowRight" && answered) {
    document.getElementById("nextBtn")?.click();
  }
});
})();
</script>
{{< /rawhtml >}}
