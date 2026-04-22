---
title: "Cisco Switch Security"
description: "Port Security, Storm Control, DHCP Snooping, IP Source Guard, Dynamic ARP Inspection, PoE"
icon: "🛡️"
group: "Networking"
tags: ["Cisco", "security", "port-security", "DHCP-snooping", "DAI", "IOS", "switching", "PoE"]
date: 2026-04-22
---

<div class="intro-card">
Cisco IOS Layer 2 security cheat sheet: <strong>Port Security, Storm Control, DHCP Snooping, IP Source Guard, Dynamic ARP Inspection</strong>, and <strong>PoE</strong>. These features protect the switched network from MAC flooding, DHCP starvation, ARP spoofing, and unauthorized devices.
</div>

## Port Security

Limits the number of MAC addresses allowed on a port and takes action when the limit is exceeded.

<div class="ref-panel">
<div class="ref-panel-head">Port Security Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">switchport mode access</td><td class="desc">Port must be in access mode for port-security</td></tr>
<tr><td class="mono">switchport port-security</td><td class="desc">Enable port-security on interface</td></tr>
<tr><td class="mono">switchport port-security maximum 5</td><td class="desc">Allow up to 5 MAC addresses (default: 1)</td></tr>
<tr><td class="mono">switchport port-security mac-address sticky</td><td class="desc">Learn MAC addresses dynamically and keep them on reload</td></tr>
<tr><td class="mono">switchport port-security violation shutdown</td><td class="desc">Shut port when limit exceeded (default action; other: protect, restrict)</td></tr>
<tr><td class="mono">switchport port-security aging time 2</td><td class="desc">Auto-remove dynamically learned MACs after 2 minutes</td></tr>
<tr><td class="mono">switchport port-security aging type absolute</td><td class="desc">Remove MAC after aging time regardless of activity</td></tr>
<tr><td class="mono">switchport port-security aging type inactivity</td><td class="desc">Remove MAC only if inactive for aging time</td></tr>
<tr><td class="mono">mls rate-limit layer2 port-security 100 10</td><td class="desc">Rate-limit frames from attacker in protect/restrict mode</td></tr>
<tr><td class="mono">errdisable recovery cause psecure-violation</td><td class="desc">Auto-recover ports shut by port-security violation</td></tr>
<tr><td class="mono">clear port-security sticky</td><td class="desc">Clear learned sticky MAC addresses</td></tr>
</tbody>
</table>
</div>
</div>

**IP phone + PC on the same port:**

<div class="ref-panel">
<div class="ref-panel-head">Voice + Data VLAN with Port Security</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">switchport port-security maximum 1 vlan access</td><td class="desc">Allow 1 MAC in the data VLAN (for PC)</td></tr>
<tr><td class="mono">switchport port-security maximum 1 vlan voice</td><td class="desc">Allow 1 MAC in the voice VLAN (for IP phone)</td></tr>
<tr><td class="mono">switchport port-security mac-address &lt;mac&gt; vlan voice</td><td class="desc">Statically allow the phone's MAC in voice VLAN</td></tr>
<tr><td class="mono">switchport port-security mac-address &lt;mac&gt; vlan access</td><td class="desc">Statically allow the PC's MAC in data VLAN</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">Port Security Diagnostics</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">show port-security</td><td class="desc">Global port-security status</td></tr>
<tr><td class="mono">show port-security int fa0/1</td><td class="desc">Per-interface port-security status</td></tr>
<tr><td class="mono">show port-security address</td><td class="desc">MAC addresses protected by port-security</td></tr>
</tbody>
</table>
</div>
</div>

---

## Storm Control

Limit broadcast, multicast, or unicast flooding on a port.

<div class="ref-panel">
<div class="ref-panel-head">Storm Control Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">storm-control broadcast level 50 30</td><td class="desc">Rising threshold 50%, falling 30% for broadcast</td></tr>
<tr><td class="mono">storm-control multicast level pps 30k 20k</td><td class="desc">Multicast limit: 30k pps rising, 20k falling</td></tr>
<tr><td class="mono">storm-control unicast level bps 30m</td><td class="desc">Unicast limit: 30 Mbps</td></tr>
<tr><td class="mono">storm-control action shutdown</td><td class="desc">Shut port when threshold exceeded (alt: trap)</td></tr>
<tr><td class="mono">show storm-control [broadcast|multicast|unicast]</td><td class="desc">Storm control statistics</td></tr>
</tbody>
</table>
</div>
</div>

---

## DHCP Snooping

Validates DHCP messages by distinguishing trusted (server-side) and untrusted (client-side) ports. Also builds the binding table used by IP Source Guard and DAI.

<div class="ref-panel">
<div class="ref-panel-head">DHCP Snooping Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip dhcp snooping</td><td class="desc">Enable DHCP snooping globally</td></tr>
<tr><td class="mono">ip dhcp snooping vlan 1</td><td class="desc">Enable for VLAN 1 (configure per each VLAN)</td></tr>
<tr><td class="mono">ip dhcp snooping trust</td><td class="desc">Mark interface as trusted (uplink to DHCP server)</td></tr>
<tr><td class="mono">ip dhcp snooping limit rate 10</td><td class="desc">Max 10 DHCP requests/second per port (anti-starvation)</td></tr>
<tr><td class="mono">no ip dhcp snooping verify mac-address</td><td class="desc">Disable MAC verification check (enabled by default)</td></tr>
<tr><td class="mono">ip dhcp relay information trusted</td><td class="desc">Trust DHCP relay info on SVI (for external DHCP servers)</td></tr>
<tr><td class="mono">ip dhcp relay information trust-all</td><td class="desc">Trust relay info on all SVIs</td></tr>
<tr><td class="mono">ip dhcp snooping binding &lt;mac&gt; vlan &lt;id&gt; &lt;ip&gt; interface &lt;if&gt; expiry &lt;sec&gt;</td><td class="desc">Add static entry to DHCP snooping binding table</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">DHCP Snooping Diagnostics</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">show ip dhcp snooping</td><td class="desc">Snooping settings and trusted ports</td></tr>
<tr><td class="mono">show ip dhcp snooping binding</td><td class="desc">IP–MAC–VLAN–interface binding table</td></tr>
<tr><td class="mono">show ip dhcp snooping statistics</td><td class="desc">Drop/forward counters</td></tr>
</tbody>
</table>
</div>
</div>

