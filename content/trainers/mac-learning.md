---
title: "MAC Learning and Flooding"
date: 2026-09-06
description: "Six frames arrive at one switch with four hosts in VLAN 1. For each one, call the switch's action — forward out a port, flood, or drop — and watch the MAC address table build itself from the source addresses."
kind: "drill"
order: 5
topic: "1.8 · Switching concepts"
keys: "<kbd>Enter</kbd> check · <kbd>Space</kbd> reveal · <kbd>&rarr;</kbd> next"
---

PC-C and PC-D share Gi0/3 through a hub, and that is what makes **drop (filter)** possible: a frame whose destination the switch already knows on the port the frame came in on is filtered, not forwarded. Learn from the source MAC, decide on the destination MAC.

{{< rawhtml >}}
<style>
  .legend { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px; margin-bottom:18px; }
  .host { background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius); padding:8px 11px; font-family:var(--mono); font-size:13px; }
  .host b { color:var(--text); }
  .host span { color:var(--muted); display:block; font-size:12px; margin-top:2px; }
  .frameline { display:flex; gap:18px; flex-wrap:wrap; font-family:var(--mono); margin-bottom:16px; }
  .frameline .lbl { font-size:12px; color:var(--muted); }
  .frameline .v { font-size:18px; color:var(--text); }
  .frameline .v small { color:var(--faint); font-size:12px; }
  .mtab { margin-top:18px; }
  .mtab h4 { margin:0 0 8px; font-size:13px; color:var(--muted); font-weight:600; }
  table.mac { width:100%; border-collapse:collapse; font-family:var(--mono); font-size:13px; }
  table.mac th { text-align:left; color:var(--faint); font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:.5px; padding:4px 10px; border-bottom:1px solid var(--border); }
  table.mac td { padding:5px 10px; border-bottom:1px solid var(--border); }
  table.mac tr:last-child td { border-bottom:none; }
  table.mac .fresh { color:var(--ok); }
  .why { margin-top:8px; font-size:13px; color:var(--muted); }
  .why b { color:var(--text); }
  .counter { color:var(--accent); font-family:var(--mono); font-size:13px; }
</style>

<div class="card">
  <div class="legend" id="legend"></div>

  <div class="prompt-card">
    <div class="counter" id="counter">Frame 1/6</div>
  </div>

  <div class="frameline">
    <div class="fld"><div class="lbl">Ingress port</div><div class="v" id="fPort">—</div></div>
    <div class="fld"><div class="lbl">Source MAC</div><div class="v" id="fSrc">—</div></div>
    <div class="fld"><div class="lbl">Destination MAC</div><div class="v" id="fDst">—</div></div>
  </div>

  <div class="grid g1">
    <div>
      <label class="fl">Switch action (port / flood / drop)</label>
      <input id="ans" type="text" autocomplete="off" spellcheck="false" placeholder="e.g. Gi0/2  ·  flood  ·  drop">
    </div>
  </div>

  <div class="btns">
    <button class="primary" id="check">Check <span class="k">Enter</span></button>
    <button id="reveal">Reveal <span class="k">Space</span></button>
    <button id="next">Next <span class="k">→</span></button>
  </div>
  <div class="result" id="result"></div>

  <div class="mtab">
    <h4>MAC address table — SW1 (DYNAMIC)</h4>
    <table class="mac">
      <thead><tr><th>VLAN</th><th>MAC</th><th>Host</th><th>Port</th></tr></thead>
      <tbody id="macBody"><tr><td colspan="4" style="color:var(--faint)">— empty —</td></tr></tbody>
    </table>
  </div>
</div>

<div class="stats">
  <span>Frames solved: <b id="solved">0</b></span>
  <span>First try: <b id="clean">0</b></span>
  <span>Accuracy: <b id="acc">—</b></span>
</div>

