---
title: "Network Engineer — 04. OSPF Basics"
date: 2025-09-14
description: "Лабораторная работа: настройка OSPFv2 для одной зоны. Идентификаторы маршрутизаторов, пассивные интерфейсы, соседи, таблица маршрутизации, метрика OSPF."
tags: ["Networking", "OSPF", "Routing", "Cisco"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-04-ospf-basics/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Лабораторная работа: Настройка OSPFv2 для одной зоны

### Топология

![OSPFv2 topology](/img/neteng/04/OSPFv2.png)

### Таблица адресации

| Устройство | Интерфейс           | IP-адрес     | Маска подсети   | Шлюз        |
| ---------- | ------------------- | ------------ | --------------- | ----------- |
| R1         | GigabitEthernet7/0  | 192.168.1.1  | 255.255.255.0   | —           |
|            | Serial8/0 (DCE)     | 192.168.12.1 | 255.255.255.252 | —           |
|            | Serial9/0           | 192.168.13.1 | 255.255.255.252 | —           |
| R2         | GigabitEthernet7/0  | 192.168.2.1  | 255.255.255.0   | —           |
|            | Serial8/0           | 192.168.12.2 | 255.255.255.252 | —           |
|            | Serial9/0 (DCE)     | 192.168.23.1 | 255.255.255.252 | —           |
| R3         | GigabitEthernet7/0  | 192.168.3.1  | 255.255.255.0   | —           |
|            | Serial8/0 (DCE)     | 192.168.13.2 | 255.255.255.252 | —           |
|            | Serial9/0           | 192.168.23.2 | 255.255.255.252 | —           |
| PC-A       | NIC                 | 192.168.1.3  | 255.255.255.0   | 192.168.1.1 |
| PC-B       | NIC                 | 192.168.2.3  | 255.255.255.0   | 192.168.2.1 |
| PC-C       | NIC                 | 192.168.3.3  | 255.255.255.0   | 192.168.3.1 |

### Цели

- **Часть 1.** Соберите топологию, настройте базовые параметры устройств
- **Часть 2.** Настройте и проверьте маршрутизацию OSPF
- **Часть 3.** Измените идентификаторы маршрутизаторов
- **Часть 4.** Настройте пассивные интерфейсы
- **Часть 5.** Измените метрику OSPF

---

### Часть 1 — Базовая настройка устройств

<details>
<summary>R1</summary>
<pre><code>
Enable
Configure terminal
no ip domain-lookup
hostname R1
enable secret class
line vty 0 4
 logging synchronous
 password cisco
 login
line con 0
 exec-timeout 0 0
 logging synchronous
 password cisco
 login
banner motd "This is a secure system. Authorized Access Only!"
interface GigabitEthernet7/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
interface Serial8/0
 clock rate 128000
 ip address 192.168.12.1 255.255.255.252
 no shutdown
interface Serial9/0
 ip address 192.168.13.1 255.255.255.252
 no shutdown
end
write
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R2</summary>
<pre><code>
Enable
Configure terminal
hostname R2
no ip domain-lookup
enable secret class
line vty 0 4
 logging synchronous
 password cisco
 login
line con 0
 exec-timeout 0 0
 logging synchronous
 password cisco
 login
banner motd "This is a secure system. Authorized Access Only!"
interface Serial8/0
 ip address 192.168.12.2 255.255.255.252
 no shutdown
interface Serial9/0
 clock rate 128000
 ip address 192.168.23.1 255.255.255.252
 no shutdown
interface GigabitEthernet7/0
 ip address 192.168.2.1 255.255.255.0
 no shutdown
end
write
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R3</summary>
<pre><code>
Enable
Configure terminal
no ip domain-lookup
hostname R3
enable secret class
line vty 0 4
 logging synchronous
 password cisco
 login
line con 0
 exec-timeout 0 0
 logging synchronous
 password cisco
 login
banner motd "This is a secure system. Authorized Access Only!"
interface Serial8/0
 clock rate 128000
 ip address 192.168.13.2 255.255.255.252
 no shutdown
interface Serial9/0
 ip address 192.168.23.2 255.255.255.252
 no shutdown
interface GigabitEthernet7/0
 ip address 192.168.3.1 255.255.255.0
 no shutdown
do write
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>PC-A / PC-B / PC-C</summary>
<pre><code>
set pcname PC-A
ip 192.168.1.3 24 192.168.1.1

set pcname PC-B
ip 192.168.2.3 24 192.168.2.1

set pcname PC-C
ip 192.168.3.3 24 192.168.3.1
</code></pre>
</details>

---

### Часть 2 — Настройка и проверка OSPF

<details>
<summary>R1</summary>
<pre><code>
enable
configure terminal
router ospf 1
 network 192.168.1.0 0.0.0.255 area 0
 network 192.168.12.0 0.0.0.3 area 0
 network 192.168.13.0 0.0.0.3 area 0
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R2</summary>
<pre><code>
enable
configure terminal
router ospf 1
 network 192.168.2.0 0.0.0.255 area 0
 network 192.168.12.0 0.0.0.3 area 0
 network 192.168.23.0 0.0.0.3 area 0
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R3</summary>
<pre><code>
enable
configure terminal
router ospf 1
 network 192.168.3.0 0.0.0.255 area 0
 network 192.168.13.0 0.0.0.3 area 0
 network 192.168.23.0 0.0.0.3 area 0
end
copy running-config startup-config
</code></pre>
</details>

Проверьте соседей и маршрутизацию:

```
show ip ospf neighbor
show ip route
show ip protocols
show ip ospf
show ip ospf interface
```

<details>
<summary>R1 — show ip ospf neighbor</summary>
<pre><code>
R1#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
192.168.23.1      0   FULL/  -        00:00:39    192.168.12.2    Serial8/0
192.168.23.2      0   FULL/  -        00:00:34    192.168.13.2    Serial9/0
</code></pre>
</details>
<details>
<summary>R2 — show ip ospf neighbor</summary>
<pre><code>
R2#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
192.168.13.1      0   FULL/  -        00:00:39    192.168.12.1    Serial8/0
192.168.23.2      0   FULL/  -        00:00:34    192.168.23.2    Serial9/0
</code></pre>
</details>
<details>
<summary>R3 — show ip ospf neighbor</summary>
<pre><code>
R3#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
192.168.13.1      0   FULL/  -        00:00:39    192.168.13.1    Serial8/0
192.168.23.1      0   FULL/  -        00:00:34    192.168.23.1    Serial9/0
</code></pre>
</details>
<details>
<summary>R1 — show ip route</summary>
<pre><code>
R1#show ip route
Codes: C - connected, S - static, I - IGRP, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2, E - EGP
       i - IS-IS, L1 - IS-IS level-1, L2 - IS-IS level-2, ia - IS-IS inter area
       * - candidate default, U - per-user static route, o - ODR
       P - periodic downloaded static route

Gateway of last resort is not set

C    192.168.1.0/24 is directly connected, GigabitEthernet7/0
O    192.168.2.0/24 [110/65] via 192.168.12.2, 00:01:00, Serial8/0
O    192.168.3.0/24 [110/65] via 192.168.13.2, 00:00:50, Serial9/0
     192.168.12.0/30 is subnetted, 1 subnets
C       192.168.12.0 is directly connected, Serial8/0
     192.168.13.0/30 is subnetted, 1 subnets
C       192.168.13.0 is directly connected, Serial9/0
     192.168.23.0/30 is subnetted, 1 subnets
O       192.168.23.0 [110/128] via 192.168.12.2, Serial8/0
                     [110/128] via 192.168.13.2, Serial9/0
</code></pre>
</details>
<details>
<summary>R1 — show ip protocols</summary>
<pre><code>
R1#show ip protocols

Routing Protocol is "ospf 1"
  Outgoing update filter list for all interfaces is not set
  Incoming update filter list for all interfaces is not set
  Router ID 192.168.13.1
  Number of areas in this router is 1. 1 normal 0 stub 0 nssa
  Maximum path: 4
  Routing for Networks:
    192.168.1.0 0.0.0.255 area 0
    192.168.12.0 0.0.0.3 area 0
    192.168.13.0 0.0.0.3 area 0
  Routing Information Sources:
    Gateway         Distance      Last Update
    192.168.13.1       110      00:01:58
    192.168.23.1       110      00:01:59
    192.168.23.2       110      00:01:54
  Distance: (default is 110)
</code></pre>
</details>
<details>
<summary>R1 — show ip ospf</summary>
<pre><code>
R1#show ip ospf
 Routing Process "ospf 1" with ID 192.168.13.1
 Supports only single TOS(TOS0) routes
 Supports opaque LSA
 SPF schedule delay 5 secs, Hold time between two SPFs 10 secs
 Minimum LSA interval 5 secs. Minimum LSA arrival 1 secs
 Number of external LSA 0. Checksum Sum 0x000000
 Number of opaque AS LSA 0. Checksum Sum 0x000000
 Number of DCbitless external and opaque AS LSA 0
 Number of DoNotAge external and opaque AS LSA 0
 Number of areas in this router is 1. 1 normal 0 stub 0 nssa
 External flood list length 0
    Area BACKBONE(0)
        Number of interfaces in this area is 3
        Area has no authentication
        SPF algorithm executed 3 times
        Area ranges are
        Number of LSA 3. Checksum Sum 0x00bca0
        Number of opaque link LSA 0. Checksum Sum 0x000000
        Number of DCbitless LSA 0
        Number of indication LSA 0
        Number of DoNotAge LSA 0
        Flood list length 0
</code></pre>
</details>
<details>
<summary>R1 — show ip ospf interface</summary>
<pre><code>
R1#show ip ospf interface

GigabitEthernet7/0 is up, line protocol is up
  Internet address is 192.168.1.1/24, Area 0
  Process ID 1, Router ID 192.168.13.1, Network Type BROADCAST, Cost: 1
  Transmit Delay is 1 sec, State DR, Priority 1
  Designated Router (ID) 192.168.13.1, Interface address 192.168.1.1
  No backup designated router on this network
  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5
    Hello due in 00:00:04
  Neighbor Count is 0, Adjacent neighbor count is 0
Serial8/0 is up, line protocol is up
  Internet address is 192.168.12.1/30, Area 0
  Process ID 1, Router ID 192.168.13.1, Network Type POINT-TO-POINT, Cost: 64
  Transmit Delay is 1 sec, State POINT-TO-POINT,
  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5
    Hello due in 00:00:04
  Neighbor Count is 1, Adjacent neighbor count is 1
    Adjacent with neighbor 192.168.23.1
Serial9/0 is up, line protocol is up
  Internet address is 192.168.13.1/30, Area 0
  Process ID 1, Router ID 192.168.13.1, Network Type POINT-TO-POINT, Cost: 64
  Transmit Delay is 1 sec, State POINT-TO-POINT,
  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5
    Hello due in 00:00:00
  Neighbor Count is 1, Adjacent neighbor count is 1
    Adjacent with neighbor 192.168.23.2
</code></pre>
</details>

Проверьте сквозную связность:

<details>
<summary>Ping с PC-A</summary>
<pre><code>
enable
configure terminal
C:\>ping 192.168.1.3

Pinging 192.168.1.3 with 32 bytes of data:
Reply from 192.168.1.3: bytes=32 time<1ms TTL=128
Reply from 192.168.1.3: bytes=32 time=2ms TTL=128
Reply from 192.168.1.3: bytes=32 time=4ms TTL=128
Reply from 192.168.1.3: bytes=32 time=2ms TTL=128

Ping statistics for 192.168.1.3:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)

