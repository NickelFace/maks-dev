---
title: "Cisco NAT & DHCP — Configuration Reference"
description: "Static NAT, Dynamic NAT, PAT, NVI NAT, DHCP server configuration and diagnostics"
icon: "🔀"
tags: ["Cisco", "NAT", "PAT", "DHCP", "IOS", "network-services"]
date: 2026-04-22
---

<div class="intro-card">
Cisco IOS cheat sheet for <strong>NAT</strong> (Network Address Translation) and <strong>DHCP</strong>. Covers static NAT, dynamic NAT, PAT (overload), NVI NAT, DHCP server setup, and DHCP relay.
</div>

## NAT — Network Address Translation

### Static NAT

One-to-one permanent mapping. Used to expose an internal server to the outside.

<div class="ref-panel">
<div class="ref-panel-head">Static NAT</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">int fa0/0</td><td class="desc">Internal interface (LAN side)</td></tr>
<tr><td class="mono">ip nat inside</td><td class="desc">Mark as inside NAT interface</td></tr>
<tr><td class="mono">int fa0/1</td><td class="desc">External interface (Internet side)</td></tr>
<tr><td class="mono">ip nat outside</td><td class="desc">Mark as outside NAT interface</td></tr>
<tr><td class="mono">ip nat inside source static 192.168.1.2 215.215.215.20</td><td class="desc">Map private 192.168.1.2 permanently to public 215.215.215.20</td></tr>
<tr><td class="mono">ip nat inside source static tcp 192.168.1.3 80 172.20.20.15 80</td><td class="desc">Port forward: external port 80 → internal 192.168.1.3:80</td></tr>
<tr><td class="mono">ip nat inside source static tcp 192.168.1.3 80 interface Ethernet0/0 80</td><td class="desc">Port forward using interface IP instead of hardcoded public IP</td></tr>
<tr><td class="mono">ip nat inside source static 192.168.1.5 interface fa0/0</td><td class="desc">DMZ-style: forward ALL ports to 192.168.1.5</td></tr>
</tbody>
</table>
</div>
</div>

### Dynamic NAT

Pool of public IPs — each private IP gets a different public IP from the pool.

<div class="ref-panel">
<div class="ref-panel-head">Dynamic NAT</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">access-list 1 permit 192.168.1.0 0.0.0.255</td><td class="desc">Define which private addresses are eligible for NAT</td></tr>
<tr><td class="mono">ip nat pool TRANS 215.215.215.20 215.215.215.30 netmask 255.255.255.0</td><td class="desc">Define public IP pool (range .20–.30)</td></tr>
<tr><td class="mono">ip nat inside source list 1 pool TRANS</td><td class="desc">Enable dynamic NAT: ACL 1 → pool TRANS</td></tr>
</tbody>
</table>
</div>
</div>

### PAT — Port Address Translation (NAT Overload)

Many private IPs share one public IP, differentiated by port numbers. Most common in home/office routers.

<div class="ref-panel">
<div class="ref-panel-head">PAT with Pool</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip nat pool OVRLD 172.16.10.1 172.16.10.1 netmask 255.255.255.0</td><td class="desc">Pool with a single public IP</td></tr>
<tr><td class="mono">access-list 7 permit 192.168.1.0 0.0.0.255</td><td class="desc">Private IP range eligible for PAT</td></tr>
<tr><td class="mono">ip nat inside source list 7 pool OVRLD overload</td><td class="desc">Enable PAT (overload)</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">PAT Using Interface IP (Recommended)</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip nat inside source list 7 interface e0/1 overload</td><td class="desc">Translate to the IP of the outbound interface — no hardcoded public IP needed</td></tr>
</tbody>
</table>
</div>
</div>

> Prefer the interface-based form — it follows the interface IP automatically if the ISP reassigns it.

### NVI NAT (NAT Virtual Interface)

Alternative to inside/outside model — mark interfaces with `ip nat enable` on both sides.

<div class="ref-panel">
<div class="ref-panel-head">NVI NAT — PAT Example</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip nat enable</td><td class="desc">Enable NAT on interface (both LAN and WAN side)</td></tr>
<tr><td class="mono">ip nat source list 7 interface fa0/1 overload</td><td class="desc">Enable PAT — note: no `inside` keyword</td></tr>
</tbody>
</table>
</div>
</div>

### NAT Diagnostics

