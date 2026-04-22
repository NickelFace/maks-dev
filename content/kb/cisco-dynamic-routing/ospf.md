---
title: "Cisco OSPF — Configuration Reference"
description: "OSPF: configuration, areas, filtering, summarization, redistribution, authentication"
icon: "🔷"
group: "Networking"
tags: ["Cisco", "OSPF", "routing", "dynamic-routing", "IOS", "area", "redistribution"]
date: 2026-04-22
---

<div class="intro-card">
Cisco IOS cheat sheet for <strong>OSPF</strong> (Open Shortest Path First) — link-state routing protocol. Covers base configuration, area types (stub, NSSA, totally stubby), route filtering, summarization, redistribution, and authentication.
</div>

## How OSPF Neighbor Adjacency Works

To have two routers discover each other and exchange routes:
1. Advertise the networks **connecting** the two routers — this establishes **adjacency only**.
2. Advertise the networks you want the neighbor to **know about** — only then will the neighbor see networks "behind" the first router.

## Basic Configuration

<div class="ref-panel">
<div class="ref-panel-head">OSPF Process Setup</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">router ospf 1</td><td class="desc">Enter OSPF process 1</td></tr>
<tr><td class="mono">router-id 0.0.0.32</td><td class="desc">Manually set router ID</td></tr>
<tr><td class="mono">network 192.168.0.0 0.0.255.255 area 0</td><td class="desc">Advertise network in area 0</td></tr>
<tr><td class="mono">passive-interface fa0/0.2</td><td class="desc">Suppress hello packets on interface (toward end users)</td></tr>
<tr><td class="mono">auto-cost reference-bandwidth 10000</td><td class="desc">Set reference bandwidth in Mbps — apply to ALL routers</td></tr>
<tr><td class="mono">clear ip ospf 1 process</td><td class="desc">Reset OSPF routing information</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">Interface-Level Settings</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip ospf cost 12</td><td class="desc">Set interface cost manually</td></tr>
<tr><td class="mono">ip ospf hellow-interval 8</td><td class="desc">Send hello every 8 seconds</td></tr>
<tr><td class="mono">ip ospf dead-interval 30</td><td class="desc">Declare neighbor dead after 30 s without hello</td></tr>
<tr><td class="mono">ip ospf priority 100</td><td class="desc">DR/BDR election priority</td></tr>
<tr><td class="mono">ip mtu 1400</td><td class="desc">Set MTU (must match on all routers in the same segment)</td></tr>
<tr><td class="mono">bandwidth 10000</td><td class="desc">Set interface bandwidth in Kbps (affects cost calculation)</td></tr>
</tbody>
</table>
</div>
</div>

> **Cost formula:** reference bandwidth / interface bandwidth (Kbps). Default reference bandwidth = 100 000. For links faster than 100 Mbps set: `auto-cost reference-bandwidth 100000000`.

## Diagnostics

<div class="ref-panel">
<div class="ref-panel-head">show / debug</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">show ip ospf neighbor</td><td class="desc">Neighbor table with adjacency state</td></tr>
<tr><td class="mono">show ip ospf database</td><td class="desc">LSDB — LSAs from neighbors</td></tr>
<tr><td class="mono">show ip ospf database router 1.1.1.1</td><td class="desc">Detailed LSA content from router ID 1.1.1.1</td></tr>
<tr><td class="mono">show ip ospf interface [brief]</td><td class="desc">OSPF-enabled interfaces and their cost</td></tr>
<tr><td class="mono">show ip ospf route</td><td class="desc">Routes computed by OSPF (before RIB insertion)</td></tr>
<tr><td class="mono">show ip route ospf</td><td class="desc">OSPF routes installed in the routing table</td></tr>
<tr><td class="mono">show ip route 192.168.3.2</td><td class="desc">Detailed info for a specific route</td></tr>
<tr><td class="mono">show ip protocols</td><td class="desc">Dynamic routing protocol config (AD, networks, router ID)</td></tr>
</tbody>
</table>
</div>
</div>

---

## Route Filtering

### Method 1 — prefix-list + area filter-list (on ABR)

**Goal:** block networks `10.0.1.0`, `10.0.2.0`, `10.0.3.0` from being leaked from Area 0 into Area 1.

The logic is reversed — permit only what you want; everything else is denied by default.

<div class="ref-panel">
<div class="ref-panel-head">Prefix-list Filter on ABR</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip prefix-list OSPF permit 192.168.0.0/16</td><td class="desc">Permit only 192.168.0.0/16 to pass</td></tr>
<tr><td class="mono">area &lt;id&gt; filter-list prefix OSPF &lt;in|out&gt;</td><td class="desc">Apply on ABR. in = into area, out = from area</td></tr>
<tr><td class="mono">distance ospf external 255</td><td class="desc">Raise AD for external OSPF routes (prevents default route override)</td></tr>
</tbody>
</table>
</div>
</div>

> **Note:** This filter does **not** block the default route `0.0.0.0` — it will still reach the neighbor router.

### Method 2 — distribute-list (on receiving router)

