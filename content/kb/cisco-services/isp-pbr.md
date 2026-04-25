---
title: "Cisco ISP Connection & PBR"
description: "Multihomed ISP with IP SLA, dynamic NAT failover, BGP dual-homed, PPPoE, Policy-Based Routing"
icon: "🌐"
tags: ["Cisco", "ISP", "IP-SLA", "BGP", "PPPoE", "PBR", "NAT", "IOS", "WAN"]
date: 2026-04-22
---

<div class="intro-card">
Cisco IOS cheat sheet for <strong>ISP connectivity</strong>: dual-ISP failover without BGP (IP SLA + tracking), dynamic NAT switching, multihomed BGP with two CE routers, PPPoE client, and <strong>Policy-Based Routing (PBR)</strong>.
</div>

## IP SLA — Availability Monitoring

Used to detect ISP link failure and trigger route switching.

<div class="ref-panel">
<div class="ref-panel-head">IP SLA — Method 1 (modern IOS)</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip sla 1</td><td class="desc">Create SLA probe 1</td></tr>
<tr><td class="mono">icmp-echo 20.0.1.2 source-interface e0/2</td><td class="desc">Ping ISP1 next-hop from interface e0/2</td></tr>
<tr><td class="mono">frequency 10</td><td class="desc">Probe every 10 seconds</td></tr>
<tr><td class="mono">ip sla schedule 1 start-time now life forever</td><td class="desc">Start probe immediately, run indefinitely</td></tr>
<tr><td class="mono">track 1 ip sla 1 reachability</td><td class="desc">Track object 1 = SLA 1 reachability</td></tr>
<tr><td class="mono">ip route 0.0.0.0 0.0.0.0 2.2.2.2 track 1</td><td class="desc">Use ISP1 as default when probe succeeds</td></tr>
<tr><td class="mono">ip route 0.0.0.0 0.0.0.0 3.3.3.3 10</td><td class="desc">Fallback to ISP2 with higher AD (10) when probe fails</td></tr>
<tr><td class="mono">show track 1</td><td class="desc">Show tracking object status</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">IP SLA — Method 2 (legacy IOS)</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip sla monitor 1</td><td class="desc">Create SLA monitor</td></tr>
<tr><td class="mono">type echo protocol IpIcmpEcho 20.0.1.2 source-interface e0/2</td><td class="desc">ICMP echo probe</td></tr>
<tr><td class="mono">frequency 10</td><td class="desc">Probe every 10 seconds</td></tr>
<tr><td class="mono">ip sla monitor schedule 1 life forever start-time now</td><td class="desc">Activate probe</td></tr>
<tr><td class="mono">track 1 rtr 1 reachability</td><td class="desc">Track SLA reachability (legacy syntax)</td></tr>
</tbody>
</table>
</div>
</div>

> You can monitor an external resource instead of the ISP next-hop, but then you must route traffic to that resource exclusively through ISP1 to get accurate results:  
> `ip route 85.202.241.71 255.255.255.255 <isp1-next-hop>`

---

## Dynamic NAT Failover (Single CE, Dual ISP)

**Problem:** each ISP allows NAT only from the IP it assigned. With two ISPs and one router, NAT rules must switch automatically.

<div class="ref-panel">
<div class="ref-panel-head">NAT for ISP1</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">route-map ISP1 permit 10</td><td class="desc">Match traffic exiting via ISP1 interface</td></tr>
<tr><td class="mono">match interface e0/1</td><td class="desc">ISP1 outbound interface</td></tr>
<tr><td class="mono">ip nat pool ovrld 217.145.14.4 217.145.14.4 netmask 255.255.255.0</td><td class="desc">ISP1 public IP pool</td></tr>
<tr><td class="mono">ip nat inside source route-map ISP1 pool ovrld overload</td><td class="desc">NAT with route-map — translates to ISP1 IP when ISP1 is active</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">NAT for ISP2</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">route-map ISP2 permit 10</td><td class="desc">Match traffic exiting via ISP2 interface</td></tr>
<tr><td class="mono">match interface e0/2</td><td class="desc">ISP2 outbound interface</td></tr>
<tr><td class="mono">ip nat pool ovrld2 147.54.76.4 147.54.76.4 netmask 255.255.255.0</td><td class="desc">ISP2 public IP pool</td></tr>
<tr><td class="mono">ip nat inside source route-map ISP2 pool ovrld2 overload</td><td class="desc">NAT to ISP2 IP when ISP2 is active</td></tr>
</tbody>
</table>
</div>
</div>

> With two routers (HSRP/VRRP): no route-map needed. Each router handles its own NAT; FHRP determines which router is active.

---

## BGP Multihomed — Dual CE Routers

When both CE routers advertise the same PI prefix to two ISPs, return traffic may arrive via the wrong CE (breaking NAT). Solution: the standby CE conditionally suppresses its advertisement when the primary ISP is reachable.

