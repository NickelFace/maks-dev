---
title: "Cisco IOS — Routing"
description: "OSPF, EIGRP, BGP — команды конфигурации и верификации"
icon: "🔀"
group: "Networking"
tags: ["Cisco", "OSPF", "EIGRP", "BGP", "IOS"]
date: 2026-04-14
---

<div class="intro-card">
Шпаргалка по Cisco IOS: протоколы динамической маршрутизации <strong>OSPF, EIGRP, BGP</strong>. Команды конфигурации, верификации и отладки.
</div>

<div class="cert-coming-soon" style="margin-top:32px">
  <div class="coming-icon">🚧</div>
  <div>Контент в разработке</div>
</div>

**Планируется:**
- OSPF — `router ospf`, `network`, `area`, `passive-interface`, `show ip ospf neighbor`
- OSPF фильтрация — distribute-list, prefix-list, route-map
- EIGRP — `router eigrp`, `no auto-summary`, `show ip eigrp neighbors`
- BGP — `router bgp`, `neighbor`, `network`, `show bgp summary`
- BGP — атрибуты, фильтрация (prefix-list, route-map, as-path acl)
- iBGP — route-reflector, full-mesh
- Редистрибуция маршрутов между протоколами
- Static routes, floating routes
- PBR (Policy-Based Routing) — route-map + ip policy
