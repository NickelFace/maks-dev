---
title: "CCNA Progress Console"
date: 2026-09-06
description: "My own run at the 200-301 blueprint, kept as a console: 53 exam topics, twelve Sunday checkpoints and the weak areas the practice tests turned up, frozen as the schedule finished in August 2026."
group: "tool"
order: 3
topic: "200-301 · study log"
---

This is my study log, not a tracker for you. The blueprint ticks are a fixed snapshot of what I had covered as of 10 June 2026 — they are re-seeded on every load, so checking a box there will not stick. The checkpoint table, weak areas and strong areas are editable and live in your browser's local storage only; nothing is sent anywhere.

{{< rawhtml >}}
<style>
  /* Ported from a standalone dark-only page. Every rule is scoped to #dash:
     the original styled bare body/header/h1/table/th/td/button/input/select/
     section/*, which would otherwise repaint the whole site. Scoping by id
     also outranks trainers.css's .trainer-page rules without renaming
     anything. */
  #dash{
    --d-panel:      var(--bg2);
    --d-panel-2:    var(--bg3);
    --d-line:       var(--border);
    --d-ink:        var(--text);
    --d-ink-dim:    var(--text3);
    --d-strong:     var(--text);
    --d-green:      #3fd17a;
    --d-amber:      #e8b339;
    --d-red:        #e8615a;
    --d-cyan:       #54c2d6;
    --d-accent:     #3fd17a;
    --d-on-accent:  #0b1014;
    --d-ring-hi:    #3fd17a;
    --d-ring-mid:   #54c2d6;
    --d-ring-lo:    #e8b339;
    --d-grid:       rgba(63,209,122,0.022);
    --d-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    --d-display: 'Fraunces', Georgia, serif;
  }
  [data-theme="light"] #dash{
    /* status hues re-picked for >=4.5:1 on the light theme's near-white panel */
    --d-green:      #15803d;
    --d-amber:      #a16207;
    --d-red:        #c2261e;
    --d-cyan:       #0e7490;
    --d-accent:     #15803d;
    --d-on-accent:  #fdfeff;
    --d-ring-hi:    #15803d;
    --d-ring-mid:   #0e7490;
    --d-ring-lo:    #a16207;
    --d-grid:       rgba(21,128,61,0.045);
  }

  #dash *{box-sizing:border-box;margin:0;padding:0}
  #dash{
    margin-top:30px;
    color:var(--d-ink);
    font-family:var(--d-mono);
    font-size:14px;
    line-height:1.5;
    background-image:
      linear-gradient(var(--d-grid) 1px,transparent 1px),
      linear-gradient(90deg,var(--d-grid) 1px,transparent 1px);
    background-size:32px 32px;
  }
  /* neutralise trainers.css's generic control sizing inside the widget */
  #dash button{
    height:auto;display:inline-block;font-family:var(--d-mono);
    background:none;border:1px solid var(--d-line);color:var(--d-ink);
    border-radius:6px;cursor:pointer;
  }
  #dash input,#dash select{height:auto;font-family:var(--d-mono)}

  #dash .kicker{
    color:var(--d-accent);font-size:11px;letter-spacing:3px;
    text-transform:uppercase;font-weight:700;
  }
  #dash .sub{color:var(--d-ink-dim);font-size:13px;margin:6px 0 26px}
  #dash .sub b{color:var(--d-cyan);font-weight:500}

  /* ===== Overall ring + meta ===== */
  #dash .topgrid{
    display:grid;grid-template-columns:200px 1fr;gap:24px;
    align-items:center;margin-bottom:34px;
  }
  #dash .ringbox{
    background:var(--d-panel);border:1px solid var(--d-line);border-radius:14px;
    padding:18px;display:flex;flex-direction:column;align-items:center;gap:6px;
  }
  #dash .ring{position:relative;width:140px;height:140px}
  #dash .ring svg{transform:rotate(-90deg)}
  #dash .ringtrack{stroke:var(--d-line)}
  #dash-ringFill{stroke:var(--d-ring-hi)}
  #dash .ring .pct{
    position:absolute;inset:0;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
  }
  #dash .ring .pct b{font-size:30px;font-weight:800;color:var(--d-strong);line-height:1}
  #dash .ring .pct span{font-size:10px;color:var(--d-ink-dim);letter-spacing:1px;text-transform:uppercase}
  #dash .ringbox small{color:var(--d-ink-dim);font-size:11px;letter-spacing:.5px}

  #dash .metarow{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  #dash .meta{
    background:var(--d-panel);border:1px solid var(--d-line);
    border-radius:12px;padding:14px 16px;
  }
  #dash .meta .lbl{color:var(--d-ink-dim);font-size:10px;text-transform:uppercase;letter-spacing:1.5px}
  #dash .meta .val{font-size:20px;font-weight:700;color:var(--d-strong);margin-top:4px;font-family:var(--d-display)}
  #dash .meta .val.s{font-size:15px;font-family:var(--d-mono)}

  /* ===== Tabs ===== */
  #dash nav.tabs{
    display:flex;gap:4px;margin-bottom:24px;flex-wrap:wrap;
    border:1px solid var(--d-line);border-radius:10px;padding:4px;
    background:var(--d-panel);width:max-content;max-width:100%;
  }
  #dash nav.tabs button{
    background:none;border:none;color:var(--d-ink-dim);font-family:var(--d-mono);
    font-size:12px;font-weight:600;letter-spacing:.5px;padding:8px 16px;
    border-radius:7px;cursor:pointer;transition:all .15s;
  }
  #dash nav.tabs button:hover{color:var(--d-ink)}
  #dash nav.tabs button.on{background:var(--d-accent);color:var(--d-on-accent)}

  #dash section{display:none;animation:dashfade .25s ease}
  #dash section.on{display:block}
  @keyframes dashfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

  /* ===== Domain blocks ===== */
  #dash .domain{
    background:var(--d-panel);border:1px solid var(--d-line);border-radius:14px;
    margin-bottom:14px;overflow:hidden;
  }
  #dash .dhead{
    display:flex;align-items:center;gap:14px;padding:16px 18px;cursor:pointer;
    user-select:none;transition:background .15s;
  }
  #dash .dhead:hover{background:var(--d-panel-2)}
  #dash .dhead .num{font-family:var(--d-display);font-weight:600;font-size:22px;color:var(--d-accent);min-width:38px}
  #dash .dhead .dname{flex:1;min-width:0}
  #dash .dhead .dname b{color:var(--d-strong);font-size:15px;font-weight:700;display:block}
  #dash .dhead .dname span{color:var(--d-ink-dim);font-size:11px}
  #dash .dhead .weight{
    font-size:11px;color:var(--d-cyan);border:1px solid var(--d-line);
    padding:3px 9px;border-radius:20px;letter-spacing:.5px;
  }
  #dash .dbar{width:120px;height:8px;background:var(--d-panel-2);border-radius:5px;overflow:hidden;border:1px solid var(--d-line)}
  #dash .dbar i{display:block;height:100%;background:var(--d-accent);width:0;transition:width .4s ease;border-radius:5px}
  #dash .dpct{font-size:12px;color:var(--d-ink);min-width:38px;text-align:right;font-weight:700}
  #dash .chev{color:var(--d-ink-dim);transition:transform .2s;font-size:12px}
  #dash .domain.open .chev{transform:rotate(90deg)}

  #dash .topics{display:none;border-top:1px solid var(--d-line);padding:6px 18px 14px}
  #dash .domain.open .topics{display:block}
  #dash .topic{
    display:flex;align-items:flex-start;gap:12px;padding:9px 0;
    border-bottom:1px dashed var(--d-line);
  }
  #dash .topic:last-child{border-bottom:none}
  #dash .topic label{display:flex;align-items:flex-start;gap:11px;cursor:pointer;flex:1}
  #dash .topic input{
    appearance:none;width:18px;height:18px;border:1.5px solid var(--d-line);border-radius:5px;
    background:var(--d-panel-2);cursor:pointer;flex-shrink:0;margin-top:1px;position:relative;transition:all .15s;
  }
  #dash .topic input:checked{background:var(--d-accent);border-color:var(--d-accent)}
  #dash .topic input:checked::after{
    content:"";position:absolute;left:5px;top:1px;width:5px;height:10px;
    border:solid var(--d-on-accent);border-width:0 2px 2px 0;transform:rotate(45deg);
  }
  #dash .topic .ref{color:var(--d-accent);font-size:11px;font-weight:700;min-width:34px}
  #dash .topic .txt{color:var(--d-ink);font-size:13px;line-height:1.45}
  #dash .topic input:checked ~ .txt,#dash .topic.done .txt{color:var(--d-ink-dim);text-decoration:line-through}

  /* ===== Checkpoints ===== */
  #dash table{width:100%;border-collapse:collapse;font-size:12.5px}
  #dash .tablewrap{background:var(--d-panel);border:1px solid var(--d-line);border-radius:14px;overflow:hidden;overflow-x:auto}
  #dash th{
    background:var(--d-panel-2);color:var(--d-ink-dim);text-transform:uppercase;letter-spacing:1px;
    font-size:10px;font-weight:700;text-align:left;padding:12px 12px;
    border-bottom:1px solid var(--d-line);white-space:nowrap;
  }
  #dash td{padding:10px 12px;border-bottom:1px solid var(--d-line);vertical-align:middle;color:var(--d-ink)}
  #dash tr:last-child td{border-bottom:none}
  #dash tr.cp-row:hover{background:var(--d-panel-2)}
  #dash td .wk{color:var(--d-accent);font-weight:700}
  #dash td .dt{color:var(--d-ink-dim);font-size:11px;white-space:nowrap}
  #dash td input[type=checkbox]{
    appearance:none;width:16px;height:16px;border:1.5px solid var(--d-line);border-radius:4px;
    background:var(--d-panel-2);cursor:pointer;position:relative;transition:all .15s;
  }
  #dash td input[type=checkbox]:checked{background:var(--d-green);border-color:var(--d-green)}
  #dash td input[type=checkbox]:checked::after{
    content:"";position:absolute;left:4px;top:0px;width:4px;height:9px;
    border:solid var(--d-on-accent);border-width:0 2px 2px 0;transform:rotate(45deg);
  }
  #dash td input[type=text]{
    background:var(--d-panel-2);border:1px solid var(--d-line);border-radius:6px;color:var(--d-ink);
    font-family:var(--d-mono);font-size:12px;padding:5px 8px;width:100%;min-width:80px;
  }
  #dash td input[type=text]:focus{outline:none;border-color:var(--d-accent);box-shadow:none}
  #dash td input[type=text]::placeholder{color:var(--d-ink-dim);opacity:.5}

  /* ===== Weak / strong areas ===== */
  #dash .wa-add{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}
  #dash .wa-add input,#dash .wa-add select{
    background:var(--d-panel);border:1px solid var(--d-line);border-radius:8px;color:var(--d-ink);
    font-family:var(--d-mono);font-size:13px;padding:10px 12px;
  }
  #dash .wa-add input{flex:1;min-width:200px}
  #dash .wa-add input:focus,#dash .wa-add select:focus{outline:none;border-color:var(--d-accent);box-shadow:none}
  #dash .wa-add button{
    background:var(--d-accent);color:var(--d-on-accent);border:none;border-radius:8px;font-family:var(--d-mono);
    font-weight:700;font-size:13px;padding:10px 20px;cursor:pointer;letter-spacing:.5px;transition:opacity .15s;
  }
  #dash .wa-add button:hover{opacity:.85}
  #dash .wa-item{
    display:flex;align-items:center;gap:12px;background:var(--d-panel);border:1px solid var(--d-line);
    border-left:3px solid var(--d-amber);border-radius:10px;padding:13px 16px;margin-bottom:9px;transition:all .2s;
  }
  #dash .wa-item.resolved{border-left-color:var(--d-green);opacity:.6}
  #dash .wa-item.strong{border-left-color:var(--d-green)}
  #dash .wa-item .dom{font-size:10px;color:var(--d-cyan);text-transform:uppercase;letter-spacing:1px;min-width:54px}
  #dash .wa-item .desc{flex:1;font-size:13px;color:var(--d-ink)}
  #dash .wa-item.resolved .desc{text-decoration:line-through;color:var(--d-ink-dim)}
  #dash .wa-item button{
    background:none;border:1px solid var(--d-line);color:var(--d-ink-dim);border-radius:6px;
    font-family:var(--d-mono);font-size:11px;padding:5px 11px;cursor:pointer;transition:all .15s;white-space:nowrap;
  }
  #dash .wa-item button:hover{border-color:var(--d-accent);color:var(--d-accent)}
  #dash .wa-item .del:hover{border-color:var(--d-red);color:var(--d-red)}
  #dash .empty{color:var(--d-ink-dim);font-size:13px;text-align:center;padding:30px;font-style:italic}

  #dash .secttitle{font-family:var(--d-display);font-size:24px;color:var(--d-strong);font-weight:600;margin:0 0 4px}
  #dash .sectsub{color:var(--d-ink-dim);font-size:12px;margin-bottom:20px}

  #dash footer{
    margin-top:40px;padding-top:18px;border-top:1px solid var(--d-line);color:var(--d-ink-dim);
    font-size:11px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;align-items:center;
  }
  #dash .save-dot{display:inline-flex;align-items:center;gap:6px}
  #dash .save-dot i{width:7px;height:7px;border-radius:50%;background:var(--d-green);box-shadow:0 0 8px var(--d-green)}
  #dash .reset{
    background:none;border:1px solid var(--d-line);color:var(--d-ink-dim);border-radius:6px;
    font-family:var(--d-mono);font-size:11px;padding:5px 11px;cursor:pointer;
  }
  #dash .reset:hover{border-color:var(--d-red);color:var(--d-red)}

  @media(max-width:720px){
    #dash .topgrid{grid-template-columns:1fr}
    #dash .metarow{grid-template-columns:1fr 1fr}
    #dash .dbar{display:none}
  }