<div class="ref-panel">
<div class="ref-panel-head">NAT show / debug</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">show ip nat translation</td><td class="desc">Current NAT translation table</td></tr>
<tr><td class="mono">show ip nat statistics</td><td class="desc">NAT hit counters and stats</td></tr>
<tr><td class="mono">show ip nat nvi translation</td><td class="desc">Translation table for NVI NAT</td></tr>
<tr><td class="mono">clear ip nat translation *</td><td class="desc">Clear dynamic translation table (settings unchanged)</td></tr>
<tr><td class="mono">debug ip nat</td><td class="desc">Real-time NAT translation log</td></tr>
</tbody>
</table>
</div>
</div>

---

## DHCP Server

<div class="ref-panel">
<div class="ref-panel-head">DHCP Pool Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip dhcp excluded-address 192.168.10.50</td><td class="desc">Exclude IP from DHCP assignment (static servers, gateways)</td></tr>
<tr><td class="mono">ip dhcp pool VLAN2POOL</td><td class="desc">Create DHCP pool named VLAN2POOL</td></tr>
<tr><td class="mono">network 192.168.2.0 255.255.255.0</td><td class="desc">Address range to hand out</td></tr>
<tr><td class="mono">default-router 192.168.2.50</td><td class="desc">Default gateway to advertise</td></tr>
<tr><td class="mono">dns-server 217.217.217.2</td><td class="desc">DNS server to advertise</td></tr>
<tr><td class="mono">netbios-name-server 192.168.1.2</td><td class="desc">WINS server address</td></tr>
<tr><td class="mono">bootfile FILENAME</td><td class="desc">PXE boot filename</td></tr>
<tr><td class="mono">option 33 ip 156.42.45.0 192.168.1.1</td><td class="desc">Option 33: send static route to client</td></tr>
<tr><td class="mono">lease 2</td><td class="desc">Lease time of 2 days</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">Sub-interface for Inter-VLAN DHCP</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">interface fa0/0.2</td><td class="desc">Create sub-interface for VLAN 2</td></tr>
<tr><td class="mono">encapsulation dot1Q 2</td><td class="desc">Tag sub-interface for VLAN 2</td></tr>
<tr><td class="mono">ip address 192.168.2.2 255.255.255.0</td><td class="desc">Assign IP (this becomes the DHCP gateway)</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">Static IP–MAC Binding</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip dhcp pool CLIENT</td><td class="desc">Create a dedicated pool for one client</td></tr>
<tr><td class="mono">host 192.168.50.5 255.255.255.255</td><td class="desc">Always assign this IP</td></tr>
<tr><td class="mono">client-identifier 0001.976B.291D</td><td class="desc">Match by MAC address (client-identifier)</td></tr>
</tbody>
</table>
</div>
</div>

> **Windows** clients: prefix MAC with `01` (e.g., `0100.0476.106c.bc`).  
> **UNIX** clients: prefix with `00` (e.g., `0000.0476.106c.bc`).

<div class="ref-panel">
<div class="ref-panel-head">DHCP Relay and Advanced Settings</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip helper-address 10.0.1.4</td><td class="desc">DHCP Relay Agent — forward requests to DHCP server at 10.0.1.4</td></tr>
<tr><td class="mono">ip dhcp ping packets 0</td><td class="desc">Disable ping check before assigning IP (0 = off)</td></tr>
<tr><td class="mono">ip dhcp ping timeout 200</td><td class="desc">Timeout between ping attempts (ms)</td></tr>
<tr><td class="mono">clear ip dhcp binding *</td><td class="desc">Clear all DHCP lease bindings</td></tr>
<tr><td class="mono">clear ip dhcp binding 192.168.2.4</td><td class="desc">Clear binding for specific IP</td></tr>
<tr><td class="mono">clear ip dhcp conflict *</td><td class="desc">Clear IP conflict database</td></tr>
<tr><td class="mono">ip dhcp database ftp://user:pass@192.168.1.5/router-dhcp timeout 80</td><td class="desc">Store DHCP bindings on external FTP server</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">DHCP Diagnostics</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">show ip dhcp pool</td><td class="desc">Available and used addresses per pool</td></tr>
<tr><td class="mono">show ip dhcp binding</td><td class="desc">All assigned leases</td></tr>
<tr><td class="mono">show ip dhcp binding 192.168.10.1</td><td class="desc">Details for a specific IP (includes MAC)</td></tr>
<tr><td class="mono">show ip dhcp conflict</td><td class="desc">IP address conflict log</td></tr>
<tr><td class="mono">show ip dhcp server statistics</td><td class="desc">DHCP server stats (requests, acks, declines)</td></tr>
<tr><td class="mono">debug ip dhcp server packet</td><td class="desc">Real-time DHCP packet debug</td></tr>
</tbody>
</table>
</div>
</div>

---

*Cisco IOS Command Reference | NAT & DHCP*
