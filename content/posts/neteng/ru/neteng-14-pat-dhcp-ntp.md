---
title: "Network Engineer — 14. PAT, DHCP, NTP"
date: 2025-12-15
description: "Настройка NAT/PAT, DHCP-сервера и синхронизации времени NTP для офисов Москва, Санкт-Петербург и Чокурдах"
tags: ["Networking", "NAT", "PAT", "DHCP", "NTP", "Cisco", "OTUS"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-14-pat-dhcp-ntp/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## PAT, DHCP, NTP

### Домашнее задание

Цель: Настроить DHCP в офисе Москва. Настроить синхронизацию времени в офисе Москва. Настроить NAT в офисе Москва, С.-Петербург и Чокурдах.

1. Настроить NAT(PAT) на R14 и R15. Трансляция должна осуществляться в адрес автономной системы AS1001
2. Настроить NAT(PAT) на R18. Трансляция должна осуществляться в пул из 5 адресов автономной системы AS2042
3. Настроить статический NAT для R20
4. Настроить NAT так, чтобы R19 был доступен с любого узла для удалённого управления
5. Настроить статический NAT(PAT) для офиса Чокурдах
6. Настроить DHCP сервер в офисе Москва на маршрутизаторах R12 и R13. VPC1 и VPC7 должны получать сетевые настройки по DHCP
7. Настроить NTP сервер на R12 и R13. Все устройства в офисе Москва должны синхронизировать время с R12 и R13
8. Все офисы в лабораторной работе должны иметь IP связность
9. План работы и изменения зафиксированы в документации

![Топология EVE](/img/neteng/11/1.png)

---

## NAT(PAT) — Москва R14 и R15

Трансляция выполняется в адрес Loopback-интерфейса из пространства AS1001, анонсируемого через BGP.

<details>
<summary>R14 — настройка NAT</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0
 ip nat inside

interface Ethernet0/1
 ip nat inside

interface Ethernet0/2
 ip nat outside

interface Ethernet0/3
 ip nat inside

interface Ethernet1/0
 ip nat inside

ip nat pool OVRLD 200.20.20.14 200.20.20.14 netmask 255.255.252.0
ip nat inside source list 10 pool OVRLD overload

access-list 10 permit 10.10.10.0 0.0.0.31
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R15 — настройка NAT</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0
 ip nat inside

interface Ethernet0/1
 ip nat inside

interface Ethernet0/2
 ip nat outside

interface Ethernet0/3
 ip nat inside

interface Ethernet1/0
 ip nat inside

ip nat pool OVRLD 200.20.20.15 200.20.20.15 netmask 255.255.252.0
ip nat inside source list 10 pool OVRLD overload

access-list 10 permit 10.10.10.0 0.0.0.31
end
copy running-config startup-config
</code></pre>
</details>

---

## NAT(PAT) — Санкт-Петербург R18

R18 имеет два аплинка в Триаду (R24 через e0/2, R26 через e0/3). Трафик делится между двумя провайдерскими подсетями: первая половина NAT за **77.77.77.8/30**, вторая за **77.77.77.12/30**.

<details>
<summary>R18 — настройка NAT</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0
 ip nat inside

interface Ethernet0/1
 ip nat inside

interface Ethernet0/2
 ip nat outside

interface Ethernet0/3
 ip nat outside

ip nat pool OVRLD  77.77.77.10 77.77.77.10 netmask 255.255.255.252
ip nat pool OVRLD1 77.77.77.14 77.77.77.14 netmask 255.255.255.252

ip nat inside source list 10 pool OVRLD  overload
ip nat inside source list 11 pool OVRLD1 overload

access-list 10 permit 10.10.20.0 0.0.0.3
access-list 10 permit 172.16.10.0 0.0.0.255

access-list 11 permit 10.10.20.4 0.0.0.3
access-list 11 permit 10.10.20.8 0.0.0.3
access-list 11 permit 172.16.11.0 0.0.0.255
end
copy running-config startup-config
</code></pre>
</details>

---

## Статический NAT для R20

Внутренний Loopback-адрес R20 (из пространства 1.1.1.x) статически транслируется в публичный адрес диапазона 200.20.20.0/22. Запись прописана на обоих R14 и R15 для резервирования.

<details>
<summary>R14 — статический NAT для R20</summary>
<pre><code>
enable
configure terminal
interface Loopback14
 ip address 200.20.20.14 255.255.252.0

ip nat inside source static 1.1.1.20 200.20.20.20

router bgp 1001
 network 200.20.20.0 mask 255.255.252.0
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R15 — статический NAT для R20</summary>
<pre><code>
enable
configure terminal
interface Loopback15
 ip address 200.20.20.15 255.255.252.0

ip nat inside source static 1.1.1.20 200.20.20.20

router bgp 1001
 network 200.20.20.0 mask 255.255.252.0
end
copy running-config startup-config
</code></pre>
</details>

Трафик предпочтительно идёт через R15 — настроено на уровне IGP (OSPF) и EGP (BGP). При падении R15 трафик автоматически переключается на R14.

<details>
<summary>Управление трафиком — OSPF + BGP</summary>
<pre><code>
enable
configure terminal
! IGP: R15 анонсирует дефолт с меньшей метрикой
R14:
router ospf 1
 default-information originate metric 20

R15:
router ospf 1
 default-information originate metric 10

! EGP: маршруты от R21 помечаются LP=150, что предпочтительнее R14.
! R14 увеличивает AS-path на выход к Киторн, делая свой путь менее предпочтительным.

R15:
router bgp 1001
 neighbor 111.111.111.2 route-map LP in

route-map LP permit 10
 set local-preference 150

R14:
route-map SET-ASPATH permit 10
 set as-path prepend 1001 1001 1001

router bgp 1001
 neighbor 100.100.100.2 route-map SET-ASPATH out
end
copy running-config startup-config
</code></pre>
</details>

Проверка с traceroute из Лабытнанги и Санкт-Петербурга:

<details>
<summary>R27 / R32 — traceroute до 200.20.20.20</summary>
<pre><code>
R27>traceroute 200.20.20.20
  1 210.110.35.1 1 msec 0 msec 1 msec
  2 10.10.30.5 0 msec 0 msec 1 msec
  3 10.10.30.2 1 msec 1 msec 1 msec
  4 111.111.111.5 1 msec 1 msec 1 msec
  5 111.111.111.1 2 msec 2 msec 1 msec
  6 200.20.20.20 2 msec *  3 msec

R32>traceroute 200.20.20.20
  1 10.10.20.9 0 msec 1 msec 0 msec
  2 10.10.20.5 1 msec 0 msec 1 msec
  3 77.77.77.13 [AS 520] 2 msec 1 msec 1 msec
  4 10.10.30.13 2 msec 1 msec 2 msec
  5 111.111.111.5 [AS 301] 1 msec 1 msec 1 msec
  6 111.111.111.1 [AS 301] 2 msec 1 msec 1 msec
  7 200.20.20.20 [AS 1001] 3 msec
</code></pre>
</details>

---

## NAT для R19 — удалённое управление через SSH

Порт-статический NAT транслирует SSH-порт R19 (TCP/22) в публичный адрес AS1001. Настроено на обоих R14 и R15.

<details>
<summary>R14 / R15 — статический PAT для SSH</summary>
<pre><code>
enable
configure terminal
! R14:
interface Loopback14
 ip address 200.20.20.14 255.255.252.0

router bgp 1001
 network 200.20.20.0 mask 255.255.252.0

ip nat inside source static tcp 1.1.1.19 22 200.20.20.19 22 extendable

! R15:
interface Loopback15
 ip address 200.20.20.15 255.255.252.0

router bgp 1001
 network 200.20.20.0 mask 255.255.252.0

ip nat inside source static tcp 1.1.1.19 22 200.20.20.19 22 extendable
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R19 — настройка SSH-сервера</summary>
<pre><code>
enable
configure terminal
hostname R19
ip domain-name Test
crypto key generate rsa
! [Enter] → 1024

line vty 0 4
 transport input ssh
 login local

username admin secret cisco
ip ssh version 2
enable secret cisco

interface Loopback19
 ip address 1.1.1.19 255.255.255.255

router ospf 1
 network 1.1.1.19 0.0.0.0 area 101
end
copy running-config startup-config
</code></pre>
</details>

---

## Статический NAT — Чокурдах (R28)

Для Чокурдах нужен минимум /29: –1 сеть, –1 Loopback, –1 broadcast, –2 для статических записей NAT = минимум 5 адресов.

<details>
<summary>R28 — настройка NAT</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0
 ip nat outside

interface Ethernet0/1
 ip nat outside

interface Ethernet0/2
 ip nat inside

interface Loopback28
 ip address 111.110.35.1 255.255.255.248

ip nat inside source static 172.16.40.30 111.110.35.5
ip nat inside source static 172.16.40.31 111.110.35.6
end
copy running-config startup-config
</code></pre>
</details>

Префикс /29 должен быть анонсирован через BGP, а у смежных роутеров прописан статический маршрут на R28.

<details>
<summary>R25 / R26 — BGP-анонс + статика + проверка</summary>
<pre><code>
enable
configure terminal
router bgp 520
 network 111.110.35.0 mask 255.255.255.248

! R26:
ip route 111.110.35.0 255.255.255.248 111.110.35.14
! R25:
ip route 111.110.35.0 255.255.255.248 111.110.35.10

! Проверка:
R25#ping 111.110.35.5
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/2 ms

R25#ping 111.110.35.6
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/3 ms
</code></pre>
</details>

---

## DHCP — Москва (R12 и R13)

R12 обслуживает VPC1, R13 — VPC7.

R12:
```
ip dhcp excluded-address 172.16.0.1
ip dhcp pool DHCP12
 network 172.16.0.0 255.255.255.0
 default-router 172.16.0.1
```

R13:
```
ip dhcp excluded-address 172.16.1.1
ip dhcp pool DHCP13
 network 172.16.1.0 255.255.255.0
 default-router 172.16.1.1
```

Результат:

VPC1:
```
VPCS> dhcp -r
DDORA IP 172.16.0.2/24 GW 172.16.0.1
```

VPC7:
```
VPCS> dhcp -r
DDORA IP 172.16.1.2/24 GW 172.16.1.1
```

---

## NTP — офис Москва

R12 и R13 — NTP-мастера (stratum 5). Рассылают время по VLAN 33 и аплинк-интерфейсам. R14, R15, R19, R20 синхронизируются по unicast с Loopback-адресами. Свичи синхронизируются по broadcast в management-VLAN.

<details>
<summary>R13 — NTP-сервер</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0.33
 encapsulation dot1Q 33
 ip address 1.2.1.253 255.255.255.0
 standby version 2
 standby 0 ip 1.2.1.1
 standby 0 preempt
 ntp broadcast

interface Ethernet0/2
 ntp broadcast

interface Ethernet0/3
 ntp broadcast

ntp source Loopback13
ntp master 5
ntp update-calendar
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R12 — NTP-сервер</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0.33
 encapsulation dot1Q 33
 ip address 1.2.1.252 255.255.255.0
 standby version 2
 standby 0 ip 1.2.1.1
 standby 0 preempt
 ntp broadcast

interface Ethernet0/2
 ntp broadcast

interface Ethernet0/3
 ntp broadcast

ntp source Loopback12
ntp master 5
ntp update-calendar
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R14 — NTP-клиент + show ntp associations</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0
 ntp broadcast client

interface Ethernet0/1
 ntp broadcast client

ntp server 1.1.1.12
ntp server 1.1.1.13

R14#show ntp associations
  address         ref clock       st   when   poll reach  delay  offset   disp
* 10.10.10.18     127.127.1.1      5     44     64   376  1.000  -0.500  2.890
+~1.1.1.12        127.127.1.1      5    151    256   377  0.000   0.000  2.541
+~1.1.1.13        127.127.1.1      5     34     64   377  0.000   0.000  4.007
+ 10.10.10.22     127.127.1.1      5     34     64   376  0.000   0.000  2.902
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R15 — NTP-клиент + show ntp associations</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0
 ntp broadcast client

interface Ethernet0/1
 ntp broadcast client

ntp server 1.1.1.12
ntp server 1.1.1.13

R15#show ntp associations
  address         ref clock       st   when   poll reach  delay  offset   disp
+~1.1.1.12        127.127.1.1      5    110    128   377  0.000   0.000  5.376
+~1.1.1.13        127.127.1.1      5     95    128   377  0.000   0.000  3.409
* 10.10.10.6      127.127.1.1      5     13     64   377  1.000   0.500  2.894
</code></pre>
</details>

<details>
<summary>R20 — NTP-клиент + show ntp associations</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0
 ntp broadcast client

ntp server 1.1.1.12
ntp server 1.1.1.13

R20#show ntp associations
  address         ref clock       st   when   poll reach  delay  offset   disp
*~1.1.1.12        127.127.1.1      5    612   1024   377  1.000  -0.500  2.038
+~1.1.1.13        127.127.1.1      5    158   1024   377  0.000   0.000  2.046
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R19 — NTP-клиент + show ntp associations</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0
 ntp broadcast client

ntp server 1.1.1.12
ntp server 1.1.1.13

R19#show ntp associations
  address         ref clock       st   when   poll reach  delay  offset   disp
*~1.1.1.12        127.127.1.1      5    810   1024   377  1.000  -0.500  2.008
+~1.1.1.13        127.127.1.1      5    613   1024   377  1.000  -0.500  1.974
end
copy running-config startup-config
</code></pre>
</details>

Свичи получают время по broadcast в VLAN 33 — прямая unicast-настройка не нужна, так как R12/R13 находятся в том же широковещательном домене через HSRP.

<details>
<summary>SW2 / SW3 / SW4 / SW5 — NTP (пример SW4)</summary>
<pre><code>
enable
configure terminal
vlan 33
 name MANAGEMENT

interface Vlan33
 ip address 1.2.1.4 255.255.255.0
 ntp broadcast client

ip default-gateway 1.2.1.1

SW4#show ntp status
Clock is synchronized, stratum 6, reference is 1.2.1.252

SW4#show ntp associations
  address         ref clock       st   when   poll reach  delay  offset   disp
* 1.2.1.252       127.127.1.1      5      8     64   377  1.000  -6.500  2.908
+ 1.2.1.253       127.127.1.1      5     43     64   377  1.000  -0.500  2.874
end
copy running-config startup-config
</code></pre>
</details>

---

## Проверка IP-связности

<details>
<summary>R15 — ping до всех удалённых офисов</summary>
<pre><code>
R15>ping 210.110.35.2
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/3 ms

R15>ping 111.110.35.10
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/2 ms

R15>ping 111.110.35.14
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/1 ms

R15>ping 77.77.77.10
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/2 ms

R15>ping 77.77.77.14
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/2 ms
</code></pre>
</details>

---

## Полные конфигурации роутеров

> R21, R22, R23, R24, R25, R26 — конфигурации не изменились по сравнению с лабораторной 13.

<details>
<summary>R14 (AS 1001) — изменения лаб. 14</summary>
<pre><code>
enable
configure terminal
interface Loopback14
 ip address 200.20.20.14 255.255.252.0

interface Ethernet0/0
 ip nat inside
 ntp broadcast client

interface Ethernet0/1
 ip nat inside
 ntp broadcast client

interface Ethernet0/2
 ip nat outside

interface Ethernet0/3
 ip nat inside

interface Ethernet1/0
 ip nat inside

ip nat pool OVRLD 200.20.20.14 200.20.20.14 netmask 255.255.252.0
ip nat inside source list 10 pool OVRLD overload
ip nat inside source static 1.1.1.20 200.20.20.20
ip nat inside source static tcp 1.1.1.19 22 200.20.20.19 22 extendable

access-list 10 permit 10.10.10.0 0.0.0.31

ntp server 1.1.1.12
ntp server 1.1.1.13

route-map SET-ASPATH permit 10
 set as-path prepend 1001 1001 1001

router bgp 1001
 network 200.20.20.0 mask 255.255.252.0
 neighbor 100.100.100.2 route-map SET-ASPATH out
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R15 (AS 1001) — изменения лаб. 14</summary>
<pre><code>
enable
configure terminal
interface Loopback15
 ip address 200.20.20.15 255.255.252.0

interface Ethernet0/0
 ip nat inside
 ntp broadcast client

interface Ethernet0/1
 ip nat inside
 ntp broadcast client

interface Ethernet0/2
 ip nat outside

interface Ethernet0/3
 ip nat inside

interface Ethernet1/0
 ip nat inside

ip nat pool OVRLD 200.20.20.15 200.20.20.15 netmask 255.255.252.0
ip nat inside source list 10 pool OVRLD overload
ip nat inside source static 1.1.1.20 200.20.20.20
ip nat inside source static tcp 1.1.1.19 22 200.20.20.19 22 extendable

access-list 10 permit 10.10.10.0 0.0.0.31

ntp server 1.1.1.12
ntp server 1.1.1.13

route-map LP permit 10
 set local-preference 150

router bgp 1001
 network 200.20.20.0 mask 255.255.252.0
 neighbor 111.111.111.2 route-map LP in
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R18 — Санкт-Петербург (AS 2042) — изменения лаб. 14</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0
 ip nat inside

interface Ethernet0/1
 ip nat inside

interface Ethernet0/2
 ip nat outside

interface Ethernet0/3
 ip nat outside

ip nat pool OVRLD  77.77.77.10 77.77.77.10 netmask 255.255.255.252
ip nat pool OVRLD1 77.77.77.14 77.77.77.14 netmask 255.255.255.252

ip nat inside source list 10 pool OVRLD  overload
ip nat inside source list 11 pool OVRLD1 overload

access-list 10 permit 10.10.20.0 0.0.0.3
access-list 10 permit 172.16.10.0 0.0.0.255

access-list 11 permit 10.10.20.4 0.0.0.3
access-list 11 permit 10.10.20.8 0.0.0.3
access-list 11 permit 172.16.11.0 0.0.0.255
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R28 — Чокурдах — изменения лаб. 14</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0
 ip nat outside

interface Ethernet0/1
 ip nat outside

interface Ethernet0/2
 ip nat inside

interface Loopback28
 ip address 111.110.35.1 255.255.255.248

ip nat inside source static 172.16.40.30 111.110.35.5
ip nat inside source static 172.16.40.31 111.110.35.6
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R12 — DHCP + NTP-сервер</summary>
<pre><code>
enable
configure terminal
interface Loopback12
 ip address 1.1.1.12 255.255.255.255

interface Ethernet0/0.33
 encapsulation dot1Q 33
 ip address 1.2.1.252 255.255.255.0
 standby version 2
 standby 0 ip 1.2.1.1
 standby 0 preempt
 ntp broadcast

interface Ethernet0/2
 ntp broadcast

interface Ethernet0/3
 ntp broadcast

ip dhcp excluded-address 172.16.0.1
ip dhcp pool DHCP12
 network 172.16.0.0 255.255.255.0
 default-router 172.16.0.1

ntp source Loopback12
ntp master 5
ntp update-calendar
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R13 — DHCP + NTP-сервер</summary>
<pre><code>
enable
configure terminal
interface Loopback13
 ip address 1.1.1.13 255.255.255.255

interface Ethernet0/0.33
 encapsulation dot1Q 33
 ip address 1.2.1.253 255.255.255.0
 standby version 2
 standby 0 ip 1.2.1.1
 standby 0 preempt
 ntp broadcast

interface Ethernet0/2
 ntp broadcast

interface Ethernet0/3
 ntp broadcast

ip dhcp excluded-address 172.16.1.1
ip dhcp pool DHCP13
 network 172.16.1.0 255.255.255.0
 default-router 172.16.1.1

ntp source Loopback13
ntp master 5
ntp update-calendar
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R19 — SSH + OSPF</summary>
<pre><code>
enable
configure terminal
hostname R19
ip domain-name Test
crypto key generate rsa
! [Enter] → 1024

line vty 0 4
 transport input ssh
 login local

username admin secret cisco
ip ssh version 2
enable secret cisco

interface Loopback19
 ip address 1.1.1.19 255.255.255.255

interface Ethernet0/0
 ntp broadcast client

router ospf 1
 network 1.1.1.19 0.0.0.0 area 101

ntp server 1.1.1.12
ntp server 1.1.1.13
end
copy running-config startup-config
</code></pre>
</details>

---

*Network Engineer Course | Lab 14*
