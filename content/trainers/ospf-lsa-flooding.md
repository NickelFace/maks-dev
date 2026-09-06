---
title: "OSPF LSA Flooding"
date: 2026-09-06
description: "Watch an LSA propagate hop by hop across a four-router area and see each router's LSDB converge, from Hello to SPF."
kind: "animation"
order: 1
topic: "3.4 · OSPF"
keys: "<kbd>&larr;</kbd> back · <kbd>&rarr;</kbd> next · click a router to open its LSDB"
---

{{< rawhtml >}}
<style>
  #lfWrap{
    --panel:  var(--bg2);
    --panel2: var(--bg3);
    --line:   var(--border);
    --txt:    var(--text);
    --muted:  var(--text2);
    --dim:    var(--text3);
    /* Meaning-carrying colours. No site token fits "a router that has the LSA"
       or "a packet in flight", so they stay literal — but each has a light-theme
       twin below, because the dark-theme values are unreadable on white. */
    --cyan:#00d4ff; --purple:#a78bfa; --green:#10b981; --amber:#f59e0b; --red:#ef4444;
    --mono:'JetBrains Mono', ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace;
    --disp:'Inter', system-ui, sans-serif;
    font-family:var(--mono); font-size:14px; line-height:1.5; color:var(--txt);
    display:block;
  }
  [data-theme="light"] #lfWrap{
    --cyan:#0d7d99; --purple:#6d28d9; --green:#047857; --amber:#b45309; --red:#dc2626;
  }

  #lfWrap .badge-area{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}
  #lfWrap .state-badge{font-family:var(--disp);font-weight:700;font-size:12px;letter-spacing:.5px;
    padding:5px 12px;border-radius:6px;border:1px solid var(--line);
    background:var(--panel2);color:var(--cyan);text-transform:uppercase}
  #lfWrap .step-counter{color:var(--muted);font-size:12px;margin-left:auto}
  #lfWrap .progress{height:4px;background:var(--line);border-radius:99px;overflow:hidden;margin-bottom:14px}
  #lfWrap .progress > i{display:block;height:100%;width:0;
    background:linear-gradient(90deg,var(--cyan),var(--purple),var(--green));
    transition:width .35s ease}

  /* The site's article column is 820px wide, so the original two-column
     desktop split would squeeze the topology SVG down to ~300px. One column. */
  #lfWrap .grid{display:grid;grid-template-columns:1fr;gap:16px}

  #lfWrap .card{background:var(--panel);
    border:1px solid var(--line);border-radius:12px;overflow:hidden;padding:0}
  #lfWrap .card.glow{box-shadow:var(--shadow)}
  #lfWrap .card-h{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line);
    font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted)}
  #lfWrap .card-h .dot{width:8px;height:8px;border-radius:99px;background:var(--cyan);box-shadow:0 0 10px var(--cyan)}
  #lfWrap .card-b{padding:14px}

  #lfWrap svg{width:100%;height:auto;display:block}
  #lfWrap .router rect{fill:var(--panel2);stroke:var(--line);stroke-width:1.5;transition:.25s}
  #lfWrap .router .rid{fill:var(--muted);font:11px var(--mono)}
  #lfWrap .router .rname{fill:var(--txt);font:700 15px var(--disp)}
  #lfWrap .router .nstate{fill:var(--dim);font:10px var(--mono)}
  #lfWrap .router:hover rect{stroke:var(--cyan)}
  #lfWrap .router.sel rect{stroke:var(--cyan);stroke-width:2.5}
  #lfWrap .router.flood rect{stroke:var(--green);stroke-width:2.5;filter:drop-shadow(0 0 8px var(--green))}
  #lfWrap .router.dup rect{stroke:var(--amber);stroke-width:2.5;filter:drop-shadow(0 0 10px var(--amber))}
  #lfWrap .link{stroke:var(--line);stroke-width:2}
  #lfWrap .link.active{stroke:var(--border2);stroke-width:2.5}
  #lfWrap .linklbl{fill:var(--dim);font:10px var(--mono)}

  #lfWrap .controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
  #lfWrap button{font-family:var(--mono);font-size:13px;cursor:pointer;height:auto;
    background:var(--panel2);color:var(--txt);border:1px solid var(--line);
    border-radius:8px;padding:9px 14px;transition:.15s}
  #lfWrap button:hover:not(:disabled){border-color:var(--cyan);color:var(--txt);background:var(--glow)}
  #lfWrap button:disabled{opacity:.4;cursor:not-allowed}
  #lfWrap button.primary{border-color:var(--cyan);color:var(--cyan);background:var(--panel2)}
  #lfWrap button.play.on{border-color:var(--green);color:var(--green)}

  #lfWrap .desc{margin-top:14px;padding:12px 14px;border-left:3px solid var(--cyan);
    background:var(--panel);border-radius:0 8px 8px 0;color:var(--txt);font-size:13px}
  #lfWrap .desc b{color:var(--txt)}
  #lfWrap .desc code{background:var(--panel2);border:1px solid var(--line);border-radius:4px;
    padding:1px 5px;color:var(--green);font-size:12px}

  /* packet view */
  #lfWrap .pkt-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--muted);margin-bottom:10px}
  #lfWrap .pkt-meta span{background:var(--panel2);border:1px solid var(--line);border-radius:5px;padding:3px 8px}
  #lfWrap .sec{border:1px solid var(--line);border-radius:8px;margin-bottom:10px;overflow:hidden}
  #lfWrap .sec-h{padding:7px 11px;font-size:11px;letter-spacing:.8px;text-transform:uppercase;
    background:var(--panel2);border-bottom:1px solid var(--line);font-weight:700}
  #lfWrap .sec.c .sec-h{color:var(--cyan)} #lfWrap .sec.p .sec-h{color:var(--purple)}
  #lfWrap .sec.g .sec-h{color:var(--green)} #lfWrap .sec.a .sec-h{color:var(--amber)}
  #lfWrap .rows{padding:4px 0}
  #lfWrap .row{display:grid;grid-template-columns: 150px 1fr;gap:10px;padding:4px 11px;font-size:12px}
  #lfWrap .row:nth-child(even){background:rgba(127,133,145,.07)}
  #lfWrap .row .f{color:var(--muted)}
  #lfWrap .row .v{color:var(--txt);word-break:break-word}
  #lfWrap .row .v em{color:var(--dim);font-style:normal;font-size:11px}
  #lfWrap .subhdr{padding:5px 11px;font-size:10px;letter-spacing:.6px;color:var(--dim);
    text-transform:uppercase;border-top:1px dashed var(--line)}
  #lfWrap .empty{color:var(--dim);font-size:12px;padding:18px;text-align:center}

  /* lsdb */
  #lfWrap .tabs{display:flex;gap:6px;margin-bottom:10px}
  #lfWrap .tab{font-size:12px;padding:5px 11px;border:1px solid var(--line);border-radius:7px;
    background:var(--panel2);color:var(--muted);cursor:pointer}
  #lfWrap .tab.on{border-color:var(--cyan);color:var(--cyan)}
  #lfWrap table{width:100%;border-collapse:collapse;font-size:11.5px}
  #lfWrap th{text-align:left;color:var(--dim);font-weight:500;padding:6px 8px;border-bottom:1px solid var(--line);
    font-size:10px;letter-spacing:.5px;text-transform:uppercase}
  #lfWrap td{padding:6px 8px;border-bottom:1px solid var(--line);color:var(--txt)}
  #lfWrap td.self{color:var(--green)}
  #lfWrap .own-tag{color:var(--green);font-size:9px;border:1px solid var(--green);border-radius:4px;padding:0 4px;margin-left:4px}
  #lfWrap .lsdb-foot{margin-top:10px;font-size:11px;color:var(--muted)}
  #lfWrap .rt th, #lfWrap .rt td{font-size:11px}
  #lfWrap .o{color:var(--cyan)} #lfWrap .ctag{color:var(--green)}
  #lfWrap .legend{display:flex;gap:14px;flex-wrap:wrap;font-size:10.5px;color:var(--muted);margin-top:10px}
  #lfWrap .legend i{display:inline-block;width:9px;height:9px;border-radius:99px;margin-right:5px;vertical-align:middle}
