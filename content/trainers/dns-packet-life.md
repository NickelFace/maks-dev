---
title: "Life of a DNS Query"
date: 2026-09-06
description: "Step a single DNS lookup across a routed network: the ARP that has to happen first, the MAC addresses rewritten at every hop, the IP addresses that never change, and the caches that stop it happening twice. Eight questions at the end."
kind: "animation"
order: 4
topic: "4.3 · DNS"
---

{{< rawhtml >}}
<style>
  #dns-app { display:flex; flex-direction:column; border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; }

  #dns-topo { position:relative; background:var(--code-bg); border-bottom:1px solid var(--border); height:220px; flex-shrink:0; }
  svg#dns-net { width:100%; height:100%; display:block; }

  #info-panel { padding:14px 18px; background:var(--bg2); border-bottom:1px solid var(--border); min-height:90px; flex-shrink:0; }
  #step-label { font-size:11px; color:var(--text3); text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px; }
  #step-title { font-size:15px; font-weight:600; color:var(--accent); margin-bottom:6px; }
  #step-desc  { font-size:13px; color:var(--text2); line-height:1.5; }

  #pkt-panel { display:flex; gap:10px; padding:10px 18px; background:var(--bg2); border-bottom:1px solid var(--border); flex-wrap:wrap; flex-shrink:0; }
  .pkt-field { display:flex; flex-direction:column; gap:2px; }
  .pkt-label { font-size:10px; color:var(--text3); text-transform:uppercase; letter-spacing:.06em; }
  .pkt-value { font-size:12px; font-weight:500; font-family:var(--mono); padding:3px 7px; border-radius:4px; background:var(--bg3); color:var(--accent); border:1px solid var(--border); white-space:nowrap; }
  .pkt-value.changed { color:var(--warn); border-color:var(--warn); background:color-mix(in srgb, var(--warn) 12%, transparent); }
  .pkt-value.none { color:var(--text3); border-color:var(--border); background:transparent; }

  #dns-controls { display:flex; align-items:center; gap:10px; padding:10px 18px; background:var(--bg2); flex-shrink:0; }
  .btn { padding:7px 16px; border-radius:6px; border:1px solid transparent; cursor:pointer; font-size:13px; font-weight:500; font-family:inherit; }
  .btn-primary { background:var(--accent); color:var(--bg); border-color:var(--accent); }
  .btn-primary:disabled { opacity:.45; cursor:default; }
  .btn-secondary { background:var(--bg3); color:var(--text2); border:1px solid var(--border); }
  .btn-secondary:hover { border-color:var(--accent); color:var(--text); }
  #dns-progress { flex:1; height:4px; background:var(--bg3); border-radius:2px; overflow:hidden; }
  #dns-progress-fill { height:100%; background:var(--accent); border-radius:2px; transition:width .3s; }
  #step-counter { font-size:12px; color:var(--text3); white-space:nowrap; font-family:var(--mono); }

  #quiz-panel { display:none; flex-direction:column; gap:12px; padding:16px 18px; background:var(--bg2); }
  #quiz-panel.active { display:flex; }
  #quiz-title { font-size:14px; font-weight:600; color:var(--accent); }
  #quiz-q { font-size:13px; color:var(--text); line-height:1.5; }
  #quiz-opts { display:flex; flex-direction:column; gap:7px; }
  #quiz-opts .opt { padding:9px 12px; border-radius:6px; border:1px solid var(--border); background:var(--bg3); cursor:pointer; font-size:13px; color:var(--text2); transition:background .15s; }
  #quiz-opts .opt:hover { border-color:var(--accent); color:var(--text); }
  #quiz-opts .opt.correct { background:color-mix(in srgb, var(--accent2) 14%, transparent); border-color:var(--accent2); color:var(--accent2); }
  #quiz-opts .opt.wrong   { background:color-mix(in srgb, var(--danger) 14%, transparent); border-color:var(--danger); color:var(--danger); }
  #quiz-explain { font-size:13px; color:var(--text2); line-height:1.5; padding:10px 12px; background:var(--bg3); border-radius:6px; border-left:3px solid var(--accent); display:none; }
  #quiz-nav { display:flex; gap:10px; }
  #quiz-score { font-size:13px; color:var(--text3); font-family:var(--mono); }

  #dns-tabs { display:flex; border-bottom:1px solid var(--border); background:var(--bg2); flex-shrink:0; }
  .tab { padding:9px 18px; font-size:13px; cursor:pointer; color:var(--text3); border-bottom:2px solid transparent; }
  .tab:hover { color:var(--text2); }
  .tab.active { color:var(--accent); border-bottom-color:var(--accent); }
