---
title: "Cisco EIGRP — Configuration Reference"
description: "EIGRP: configuration, timers, authentication, load balancing, diagnostics"
icon: "⚡"
group: "Networking"
tags: ["Cisco", "EIGRP", "routing", "dynamic-routing", "IOS"]
date: 2026-04-22
---

<div class="intro-card">
Cisco IOS cheat sheet for <strong>EIGRP</strong> (Enhanced Interior Gateway Routing Protocol) — Cisco-proprietary distance-vector/diffusing-update routing protocol. Covers basic setup, timers, key-chain authentication, load balancing, and diagnostics.
</div>

## Basic Configuration

<div class="ref-panel">
<div class="ref-panel-head">EIGRP Setup</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">router eigrp 1</td><td class="desc">Enter EIGRP AS 1 context</td></tr>
<tr><td class="mono">no auto-summary</td><td class="desc">Enable classless mode, disable automatic summarization</td></tr>
<tr><td class="mono">network 192.168.1.0 0.0.0.255</td><td class="desc">Advertise network to all EIGRP neighbors</td></tr>
<tr><td class="mono">passive-interface fa0/0</td><td class="desc">Suppress hello packets on interface (toward end users)</td></tr>
<tr><td class="mono">eigrp stub [connected|receive-only|redistributed|static|summary]</td><td class="desc">Receive all routes but advertise only selected types</td></tr>
<tr><td class="mono">neighbor 192.168.2.0</td><td class="desc">Manually define neighbor (NBMA / frame-relay)</td></tr>
<tr><td class="mono">no ip split-horizon eigrp 100</td><td class="desc">Disable split-horizon on the interface</td></tr>
</tbody>
</table>
</div>
</div>

## Timers

<div class="ref-panel">
<div class="ref-panel-head">Hello and Hold Timers</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip hellow-interval eigrp 1 10</td><td class="desc">Send hello packets every 10 seconds (per interface)</td></tr>
<tr><td class="mono">ip hold-timer eigrp 1 30</td><td class="desc">Declare neighbor dead after 30 s without hello</td></tr>
</tbody>
</table>
</div>
</div>

> EIGRP hello/hold timers on two neighboring routers **do not have to match**, unlike OSPF.

## Metric and Load Balancing

<div class="ref-panel">
<div class="ref-panel-head">Metric Tuning and Load Balancing</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">metric weights &lt;TOS&gt; &lt;K1&gt; &lt;K2&gt; &lt;K3&gt; &lt;K4&gt; &lt;K5&gt;</td><td class="desc">Change K-values (0–255 each; TOS must be 0)</td></tr>
<tr><td class="mono">metric maximum-hops &lt;1-255&gt;</td><td class="desc">Max hop count (default 100)</td></tr>
<tr><td class="mono">variance 2</td><td class="desc">Unequal-cost load balancing: use feasible successors up to 2× cost of successor</td></tr>
<tr><td class="mono">maximum-paths 6</td><td class="desc">Max equal-cost paths for load balancing</td></tr>
<tr><td class="mono">traffic-share balanced</td><td class="desc">Distribute traffic inversely proportional to metric</td></tr>
<tr><td class="mono">traffic-share min</td><td class="desc">Send all traffic via lowest-metric path only</td></tr>
<tr><td class="mono">ip summary-address eigrp 1 10.64.0.0/14</td><td class="desc">Advertise summary route on the interface</td></tr>
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
<tr><td class="mono">show ip eigrp neighbors</td><td class="desc">Routers with active EIGRP adjacency</td></tr>
<tr><td class="mono">show ip eigrp interfaces</td><td class="desc">Interfaces participating in EIGRP</td></tr>
<tr><td class="mono">show ip eigrp topology [all-links]</td><td class="desc">EIGRP topology table (successor + feasible successors)</td></tr>
<tr><td class="mono">show ip eigrp interface detail fa0/0</td><td class="desc">Timer values per interface</td></tr>
<tr><td class="mono">show ip eigrp traffic</td><td class="desc">EIGRP packet counters</td></tr>
<tr><td class="mono">show ip protocols</td><td class="desc">Dynamic routing protocol config (AS, networks, AD)</td></tr>
<tr><td class="mono">debug eigrp</td><td class="desc">Real-time EIGRP debug output (turn off with: undebug all)</td></tr>
</tbody>
</table>
</div>
</div>

## Key-Chain Authentication

> Synchronize time on all routers (NTP) before configuring authentication.

<div class="ref-panel">
<div class="ref-panel-head">Key Chain Definition</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">key chain MYKEYS</td><td class="desc">Create key chain named MYKEYS</td></tr>
<tr><td class="mono">key 1</td><td class="desc">Define key 1 in the chain</td></tr>
<tr><td class="mono">key-string cisco</td><td class="desc">Set key 1 value</td></tr>
<tr><td class="mono">accept-lifetime 18:00:00 may 21 2015 18:00:00 may 22 2015</td><td class="desc">Window during which this key is accepted from neighbors</td></tr>
<tr><td class="mono">send-lifetime 18:00:00 may 21 2015 18:00:00 may 22 2015</td><td class="desc">Window during which this key is sent to neighbors</td></tr>
<tr><td class="mono">key 2</td><td class="desc">Key 2 — automatically takes over after key 1 expires</td></tr>
<tr><td class="mono">key-string cisco2</td><td class="desc">Set key 2 value</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">Apply Authentication to Interface</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip authentication mode eigrp 1 md5</td><td class="desc">Enable MD5 authentication for EIGRP instance 1</td></tr>
<tr><td class="mono">ip authentication key-chain eigrp 1 MYKEYS</td><td class="desc">Specify key chain to use for authentication</td></tr>
</tbody>
</table>
</div>
</div>

---

*Cisco IOS Command Reference | EIGRP*