</style>

<div id="lfWrap">
  <div class="badge-area">
    <span class="state-badge" id="lfBadge">DOWN</span>
    <span class="step-counter" id="lfCounter">step 1 / 13</span>
  </div>
  <div class="progress"><i id="lfProg"></i></div>

  <div class="grid">
    <!-- LEFT: topology + controls -->
    <div class="card glow">
      <div class="card-h"><span class="dot"></span>topology · area 0.0.0.0 · all links point-to-point, cost 1</div>
      <div class="card-b">
        <svg id="lfMap" viewBox="0 0 760 520" role="img" aria-label="OSPF topology"></svg>
        <div class="legend">
          <span><i style="background:var(--cyan)"></i>Hello</span>
          <span><i style="background:var(--purple)"></i>DBD</span>
          <span><i style="background:var(--amber)"></i>LSR / duplicate</span>
          <span><i style="background:var(--green)"></i>LSU (carries the LSA)</span>
        </div>
        <div class="controls">
          <button id="lfReset">&#8634; reset</button>
          <button id="lfPrev">&#9664; back</button>
          <button id="lfNext" class="primary">next &#9654;</button>
          <button id="lfPlay" class="play">&#9654;&#9654; auto</button>
        </div>
        <div class="desc" id="lfDesc"></div>
      </div>
    </div>

    <!-- RIGHT: packet + lsdb -->
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card">
        <div class="card-h"><span class="dot" style="background:var(--purple);box-shadow:0 0 10px var(--purple)"></span>inside the packet</div>
        <div class="card-b"><div id="lfPacket"></div></div>
      </div>
      <div class="card">
        <div class="card-h"><span class="dot" style="background:var(--green);box-shadow:0 0 10px var(--green)"></span>LSDB / table of the selected router</div>
        <div class="card-b">
          <div class="tabs" id="lfTabs"></div>
          <div id="lfLsdb"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
