---
title: "Cisco IOS — Switching"
description: "VLAN, STP, EtherChannel, HSRP — L2 switching commands"
icon: "🔌"
group: "Networking"
tags: ["Cisco", "VLAN", "STP", "EtherChannel", "HSRP", "IOS"]
date: 2026-04-14
---

<div class="intro-card">
Cisco IOS Layer 2 cheat sheet: <strong>VLAN, VTP, STP/RSTP, EtherChannel (LACP/PAgP), HSRP</strong> — configuration and diagnostics.
</div>

<div class="cert-coming-soon" style="margin-top:32px">
  <div class="coming-icon">🚧</div>
  <div>Content in development</div>
</div>

**Planned:**
- VLAN — creation, access/trunk ports, allowed VLANs, native VLAN
- VTP — server/client/transparent/off, `show vtp status`
- STP — `spanning-tree mode`, root bridge, portfast, bpduguard, `show spanning-tree`
- EtherChannel — LACP (`channel-group mode active`), PAgP (`desirable`), `show etherchannel summary`
- HSRP — priority, preempt, track, `show standby`
- Inter-VLAN routing — router-on-a-stick, L3 switch SVI
- Port Security — max MAC, violation, `show port-security`
- DHCP Snooping, Dynamic ARP Inspection
