---
title: "OSPF Adjacency and Convergence"
date: 2026-09-06
description: "Walk two routers from Down to Full one state at a time, with the reference tables for multicast addresses, timers and administrative distance beside it, then a fifteen-question self-test on the same material."
kind: "animation"
order: 3
topic: "3.4 · OSPF"
keys: "<kbd>1</kbd>&ndash;<kbd>4</kbd> pick &middot; <kbd>Enter</kbd> confirm &middot; <kbd>&rarr;</kbd> next &middot; <kbd>Space</kbd> skip"
---

{{< rawhtml >}}
<style>
  .trainer-page{
    --o-cyan:#22d3ee; --o-green:#22c55e; --o-amber:#f59e0b;
    --o-red:#ef4444;  --o-purple:#a78bfa;
  }
  [data-theme="light"] .trainer-page{
    --o-cyan:#0e7490; --o-green:#15803d; --o-amber:#b45309;
    --o-red:#b91c1c;  --o-purple:#6d28d9;
  }

  .trainer-page h2{font-size:20px;margin:36px 0 14px;padding-bottom:8px;border-bottom:1px solid var(--border)}
  .trainer-page .sub{color:var(--text2);margin:0 0 8px;font-size:13.5px}
  .trainer-page code{font-family:var(--mono);background:var(--bg3);padding:2px 6px;border-radius:5px;color:var(--o-cyan);font-size:.9em}
  .trainer-page button:disabled{opacity:.4;cursor:not-allowed}

  /* reference cards */
  .trainer-page .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
  .trainer-page .card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px}
  .trainer-page .card h3{margin:0 0 10px;font-size:15px;display:flex;align-items:center;gap:8px}
  .trainer-page .dot{width:10px;height:10px;border-radius:50%;display:inline-block}
  .trainer-page td b{color:var(--o-cyan);font-family:var(--mono);font-weight:600}
  .trainer-page .pill{font-family:var(--mono);font-size:12px;padding:1px 7px;border-radius:6px;background:var(--bg3)}

  /* animation */
  .trainer-page .stage{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:22px;margin-top:6px}
  .trainer-page .topo{position:relative;height:150px;margin:10px 0 6px}
  .trainer-page .router{position:absolute;top:38px;width:120px;height:74px;background:var(--bg3);
    border:2px solid var(--accent);border-radius:12px;display:flex;flex-direction:column;
    align-items:center;justify-content:center;font-weight:700;transition:border-color .3s,box-shadow .3s}
  .trainer-page .router .rid{font-size:11px;color:var(--text2);font-weight:500;font-family:var(--mono)}
  .trainer-page #r1{left:0}
  .trainer-page #r2{right:0}
  .trainer-page .router.full{border-color:var(--o-green);box-shadow:0 0 18px color-mix(in srgb,var(--o-green) 35%,transparent)}
  .trainer-page .router.active{box-shadow:0 0 16px color-mix(in srgb,var(--accent) 45%,transparent)}
  .trainer-page .link{position:absolute;top:74px;left:128px;right:128px;height:3px;background:var(--border2);border-radius:2px}
  .trainer-page .pkt{position:absolute;top:62px;left:128px;padding:4px 11px;border-radius:8px;font-size:12px;
    font-weight:700;color:#08111c;white-space:nowrap;opacity:0;transform:translateX(0);
    box-shadow:0 4px 14px rgba(0,0,0,.4)}
  .trainer-page .statebar{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 4px;justify-content:center}
  .trainer-page .st{font-size:12px;font-family:var(--mono);padding:5px 11px;border-radius:8px;border:1px solid var(--border);
    background:var(--bg3);color:var(--text2);transition:all .3s}
  .trainer-page .st.on{background:var(--accent);color:var(--bg);border-color:var(--accent);font-weight:700}
  .trainer-page .st.done{background:color-mix(in srgb,var(--o-green) 15%,transparent);color:var(--o-green);border-color:color-mix(in srgb,var(--o-green) 40%,transparent)}
  .trainer-page .log{min-height:48px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;
    padding:12px 14px;margin-top:14px;font-size:14px}
  .trainer-page .log b{color:var(--o-cyan)}
  .trainer-page .controls{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}

  /* packet legend */
  .trainer-page .pkts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:8px}
  .trainer-page .pk{border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--bg2)}
  .trainer-page .pk .n{font-family:var(--mono);font-weight:700;font-size:15px}
  .trainer-page .pk .d{font-size:12.5px;color:var(--text2);margin-top:3px}

  /* quiz */
  .trainer-page .quiz{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:22px;margin-top:6px}
  .trainer-page .qmeta{display:flex;justify-content:space-between;align-items:center;color:var(--text2);font-size:13px;margin-bottom:10px}
  .trainer-page .qbar{height:6px;background:var(--bg3);border-radius:4px;overflow:hidden;margin-bottom:16px}
  .trainer-page .qbar>i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--o-cyan));width:0;transition:width .3s}
  .trainer-page .qtext{font-size:17px;font-weight:600;margin-bottom:16px}
  .trainer-page .opts{display:flex;flex-direction:column;gap:9px}
  .trainer-page .opt{display:flex;align-items:center;gap:11px;border:1px solid var(--border);background:var(--bg3);
    border-radius:10px;padding:11px 14px;cursor:pointer;transition:.12s;font-size:14.5px}
  .trainer-page .opt:hover{border-color:var(--accent)}
  .trainer-page .opt .k{font-family:var(--mono);font-size:12px;width:22px;height:22px;flex:0 0 22px;border-radius:6px;
    background:var(--bg2);display:flex;align-items:center;justify-content:center;color:var(--text2)}
  .trainer-page .opt.sel{border-color:var(--accent);background:var(--glow)}
  .trainer-page .opt.correct{border-color:var(--o-green);background:color-mix(in srgb,var(--o-green) 13%,transparent)}
  .trainer-page .opt.wrong{border-color:var(--o-red);background:color-mix(in srgb,var(--o-red) 13%,transparent)}
  .trainer-page .expl{margin-top:14px;padding:12px 14px;border-radius:10px;background:var(--bg3);border:1px solid var(--border);
    font-size:13.5px;display:none}
  .trainer-page .expl.show{display:block}
  .trainer-page .expl b{color:var(--o-green)}
  .trainer-page .hot{font-size:12px;color:var(--text2);margin-top:14px}
  .trainer-page .score{text-align:center;padding:20px}
  .trainer-page .score .big{font-size:42px;font-weight:800}
