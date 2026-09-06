---
title: "OSPF Multi-Area LSAs"
date: 2026-09-06
description: "How Type 1, 3, 4 and 5 LSAs cross area boundaries, and what each area actually ends up knowing."
kind: "animation"
order: 2
topic: "3.4 · OSPF"
keys: "<kbd>&larr;</kbd> back · <kbd>&rarr;</kbd> next · click a router to open its LSDB"
---

{{< rawhtml >}}
<style>
  #maWrap{
    --panel:  var(--bg2);
    --panel2: var(--bg3);
    --line:   var(--border);
    --txt:    var(--text);
    --muted:  var(--text2);
    --dim:    var(--text3);
    /* One colour per LSA type — the whole point of the animation, so these stay
       literal. Each has a light-theme twin below: the dark values are far too
       bright to read on the light theme's near-white panels. */
    --t1:#00d4ff; --t3:#a855f7; --t4:#f59e0b; --t5:#f43f5e;
    --green:#10b981; --hello:#67e8f9;
    --zone-op:.055;
    --mono:'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
    --disp:'Inter', system-ui, sans-serif;
    font-family:var(--mono); font-size:14px; line-height:1.5; color:var(--txt);
    display:block;
  }
  [data-theme="light"] #maWrap{
    --t1:#0d7d99; --t3:#7e22ce; --t4:#b45309; --t5:#be123c;
    --green:#047857; --hello:#0e7490;
    --zone-op:.10;
  }

  #maWrap .badge-area{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 10px}
  #maWrap .state-badge{font-family:var(--disp);font-weight:700;font-size:12px;letter-spacing:.5px;padding:5px 12px;
    border-radius:6px;border:1px solid var(--line);background:var(--panel2);color:var(--t3);text-transform:uppercase}
  #maWrap .step-counter{color:var(--muted);font-size:12px;margin-left:auto}
  #maWrap .progress{height:4px;background:var(--line);border-radius:99px;overflow:hidden;margin-bottom:14px}
  #maWrap .progress > i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--t1),var(--t3),var(--t4),var(--t5));transition:width .35s}
  /* The site's article column is 820px wide, so the original two-column
     desktop split would squeeze the topology SVG down to ~300px. One column. */
  #maWrap .grid{display:grid;grid-template-columns:1fr;gap:16px}
  #maWrap .card{background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden;padding:0}
  #maWrap .card.glow{box-shadow:var(--shadow)}
  #maWrap .card-h{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line);
    font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted)}
  #maWrap .card-h .dot{width:8px;height:8px;border-radius:99px;background:var(--t3);box-shadow:0 0 10px var(--t3)}
  #maWrap .card-b{padding:14px}
  #maWrap svg{width:100%;height:auto;display:block}

  #maWrap .zone{stroke-dasharray:5 5;stroke-width:1.5;fill-opacity:var(--zone-op)}
  #maWrap .zone.a1{fill:var(--t1);stroke:var(--t1)}
  #maWrap .zone.a0{fill:var(--green);stroke:var(--green)}
  #maWrap .zone.a2{fill:var(--t3);stroke:var(--t3)}
  #maWrap .zonelbl{font:700 12px var(--disp);letter-spacing:.5px}
  #maWrap .zonelbl.a1{fill:var(--t1)} #maWrap .zonelbl.a0{fill:var(--green)} #maWrap .zonelbl.a2{fill:var(--t3)}

  #maWrap .router rect{fill:var(--panel2);stroke:var(--line);stroke-width:1.5;transition:.25s}
  #maWrap .router .rname{fill:var(--txt);font:700 14px var(--disp)}
  #maWrap .router .rid{fill:var(--muted);font:10px var(--mono)}
  #maWrap .router .role{font:700 9px var(--mono);letter-spacing:.5px}
  #maWrap .router.internal .role{fill:var(--t1)}
  #maWrap .router.abr .role{fill:var(--t4)}
  #maWrap .router.asbr .role{fill:var(--t5)}
  #maWrap .router:hover rect{stroke:var(--t3)}
  #maWrap .router.sel rect{stroke:var(--t3);stroke-width:2.5}
  #maWrap .router.hot rect{stroke:var(--t4);stroke-width:2.5;filter:drop-shadow(0 0 10px var(--t4))}
  #maWrap .link{stroke:var(--line);stroke-width:2}
  #maWrap .link.active{stroke:var(--border2);stroke-width:2.5}
  #maWrap .link.ext{stroke:var(--t5);stroke-dasharray:4 4;opacity:.7}
  #maWrap .linklbl{fill:var(--dim);font:10px var(--mono)}
  #maWrap .cloud{fill:var(--panel2);stroke:var(--t5);stroke-width:1.5;stroke-dasharray:3 3}
  #maWrap .cloudlbl{fill:var(--t5);font:10px var(--mono)}
  #maWrap .cloudsub{fill:var(--dim);font:9px var(--mono)}

  #maWrap .controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
  #maWrap button{font-family:var(--mono);font-size:13px;cursor:pointer;height:auto;background:var(--panel2);color:var(--txt);
    border:1px solid var(--line);border-radius:8px;padding:9px 14px;transition:.15s}
  #maWrap button:hover:not(:disabled){border-color:var(--t3);color:var(--txt);background:var(--glow)}
  #maWrap button:disabled{opacity:.4;cursor:not-allowed}
  #maWrap button.primary{border-color:var(--t3);color:var(--t3);background:var(--panel2)}
  #maWrap button.play.on{border-color:var(--green);color:var(--green)}
  #maWrap .desc{margin-top:14px;padding:12px 14px;border-left:3px solid var(--t3);background:var(--panel);border-radius:0 8px 8px 0;font-size:13px}
  #maWrap .desc b{color:var(--txt)}
  #maWrap .desc code{background:var(--panel2);border:1px solid var(--line);border-radius:4px;padding:1px 5px;color:var(--green);font-size:12px}

  #maWrap .pkt-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--muted);margin-bottom:10px}
  #maWrap .pkt-meta span{background:var(--panel2);border:1px solid var(--line);border-radius:5px;padding:3px 8px}
  #maWrap .sec{border:1px solid var(--line);border-radius:8px;margin-bottom:10px;overflow:hidden}
  #maWrap .sec-h{padding:7px 11px;font-size:11px;letter-spacing:.8px;text-transform:uppercase;background:var(--panel2);border-bottom:1px solid var(--line);font-weight:700}
  #maWrap .sec.t1 .sec-h{color:var(--t1)} #maWrap .sec.t3 .sec-h{color:var(--t3)}
  #maWrap .sec.t4 .sec-h{color:var(--t4)} #maWrap .sec.t5 .sec-h{color:var(--t5)}
  #maWrap .rows{padding:4px 0}
  #maWrap .row{display:grid;grid-template-columns:160px 1fr;gap:10px;padding:4px 11px;font-size:12px}
  #maWrap .row:nth-child(even){background:rgba(127,133,145,.07)}
  #maWrap .row .f{color:var(--muted)} #maWrap .row .v{color:var(--txt);word-break:break-word}
  #maWrap .row .v em{color:var(--dim);font-style:normal;font-size:11px}
  #maWrap .subhdr{padding:5px 11px;font-size:10px;letter-spacing:.6px;color:var(--dim);text-transform:uppercase;border-top:1px dashed var(--line)}
  #maWrap .empty{color:var(--dim);font-size:12px;padding:18px;text-align:center}

  #maWrap .tabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}
  #maWrap .tab{font-size:12px;padding:5px 11px;border:1px solid var(--line);border-radius:7px;background:var(--panel2);color:var(--muted);cursor:pointer}
  #maWrap .tab.on{border-color:var(--t3);color:var(--t3)}
  #maWrap .tgroup{margin-bottom:12px}
  #maWrap .tgroup-h{font:700 11px var(--mono);letter-spacing:.5px;margin:0 0 5px;text-transform:uppercase;display:flex;align-items:center;gap:7px}
  #maWrap .tgroup-h .tt{font-size:9px;border-radius:4px;padding:1px 6px;color:var(--panel);font-weight:700}
  #maWrap .tt1{background:var(--t1)} #maWrap .tt3{background:var(--t3)}
  #maWrap .tt4{background:var(--t4)} #maWrap .tt5{background:var(--t5)}
  #maWrap table{width:100%;border-collapse:collapse;font-size:11.5px}
  #maWrap th{text-align:left;color:var(--dim);font-weight:500;padding:5px 8px;border-bottom:1px solid var(--line);font-size:10px;letter-spacing:.4px;text-transform:uppercase}
  #maWrap td{padding:5px 8px;border-bottom:1px solid var(--line);color:var(--txt)}
  #maWrap .note{margin-top:6px;font-size:11px;color:var(--muted);border-left:2px solid var(--t4);padding-left:9px}
  #maWrap .note.warn{border-color:var(--t5)}
  #maWrap .o{color:var(--t1)} #maWrap .oia{color:var(--t3)} #maWrap .oe{color:var(--t5)} #maWrap .ctag{color:var(--green)}
  #maWrap .legend{display:flex;gap:14px;flex-wrap:wrap;font-size:10.5px;color:var(--muted);margin-top:10px}
  #maWrap .legend i{display:inline-block;width:9px;height:9px;border-radius:99px;margin-right:5px;vertical-align:middle}