</style>

<div id="dash">
  <div class="kicker">&#9656; Cisco Certified Network Associate &middot; 200-301 v1.1</div>
  <div class="sub">Ran <b>2 Jun &ndash; 24 Aug 2026</b> &middot; checkpoint <b>every Sunday</b> &middot; target exam window <b>17&ndash;24 Aug 2026</b></div>

  <div class="topgrid">
    <div class="ringbox">
      <div class="ring">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle class="ringtrack" cx="70" cy="70" r="60" fill="none" stroke-width="12"/>
          <circle id="dash-ringFill" cx="70" cy="70" r="60" fill="none" stroke-width="12"
                  stroke-linecap="round" stroke-dasharray="377" stroke-dashoffset="377"
                  style="transition:stroke-dashoffset .6s ease"/>
        </svg>
        <div class="pct"><b id="dash-ovPct">0%</b><span>blueprint</span></div>
      </div>
      <small id="dash-ovCount">0 / 53 topics</small>
    </div>

    <div class="metarow">
      <div class="meta"><div class="lbl">Current week</div><div class="val" id="dash-curWeek">&mdash;</div></div>
      <div class="meta"><div class="lbl">Checkpoints closed</div><div class="val" id="dash-cpDone">0 / 12</div></div>
      <div class="meta"><div class="lbl">Exam window</div><div class="val s" id="dash-daysLeft">&mdash;</div></div>
      <div class="meta"><div class="lbl">Last Boson</div><div class="val s" id="dash-lastBoson">&mdash; %</div></div>
      <div class="meta"><div class="lbl">Active weak areas</div><div class="val" id="dash-waCount">0</div></div>
      <div class="meta"><div class="lbl">Boson #3 target</div><div class="val s">&ge; 85%</div></div>
    </div>
  </div>

  <nav class="tabs">
    <button class="on" data-tab="dash-track">&#9656; Blueprint</button>
    <button data-tab="dash-cp">&#9656; Checkpoints</button>
    <button data-tab="dash-wa">&#9656; Weak areas</button>
    <button data-tab="dash-st">&#9656; Strong areas</button>
  </nav>

  <!-- ===== TAB: TRACKER ===== -->
  <section class="on" id="dash-track"></section>

  <!-- ===== TAB: CHECKPOINTS ===== -->
  <section id="dash-cp">
    <div class="secttitle">Sunday checkpoints</div>
    <div class="sectsub">A 20-minute ritual every Sunday: video &#10003; &middot; lab from memory &#10003; &middot; test % &middot; carry the tail forward</div>
    <div class="tablewrap">
      <table>
        <thead><tr>
          <th>#</th><th>Sunday</th><th>Focus</th><th>Video</th><th>Lab</th><th>Test %</th><th>Anki</th><th>Carry &Delta;</th>
        </tr></thead>
        <tbody id="dash-cpBody"></tbody>
      </table>
    </div>
  </section>

  <!-- ===== TAB: WEAK AREAS ===== -->
  <section id="dash-wa">
    <div class="secttitle">Weak areas</div>
    <div class="sectsub">Topics pulled out of the Boson/Sybex error review. The goal by exam day is an empty list, or every item resolved.</div>
    <div class="wa-add">
      <select id="dash-waDom">
        <option value="D1">D1</option><option value="D2">D2</option><option value="D3">D3</option>
        <option value="D4">D4</option><option value="D5">D5</option><option value="D6">D6</option>
      </select>
      <input id="dash-waText" type="text" placeholder="What is weak (e.g. wildcard mask, OSPF DR election)&hellip;">
      <button id="dash-waAdd">+ Add</button>
    </div>
    <div id="dash-waList"></div>
  </section>

  <!-- ===== TAB: STRONG AREAS ===== -->
  <section id="dash-st">
    <div class="secttitle">Strong areas</div>
    <div class="sectsub">Anchor topics carried over from background (MikroTik / LPIC) and from the parts of the blueprint already closed. Minimum time goes here &mdash; revision only, to calibrate against Cisco syntax.</div>
    <div class="wa-add">
      <select id="dash-stDom">
        <option value="D1">D1</option><option value="D2">D2</option><option value="D3">D3</option>
        <option value="D4">D4</option><option value="D5">D5</option><option value="D6">D6</option>
      </select>
      <input id="dash-stText" type="text" placeholder="Strong topic (e.g. subnetting, OSPF theory)&hellip;">
      <button id="dash-stAdd">+ Add</button>
    </div>
    <div id="dash-stList"></div>
  </section>

  <footer>
    <span class="save-dot"><i></i> Checkpoints and area lists are saved automatically in this browser</span>
    <button class="reset" id="dash-resetBtn">reset all progress</button>
  </footer>