</style>

<!-- ============ REFERENCE ============ -->
<h2>Reference</h2>
<div class="grid">
  <div class="card">
    <h3><span class="dot" style="background:var(--o-cyan)"></span>Multicast addresses</h3>
    <table>
      <tr><td><b>224.0.0.1</b></td><td>All hosts</td></tr>
      <tr><td><b>224.0.0.2</b></td><td>All routers / HSRPv1</td></tr>
      <tr><td><b>224.0.0.5</b></td><td>All OSPF</td></tr>
      <tr><td><b>224.0.0.6</b></td><td>OSPF DR/BDR</td></tr>
      <tr><td><b>224.0.0.9</b></td><td>RIPv2</td></tr>
      <tr><td><b>224.0.0.10</b></td><td>EIGRP</td></tr>
      <tr><td><b>224.0.0.18</b></td><td>VRRP</td></tr>
      <tr><td><b>224.0.0.102</b></td><td>HSRPv2 / GLBP</td></tr>
    </table>
  </div>
  <div class="card">
    <h3><span class="dot" style="background:var(--o-purple)"></span>Transport / protocol number</h3>
    <table>
      <tr><td>OSPF</td><td><span class="pill">IP proto 89</span></td></tr>
      <tr><td>EIGRP</td><td><span class="pill">IP proto 88</span></td></tr>
      <tr><td>VRRP</td><td><span class="pill">IP proto 112</span></td></tr>
      <tr><td>RIP</td><td><span class="pill">UDP 520</span></td></tr>
      <tr><td>HSRP</td><td><span class="pill">UDP 1985</span></td></tr>
      <tr><td>GLBP</td><td><span class="pill">UDP 3222</span></td></tr>
    </table>
  </div>
  <div class="card">
    <h3><span class="dot" style="background:var(--o-amber)"></span>Administrative distance</h3>
    <table>
      <tr><td>Connected</td><td><b>0</b></td></tr>
      <tr><td>Static</td><td><b>1</b></td></tr>
      <tr><td>eBGP</td><td><b>20</b></td></tr>
      <tr><td>EIGRP internal</td><td><b>90</b></td></tr>
      <tr><td>OSPF</td><td><b>110</b></td></tr>
      <tr><td>RIP</td><td><b>120</b></td></tr>
      <tr><td>EIGRP external</td><td><b>170</b></td></tr>
      <tr><td>iBGP</td><td><b>200</b></td></tr>
    </table>
  </div>
  <div class="card">
    <h3><span class="dot" style="background:var(--o-green)"></span>Hello / dead (hold) timers</h3>
    <table>
      <tr><td>OSPF broadcast/p2p</td><td><b>10 / 40</b></td></tr>
      <tr><td>OSPF NBMA</td><td><b>30 / 120</b></td></tr>
      <tr><td>EIGRP LAN</td><td><b>5 / 15</b></td></tr>
      <tr><td>EIGRP NBMA &le;T1</td><td><b>60 / 180</b></td></tr>
      <tr><td>HSRP / GLBP</td><td><b>3 / 10</b></td></tr>
      <tr><td>VRRP</td><td><b>1 / ~3</b></td></tr>
    </table>
  </div>