C:\>ping 192.168.2.3

Pinging 192.168.2.3 with 32 bytes of data:

Request timed out.
Reply from 192.168.2.3: bytes=32 time=2ms TTL=126
Reply from 192.168.2.3: bytes=32 time=1ms TTL=126
Reply from 192.168.2.3: bytes=32 time=2ms TTL=126

Ping statistics for 192.168.2.3:
    Packets: Sent = 4, Received = 3, Lost = 1 (25% loss)

C:\>ping 192.168.3.3

Pinging 192.168.3.3 with 32 bytes of data:

Request timed out.
Reply from 192.168.3.3: bytes=32 time=1ms TTL=126
Reply from 192.168.3.3: bytes=32 time=3ms TTL=126
Reply from 192.168.3.3: bytes=32 time=1ms TTL=126

Ping statistics for 192.168.3.3:
    Packets: Sent = 4, Received = 3, Lost = 1 (25% loss)
</code></pre>
</details>

---

### Часть 3 — Идентификаторы маршрутизаторов

Порядок выбора Router ID в OSPF:
1. Явно заданная команда `router-id`
2. Наибольший IP-адрес loopback-интерфейса
3. Наибольший IP-адрес активного физического интерфейса

**Шаг 1 — Router ID через loopback**

Настройте Loopback0 на каждом маршрутизаторе и сбросьте процесс OSPF:

