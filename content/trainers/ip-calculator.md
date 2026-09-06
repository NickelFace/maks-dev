---
title: "IP Calculator"
date: 2026-09-06
description: "Type an address and a prefix and get the network, broadcast and host range back, with a 32-bit bitmap showing exactly which bits the mask claims. IP, prefix, subnet mask and wildcard all stay in sync — change any one of them and the rest follow."
kind: "tool"
order: 1
topic: "1.5 · IPv4 addressing"
---

{{< rawhtml >}}
<style>
.trainer-page { --amber: #f59e0b; }
[data-theme="light"] .trainer-page { --amber: #b45309; }

.trainer-page .input-row { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 12px; }
.trainer-page .input-row .field { display: flex; flex-direction: column; gap: 4px; }
.trainer-page .input-row label { font-size: 12px; color: var(--muted); }
.trainer-page .slash { font-size: 22px; font-weight: 700; color: var(--faint); padding-bottom: 8px; }
.trainer-page input.if {
  font-family: var(--mono); font-size: 16px; height: 42px; padding: 0 12px;
  background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius);
  color: var(--text); outline: none; transition: border-color .12s, box-shadow .12s;
}
.trainer-page input.if:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--glow); }
.trainer-page input.iif { width: 180px; }
.trainer-page input.pif { width: 68px; }
.trainer-page input.mif { width: 192px; }
.trainer-page input.wif { width: 148px; }

.trainer-page input[type=range] {
  -webkit-appearance: none; appearance: none; width: 100%; height: 4px;
  background: var(--border); border-radius: 2px; outline: none; cursor: pointer; margin: 4px 0 2px;
}
.trainer-page input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 18px; height: 18px;
  border-radius: 50%; background: var(--accent); cursor: pointer; border: 2px solid var(--bg);
}
.trainer-page input[type=range]::-moz-range-thumb {
  width: 14px; height: 14px; border-radius: 50%; background: var(--accent); border: none; cursor: pointer;
}

.trainer-page .section-hdr {
  font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase;
  letter-spacing: .08em; margin: 20px 0 8px;
}
.trainer-page .out-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.trainer-page .oi {
  background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 9px 13px;
}
.trainer-page .oi .lbl { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 3px; }
.trainer-page .oi .val { font-family: var(--mono); font-size: 15px; word-break: break-all; }
.trainer-page .val.ac { color: var(--accent); }
.trainer-page .val.ok { color: var(--ok); }
.trainer-page .val.wn { color: var(--amber); }
.trainer-page .val.mu { color: var(--muted); }

.trainer-page .class-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.trainer-page .badge {
  font-size: 13px; padding: 4px 11px; border-radius: var(--radius);
  background: var(--surface-2); border: 1px solid var(--border);
}
.trainer-page .badge b { color: var(--accent); }

.trainer-page .bm-box {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 14px 16px; overflow-x: auto;
}
.trainer-page .bm-row { font-family: var(--mono); font-size: 14px; line-height: 1.9; white-space: nowrap; }
.trainer-page .bn { color: var(--accent); }
.trainer-page .bs { color: var(--amber); }
.trainer-page .bh { color: var(--ok); }
.trainer-page .bdot { color: var(--faint); margin: 0 2px; }
.trainer-page .bm-legend { display: flex; gap: 16px; font-size: 12px; color: var(--muted); margin-top: 10px; flex-wrap: wrap; }
.trainer-page .bm-legend span { display: flex; align-items: center; gap: 5px; }
.trainer-page .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

.trainer-page .err { color: var(--bad); font-size: 13px; padding: 6px 0; }
</style>

<!-- Inputs -->
<div class="card">
  <div class="input-row">
    <div class="field">
      <label>IP Address</label>
      <input class="if iif" id="ip" type="text" value="192.168.1.50" autocomplete="off" spellcheck="false">
    </div>
    <div class="slash">/</div>
    <div class="field">
      <label>Prefix</label>
      <input class="if pif" id="prefix" type="number" value="26" min="0" max="32">
    </div>
    <div class="field">
      <label>Subnet Mask</label>
      <input class="if mif" id="mask-in" type="text" value="255.255.255.192" autocomplete="off" spellcheck="false">
    </div>
    <div class="field">
      <label>Wildcard Mask</label>
      <input class="if wif" id="wc-in" type="text" value="0.0.0.63" autocomplete="off" spellcheck="false">
    </div>
  </div>
  <input type="range" id="slider" min="0" max="32" value="26">
  <div id="err" class="err" style="display:none"></div>
</div>

<div id="out">
  <!-- Classful -->
  <div class="section-hdr">Classful</div>
  <div class="class-bar" id="cls-bar"></div>
  <div class="out-grid" id="cls-grid"></div>

  <!-- Network -->
  <div class="section-hdr">Network</div>
  <div class="out-grid" id="net-grid"></div>

  <!-- Bitmap -->
  <div class="section-hdr">Subnet Bitmap</div>
  <div class="bm-box">
    <div class="bm-row" id="bm-bits"></div>
    <div class="bm-row" id="bm-lbl"></div>
    <div class="bm-legend">
      <span><span class="dot" style="background:var(--accent)"></span>Network (n)</span>
      <span><span class="dot" style="background:var(--amber)"></span>Subnet borrowed (s)</span>
      <span><span class="dot" style="background:var(--ok)"></span>Host (h)</span>
    </div>
  </div>