---

## IP Source Guard

Prevents IP spoofing by verifying source IPs against the DHCP Snooping binding table.

> **Requires DHCP Snooping to be enabled first.**

<div class="ref-panel">
<div class="ref-panel-head">IP Source Guard Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip verify source vlan dhcp-snooping</td><td class="desc">Enable IP Source Guard on interface</td></tr>
<tr><td class="mono">ip source binding 00:E0:F7:EC:D0:10 vlan 1 192.168.1.1 interface fa0/4</td><td class="desc">Manual binding for devices with static IPs (not in DHCP snooping table)</td></tr>
<tr><td class="mono">show ip verify source</td><td class="desc">IP Source Guard status per interface</td></tr>
<tr><td class="mono">show ip source binding</td><td class="desc">Manual IP–MAC binding entries</td></tr>
</tbody>
</table>
</div>
</div>

---

## Dynamic ARP Inspection (DAI)

Validates ARP packets against the DHCP Snooping binding table to prevent ARP spoofing / man-in-the-middle attacks.

> **Requires DHCP Snooping to be enabled first.**

<div class="ref-panel">
<div class="ref-panel-head">DAI Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip arp inspection vlan 1</td><td class="desc">Enable DAI for VLAN 1 (configure per each VLAN)</td></tr>
<tr><td class="mono">ip arp inspection trust</td><td class="desc">Mark interface as trusted (uplinks between switches)</td></tr>
<tr><td class="mono">ip arp inspection limit rate 2</td><td class="desc">Max 2 ARP requests/second on interface</td></tr>
<tr><td class="mono">errdisable recovery cause arp-inspection interval 600</td><td class="desc">Auto-recover DAI-blocked ports after 600 s</td></tr>
</tbody>
</table>
</div>
</div>

**Static ARP ACL for devices with static IPs (e.g., default gateway):**

<div class="ref-panel">
<div class="ref-panel-head">ARP ACL for Static Devices</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">arp access-list ARP-EXCEPTIONS</td><td class="desc">Create ARP ACL</td></tr>
<tr><td class="mono">permit ip host 192.168.1.1 mac host 00:E0:F7:EC:D0:10</td><td class="desc">Bind gateway IP to its real MAC — rejects ARP spoofing attempts</td></tr>
<tr><td class="mono">ip arp inspection filter ARP-EXCEPTIONS vlan 1</td><td class="desc">Apply ARP ACL to VLAN</td></tr>
<tr><td class="mono">show ip arp inspection</td><td class="desc">DAI status and counters</td></tr>
<tr><td class="mono">show ip arp inspection interface</td><td class="desc">Which interfaces have DAI enabled</td></tr>
</tbody>
</table>
</div>
</div>

---

## PoE — Power over Ethernet

<div class="ref-panel">
<div class="ref-panel-head">PoE IEEE Classes</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Class</th><th>Max PSE output</th><th>Note</th></tr></thead>
<tbody>
<tr><td class="mono">Class 0</td><td class="desc">15.4 W</td><td class="desc">Default class (unclassified devices)</td></tr>
<tr><td class="mono">Class 1</td><td class="desc">4 W</td><td class="desc">Optional — low-power devices</td></tr>
<tr><td class="mono">Class 2</td><td class="desc">7 W</td><td class="desc">Optional</td></tr>
<tr><td class="mono">Class 3</td><td class="desc">15.4 W</td><td class="desc">Optional — standard 802.3af devices</td></tr>
<tr><td class="mono">Class 4</td><td class="desc">51 W</td><td class="desc">802.3at (PoE+) only — not available on 802.3af switches</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">PoE Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">power inline auto</td><td class="desc">Auto-detect and power connected PD device</td></tr>
<tr><td class="mono">power inline never</td><td class="desc">Disable PoE on interface</td></tr>
<tr><td class="mono">power inline auto max &lt;milli-watts&gt;</td><td class="desc">Enable PoE with max wattage cap</td></tr>
<tr><td class="mono">show power inline</td><td class="desc">PoE status and remaining wattage per port</td></tr>
</tbody>
</table>
</div>
</div>

---

## Err-Disabled Recovery

<div class="ref-panel">
<div class="ref-panel-head">Err-Disabled Port Recovery</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">errdisable recovery cause all</td><td class="desc">Auto-recover ports for all err-disable causes</td></tr>
<tr><td class="mono">errdisable recovery interval 300</td><td class="desc">Recovery timer (default: 300 s)</td></tr>
<tr><td class="mono">show interface fa0/1 status</td><td class="desc">Check if port is in err-disabled state</td></tr>
<tr><td class="mono">show errdisable recovery</td><td class="desc">Recovery timers per cause</td></tr>
<tr><td class="mono">show errdisable detect</td><td class="desc">Causes that can trigger err-disabled</td></tr>
</tbody>
</table>
</div>
</div>

> To manually recover: resolve the root cause → `shutdown` → `no shutdown`.

---

*Cisco IOS Command Reference | Switch Security*