<details>
<summary>R1</summary>
<pre><code>
enable
configure terminal
interface Loopback0
 ip address 1.1.1.1 255.255.255.255
end
clear ip ospf process
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R2</summary>
<pre><code>
enable
configure terminal
interface Loopback0
 ip address 2.2.2.2 255.255.255.255
end
clear ip ospf process
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R3</summary>
<pre><code>
enable
configure terminal
interface Loopback0
 ip address 3.3.3.3 255.255.255.255
end
clear ip ospf process
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R1 — show ip protocols (Router ID 1.1.1.1)</summary>
<pre><code>
R1#show ip protocols

Routing Protocol is "ospf 1"
  Outgoing update filter list for all interfaces is not set
  Incoming update filter list for all interfaces is not set
  Router ID 1.1.1.1
  Number of areas in this router is 1. 1 normal 0 stub 0 nssa
  Maximum path: 4
  Routing for Networks:
    192.168.1.0 0.0.0.255 area 0
    192.168.12.0 0.0.0.3 area 0
    192.168.13.0 0.0.0.3 area 0
  Routing Information Sources:
    Gateway         Distance      Last Update
    1.1.1.1            110      00:00:42
    2.2.2.2            110      00:00:47
    3.3.3.3            110      00:00:42
  Distance: (default is 110)