</div>

<!-- ============ PACKET TYPES ============ -->
<h2>The five OSPF packet types</h2>
<div class="pkts">
  <div class="pk"><div class="n" style="color:var(--o-cyan)">Hello</div><div class="d">Neighbour discovery and keepalive. Sent continuously.</div></div>
  <div class="pk"><div class="n" style="color:var(--accent)">DBD</div><div class="d">Database Description &mdash; an inventory of what is in the neighbour's LSDB.</div></div>
  <div class="pk"><div class="n" style="color:var(--o-amber)">LSR</div><div class="d">Link State Request &mdash; &ldquo;send me the detail on these entries&rdquo;.</div></div>
  <div class="pk"><div class="n" style="color:var(--o-purple)">LSU</div><div class="d">Link State Update &mdash; the container that carries the LSAs themselves. Used for flooding.</div></div>
  <div class="pk"><div class="n" style="color:var(--o-green)">LSAck</div><div class="d">Acknowledgement &mdash; confirms receipt. This is what makes OSPF reliable.</div></div>
</div>
<p class="sub" style="margin-top:10px">&#9888;&#65039; <b>LSU &ne; LSA.</b> The LSU is the envelope; the LSAs ride inside it.</p>

<!-- ============ ANIMATION ============ -->
<h2>Full convergence, state by state</h2>
<div class="stage">
  <div class="statebar" id="statebar"></div>
  <div class="topo">
    <div class="router active" id="r1">R1<span class="rid">RID 1.1.1.1</span></div>
    <div class="link"></div>
    <div class="pkt" id="pkt"></div>
    <div class="router" id="r2">R2<span class="rid">RID 2.2.2.2</span></div>
  </div>
  <div class="log" id="log">Press <b>Play</b> &mdash; we walk the whole path from <code>Down</code> to <code>Full</code>.</div>
  <div class="controls">
    <button class="primary" id="play">&#9654; Play</button>
    <button id="step">Step &rarr;</button>
    <button id="reset">&#10226; Reset</button>
  </div>
</div>