</style>

<div id="dns-app">
  <div id="dns-tabs">
    <div class="tab active" data-tab="anim">&#127916; Animation</div>
    <div class="tab" data-tab="quiz">&#129504; Self-test</div>
  </div>

  <div id="anim-tab">
    <div id="dns-topo">
      <svg id="dns-net" viewBox="0 0 740 220" xmlns="http://www.w3.org/2000/svg">
        <!-- wires at icon center y=75 -->
        <line x1="103" y1="75" x2="185" y2="75" stroke="#3b4a5f" stroke-width="2"/>
        <line x1="245" y1="75" x2="325" y2="75" stroke="#3b4a5f" stroke-width="2"/>
        <line x1="415" y1="75" x2="490" y2="75" stroke="#3b4a5f" stroke-width="2"/>
        <line x1="550" y1="75" x2="627" y2="75" stroke="#3b4a5f" stroke-width="2"/>

        <!-- HOST A — PC icon (x=55 center) -->
        <g id="icon-hosta">
          <rect x="30" y="48" width="50" height="36" rx="3" fill="#1e2a3d" stroke="#2d6a9f" stroke-width="1.5"/>
          <rect x="33" y="51" width="44" height="28" rx="2" fill="#0d1829"/>
          <rect x="51" y="84" width="8" height="7" fill="#1e2a3d"/>
          <rect x="43" y="91" width="24" height="3" rx="1" fill="#2d4a6a"/>
          <rect x="35" y="53" width="40" height="24" rx="1" fill="#0a1628" opacity=".8"/>
          <text x="55" y="68" text-anchor="middle" font-size="10" fill="#3b82f6" font-weight="bold">PC</text>
        </g>
        <text x="55" y="107" text-anchor="middle" font-size="11" fill="#7dd3fc" font-weight="600">Host A</text>
        <text x="55" y="119" text-anchor="middle" font-size="9" fill="#8b9bb0">10.10.10.10/24</text>
        <text x="55" y="130" text-anchor="middle" font-size="8" fill="#6b7c91" font-family="monospace">1111.2222.3333</text>

        <!-- SWITCH 1 (x=215 center) -->
        <g id="icon-sw1">
          <rect x="185" y="58" width="60" height="34" rx="4" fill="#1a2035" stroke="#4a5568" stroke-width="1.5"/>
          <rect x="193" y="63" width="6" height="8" rx="1" fill="#0d1421" stroke="#2d3f5a" stroke-width="1"/>
          <rect x="202" y="63" width="6" height="8" rx="1" fill="#0d1421" stroke="#2d3f5a" stroke-width="1"/>
          <rect x="211" y="63" width="6" height="8" rx="1" fill="#0d1421" stroke="#2d3f5a" stroke-width="1"/>
          <rect x="220" y="63" width="6" height="8" rx="1" fill="#0d1421" stroke="#2d3f5a" stroke-width="1"/>
          <rect x="229" y="63" width="6" height="8" rx="1" fill="#0d1421" stroke="#2d3f5a" stroke-width="1"/>
          <circle cx="196" cy="78" r="2" fill="#16a34a"/>
          <circle cx="205" cy="78" r="2" fill="#16a34a"/>
          <circle cx="214" cy="78" r="2" fill="#eab308"/>
          <circle cx="223" cy="78" r="2" fill="#16a34a"/>
          <circle cx="232" cy="78" r="2" fill="#4a5568"/>
        </g>
        <text x="215" y="107" text-anchor="middle" font-size="11" fill="#a8b6c6" font-weight="600">Switch 1</text>
        <text x="215" y="119" text-anchor="middle" font-size="9" fill="#8b9bb0">P1&larr;Host A  P2&larr;Router A</text>

        <!-- ROUTER A (x=370 center) -->
        <g id="icon-rtra">
          <ellipse cx="370" cy="58" rx="30" ry="8" fill="#2a1f0a" stroke="#b45309" stroke-width="1.5"/>
          <rect x="340" y="58" width="60" height="28" fill="#1e1a0a" stroke="#b45309" stroke-width="0"/>
          <line x1="340" y1="58" x2="340" y2="86" stroke="#b45309" stroke-width="1.5"/>
          <line x1="400" y1="58" x2="400" y2="86" stroke="#b45309" stroke-width="1.5"/>
          <ellipse cx="370" cy="86" rx="30" ry="8" fill="#2a1f0a" stroke="#b45309" stroke-width="1.5"/>
          <line x1="355" y1="72" x2="385" y2="72" stroke="#fbbf24" stroke-width="1.5" marker-end="url(#dnsArr)"/>
          <line x1="385" y1="78" x2="355" y2="78" stroke="#fbbf24" stroke-width="1.5" marker-end="url(#dnsArr2)"/>
          <defs>
            <marker id="dnsArr" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <polygon points="0,0 5,2.5 0,5" fill="#fbbf24"/>
            </marker>
            <marker id="dnsArr2" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <polygon points="0,0 5,2.5 0,5" fill="#fbbf24"/>
            </marker>
          </defs>
        </g>
        <text x="370" y="107" text-anchor="middle" font-size="11" fill="#fbbf24" font-weight="600">Router A</text>
        <text x="370" y="119" text-anchor="middle" font-size="9" fill="#8b9bb0">.10.1 &middot; 4444.5555.6666</text>
        <text x="370" y="130" text-anchor="middle" font-size="9" fill="#8b9bb0">.100.1 &middot; 8888.9999.AAAA</text>

        <!-- SWITCH 3 (x=520 center) -->
        <g id="icon-sw3">
          <rect x="490" y="58" width="60" height="34" rx="4" fill="#1a2035" stroke="#4a5568" stroke-width="1.5"/>
          <rect x="498" y="63" width="6" height="8" rx="1" fill="#0d1421" stroke="#2d3f5a" stroke-width="1"/>
          <rect x="507" y="63" width="6" height="8" rx="1" fill="#0d1421" stroke="#2d3f5a" stroke-width="1"/>
          <rect x="516" y="63" width="6" height="8" rx="1" fill="#0d1421" stroke="#2d3f5a" stroke-width="1"/>
          <rect x="525" y="63" width="6" height="8" rx="1" fill="#0d1421" stroke="#2d3f5a" stroke-width="1"/>
          <rect x="534" y="63" width="6" height="8" rx="1" fill="#0d1421" stroke="#2d3f5a" stroke-width="1"/>
          <circle cx="501" cy="78" r="2" fill="#16a34a"/>
          <circle cx="510" cy="78" r="2" fill="#eab308"/>
          <circle cx="519" cy="78" r="2" fill="#16a34a"/>
          <circle cx="528" cy="78" r="2" fill="#16a34a"/>
          <circle cx="537" cy="78" r="2" fill="#4a5568"/>
        </g>
        <text x="520" y="107" text-anchor="middle" font-size="11" fill="#a8b6c6" font-weight="600">Switch 3</text>
        <text x="520" y="119" text-anchor="middle" font-size="9" fill="#8b9bb0">P1&larr;Router A  P2&larr;DNS</text>

        <!-- DNS SERVER (x=667 center) -->
        <g id="icon-dns">
          <rect x="637" y="44" width="60" height="14" rx="3" fill="#0d1829" stroke="#2d6a9f" stroke-width="1.5"/>
          <circle cx="688" cy="51" r="3" fill="#16a34a"/>
          <rect x="641" y="47" width="30" height="4" rx="1" fill="#1e2a3d"/>
          <rect x="637" y="60" width="60" height="14" rx="3" fill="#0d1829" stroke="#2d6a9f" stroke-width="1.5"/>
          <circle cx="688" cy="67" r="3" fill="#16a34a"/>
          <rect x="641" y="63" width="22" height="4" rx="1" fill="#1e2a3d"/>
          <rect x="637" y="76" width="60" height="14" rx="3" fill="#0d1829" stroke="#2d6a9f" stroke-width="1.5"/>
          <circle cx="688" cy="83" r="3" fill="#eab308"/>
          <rect x="641" y="79" width="26" height="4" rx="1" fill="#1e2a3d"/>
        </g>
        <text x="667" y="107" text-anchor="middle" font-size="11" fill="#7dd3fc" font-weight="600">DNS Server</text>
        <text x="667" y="119" text-anchor="middle" font-size="9" fill="#8b9bb0">10.10.100.10</text>
        <text x="667" y="130" text-anchor="middle" font-size="8" fill="#6b7c91" font-family="monospace">3333.4444.5555</text>

        <!-- Subnet labels -->
        <text x="135" y="195" text-anchor="middle" font-size="10" fill="#4e6a8f">10.10.10.0/24</text>
        <text x="435" y="195" text-anchor="middle" font-size="10" fill="#4e6a8f">10.10.100.0/24</text>

        <circle id="pkt-dot" cx="-20" cy="75" r="8" fill="#ef4444" opacity="0" filter="url(#dnsGlow)"/>
        <circle id="pkt-dot2" cx="-20" cy="75" r="8" fill="#22c55e" opacity="0" filter="url(#dnsGlow)"/>
        <defs>
          <filter id="dnsGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
      </svg>
    </div>

    <div id="info-panel">
      <div id="step-label">Step 0 of 9</div>
      <div id="step-title">Press Next to start</div>
      <div id="step-desc">Host A wants to send an HTTP request to www.flackbox.com, but it does not know the IP address. DNS has to be resolved first.</div>
    </div>

    <div id="pkt-panel">
      <div class="pkt-field"><div class="pkt-label">Type</div><div class="pkt-value none" id="pf-type">&mdash;</div></div>
      <div class="pkt-field"><div class="pkt-label">Src MAC</div><div class="pkt-value none" id="pf-smac">&mdash;</div></div>
      <div class="pkt-field"><div class="pkt-label">Dst MAC</div><div class="pkt-value none" id="pf-dmac">&mdash;</div></div>
      <div class="pkt-field"><div class="pkt-label">Src IP</div><div class="pkt-value none" id="pf-sip">&mdash;</div></div>
      <div class="pkt-field"><div class="pkt-label">Dst IP</div><div class="pkt-value none" id="pf-dip">&mdash;</div></div>
      <div class="pkt-field"><div class="pkt-label">Port / proto</div><div class="pkt-value none" id="pf-proto">&mdash;</div></div>
    </div>

    <div id="dns-controls">
      <button class="btn btn-secondary" id="btn-restart">&#8634; Restart</button>
      <div id="dns-progress"><div id="dns-progress-fill" style="width:0%"></div></div>
      <span id="step-counter">0 / 9</span>
      <button class="btn btn-primary" id="btn-next">Next &rarr;</button>
    </div>
  </div>

  <div id="quiz-panel">
    <div id="quiz-score"></div>
    <div id="quiz-title"></div>
    <div id="quiz-q"></div>
    <div id="quiz-opts"></div>
    <div id="quiz-explain"></div>
    <div id="quiz-nav"></div>
  </div>