</code></pre>
</details>
<details>
<summary>R1 — show ip ospf neighbor</summary>
<pre><code>
R1#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
3.3.3.3           0   FULL/  -        00:00:31    192.168.13.2    Serial9/0
2.2.2.2           0   FULL/  -        00:00:35    192.168.12.2    Serial8/0
</code></pre>
</details>

**Шаг 2 — Явный Router ID**

Команда `router-id` имеет приоритет над loopback:

<details>
<summary>R1</summary>
<pre><code>
enable
configure terminal
router ospf 1
 router-id 11.11.11.11
end
clear ip ospf process
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R2</summary>
<pre><code>
enable
configure terminal
router ospf 1
 router-id 22.22.22.22
end
clear ip ospf process
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R3</summary>
<pre><code>
enable
configure terminal
router ospf 1
 router-id 33.33.33.33
end
clear ip ospf process
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R1 — show ip protocols (Router ID 11.11.11.11)</summary>
<pre><code>
R1#show ip protocols

Routing Protocol is "ospf 1"
  Outgoing update filter list for all interfaces is not set
  Incoming update filter list for all interfaces is not set
  Router ID 11.11.11.11
  Number of areas in this router is 1. 1 normal 0 stub 0 nssa
  Maximum path: 4
  Routing for Networks:
    192.168.1.0 0.0.0.255 area 0
    192.168.12.0 0.0.0.3 area 0
    192.168.13.0 0.0.0.3 area 0
  Routing Information Sources:
    Gateway         Distance      Last Update
    1.1.1.1            110      00:25:30
    2.2.2.2            110      00:02:00
    3.3.3.3            110      00:01:16
    11.11.11.11        110      00:00:39
    22.22.22.22        110      00:00:51
    33.33.33.33        110      00:00:39
  Distance: (default is 110)