**Goal:** allow a router to install only specific routes in its RIB.

<div class="ref-panel">
<div class="ref-panel-head">Distribute-list Filter</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">access-list 3 permit 172.10.0.0 0.0.255.255</td><td class="desc">Define permitted routes in ACL</td></tr>
<tr><td class="mono">router ospf 1</td><td class="desc">Enter OSPF context</td></tr>
<tr><td class="mono">distribute-list 3 in</td><td class="desc">Apply ACL — only listed routes are installed in RIB</td></tr>
</tbody>
</table>
</div>
</div>

> *The router filters what goes into the RIB, but the LSDB remains unchanged.*

**Difference:** Method 1 — prevents a router from **advertising** routes. Method 2 — prevents a router from **accepting** routes into RIB.

### Filtering During Redistribution

<div class="ref-panel">
<div class="ref-panel-head">Filter Routes Being Redistributed from EIGRP into OSPF</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip prefix-list FILT deny 172.10.2.0/16</td><td class="desc">Create prefix-list to block a network</td></tr>
<tr><td class="mono">redistribute eigrp 1 subnets</td><td class="desc">Enable redistribution from EIGRP into OSPF</td></tr>
<tr><td class="mono">distribute-list prefix FILT out eigrp 1</td><td class="desc">Apply filter to redistributed routes from EIGRP</td></tr>
</tbody>
</table>
</div>
</div>

---

## Route Summarization

<div class="ref-panel">
<div class="ref-panel-head">ABR and ASBR Summarization</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">area 1 range 192.168.0.0 255.255.0.0</td><td class="desc">ABR: advertise summary route for area 1 to other areas</td></tr>
<tr><td class="mono">summary-address 192.168.0.0 255.255.0.0</td><td class="desc">ASBR: advertise summarized external route</td></tr>
</tbody>
</table>
</div>
</div>

---

## Redistribution

<div class="ref-panel">
<div class="ref-panel-head">Injecting External Routes into OSPF</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">default-information originate [always]</td><td class="desc">Method 1: inject default route to all OSPF neighbors. Requires static 0.0.0.0 on ASBR, or add `always`</td></tr>
<tr><td class="mono">redistribute connected subnets</td><td class="desc">Method 2: inject connected networks of ASBR into OSPF</td></tr>
<tr><td class="mono">redistribute eigrp 1 subnets</td><td class="desc">Inject EIGRP routes into OSPF</td></tr>
<tr><td class="mono">redistribute eigrp 1 metric-type 1 subnets</td><td class="desc">Same, but account for OSPF transit cost (E1 type)</td></tr>
<tr><td class="mono">distance ospf external|inter-area|intra-area 1-255</td><td class="desc">Change AD for all OSPF route types</td></tr>
<tr><td class="mono">distance 1-255 172.20.0.0 0.0.255.255</td><td class="desc">Change AD for a specific route only</td></tr>
</tbody>
</table>
</div>
</div>

---

## OSPF Area Types

### Stub Area

ABR replaces Type-5 (external) LSAs with a default route for the stub area. All routers in the area must be configured as stub.

<div class="ref-panel">
<div class="ref-panel-head">Stub Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">area 1 stub</td><td class="desc">Mark area 1 as stub — configure on ALL routers in the area</td></tr>
<tr><td class="mono">area 2 default-cost 50</td><td class="desc">Set cost of the default route injected by ABR for stub area</td></tr>
</tbody>
</table>
</div>
</div>

### Totally Stubby Area

Replaces both Type-3 (inter-area summary) and Type-5 LSAs with a single default route.

<div class="ref-panel">
<div class="ref-panel-head">Totally Stubby Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">area 2 stub</td><td class="desc">On internal area routers</td></tr>
<tr><td class="mono">area 2 stub no-summary</td><td class="desc">On ABR — blocks Type-3 and Type-5 LSAs</td></tr>
</tbody>
</table>
</div>
</div>

### NSSA (Not-So-Stubby Area)

Workaround for having an ASBR inside a stub area. ASBR generates Type-7 LSA; ABR converts Type-7 → Type-5.

<div class="ref-panel">
<div class="ref-panel-head">NSSA Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">area 2 nssa [no-summary]</td><td class="desc">Mark area as NSSA. Add `no-summary` to make it Totally NSSA</td></tr>
</tbody>
</table>
</div>
</div>

---

## Additional Features

<div class="ref-panel">
<div class="ref-panel-head">Frame-Relay and Authentication</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">neighbor 10.0.2.1</td><td class="desc">Manually define neighbor (NBMA / frame-relay — no broadcast)</td></tr>
<tr><td class="mono">ip ospf authentication message-digest</td><td class="desc">Enable MD5 authentication on interface</td></tr>
<tr><td class="mono">ip ospf message-digest-key 1 md5 cisco</td><td class="desc">Set authentication key</td></tr>
<tr><td class="mono">show ip ospf int e0/1</td><td class="desc">Verify authentication is enabled on the interface</td></tr>
</tbody>
</table>
</div>
</div>

---

*Cisco IOS Command Reference | OSPF*
