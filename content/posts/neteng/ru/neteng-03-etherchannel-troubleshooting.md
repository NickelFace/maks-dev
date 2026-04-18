---
title: "Network Engineer — 03. EtherChannel Troubleshooting"
date: 2025-08-28
description: "Лабораторная работа: диагностика и устранение проблем EtherChannel — несовпадение протоколов, конфликт режимов, несоответствие VLAN, отключённые порты."
tags: ["Networking", "EtherChannel", "Troubleshooting", "Cisco"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-03-etherchannel-troubleshooting/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Лабораторная работа: Устранение неполадок EtherChannel

### Топология

![Troubleshooting topology](/img/neteng/03/Scheme_Troubleshooting.png)

### Таблица адресации

| Устройство | Интерфейс | IP-адрес     | Маска подсети |
| :--------: | :-------: | :----------: | :-----------: |
| S1         | VLAN 99   | 192.168.1.11 | 255.255.255.0 |
| S2         | VLAN 99   | 192.168.1.12 | 255.255.255.0 |
| S3         | VLAN 99   | 192.168.1.13 | 255.255.255.0 |
| PC-A       | NIC       | 192.168.0.2  | 255.255.255.0 |
| PC-C       | NIC       | 192.168.0.3  | 255.255.255.0 |

### Назначение VLAN

| VLAN | Имя        |
| :--: | :--------: |
| 10   | Users      |
| 99   | Management |

### Цели

- Соберите топологию и примените стартовую конфигурацию
- Выявите и устраните все проблемы EtherChannel

---

### Стартовая конфигурация (до устранения неполадок)

<details>
<summary>S1</summary>
<pre><code>
enable
conf t
hostname S1
interface range f0/1-24, g0/1-2
shutdown
exit
enable secret class
no ip domain lookup
line vty 0 15
password cisco
login
line con 0
 exec-t 0 0
 password cisco
 logging synchronous
 login
 exit
vlan 10
 name User
vlan 99
 Name Management
interface range f0/1-2
 switchport mode trunk
 channel-group 1 mode active
 switchport trunk native vlan 99
 no shutdown
interface range f0/3-4
 channel-group 2 mode desirable
 switchport trunk native vlan 99
 no shutdown
interface f0/6
 switchport mode access
 switchport access vlan 10
 no shutdown
interface vlan 99
 ip address 192.168.1.11 255.255.255.0
interface port-channel 1
 switchport trunk native vlan 99
 switchport mode trunk
interface port-channel 2
 switchport trunk native vlan 99
 switchport mode access
do wr
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
interface range f0/1-24, g0/1-2
 shutdown
 exit
enable secret class
no ip domain lookup
line vty 0 15
 password cisco
 login
line con 0
 exec-t 0 0
 password cisco
 logging synchronous
 login
 exit
vlan 10
 name User
vlan 99
 name Management
spanning-tree vlan 1,10,99 root primary
interface range f0/1-2
 switchport mode trunk
 channel-group 1 mode desirable
 switchport trunk native vlan 99
 no shutdown
interface range f0/3-4
 switchport mode trunk
 channel-group 3 mode desirable
 switchport trunk native vlan 99
interface vlan 99
 ip address 192.168.1.12 255.255.255.0
interface port-channel 1
 switchport trunk native vlan 99
 switchport trunk allowed vlan 1,99
interface port-channel 3
 switchport trunk native vlan 99
 switchport trunk allowed vlan 1,10,99
 switchport mode trunk
do wr
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3</summary>
<pre><code>
enable
configure terminal
enab
conf t
hostname S3
interface range f0/1-24, g0/1-2
 shutdown
 exit
enable secret class
no ip domain lookup
line vty 0 15
 password cisco
 login
line con 0
 exec-t 0 0
 password cisco
 logging synchronous
 login
 exit
vlan 10
 name User
vlan 99
 name Management
interface range f0/1-2
interface range f0/3-4
 switchport mode trunk
 channel-group 3 mode desirable
 switchport trunk native vlan 99
 no shutdown
interface f0/18
 switchport mode access
 switchport access vlan 10
 no shutdown
interface vlan 99
 ip address 192.168.1.13 255.255.255.0
interface port-channel 3
 switchport trunk native vlan 99
 switchport mode trunk
do wr
end
copy running-config startup-config
</code></pre>
</details>

---

### Устранение неполадок

#### Шаг 1 — Проверьте сводку EtherChannel

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
1      Po1(SD)           LACP   Fa0/1(I) Fa0/2(I)
2      Po2(SU)           PAgP   Fa0/3(P) Fa0/4(P)
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
1      Po1(SD)           PAgP   Fa0/1(I) Fa0/2(I)
3      Po3(SD)           PAgP   Fa0/3(D) Fa0/4(D)
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
3      Po3(SU)           PAgP   Fa0/3(P) Fa0/4(P)
end
copy running-config startup-config
</code></pre>
</details>

**Проблема 1:** На S3 отсутствует channel-group 2. Исправление:

```
S3(config)# int r fa0/3-4
S3(config-if-range)# channel-group 2 mode auto
```

Проверьте конфигурацию S2 целиком:

```
show running-config | begin Port-channel
```

<details>
<summary>Вывод S2</summary>
<pre><code>
enable
configure terminal
interface Port-channel1
 switchport trunk native vlan 99
 switchport trunk allowed vlan 1,99
 switchport mode trunk
!
interface Port-channel3
 switchport trunk native vlan 99
 switchport trunk allowed vlan 1,10,99
 switchport mode trunk
!
interface FastEthernet0/1
 switchport trunk native vlan 99
 switchport trunk allowed vlan 1,99
 switchport mode trunk
 channel-group 1 mode desirable
!
interface FastEthernet0/2
 switchport trunk native vlan 99
 switchport trunk allowed vlan 1,99
 switchport mode trunk
 channel-group 1 mode desirable
!
interface FastEthernet0/3
 switchport trunk native vlan 99
 switchport trunk allowed vlan 1,10,99
 switchport mode trunk
 channel-group 3 mode desirable
 shutdown
!
interface FastEthernet0/4
 switchport trunk native vlan 99
 switchport trunk allowed vlan 1,10,99
 switchport mode trunk
 channel-group 3 mode desirable
 shutdown
end
copy running-config startup-config
</code></pre>
</details>

Проблемы в конфигурации S2: Po1 разрешает только VLAN 1,99; Fa0/1-2 используют `mode desirable` (PAgP), хотя S1 использует LACP; Fa0/3-4 выключены.

#### Шаг 2 — Проверьте порт доступа VLAN 10

Po2 на S1 находится в режиме `access` — проверьте командой `show run interface`:

<details>
<summary>S1 — interface Ethernet1/2</summary>
<pre><code>
enable
configure terminal
interface Ethernet1/2
 switchport access vlan 10
 switchport mode access
 channel-group 1 mode desirable
end
</code></pre>
</details>

EtherChannel требует транковый режим на всех портах. Исправление:

```
S1(config)# interface Port-channel2
S1(config-if)# switchport mode trunk
```

#### Шаг 3 — Проверьте разрешённые VLAN на Po1 (S1–S2)

S2 разрешает только VLAN 1,99 на Po1, блокируя VLAN 10. Исправление:

```
S2(config)# int r fa0/1-2
S2(config-if-range)# switchport trunk allowed vlan add 10
```

#### Шаг 4 — Устраните несоответствие протоколов на Po1

S1 использует LACP `active`, S2 использует PAgP `desirable` — протоколы не совпадают. Переведите S2 на LACP:

```
S2(config)# no int po1
S2(config)# int r fa0/1-2
S2(config-if-range)# no shutdown
S2(config-if-range)# channel-group 1 mode passive
S2(config-if-range)# exit
S2(config)# int po1
S2(config-if)# switchport trunk native vlan 99
S2(config-if)# switchport trunk allowed vlan 1,10,99
S2(config-if)# switchport mode trunk
```

#### Шаг 5 — Устраните отключённые порты на S2

Fa0/3-4 на S2 выключены. Исправление:

```
S2(config)# int r FastEthernet0/3-4
S2(config-if-range)# no shutdown
```

Поднимите S3 Fa0/1-2 и добавьте в channel-group 3:

```
S3(config)# int r fa0/1-2
S3(config-if-range)# no shutdown
S3(config-if-range)# switchport trunk native vlan 99
S3(config-if-range)# switchport mode trunk
S3(config-if-range)# channel-group 3 mode auto
```

---

### Финальная проверка

```
show etherchannel summary
```

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
1      Po1(SU)           LACP   Fa0/1(P) Fa0/2(P)
2      Po2(SU)           PAgP   Fa0/3(P) Fa0/4(P)
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S2</summary>
<pre><code>
enable
configure terminal
1      Po1(SU)           LACP   Fa0/1(P) Fa0/2(P)
3      Po3(SU)           PAgP   Fa0/3(P) Fa0/4(P)
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3</summary>
<pre><code>
enable
configure terminal
2      Po2(SU)           PAgP   Fa0/3(P) Fa0/4(P)
3      Po3(SU)           PAgP   Fa0/1(P) Fa0/2(P)
end
copy running-config startup-config
</code></pre>
</details>

Проверка связности — ping Management VLAN с S3:

<details>
<summary>S3</summary>
<pre><code>
enable
configure terminal
S3(config-if)#do ping 192.168.1.13
Sending 5, 100-byte ICMP Echos to 192.168.1.13, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 1/3/4 ms

S3(config-if)#do ping 192.168.1.12
Sending 5, 100-byte ICMP Echos to 192.168.1.12, timeout is 2 seconds:
.!!!!
Success rate is 60 percent (3/5), round-trip min/avg/max = 0/0/1 ms

S3(config-if)#do ping 192.168.1.11
Sending 5, 100-byte ICMP Echos to 192.168.1.11, timeout is 2 seconds:
..!!!
Success rate is 60 percent (3/5), round-trip min/avg/max = 0/1/4 ms
</code></pre>
</details>

Проверка связности между ПК:

<details>
<summary>PC-A</summary>
<pre><code>
enable
configure terminal
C:\>ping 192.168.0.2

Pinging 192.168.0.2 with 32 bytes of data:
Reply from 192.168.0.2: bytes=32 time=3ms TTL=128
Reply from 192.168.0.2: bytes=32 time=4ms TTL=128
Reply from 192.168.0.2: bytes=32 time=1ms TTL=128
Reply from 192.168.0.2: bytes=32 time=4ms TTL=128

Ping statistics for 192.168.0.2:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)

C:\>ping 192.168.0.3

Pinging 192.168.0.3 with 32 bytes of data:
Reply from 192.168.0.3: bytes=32 time<1ms TTL=128
Reply from 192.168.0.3: bytes=32 time<1ms TTL=128
Reply from 192.168.0.3: bytes=32 time<1ms TTL=128
Reply from 192.168.0.3: bytes=32 time<1ms TTL=128

Ping statistics for 192.168.0.3:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)
</code></pre>
</details>

---

*Network Engineer Course | Лабораторная работа 03*
