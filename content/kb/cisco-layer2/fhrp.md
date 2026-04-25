---
title: "Cisco FHRP — HSRP, VRRP, GLBP"
description: "Gateway redundancy: HSRP, VRRP, GLBP configuration and diagnostics"
icon: "🔁"
tags: ["Cisco", "HSRP", "VRRP", "GLBP", "FHRP", "redundancy", "gateway", "IOS"]
date: 2026-04-22
---

<div class="intro-card">
Cisco IOS cheat sheet for <strong>First Hop Redundancy Protocols</strong>: HSRP (Cisco-proprietary), VRRP (open standard), and GLBP (Cisco-proprietary with load balancing). Supported on both routers and L3 switches.
</div>

## Protocol Comparison

| Feature | HSRP | VRRP | GLBP |
|---|---|---|---|
| Standard | Cisco proprietary | Open (RFC 5798) | Cisco proprietary |
| Preempt default | **Off** | **On** | On |
| Load balancing | No | No | **Yes (AVF)** |
| Hello / Hold timers | 3 s / 10 s | 1 s / 3 s | 3 s / 10 s |
| Virtual IP = physical IP | No (must differ) | **Yes (allowed)** | No |
| Multicast address | 224.0.0.2 (v1) · 224.0.0.102 (v2) | 224.0.0.18 | 224.0.0.102 |
| Authentication | MD5 supported | Removed from RFC; supported on Cisco HW | MD5 supported |
| Interface tracking | Yes | Yes | Yes (via weighting) |

---

## HSRP — Hot Standby Router Protocol

<div class="ref-panel">
<div class="ref-panel-head">HSRP — Router 1 (Active)</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">int fa0/1</td><td class="desc">Interface facing the LAN</td></tr>
<tr><td class="mono">ip address 192.168.1.2 255.255.255.0</td><td class="desc">Physical IP of this router</td></tr>
<tr><td class="mono">standby 1 ip 192.168.1.1</td><td class="desc">Virtual IP (same on both routers) — default gateway for hosts</td></tr>
<tr><td class="mono">standby 1 priority 110</td><td class="desc">Set priority (default 100; higher = preferred active)</td></tr>
<tr><td class="mono">standby 1 preempt</td><td class="desc">Take over active role when priority is higher</td></tr>
<tr><td class="mono">standby 1 preempt delay minimum 300</td><td class="desc">Wait 300 s before preempting (let routing protocols converge)</td></tr>
<tr><td class="mono">standby 1 authentication md5 key-string MyPassword</td><td class="desc">MD5 authentication (optional)</td></tr>
<tr><td class="mono">standby 1 timers 200 750</td><td class="desc">Hello interval / hold interval in seconds (optional tuning)</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">HSRP — Router 2 (Standby) with Interface Tracking</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip address 192.168.1.3 255.255.255.0</td><td class="desc">Physical IP of standby router</td></tr>
<tr><td class="mono">standby 1 ip 192.168.1.1</td><td class="desc">Same virtual IP as router 1</td></tr>
<tr><td class="mono">standby 1 preempt</td><td class="desc">Enable preemption</td></tr>
<tr><td class="mono">track 1 interface fa0/1 line-protocol</td><td class="desc">Create tracking object for interface fa0/1</td></tr>
<tr><td class="mono">standby 1 track 1 decrement 20</td><td class="desc">Decrease priority by 20 if track object 1 fails</td></tr>
<tr><td class="mono">standby 1 track 1 fa0/1 20</td><td class="desc">HSRP shorthand: track interface directly without separate track object</td></tr>
</tbody>
</table>
</div>
</div>

---

## VRRP — Virtual Router Redundancy Protocol

Same commands as HSRP but replace `standby` with `vrrp`. Preemption is **on by default** in VRRP.

<div class="ref-panel">
<div class="ref-panel-head">VRRP Setup</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">vrrp 1 ip 192.168.1.1</td><td class="desc">Enable VRRP group 1 with virtual IP</td></tr>
</tbody>
</table>
</div>
</div>

> Priority, preempt, authentication, and timer commands follow the same pattern as HSRP but use `vrrp` keyword.

---

## GLBP — Gateway Load Balancing Protocol

GLBP elects one **AVG** (Active Virtual Gateway) and multiple **AVF** (Active Virtual Forwarder). Each AVF serves a subset of hosts → actual load balancing.

<div class="ref-panel">
<div class="ref-panel-head">GLBP Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">glbp 1 ip 192.168.1.1</td><td class="desc">Enable GLBP group 1 with virtual IP</td></tr>
<tr><td class="mono">glbp 1 priority 110</td><td class="desc">Set AVG priority (higher = preferred AVG)</td></tr>
<tr><td class="mono">glbp 1 preempt</td><td class="desc">Enable preemption for AVG</td></tr>
<tr><td class="mono">glbp 1 weighting 130</td><td class="desc">Set AVF weight (higher = more traffic forwarded)</td></tr>
<tr><td class="mono">glbp 1 weighting 130 lower 20 upper 50</td><td class="desc">Weight with thresholds: stop forwarding below 20, resume above 50</td></tr>
<tr><td class="mono">track 1 interface fa0/1 line-protocol</td><td class="desc">Track uplink interface</td></tr>
<tr><td class="mono">glbp 1 weighting track 1 decrement 50</td><td class="desc">Decrease weight by 50 if fa0/1 fails</td></tr>
<tr><td class="mono">glbp 1 load-balancing round-robin</td><td class="desc">Load-balancing method: round-robin, host-dependent, or weighted</td></tr>
</tbody>
</table>
</div>
</div>

---

## Diagnostics

<div class="ref-panel">
<div class="ref-panel-head">show commands</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">show standby</td><td class="desc">Detailed HSRP status (use `vrrp` or `glbp` for other protocols)</td></tr>
<tr><td class="mono">show standby brief</td><td class="desc">Compact FHRP status table</td></tr>
</tbody>
</table>
</div>
</div>

---

*Cisco IOS Command Reference | FHRP*
