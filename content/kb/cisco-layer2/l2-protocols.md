---
title: "Cisco L2 Protocols — PPP & Frame-Relay"
description: "PPP and Frame-Relay configuration: authentication, multipoint, point-to-point sub-interfaces"
icon: "🔗"
tags: ["Cisco", "PPP", "Frame-Relay", "HDLC", "WAN", "IOS", "L2"]
date: 2026-04-22
---

<div class="intro-card">
Cisco IOS WAN Layer 2 cheat sheet: <strong>PPP</strong> (Point-to-Point Protocol) with CHAP authentication, and <strong>Frame-Relay</strong> — multipoint and point-to-point sub-interface configurations.
</div>

## PPP — Point-to-Point Protocol

<div class="ref-panel">
<div class="ref-panel-head">PPP with CHAP Authentication</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">hostname Router1</td><td class="desc">Set hostname (used for CHAP authentication)</td></tr>
<tr><td class="mono">username Router2 password cisco123</td><td class="desc">Create account for the remote router (on Router1)</td></tr>
<tr><td class="mono">int ser9/0</td><td class="desc">Enter serial interface</td></tr>
<tr><td class="mono">ppp authentication chap</td><td class="desc">Require CHAP authentication from the remote router</td></tr>
<tr><td class="mono">debug ppp authentication</td><td class="desc">Debug PPP authentication process</td></tr>
</tbody>
</table>
</div>
</div>

> PPP is a point-to-point environment — no Layer 2 addresses (MAC) are used.

---

## Frame-Relay — Basic Setup

<div class="ref-panel">
<div class="ref-panel-head">Simple Frame-Relay Link</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">int ser9/0</td><td class="desc">Enter serial interface</td></tr>
<tr><td class="mono">encapsulation frame-relay</td><td class="desc">Set L2 encapsulation to Frame-Relay</td></tr>
<tr><td class="mono">ip address 192.168.0.1 255.255.255.0</td><td class="desc">Assign IP to the interface</td></tr>
<tr><td class="mono">frame-relay map ip 10.1.1.1 110 broadcast</td><td class="desc">Manually map neighbor IP to DLCI 110 (when InverseARP is not working)</td></tr>
</tbody>
</table>
</div>
</div>

---

## Frame-Relay — Multipoint Sub-Interface (Hub)

Used when one physical interface connects to multiple remote sites. Inverse ARP is disabled — manual mapping required.

<div class="ref-panel">
<div class="ref-panel-head">Multipoint Frame-Relay (Hub Router)</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">interface serial 0/0</td><td class="desc">Physical serial interface</td></tr>
<tr><td class="mono">no ip address</td><td class="desc">Remove IP from physical interface</td></tr>
<tr><td class="mono">encapsulation frame-relay</td><td class="desc">Set Frame-Relay encapsulation</td></tr>
<tr><td class="mono">interface serial 0/0.1 multipoint</td><td class="desc">Create multipoint sub-interface</td></tr>
<tr><td class="mono">ip address 10.0.1.1 255.255.255.0</td><td class="desc">Assign IP to sub-interface</td></tr>
<tr><td class="mono">frame-relay map ip 10.0.1.2 100 broadcast</td><td class="desc">Map first spoke router IP → DLCI 100</td></tr>
<tr><td class="mono">frame-relay map ip 10.0.1.3 200 broadcast</td><td class="desc">Map second spoke router IP → DLCI 200</td></tr>
</tbody>
</table>
</div>
</div>

> Spoke routers in multipoint topology do **not** need a sub-interface.

---

## Frame-Relay — Point-to-Point Sub-Interfaces (Hub)

Each spoke gets its own sub-interface. Cleaner, avoids split-horizon issues with routing protocols.

<div class="ref-panel">
<div class="ref-panel-head">Point-to-Point Frame-Relay (Hub Router)</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">interface serial 0/0</td><td class="desc">Physical interface</td></tr>
<tr><td class="mono">no ip address</td><td class="desc">Remove IP from physical interface</td></tr>
<tr><td class="mono">encapsulation frame-relay</td><td class="desc">Set Frame-Relay encapsulation</td></tr>
<tr><td class="mono">interface serial 0/0.100 point-to-point</td><td class="desc">Sub-interface for first spoke (DLCI 100)</td></tr>
<tr><td class="mono">ip address 10.0.1.1 255.255.255.0</td><td class="desc">IP for this p2p link</td></tr>
<tr><td class="mono">frame-relay interface-dlci 100</td><td class="desc">Assign DLCI 100 to this sub-interface</td></tr>
<tr><td class="mono">interface serial 0/0.110 point-to-point</td><td class="desc">Sub-interface for second spoke (DLCI 110)</td></tr>
<tr><td class="mono">ip address 10.0.2.1 255.255.255.0</td><td class="desc">IP for this p2p link</td></tr>
<tr><td class="mono">frame-relay interface-dlci 110</td><td class="desc">Assign DLCI 110 to this sub-interface</td></tr>
</tbody>
</table>
</div>
</div>

> Spoke routers in p2p topology **must** also create a point-to-point sub-interface.

---

## Frame-Relay Diagnostics

<div class="ref-panel">
<div class="ref-panel-head">show commands</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">show frame-relay pvc</td><td class="desc">Show PVC status and traffic counters</td></tr>
<tr><td class="mono">show frame-relay map</td><td class="desc">Show IP-to-DLCI mapping table</td></tr>
</tbody>
</table>
</div>
</div>

---

*Cisco IOS Command Reference | PPP & Frame-Relay*
