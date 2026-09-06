---
title: "Subnetting"
date: 2026-09-06
description: "Given an IP and a prefix, work out the network address, the broadcast address and the first and last usable host — the calculation the exam makes you repeat under time pressure."
group: "drill"
order: 1
topic: "1.5 · IPv4 addressing"
keys: "<kbd>Enter</kbd> check · <kbd>Space</kbd> reveal · <kbd>&rarr;</kbd> next"
---

{{< rawhtml >}}
<div class="card">
  <div class="prompt-card">
    <div>
      <div class="prompt-label">IP / prefix</div>
      <div class="prompt-main" id="q">—</div>
    </div>
    <div style="text-align:right">
      <div class="prompt-label">Mask · class</div>
      <div class="prompt-meta" id="meta">—</div>
    </div>
  </div>

  <div class="grid g2">
    <div><label class="fl">Network</label><input id="net" type="text" autocomplete="off" spellcheck="false" placeholder="x.x.x.x"></div>
    <div><label class="fl">Broadcast</label><input id="bc" type="text" autocomplete="off" spellcheck="false" placeholder="x.x.x.x"></div>
    <div><label class="fl">First host</label><input id="fh" type="text" autocomplete="off" spellcheck="false" placeholder="x.x.x.x"></div>
    <div><label class="fl">Last host</label><input id="lh" type="text" autocomplete="off" spellcheck="false" placeholder="x.x.x.x"></div>
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
  function classOf(a){ return a<128?'A':(a<192?'B':'C'); }
  var $=function(id){return document.getElementById(id);};

  function gen(){
    var f=Math.floor(Math.random()*223)+1; if(f===127)f=126;
    var prefix=9+Math.floor(Math.random()*22);            // /9../30
    var ip=((f<<24)|(rb()<<16)|(rb()<<8)|rb())>>>0;
    var mask=(0xFFFFFFFF<<(32-prefix))>>>0;
    var net=(ip&mask)>>>0, bc=(net|(~mask>>>0))>>>0;
    var hosts=Math.pow(2,32-prefix)-2;
    s={ip:ip,prefix:prefix,mask:mask,net:net,bc:bc,first:(net+1)>>>0,last:(bc-1)>>>0,hosts:hosts,cls:classOf(f)};
    $('q').textContent=ipStr(ip)+'/'+prefix;
    $('meta').textContent=ipStr(mask)+' · '+s.cls;
    ['net','bc','fh','lh'].forEach(function(id){var e=$(id);e.value='';e.className='';});
    $('result').innerHTML=''; attempted=false; $('net').focus();
  }
  function rb(){ return Math.floor(Math.random()*256); }
  function nz(v){ return (v||'').trim(); }

  function check(){
    var fields=[['net','Network',ipStr(s.net)],['bc','Broadcast',ipStr(s.bc)],['fh','First host',ipStr(s.first)],['lh','Last host',ipStr(s.last)]];
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
    var mo=[(s.mask>>>24)&255,(s.mask>>>16)&255,(s.mask>>>8)&255,s.mask&255][oct];
    html+='<div class="hint">Magic number: 256 − '+mo+' = <b>'+(256-mo)+'</b> (block in octet '+(oct+1)+') · hosts per subnet: <b>'+s.hosts+'</b></div>';
    $('result').innerHTML=html;
    score(allOk);
  }
  function reveal(){
    $('net').value=ipStr(s.net);$('bc').value=ipStr(s.bc);$('fh').value=ipStr(s.first);$('lh').value=ipStr(s.last);
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