</div>

<script>
(function(){
const STEPS = [
  {
    title: "Host A holds on to the HTTP packet",
    desc: "The browser opens www.flackbox.com. Host A starts building the packet, but it does not know the destination IP address, so the packet is held. DNS has to be resolved first.",
    pkt: null, anim: null,
  },
  {
    title: "ARP broadcast: who has 10.10.10.1?",
    desc: "The DNS server (10.10.100.10) is on a different subnet, so the query goes via the default gateway. Host A does not know the gateway's MAC, so it sends an ARP broadcast to FF:FF:FF:FF:FF:FF.",
    pkt: { type:"ARP Request", smac:"1111.2222.3333", dmac:"FFFF.FFFF.FFFF", sip:"10.10.10.10", dip:"10.10.10.1", proto:"ARP" },
    anim: { dot: 'red', from: 55, to: 370, y: 75 }
  },
  {
    title: "ARP reply: Router A answers Host A",
    desc: "Router A sees the ARP is for its own address. It adds Host A to its ARP cache and sends a unicast ARP reply. Switch 1 has now learned both MACs and forwards it straight through.",
    pkt: { type:"ARP Reply", smac:"4444.5555.6666", dmac:"1111.2222.3333", sip:"10.10.10.1", dip:"10.10.10.10", proto:"ARP" },
    anim: { dot: 'green', from: 370, to: 55, y: 75 }
  },
  {
    title: "DNS request: Host A to the DNS server",
    desc: "Host A now knows the gateway's MAC and sends the DNS query (UDP/53). The destination MAC is the gateway, but the destination IP is the DNS server. Router A receives it and consults its routing table.",
    pkt: { type:"DNS Request", smac:"1111.2222.3333", dmac:"4444.5555.6666", sip:"10.10.10.10", dip:"10.10.100.10", proto:"UDP/53", changed: ['smac','dmac'] },
    anim: { dot: 'red', from: 55, to: 370, y: 75 }
  },
  {
    title: "ARP broadcast: Router A looks for the DNS server",
    desc: "Router A has a route to 10.10.100.0/24 out of its .100.1 interface, but it does not know the DNS server's MAC. It holds the DNS packet and sends an ARP broadcast.",
    pkt: { type:"ARP Request", smac:"8888.9999.AAAA", dmac:"FFFF.FFFF.FFFF", sip:"10.10.100.1", dip:"10.10.100.10", proto:"ARP" },
    anim: { dot: 'red', from: 370, to: 667, y: 75 }
  },
  {
    title: "ARP reply: the DNS server answers Router A",
    desc: "The DNS server sees the ARP is for itself. It adds Router A (10.10.100.1) to its ARP cache as the default gateway and sends a unicast ARP reply.",
    pkt: { type:"ARP Reply", smac:"3333.4444.5555", dmac:"8888.9999.AAAA", sip:"10.10.100.10", dip:"10.10.100.1", proto:"ARP" },
    anim: { dot: 'green', from: 667, to: 370, y: 75 }
  },
  {
    title: "The DNS request is forwarded to the server",
    desc: "Router A forwards the DNS query it was holding. The MACs change: src is Router A's .100.1 interface, dst is the DNS server. The IPs do NOT change: src is still 10.10.10.10, dst is still 10.10.100.10.",
    pkt: { type:"DNS Request", smac:"8888.9999.AAAA", dmac:"3333.4444.5555", sip:"10.10.10.10", dip:"10.10.100.10", proto:"UDP/53", changed:['smac','dmac'] },
    anim: { dot: 'red', from: 370, to: 667, y: 75 }
  },
  {
    title: "DNS reply: www.flackbox.com = 10.10.12.10",
    desc: "The DNS server finds the A record and sends the answer to 10.10.10.10, the source IP of the query, via its own default gateway (Router A). The MACs are set for this hop.",
    pkt: { type:"DNS Reply", smac:"3333.4444.5555", dmac:"8888.9999.AAAA", sip:"10.10.100.10", dip:"10.10.10.10", proto:"UDP/53" },
    anim: { dot: 'green', from: 667, to: 370, y: 75 }
  },
  {
    title: "The DNS reply reaches Host A",
    desc: "Router A forwards the reply to Host A. The MACs change again: src is Router A's .10.1 interface, dst is Host A. The IPs still do not change. Host A now knows that www.flackbox.com = 10.10.12.10.",
    pkt: { type:"DNS Reply", smac:"4444.5555.6666", dmac:"1111.2222.3333", sip:"10.10.100.10", dip:"10.10.10.10", proto:"UDP/53", changed:['smac','dmac'] },
    anim: { dot: 'green', from: 370, to: 55, y: 75 }
  },
];

let currentStep = -1;
const dot  = document.getElementById('pkt-dot');
const dot2 = document.getElementById('pkt-dot2');
const START_TITLE = 'Press Next to start';
const START_DESC  = 'Host A wants to send an HTTP request to www.flackbox.com, but it does not know the IP address. DNS has to be resolved first.';

function updatePktPanel(pkt) {
  const ids  = ['pf-type','pf-smac','pf-dmac','pf-sip','pf-dip','pf-proto'];
  const keys = ['type','smac','dmac','sip','dip','proto'];
  const changed = pkt && pkt.changed ? pkt.changed : [];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    const val = pkt ? (pkt[keys[i]] || '—') : '—';
    el.textContent = val;
    el.className = 'pkt-value';
    if (!pkt || val === '—') el.classList.add('none');
    else if (changed.includes(keys[i])) el.classList.add('changed');
  });
}

