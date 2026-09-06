---
title: "Powers of Two"
date: 2026-09-06
description: "2^n in both directions for n = 1–8, the arithmetic every subnetting question rests on: answer instantly and block sizes, host counts and mask boundaries all fall out of it."
kind: "drill"
order: 4
topic: "1.5 · IPv4 addressing"
keys: "<kbd>Enter</kbd> check · <kbd>Space</kbd> reveal · <kbd>&rarr;</kbd> next"
---

{{< rawhtml >}}
<div class="modes" id="modes">
  <button data-m="mix" class="active">Mixed</button>
  <button data-m="p2v">2ⁿ → value</button>
  <button data-m="v2p">value → n</button>
</div>

<div class="card">
  <div class="prompt-card">
    <div>
      <div class="prompt-label" id="plabel">Compute</div>
      <div class="prompt-main" id="q">—</div>
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

  function gen(){
    var dir = mode==='mix' ? (Math.random()<0.5?'p2v':'v2p') : mode;
    var n=1+Math.floor(Math.random()*8);   // 1..8 (one octet)
    var v=Math.pow(2,n);
    s={dir:dir,n:n,v:v};
    if(dir==='p2v'){
      $('plabel').textContent='Two to the power of';
      $('q').textContent='2^'+n;
      $('alabel').textContent='Value';
      $('ans').placeholder='number';
    } else {
      $('plabel').textContent='Which power of two';
      $('q').textContent=v;
      $('alabel').textContent='Exponent n';
      $('ans').placeholder='n';
    }
    var e=$('ans'); e.value=''; e.className=''; $('result').innerHTML=''; attempted=false; e.focus();
  }
  function nz(v){ return (v||'').trim(); }

  function check(){
    var el=$('ans'), raw=nz(el.value), ok, want;
    if(s.dir==='p2v'){ want=String(s.v); ok=raw===want; }
    else { want=String(s.n); ok=raw===want; }
    el.className=ok?'ok':'bad';
    var html='<div class="rrow"><span class="mark '+(ok?'ok':'bad')+'">'+(ok?'✓':'✗')+'</span>'
      +(ok?'<span>'+want+'</span>':'<span class="strike">'+(raw||'—')+'</span> <span class="good">'+want+'</span>')+'</div>';
    html+='<div class="hint">2^'+s.n+' = <b>'+s.v+'</b> · hosts in a /'+(32-s.n)+': <b>'+(s.v-2)+'</b></div>';
    $('result').innerHTML=html;
    score(ok);
  }
  function reveal(){ $('ans').value = s.dir==='p2v'?String(s.v):String(s.n); check(); }
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
