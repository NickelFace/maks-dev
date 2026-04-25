---
title: "BGP Provider Connectivity"
description: "Connecting to a provider via BGP with redundancy, route filtering, and NAT"
icon: "🌐"
tags: ["Networking", "BGP", "Provider", "NAT", "Cisco"]
date: 2026-02-03
---

<div class="intro-card">
Dual-uplink BGP with two providers (AS 65010, AS 65020). R3 and R5 are border routers in AS 65100. NAT applied on both uplinks. Route filtering via prefix-lists, conditional advertisement with <strong>advertise-map / non-exist-map</strong>.
</div>

## Topology

![](/img/neteng/sl-bgp-provider/BGP_Provider.png)

## Configurations

### R6 — Internal OSPF router

```
interface Ethernet0/0
 ip address 50.0.2.2 255.255.255.0
!
interface Ethernet0/1
 ip address 50.0.1.2 255.255.255.0
!
interface Ethernet1/0
 ip address 192.168.1.1 255.255.255.0
!
router ospf 1
 network 50.0.0.0 0.0.255.255 area 0
 network 192.168.0.0 0.0.255.255 area 0
```

### R5 — Border router (uplink to AS 65020)

```
interface Loopback0
 ip address 147.45.67.34 255.255.255.0
!
interface Loopback1
 ip address 60.0.2.1 255.255.255.0
 ip nat inside
!
interface Ethernet0/0
 ip address 50.0.2.1 255.255.255.0
 ip nat inside
!
interface Ethernet0/1
 ip address 132.56.43.22 255.255.255.0
 ip nat outside
!
interface Ethernet0/2
 ip address 50.0.3.2 255.255.255.0
 ip nat inside
!
router ospf 1
 network 50.0.0.0 0.0.255.255 area 0
 network 60.0.2.0 0.0.0.255 area 0
 default-information originate always metric 20
!
router bgp 65100
 bgp router-id 7.7.7.7
 neighbor 60.0.1.1 remote-as 65100
 neighbor 60.0.1.1 update-source Loopback1
 neighbor 60.0.1.1 next-hop-self
 neighbor 60.0.1.1 weight 200
 neighbor 132.56.43.21 remote-as 65020
 neighbor 132.56.43.21 prefix-list 1 in
 neighbor 132.56.43.21 route-map ournets out
 neighbor 132.56.43.21 advertise-map ournets non-exist-map NONEXIST_MAP
!
ip nat pool NAT 147.45.67.34 147.45.67.34 netmask 255.255.255.0
ip nat inside source list 1 pool NAT overload
!
ip prefix-list 1 seq 5 permit 0.0.0.0/0
ip prefix-list NONEXIST seq 5 permit 1.2.3.0/24
ip prefix-list our-network seq 5 permit 147.45.67.0/24
access-list 1 permit 192.168.0.0 0.0.255.255
!
route-map NONEXIST_MAP permit 10
 match ip address prefix-list NONEXIST
!
route-map ournets permit 100
 match ip address prefix-list our-network
```

### R3 — Border router (uplink to AS 65010)

```
interface Loopback0
 ip address 147.45.67.34 255.255.255.0
!
interface Loopback1
 ip address 60.0.1.1 255.255.255.0
 ip nat inside
!
interface Ethernet0/0
 ip address 218.56.78.89 255.255.255.0
 ip nat outside
!
interface Ethernet0/1
 ip address 50.0.1.1 255.255.255.0
 ip nat inside
!
interface Ethernet1/0
 ip address 50.0.3.1 255.255.255.0
!
router ospf 1
 router-id 2.2.2.2
 network 50.0.0.0 0.0.255.255 area 0
 network 60.0.1.0 0.0.0.255 area 0
 default-information originate always
!
router bgp 65100
 network 147.45.67.0 mask 255.255.255.0
 timers bgp 5 20 20
 neighbor 60.0.2.1 remote-as 65100
 neighbor 60.0.2.1 update-source Loopback1
 neighbor 60.0.2.1 next-hop-self
 neighbor 218.56.78.88 remote-as 65010
 neighbor 218.56.78.88 weight 200
 neighbor 218.56.78.88 prefix-list 1 in
!
ip nat pool NAT 147.45.67.34 147.45.67.34 netmask 255.255.255.0
ip nat inside source list 1 pool NAT overload
!
ip prefix-list 1 seq 5 permit 0.0.0.0/0
ip prefix-list 1 seq 10 permit 1.2.3.0/24
access-list 1 permit 192.168.0.0 0.0.255.255
```

### R2 — Provider AS 65020

```
interface Loopback2
 ip address 167.34.23.5 255.255.255.0
!
interface Loopback3
 ip address 155.78.65.7 255.255.255.0
!
interface Ethernet0/0
 ip address 10.0.2.2 255.255.255.0
!
interface Ethernet0/1
 ip address 132.56.43.21 255.255.255.0
!
router bgp 65020
 network 0.0.0.0
 network 155.78.65.0 mask 255.255.255.0
 network 167.34.24.0 mask 255.255.255.0
 neighbor 10.0.2.1 remote-as 65030
 neighbor 10.0.2.1 route-map SET-ASPATH out
 neighbor 132.56.43.22 remote-as 65100
!
ip route 0.0.0.0 0.0.0.0 Null0
!
route-map SET-ASPATH permit 10
 set as-path prepend 65020 65020 65020 65020 65020 65020
```

### R1 — Provider AS 65010

```
interface Ethernet0/0
 ip address 218.56.78.88 255.255.255.0
!
interface Ethernet0/1
 ip address 10.0.1.2 255.255.255.0
!
router bgp 65010
 network 0.0.0.0
 network 1.2.3.0 mask 255.255.255.0
 neighbor 10.0.1.1 remote-as 65030
 neighbor 218.56.78.89 remote-as 65100
!
ip route 0.0.0.0 0.0.0.0 Null0
ip route 1.2.3.0 255.255.255.0 Null0
```

### R4 — Transit AS 65030

```
interface Ethernet0/0
 ip address 10.0.2.1 255.255.255.0
!
interface Ethernet0/1
 ip address 10.0.1.1 255.255.255.0
!
interface Ethernet1/0
 ip address 8.8.8.1 255.255.255.0
!
router bgp 65030
 network 8.8.8.0 mask 255.255.255.0
 neighbor 10.0.1.2 remote-as 65010
 neighbor 10.0.2.2 remote-as 65020
!
ip route 132.56.43.0 255.255.255.0 10.0.2.2
ip route 218.56.78.0 255.255.255.0 10.0.1.2
```

## Takeaways

Topology demonstrates BGP redundancy with two uplinks, NAT on both border routers announcing the same prefix, route filtering via prefix-lists, and conditional advertisement (`advertise-map` / `non-exist-map`). Key command: `default-information originate always metric 20`.
