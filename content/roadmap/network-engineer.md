---
title: "Network Engineer Roadmap"
description: "OTUS Network Engineer Course: 17 labs from VLAN to capstone, status PASSED"
page_lang: "en"
lang_pair: "/roadmap/ru/network-engineer/"
cert_link: "/certs/network-engineer/"
cert_name: "Network Engineer"
store_key: "rdm.neteng"
total: 17
total_label: "labs"
---

<div class="rdm-eyebrow">§ Network Engineer Roadmap · 2024–2025</div>
<h1 class="rdm-h1">Routing <em>and switching.</em></h1>
<p class="rdm-lead">17 labs from the OTUS Network Engineer course, built in Cisco IOS and written up in EN/RU. This roadmap is a retrospective: what I did and where to find the detail.</p>

<div class="params-grid">
<div class="param-card"><div class="param-label">Course</div><div class="param-value">OTUS Network Engineer</div></div>
<div class="param-card"><div class="param-label">Duration</div><div class="param-value">6 months</div></div>
<div class="param-card"><div class="param-label">Labs</div><div class="param-value">17</div></div>
<div class="param-card"><div class="param-label">Tools</div><div class="param-value">Cisco IOS · GNS3 · EVE-NG</div></div>
<div class="param-card"><div class="param-label">Cert</div><div class="param-value">PASSED</div></div>
<div class="param-card"><div class="param-label">Year</div><div class="param-value">2024–2025</div></div>
</div>

<div class="overall-progress">
<div class="op-header">
<span class="op-title">Overall progress</span>
<span class="op-count" id="op-count">17 / 17 labs · 100%</span>
</div>
<div class="op-bar"><div class="op-fill" id="op-fill" style="width:100%"></div></div>
<div class="op-domains">
<span class="op-domain">L2 <strong>4/4</strong></span>
<span class="op-domain">IGP <strong>7/7</strong></span>
<span class="op-domain">BGP <strong>3/3</strong></span>
<span class="op-domain">VPN <strong>3/3</strong></span>
</div>
</div>

<div class="quick-links">
<a href="/certs/network-engineer/" class="ql-btn">🎓 Cert page</a>
<a href="/categories/network-engineer/" class="ql-btn">📝 All labs</a>
<a href="https://github.com/NickelFace/OTUS-Network-Engineer" class="ql-btn" target="_blank" rel="noopener">💾 GitHub</a>
</div>

<hr class="rdm-divider">

<div class="rdm-section-label">Lab work</div>

<div class="domain"><details open>
<summary class="domain-header"><span class="domain-num">01</span><span class="domain-name">L2 · switching and basic resiliency</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" style="width:100%;background:var(--accent2)"></span></span><span class="dpb-text">4/4</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item"><a href="/posts/neteng/neteng-01-vlan/" class="topic-link">01 · VLAN: access/trunk separation, VTP, native VLAN, troubleshooting</a><span class="topic-tag">VLAN</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-02-stp/" class="topic-link">02 · STP: root bridge, PVST+, RPVST+, Portfast, BPDU Guard</a><span class="topic-tag">STP</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-03-etherchannel/" class="topic-link">03 · Link Aggregation: LACP/PAgP, load-balance, caveats</a><span class="topic-tag">LAG</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-03-hsrp/" class="topic-link">03* · HSRP: active/standby, preempt, track, FHRP overview</a><span class="topic-tag">FHRP</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">02</span><span class="domain-name">IGP · OSPF, EIGRP, IPv6, PBR</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" style="width:100%;background:var(--accent2)"></span></span><span class="dpb-text">7/7</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item"><a href="/posts/neteng/neteng-04-ospf-basics/" class="topic-link">04 · OSPF basics: single-area, neighbor states, DR/BDR</a><span class="topic-tag">OSPF</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-05-ospf-multiarea/" class="topic-link">05 · OSPF multiarea: ABR, LSA types, NSSA/Stub</a><span class="topic-tag">OSPF</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-06-eigrp-basic/" class="topic-link">06 · EIGRP: feasible distance, DUAL, summary routes</a><span class="topic-tag">EIGRP</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-06-eigrp-advanced/" class="topic-link">06* · EIGRP advanced: stub, leak-map, MD5 auth</a><span class="topic-tag">EIGRP</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-07-ipv4-ipv6/" class="topic-link">07 · IPv4 / IPv6: dual stack, EUI-64, DHCPv6, ND</a><span class="topic-tag">IPv6</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-08-pbr/" class="topic-link">08 · PBR: route-maps, set ip next-hop, tracking</a><span class="topic-tag">PBR</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-09-ospf-filter/" class="topic-link">09 · OSPF advanced: filter-lists, distribute-list, virtual-link</a><span class="topic-tag">OSPF</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-10-ospfv3/" class="topic-link">10 · OSPFv3 for IPv6: address-family, link-local nbrs</a><span class="topic-tag">OSPFv3</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">03</span><span class="domain-name">BGP · eBGP, iBGP, filtering</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" style="width:100%;background:var(--accent2)"></span></span><span class="dpb-text">3/3</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item"><a href="/posts/neteng/neteng-11-bgp/" class="topic-link">11 · BGP basics: neighbor relationships, path selection</a><span class="topic-tag">BGP</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-12-ibgp/" class="topic-link">12 · iBGP: full mesh, route-reflectors, next-hop-self</a><span class="topic-tag">iBGP</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-13-bgp-filtering/" class="topic-link">13 · BGP filtering: prefix-list, AS-path filter, communities</a><span class="topic-tag">BGP</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">04</span><span class="domain-name">VPN · DMVPN, IPsec, NAT/QoS</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" style="width:100%;background:var(--accent2)"></span></span><span class="dpb-text">3/3</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item"><a href="/posts/neteng/neteng-14-pat-dhcp-ntp/" class="topic-link">14 · Internet protocols: PAT, DHCP, NTP</a><span class="topic-tag">SVC</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-15-dmvpn/" class="topic-link">15 · DMVPN: phase 1/2/3, NHRP, spoke-to-spoke</a><span class="topic-tag">DMVPN</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-16-ipsec-dmvpn/" class="topic-link">16 · IPsec over DMVPN: transform-sets, IKEv2, profiles</a><span class="topic-tag">IPsec</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">05</span><span class="domain-name">Project · capstone</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" style="width:100%;background:var(--accent2)"></span></span><span class="dpb-text">1/1</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item"><a href="/posts/neteng/neteng-17-project/" class="topic-link">17 · Project: campus network with routing, BGP uplink, VPN</a><span class="topic-tag">Project</span></div>
</div>
</details></div>