</div>

<script>
(function(){
/* ===================== DATA ===================== */
const DOMAINS=[
  {n:"1.0",name:"Network Fundamentals",weight:"20%",topics:[
    ["1.1","Role and function of network components (routers, L2/L3 switches, NGFW, IPS, APs, WLC, endpoints, servers, PoE)"],
    ["1.2","Characteristics of topology architectures (2-tier, 3-tier, spine-leaf, WAN, SOHO, on-prem/cloud)"],
    ["1.3","Physical interfaces and cabling types"],
    ["1.4","Interface and cable issues (collisions, errors, duplex/speed mismatch)"],
    ["1.5","TCP vs UDP"],
    ["1.6","IPv4 addressing and subnetting &mdash; configure and verify"],
    ["1.7","The need for private IPv4 addressing"],
    ["1.8","IPv6 addressing and prefix &mdash; configure and verify"],
    ["1.9","IPv6 address types (GUA, ULA, link-local, anycast, multicast, EUI-64)"],
    ["1.10","Verify IP parameters on client operating systems (Win/macOS/Linux)"],
    ["1.11","Wireless principles (2.4/5GHz channels, SSID, RF, encryption)"],
    ["1.12","Virtualization fundamentals (server virtualization, containers, VRF)"],
    ["1.13","Switching concepts (MAC learning/aging, frame switching/flooding, MAC table)"],
  ]},
  {n:"2.0",name:"Network Access",weight:"20%",topics:[
    ["2.1","VLANs (normal range) spanning multiple switches (access data/voice, default VLAN, inter-VLAN)"],
    ["2.2","Interswitch connectivity (trunk ports, 802.1Q, native VLAN)"],
    ["2.3","L2 discovery protocols (CDP, LLDP)"],
    ["2.4","L2/L3 EtherChannel (LACP)"],
    ["2.5","Rapid PVST+ Spanning Tree (root port/bridge, port states, PortFast)"],
    ["2.6","Cisco Wireless Architectures and AP modes (autonomous, cloud, split-MAC)"],
    ["2.7","Physical connections of WLAN components"],
    ["2.8","Management access to AP/WLC (Telnet, SSH, HTTP/S, console, TACACS+/RADIUS)"],
    ["2.9","WLAN GUI configuration for client connectivity (WLAN, security, QoS profiles, advanced)"],
  ]},
  {n:"3.0",name:"IP Connectivity",weight:"25%",topics:[
    ["3.1","Routing table components (code, prefix, mask, next hop, AD, metric, gateway of last resort)"],
    ["3.2","How a router makes a forwarding decision (LPM, AD, metric)"],
    ["3.3","IPv4/IPv6 static routing (default, network, host, floating static)"],
    ["3.4","Single-area OSPFv2 (adjacency, point-to-point, broadcast DR/BDR, router ID)"],
    ["3.5","Purpose, functions and concepts of FHRP"],
  ]},
  {n:"4.0",name:"IP Services",weight:"10%",topics:[
    ["4.1","Inside source NAT (static and pools)"],
    ["4.2","NTP in client and server mode"],
    ["4.3","Role of DHCP and DNS in the network"],
    ["4.4","Function of SNMP"],
    ["4.5","Syslog (facilities and levels)"],
    ["4.6","DHCP client and relay"],
    ["4.7","Per-hop behavior (PHB) for QoS (classification, marking, queuing, policing, shaping)"],
    ["4.8","Remote access over SSH"],
    ["4.9","Capabilities of TFTP/FTP"],
  ]},
  {n:"5.0",name:"Security Fundamentals",weight:"15%",topics:[
    ["5.1","Key security concepts (threats, vulnerabilities, exploits, mitigation)"],
    ["5.2","Elements of a security program (awareness, training, physical access)"],
    ["5.3","Device access control using local passwords"],
    ["5.4","Password policy (management, complexity, MFA, biometrics, certificates)"],
    ["5.5","IPsec remote-access and site-to-site VPN"],
    ["5.6","Access Control Lists (ACL)"],
    ["5.7","L2 security (DHCP snooping, DAI, port security)"],
    ["5.8","AAA &mdash; authentication, authorization, accounting"],
    ["5.9","Wireless security (WPA, WPA2, WPA3)"],
    ["5.10","WLAN in the GUI using WPA2 PSK"],
  ]},
  {n:"6.0",name:"Automation &amp; Programmability",weight:"10%",topics:[
    ["6.1","How automation impacts network management"],
    ["6.2","Traditional vs controller-based networking"],
    ["6.3","SDN architecture (overlay/underlay/fabric, control/data plane, NB/SB API)"],
    ["6.4","AI, predictive AI, generative AI"],
    ["6.5","REST APIs (CRUD, HTTP verbs, data encoding)"],
    ["6.6","Configuration management &mdash; Puppet, Chef, Ansible"],
    ["6.7","Components of JSON-encoded data"],
  ]},
];

const CHECKPOINTS=[
  ["1","08 Jun","D1 pt.1 &mdash; fundamentals + IOS CLI"],
  ["2","15 Jun","D1 pt.2 &mdash; subnetting + IPv6"],
  ["3","22 Jun","D2 pt.1 &mdash; VLAN / CDP-LLDP"],
  ["4","29 Jun","D2 pt.2 &mdash; STP / EtherChannel / WLC &#9888;"],
  ["5","06 Jul","D3 pt.1 &mdash; routing table / static"],
  ["6","13 Jul","D3 pt.2 &mdash; OSPFv2 / FHRP"],
  ["7","20 Jul","D4 &mdash; IP Services"],
  ["8","27 Jul","D5 &mdash; Security / ACL &#9888;"],
  ["9","03 Aug","D6 &mdash; Automation &#9888;"],
  ["10","10 Aug","Mega Lab + Boson #1"],
  ["11","17 Aug","Weak areas + Boson #2"],
  ["12","24 Aug","Boson #3 + EXAM"],
];

const TOTAL=DOMAINS.reduce((s,d)=>s+d.topics.length,0); // 53

/* ===================== STATE ===================== */
let STATE={topics:{},cp:{},wa:[],strong:[]};
const KEY='ccna200301_v11_progress';

/* Starting snapshot from PLAN.md / weak-areas.md (10 Jun 2026).
   Applied on first open only - everything else then lives in localStorage. */
/* Built from an array rather than an object literal on purpose: Hugo's JS
   minifier rewrites the quoted key "1.10" to the bare numeric literal 1.10,
   which JS reads as the property 1.1 - silently colliding with topic 1.1 and
   dropping 1.10 from the snapshot. String keys assigned at runtime survive. */
const SEED_TOPICS=["1.1","1.2","1.5","1.6","1.7","1.10","1.13"];
const SEED={
  topics:SEED_TOPICS.reduce(function(o,k){o[k]=true;return o;},{}),
  cp:{},
  wa:[
    {dom:"D1",text:"Protocol field in the IP header - 1=ICMP, 6=TCP, 17=UDP, 89=OSPF",resolved:false},
    {dom:"D1",text:"Wireless: 2.4GHz non-overlapping 1/6/11 - WPA2=AES(CCMP), WPA=TKIP",resolved:false},
    {dom:"D1",text:"P2P mask is /30 by default, /31 only when explicitly stated",resolved:true},
    {dom:"D1",text:"/23 subnetting - the third octet is the unit, do not subtract 1",resolved:true}
  ],
  strong:[
    {dom:"D1",text:"Subnetting / VLSM to reflex (MTCNA + 1.6 done)"},
    {dom:"D1",text:"IPv4 addressing and private RFC1918 (1.6 / 1.7 done)"},
    {dom:"D1",text:"TCP vs UDP, ports, sequencing (1.5 done)"},
    {dom:"D1",text:"Network components and topologies (1.1 / 1.2 done)"},
    {dom:"D1",text:"IPv6 basics: SLAAC, EUI-64, address types (MTCIPv6E) - Cisco verify still to add"},
    {dom:"D3",text:"OSPF theory (MikroTik) - Cisco syntax and DR/BDR still to add"},
    {dom:"D5",text:"Linux iptables / DNS / DHCP / SSH (LPIC-2) - the foundation for D4-D5"}
  ]
};

function load(){
  try{
    const r=localStorage.getItem(KEY);
    STATE = r ? JSON.parse(r) : JSON.parse(JSON.stringify(SEED));
  }catch(e){ STATE=JSON.parse(JSON.stringify(SEED)); }
  if(!STATE.topics)STATE.topics={};
  if(!STATE.cp)STATE.cp={};
  if(!STATE.wa)STATE.wa=[];
  if(!STATE.strong)STATE.strong=[];
  // topic progress is maintained in SEED.topics (the source of truth) - it overrides localStorage
  STATE.topics=JSON.parse(JSON.stringify(SEED.topics));
}
let saveTimer=null;
function save(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    try{localStorage.setItem(KEY,JSON.stringify(STATE));}catch(e){console.error('save failed',e);}
  },250);
}

