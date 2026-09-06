---
title: "Binary and Decimal"
date: 2026-09-06
description: "Convert a single octet, 0–255, in both directions against the place values 128 64 32 16 8 4 2 1 — until reading a mask in binary stops needing paper."
kind: "drill"
order: 3
topic: "1.5 · IPv4 addressing"
keys: "<kbd>Enter</kbd> check · <kbd>Space</kbd> reveal · <kbd>&rarr;</kbd> next"
---

{{< rawhtml >}}
<div class="modes" id="modes">
  <button data-m="mix" class="active">Mixed</button>
  <button data-m="d2b">Decimal → Binary</button>
  <button data-m="b2d">Binary → Decimal</button>
</div>

<div class="card">
  <div class="prompt-card">
    <div>
      <div class="prompt-label" id="plabel">Convert</div>
      <div class="prompt-main" id="q">—</div>
    </div>
    <div style="text-align:right">
      <div class="prompt-label">Answer format</div>
      <div class="prompt-meta" id="hintfmt">—</div>
    </div>
  </div>

  <div class="grid g1">
    <div><label class="fl" id="alabel">Answer</label><input id="ans" type="text" autocomplete="off" spellcheck="false" placeholder="..."></div>
  </div>

  <div class="btns">
    <button class="primary" id="check">Check <span class="k">Enter</span></button>
    <button id="reveal">Reveal <span class="k">Space</span></button>
    <button id="next">Next <span class="k">→</span></button>
  </div>
  <div class="result" id="result"></div>
</div>

<div class="stats">
  <span>Solved: <b id="solved">0</b></span>
  <span>First try: <b id="clean">0</b></span>
  <span>Accuracy: <b id="acc">—</b></span>
</div>

<script>
(function(){
  var s={}, mode='mix', solved=0, clean=0, attempted=false;
  var $=function(id){return document.getElementById(id);};
  function bin8(n){ return n.toString(2).padStart(8,'0'); }

  function gen(){
    var dir = mode==='mix' ? (Math.random()<0.5?'d2b':'b2d') : mode;
    var val=Math.floor(Math.random()*256);
    s={dir:dir,val:val,bin:bin8(val)};
    if(dir==='d2b'){
      $('plabel').textContent='Decimal → Binary';
      $('q').textContent=val;
      $('alabel').textContent='Binary (8 bits)';
      $('hintfmt').textContent='8 bits, e.g. 11000000';
      $('ans').placeholder='0/1 ×8';
    } else {
      $('plabel').textContent='Binary → Decimal';
      $('q').textContent=s.bin;
      $('alabel').textContent='Decimal (0–255)';
      $('hintfmt').textContent='0–255';
      $('ans').placeholder='0–255';
    }
    var e=$('ans'); e.value=''; e.className=''; $('result').innerHTML=''; attempted=false; e.focus();
  }
  function nz(v){ return (v||'').trim().replace(/\s+/g,''); }

  function check(){
    var el=$('ans'), raw=nz(el.value), ok, want;
    if(s.dir==='d2b'){ want=s.bin; ok=raw===s.bin; }
    else { want=String(s.val); ok=raw===String(s.val); }
    el.className=ok?'ok':'bad';
    var html='<div class="rrow"><span class="mark '+(ok?'ok':'bad')+'">'+(ok?'✓':'✗')+'</span>'
      +(ok?'<span>'+want+'</span>':'<span class="strike">'+(raw||'—')+'</span> <span class="good">'+want+'</span>')+'</div>';
    var bits=s.bin.split(''); var pv=[128,64,32,16,8,4,2,1];
    var row='';
    for(var i=0;i<8;i++){ row+='<span style="display:inline-block;width:34px;text-align:center;color:'+(bits[i]==='1'?'var(--text)':'var(--faint)')+'">'+pv[i]+'</span>'; }
    var on=pv.filter(function(p,i){return bits[i]==='1';});
    html+='<div class="hint" style="font-family:var(--mono)">'+row+'</div>';
    html+='<div class="hint">'+s.bin+' = '+(on.length?on.join(' + ')+' = ':'')+'<b>'+s.val+'</b></div>';
    $('result').innerHTML=html;
    score(ok);
  }
  function reveal(){ $('ans').value = s.dir==='d2b'?s.bin:String(s.val); check(); }
  function score(ok){
    if(attempted)return; attempted=true; solved++; if(ok)clean++;
    $('solved').textContent=solved; $('clean').textContent=clean;
    $('acc').textContent=Math.round(clean/solved*100)+'%';
  }

  Array.prototype.forEach.call(document.querySelectorAll('#modes button'),function(b){
    b.onclick=function(){
      document.querySelectorAll('#modes button').forEach(function(x){x.classList.remove('active');});
      b.classList.add('active'); mode=b.getAttribute('data-m'); gen();
    };
  });
  $('check').onclick=check; $('reveal').onclick=reveal; $('next').onclick=gen;
  document.addEventListener('keydown',function(e){
    if(e.key==='Enter'){e.preventDefault();check();}
    else if(e.key===' '&&e.target.tagName!=='INPUT'){e.preventDefault();reveal();}
    else if(e.key==='ArrowRight'){e.preventDefault();gen();}
  });
  gen();
})();
</script>
{{< /rawhtml >}}
