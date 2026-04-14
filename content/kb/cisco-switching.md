---
title: "Cisco IOS — Switching"
description: "VLAN, STP, EtherChannel, HSRP — команды L2 коммутации"
icon: "🔌"
group: "Networking"
tags: ["Cisco", "VLAN", "STP", "EtherChannel", "HSRP", "IOS"]
date: 2026-04-14
---

<div class="intro-card">
Шпаргалка по Cisco IOS Layer 2: <strong>VLAN, VTP, STP/RSTP, EtherChannel (LACP/PAgP), HSRP</strong> — конфигурация и диагностика.
</div>

<div class="cert-coming-soon" style="margin-top:32px">
  <div class="coming-icon">🚧</div>
  <div>Контент в разработке</div>
</div>

**Планируется:**
- VLAN — создание, access/trunk порты, allowed VLANs, native VLAN
- VTP — server/client/transparent/off, `show vtp status`
- STP — `spanning-tree mode`, root bridge, portfast, bpduguard, `show spanning-tree`
- EtherChannel — LACP (`channel-group mode active`), PAgP (`desirable`), `show etherchannel summary`
- HSRP — priority, preempt, track, `show standby`
- Inter-VLAN routing — router-on-a-stick, L3 switch SVI
- Port Security — max MAC, violation, `show port-security`
- DHCP Snooping, Dynamic ARP Inspection