/* ===================== RENDER: TRACKER ===================== */
function renderTracker(){
  const root=document.getElementById('dash-track');
  root.innerHTML='';
  DOMAINS.forEach((d,di)=>{
    const done=d.topics.filter(t=>STATE.topics[t[0]]).length;
    const pct=Math.round(done/d.topics.length*100);
    const wrap=document.createElement('div');
    wrap.className='domain'+(di===0?' open':'');
    wrap.innerHTML=`
      <div class="dhead">
        <span class="num">${d.n.split('.')[0]}</span>
        <span class="dname"><b>${d.name}</b><span>${done}/${d.topics.length} topics</span></span>
        <span class="weight">${d.weight}</span>
        <span class="dbar"><i style="width:${pct}%"></i></span>
        <span class="dpct">${pct}%</span>
        <span class="chev">&#9654;</span>
      </div>
      <div class="topics">
        ${d.topics.map(t=>`
          <div class="topic">
            <label>
              <input type="checkbox" data-t="${t[0]}" ${STATE.topics[t[0]]?'checked':''}>
              <span class="ref">${t[0]}</span>
              <span class="txt">${t[1]}</span>
            </label>
          </div>`).join('')}
      </div>`;
    wrap.querySelector('.dhead').addEventListener('click',e=>{
      if(e.target.closest('label'))return;
      wrap.classList.toggle('open');
    });
    wrap.querySelectorAll('input[type=checkbox]').forEach(cb=>{
      cb.addEventListener('change',()=>{
        STATE.topics[cb.dataset.t]=cb.checked;
        save();renderTracker();updateOverview();
      });
    });
    root.appendChild(wrap);
  });
}