function animatePacket(step) {
  if (!step.anim) return Promise.resolve();
  return new Promise(resolve => {
    const { from, to, y, dot: color } = step.anim;
    const activeDot = color === 'red' ? dot : dot2;
    activeDot.setAttribute('cx', from);
    activeDot.setAttribute('cy', y);
    activeDot.setAttribute('opacity', '1');
    activeDot.setAttribute('fill', color === 'red' ? '#ef4444' : '#22c55e');
    const dur = 900;
    const start = performance.now();
    function frame(now) {
      const t = Math.min((now - start) / dur, 1);
      const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      activeDot.setAttribute('cx', from + (to - from) * ease);
      if (t < 1) requestAnimationFrame(frame);
      else { activeDot.setAttribute('opacity', '0'); resolve(); }
    }
    requestAnimationFrame(frame);
  });
}

function nextStep() {
  currentStep++;
  if (currentStep >= STEPS.length) { currentStep = STEPS.length - 1; return; }
  const step = STEPS[currentStep];
  document.getElementById('step-label').textContent = `Step ${currentStep + 1} of ${STEPS.length}`;
  document.getElementById('step-title').textContent = step.title;
  document.getElementById('step-desc').textContent = step.desc;
  document.getElementById('dns-progress-fill').style.width = ((currentStep + 1) / STEPS.length * 100) + '%';
  document.getElementById('step-counter').textContent = `${currentStep + 1} / ${STEPS.length}`;
  const btn = document.getElementById('btn-next');
  btn.disabled = true;
  animatePacket(step).then(() => {
    updatePktPanel(step.pkt);
    btn.disabled = false;
    if (currentStep === STEPS.length - 1) { btn.textContent = 'Done ✓'; btn.disabled = true; }
  });
}