</div>

<script>
(function(){
const ipEl     = document.getElementById('ip');
const prefixEl = document.getElementById('prefix');
const sliderEl = document.getElementById('slider');
const maskEl   = document.getElementById('mask-in');
const wcEl     = document.getElementById('wc-in');
const errEl    = document.getElementById('err');
const outEl    = document.getElementById('out');

/* ---- helpers ---- */
function i2ip(n) {
  return [(n>>>24)&0xFF,(n>>>16)&0xFF,(n>>>8)&0xFF,n&0xFF].join('.');
}
function i2hex(n) {
  return [(n>>>24)&0xFF,(n>>>16)&0xFF,(n>>>8)&0xFF,n&0xFF]
    .map(b=>b.toString(16).padStart(2,'0').toUpperCase()).join('.');
}
function pfx2mask(p) {
  if(p===0) return '0.0.0.0';
  return i2ip((0xFFFFFFFF<<(32-p))>>>0);
}
function pfx2wc(p) {
  const m = p===0 ? 0 : (0xFFFFFFFF<<(32-p))>>>0;
  return i2ip((~m)>>>0);
}
function mask2pfx(s) {
  const p = s.split('.').map(Number);
  if(p.length!==4||p.some(x=>isNaN(x)||x<0||x>255)) return null;
  const m = ((p[0]<<24)|(p[1]<<16)|(p[2]<<8)|p[3])>>>0;
  let c=0;
  for(let i=31;i>=0;i--){ if(m&(1<<i)) c++; else break; }
  const exp = c ? (0xFFFFFFFF<<(32-c))>>>0 : 0;
  return exp===m ? c : null;
}
function wc2pfx(s) {
  const p = s.split('.').map(Number);
  if(p.length!==4||p.some(x=>isNaN(x)||x<0||x>255)) return null;
  const wc = ((p[0]<<24)|(p[1]<<16)|(p[2]<<8)|p[3])>>>0;
  return mask2pfx(i2ip((~wc)>>>0));
}
function parseIP(s) {
  const p = s.trim().split('.').map(Number);
  if(p.length!==4||p.some(x=>isNaN(x)||x<0||x>255)) return null;
  return ((p[0]<<24)|(p[1]<<16)|(p[2]<<8)|p[3])>>>0;
}
function fmt(n) { return n>=1e6?n.toLocaleString('en-US'):String(n); }

/* ---- output helpers ---- */
function oi(label, val, cls='') {
  return `<div class="oi"><div class="lbl">${label}</div><div class="val ${cls}">${val}</div></div>`;
}

/* ---- main compute ---- */
function compute() {
  const ipInt = parseIP(ipEl.value);
  const prefix = parseInt(prefixEl.value);

  if(ipInt===null||isNaN(prefix)||prefix<0||prefix>32) {
    errEl.textContent='Invalid IP address or prefix'; errEl.style.display='';
    outEl.style.visibility='hidden'; return;
  }
  errEl.style.display='none'; outEl.style.visibility='';

  const maskInt  = prefix===0 ? 0 : (0xFFFFFFFF<<(32-prefix))>>>0;
  const wcInt    = (~maskInt)>>>0;
  const netInt   = (ipInt & maskInt)>>>0;
  const bcastInt = (netInt | wcInt)>>>0;
  const hBits    = 32-prefix;
  const total    = hBits<31 ? Math.pow(2,hBits) : Math.pow(2,hBits);
  const usable   = hBits>=2 ? total-2 : (hBits===1?0:1);

  /* classful */
  const o1 = (ipInt>>>24)&0xFF;
  let cls, clsPfx, octRange, isPrivate;
  if(o1>=1&&o1<=126)       { cls='A'; clsPfx=8;  octRange='1 – 126'; }
  else if(o1===127)         { cls='A (Loopback)'; clsPfx=8; octRange='127'; }
  else if(o1>=128&&o1<=191){ cls='B'; clsPfx=16; octRange='128 – 191'; }
  else if(o1>=192&&o1<=223){ cls='C'; clsPfx=24; octRange='192 – 223'; }
  else if(o1>=224&&o1<=239){ cls='D (Multicast)'; clsPfx=null; octRange='224 – 239'; }
  else                      { cls='E (Reserved)'; clsPfx=null; octRange='240 – 255'; }

  /* RFC 1918 private? */
  const o2=(ipInt>>>16)&0xFF;
  if(o1===10) isPrivate='RFC 1918 Private';
  else if(o1===172&&o2>=16&&o2<=31) isPrivate='RFC 1918 Private';
  else if(o1===192&&o2===168) isPrivate='RFC 1918 Private';
  else isPrivate=null;

  const sBits = (clsPfx!==null && prefix>clsPfx) ? prefix-clsPfx : 0;
  const maxSub = clsPfx!==null ? Math.pow(2,sBits) : null;
  const hpsub  = hBits>=2 ? total-2 : 0;

  /* render class bar */
  document.getElementById('cls-bar').innerHTML =
    `<span class="badge">Class <b>${cls}</b></span>` +
    `<span class="badge">1st Octet <b>${octRange}</b></span>` +
    (clsPfx!==null ? `<span class="badge">Default <b>/${clsPfx} · ${pfx2mask(clsPfx)}</b></span>` : '') +
    (isPrivate ? `<span class="badge" style="border-color:var(--ok);color:var(--ok)">${isPrivate}</span>` : '');

  /* render class grid */
  const cg = document.getElementById('cls-grid');
  if(clsPfx!==null) {
    cg.innerHTML =
      oi('Subnet Bits (borrowed)', sBits, 'wn') +
      oi('Host Bits', hBits, 'ok') +
      oi('Max Subnets', maxSub!==null?fmt(maxSub):'—', 'wn') +
      oi('Hosts / Subnet', fmt(hpsub), 'ok');
  } else { cg.innerHTML=''; }

  /* render net grid */
  document.getElementById('net-grid').innerHTML =
    oi('Network Address', i2ip(netInt), 'ac') +
    oi('Broadcast Address', i2ip(bcastInt), 'wn') +
    oi('First Host', prefix<31?i2ip(netInt+1):'—', 'ok') +
    oi('Last Host',  prefix<31?i2ip(bcastInt-1):'—', 'ok') +
    oi('Subnet Mask', i2ip(maskInt)) +
    oi('Wildcard Mask', i2ip(wcInt)) +
    oi('CIDR Notation', i2ip(netInt)+'/'+prefix, 'ac') +
    oi('Hex IP', i2hex(ipInt), 'mu') +
    oi('Usable Hosts', fmt(usable), 'ok') +
    oi('Total Addresses', fmt(total));

  /* bitmap */
  renderBitmap(ipInt, prefix, clsPfx);
}

function renderBitmap(ipInt, prefix, clsPfx) {
  const netBits = clsPfx!==null ? Math.min(prefix,clsPfx) : prefix;
  const sBits   = clsPfx!==null ? Math.max(0,prefix-clsPfx) : 0;

  function cls(i) {
    if(i<netBits) return 'bn';
    if(i<netBits+sBits) return 'bs';
    return 'bh';
  }

  let bitsHtml='', lblHtml='';
  for(let i=0;i<32;i++) {
    if(i>0&&i%8===0) {
      bitsHtml += '<span class="bdot">.</span>';
      lblHtml  += '<span class="bdot">.</span>';
    }
    const bit = (ipInt>>>(31-i))&1;
    const c = cls(i);
    const lbl = c==='bn'?'n':c==='bs'?'s':'h';
    bitsHtml += `<span class="${c}">${bit}</span>`;
    lblHtml  += `<span class="${c}">${lbl}</span>`;
  }
  document.getElementById('bm-bits').innerHTML = bitsHtml;
  document.getElementById('bm-lbl').innerHTML  = lblHtml;
}

/* ---- sync inputs ---- */
let busy=false;
function lock(fn){ if(busy)return; busy=true; fn(); busy=false; }

prefixEl.addEventListener('input', ()=>lock(()=>{
  const p=parseInt(prefixEl.value);
  if(!isNaN(p)&&p>=0&&p<=32){ sliderEl.value=p; maskEl.value=pfx2mask(p); wcEl.value=pfx2wc(p); }
  compute();
}));

sliderEl.addEventListener('input', ()=>lock(()=>{
  const p=parseInt(sliderEl.value);
  prefixEl.value=p; maskEl.value=pfx2mask(p); wcEl.value=pfx2wc(p);
  compute();
}));

maskEl.addEventListener('input', ()=>lock(()=>{
  const p=mask2pfx(maskEl.value.trim());
  if(p!==null){ prefixEl.value=p; sliderEl.value=p; wcEl.value=pfx2wc(p); }
  compute();
}));

wcEl.addEventListener('input', ()=>lock(()=>{
  const p=wc2pfx(wcEl.value.trim());
  if(p!==null){ prefixEl.value=p; sliderEl.value=p; maskEl.value=pfx2mask(p); }
  compute();
}));

ipEl.addEventListener('input', ()=>compute());

document.addEventListener('keydown', e=>{
  if(document.activeElement===sliderEl){
    if(e.key==='ArrowRight'||e.key==='ArrowUp') sliderEl.dispatchEvent(new Event('input'));
    if(e.key==='ArrowLeft'||e.key==='ArrowDown') sliderEl.dispatchEvent(new Event('input'));
  }
});

compute();
})();
</script>
{{< /rawhtml >}}
