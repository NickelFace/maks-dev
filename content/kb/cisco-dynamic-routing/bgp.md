---
title: "Cisco BGP — Configuration Reference"
description: "BGP: eBGP/iBGP setup, attributes, filtering, route-maps, peer groups, multihomed ISP"
icon: "🌍"
group: "Networking"
tags: ["Cisco", "BGP", "routing", "dynamic-routing", "IOS", "eBGP", "iBGP", "route-map"]
date: 2026-04-22
---

<div class="intro-card">
Cisco IOS cheat sheet for <strong>BGP</strong> (Border Gateway Protocol) — the inter-domain routing protocol of the Internet. Covers basic eBGP/iBGP setup, path attributes (local-preference, AS-path prepend, MED, weight), filtering, route-maps, peer groups, and multihomed ISP scenarios.
</div>

## Basic Configuration

<div class="ref-panel">
<div class="ref-panel-head">BGP Process and Neighbor Setup</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">router bgp 65000</td><td class="desc">Create BGP instance for AS 65000</td></tr>
<tr><td class="mono">neighbor 10.0.2.2 remote-as 65100</td><td class="desc">Add BGP neighbor in AS 65100 (eBGP)</td></tr>
<tr><td class="mono">neighbor 10.0.2.2 password cisco</td><td class="desc">Set MD5 authentication password (optional)</td></tr>
<tr><td class="mono">neighbor 10.0.2.2 update-source Loopback0</td><td class="desc">Use loopback for peering (loopback-to-loopback iBGP)</td></tr>
<tr><td class="mono">neighbor 10.0.2.2 ebgp-multihop 3</td><td class="desc">Allow up to 3 hops between eBGP peers</td></tr>
<tr><td class="mono">neighbor 10.0.2.2 next-hop-self</td><td class="desc">Advertise eBGP-learned routes to iBGP peers with own IP as next-hop</td></tr>
<tr><td class="mono">network 192.168.2.0 mask 255.255.255.0</td><td class="desc">Originate network in BGP (must exist in RIB; use exact prefix, not classful)</td></tr>
<tr><td class="mono">timers bgp 10 20</td><td class="desc">Set keepalive / hold timers (seconds)</td></tr>
</tbody>
</table>
</div>
</div>

## Diagnostics

<div class="ref-panel">
<div class="ref-panel-head">show / clear</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">show ip bgp</td><td class="desc">BGP table — raw routes received via BGP</td></tr>
<tr><td class="mono">show ip route bgp</td><td class="desc">BGP routes installed in the routing table</td></tr>
<tr><td class="mono">show ip bgp summary</td><td class="desc">BGP neighbor summary (state, prefixes)</td></tr>
<tr><td class="mono">show ip bgp neighbor 10.0.1.1</td><td class="desc">Detailed info for a specific BGP neighbor</td></tr>
<tr><td class="mono">clear ip bgp *</td><td class="desc">Reset all BGP sessions and re-download routes (hard reset; slow for full-view)</td></tr>
<tr><td class="mono">clear ip bgp &lt;neighbor&gt; out</td><td class="desc">Re-send own routes to neighbor (soft-reconfiguration, neighbor stays up)</td></tr>
<tr><td class="mono">clear ip bgp &lt;neighbor&gt; in</td><td class="desc">Re-download routes from neighbor (soft-reconfiguration)</td></tr>
</tbody>
</table>
</div>
</div>

---

## Path Attributes and Traffic Engineering

### Inbound Path Preference — Local Preference

Higher local-preference = preferred path for **outbound** traffic.

<div class="ref-panel">
<div class="ref-panel-head">Local Preference via Route-Map</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">route-map FILTER permit 10</td><td class="desc">Create route-map FILTER</td></tr>
<tr><td class="mono">set local-preference 150</td><td class="desc">Set local-preference to 150 (default is 100; higher = preferred)</td></tr>
<tr><td class="mono">neighbor 147.54.76.45 route-map FILTER in</td><td class="desc">Apply to all routes received from neighbor</td></tr>
</tbody>
</table>
</div>
</div>

### Return Traffic Path — AS-Path Prepend

Deliberately lengthen the AS-path to make a provider less preferred for **inbound** traffic.

<div class="ref-panel">
<div class="ref-panel-head">AS-Path Prepend via Route-Map</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">route-map SET-ASPATH permit 10</td><td class="desc">Create route-map for AS-path manipulation</td></tr>
<tr><td class="mono">set as-path prepend 64100 64100 64100 64100</td><td class="desc">Prepend own AS number 4 times to make path longer (less preferred)</td></tr>
<tr><td class="mono">neighbor 217.145.14.2 route-map SET-ASPATH out</td><td class="desc">Apply to routes advertised to this neighbor</td></tr>
</tbody>
</table>
</div>
</div>

### Weight (Cisco-proprietary, local to router)

Higher weight = preferred path. Not advertised to neighbors.