</style>

<div id="maWrap">
  <div class="badge-area">
    <span class="state-badge" id="maBadge"></span>
    <span class="step-counter" id="maCounter"></span>
  </div>
  <div class="progress"><i id="maProg"></i></div>

  <div class="grid">
    <div class="card glow">
      <div class="card-h"><span class="dot"></span>topology · area 1 &harr; area 0 &harr; area 2</div>
      <div class="card-b">
        <svg id="maMap" viewBox="0 0 900 470" role="img" aria-label="OSPF multi-area topology"></svg>
        <div class="legend">
          <span><i style="background:var(--t1)"></i>Type 1 · Router</span>
          <span><i style="background:var(--t3)"></i>Type 3 · Summary (inter-area)</span>
          <span><i style="background:var(--t4)"></i>Type 4 · ASBR Summary</span>
          <span><i style="background:var(--t5)"></i>Type 5 · External</span>
          <span><i style="background:var(--hello)"></i>Hello · keepalive</span>
        </div>
        <div class="controls">
          <button id="maReset">&#8634; reset</button>
          <button id="maPrev">&#9664; back</button>
          <button id="maNext" class="primary">next &#9654;</button>
          <button id="maPlay" class="play">&#9654;&#9654; auto</button>
        </div>
        <div class="desc" id="maDesc"></div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-h"><span class="dot" style="background:var(--t4);box-shadow:0 0 10px var(--t4)"></span>inside the LSA</div>
        <div class="card-b"><div id="maPacket"></div></div>
      </div>
      <div class="card">
        <div class="card-h"><span class="dot" style="background:var(--green);box-shadow:0 0 10px var(--green)"></span>LSDB / table of the selected router</div>
        <div class="card-b"><div class="tabs" id="maTabs"></div><div id="maLsdb"></div></div>
      </div>
    </div>
  </div>