(function(){
/* ---------- topology ---------- */
const R = {
  R1:{name:'R1', rid:'1.1.1.1', x:380, y:70},
  R2:{name:'R2', rid:'2.2.2.2', x:640, y:260},
  R3:{name:'R3', rid:'3.3.3.3', x:380, y:450},
  R4:{name:'R4', rid:'4.4.4.4', x:120, y:260},
};
const LINKS = [
  {a:'R1', b:'R2', net:'10.0.12.0/30'},
  {a:'R2', b:'R3', net:'10.0.23.0/30'},
  {a:'R3', b:'R4', net:'10.0.34.0/30'},
  {a:'R4', b:'R1', net:'10.0.14.0/30'},
];
const NW = 96, NH = 60;            // node size
const cx = id => R[id].x, cy = id => R[id].y;

/* Each router's Router LSA (body) — for the packet panel and the LSDB */
const routerLSA = {
  R1:{seq:'0x80000001', len:60, links:[
    {t:'1 · point-to-point', id:'2.2.2.2', data:'10.0.12.1', m:1},
    {t:'3 · stub network',   id:'10.0.12.0', data:'255.255.255.252', m:1},
    {t:'1 · point-to-point', id:'4.4.4.4', data:'10.0.14.2', m:1},
    {t:'3 · stub network',   id:'10.0.14.0', data:'255.255.255.252', m:1},
  ]},
  R2:{seq:'0x80000001'}, R3:{seq:'0x80000001'}, R4:{seq:'0x80000001'},
};

/* ---------- packets (data → one renderer) ---------- */
const hdr = (type, rid, len) => ({cls:'c', title:'OSPF Header · 24 bytes', rows:[
  {f:'Version', v:'2'},
  {f:'Type', v:type},
  {f:'Packet Length', v:len+' bytes'},
  {f:'Router ID', v:rid, n:'who sent it'},
  {f:'Area ID', v:'0.0.0.0'},
  {f:'Checksum', v:'0x8f3a'},
  {f:'AuType / Auth', v:'0 (none)'},
]});

const PKT = {
  helloInit:{meta:['IP proto 89','dst 224.0.0.5','TTL 1'], secs:[
    hdr('1 · Hello','1.1.1.1',44),
    {cls:'c', title:'Hello payload', rows:[
      {f:'Network Mask', v:'255.255.255.252'},
      {f:'Hello Interval', v:'10 s'},
      {f:'Options', v:'0x02 (E-bit)'},
      {f:'Rtr Priority', v:'1', n:'no DR/BDR election on p2p'},
      {f:'Dead Interval', v:'40 s'},
      {f:'DR / BDR', v:'0.0.0.0 / 0.0.0.0'},
      {f:'Neighbors', v:'— (empty)', n:'not in the neighbour list yet → INIT'},
    ]},
  ]},
  hello2way:{meta:['IP proto 89','dst 224.0.0.5'], secs:[
    hdr('1 · Hello','1.1.1.1',48),
    {cls:'c', title:'Hello payload', rows:[
      {f:'Hello / Dead', v:'10 s / 40 s'},
      {f:'DR / BDR', v:'0.0.0.0 / 0.0.0.0'},
      {f:'Neighbors', v:'2.2.2.2, 4.4.4.4', n:'R1 sees its own RID in the neighbour Hello → 2-WAY'},
    ]},
  ]},
  dbdExStart:{meta:['IP proto 89','dst 224.0.0.5 / unicast'], secs:[
    hdr('2 · DB Description','1.1.1.1',32),
    {cls:'p', title:'DBD payload', rows:[
      {f:'Interface MTU', v:'1500'},
      {f:'Options', v:'0x02'},
      {f:'Flags', v:'I=1  M=1  MS=1', n:'Init / More / Master-Slave'},
      {f:'DD Sequence', v:'0x0a2b'},
      {f:'LSA Headers', v:'— (empty)', n:'master/slave is settled first: the higher Router ID is master'},
    ]},
  ]},
  dbdExchange:{meta:['IP proto 89','unicast'], secs:[
    hdr('2 · DB Description','1.1.1.1',52),
    {cls:'p', title:'DBD payload', rows:[
      {f:'Flags', v:'I=0  M=1  MS=1'},
      {f:'DD Sequence', v:'0x0a2c'},
    ]},
    {cls:'p', title:'LSA Headers (headers only!)', sub:'a table of contents of the database — the LSAs themselves are not sent', rows:[
      {f:'#1', v:'Router-LSA · 1.1.1.1 · seq 0x80000001'},
      {f:'#2', v:'Router-LSA · 4.4.4.4 · seq 0x80000001', n:'R1 already knows part of the database from R4'},
    ]},
  ]},
  lsr:{meta:['IP proto 89','unicast'], secs:[
    hdr('3 · LS Request','1.1.1.1',36),
    {cls:'a', title:'LSR payload', sub:'"send me the LSAs I do not have"', rows:[
      {f:'LS Type', v:'1 (Router-LSA)'},
      {f:'Link State ID', v:'2.2.2.2'},
      {f:'Advertising Router', v:'2.2.2.2'},
    ]},
  ]},
  lsuR1:{meta:['IP proto 89','dst 224.0.0.5'], secs:[
    hdr('4 · LS Update','1.1.1.1',64),
    {cls:'g', title:'LS Update', rows:[ {f:'# LSAs', v:'1'} ]},
    {cls:'g', title:'LSA Header · 20 bytes', rows:[
      {f:'LS Age', v:'1 s'},
      {f:'Options', v:'0x22'},
      {f:'LS Type', v:'1 · Router-LSA', n:'flooded inside the area only'},
      {f:'Link State ID', v:'1.1.1.1'},
      {f:'Advertising Router', v:'1.1.1.1'},
      {f:'LS Sequence', v:'0x80000001', n:'increments on every update'},
      {f:'LS Checksum', v:'0x39ab'},
      {f:'Length', v:'60'},
    ]},
    {cls:'g', title:'Router-LSA body', sub:'describes every link of R1', rows:[
      {f:'Flags', v:'0x00', n:'not an ABR, not an ASBR'},
      {f:'# Links', v:'4'},
    ], links:routerLSA.R1.links},
  ]},
  dupAtR3:{meta:['IP proto 89','dst 224.0.0.5'], secs:[
    hdr('4 · LS Update','4.4.4.4',64),
    {cls:'a', title:'duplicate of the R1 LSA (arrived by the second path)', rows:[
      {f:'Advertising Router', v:'1.1.1.1'},
      {f:'LS Sequence', v:'0x80000001', n:'IDENTICAL to the copy already installed'},
    ]},
    {cls:'a', title:'what R3 does', rows:[
      {f:'Action', v:'do not install it again'},
      {f:'Reply', v:'LSAck (Type 5)', n:'this is how the ring avoids looping the flood'},
    ]},
  ]},
  helloKeep:{meta:['every 10 s','dst 224.0.0.5'], secs:[
    hdr('1 · Hello','1.1.1.1',48),
    {cls:'c', title:'keeping the adjacency alive', rows:[
      {f:'Neighbors', v:'2.2.2.2, 4.4.4.4'},
      {f:'if Hello stops', v:'40 s (Dead) → neighbour DOWN'},
    ]},
  ]},
};

/* ---------- LSDB at each step ---------- */
const own = id => ({type:'1 · Router', advr:R[id].rid, lsid:R[id].rid, seq:'0x80000001', age:'—', self:true});
const lsaOf = id => ({type:'1 · Router', advr:R[id].rid, lsid:R[id].rid, seq:'0x80000001', age:'12'});
const onlyOwn = () => ({R1:[own('R1')], R2:[own('R2')], R3:[own('R3')], R4:[own('R4')]});
const allFour = () => {
  const list = id => ['R1','R2','R3','R4'].map(x => x===id ? own(x) : lsaOf(x));
  return {R1:list('R1'), R2:list('R2'), R3:list('R3'), R4:list('R4')};
};
/* after flooding the R1 LSA */
function floodR1(){
  const db = onlyOwn();
  db.R2 = [own('R2'), lsaOf('R1')];
  db.R4 = [own('R4'), lsaOf('R1')];
  return db;
}
function floodR1toR3(){
  const db = floodR1();
  db.R3 = [own('R3'), lsaOf('R1')];
  return db;
}

/* ---------- steps ---------- */
const STEPS = [
  { st:'DOWN', title:'OSPF enabled',
    desc:'OSPF is up on every interface. Each router immediately builds its <b>own Router-LSA</b> (Type 1) in its LSDB, but knows nothing about its neighbours yet. Neighbour state is <code>Down</code>.',
    flows:[], pkt:null, db:onlyOwn() },

  { st:'INIT', title:'Hello — neighbour discovery',
    desc:'Routers send <b>Hello</b> to <code>224.0.0.5</code>. R1 has received a Hello from R2 but <b>does not yet see itself in the neighbour\'s Neighbors list</b> → state <code>Init</code> (the link is still one-way).',
    flows:bothAll('cyan'), pkt:'helloInit', db:onlyOwn() },

  { st:'2-WAY', title:'2-Way — bidirectional link',
    desc:'The Hello from R2 now carries <code>1.1.1.1</code> in its <b>Neighbors</b> field. Each router sees its own RID at the neighbour → the link is bidirectional, <code>2-Way</code>. On point-to-point links no DR/BDR is elected, so adjacency building starts.',
    flows:bothAll('cyan'), pkt:'hello2way', db:onlyOwn() },

  { st:'EXSTART', title:'ExStart — who is master',
    desc:'Empty <b>DBD</b> packets with the <code>I/M/MS</code> bits negotiate roles. The higher Router ID becomes <b>master</b> and drives the DD Sequence. Here the master is R4 (4.4.4.4).',
    flows:bothAll('purple'), pkt:'dbdExStart', db:onlyOwn() },

  { st:'EXCHANGE', title:'Exchange — trading headers',
    desc:'<b>DBD</b> carries <b>LSA headers only</b> — a table of contents of the database. Each router compares it against its own LSDB and marks what it is missing. The LSAs themselves are not sent here.',
    flows:bothAll('purple'), pkt:'dbdExchange', db:onlyOwn() },

  { st:'LOADING', title:'Loading — LSR / LSU / LSAck',
    desc:'Whatever is missing is asked for with an <b>LSR</b>, the neighbour replies with the full LSA in an <b>LSU</b>, and receipt is confirmed with an <b>LSAck</b>. The LSU is expanded below — inside it sits a whole Router-LSA describing the links.',
    flows:bothAll('green'), pkt:'lsuR1', db:onlyOwn() },

  { st:'FULL', title:'Full — adjacency established',
    desc:'The LSDBs of the two neighbours are synchronised → state <code>Full</code>. From here any change spreads by <b>flooding</b>. Click the routers — direct neighbours already hold matching databases.',
    flows:[], pkt:null, db:onlyOwn() },

  { st:'FLOODING', title:'Flooding — R1 sends out its LSA',
    desc:'R1 sends an LSU with its <b>Router-LSA</b> to both neighbours at once — R2 and R4. They install the LSA in their LSDB, acknowledge with an LSAck and <b>forward it onward</b>. Open R2 and R4 — the LSA from 1.1.1.1 is there.',
    flows:[f('R1','R2','green'), f('R1','R4','green')], pkt:'lsuR1', db:floodR1(), flood:['R1','R2','R4'] },

  { st:'FLOODING', title:'Duplicate: R3 gets the R1 LSA from both sides',
    desc:'R2 and R4 forward the R1 LSA towards R3 at the same time. R3 installs the <b>first</b> copy, recognises the second by <b>the same LS Sequence</b> <code>0x80000001</code> and <b>drops</b> it, answering with an LSAck only. That is how the ring avoids looping the flood.',
    flows:[f('R2','R3','green'), f('R4','R3','amber')], pkt:'dupAtR3', db:floodR1toR3(), flood:['R2','R4'], dup:['R3'] },

  { st:'FLOODING', title:'R2, R3 and R4 flood the same way',
    desc:'The same process runs in parallel for the LSAs from R2, R3 and R4. Within a few hundred milliseconds every router holds all four Router-LSAs.',
    flows:bothAll('green'), pkt:'lsuR1', db:allFour(), flood:['R1','R2','R3','R4'] },

  { st:'SYNCED', title:'LSDB synchronised',
    desc:'Every router now holds an <b>identical</b> LSDB — four Router-LSAs, one per router. That is the point of OSPF: one shared map of the area on every router. Switch the tabs — the databases match.',
    flows:[], pkt:null, db:allFour() },

  { st:'SPF', title:'SPF — computing the routes',
    desc:'On the shared LSDB each router independently runs <b>Dijkstra\'s algorithm (SPF)</b>, puts itself at the root of the tree and computes the shortest paths. The result is <code>O</code> routes in the routing table (AD 110). Below is the selected router\'s table.',
    flows:[], pkt:null, db:allFour(), spf:true },

  { st:'FULL', title:'Steady state',
    desc:'The network has converged. From here on: <b>Hello</b> every 10 s (keepalive) and a periodic LSA <b>refresh</b> every 30 min (LSRefreshTime). An LSA lives at most 60 min (MaxAge), after which it is flushed from the database.',
    flows:bothAll('cyan'), pkt:'helloKeep', db:allFour() },
];

/* flow helpers */
function f(a,b,c){ return {a, b, c}; }
function bothAll(c){
  const out=[];
  LINKS.forEach(l => { out.push(f(l.a,l.b,c)); out.push(f(l.b,l.a,c)); });
  return out;
}

const COLOR = {cyan:'var(--cyan)', purple:'var(--purple)', green:'var(--green)', amber:'var(--amber)'};

/* ---------- state ---------- */
let cur = 0;
let selected = 'R1';
let playing = false, playTimer = null;

/* ---------- SVG (static part) ---------- */
const svg = document.getElementById('lfMap');
function buildMap(){
  let s = '';
  // links + labels
  LINKS.forEach((l,i) => {
    const x1=cx(l.a), y1=cy(l.a), x2=cx(l.b), y2=cy(l.b);
    s += `<line class="link" id="lfLn${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    const mx=(x1+x2)/2, my=(y1+y2)/2;
    s += `<text class="linklbl" x="${mx}" y="${my-6}" text-anchor="middle">${l.net}</text>`;
  });
  // nodes
  s += '<g id="lfPackets"></g>'; // packets above the links, below the nodes
  Object.keys(R).forEach(id => {
    const o=R[id], x=o.x-NW/2, y=o.y-NH/2;
    s += `<g class="router" id="lfNd${id}" data-id="${id}" tabindex="0">
      <rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="11"/>
      <text class="rname" x="${o.x}" y="${o.y-6}" text-anchor="middle">${o.name}</text>
      <text class="rid" x="${o.x}" y="${o.y+11}" text-anchor="middle">${o.rid}</text>
      <text class="nstate" id="lfNs${id}" x="${o.x}" y="${o.y+NH/2+15}" text-anchor="middle"></text>
    </g>`;
  });
  svg.innerHTML = s;
  Object.keys(R).forEach(id => {
    const el = document.getElementById('lfNd'+id);
    el.addEventListener('click', () => selectRouter(id));
    el.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRouter(id);} });
  });
}

/* ---------- packet animation ---------- */
let animFlows = [];
function setFlows(flows){
  animFlows = flows.map(fl => ({
    x1:cx(fl.a), y1:cy(fl.a), x2:cx(fl.b), y2:cy(fl.b), c:COLOR[fl.c]
  }));
}
let phase = 0, lastT = 0;
function tick(t){
  const dt = lastT ? (t-lastT)/1000 : 0; lastT = t;
  phase = (phase + dt*0.55) % 1;
  const g = document.getElementById('lfPackets');
  if(g){
    let dots='';
    animFlows.forEach((fl,i) => {
      const fr = (phase + i*0.12) % 1;
      const px = fl.x1 + (fl.x2-fl.x1)*fr;
      const py = fl.y1 + (fl.y2-fl.y1)*fr;
      dots += `<circle cx="${px}" cy="${py}" r="5.5" fill="${fl.c}" opacity="0.95"
                 style="filter:drop-shadow(0 0 7px ${fl.c})"/>`;
    });
    g.innerHTML = dots;
  }
  requestAnimationFrame(tick);
}

/* ---------- render one step ---------- */
function render(){
  const stp = STEPS[cur];
  document.getElementById('lfBadge').textContent = stp.st;
  document.getElementById('lfCounter').textContent = `step ${cur+1} / ${STEPS.length}`;
  document.getElementById('lfProg').style.width = ((cur+1)/STEPS.length*100)+'%';
  document.getElementById('lfDesc').innerHTML = `<b>${stp.title}.</b> ${stp.desc}`;

  // neighbour state under each node
  Object.keys(R).forEach(id => { document.getElementById('lfNs'+id).textContent = stp.st; });

  // node highlighting
  Object.keys(R).forEach(id => {
    const el = document.getElementById('lfNd'+id);
    el.classList.remove('flood','dup');
    if(stp.flood && stp.flood.includes(id)) el.classList.add('flood');
    if(stp.dup && stp.dup.includes(id)) el.classList.add('dup');
  });
  markSelected();

  // active links
  svg.querySelectorAll('.link').forEach(l=>l.classList.remove('active'));
  (stp.flows||[]).forEach(fl=>{
    LINKS.forEach((l,i)=>{
      if((l.a===fl.a&&l.b===fl.b)||(l.a===fl.b&&l.b===fl.a))
        document.getElementById('lfLn'+i).classList.add('active');
    });
  });

  setFlows(stp.flows||[]);
  renderPacket(stp.pkt);
  renderLSDB();

  document.getElementById('lfPrev').disabled = cur===0;
  document.getElementById('lfNext').disabled = cur===STEPS.length-1;
}

/* packet */
function renderPacket(key){
  const box = document.getElementById('lfPacket');
  if(!key){ box.innerHTML = '<div class="empty">No packets travel the network on this step.</div>'; return; }
  const p = PKT[key];
  let h = `<div class="pkt-meta">${p.meta.map(m=>`<span>${m}</span>`).join('')}</div>`;
  p.secs.forEach(sec=>{
    h += `<div class="sec ${sec.cls}"><div class="sec-h">${sec.title}</div>`;
    if(sec.sub) h += `<div class="subhdr">${sec.sub}</div>`;
    h += '<div class="rows">';
    sec.rows.forEach(r=>{
      h += `<div class="row"><span class="f">${r.f}</span><span class="v">${r.v}${r.n?` <em>· ${r.n}</em>`:''}</span></div>`;
    });
    h += '</div>';
    if(sec.links){
      h += `<div class="subhdr">Links · type · ID · Data · Metric</div><div class="rows">`;
      sec.links.forEach((lk,i)=>{
        h += `<div class="row"><span class="f">link ${i+1} · ${lk.t}</span><span class="v">ID ${lk.id} · Data ${lk.data} · metric ${lk.m}</span></div>`;
      });
      h += '</div>';
    }
    h += '</div>';
  });
  box.innerHTML = h;
}

/* LSDB / routing table */
function renderTabs(){
  const t = document.getElementById('lfTabs');
  t.innerHTML = Object.keys(R).map(id =>
    `<div class="tab ${id===selected?'on':''}" data-id="${id}">${R[id].name}</div>`).join('');
  t.querySelectorAll('.tab').forEach(el =>
    el.addEventListener('click', ()=>selectRouter(el.dataset.id)));
}
function renderLSDB(){
  const stp = STEPS[cur];
  const box = document.getElementById('lfLsdb');
  if(stp.spf){ box.innerHTML = routingTable(selected); return; }
  const db = stp.db[selected] || [];
  if(!db.length){ box.innerHTML = '<div class="empty">LSDB is empty.</div>'; return; }
  let h = `<table><thead><tr><th>LSA Type</th><th>Adv Router</th><th>Link ID</th><th>Seq</th><th>Age</th></tr></thead><tbody>`;
  db.forEach(e=>{
    h += `<tr><td class="${e.self?'self':''}">${e.type}${e.self?'<span class="own-tag">own</span>':''}</td>
          <td>${e.advr}</td><td>${e.lsid}</td><td>${e.seq}</td><td>${e.age}</td></tr>`;
  });
  h += '</tbody></table>';
  h += `<div class="lsdb-foot">LSDB entries: <b style="color:var(--cyan)">${db.length}</b> / 4. Target — the same four Router-LSAs on every router.</div>`;
  box.innerHTML = h;
}

/* routing tables (after SPF) */
const RT = {
  R1:[['C','10.0.12.0/30','—','directly connected'],['C','10.0.14.0/30','—','directly connected'],
      ['O','10.0.23.0/30','110/2','via 10.0.12.2 (R2)'],['O','10.0.34.0/30','110/2','via 10.0.14.1 (R4)']],
  R2:[['C','10.0.12.0/30','—','directly connected'],['C','10.0.23.0/30','—','directly connected'],
      ['O','10.0.34.0/30','110/2','via 10.0.23.2 (R3)'],['O','10.0.14.0/30','110/2','via 10.0.12.1 (R1)']],
  R3:[['C','10.0.23.0/30','—','directly connected'],['C','10.0.34.0/30','—','directly connected'],
      ['O','10.0.12.0/30','110/2','via 10.0.23.1 (R2)'],['O','10.0.14.0/30','110/2','via 10.0.34.2 (R4)']],
  R4:[['C','10.0.34.0/30','—','directly connected'],['C','10.0.14.0/30','—','directly connected'],
      ['O','10.0.12.0/30','110/2','via 10.0.14.2 (R1)'],['O','10.0.23.0/30','110/2','via 10.0.34.1 (R3)']],
};
function routingTable(id){
  let h = `<table class="rt"><thead><tr><th>code</th><th>network</th><th>AD/metric</th><th>next-hop</th></tr></thead><tbody>`;
  RT[id].forEach(r=>{
    const cls = r[0]==='O' ? 'o' : 'ctag';
    h += `<tr><td class="${cls}">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`;
  });
  h += '</tbody></table>';
  h += `<div class="lsdb-foot"><span class="ctag">C</span> — connected · <span class="o">O</span> — OSPF (AD 110). Metric = sum of the interface costs along the path.</div>`;
  return h;
}

/* router selection */
function selectRouter(id){
  selected = id;
  renderTabs(); markSelected(); renderLSDB();
}
function markSelected(){
  Object.keys(R).forEach(id =>
    document.getElementById('lfNd'+id).classList.toggle('sel', id===selected));
}

/* navigation */
function go(d){ cur = Math.max(0, Math.min(STEPS.length-1, cur+d)); render(); }
function reset(){ stopPlay(); cur=0; render(); }
function stopPlay(){ playing=false; clearInterval(playTimer);
  document.getElementById('lfPlay').classList.remove('on');
  document.getElementById('lfPlay').textContent='▶▶ auto'; }
function togglePlay(){
  if(playing){ stopPlay(); return; }
  playing=true;
  const b=document.getElementById('lfPlay'); b.classList.add('on'); b.textContent='⏸ pause';
  playTimer=setInterval(()=>{ if(cur>=STEPS.length-1){stopPlay();return;} go(1); }, 2600);
}

document.getElementById('lfNext').onclick = ()=>{stopPlay();go(1);};
document.getElementById('lfPrev').onclick = ()=>{stopPlay();go(-1);};
document.getElementById('lfReset').onclick = reset;
document.getElementById('lfPlay').onclick = togglePlay;
document.addEventListener('keydown', e=>{
  if(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if(e.key==='ArrowRight'){stopPlay();go(1);}
  if(e.key==='ArrowLeft'){stopPlay();go(-1);}
});

/* start */
buildMap();
renderTabs();
render();
requestAnimationFrame(tick);
})();
</script>
{{< /rawhtml >}}
