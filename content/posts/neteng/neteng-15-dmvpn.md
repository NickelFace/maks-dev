---
title: "Network Engineer — 15. DMVPN"
date: 2025-12-23
description: "Configuring a GRE tunnel between Moscow and St. Petersburg, and DMVPN between Moscow, Chokurdakh, and Labytnangi"
tags: ["Networking", "DMVPN", "GRE", "VPN", "Cisco", "OTUS"]
categories: ["Network Engineer"]
code_toggle: true
lang_pair: "/posts/neteng/ru/neteng-15-dmvpn/"
---

# Virtual Private Networks — VPN
<p class="ru-text">Виртуальная частные сети — VPN</p>

![](/img/neteng/11/1.png)

## Assignment
<p class="ru-text">Домашнее задание</p>

Goal: Configure GRE between the Moscow and St. Petersburg offices. Configure DMVPN between Moscow and Chokurdakh/Labytnangi.
<p class="ru-text">Цель: Настроить GRE между офисами Москва и С.-Петербург. Настроить DMVPN между офисами Москва и Чокурдах, Лабытнанги.</p>

In this lab you are expected to independently:
<p class="ru-text">В этой самостоятельной работе мы ожидаем, что вы самостоятельно:</p>

1. Configure GRE between the Moscow and St. Petersburg offices
2. Configure DMVPN between Moscow and Chokurdakh/Labytnangi
3. All nodes in all offices must have IP connectivity
4. Document the plan and changes

<p class="ru-text">

1. Настроите GRE между офисами Москва и С.-Петербург
2. Настроите DMVPN между Москва и Чокурдах, Лабытнанги
3. Все узлы в офисах в лабораторной работе должны иметь IP связность
4. План работы и изменения зафиксированы в документации

</p>

### Configure GRE between the Moscow and St. Petersburg offices
<p class="ru-text">Настроите GRE между офисами Москва и С.-Петербург</p>

R15

```
interface Tunnel0
 ip address 10.0.0.1 255.255.255.252
 tunnel source 200.20.20.15
 tunnel destination 100.10.8.18
```

R18

```
interface Tunnel0
 ip address 10.0.0.2 255.255.255.252
 tunnel source 100.10.8.18
 tunnel destination 200.20.20.15
```

### Configure DMVPN between Moscow and Chokurdakh/Labytnangi
<p class="ru-text">Настроите DMVPN между Москва и Чокурдах, Лабытнанги</p>

R14 (Hub)

```
interface Tunnel0
 description DMVPN Tunnel
 ip address 10.1.0.1 255.255.255.0
 no ip redirects
 ip mtu 1440
 ip nhrp authentication nhrp1234
 ip nhrp map multicast dynamic
 ip nhrp network-id 1
 load-interval 30
 keepalive 5 10
 tunnel source 200.20.20.14
 tunnel mode gre multipoint
```

R28 (Spoke)

```
interface Tunnel0
 ip address 10.1.0.2 255.255.255.0
 no ip redirects
 ip mtu 1440
 ip nhrp authentication nhrp1234
 ip nhrp map multicast dynamic
 ip nhrp map 10.1.0.1 200.20.20.14
 ip nhrp map multicast 200.20.20.14
 ip nhrp network-id 1
 ip nhrp nhs 10.1.0.1
 ip nhrp registration no-unique
 load-interval 30
 keepalive 5 10
 tunnel source Ethernet0/0  ! Chokurdakh has no own networks, using Triada's IP
 tunnel mode gre multipoint
```

R27 (Spoke)

```
interface Tunnel0
 ip address 10.1.0.3 255.255.255.0
 no ip redirects
 ip mtu 1440
 ip nhrp authentication nhrp1234
 ip nhrp map multicast dynamic
 ip nhrp map 10.1.0.1 200.20.20.14
 ip nhrp map multicast 200.20.20.14
 ip nhrp network-id 1
 ip nhrp nhs 10.1.0.1
 ip nhrp registration no-unique
 load-interval 30
 keepalive 5 10
 tunnel source Ethernet0/0 ! Labytnangi has no own networks, using Triada's IP
 tunnel mode gre multipoint
```

### Verify IP connectivity across all offices
<p class="ru-text">Все узлы в офисах в лабораторной работе должны иметь IP связность</p>

R14

```
! DMVPN

R14#ping 10.1.0.1 
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 10.1.0.1, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 4/4/5 ms
R14#ping 10.1.0.2
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 10.1.0.2, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 2/4/7 ms
R14#ping 10.1.0.3
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 10.1.0.3, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 4/5/7 ms

R14#show dmvpn 
Legend: Attrb --> S - Static, D - Dynamic, I - Incomplete
        N - NATed, L - Local, X - No Socket
        T1 - Route Installed, T2 - Nexthop-override
        C - CTS Capable
        # Ent --> Number of NHRP entries with same NBMA peer
        NHS Status: E --> Expecting Replies, R --> Responding, W --> Waiting
        UpDn Time --> Up or Down Time for a Tunnel
==========================================================================

Interface: Tunnel0, IPv4 NHRP Details 
Type:Hub, NHRP Peers:3, 

 # Ent  Peer NBMA Addr Peer Tunnel Add State  UpDn Tm Attrb
 ----- --------------- --------------- ----- -------- -----
     1 UNKNOWN                10.1.0.1  NHRP    never    IX
     1 111.110.35.14          10.1.0.2    UP 00:03:22     D
     1 210.110.35.2           10.1.0.3    UP 00:03:38     D
```

R15

```
! GRE Tunnel

R15>ping 10.0.0.2
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 10.0.0.2, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 5/5/7 ms
R15>ping 10.0.0.1
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 10.0.0.1, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 1/4/5 ms
```

### Documentation
<p class="ru-text">План работы и изменения зафиксированы в документации</p>

https://1drv.ms/u/s!AiW_chHQt5JCg64XQ0nBMdjjoQ3bLw?e=B1LOJE