/* ===================== RENDER: CHECKPOINTS ===================== */
function renderCheckpoints(){
  const body=document.getElementById('dash-cpBody');
  body.innerHTML='';
  CHECKPOINTS.forEach(c=>{
    const id=c[0];
    const st=STATE.cp[id]||{};
    const tr=document.createElement('tr');
    tr.className='cp-row';
    tr.innerHTML=`
      <td><span class="wk">${id}</span></td>
      <td><span class="dt">${c[1]}</span></td>
      <td>${c[2]}</td>
      <td><input type="checkbox" data-cp="${id}" data-f="video" ${st.video?'checked':''}></td>
      <td><input type="checkbox" data-cp="${id}" data-f="lab" ${st.lab?'checked':''}></td>
      <td><input type="text" data-cp="${id}" data-f="test" value="${st.test||''}" placeholder="&mdash;"></td>
      <td><input type="checkbox" data-cp="${id}" data-f="anki" ${st.anki?'checked':''}></td>
      <td><input type="text" data-cp="${id}" data-f="delta" value="${st.delta||''}" placeholder="&mdash;"></td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll('input').forEach(inp=>{
    const ev=inp.type==='checkbox'?'change':'input';
    inp.addEventListener(ev,()=>{
      const id=inp.dataset.cp,f=inp.dataset.f;
      if(!STATE.cp[id])STATE.cp[id]={};
      STATE.cp[id][f]=inp.type==='checkbox'?inp.checked:inp.value;
      save();updateOverview();
    });
  });
}

/* ===================== RENDER: WEAK AREAS ===================== */
function renderWA(){
  const list=document.getElementById('dash-waList');
  list.innerHTML='';
  if(STATE.wa.length===0){
    list.innerHTML='<div class="empty">List empty &mdash; which is the goal by exam day.</div>';
  }
  STATE.wa.forEach((w,i)=>{
    const el=document.createElement('div');
    el.className='wa-item'+(w.resolved?' resolved':'');
    el.innerHTML=`
      <span class="dom">${w.dom}</span>
      <span class="desc">${w.text.replace(/</g,'&lt;')}</span>
      <button class="tg">${w.resolved?'&#8634; reopen':'&#10003; resolved'}</button>
      <button class="del">&#10005;</button>`;
    el.querySelector('.tg').addEventListener('click',()=>{STATE.wa[i].resolved=!STATE.wa[i].resolved;save();renderWA();updateOverview();});
    el.querySelector('.del').addEventListener('click',()=>{STATE.wa.splice(i,1);save();renderWA();updateOverview();});
    list.appendChild(el);
  });
}
function addWA(){
  const t=document.getElementById('dash-waText'),d=document.getElementById('dash-waDom');
  if(!t.value.trim())return;
  STATE.wa.push({dom:d.value,text:t.value.trim(),resolved:false});
  t.value='';save();renderWA();updateOverview();
}

