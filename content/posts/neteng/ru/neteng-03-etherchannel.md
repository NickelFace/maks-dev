---
title: "Network Engineer — 03. EtherChannel"
date: 2025-08-20
description: "Лабораторная работа: настройка EtherChannel с LACP и PAgP. Настройка port-channel, транкинг VLAN через агрегированные каналы."
tags: ["Networking", "EtherChannel", "LACP", "PAgP", "Cisco"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-03-etherchannel/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Лабораторная работа: Настройка EtherChannel

### Топология

![EtherChannel topology](/img/neteng/03/Etherchannel.png)

### Таблица адресации

| Устройство | Интерфейс | IP-адрес      | Маска подсети |
| ---------- | --------- | ------------- | ------------- |
| S1         | VLAN 99   | 192.168.99.11 | 255.255.255.0 |
| S2         | VLAN 99   | 192.168.99.12 | 255.255.255.0 |
| S3         | VLAN 99   | 192.168.99.13 | 255.255.255.0 |
| PC-A       | NIC       | 192.168.10.1  | 255.255.255.0 |
| PC-B       | NIC       | 192.168.10.2  | 255.255.255.0 |
| PC-C       | NIC       | 192.168.10.3  | 255.255.255.0 |

### Цели

- **Часть 1.** Настройте базовые параметры коммутаторов
- **Часть 2.** Настройте EtherChannel PAgP (S1–S3)
- **Часть 3.** Настройте EtherChannel LACP (S1–S2 и S2–S3)

---

### Часть 1 — Базовая настройка коммутаторов

<details>
<summary>S1</summary>
<pre><code>
enable
conf t
hostname S1
no ip domain-lookup
enable secret class
banner motd "Unauthorized access is strictly prohibited!"
line console 0
exec-timeout 0 0
password cisco
logging synchronous
login
exit
line vty 0 15
password cisco
login
exit
interface range f0/1-24, g0/1-2
shutdown
exit
vlan 10
name Staff
vlan 99
name Management
exit
interface vlan 99
ip address 192.168.99.11 255.255.255.0
no shutdown
exit
interface f0/6
switchport mode access
switchport access vlan 10
no shutdown
do copy run start
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S2</summary>
<pre><code>
enable
conf t
hostname S2
no ip domain-lookup
enable secret class
banner motd "Unauthorized access is strictly prohibited!"
line console 0
exec-timeout 0 0
password cisco
logging synchronous
login
exit
line vty 0 15
password cisco
login
exit
interface range f0/1-24, g0/1-2
shutdown
exit
vlan 10
name Staff
vlan 99
name Management
exit
interface vlan 99
ip address 192.168.99.12 255.255.255.0
no shutdown
exit
interface f0/18
switchport mode access
switchport access vlan 10
no shutdown
do copy run start
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3</summary>
<pre><code>
enable
conf t
hostname S3
no ip domain-lookup
enable secret class
banner motd "Unauthorized access is strictly prohibited!"
line console 0
exec-timeout 0 0
password cisco
logging synchronous
login
exit
line vty 0 15
password cisco
login
exit
interface range f0/1-24, g0/1-2
shutdown
exit
vlan 10
name Staff
vlan 99
name Management
exit
interface vlan 99
ip address 192.168.99.13 255.255.255.0
no shutdown
exit
interface f0/18
switchport mode access
switchport access vlan 10
no shutdown
do copy run start
end
copy running-config startup-config
</code></pre>
</details>

---

### Часть 2 — EtherChannel PAgP (S1–S3)

PAgP (Port Aggregation Protocol) — проприетарный протокол Cisco. Режимы: `desirable` (активное согласование) и `auto` (пассивный). Минимум одна сторона должна быть `desirable`.

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
interface range f0/3-4
channel-group 1 mode desirable
switchport mode trunk
switchport trunk native vlan 99
no shutdown
exit
interface port-channel 1
switchport mode trunk
switchport trunk native vlan 99
switchport trunk allowed vlan 1,10,99
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3</summary>
<pre><code>
enable
configure terminal
interface range f0/3-4
channel-group 1 mode auto
switchport mode trunk
switchport trunk native vlan 99
no shutdown
exit
interface port-channel 1
switchport mode trunk
switchport trunk native vlan 99
switchport trunk allowed vlan 1,10,99
end
copy running-config startup-config
</code></pre>
</details>

Проверьте:

```
show etherchannel summary
```

<details>
<summary>Вывод S1</summary>
<pre><code>
enable
configure terminal
Flags:  D - down        P - bundled in port-channel
        I - stand-alone s - suspended
        H - Hot-standby (LACP only)
        R - Layer3      S - Layer2
        U - in use      N - not in use, no aggregation
        f - failed to allocate aggregator

        M - not in use, no aggregation due to minimum links not met
        u - unsuitable for bundling
        w - waiting to be aggregated
        d - default port

        A - formed by Auto LAG


Number of channel-groups in use: 1
Number of aggregators:           1

Group  Port-channel  Protocol    Ports
------+-------------+-----------+----------------------------------------------
1      Po1(SU)           PAgP   Et1/2(P) Et1/3(P)
end
copy running-config startup-config
</code></pre>
</details>

**Значение флагов:** `SU` — канал является транком L2 и активен. `P` — порт объединён в port-channel.

Проверьте STP — корневым портом S3 должен стать Port-channel1:

```
show spanning-tree
```

<details>
<summary>Вывод S3</summary>
<pre><code>
enable
configure terminal
VLAN0001
  Spanning tree enabled protocol ieee
  Root ID    Priority    32769
             Address     aabb.cc00.1000
             Cost        56
             Port        65 (Port-channel1)
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec

  Bridge ID  Priority    32769  (priority 32768 sys-id-ext 1)
             Address     aabb.cc00.3000
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec
             Aging Time  300 sec

Interface           Role Sts Cost      Prio.Nbr Type
------------------- ---- --- --------- -------- --------------------------------
Po1                 Root FWD 56        128.65   P2p
end
copy running-config startup-config
</code></pre>
</details>

---

### Часть 3 — EtherChannel LACP (S1–S2 и S2–S3)

LACP (Link Aggregation Control Protocol) — открытый стандарт (IEEE 802.3ad). Режимы: `active` (отправляет LACP-фреймы) и `passive` (только отвечает). Минимум одна сторона должна быть `active`.

**S1–S2 (channel-group 2)**

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
interface range f0/1-2
channel-group 2 mode active
switchport mode trunk
switchport trunk native vlan 99
no shutdown
exit
interface port-channel 2
switchport mode trunk
switchport trunk native vlan 99
switchport trunk allowed vlan 1,10,99
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S2</summary>
<pre><code>
enable
configure terminal
interface range f0/1-2
channel-group 2 mode passive
switchport mode trunk
switchport trunk native vlan 99
no shutdown
exit
interface port-channel 2
switchport mode trunk
switchport trunk native vlan 99
switchport trunk allowed vlan 1,10,99
end
copy running-config startup-config
</code></pre>
</details>

**S2–S3 (channel-group 3)**

<details>
<summary>S2</summary>
<pre><code>
enable
configure terminal
interface range f0/3-4
channel-group 3 mode active
switchport mode trunk
switchport trunk native vlan 99
no shutdown
exit
interface port-channel 3
switchport mode trunk
switchport trunk native vlan 99
switchport trunk allowed vlan 1,10,99
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3</summary>
<pre><code>
enable
configure terminal
interface range f0/1-2
channel-group 3 mode passive
switchport mode trunk
switchport trunk native vlan 99
no shutdown
exit
interface port-channel 3
switchport mode trunk
switchport trunk native vlan 99
switchport trunk allowed vlan 1,10,99
end
copy running-config startup-config
</code></pre>
</details>

Проверьте все каналы:

```
show etherchannel summary
```

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
Group  Port-channel  Protocol    Ports
------+-------------+-----------+----------------------------------------------
1      Po1(SU)           PAgP   Et1/2(P) Et1/3(P)
2      Po2(SU)           LACP   Et0/1(P) Et0/2(P)
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S2</summary>
<pre><code>
enable
configure terminal
Group  Port-channel  Protocol    Ports
------+-------------+-----------+----------------------------------------------
2      Po2(SU)           LACP   Fa0/1(P) Fa0/2(P)
3      Po3(SU)           LACP   Fa0/3(P) Fa0/4(P)
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3</summary>
<pre><code>
enable
configure terminal
Group  Port-channel  Protocol    Ports
------+-------------+-----------+----------------------------------------------
1      Po1(SU)           PAgP   Fa0/3(P) Fa0/4(P)
3      Po3(SU)           LACP   Fa0/1(P) Fa0/2(P)
end
copy running-config startup-config
</code></pre>
</details>

Проверьте связность — ping между ПК в VLAN 10:

```
PC-A> ping 192.168.10.2
PC-A> ping 192.168.10.3
```

---

*Network Engineer Course | Лабораторная работа 03*