</code></pre>
</details>
<details>
<summary>R1 — show ip ospf neighbor</summary>
<pre><code>
R1#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
33.33.33.33       0   FULL/  -        00:00:31    192.168.13.2    Serial9/0
22.22.22.22       0   FULL/  -        00:00:35    192.168.12.2    Serial8/0
</code></pre>
</details>
<details>
<summary>R3 — show ip ospf neighbor</summary>
<pre><code>
enable
configure terminal
R3(config-router)#do sh ip os nei

Neighbor ID     Pri   State           Dead Time   Address         Interface
11.11.11.11       0   FULL/  -        00:00:36    192.168.13.1    Serial8/0
end
copy running-config startup-config
</code></pre>
</details>

---

### Часть 4 — Пассивные интерфейсы

Пассивный интерфейс прекращает отправку OSPF hello-пакетов. Применяется на LAN-интерфейсах, где нет соседей OSPF.

Проверьте состояние до применения:

<details>
<summary>R1 — show ip ospf interface gi7/0 (до passive)</summary>
<pre><code>
R1#show ip ospf interface gigabitEthernet 7/0

GigabitEthernet7/0 is up, line protocol is up
  Internet address is 192.168.1.1/24, Area 0
  Process ID 1, Router ID 192.168.13.1, Network Type BROADCAST, Cost: 1
  Transmit Delay is 1 sec, State DR, Priority 1
  Designated Router (ID) 192.168.13.1, Interface address 192.168.1.1
  No backup designated router on this network
  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5
    Hello due in 00:00:09
  Neighbor Count is 0, Adjacent neighbor count is 0
</code></pre>
</details>

Настройте пассивный интерфейс на LAN-порту R1:

```
R1(config)# router ospf 1
R1(config-router)# passive-interface GigabitEthernet7/0
```

Или сделайте все интерфейсы пассивными по умолчанию и выборочно активируйте WAN:

```
R1(config-router)# passive-interface default
R1(config-router)# no passive-interface Serial8/0
R1(config-router)# no passive-interface Serial9/0
```

<details>
<summary>R1 — show ip ospf interface gi7/0 (после passive)</summary>
<pre><code>
enable
configure terminal
R1(config-router)#do show ip ospf interface gigabitEthernet 7/0

GigabitEthernet7/0 is up, line protocol is up
  Internet address is 192.168.1.1/24, Area 0
  Process ID 1, Router ID 192.168.13.1, Network Type BROADCAST, Cost: 1
  Transmit Delay is 1 sec, State WAITING, Priority 1
  No designated router on this network
  No backup designated router on this network
  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5
    No Hellos (Passive interface)
  Neighbor Count is 0, Adjacent neighbor count is 0
end
copy running-config startup-config
</code></pre>
</details>

Соседи на WAN-каналах остаются активными:

<details>
<summary>R1 — show ip ospf neighbor</summary>
<pre><code>
enable
configure terminal
R1(config-router)#do sh ip os neig

Neighbor ID     Pri   State           Dead Time   Address         Interface
33.33.33.33       0   FULL/  -        00:00:38    192.168.13.2    Serial9/0
22.22.22.22       0   FULL/  -        00:00:36    192.168.12.2    Serial8/0
end
copy running-config startup-config
</code></pre>
</details>

Проверьте таблицы маршрутизации после настройки passive на всех маршрутизаторах:

<details>
<summary>R2 — show ip route</summary>
<pre><code>
enable
configure terminal
R2(config-router)#do sh ip rou
Codes: C - connected, S - static, I - IGRP, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2, E - EGP
       i - IS-IS, L1 - IS-IS level-1, L2 - IS-IS level-2, ia - IS-IS inter area
       * - candidate default, U - per-user static route, o - ODR
       P - periodic downloaded static route

