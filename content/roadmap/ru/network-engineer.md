---
title: "Network Engineer Roadmap"
description: "OTUS Network Engineer Course: 17 labs от VLAN до проектной работы, статус PASSED"
page_lang: "ru"
lang_pair: "/roadmap/network-engineer/"
pagefind_ignore: true
build:
  list: never
  render: always
cert_link: "/certs/network-engineer/"
cert_name: "Network Engineer"
store_key: "rdm.neteng"
total: 17
total_label: "лаб"
---

<div class="rdm-eyebrow">§ Network Engineer Roadmap · 2024–2025</div>
<h1 class="rdm-h1">Маршрутизация <em>и коммутация.</em></h1>
<p class="rdm-lead">17 лаб курса OTUS Network Engineer, пройдено в конфиге Cisco IOS, оформлено в EN/RU. Этот roadmap является ретроспективой: чем занимался и где написано подробно.</p>

<div class="params-grid">
<div class="param-card"><div class="param-label">Курс</div><div class="param-value">OTUS Network Engineer</div></div>
<div class="param-card"><div class="param-label">Длительность</div><div class="param-value">6 месяцев</div></div>
<div class="param-card"><div class="param-label">Лабораторных</div><div class="param-value">17</div></div>
<div class="param-card"><div class="param-label">Инструменты</div><div class="param-value">Cisco IOS · GNS3 · EVE-NG</div></div>
<div class="param-card"><div class="param-label">Сертификат</div><div class="param-value">PASSED</div></div>
<div class="param-card"><div class="param-label">Год</div><div class="param-value">2024–2025</div></div>
</div>

<div class="overall-progress">
<div class="op-header">
<span class="op-title">Общий прогресс</span>
<span class="op-count" id="op-count">17 / 17 лаб · 100%</span>
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
<a href="/categories/network-engineer/" class="ql-btn">📝 Все лабы</a>
<a href="https://github.com/NickelFace/OTUS-Network-Engineer" class="ql-btn" target="_blank" rel="noopener">💾 GitHub</a>
</div>

<hr class="rdm-divider">

<div class="rdm-section-label">Лабораторные работы</div>

<div class="domain"><details open>
<summary class="domain-header"><span class="domain-num">01</span><span class="domain-name">L2 · коммутация и базовая надёжность</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" style="width:100%;background:var(--accent2)"></span></span><span class="dpb-text">4/4</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item"><a href="/posts/neteng/neteng-01-vlan/" class="topic-link">01 · VLAN: разделение access/trunk, VTP, native VLAN, troubleshooting</a><span class="topic-tag">VLAN</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-02-stp/" class="topic-link">02 · STP: root bridge, PVST+, RPVST+, Portfast, BPDU Guard</a><span class="topic-tag">STP</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-03-etherchannel/" class="topic-link">03 · Link Aggregation: LACP/PAgP, load-balance, ограничения</a><span class="topic-tag">LAG</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-03-hsrp/" class="topic-link">03* · HSRP: active/standby, preempt, track, FHRP overview</a><span class="topic-tag">FHRP</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">02</span><span class="domain-name">IGP · OSPF, EIGRP, IPv6, PBR</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" style="width:100%;background:var(--accent2)"></span></span><span class="dpb-text">7/7</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item"><a href="/posts/neteng/neteng-04-ospf-basics/" class="topic-link">04 · OSPF basics: single-area, neighbor states, DR/BDR</a><span class="topic-tag">OSPF</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-05-ospf-multiarea/" class="topic-link">05 · OSPF multiarea: ABR, LSA типы, NSSA/Stub</a><span class="topic-tag">OSPF</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-06-eigrp-basic/" class="topic-link">06 · EIGRP: feasible distance, DUAL, summary routes</a><span class="topic-tag">EIGRP</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-06-eigrp-advanced/" class="topic-link">06* · EIGRP advanced: stub, leak-map, MD5 auth</a><span class="topic-tag">EIGRP</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-07-ipv4-ipv6/" class="topic-link">07 · IPv4 / IPv6: двойной стек, EUI-64, dhcpv6, ND</a><span class="topic-tag">IPv6</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-08-pbr/" class="topic-link">08 · PBR: route-maps, set ip next-hop, tracking</a><span class="topic-tag">PBR</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-09-ospf-filter/" class="topic-link">09 · OSPF advanced: filter-lists, distribute-list, virtual-link</a><span class="topic-tag">OSPF</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-10-ospfv3/" class="topic-link">10 · OSPFv3 for IPv6: address-family, link-local nbrs</a><span class="topic-tag">OSPFv3</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">03</span><span class="domain-name">BGP · eBGP, iBGP, фильтрация</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" style="width:100%;background:var(--accent2)"></span></span><span class="dpb-text">3/3</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item"><a href="/posts/neteng/neteng-11-bgp/" class="topic-link">11 · BGP basics: neighbor relationships, path selection</a><span class="topic-tag">BGP</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-12-ibgp/" class="topic-link">12 · iBGP: full mesh, route-reflectors, next-hop-self</a><span class="topic-tag">iBGP</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-13-bgp-filtering/" class="topic-link">13 · BGP filtering: prefix-list, AS-path filter, communities</a><span class="topic-tag">BGP</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">04</span><span class="domain-name">VPN · DMVPN, IPsec, NAT/QoS</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" style="width:100%;background:var(--accent2)"></span></span><span class="dpb-text">3/3</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item"><a href="/posts/neteng/neteng-14-pat-dhcp-ntp/" class="topic-link">14 · Internet Protocols: PAT, DHCP, NTP</a><span class="topic-tag">SVC</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-15-dmvpn/" class="topic-link">15 · DMVPN: phase 1/2/3, NHRP, spoke-to-spoke</a><span class="topic-tag">DMVPN</span></div>
<div class="topic-item"><a href="/posts/neteng/neteng-16-ipsec-dmvpn/" class="topic-link">16 · IPsec over DMVPN: transform-sets, IKEv2, profiles</a><span class="topic-tag">IPsec</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">05</span><span class="domain-name">Project · итоговая работа</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" style="width:100%;background:var(--accent2)"></span></span><span class="dpb-text">1/1</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item"><a href="/posts/neteng/neteng-17-project/" class="topic-link">17 · Project: кампус-сеть с маршрутизацией, BGP до ISP, VPN</a><span class="topic-tag">Project</span></div>
</div>
</details></div>
