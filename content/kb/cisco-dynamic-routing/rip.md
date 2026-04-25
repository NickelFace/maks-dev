---
title: "Cisco RIP — Configuration Reference"
description: "RIPv2: configuration, timers, summarization, redistribution, diagnostics"
icon: "🔄"
tags: ["Cisco", "RIP", "RIPv2", "routing", "dynamic-routing", "IOS"]
date: 2026-04-22
---

<div class="intro-card">
Cisco IOS cheat sheet for <strong>RIP v2</strong> — distance-vector routing protocol. Simple to configure but limited to 15 hops. Covers configuration, timers, passive interfaces, summarization, and redistribution.
</div>

## Configuration

<div class="ref-panel">
<div class="ref-panel-head">RIP Setup</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">router rip</td><td class="desc">Enter RIP configuration context</td></tr>
<tr><td class="mono">network 192.168.0.0</td><td class="desc">Advertise network (mask is taken from the interface)</td></tr>
<tr><td class="mono">version 2</td><td class="desc">Enable RIP version 2 (supports VLSM, multicast updates)</td></tr>
<tr><td class="mono">no auto-summary</td><td class="desc">Disable automatic classful summarization</td></tr>
<tr><td class="mono">passive-interface fa8/0</td><td class="desc">Suppress updates on interface (toward end users)</td></tr>
<tr><td class="mono">timers basic 10 150 150 200</td><td class="desc">Set RIP timers: update / invalid / holddown / flush (seconds)</td></tr>
<tr><td class="mono">no ip split-horizon</td><td class="desc">Disable split-horizon on the interface</td></tr>
<tr><td class="mono">ip rip triggered</td><td class="desc">Send full routing table once; then only on changes (triggered updates)</td></tr>
</tbody>
</table>
</div>
</div>

## Summarization and Redistribution

<div class="ref-panel">
<div class="ref-panel-head">Summarization and Redistribution</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip summary-address rip 192.168.0.0 255.255.0.0</td><td class="desc">Advertise summarized 192.168.0.0/16 to neighbors</td></tr>
<tr><td class="mono">default-information originate</td><td class="desc">Advertise default route 0.0.0.0/0 to all neighbors</td></tr>
<tr><td class="mono">redistribute ospf 1 metric 10</td><td class="desc">Inject OSPF process 1 routes into RIP with metric 10</td></tr>
</tbody>
</table>
</div>
</div>

## Diagnostics

<div class="ref-panel">
<div class="ref-panel-head">show / debug</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">show ip rip database</td><td class="desc">RIP route database</td></tr>
<tr><td class="mono">show ip protocols</td><td class="desc">RIP configuration: version, networks, timers, neighbors</td></tr>
<tr><td class="mono">show ip route rip</td><td class="desc">RIP routes installed in the routing table</td></tr>
<tr><td class="mono">debug ip rip</td><td class="desc">Real-time RIP update output</td></tr>
</tbody>
</table>
</div>
</div>

---

*Cisco IOS Command Reference | RIP*