Gateway of last resort is not set

     2.0.0.0/32 is subnetted, 1 subnets
C       2.2.2.2 is directly connected, Loopback0
O    192.168.1.0/24 [110/65] via 192.168.12.1, 00:02:00, Serial8/0
C    192.168.2.0/24 is directly connected, GigabitEthernet7/0
O    192.168.3.0/24 [110/65] via 192.168.23.2, 00:01:50, Serial9/0
     192.168.12.0/30 is subnetted, 1 subnets
C       192.168.12.0 is directly connected, Serial8/0
     192.168.13.0/30 is subnetted, 1 subnets
O       192.168.13.0 [110/128] via 192.168.23.2, 00:01:50, Serial9/0
                     [110/128] via 192.168.12.1, 00:01:50, Serial8/0
     192.168.23.0/30 is subnetted, 1 subnets
C       192.168.23.0 is directly connected, Serial9/0
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R2 — show ip ospf interface S8/0 (пассивный)</summary>
<pre><code>
enable
configure terminal
R2(config-router)#do show ip ospf interface S8/0

Serial8/0 is up, line protocol is up
  Internet address is 192.168.12.2/30, Area 0
  Process ID 1, Router ID 22.22.22.22, Network Type POINT-TO-POINT,
  Transmit Delay is 1 sec, State POINT-TO-POINT,
    No Hellos (Passive interface)
  Neighbor Count is 0, Adjacent neighbor count is 0
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R3 — show ip route</summary>
<pre><code>
enable
configure terminal
R3(config-router)#do sh ip route
...
     3.0.0.0/32 is subnetted, 1 subnets
C       3.3.3.3 is directly connected, Loopback0
O    192.168.1.0/24 [110/65] via 192.168.13.1, 00:34:29, Serial8/0
O    192.168.2.0/24 [110/65] via 192.168.23.1, 00:02:18, Serial9/0
C    192.168.3.0/24 is directly connected, GigabitEthernet7/0
     192.168.12.0/30 is subnetted, 1 subnets
O       192.168.12.0 [110/128] via 192.168.13.1, Serial8/0
     192.168.13.0/30 is subnetted, 1 subnets
C       192.168.13.0 is directly connected, Serial8/0
     192.168.23.0/30 is subnetted, 1 subnets
C       192.168.23.0 is directly connected, Serial9/0
end
copy running-config startup-config
</code></pre>
</details>

---

### Часть 5 — Метрика OSPF (стоимость)

Стоимость OSPF = эталонная пропускная способность / пропускная способность интерфейса. Эталон по умолчанию: 100 Мбит/с.

Проверьте базовые значения стоимости маршрутов:

<details>
<summary>R1 — show ip route ospf (базовые значения)</summary>
<pre><code>
R1#do sh ip rout os
O    192.168.2.0/24 [110/65] via 192.168.12.2, 00:17:18, Serial8/0
O    192.168.3.0/24 [110/65] via 192.168.13.2, 00:17:18, Serial9/0
     192.168.23.0/30 is subnetted, 1 subnets
O       192.168.23.0 [110/128] via 192.168.12.2, Serial8/0
                     [110/128] via 192.168.13.2, Serial9/0
</code></pre>
</details>

Проверьте полосу пропускания последовательного интерфейса:

<details>
<summary>R1 — show interface s8/0</summary>
<pre><code>
R1#show interface s8/0
Serial8/0 is up, line protocol is up (connected)
  Hardware is HD64570
  Internet address is 192.168.12.1/30
  MTU 1500 bytes, BW 128 Kbit, DLY 20000 usec,
</code></pre>
</details>

**Изменение auto-cost reference-bandwidth** (применить на всех маршрутизаторах):

```
router ospf 1
 auto-cost reference-bandwidth 10000
```

