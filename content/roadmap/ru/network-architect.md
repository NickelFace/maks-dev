---
title: "Network Architect Roadmap"
description: "OTUS Network Architect Course: 9 лаб по DC underlay/overlay, VxLAN EVPN, статус PASSED"
page_lang: "ru"
lang_pair: "/roadmap/network-architect/"
pagefind_ignore: true
build:
  list: never
  render: always
cert_link: "/certs/network-architect/"
cert_name: "Network Architect"
store_key: "rdm.netarch"
total: 9
total_label: "лаб"
---

<div class="rdm-eyebrow">§ Network Architect Roadmap · 2025</div>
<h1 class="rdm-h1">Data center <em>fabric.</em></h1>
<p class="rdm-lead">9 лаб OTUS Network Architect: CLOS-фабрика, underlay (OSPF/IS-IS/BGP), multicast и L2/L3 EVPN. Это retro: как делал и где конфиги.</p>

<div class="params-grid">
<div class="param-card"><div class="param-label">Курс</div><div class="param-value">OTUS Network Architect</div></div>
<div class="param-card"><div class="param-label">Длительность</div><div class="param-value">4 месяца</div></div>
<div class="param-card"><div class="param-label">Лабораторных</div><div class="param-value">9</div></div>
<div class="param-card"><div class="param-label">Инструменты</div><div class="param-value">NX-OS · Cisco ACI · EVE-NG</div></div>
<div class="param-card"><div class="param-label">Сертификат</div><div class="param-value">PASSED</div></div>
<div class="param-card"><div class="param-label">Год</div><div class="param-value">2025</div></div>
</div>

<div class="overall-progress">
<div class="op-header">
<span class="op-title">Общий прогресс</span>
<span class="op-count" id="op-count">9 / 9 лаб · 100%</span>
</div>
<div class="op-bar"><div class="op-fill" id="op-fill" style="width:100%"></div></div>
<div class="op-domains">
<span class="op-domain">Underlay <strong>4/4</strong></span>
<span class="op-domain">Multicast <strong>1/1</strong></span>
<span class="op-domain">VxLAN <strong>3/3</strong></span>
<span class="op-domain">Project <strong>1/1</strong></span>
</div>
</div>

<div class="quick-links">
<a href="/certs/network-architect/" class="ql-btn">🎓 Cert page</a>
<a href="/categories/network-architect/" class="ql-btn">📝 Все лабы</a>
<a href="https://github.com/NickelFace/OTUS-Network-Architect" class="ql-btn" target="_blank" rel="noopener">💾 GitHub</a>
</div>

<hr class="rdm-divider">

<div class="rdm-section-label">Лабораторные работы</div>

<div class="domain"><details open>
<summary class="domain-header"><span class="domain-num">01</span><span class="domain-name">Underlay · CLOS, IGP, BGP</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" style="width:100%;background:var(--accent2)"></span></span><span class="dpb-text">4/4</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item"><a href="/posts/netarch/netarch-01-address-space/" class="topic-link">01 · Address Space Design: CLOS, loopback план, point-to-point /31</a><span class="topic-tag">Design</span></div>
<div class="topic-item"><a href="/posts/netarch/netarch-02-underlay-ospf/" class="topic-link">02 · Underlay OSPF: single-area, scaling, hello/dead</a><span class="topic-tag">OSPF</span></div>
<div class="topic-item"><a href="/posts/netarch/netarch-03-underlay-isis/" class="topic-link">03 · Underlay IS-IS: L1/L2, wide metrics, IPv6</a><span class="topic-tag">IS-IS</span></div>
<div class="topic-item"><a href="/posts/netarch/netarch-04-underlay-bgp/" class="topic-link">04 · Underlay BGP: eBGP unnumbered, ASN-per-rack, ECMP</a><span class="topic-tag">BGP</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">02</span><span class="domain-name">Multicast · базовая mcast</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" style="width:100%;background:var(--accent2)"></span></span><span class="dpb-text">1/1</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item"><a href="/posts/netarch/netarch-05-multicast-pim/" class="topic-link">05 · Multicast PIM: sparse/dense mode, RP, BSR, anycast-RP</a><span class="topic-tag">PIM</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">03</span><span class="domain-name">VxLAN EVPN · L2/L3 overlay</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" style="width:100%;background:var(--accent2)"></span></span><span class="dpb-text">3/3</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item"><a href="/posts/netarch/netarch-06-vxlan-type2/" class="topic-link">06 · VxLAN Type-2 (L2 EVPN): VNI, NVE, BGP EVPN AF</a><span class="topic-tag">EVPN</span></div>
<div class="topic-item"><a href="/posts/netarch/netarch-07-vxlan-route/" class="topic-link">07 · VxLAN Type-5 (L3 EVPN): symmetric IRB, route leaking</a><span class="topic-tag">EVPN</span></div>
<div class="topic-item"><a href="/posts/netarch/netarch-08-vxlan-multipod/" class="topic-link">08 · VxLAN Multipod: inter-pod routing, route-reflectors</a><span class="topic-tag">EVPN</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">04</span><span class="domain-name">Project · итоговая работа</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" style="width:100%;background:var(--accent2)"></span></span><span class="dpb-text">1/1</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item"><a href="/posts/netarch/netarch-09-project/" class="topic-link">09 · Project: миграция с CP multicast на EVPN, full DC fabric</a><span class="topic-tag">Project</span></div>
</div>
</details></div>