function restart() {
  currentStep = -1;
  document.getElementById('step-label').textContent = `Step 0 of ${STEPS.length}`;
  document.getElementById('step-title').textContent = START_TITLE;
  document.getElementById('step-desc').textContent = START_DESC;
  document.getElementById('dns-progress-fill').style.width = '0%';
  document.getElementById('step-counter').textContent = `0 / ${STEPS.length}`;
  document.getElementById('btn-next').innerHTML = 'Next →';
  document.getElementById('btn-next').disabled = false;
  updatePktPanel(null);
  dot.setAttribute('opacity', '0');
  dot2.setAttribute('opacity', '0');
}

// QUIZ
const QUESTIONS = [
  {
    q: "Host A sends an ARP request. What is the destination MAC in that frame?",
    opts: ["4444.5555.6666 (Router A)", "FFFF.FFFF.FFFF (broadcast)", "1111.2222.3333 (Host A)", "3333.4444.5555 (DNS server)"],
    answer: 1,
    explain: "An ARP request is an L2 broadcast, so the destination MAC is always FFFF.FFFF.FFFF. Host A does not know the gateway's MAC — that is the whole reason it is sending ARP."
  },
  {
    q: "Switch 1 receives the ARP request from Host A. What does it do next?",
    opts: ["Forward it only to the Router A port", "Drop it, because it does not know the MAC", "Learn Host A's MAC into its table and flood the frame out of every port except the one it arrived on", "Answer the ARP request itself"],
    answer: 2,
    explain: "A switch learns the source MAC of every incoming frame into its MAC address table. A broadcast is always flooded out of every port except the ingress port — standard switch behaviour."
  },
  {
    q: "The DNS query goes from Host A (10.10.10.10) to the DNS server (10.10.100.10) via Router A. What is the source IP once the packet is on the Router A to DNS server segment?",
    opts: ["10.10.100.1 (Router A, .100.1 interface)", "10.10.10.1 (Router A, .10.1 interface)", "10.10.10.10 (Host A — unchanged)", "10.10.100.10 (DNS server)"],
    answer: 2,
    explain: "IP addresses do NOT change end to end. The source IP stays 10.10.10.10 (Host A) and the destination stays 10.10.100.10 (DNS). Only the source and destination MACs are rewritten at each hop."
  },
  {
    q: "Router A has received the DNS request. What does it consult to decide where to forward the packet?",
    opts: ["The MAC address table", "The routing table", "The ARP cache entry for 10.10.10.10", "The NAT table"],
    answer: 1,
    explain: "A router works at L3. When a packet arrives it looks in the routing table to work out which interface to send it out of and what the next hop is."
  },
  {
    q: "Why does Router A send an ARP request when it forwards the DNS query to the DNS server?",
    opts: ["Because it does not know the DNS server's IP address", "Because it does not know the DNS server's MAC address", "Because it needs to update its routing table", "Because ARP is required for every packet"],
    answer: 1,
    explain: "Router A knows the IP (from the DNS request) and the route (from the routing table), but not the MAC — and it needs one to build the L2 header on this segment. Resolving IP to MAC is exactly what ARP is for."
  },
  {
    q: "The DNS server sends its reply. Which IP address does it send it to?",
    opts: ["10.10.10.1 (default gateway)", "10.10.100.1 (Router A)", "10.10.10.10 (Host A)", "A broadcast address"],
    answer: 2,
    explain: "The source IP of the DNS request was 10.10.10.10 (Host A), so that is where the reply goes. The destination MAC will be Router A's, because it is the default gateway, but the destination IP is Host A."
  },
  {
    q: "The DNS reply travels from Router A to Host A. What is the source MAC in that frame?",
    opts: ["3333.4444.5555 (DNS server)", "8888.9999.AAAA (Router A, .100.1 interface)", "4444.5555.6666 (Router A, .10.1 interface)", "1111.2222.3333 (Host A)"],
    answer: 2,
    explain: "MACs change hop by hop. On the Router A to Host A segment the source MAC is the MAC of Router A's interface in 10.10.10.0/24, which is 4444.5555.6666. The .100.1 interface (8888.9999.AAAA) was used on the previous segment."
  },
  {
    q: "Router A does not send a second ARP request when it forwards the DNS reply to Host A. Why not?",
    opts: ["The switch remembered it, so no ARP is needed", "Host A's MAC is already in Router A's ARP cache from the first exchange", "ARP is not used for reply packets", "Host A included its own MAC in the DNS request"],
    answer: 1,
    explain: "When the first ARP request arrived from Host A, Router A cached 10.10.10.10 to 1111.2222.3333. That entry is still valid, so it is used without a new ARP."
  },
];

