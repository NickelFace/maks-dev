---
title: "Cisco ACL — Access Control Lists"
description: "Standard, extended, named, VACL, PACL — configuration and diagnostics"
icon: "🚦"
tags: ["Cisco", "ACL", "security", "filtering", "IOS", "VACL", "PACL"]
date: 2026-04-22
---

<div class="intro-card">
Cisco IOS cheat sheet for <strong>ACL</strong> (Access Control Lists) — standard, extended, named, VACL, and Port ACL. Used for traffic filtering, route filtering, NAT pool selection, and more.
</div>

## Key Placement Rules

- **IN direction**: packet arrives on the interface from the directly connected device → ACL is checked immediately.
- **OUT direction**: packet arrives on the router from another interface → ACL is checked before forwarding out.
- **Standard ACL** — filter by source IP only; place **close to the destination**.
- **Extended ACL** — filter by source, destination, protocol, port; place **close to the source**.

---

## Standard ACL

<div class="ref-panel">
<div class="ref-panel-head">Standard Numbered ACL</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">access-list 1 deny 192.168.10.5</td><td class="desc">Deny host 192.168.10.5</td></tr>
<tr><td class="mono">access-list 1 permit 192.168.10.0 0.0.0.255</td><td class="desc">Permit the rest of the subnet</td></tr>
<tr><td class="mono">interface fa0/1</td><td class="desc">Enter interface</td></tr>
<tr><td class="mono">ip access-group 1 out</td><td class="desc">Apply ACL 1 in outbound direction</td></tr>
</tbody>
</table>
</div>
</div>

---

## Extended ACL

<div class="ref-panel">
<div class="ref-panel-head">Extended Numbered ACL</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">access-list 110 deny tcp host 192.168.10.1 any eq 80</td><td class="desc">Deny host 192.168.10.1 on TCP port 80</td></tr>
<tr><td class="mono">access-list 110 permit ip 192.168.10.0 0.0.0.255 any</td><td class="desc">Permit all other traffic from the subnet</td></tr>
<tr><td class="mono">interface fa0/1</td><td class="desc">Enter interface</td></tr>
<tr><td class="mono">ip access-group 110 out</td><td class="desc">Apply ACL 110 outbound</td></tr>
</tbody>
</table>
</div>
</div>

**Block VLAN 2 → VLAN 3 traffic (on the router doing routing):**

<div class="ref-panel">
<div class="ref-panel-head">Inter-VLAN Filtering</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">access-list 101 deny ip 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255</td><td class="desc">Block VLAN2 → VLAN3 traffic</td></tr>
<tr><td class="mono">access-list 101 permit ip any any</td><td class="desc">Permit everything else</td></tr>
<tr><td class="mono">ip access-group 101 out</td><td class="desc">Apply outbound on VLAN3 interface</td></tr>
<tr><td class="mono">ip access-group 101 in</td><td class="desc">Or apply inbound on VLAN2 interface</td></tr>
</tbody>
</table>
</div>
</div>

On **L3 switch with SVIs:**

```
int vlan 2
ip access-group 101 in
```

---

## Named ACL

<div class="ref-panel">
<div class="ref-panel-head">Named ACL (Standard or Extended)</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip access-list extended MY_LIST</td><td class="desc">Create named extended ACL and enter edit mode</td></tr>
<tr><td class="mono">permit ip host 192.168.0.2 host 172.20.20.2</td><td class="desc">Permit specific host-to-host traffic</td></tr>
<tr><td class="mono">ip access-list resequence MY_LIST 10 20</td><td class="desc">Renumber ACL entries: start at 10, step 20</td></tr>
</tbody>
</table>
</div>
</div>

---

## VACL — VLAN Access Maps

Applied directly to a VLAN — inspects traffic within the VLAN (no routing required).

<div class="ref-panel">
<div class="ref-panel-head">VACL Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">mac access-list extended MY_MAC_LIST</td><td class="desc">Create MAC ACL (optional)</td></tr>
<tr><td class="mono">permit host 0000.3131.0110 any</td><td class="desc">Allow specific MAC address</td></tr>
<tr><td class="mono">ip access-list extended MY_IP_LIST</td><td class="desc">Create IP ACL</td></tr>
<tr><td class="mono">permit ip host 192.168.0.1 any</td><td class="desc">Allow specific IP</td></tr>
<tr><td class="mono">vlan access-map MY_VLAN_MAP</td><td class="desc">Create VLAN access-map</td></tr>
<tr><td class="mono">match mac address MY_MAC_LIST</td><td class="desc">Match MAC ACL</td></tr>
<tr><td class="mono">match ip address MY_IP_LIST</td><td class="desc">Match IP ACL</td></tr>
<tr><td class="mono">action forward</td><td class="desc">Forward matching traffic</td></tr>
<tr><td class="mono">vlan filter MY_VLAN_MAP vlan-list 150-170</td><td class="desc">Apply VLAN access-map to VLANs 150–170</td></tr>
</tbody>
</table>
</div>
</div>

---

## PACL — Port ACL

Applied to switch ports for servers with static IPs (DHCP servers, default gateways).

<div class="ref-panel">
<div class="ref-panel-head">Port ACL on Access Port</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip access-list standard SERVER1</td><td class="desc">Create named standard ACL</td></tr>
<tr><td class="mono">permit 192.168.1.1</td><td class="desc">Allow specific IP</td></tr>
<tr><td class="mono">deny any log</td><td class="desc">Deny all others, log violations</td></tr>
<tr><td class="mono">int fa0/3</td><td class="desc">Enter the port facing the server</td></tr>
<tr><td class="mono">ip access-group SERVER1 in</td><td class="desc">Apply ACL inbound</td></tr>
</tbody>
</table>
</div>
</div>

---

## Diagnostics

<div class="ref-panel">
<div class="ref-panel-head">show / verify</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">show access-lists</td><td class="desc">All ACLs and their hit counters</td></tr>
<tr><td class="mono">show ip interface fa0/1 | include access</td><td class="desc">Check if an ACL is applied to an interface</td></tr>
<tr><td class="mono">show run | include access-list</td><td class="desc">Show ACL section from running-config</td></tr>
</tbody>
</table>
</div>
</div>

---

*Cisco IOS Command Reference | ACL*
