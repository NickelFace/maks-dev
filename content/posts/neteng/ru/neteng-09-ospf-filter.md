---
title: "Network Engineer — 09. OSPF Route Filtering"
date: 2025-11-03
description: "Настройка OSPF в московском офисе с разбивкой на зоны и фильтрацией маршрутов между зонами"
tags: ["Networking", "OSPF", "Routing", "Filtering", "Cisco", "OTUS"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-09-ospf-filter/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Фильтрация маршрутов OSPF

### Домашнее задание

Цель: Настроить OSPF в офисе Москва. Разделить сеть на зоны. Настроить фильтрацию между зонами.

1. R14–R15 находятся в зоне 0 — backbone
2. **R12–R13 находятся в зоне 10. Дополнительно к маршрутам должны получать маршрут по умолчанию**
3. R19 находится в зоне 101 и получает только маршрут по умолчанию
4. R20 находится в зоне 102 и получает все маршруты, кроме маршрутов до сетей зоны 101
5. План работы и изменения зафиксированы в документации

![OSPF](/img/neteng/09/1.png)

---

## R14–R15 — зона 0 (backbone)

Топология слетела и EVE-NG завис, поэтому настраиваем заново со всеми настройками.

<details>
<summary>R14</summary>
<pre><code>
enable
conf t
hos R14
ipv6 unic
int e0/0
 ipv6 enable
 ipv6 addr 2002:acad:db8:4::14/64
 ip addr 10.10.10.17 255.255.255.252
 no shut
int e0/1
 ipv6 enable
 ipv6 addr 2002:acad:db8:5::14/64
 ip addr 10.10.10.21 255.255.255.252
 no shut
int e0/2
 ipv6 enable
 ipv6 addr 2002:acad:db8:6::14/64
 ip addr 100.100.100.1 255.255.255.252
 no shut
int e0/3
 ipv6 enable
 ipv6 addr 2002:acad:db8:7::14/64
 ip addr 10.10.10.13 255.255.255.252
 no shut
no ip domain-lookup
line con 0
 exec-t 0 0
exit

router ospf 1
 router-id 14.14.14.14
 area 101 stub no-summary
 network 10.10.10.12 0.0.0.3 area 101
 network 10.10.10.16 0.0.0.3 area 0
 network 10.10.10.20 0.0.0.3 area 0
 default-information originate

ip route 0.0.0.0 0.0.0.0 100.100.100.2
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R15</summary>
<pre><code>
enable
conf t
hos R15
ipv6 unic
int e0/0
 ipv6 enable
 ipv6 addr 2002:acad:db8:0::15/64
 ip addr 10.10.10.5 255.255.255.252
 no shut
int e0/1
 ipv6 enable
 ipv6 addr 2002:acad:db8:1::15/64
 ip addr 10.10.10.9 255.255.255.252
 no shut
int e0/2
 ipv6 enable
 ipv6 addr 2002:acad:db8:2::15/64
 ip addr 111.111.111.1 255.255.255.252
 no shut
int e0/3
 ipv6 enable
 ipv6 addr 2002:acad:db8:3::15/64
 ip addr 10.10.10.1 255.255.255.252
 no shut

router ospf 1
 router-id 15.15.15.15
 network 10.10.10.0 0.0.0.3 area 102
 network 10.10.10.4 0.0.0.3 area 0
 network 10.10.10.8 0.0.0.3 area 0
 distribute-list prefix PL1 in
 default-information originate

ip route 0.0.0.0 0.0.0.0 111.111.111.2

ip prefix-list PL1 seq 5 deny 10.10.10.12/30
ip prefix-list PL1 seq 10 permit 0.0.0.0/0 le 32
end
copy running-config startup-config
</code></pre>
</details>

---

## R12–R13 — зона 10 (маршрут по умолчанию обязателен)

<details>
<summary>R12</summary>
<pre><code>
enable
conf t
hos R12
ipv6 unic
int e0/0
 ip addr 172.16.0.1 255.255.255.0
 no shut
 ipv6 enable
 ipv6 addr 2002:acad:db8:8::12/64
int e0/3
 ip addr 10.10.10.10 255.255.255.252
 no shut
 ipv6 enable
 ipv6 addr 2002:acad:db8:1::12/64
int e0/2
 ip addr 10.10.10.18 255.255.255.252
 no shut
 ipv6 enable
 ipv6 addr 2002:acad:db8:4::12/64

router ospf 1
 router-id 12.12.12.12
 network 10.10.10.8 0.0.0.3 area 0
 network 10.10.10.16 0.0.0.3 area 0
 network 172.16.0.0 0.0.0.255 area 10
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R13</summary>
<pre><code>
enable
conf t
hos R13
ipv6 unic
int e0/0
 ipv6 enable
 ipv6 addr 2002:acad:db8:9::13/64
 ip addr 172.16.1.1 255.255.255.0
 no shut
int e0/2
 ipv6 enable
 ipv6 addr 2002:acad:db8:0::13/64
 ip addr 10.10.10.6 255.255.255.252
 no shut
int e0/3
 ipv6 enable
 ipv6 addr 2002:acad:db8:5::13/64
 ip addr 10.10.10.22 255.255.255.252
 no shut

router ospf 1
 router-id 13.13.13.13
 network 10.10.10.4 0.0.0.3 area 0
 network 10.10.10.20 0.0.0.3 area 0
 network 172.16.1.0 0.0.0.255 area 10
end
copy running-config startup-config
</code></pre>
</details>

Оба маршрутизатора получают маршрут по умолчанию — можно переходить к следующему пункту:

<details>
<summary>R12 — show ip route ospf</summary>
<pre><code>
R12#show ip route ospf
Gateway of last resort is 10.10.10.17 to network 0.0.0.0

O*E2  0.0.0.0/0 [110/1] via 10.10.10.17, 02:22:36, Ethernet0/2
                [110/1] via 10.10.10.9, 02:21:41, Ethernet0/3
      10.0.0.0/8 is variably subnetted, 8 subnets, 2 masks
O IA     10.10.10.0/30 [110/20] via 10.10.10.9, 05:30:07, Ethernet0/3
O        10.10.10.4/30 [110/20] via 10.10.10.9, 05:30:07, Ethernet0/3
O IA     10.10.10.12/30 [110/20] via 10.10.10.17, 05:30:07, Ethernet0/2
O        10.10.10.20/30 [110/20] via 10.10.10.17, 05:30:07, Ethernet0/2
      172.16.0.0/16 is variably subnetted, 3 subnets, 2 masks
O IA     172.16.1.0/24 [110/30] via 10.10.10.17, 05:29:40, Ethernet0/2
                       [110/30] via 10.10.10.9, 05:29:40, Ethernet0/3
</code></pre>
</details>

<details>
<summary>R13 — show ip route ospf</summary>
<pre><code>
R13#show ip route ospf
Gateway of last resort is 10.10.10.21 to network 0.0.0.0

O*E2  0.0.0.0/0 [110/1] via 10.10.10.21, 02:24:20, Ethernet0/3
                [110/1] via 10.10.10.5, 02:23:25, Ethernet0/2
      10.0.0.0/8 is variably subnetted, 8 subnets, 2 masks
O IA     10.10.10.0/30 [110/20] via 10.10.10.5, 05:31:25, Ethernet0/2
O        10.10.10.8/30 [110/20] via 10.10.10.5, 05:31:25, Ethernet0/2
O IA     10.10.10.12/30 [110/20] via 10.10.10.21, 05:31:25, Ethernet0/3
O        10.10.10.16/30 [110/20] via 10.10.10.21, 05:31:25, Ethernet0/3
      172.16.0.0/16 is variably subnetted, 3 subnets, 2 masks
O IA     172.16.0.0/24 [110/30] via 10.10.10.21, 05:31:25, Ethernet0/3
                       [110/30] via 10.10.10.5, 05:31:25, Ethernet0/2
</code></pre>
</details>

---

## R19 — зона 101 (только маршрут по умолчанию)

Зона 101 настроена как `stub no-summary` на R14, что подавляет все LSA типа 3 — R19 получает только маршрут по умолчанию, генерируемый ABR.

<details>
<summary>R19</summary>
<pre><code>
enable
conf t
hos R19
ipv6 unic
int e0/0
 ip addr 10.10.10.14 255.255.255.252
 ipv6 enable
 ipv6 addr 2002:acad:db8:7::19/64
 no shut

router ospf 1
 router-id 19.19.19.19
 area 101 stub
 network 10.10.10.12 0.0.0.3 area 101
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R19 — show ip route ospf</summary>
<pre><code>
R19#show ip route ospf
Gateway of last resort is 10.10.10.13 to network 0.0.0.0

O*IA  0.0.0.0/0 [110/11] via 10.10.10.13, 18:31:11, Ethernet0/0
</code></pre>
</details>

---

## R20 — зона 102 (все маршруты, кроме зоны 101)

R15 использует prefix-list `PL1` с командой `distribute-list in`, которая блокирует установку 10.10.10.12/30 (зона 101) в свою таблицу маршрутизации — и, соответственно, этот маршрут не распространяется в зону 102.

<details>
<summary>R20</summary>
<pre><code>
enable
conf t
hos R20
ipv6 unic
int e0/0
 ip addr 10.10.10.2 255.255.255.252
 ipv6 enable
 ipv6 addr 2002:acad:db8:3::20/64
 no shut
no ip domain-loo
line con 0
 exec-t 0 0

router ospf 1
 router-id 20.20.20.20
 network 10.10.10.0 0.0.0.3 area 102
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R20 — show ip route ospf</summary>
<pre><code>
R20#show ip route ospf
Gateway of last resort is not set

      10.0.0.0/8 is variably subnetted, 6 subnets, 2 masks
O IA     10.10.10.4/30 [110/20] via 10.10.10.1, 00:31:46, Ethernet0/0
O IA     10.10.10.8/30 [110/20] via 10.10.10.1, 00:31:46, Ethernet0/0
O IA     10.10.10.16/30 [110/30] via 10.10.10.1, 00:31:46, Ethernet0/0
O IA     10.10.10.20/30 [110/30] via 10.10.10.1, 00:31:46, Ethernet0/0
      172.16.0.0/24 is subnetted, 2 subnets
O IA     172.16.0.0 [110/30] via 10.10.10.1, 00:31:46, Ethernet0/0
O IA     172.16.1.0 [110/30] via 10.10.10.1, 00:31:46, Ethernet0/0
</code></pre>
</details>

Сеть 10.10.10.12/30 (зона 101) отсутствует в таблице — задача выполнена.

---

*Network Engineer Course | Lab 09*
