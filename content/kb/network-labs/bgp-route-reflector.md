---
title: "BGP Route Reflector"
description: "Configuring a BGP Route Reflector to scale iBGP without full-mesh"
icon: "🔄"
tags: ["Networking", "BGP", "Route Reflector", "iBGP", "Cisco"]
date: 2026-01-26
---

<div class="intro-card">
iBGP requires full-mesh between all peers — N×(N−1)/2 sessions. A <strong>Route Reflector</strong> (RR) breaks this requirement: clients only peer with the RR, which re-advertises routes to all other clients.
</div>

## Topology

![](/img/neteng/sl-bgp-rr/1.png)

R1 is the Route Reflector. R3 and R4 are RR clients.

## Configurations

### R1 — Route Reflector

```
interface Loopback0
 ip address 1.1.1.1 255.255.255.255
 ip ospf 1 area 0
!
interface Loopback1
 ip address 100.100.100.100 255.255.255.255
!
interface Ethernet0/0
 ip address 10.1.2.1 255.255.255.0
!
interface Ethernet0/1
 ip address 10.1.3.1 255.255.255.0
 ip ospf 1 area 0
!
router ospf 1
 router-id 1.1.1.1
!
router bgp 65000
 bgp log-neighbor-changes
 network 100.100.100.100 mask 255.255.255.255
 neighbor 3.3.3.3 remote-as 65000
 neighbor 3.3.3.3 update-source Loopback0
 neighbor 3.3.3.3 route-reflector-client
 neighbor 4.4.4.4 remote-as 65000
 neighbor 4.4.4.4 update-source Loopback0
 neighbor 4.4.4.4 route-reflector-client
```

### R3 — RR client

```
interface Loopback0
 ip address 3.3.3.3 255.255.255.255
 ip ospf 1 area 0
!
interface Loopback1
 ip address 200.200.200.200 255.255.255.255
!
interface Ethernet0/0
 ip address 10.3.4.3 255.255.255.0
 ip ospf 1 area 0
!
interface Ethernet0/1
 ip address 10.1.3.3 255.255.255.0
 ip ospf 1 area 0

router ospf 1
 router-id 3.3.3.3
!
router bgp 65000
 bgp log-neighbor-changes
 network 200.200.200.200 mask 255.255.255.255
 neighbor 1.1.1.1 remote-as 65000
 neighbor 1.1.1.1 update-source Loopback0
```

### R4 — RR client

```
interface Loopback0
 ip address 4.4.4.4 255.255.255.255
 ip ospf 1 area 0
!
interface Ethernet0/0
 ip address 10.3.4.4 255.255.255.0
 ip ospf 1 area 0
!
interface Ethernet0/1
 ip address 10.2.4.4 255.255.255.0
!
router ospf 1
 router-id 4.4.4.4
!
router bgp 65000
 bgp log-neighbor-changes
 neighbor 1.1.1.1 remote-as 65000
 neighbor 1.1.1.1 update-source Loopback0
```