<!-- ============ QUIZ ============ -->
<h2>Self-test</h2>
<div class="quiz" id="quiz">
  <div class="qmeta"><span id="qcount"></span><span id="qscore"></span></div>
  <div class="qbar"><i id="qfill"></i></div>
  <div id="qbody"></div>
  <div class="hot">
    <kbd>1</kbd>&ndash;<kbd>4</kbd> pick &middot; <kbd>Enter</kbd> confirm &middot; <kbd>&rarr;</kbd> next &middot; <kbd>Space</kbd> skip
  </div>
</div>

<script>
(function(){
/* ===================== ANIMATION ===================== */
const states=['Down','Init','2-Way','Exstart','Exchange','Loading','Full'];
const sbar=document.getElementById('statebar');
states.forEach((s,i)=>{const d=document.createElement('div');d.className='st';d.id='st'+i;d.textContent=s;sbar.appendChild(d);});

const steps=[
  {st:0,log:'<b>Down</b> &mdash; R1 turns OSPF on for the interface and starts sending <b>Hello</b> packets to 224.0.0.5.',pkt:null},
  {st:1,log:'<b>Init</b> &mdash; R2 has received a Hello from R1, but its own RID is not listed in it yet, so the link is still one-way.',pkt:{t:'Hello',c:'var(--o-cyan)',dir:1}},
  {st:2,log:'<b>2-Way</b> &mdash; R1 sees its own RID in R2’s Hello, so the link is two-way. On a multiaccess segment the <b>DR/BDR election</b> happens here.',pkt:{t:'Hello (I see your RID)',c:'var(--o-cyan)',dir:-1}},
  {st:3,log:'<b>Exstart</b> &mdash; master/slave negotiation. The higher RID (R2 = 2.2.2.2) becomes master and sets the sequence number.',pkt:{t:'DBD (seq init)',c:'var(--accent)',dir:1}},
  {st:4,log:'<b>Exchange</b> &mdash; the <b>DBD</b> exchange: each side describes what is in its LSDB. &#9888;&#65039; stuck here usually means an MTU mismatch.',pkt:{t:'DBD',c:'var(--accent)',dir:-1}},
  {st:5,log:'<b>Loading</b> &mdash; R1 sends an <b>LSR</b> for every entry it is missing, R2 answers with an <b>LSU</b> (LSAs inside), R1 replies with an <b>LSAck</b>.',pkt:{t:'LSR &rarr; LSU &rarr; LSAck',c:'var(--o-amber)',dir:1}},
  {st:6,log:'<b>Full</b> &#9989; &mdash; the LSDBs are synchronised. Dijkstra now runs SPF and installs the routes.',pkt:null},
];
let cur=-1,timer=null;
const pkt=document.getElementById('pkt'),logEl=document.getElementById('log');
const r1=document.getElementById('r1'),r2=document.getElementById('r2');
const topoEl=document.querySelector('.trainer-page .topo');
const START_MSG='Press <b>Play</b> &mdash; we walk the whole path from <code>Down</code> to <code>Full</code>.';

function render(i){
  states.forEach((_,k)=>{const e=document.getElementById('st'+k);e.className='st'+(k<i?' done':k===i?' on':'');});
  const s=steps[i];logEl.innerHTML=s.log;
  r1.classList.toggle('active',i<6);r2.classList.toggle('active',i>0&&i<6);
  r1.classList.toggle('full',i===6);r2.classList.toggle('full',i===6);
  if(s.pkt){flyPacket(s.pkt);}else{pkt.style.opacity=0;}
}
function flyPacket(p){
  pkt.innerHTML=p.t;pkt.style.background=p.c;
  const goRight=p.dir===1;
  pkt.style.transition='none';
  pkt.style.opacity='0';
  pkt.style.left=goRight?'128px':'auto';
  pkt.style.right=goRight?'auto':'128px';
  pkt.style.transform='translateX(0)';
  const span=Math.max(40,(topoEl?topoEl.clientWidth:600)-256-pkt.offsetWidth);
  requestAnimationFrame(()=>{
    pkt.style.transition='transform 1.1s ease,opacity .3s';
    pkt.style.opacity='1';
    pkt.style.transform='translateX('+(goRight?span:-span)+'px)';
  });
}
function next(){if(cur<steps.length-1){cur++;render(cur);}else{stop();}}
function play(){if(timer){stop();return;}document.getElementById('play').innerHTML='&#10073;&#10073; Pause';
  if(cur>=steps.length-1){cur=-1;}timer=setInterval(()=>{if(cur>=steps.length-1){stop();return;}next();},1700);if(cur<0)next();}
function stop(){clearInterval(timer);timer=null;document.getElementById('play').innerHTML='&#9654; Play';}
function reset(){stop();cur=-1;states.forEach((_,k)=>document.getElementById('st'+k).className='st');
  pkt.style.opacity=0;r1.className='router active';r2.className='router';
  logEl.innerHTML=START_MSG;}
document.getElementById('play').onclick=play;
document.getElementById('step').onclick=()=>{stop();next();};
document.getElementById('reset').onclick=reset;

/* ===================== QUIZ ===================== */
const Q=[
 {q:'Which multicast address do ALL OSPF routers listen on?',o:['224.0.0.6','224.0.0.5','224.0.0.9','224.0.0.10'],a:1,
  e:'224.0.0.5 = AllSPFRouters. 224.0.0.6 is the DR/BDR address only.'},
 {q:'Which multicast address does OSPF use to talk to the DR/BDR?',o:['224.0.0.5','224.0.0.2','224.0.0.6','224.0.0.18'],a:2,
  e:'224.0.0.6 = AllDRouters.'},
 {q:'What transport does OSPF run over?',o:['UDP 89','TCP 179','IP protocol 89','UDP 520'],a:2,
  e:'OSPF rides directly on IP, protocol number 89 &mdash; not on TCP or UDP.'},
 {q:'What is the administrative distance of OSPF?',o:['90','110','120','170'],a:1,
  e:'OSPF = 110. EIGRP internal 90, RIP 120, EIGRP external 170.'},
 {q:'Default OSPF hello / dead timers on a broadcast segment?',o:['5 / 15','10 / 40','30 / 120','3 / 10'],a:1,
  e:'10 / 40 on broadcast and point-to-point. 30 / 120 on NBMA.'},
 {q:'Which packet CARRIES the LSAs during flooding?',o:['DBD','LSR','LSU','LSAck'],a:2,
  e:'The LSU (Link State Update) is the envelope the LSAs ride in. The classic trap is LSU &ne; LSA.'},
 {q:'What does the Init state mean?',o:['There are no neighbours at all','A Hello arrived, but our own RID is not listed in it','The LSDBs are synchronised','The DR election is running'],a:1,
  e:'Init means the link is still one-way: the neighbour does not see us yet.'},
 {q:'In which state does the DR/BDR election happen?',o:['Init','2-Way','Exstart','Loading'],a:1,
  e:'The DR/BDR election runs in 2-Way, once two-way communication is established.'},
 {q:'An adjacency is stuck in Exstart/Exchange. Most likely cause?',o:['MTU mismatch','Different administrative distances','Different hostnames','No default route'],a:0,
  e:'Mismatched interface MTUs classically hang an adjacency in Exstart/Exchange.'},
 {q:'Correct order of states up to full synchronisation?',o:['Down &rarr; 2-Way &rarr; Init &rarr; Full','Down &rarr; Init &rarr; 2-Way &rarr; Exstart &rarr; Exchange &rarr; Loading &rarr; Full','Down &rarr; Exstart &rarr; Init &rarr; Full','Init &rarr; Down &rarr; Loading &rarr; Full'],a:1,
  e:'Down &rarr; Init &rarr; 2-Way &rarr; Exstart &rarr; Exchange &rarr; Loading &rarr; Full.'},
 {q:'Which address does HSRPv2 (and GLBP) use?',o:['224.0.0.2','224.0.0.18','224.0.0.102','224.0.0.6'],a:2,
  e:'HSRPv2 and GLBP use 224.0.0.102. HSRPv1 = 224.0.0.2, VRRP = 224.0.0.18.'},
 {q:'Which packet gives OSPF its reliability?',o:['Hello','LSAck','DBD','LSR'],a:1,
  e:'The LSAck confirms receipt; with no ack the packet is retransmitted.'},
 {q:'A DROTHER&ndash;DROTHER pair on a multiaccess segment settles in which state?',o:['Full','2-Way','Down','Loading'],a:1,
  e:'That is normal: DROTHERs go Full only with the DR and BDR, and stay in 2-Way with each other.'},
 {q:'Which algorithm computes the shortest path in OSPF?',o:['DUAL','Bellman-Ford','Dijkstra (SPF)','Birman'],a:2,
  e:'Dijkstra / Shortest Path First &mdash; which is where the name Open SPF comes from.'},
 {q:'Vendor-neutral IGP choice for a mixed network?',o:['EIGRP','OSPF','RIPv1','IGRP'],a:1,
  e:'OSPF is an open standard every vendor supports. EIGRP is formally open (RFC 7868) but almost nobody else implements it.'},
];
let qi=0,score=0,answered=false,sel=-1;
const qbody=document.getElementById('qbody');
function drawQ(){
  answered=false;sel=-1;const item=Q[qi];
  document.getElementById('qcount').textContent='Question '+(qi+1)+' / '+Q.length;
  document.getElementById('qscore').textContent='Score: '+score;
  document.getElementById('qfill').style.width=(qi/Q.length*100)+'%';
  let html='<div class="qtext">'+item.q+'</div><div class="opts">';
  item.o.forEach((o,i)=>{html+='<div class="opt" data-i="'+i+'"><span class="k">'+(i+1)+'</span><span>'+o+'</span></div>';});
  html+='</div><div class="expl" id="expl">'+item.e+'</div>';
  qbody.innerHTML=html;
  qbody.querySelectorAll('.opt').forEach(el=>el.onclick=()=>select(+el.dataset.i));
}
function select(i){if(answered)return;sel=i;qbody.querySelectorAll('.opt').forEach(el=>el.classList.toggle('sel',+el.dataset.i===i));}
function submit(){
  if(answered||sel<0)return;answered=true;const item=Q[qi];
  qbody.querySelectorAll('.opt').forEach(el=>{const i=+el.dataset.i;
    if(i===item.a)el.classList.add('correct');else if(i===sel)el.classList.add('wrong');});
  if(sel===item.a)score++;
  document.getElementById('qscore').textContent='Score: '+score;
  document.getElementById('expl').classList.add('show');
}
function nextQ(){
  if(qi<Q.length-1){qi++;drawQ();}
  else{document.getElementById('qfill').style.width='100%';
    const pct=Math.round(score/Q.length*100);
    let msg=pct>=85?'&#128293; Ready for this section':pct>=60?'Decent &mdash; close the gaps':'Run it again';
    qbody.innerHTML='<div class="score"><div class="big" style="color:'+(pct>=85?'var(--o-green)':pct>=60?'var(--o-amber)':'var(--o-red)')+'">'+pct+'%</div>'+
      '<p>'+score+' of '+Q.length+' &middot; '+msg+'</p><button class="primary" id="again">&#10226; Restart</button></div>';
    document.getElementById('again').onclick=()=>{qi=0;score=0;drawQ();};
    document.getElementById('qcount').textContent='Done';}
}
drawQ();

/* hotkeys */
document.addEventListener('keydown',e=>{
  const t=e.target;
  if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;
  if(e.key>='1'&&e.key<='4'){const opt=qbody.querySelector('.opt[data-i="'+(+e.key-1)+'"]');if(opt)select(+e.key-1);e.preventDefault();}
  else if(e.key==='Enter'){if(!answered)submit();else nextQ();e.preventDefault();}
  else if(e.key==='ArrowRight'){if(answered)nextQ();e.preventDefault();}
  else if(e.key===' '){nextQ();e.preventDefault();}
});
})();
</script>
{{< /rawhtml >}}