/* ===================== RENDER: STRONG AREAS ===================== */
function renderStrong(){
  const list=document.getElementById('dash-stList');
  list.innerHTML='';
  if(STATE.strong.length===0){
    list.innerHTML='<div class="empty">No strong topics marked yet.</div>';
  }
  STATE.strong.forEach((w,i)=>{
    const el=document.createElement('div');
    el.className='wa-item strong';
    el.innerHTML=`
      <span class="dom">${w.dom}</span>
      <span class="desc">${w.text.replace(/</g,'&lt;')}</span>
      <button class="del">&#10005;</button>`;
    el.querySelector('.del').addEventListener('click',()=>{STATE.strong.splice(i,1);save();renderStrong();});
    list.appendChild(el);
  });
}
function addStrong(){
  const t=document.getElementById('dash-stText'),d=document.getElementById('dash-stDom');
  if(!t.value.trim())return;
  STATE.strong.push({dom:d.value,text:t.value.trim()});
  t.value='';save();renderStrong();
}

/* ===================== OVERVIEW ===================== */
function currentWeek(){
  const start=new Date(2026,5,2); // 2 Jun 2026
  const now=new Date();
  const diff=Math.floor((now-start)/(7*864e5))+1;
  if(diff<1)return"before start";
  if(diff>12)return"finished";
  return"Week "+diff;
}
function daysToExam(){
  const open=new Date(2026,7,17);            // 17 Aug 2026
  const close=new Date(2026,7,24,23,59,59);  // 24 Aug 2026, end of day
  const now=new Date();
  const d=Math.ceil((open-now)/864e5);
  if(d>0)return d+" days";
  return now<=close?"window open":"window closed";
}
function updateOverview(){
  const done=Object.values(STATE.topics).filter(Boolean).length;
  const pct=Math.round(done/TOTAL*100);
  document.getElementById('dash-ovPct').textContent=pct+'%';
  document.getElementById('dash-ovCount').textContent=done+' / '+TOTAL+' topics';
  const circ=377, off=circ-(circ*pct/100);
  const ring=document.getElementById('dash-ringFill');
  ring.style.strokeDashoffset=off;
  ring.style.stroke = pct>=85?'var(--d-ring-hi)':pct>=50?'var(--d-ring-mid)':'var(--d-ring-lo)';

  document.getElementById('dash-curWeek').textContent=currentWeek();
  document.getElementById('dash-daysLeft').textContent=daysToExam();

  const cpDone=CHECKPOINTS.filter(c=>{const s=STATE.cp[c[0]];return s&&(s.video||s.lab||s.anki||s.test);}).length;
  document.getElementById('dash-cpDone').textContent=cpDone+' / 12';

  // last boson - look at cp 10, 11, 12 test fields
  let lb='—';
  ['12','11','10'].forEach(id=>{const s=STATE.cp[id];if(lb==='—'&&s&&s.test)lb=s.test;});
  document.getElementById('dash-lastBoson').textContent=(lb==='—'?'—':lb)+(lb!=='—'&&!/%/.test(lb)?' %':'');

  const waActive=STATE.wa.filter(w=>!w.resolved).length;
  document.getElementById('dash-waCount').textContent=waActive;
}