<div class="ref-panel">
<div class="ref-panel-head">BGP Weight</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">neighbor 147.54.76.45 weight 100</td><td class="desc">Set weight 100 for all routes from neighbor (default is 0)</td></tr>
<tr><td class="mono">ip prefix-list WEIGHT permit 55.30.30.0/24</td><td class="desc">Match specific prefix</td></tr>
<tr><td class="mono">route-map MAP1 permit 10</td><td class="desc">Branch 10: match prefix, set weight 150</td></tr>
<tr><td class="mono">match ip address prefix-list WEIGHT</td><td class="desc">Match specific route in route-map</td></tr>
<tr><td class="mono">set weight 150</td><td class="desc">Prefer this path with higher weight</td></tr>
<tr><td class="mono">route-map MAP1 permit 20</td><td class="desc">Branch 20: all other routes get weight 0</td></tr>
<tr><td class="mono">neighbor 50.0.1.1 route-map MAP1 in</td><td class="desc">Apply route-map to iBGP neighbor</td></tr>
</tbody>
</table>
</div>
</div>

### MED (Multi-Exit Discriminator)

Suggest to an external AS which entry point to use for **inbound** traffic. Only compared between routes from the same AS.

<div class="ref-panel">
<div class="ref-panel-head">MED via Route-Map</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">route-map SET-MED permit 10</td><td class="desc">Create route-map for MED</td></tr>
<tr><td class="mono">set metric 200</td><td class="desc">Set MED to 200 (lower = more preferred)</td></tr>
<tr><td class="mono">neighbor 217.145.14.2 route-map SET-MED out</td><td class="desc">Advertise MED to this neighbor</td></tr>
</tbody>
</table>
</div>
</div>

---

## Filtering

### AS-Path Access-List

<div class="ref-panel">
<div class="ref-panel-head">AS-Path Filtering</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip as-path access-list 1 permit ^$</td><td class="desc">Match routes originated in our AS only (empty AS-path)</td></tr>
<tr><td class="mono">ip as-path access-list 1 permit _65030$</td><td class="desc">Match routes whose last AS is 65030 (regardless of transit ASes)</td></tr>
<tr><td class="mono">ip as-path access-list 1 permit ^65020$</td><td class="desc">Match routes originating directly from AS 65020</td></tr>
<tr><td class="mono">neighbor 217.145.14.2 filter-list 1 out</td><td class="desc">Apply AS-path ACL to outbound updates for neighbor</td></tr>
<tr><td class="mono">clear ip bgp * out</td><td class="desc">Push updated routes to all neighbors</td></tr>
</tbody>
</table>
</div>
</div>

### Prefix-List

<div class="ref-panel">
<div class="ref-panel-head">Prefix-List Filtering</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip prefix-list ISP permit 0.0.0.0/0</td><td class="desc">Accept only default route from ISP</td></tr>
<tr><td class="mono">ip prefix-list 1 permit 0.0.0.0/0 ge 8 le 24</td><td class="desc">Accept prefixes with mask /8–/24</td></tr>
<tr><td class="mono">neighbor 20.0.2.2 prefix-list ISP in</td><td class="desc">Apply prefix-list to inbound updates from neighbor</td></tr>
<tr><td class="mono">neighbor 217.145.14.2 prefix-list 1 out</td><td class="desc">Apply prefix-list to outbound updates</td></tr>
</tbody>
</table>
</div>
</div>

### Route-Map Filtering (combined AS-path + prefix-list)

<div class="ref-panel">
<div class="ref-panel-head">Combined Route-Map Filter</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip prefix-list default-only permit 0.0.0.0/0</td><td class="desc">Match default route only</td></tr>
<tr><td class="mono">route-map FILTERING permit 10</td><td class="desc">Branch 10: match default route from AS 65020 → set local-pref 150</td></tr>
<tr><td class="mono">match ip address prefix-list default-only</td><td class="desc">Match condition 1</td></tr>
<tr><td class="mono">match as-path 10</td><td class="desc">Match condition 2 (AS-path ACL 10)</td></tr>
<tr><td class="mono">set local-preference 150</td><td class="desc">Prefer this path</td></tr>
<tr><td class="mono">route-map FILTERING permit 20</td><td class="desc">Branch 20: default from other AS → keep default local-pref 100</td></tr>
<tr><td class="mono">neighbor 172.10.10.1 route-map FILTERING in</td><td class="desc">Apply to first neighbor</td></tr>
<tr><td class="mono">neighbor 134.15.15.1 route-map FILTERING in</td><td class="desc">Apply to second neighbor</td></tr>
</tbody>
</table>
</div>
</div>

---

## Peer Groups

Reuse the same neighbor policies across multiple peers.

<div class="ref-panel">
<div class="ref-panel-head">Peer Group Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">neighbor ISP peer-group</td><td class="desc">Create peer group named ISP</td></tr>
<tr><td class="mono">neighbor ISP filter-list 1 out</td><td class="desc">Attach filter-list 1 to the group</td></tr>
<tr><td class="mono">neighbor ISP prefix-list 25 in</td><td class="desc">Attach prefix-list 25 to the group</td></tr>
<tr><td class="mono">neighbor ISP route-map FILTER out</td><td class="desc">Attach route-map FILTER to the group</td></tr>
<tr><td class="mono">neighbor 172.10.10.1 remote-as 65020</td><td class="desc">Define first neighbor</td></tr>
<tr><td class="mono">neighbor 172.10.10.1 peer-group ISP</td><td class="desc">Assign first neighbor to peer group</td></tr>
<tr><td class="mono">neighbor 134.15.15.1 remote-as 65030</td><td class="desc">Define second neighbor</td></tr>
<tr><td class="mono">neighbor 134.15.15.1 peer-group ISP</td><td class="desc">Assign second neighbor to peer group</td></tr>
</tbody>
</table>
</div>
</div>

---

*Cisco IOS Command Reference | BGP*