<details>
<summary>R1 — show ip ospf interface gi7/0 (Cost: 100)</summary>
<pre><code>
enable
configure terminal
R1(config-if)#do sh ip os int gi7/0

GigabitEthernet7/0 is up, line protocol is up
  Internet address is 192.168.1.1/24, Area 0
  Process ID 1, Router ID 11.11.11.11, Network Type BROADCAST, Cost: 100
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R1 — show ip route ospf (после ref-bw 10000)</summary>
<pre><code>
R1#do sh ip rout os
O    192.168.2.0/24 [110/6477] via 192.168.12.2, 00:02:35, Serial8/0
O    192.168.3.0/24 [110/6477] via 192.168.13.2, 00:02:35, Serial9/0
     192.168.23.0/30 is subnetted, 1 subnets
O       192.168.23.0 [110/6540] via 192.168.12.2, 00:02:35, Serial8/0
                     [110/6540] via 192.168.13.2, 00:02:35, Serial9/0
</code></pre>
</details>

Восстановите эталонную пропускную способность на всех маршрутизаторах:

```
router ospf 1
 no auto-cost reference-bandwidth
```

**Настройка полосы пропускания интерфейса**

Увеличьте bandwidth на Serial8/0, чтобы отразить более быстрой канал:

```
R1(config)# interface Serial8/0
R1(config-if)# bandwidth 2500
```

<details>
<summary>R1 — show interface s8/0 (BW 2500)</summary>
<pre><code>
enable
configure terminal
R1(config-if)#do show interface serial 8/0
Serial8/0 is up, line protocol is up (connected)
  Hardware is HD64570
  Internet address is 192.168.12.1/30
  MTU 1500 bytes, BW 2500 Kbit, DLY 20000 usec,
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R1 — show ip route ospf (после bandwidth 2500)</summary>
<pre><code>
enable
configure terminal
R1(config-if)#do sh ip rout os
O    192.168.2.0/24 [110/41] via 192.168.12.2, 00:01:09, Serial8/0
O    192.168.3.0/24 [110/65] via 192.168.13.2, 00:21:54, Serial9/0
     192.168.23.0/30 is subnetted, 1 subnets
O       192.168.23.0 [110/104] via 192.168.12.2, 00:01:09, Serial8/0
end
copy running-config startup-config
</code></pre>
</details>

Стоимость Serial8/0 снизилась до 40 (100000 / 2500) — этот канал стал предпочтительным для маршрутов через R2.

**Явная установка ip ospf cost**

Переопределите стоимость, чтобы направить трафик через Serial9/0:

```
R1(config)# interface Serial8/0
R1(config-if)# ip ospf cost 1565
```

<details>
<summary>R1 — show ip route ospf (трафик переключается на Serial9/0)</summary>
<pre><code>
enable
configure terminal
R3(config-router)#do sh ip rout os
O    192.168.2.0/24 [110/65] via 192.168.13.2, 00:00:05, Serial9/0
O    192.168.3.0/24 [110/65] via 192.168.13.2, 00:06:13, Serial9/0
     192.168.23.0/30 is subnetted, 1 subnets
O       192.168.23.0 [110/128] via 192.168.13.2, 00:00:05, Serial9/0
end
copy running-config startup-config
</code></pre>
</details>

Удалите переопределение для восстановления балансировки:

```
R1(config-if)# no ip ospf cost
```

<details>
<summary>R1 — show ip route ospf (равностоимостные маршруты восстановлены)</summary>
<pre><code>
R1#show ip route ospf
O    192.168.2.0/24 [110/65] via 192.168.12.2, 00:17:18, Serial8/0
O    192.168.3.0/24 [110/65] via 192.168.13.2, 00:17:18, Serial9/0
     192.168.23.0/30 is subnetted, 1 subnets
O       192.168.23.0 [110/128] via 192.168.12.2, Serial8/0
                     [110/128] via 192.168.13.2, Serial9/0
</code></pre>
</details>

---

*Network Engineer Course | Лабораторная работа 04*