/* ===================== TABS ===================== */
document.querySelectorAll('#dash nav.tabs button').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('#dash nav.tabs button').forEach(x=>x.classList.remove('on'));
    document.querySelectorAll('#dash section').forEach(s=>s.classList.remove('on'));
    b.classList.add('on');
    document.getElementById(b.dataset.tab).classList.add('on');
  });
});
document.getElementById('dash-waAdd').addEventListener('click',addWA);
document.getElementById('dash-waText').addEventListener('keydown',e=>{if(e.key==='Enter')addWA();});
document.getElementById('dash-stAdd').addEventListener('click',addStrong);
document.getElementById('dash-stText').addEventListener('keydown',e=>{if(e.key==='Enter')addStrong();});
document.getElementById('dash-resetBtn').addEventListener('click',()=>{
  if(!confirm('Reset everything back to the starting snapshot? This cannot be undone.'))return;
  STATE=JSON.parse(JSON.stringify(SEED));
  try{localStorage.setItem(KEY,JSON.stringify(STATE));}catch(e){}
  renderTracker();renderCheckpoints();renderWA();renderStrong();updateOverview();
});

/* ===================== INIT ===================== */
load();
renderTracker();renderCheckpoints();renderWA();renderStrong();updateOverview();
})();
</script>
{{< /rawhtml >}}
