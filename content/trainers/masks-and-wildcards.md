---
title: "Mask, Wildcard, Block Size"
date: 2026-09-06
description: "From a CIDR prefix alone, recover the subnet mask, the wildcard mask an ACL wants, the block size and the usable host count — the four numbers every addressing question starts from."
group: "drill"
order: 2
topic: "1.5 · IPv4 addressing"
keys: "<kbd>Enter</kbd> check · <kbd>Space</kbd> reveal · <kbd>&rarr;</kbd> next"
---

{{< rawhtml >}}
<div class="card">
  <div class="prompt-card">
    <div>
      <div class="prompt-label">Prefix (CIDR)</div>
      <div class="prompt-main" id="q">—</div>
    </div>
  </div>

  <div class="grid g2">
    <div><label class="fl">Subnet mask</label><input id="mask" type="text" autocomplete="off" spellcheck="false" placeholder="255.255.x.x"></div>
    <div><label class="fl">Wildcard mask</label><input id="wild" type="text" autocomplete="off" spellcheck="false" placeholder="0.0.x.x"></div>
    <div><label class="fl">Block size (total addresses)</label><input id="block" type="text" autocomplete="off" spellcheck="false" placeholder="2^(32−p)"></div>
    <div><label class="fl">Usable hosts</label><input id="hosts" type="text" autocomplete="off" spellcheck="false" placeholder="block − 2"></div>
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
  var s={}, solved=0, clean=0, attempted=false;
  function ipStr(n){ return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.'); }
  var $=function(id){return document.getElementById(id);};

  function gen(){
    var prefix=8+Math.floor(Math.random()*23);   // /8../30
    var mask=(0xFFFFFFFF<<(32-prefix))>>>0;
    var wild=(~mask)>>>0;
    var block=Math.pow(2,32-prefix);
    s={prefix:prefix,mask:ipStr(mask),wild:ipStr(wild),block:block,hosts:block-2};
    $('q').textContent='/'+prefix;
    ['mask','wild','block','hosts'].forEach(function(id){var e=$(id);e.value='';e.className='';});
    $('result').innerHTML=''; attempted=false; $('mask').focus();
  }
  function nz(v){ return (v||'').trim(); }

  function check(){
    var fields=[['mask','Subnet mask',s.mask],['wild','Wildcard mask',s.wild],['block','Block size',String(s.block)],['hosts','Usable hosts',String(s.hosts)]];
    var allOk=true, html='';
    fields.forEach(function(f){
      var el=$(f[0]), val=nz(el.value), ok=val===f[2];
      el.className=ok?'ok':'bad'; if(!ok)allOk=false;
      html+='<div class="rrow"><span class="mark '+(ok?'ok':'bad')+'">'+(ok?'✓':'✗')+'</span>'
        +'<span class="name">'+f[1]+'</span>'
        +(ok?'<span>'+f[2]+'</span>':'<span class="strike">'+(val||'—')+'</span> <span class="good">'+f[2]+'</span>')
        +'</div>';
    });
    var oct=Math.floor((s.prefix-1)/8);
    var mo=s.mask.split('.')[oct];
    html+='<div class="hint">Interesting octet: '+(oct+1)+' · 256 − '+mo+' = <b>'+(256-Number(mo))+'</b> (subnet step) · wildcard = 255 − mask, octet by octet</div>';
    $('result').innerHTML=html;
    score(allOk);
  }
  function reveal(){
    $('mask').value=s.mask;$('wild').value=s.wild;$('block').value=s.block;$('hosts').value=s.hosts;
    check();
  }
  function score(ok){
    if(attempted)return; attempted=true; solved++; if(ok)clean++;
    $('solved').textContent=solved; $('clean').textContent=clean;
    $('acc').textContent=Math.round(clean/solved*100)+'%';
  }

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
