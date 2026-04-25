---
title: "IS-IS Protocol — L1/L2 Levels"
description: "IS-IS configuration with Level-1 and Level-2 areas on a 9-router topology"
icon: "🗺️"
tags: ["Networking", "IS-IS", "Routing", "Cisco"]
date: 2026-02-11
---

<div class="intro-card">
IS-IS uses <strong>L1</strong> (intra-area) and <strong>L2</strong> (inter-area/backbone) adjacencies. Routers at area boundaries run both levels simultaneously. NET format: <code>49.AREA.SYSID.00</code>.
</div>

## Topology

![](/img/neteng/sl-isis/1.png)

Basic connectivity without traffic engineering. Three areas: 49.0001, 49.0002, 49.0003, 49.0004.

## Configurations

### R1 — L1 only (area 49.0003)

```
interface Ethernet0/0
 no shutdown
 ip address 10.0.12.1 255.255.255.0
 ip router isis 
!
interface Ethernet0/1
 no shutdown
 ip address 10.0.13.1 255.255.255.0
 ip router isis 
!
router isis
 net 49.0003.0000.0000.0001.00
 is-type level-1
```

### R2 — L1/L2 boundary (area 49.0003)

```
interface Ethernet0/0
 no shutdown
 ip address 10.0.24.2 255.255.255.0
 ip router isis 
!
interface Ethernet0/1
 no shutdown
 ip address 10.0.12.2 255.255.255.0
 ip router isis 
 isis circuit-type level-1
!
interface Ethernet0/2
 no shutdown
 ip address 10.0.25.2 255.255.255.0
 ip router isis 
 isis circuit-type level-2-only
!
router isis
 net 49.0003.0000.0000.0002.00
```

### R3 — L1 only (area 49.0003)

```
interface Ethernet0/0
 no shutdown
 ip address 10.0.34.3 255.255.255.0
 ip router isis 
 isis circuit-type level-1
!
interface Ethernet0/1
 no shutdown
 ip address 10.0.13.3 255.255.255.0
 ip router isis 
 isis circuit-type level-1
!
router isis
 net 49.0003.0000.0000.0003.00
 is-type level-1
```

### R4 — L1/L2 boundary (area 49.0003)

```
interface Ethernet0/0
 no shutdown
 ip address 10.0.24.4 255.255.255.0
 ip router isis 
!
interface Ethernet0/1
 no shutdown
 ip address 10.0.34.4 255.255.255.0
 ip router isis 
 isis circuit-type level-1
!
interface Ethernet0/2
 no shutdown
 ip address 10.0.47.4 255.255.255.0
 ip router isis 
 isis circuit-type level-2-only
!
router isis
 net 49.0003.0000.0000.0004.00
```

### R5 — L2 only (area 49.0004)

```
interface Ethernet0/0
 no shutdown
 ip address 10.0.25.5 255.255.255.0
 ip router isis 
 isis circuit-type level-2-only
!
router isis
 net 49.0004.0000.0000.0005.00
```

### R6 — L1 only (area 49.0001)

```
interface Ethernet0/0
 no shutdown
 ip address 10.0.67.6 255.255.255.0
 ip router isis 
 isis circuit-type level-1
!
router isis
 net 49.0001.0000.0000.0006.00
 is-type level-1
```

### R7 — L1/L2 boundary (area 49.0001)

```
interface Ethernet0/0
 no shutdown
 ip address 10.0.47.7 255.255.255.0
 ip router isis 
 isis circuit-type level-2-only
!
interface Ethernet0/1
 no shutdown
 ip address 10.0.67.7 255.255.255.0
 ip router isis 
 isis circuit-type level-1
!
interface Ethernet0/2
 no shutdown
 ip address 10.0.78.7 255.255.255.0
 ip router isis 
 isis circuit-type level-2-only
!
router isis
 net 49.0001.0000.0000.0007.00
```

### R8 — L1/L2 boundary (area 49.0002)

```
interface Ethernet0/0
 no shutdown
 ip address 10.0.78.8 255.255.255.0
 ip router isis 
 isis circuit-type level-2-only
!
interface Ethernet0/1
 no shutdown
 ip address 10.0.89.8 255.255.255.0
 ip router isis 
 isis circuit-type level-1
!
router isis
 net 49.0002.0000.0000.0008.00
```

### R9 — L1 only (area 49.0002)

```
interface Ethernet0/0
 no shutdown
 ip address 10.0.89.9 255.255.255.0
 ip router isis 
 isis circuit-type level-1
!
router isis
 net 49.0002.0000.0000.0009.00
```