<div class="ref-panel">
<div class="ref-panel-head">Conditional Advertisement (Standby CE)</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip prefix-list NONEXIST seq 5 permit 1.2.3.0/24</td><td class="desc">Match the special route advertised by primary ISP (health signal)</td></tr>
<tr><td class="mono">ip prefix-list our-network seq 5 permit 147.45.67.34/24</td><td class="desc">Our PI address block</td></tr>
<tr><td class="mono">route-map NONEXIST_MAP permit 10</td><td class="desc">Trigger: fires when health signal route exists</td></tr>
<tr><td class="mono">match ip address prefix-list NONEXIST</td><td class="desc">Match the health signal</td></tr>
<tr><td class="mono">route-map ournets permit 100</td><td class="desc">Always-permit route-map for our prefix</td></tr>
<tr><td class="mono">match ip address prefix-list our-network</td><td class="desc">Match our PI block</td></tr>
<tr><td class="mono">router bgp 65100</td><td class="desc">Enter BGP context</td></tr>
<tr><td class="mono">neighbor 132.56.43.21 route-map ournets out</td><td class="desc">Advertise our prefix to backup ISP</td></tr>
<tr><td class="mono">neighbor 132.56.43.21 advertise-map ournets non-exist-map NONEXIST_MAP</td><td class="desc">Only advertise our prefix to backup ISP when health signal is ABSENT</td></tr>
</tbody>
</table>
</div>
</div>

---

## PPPoE Client Configuration

<div class="ref-panel">
<div class="ref-panel-head">Step 1 — Create Dialer Interface</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">interface Dialer1</td><td class="desc">Create Dialer interface</td></tr>
<tr><td class="mono">ip address negotiated</td><td class="desc">Get IP from ISP via PPPoE</td></tr>
<tr><td class="mono">ip mtu 1492</td><td class="desc">Set MTU to PPPoE max (1500 - 8 byte overhead)</td></tr>
<tr><td class="mono">ip nat outside</td><td class="desc">Mark as NAT outside</td></tr>
<tr><td class="mono">encapsulation ppp</td><td class="desc">Use PPP encapsulation</td></tr>
<tr><td class="mono">dialer pool 1</td><td class="desc">Assign to dialer pool 1</td></tr>
<tr><td class="mono">ppp authentication chap callin</td><td class="desc">CHAP authentication toward ISP</td></tr>
<tr><td class="mono">ppp chap hostname Maycal</td><td class="desc">PPPoE username</td></tr>
<tr><td class="mono">ppp chap password 0 Ghd%4gdns</td><td class="desc">PPPoE password</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">Step 2 — Bind Physical Interface to Dialer Pool</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">interface FastEthernet0/1</td><td class="desc">Physical interface toward ISP</td></tr>
<tr><td class="mono">pppoe-client dial-pool-number 1</td><td class="desc">Link physical interface to Dialer1 via pool 1</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">Step 3 — Default Route and NAT</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip route 0.0.0.0 0.0.0.0 dialer 1</td><td class="desc">Default route through Dialer interface</td></tr>
<tr><td class="mono">access-list 1 permit 192.168.0.0 0.0.255.255</td><td class="desc">Define private IP range for NAT</td></tr>
<tr><td class="mono">ip nat inside source list 1 interface dialer 1 overload</td><td class="desc">PAT: translate to Dialer interface IP</td></tr>
</tbody>
</table>
</div>
</div>

---

## Policy-Based Routing (PBR)

Route traffic based on source IP, destination, or protocol — overriding the normal routing table.

<div class="ref-panel">
<div class="ref-panel-head">PBR Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip access-list extended CTRL-ACL</td><td class="desc">Create ACL to match traffic for PBR</td></tr>
<tr><td class="mono">permit ip host 192.168.1.2 any</td><td class="desc">Match traffic from specific host</td></tr>
<tr><td class="mono">route-map CONTROL-RM</td><td class="desc">Create route-map for PBR</td></tr>
<tr><td class="mono">match ip address CTRL-ACL</td><td class="desc">Trigger when ACL matches</td></tr>
<tr><td class="mono">set ip next-hop 10.0.2.1</td><td class="desc">Override next-hop for matched traffic</td></tr>
<tr><td class="mono">int fa0/1</td><td class="desc">Interface facing the end user</td></tr>
<tr><td class="mono">ip policy route-map CONTROL-RM</td><td class="desc">Apply PBR route-map on the interface</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">PBR Diagnostics</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">show route-map</td><td class="desc">Show route-map configuration</td></tr>
<tr><td class="mono">show ip policy</td><td class="desc">Interfaces with PBR applied</td></tr>
<tr><td class="mono">debug ip policy</td><td class="desc">Real-time PBR matching output</td></tr>
</tbody>
</table>
</div>
</div>

---

*Cisco IOS Command Reference | ISP Connectivity & PBR*