let qIdx = 0, score = 0, answered = false;

function loadQ() {
  answered = false;
  const q = QUESTIONS[qIdx];
  document.getElementById('quiz-title').textContent = `Question ${qIdx+1} of ${QUESTIONS.length}`;
  document.getElementById('quiz-score').textContent = `Correct: ${score} / ${qIdx}`;
  document.getElementById('quiz-q').textContent = q.q;
  document.getElementById('quiz-explain').style.display = 'none';
  document.getElementById('quiz-nav').innerHTML = '';
  const opts = document.getElementById('quiz-opts');
  opts.innerHTML = '';
  q.opts.forEach((o, i) => {
    const el = document.createElement('div');
    el.className = 'opt';
    el.textContent = o;
    el.onclick = () => checkAnswer(i, q.answer, q.explain);
    opts.appendChild(el);
  });
}

function checkAnswer(chosen, correct, explain) {
  if (answered) return;
  answered = true;
  const opts = document.getElementById('quiz-opts').children;
  opts[chosen].classList.add(chosen === correct ? 'correct' : 'wrong');
  if (chosen !== correct) opts[correct].classList.add('correct');
  if (chosen === correct) score++;
  document.getElementById('quiz-explain').textContent = explain;
  document.getElementById('quiz-explain').style.display = 'block';
  const nav = document.getElementById('quiz-nav');
  nav.innerHTML = '';
  if (qIdx < QUESTIONS.length - 1) {
    const nb = document.createElement('button');
    nb.className = 'btn btn-primary';
    nb.innerHTML = 'Next →';
    nb.onclick = nextQ;
    nav.appendChild(nb);
  } else {
    document.getElementById('quiz-score').textContent = `Final: ${score} / ${QUESTIONS.length}`;
    const fin = document.createElement('button');
    fin.className = 'btn btn-secondary';
    fin.innerHTML = '↺ Restart';
    fin.onclick = () => { qIdx = 0; score = 0; loadQ(); };
    nav.appendChild(fin);
  }
}

function nextQ() {
  qIdx++;
  loadQ();
}

function showTab(tab) {
  document.querySelectorAll('#dns-tabs .tab').forEach(t => t.classList.remove('active'));
  if (tab === 'anim') {
    document.getElementById('anim-tab').style.display = 'block';
    document.getElementById('quiz-panel').classList.remove('active');
    document.querySelectorAll('#dns-tabs .tab')[0].classList.add('active');
  } else {
    document.getElementById('anim-tab').style.display = 'none';
    document.getElementById('quiz-panel').classList.add('active');
    document.querySelectorAll('#dns-tabs .tab')[1].classList.add('active');
    if (qIdx === 0 && !answered) loadQ();
  }
}

document.querySelectorAll('#dns-tabs .tab').forEach(t => {
  t.addEventListener('click', () => showTab(t.dataset.tab));
});
document.getElementById('btn-next').addEventListener('click', nextStep);
document.getElementById('btn-restart').addEventListener('click', restart);

restart();
})();
</script>
{{< /rawhtml >}}
