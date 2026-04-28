---
title: "GRE Tunnels — Hub-and-Spoke"
description: "GRE tunnel configuration in Hub-and-Spoke topology with NAT"
icon: "🔗"
tags: ["Networking", "GRE", "VPN", "Tunneling", "Cisco"]
date: 2026-01-17
---

<div class="intro-card">
GRE Hub-and-Spoke: one MainOffice router terminates tunnels to all branches. Branches reach each other via hub. As branch count grows, hub load increases — the limitation that <strong>DMVPN</strong> solves.
</div>

## Topology

![](/img/neteng/sl-gre/topology_vpn.png)

![](/img/neteng/sl-gre/GRE.png)

## Configurations

### MainOffice

```
enable
configure terminal
!
hostname MainOffice
no ip domain lookup
!
interface Tunnel0
 ip address 172.20.20.1 255.255.255.0
 no ip route-cache
 keepalive 10 3
 tunnel source Ethernet0/0
 tunnel destination 12.12.12.12
 tunnel key 3
 tunnel sequence-datagrams
 tunnel checksum
!         
interface Tunnel1
 ip address 172.20.21.1 255.255.255.0
 no ip route-cache
 keepalive 10 3
 tunnel source Ethernet0/0
 tunnel destination 13.13.13.14
 tunnel key 3
 tunnel sequence-datagrams
 tunnel checksum
!         
interface Ethernet0/0
 ip address 25.25.25.25 255.255.255.0
 ip nat outside
 ip virtual-reassembly in
 duplex auto
!         
interface Ethernet0/1
 ip address 192.168.1.1 255.255.255.0
 ip nat inside
 ip virtual-reassembly in
 duplex auto
!
ip nat inside source list 1 interface Ethernet0/0 overload
ip route 0.0.0.0 0.0.0.0 25.25.25.24
ip route 192.168.2.0 255.255.255.0 Tunnel0
ip route 192.168.3.0 255.255.255.0 Tunnel1
!                  
access-list 1 permit 192.168.1.0 0.0.0.255
!
line con 0
 exec-timeout 0 0
 logging synchronous
end
!
wr
```

### Branch

```
enable
configure terminal
!
hostname Branch
no ip domain lookup
!
interface Tunnel0
 ip address 172.20.20.2 255.255.255.0
 no ip route-cache
 keepalive 10 3
 tunnel source Ethernet0/0
 tunnel destination 25.25.25.25
 tunnel key 3
 tunnel sequence-datagrams
 tunnel checksum
!
interface Ethernet0/0
 ip address 12.12.12.12 255.255.255.0
 ip nat outside
 ip virtual-reassembly in
 duplex auto
!
interface Ethernet0/1
 ip address 192.168.2.1 255.255.255.0
 ip nat inside
 ip virtual-reassembly in
 duplex auto
!
ip nat inside source list 1 interface Ethernet0/0 overload
ip route 0.0.0.0 0.0.0.0 12.12.12.13
ip route 192.168.1.0 255.255.255.0 Tunnel0
ip route 192.168.3.0 255.255.255.0 Tunnel0
!
access-list 1 permit 192.168.2.0 0.0.0.255
!
line con 0
 exec-timeout 0 0
 logging synchronous
!
end
wr
```

### Branch2

```
enable
configure terminal
!
hostname Branch2             
no ip domain lookup      
!         
interface Tunnel0
 ip address 172.20.21.2 255.255.255.0
 no ip route-cache
 keepalive 10 3
 tunnel source Ethernet0/0
 tunnel destination 25.25.25.25
 tunnel key 3
 tunnel sequence-datagrams
 tunnel checksum
!         
interface Ethernet0/0
 ip address 13.13.13.14 255.255.255.0
 ip nat outside
 ip virtual-reassembly in
 duplex auto
!         
interface Ethernet0/1
 ip address 192.168.3.1 255.255.255.0
 ip nat inside
 ip virtual-reassembly in
 duplex auto
!
ip nat inside source list 1 interface Ethernet0/0 overload
ip route 0.0.0.0 0.0.0.0 Ethernet0/0
ip route 192.168.1.0 255.255.255.0 Tunnel0
ip route 192.168.2.0 255.255.255.0 Tunnel0    
!
access-list 1 permit 192.168.3.0 0.0.0.255
!
line con 0
 exec-timeout 0 0
 logging synchronous
!
end
wr
```

## Summary

Branch-to-branch traffic routes through MainOffice. Doesn't fully solve scalability — hub load grows with each branch. Next step: **DMVPN**.