</div>

<script>
(function(){
/* ---------- routers ---------- */
const R = {
  R1  :{name:'R1',  rid:'1.1.1.1', role:'INTERNAL · area 1', cls:'internal', x:130, y:250},
  ABR1:{name:'ABR1',rid:'2.2.2.2', role:'ABR · area 1↔0',    cls:'abr',      x:330, y:250},
  ABR2:{name:'ABR2',rid:'3.3.3.3', role:'ABR · area 0↔2',    cls:'abr',      x:610, y:250},
  ASBR:{name:'ASBR',rid:'4.4.4.4', role:'ASBR · area 2',     cls:'asbr',     x:740, y:180},
};
const EXT = {x:790, y:385};
const ZONES = [
  {cls:'a1', name:'AREA 1',            x:25,  y:155, w:300, h:190},
  {cls:'a0', name:'AREA 0 · backbone', x:330, y:130, w:270, h:235},
  {cls:'a2', name:'AREA 2',            x:600, y:110, w:285, h:205},
];
const LINKS = [
  {a:'R1',  b:'ABR1', net:'10.1.0.0/30'},
  {a:'ABR1',b:'ABR2', net:'10.0.0.0/30'},
  {a:'ABR2',b:'ASBR', net:'10.2.0.0/30'},
];
const NW=92, NH=56;
const cx=id=>R[id].x, cy=id=>R[id].y;

/* ---------- LSAs for the "inside the LSA" panel ---------- */
const hdr=(type,rid,len)=>({cls:'t1',title:'OSPF Header · 24 bytes',rows:[
  {f:'Version / Type',v:'2 / '+type},{f:'Packet Length',v:len+' bytes'},
  {f:'Router ID',v:rid},{f:'Area ID',v:'…'},{f:'Checksum',v:'0x7c1d'},{f:'Auth',v:'0 (none)'}]});

const PKT={
  type1:{meta:['Type 1 · Router-LSA','flooded ONLY inside the area'],secs:[
    hdr('4 · LS Update','1.1.1.1',68),
    {cls:'t1',title:'LSA Header',rows:[
      {f:'LS Type',v:'1 · Router-LSA'},{f:'Link State ID',v:'1.1.1.1',n:'= Router ID'},
      {f:'Advertising Router',v:'1.1.1.1'},{f:'LS Seq',v:'0x80000001'}]},
    {cls:'t1',title:'Router-LSA body',sub:'describes the links of R1; the flood stops at the ABR',rows:[
      {f:'Flags',v:'0x00'},{f:'# Links',v:'3'}],links:[
      {t:'1 · point-to-point',id:'2.2.2.2',data:'10.1.0.2',m:1},
      {t:'3 · stub',          id:'10.1.0.0',data:'255.255.255.252',m:1},
      {t:'3 · stub (LAN)',    id:'10.1.1.0',data:'255.255.255.0',m:1}]},
  ]},
  type3:{meta:['Type 3 · Summary-LSA','inter-area','regenerated by every ABR'],secs:[
    hdr('4 · LS Update','2.2.2.2',52),
    {cls:'t3',title:'LSA Header',rows:[
      {f:'LS Type',v:'3 · Summary-LSA'},
      {f:'Link State ID',v:'10.1.1.0',n:'= the network address'},
      {f:'Advertising Router',v:'2.2.2.2',n:'= ABR1 (changes at every boundary!)'},
      {f:'LS Seq',v:'0x80000001'}]},
    {cls:'t3',title:'Summary body',sub:'prefix + metric only, NO topology',rows:[
      {f:'Network Mask',v:'255.255.255.0'},
      {f:'Metric',v:'2',n:'cost from the ABR to the network'}]},
  ]},
  type4:{meta:['Type 4 · ASBR-Summary','tells other areas WHERE the ASBR is'],secs:[
    hdr('4 · LS Update','3.3.3.3',40),
    {cls:'t4',title:'LSA Header',rows:[
      {f:'LS Type',v:'4 · ASBR-Summary'},
      {f:'Link State ID',v:'4.4.4.4',n:'= the ASBR Router ID (not a network!)'},
      {f:'Advertising Router',v:'3.3.3.3',n:'= ABR2'},
      {f:'LS Seq',v:'0x80000001'}]},
    {cls:'t4',title:'body',sub:'the route to the ASBR for routers in other areas',rows:[
      {f:'Network Mask',v:'0.0.0.0'},
      {f:'Metric',v:'1',n:'cost ABR2 → ASBR'}]},
  ]},
  type5:{meta:['Type 5 · AS-External','flooded across the WHOLE domain unchanged'],secs:[
    hdr('4 · LS Update','4.4.4.4',56),
    {cls:'t5',title:'LSA Header',rows:[
      {f:'LS Type',v:'5 · AS-External'},
      {f:'Link State ID',v:'172.16.50.0',n:'= the external network'},
      {f:'Advertising Router',v:'4.4.4.4',n:'= ASBR (the same in every area)'},
      {f:'LS Seq',v:'0x80000001'}]},
    {cls:'t5',title:'External body',rows:[
      {f:'Network Mask',v:'255.255.255.0'},
      {f:'Metric',v:'20',n:'the default'},
      {f:'Metric Type',v:'E2',n:'E2 = external metric only (does not grow); E1 = external + internal'},
      {f:'Forwarding Address',v:'0.0.0.0'},
      {f:'External Route Tag',v:'0'}]},
  ]},
};

/* ---------- LSDB by type ---------- */
const A1T1=[{t:'1',lsid:'1.1.1.1',adv:'1.1.1.1',info:'R1 · area 1'},{t:'1',lsid:'2.2.2.2',adv:'2.2.2.2',info:'ABR1 · area 1'}];
const A0T1=[{t:'1',lsid:'2.2.2.2',adv:'2.2.2.2',info:'ABR1 · area 0'},{t:'1',lsid:'3.3.3.3',adv:'3.3.3.3',info:'ABR2 · area 0'}];
const A2T1=[{t:'1',lsid:'3.3.3.3',adv:'3.3.3.3',info:'ABR2 · area 2'},{t:'1',lsid:'4.4.4.4',adv:'4.4.4.4',info:'ASBR · area 2'}];
const T5=[{t:'5',lsid:'172.16.50.0',adv:'4.4.4.4',info:'E2 · metric 20'}];

const T3 = {
  R1:  [{t:'3',lsid:'10.0.0.0',adv:'2.2.2.2',info:'/30 · from area 0'},{t:'3',lsid:'10.2.0.0',adv:'2.2.2.2',info:'/30 · from area 2'}],
  ABR1:[{t:'3',lsid:'10.2.0.0',adv:'3.3.3.3',info:'/30 · received from area 0'},{t:'3',lsid:'10.1.1.0',adv:'2.2.2.2',info:'/24 · originated by itself into area 0'}],
  ABR2:[{t:'3',lsid:'10.1.1.0',adv:'2.2.2.2',info:'/24 · received from area 0'},{t:'3',lsid:'10.2.0.0',adv:'3.3.3.3',info:'/30 · originated by itself into area 0'}],
  ASBR:[{t:'3',lsid:'10.1.1.0',adv:'3.3.3.3',info:'/24 · from area 0'},{t:'3',lsid:'10.0.0.0',adv:'3.3.3.3',info:'/30 · from area 0'}],
};
const T4 = {
  R1:  [{t:'4',lsid:'4.4.4.4',adv:'2.2.2.2',info:'ASBR via ABR1'}],
  ABR1:[{t:'4',lsid:'4.4.4.4',adv:'3.3.3.3',info:'ASBR via ABR2'}],
  ABR2:[{t:'4',lsid:'4.4.4.4',adv:'3.3.3.3',info:'originated it into area 0'}],
  ASBR:[],
};
const T1OF = {R1:A1T1, ABR1:A1T1.concat(A0T1), ABR2:A0T1.concat(A2T1), ASBR:A2T1};

const STAGE={t1:1, t3:2, t5:3, t4:4};
function dbAt(stage){
  const lvl=STAGE[stage], out={};
  ['R1','ABR1','ABR2','ASBR'].forEach(id=>{
    let a=T1OF[id].slice();
    if(lvl>=2) a=a.concat(T3[id]);
    if(lvl>=3) a=a.concat(T5);
    if(lvl>=4) a=a.concat(T4[id]);
    out[id]=a;
  });
  return out;
}
const NOTE={
  R1:  {txt:'R1 sees the external network (Type 5) and the path to the ASBR (Type 4) — even though the ASBR lives in another area.'},
  ABR1:{txt:'An ABR holds a Type 1 in EVERY area it belongs to (two 2.2.2.2 entries). Type 3 and Type 4 it regenerates itself.'},
  ABR2:{txt:'ABR2 borders the ASBR\'s area → it is the router that generates the Type 4 into area 0.'},
  ASBR:{txt:'In its own area (Area 2) there is NO Type 4 — here the ASBR is already known from its Type 1.', warn:true},
};

/* ---------- steps ---------- */
const C={t1:'var(--t1)',t3:'var(--t3)',t4:'var(--t4)',t5:'var(--t5)',hello:'var(--hello)'};
const f=(a,b,c)=>({a,b,c});
const hello=()=>{const o=[];LINKS.forEach(l=>{o.push(f(l.a,l.b,'hello'));o.push(f(l.b,l.a,'hello'));});return o;};
const STEPS=[
  {st:'OVERVIEW', title:'Three areas and the roles',
   desc:'<b>Area 0</b> is the backbone — every other area has to talk through it. <b>ABR1</b> and <b>ABR2</b> sit on the boundaries and belong to two areas at once. The <b>ASBR</b> in Area 2 injects the external network <code>172.16.50.0/24</code> into OSPF. Inside each area Type 1 has already converged.',
   flows:[], pkt:null, stage:'t1'},

  {st:'TYPE 1', title:'Type 1 · Router-LSA',
   desc:'Every router describes its own links in a <b>Type 1</b> and floods it <b>only inside its own area</b> — the flood stops at the ABR and no Type 1 crosses into the neighbouring area. That is why an ABR keeps <b>a separate Type 1 in each</b> of its areas.',
   flows:[f('R1','ABR1','t1'),f('ABR1','R1','t1'),f('ABR1','ABR2','t1'),f('ABR2','ABR1','t1'),f('ABR2','ASBR','t1'),f('ASBR','ABR2','t1')],
   pkt:'type1', stage:'t1', hot:['R1','ABR2']},

  {st:'TYPE 3', title:'Type 3 · Summary (Area 1 → Area 0)',
   desc:'ABR1 takes the Area 1 networks and advertises them into Area 0 as <b>Type 3</b>: only a <b>prefix + metric</b>, with none of the neighbouring area\'s topology. <code>Adv Router = 2.2.2.2</code> (ABR1 itself). This is how areas learn each other\'s routes without learning each other\'s detail.',
   flows:[f('ABR1','ABR2','t3')], pkt:'type3', stage:'t3', hot:['ABR1']},

  {st:'TYPE 3', title:'Type 3 · re-advertised across boundaries',
   desc:'ABR2 <b>regenerates</b> the Type 3 onward into Area 2 (now <code>Adv Router = 3.3.3.3</code>). Symmetrically the Area 2 networks travel into Area 0, and ABR1 pushes them on into Area 1. <b>Every ABR originates its own Type 3</b> at its boundary.',
   flows:[f('ABR2','ASBR','t3'),f('ABR2','ABR1','t3'),f('ABR1','R1','t3')], pkt:'type3', stage:'t3', hot:['ABR1','ABR2']},

  {st:'TYPE 5', title:'Type 5 · External (ASBR)',
   desc:'The ASBR redistributes the external <code>172.16.50.0/24</code> and originates a <b>Type 5</b>. It floods <b>across the whole OSPF domain unchanged</b>: in every area <code>Adv Router = 4.4.4.4</code> (the ASBR). The metric type is <b>E2</b> (the default) — the value 20 does not grow along the path.',
   flows:[f('ASBR','ABR2','t5'),f('ABR2','ABR1','t5'),f('ABR1','R1','t5')], pkt:'type5', stage:'t5', hot:['ASBR']},

  {st:'TYPE 4', title:'Type 4 · ASBR-Summary (why it exists)',
   desc:'The Type 5 reached everywhere, but it carries <code>Adv Router = ASBR</code>, and routers in other areas have no idea <b>where the ASBR is</b> — its Type 1 lives only in Area 2. ABR2 originates a <b>Type 4</b> (<code>Link State ID = 4.4.4.4</code>, the ASBR RID) into Area 0; ABR1 regenerates it into Area 1. <b>Inside Area 2 itself no Type 4 is created.</b>',
   flows:[f('ABR2','ABR1','t4'),f('ABR1','R1','t4')], pkt:'type4', stage:'t4', hot:['ABR1','ABR2']},

  {st:'LSDB', title:'The resulting databases, area by area',
   desc:'Click through the routers and compare. Three rules to keep: <b>Type 3</b> — Adv Router is the local ABR; <b>Type 5</b> — Adv Router is the ASBR in every area; <b>Type 4</b> is absent in the ASBR\'s own area.',
   flows:hello(), pkt:null, stage:'t4'},

  {st:'ROUTES', title:'Routing table',
   desc:'SPF plus the inter-area and external routes give the codes: <span class="o">O</span> — intra-area (Type 1), <span class="oia">O IA</span> — inter-area (Type 3), <span class="oe">O E2</span> — external (Type 5). The E2 metric stays 20 and <b>does not depend</b> on the internal cost of the path.',
   flows:hello(), pkt:null, stage:'t4', spf:true},
];

/* routing tables */
const RT={
  R1:[['C','10.1.1.0/24','—','connected (LAN)'],['C','10.1.0.0/30','—','connected'],
      ['O','10.1.9.0/24','110/2','via ABR1 (intra-area)'],
      ['O IA','10.0.0.0/30','110/2','via ABR1 (Type 3)'],
      ['O IA','10.2.0.0/30','110/3','via ABR1 (Type 3)'],
      ['O E2','172.16.50.0/24','110/20','via ABR1 (Type 5)']],
  ABR1:[['C','10.1.0.0/30','—','connected'],['C','10.0.0.0/30','—','connected'],
      ['O','10.1.1.0/24','110/2','via R1 (intra-area)'],
      ['O IA','10.2.0.0/30','110/2','via ABR2 (Type 3)'],
      ['O E2','172.16.50.0/24','110/20','via ABR2 (Type 5)']],
  ABR2:[['C','10.0.0.0/30','—','connected'],['C','10.2.0.0/30','—','connected'],
      ['O IA','10.1.1.0/24','110/3','via ABR1 (Type 3)'],
      ['O IA','10.1.0.0/30','110/2','via ABR1 (Type 3)'],
      ['O E2','172.16.50.0/24','110/20','via ASBR (Type 5)']],
  ASBR:[['C','10.2.0.0/30','—','connected'],['C','172.16.50.0/24','—','redistributed (external)'],
      ['O IA','10.0.0.0/30','110/2','via ABR2 (Type 3)'],
      ['O IA','10.1.1.0/24','110/4','via ABR2 (Type 3)'],
      ['O IA','10.1.0.0/30','110/3','via ABR2 (Type 3)']],
};

/* ---------- state ---------- */
let cur=0, selected='R1', playing=false, playTimer=null;

/* ---------- SVG ---------- */
const svg=document.getElementById('maMap');
function buildMap(){
  let s='';
  ZONES.forEach(z=>{
    s+=`<rect class="zone ${z.cls}" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="14"/>`;
    s+=`<text class="zonelbl ${z.cls}" x="${z.x+12}" y="${z.y+20}">${z.name}</text>`;
  });
  // external cloud + the link from the ASBR
  s+=`<line class="link ext" x1="${cx('ASBR')}" y1="${cy('ASBR')}" x2="${EXT.x}" y2="${EXT.y-18}"/>`;
  s+=`<text class="linklbl" x="${(cx('ASBR')+EXT.x)/2+22}" y="${(cy('ASBR')+EXT.y)/2}">redistribute</text>`;
  s+=`<ellipse class="cloud" cx="${EXT.x}" cy="${EXT.y}" rx="74" ry="30"/>`;
  s+=`<text class="cloudsub" x="${EXT.x}" y="${EXT.y-6}" text-anchor="middle">EXTERNAL (non-OSPF)</text>`;
  s+=`<text class="cloudlbl" x="${EXT.x}" y="${EXT.y+10}" text-anchor="middle">172.16.50.0/24</text>`;
  // links
  LINKS.forEach((l,i)=>{
    const x1=cx(l.a),y1=cy(l.a),x2=cx(l.b),y2=cy(l.b);
    s+=`<line class="link" id="maLn${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    s+=`<text class="linklbl" x="${(x1+x2)/2}" y="${(y1+y2)/2-7}" text-anchor="middle">${l.net}</text>`;
  });
  s+='<g id="maPackets"></g>';
  Object.keys(R).forEach(id=>{
    const o=R[id], x=o.x-NW/2, y=o.y-NH/2;
    s+=`<g class="router ${o.cls}" id="maNd${id}" data-id="${id}" tabindex="0">
      <rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="10"/>
      <text class="role" x="${o.x}" y="${y+14}" text-anchor="middle">${o.role}</text>
      <text class="rname" x="${o.x}" y="${o.y+5}" text-anchor="middle">${o.name}</text>
      <text class="rid" x="${o.x}" y="${o.y+19}" text-anchor="middle">${o.rid}</text>
    </g>`;
  });
  svg.innerHTML=s;
  Object.keys(R).forEach(id=>{
    const el=document.getElementById('maNd'+id);
    el.addEventListener('click',()=>selectRouter(id));
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRouter(id);}});
  });
}

/* animation */
let animFlows=[], phase=0, lastT=0;
function setFlows(flows){ animFlows=flows.map(fl=>({x1:cx(fl.a),y1:cy(fl.a),x2:cx(fl.b),y2:cy(fl.b),c:C[fl.c],small:fl.c==='hello'})); }
function tick(t){
  const dt=lastT?(t-lastT)/1000:0; lastT=t; phase=(phase+dt*0.5)%1;
  const g=document.getElementById('maPackets');
  if(g){ let d='';
    animFlows.forEach((fl,i)=>{ const sp=fl.small?0.09:0.13, fr=(phase+i*sp)%1;
      const px=fl.x1+(fl.x2-fl.x1)*fr, py=fl.y1+(fl.y2-fl.y1)*fr;
      const r=fl.small?3.4:5.5, op=fl.small?0.5:0.95, gl=fl.small?4:7;
      d+=`<circle cx="${px}" cy="${py}" r="${r}" fill="${fl.c}" opacity="${op}" style="filter:drop-shadow(0 0 ${gl}px ${fl.c})"/>`; });
    g.innerHTML=d;
  }
  requestAnimationFrame(tick);
}

/* render one step */
function render(){
  const s=STEPS[cur];
  document.getElementById('maBadge').textContent=s.st;
  document.getElementById('maCounter').textContent=`step ${cur+1} / ${STEPS.length}`;
  document.getElementById('maProg').style.width=((cur+1)/STEPS.length*100)+'%';
  document.getElementById('maDesc').innerHTML=`<b>${s.title}.</b> ${s.desc}`;
  Object.keys(R).forEach(id=>{
    const el=document.getElementById('maNd'+id);
    el.classList.toggle('hot', !!(s.hot&&s.hot.includes(id)));
  });
  markSelected();
  svg.querySelectorAll('.link').forEach(l=>l.classList.remove('active'));
  (s.flows||[]).forEach(fl=>LINKS.forEach((l,i)=>{
    if((l.a===fl.a&&l.b===fl.b)||(l.a===fl.b&&l.b===fl.a)) document.getElementById('maLn'+i).classList.add('active');
  }));
  setFlows(s.flows||[]);
  renderPacket(s.pkt);
  renderLSDB();
  document.getElementById('maPrev').disabled=cur===0;
  document.getElementById('maNext').disabled=cur===STEPS.length-1;
}

function renderPacket(key){
  const box=document.getElementById('maPacket');
  if(!key){ box.innerHTML='<div class="empty">No new LSA is sent on this step.</div>'; return; }
  const p=PKT[key]; let h=`<div class="pkt-meta">${p.meta.map(m=>`<span>${m}</span>`).join('')}</div>`;
  p.secs.forEach(sec=>{
    h+=`<div class="sec ${sec.cls}"><div class="sec-h">${sec.title}</div>`;
    if(sec.sub) h+=`<div class="subhdr">${sec.sub}</div>`;
    h+='<div class="rows">';
    sec.rows.forEach(r=>h+=`<div class="row"><span class="f">${r.f}</span><span class="v">${r.v}${r.n?` <em>· ${r.n}</em>`:''}</span></div>`);
    h+='</div>';
    if(sec.links){ h+=`<div class="subhdr">Links · type · ID · Data · Metric</div><div class="rows">`;
      sec.links.forEach((lk,i)=>h+=`<div class="row"><span class="f">link ${i+1} · ${lk.t}</span><span class="v">ID ${lk.id} · Data ${lk.data} · m ${lk.m}</span></div>`);
      h+='</div>'; }
    h+='</div>';
  });
  box.innerHTML=h;
}

const TYPE_NAME={'1':'Type 1 · Router','3':'Type 3 · Summary','4':'Type 4 · ASBR-Summary','5':'Type 5 · External'};
function renderTabs(){
  const t=document.getElementById('maTabs');
  t.innerHTML=Object.keys(R).map(id=>`<div class="tab ${id===selected?'on':''}" data-id="${id}">${R[id].name}</div>`).join('');
  t.querySelectorAll('.tab').forEach(el=>el.addEventListener('click',()=>selectRouter(el.dataset.id)));
}
function renderLSDB(){
  const s=STEPS[cur], box=document.getElementById('maLsdb');
  if(s.spf){ box.innerHTML=routingTable(selected); return; }
  const db=dbAt(s.stage)[selected]||[];
  let h='';
  ['1','3','4','5'].forEach(tp=>{
    const items=db.filter(e=>e.t===tp);
    if(!items.length) return;
    h+=`<div class="tgroup"><div class="tgroup-h"><span class="tt tt${tp}">T${tp}</span>${TYPE_NAME[tp]}</div>
        <table><thead><tr><th>Link State ID</th><th>Adv Router</th><th>info</th></tr></thead><tbody>`;
    items.forEach(e=>h+=`<tr><td>${e.lsid}</td><td>${e.adv}</td><td>${e.info}</td></tr>`);
    h+='</tbody></table></div>';
  });
  if(!h) h='<div class="empty">LSDB is empty.</div>';
  const n=NOTE[selected];
  if(n) h+=`<div class="note ${n.warn?'warn':''}">${n.txt}</div>`;
  box.innerHTML=h;
}
function routingTable(id){
  let h=`<table><thead><tr><th>code</th><th>network</th><th>AD/metric</th><th>source</th></tr></thead><tbody>`;
  RT[id].forEach(r=>{
    const cls=r[0]==='O E2'?'oe':r[0]==='O IA'?'oia':r[0]==='O'?'o':'ctag';
    h+=`<tr><td class="${cls}">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`;
  });
  h+='</tbody></table>';
  h+=`<div class="note"><span class="ctag">C</span> connected · <span class="o">O</span> intra-area · <span class="oia">O IA</span> inter-area (Type 3) · <span class="oe">O E2</span> external (Type 5). OSPF AD = 110.</div>`;
  return h;
}

function selectRouter(id){ selected=id; renderTabs(); markSelected(); renderLSDB(); }
function markSelected(){ Object.keys(R).forEach(id=>document.getElementById('maNd'+id).classList.toggle('sel',id===selected)); }

function go(d){ cur=Math.max(0,Math.min(STEPS.length-1,cur+d)); render(); }
function reset(){ stopPlay(); cur=0; render(); }
function stopPlay(){ playing=false; clearInterval(playTimer);
  const b=document.getElementById('maPlay'); b.classList.remove('on'); b.textContent='▶▶ auto'; }
function togglePlay(){ if(playing){stopPlay();return;}
  playing=true; const b=document.getElementById('maPlay'); b.classList.add('on'); b.textContent='⏸ pause';
  playTimer=setInterval(()=>{ if(cur>=STEPS.length-1){stopPlay();return;} go(1); },2800); }

document.getElementById('maNext').onclick=()=>{stopPlay();go(1);};
document.getElementById('maPrev').onclick=()=>{stopPlay();go(-1);};
document.getElementById('maReset').onclick=reset;
document.getElementById('maPlay').onclick=togglePlay;
document.addEventListener('keydown',e=>{
  if(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if(e.key==='ArrowRight'){stopPlay();go(1);} if(e.key==='ArrowLeft'){stopPlay();go(-1);} });

buildMap(); renderTabs(); render(); requestAnimationFrame(tick);
})();
</script>
{{< /rawhtml >}}