<script>
(function(){
  var HOSTS=[
    {name:'PC-A', mac:'aaaa.aaaa.0001', port:'Gi0/1'},
    {name:'PC-B', mac:'bbbb.bbbb.0002', port:'Gi0/2'},
    {name:'PC-C', mac:'cccc.cccc.0003', port:'Gi0/3'},
    {name:'PC-D', mac:'dddd.dddd.0004', port:'Gi0/3'}
  ];
  var BCAST='ffff.ffff.ffff';
  var SEQ_LEN=6;
  var $=function(id){return document.getElementById(id);};

  var seq=[], idx=0, table={}, answered=false, solved=0, clean=0;

  function macHost(m){ for(var i=0;i<HOSTS.length;i++) if(HOSTS[i].mac===m) return HOSTS[i].name; return m===BCAST?'Broadcast':'?'; }
  function portNum(p){ var m=p.match(/(\d+)\s*$/); return m?m[1]:p; }

  function buildSeq(){
    var s=[];
    for(var i=0;i<SEQ_LEN;i++){
      var si=Math.floor(Math.random()*HOSTS.length);
      var dst;
      // hosts behind the same port as the source (excluding the source itself)
      var samePort=[];
      for(var k=0;k<HOSTS.length;k++) if(k!==si && HOSTS[k].port===HOSTS[si].port) samePort.push(k);
      if(Math.random()<0.18){ dst=BCAST; }
      else if(samePort.length && Math.random()<0.4){ dst=HOSTS[samePort[Math.floor(Math.random()*samePort.length)]].mac; }
      else { var di; do{di=Math.floor(Math.random()*HOSTS.length);}while(di===si); dst=HOSTS[di].mac; }
      s.push({port:HOSTS[si].port, src:HOSTS[si].mac, dst:dst});
    }
    return s;
  }

  // decision made against the table BEFORE learning from the current frame
  function decide(f){
    if(f.dst===BCAST) return {act:'flood', why:'broadcast → flood'};
    if(table[f.dst]){
      if(table[f.dst]===f.port) return {act:'drop', why:'destination is out the ingress port (filter) → drop'};
      return {act:'forward', port:table[f.dst], why:'known unicast → forward'};
    }
    return {act:'flood', why:'unknown unicast (not in the table) → flood'};
  }

  function learn(f){ table[f.src]=f.port; }

  function renderTable(freshMac){
    var keys=Object.keys(table);
    if(keys.length===0){ $('macBody').innerHTML='<tr><td colspan="4" style="color:var(--faint)">— empty —</td></tr>'; return; }
    // ordered by port
    keys.sort(function(a,b){return table[a].localeCompare(table[b]);});
    $('macBody').innerHTML=keys.map(function(m){
      var fresh=(m===freshMac)?' class="fresh"':'';
      return '<tr'+fresh+'><td>1</td><td>'+m+'</td><td>'+macHost(m)+'</td><td>'+table[m]+'</td></tr>';
    }).join('');
  }

  function renderFrame(){
    var f=seq[idx];
    $('counter').textContent='Frame '+(idx+1)+'/'+SEQ_LEN;
    $('fPort').innerHTML=f.port+' <small>('+macHost(f.src)+')</small>';
    $('fSrc').innerHTML=f.src+' <small>'+macHost(f.src)+'</small>';
    $('fDst').innerHTML=f.dst+' <small>'+macHost(f.dst)+'</small>';
    $('ans').value=''; $('ans').className=''; $('result').innerHTML='';
    answered=false; renderTable(null); $('ans').focus();
  }

  function norm(v){ return (v||'').trim().toLowerCase().replace(/\s+/g,''); }

  function correctStr(d){
    if(d.act==='flood') return 'FLOOD (out every VLAN 1 port except the ingress port)';
    if(d.act==='drop')  return 'DROP (filtered)';
    return 'Forward → '+d.port;
  }

  function userMatches(d, raw){
    var v=norm(raw);
    if(!v) return false;
    if(/flood/.test(v)) return d.act==='flood';
    if(/drop|filter/.test(v)) return d.act==='drop';
    // port
    if(d.act==='forward'){
      var want=portNum(d.port);
      var got=v.match(/(\d+)$/);
      return got && got[1]===want;
    }
    return false;
  }

  function check(){
    if(answered) return;
    var f=seq[idx], d=decide(f);
    var ok=userMatches(d, $('ans').value);
    $('ans').className=ok?'ok':'bad';
    $('result').innerHTML='<div class="rrow"><span class="mark '+(ok?'ok':'bad')+'">'+(ok?'✓':'✗')+'</span>'
      +'<span class="name">Action</span>'
      +(ok?'<span>'+correctStr(d)+'</span>':'<span class="strike">'+($('ans').value||'—')+'</span> <span class="good">'+correctStr(d)+'</span>')
      +'</div><div class="why"><b>Why:</b> '+d.why+'</div>';
    learn(f);                 // learn from the source MAC
    renderTable(f.src);       // highlight the new / refreshed entry
    answered=true;
    solved++; if(ok)clean++;
    $('solved').textContent=solved; $('clean').textContent=clean;
    $('acc').textContent=Math.round(clean/solved*100)+'%';
  }

  function reveal(){
    if(answered) return;
    var d=decide(seq[idx]);
    $('ans').value = d.act==='forward' ? d.port : d.act;
    check();
  }

  function next(){
    if(!answered){ learn(seq[idx]); }   // keep the table consistent even when skipped
    if(idx>=SEQ_LEN-1){ start(); return; }
    idx++; renderFrame();
  }

  function start(){
    seq=buildSeq(); idx=0; table={}; renderFrame();
  }

  // host legend
  $('legend').innerHTML=HOSTS.map(function(h){
    return '<div class="host"><b>'+h.name+'</b><span>'+h.mac+'</span><span>'+h.port+'</span></div>';
  }).join('');

  $('check').onclick=check; $('reveal').onclick=reveal; $('next').onclick=next;
  document.addEventListener('keydown',function(e){
    if(e.key==='Enter'){e.preventDefault();check();}
    else if(e.key===' '&&e.target.tagName!=='INPUT'){e.preventDefault();reveal();}
    else if(e.key==='ArrowRight'){e.preventDefault();next();}
  });
  start();
})();
</script>
{{< /rawhtml >}}
