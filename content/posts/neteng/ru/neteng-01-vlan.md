---
title: "Network Engineer — 01. VLAN"
date: 2025-08-03
description: "Лабораторная работа: настройка расширенных VLAN, VTP и DTP. Транковые каналы, DTP, VLAN расширенного диапазона."
tags: ["Networking", "VLAN", "VTP", "Cisco"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-01-vlan/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Лабораторная работа: Настройка расширенных VLAN, VTP и DTP

### Топология

![Topology](/img/neteng/01/scheme.png)

### Таблица адресации

| Устройство | Интерфейс | IP-адрес     | Маска подсети |
| ---------- | --------- | ------------ | ------------- |
| S1         | VLAN 99   | 192.168.99.1 | 255.255.255.0 |
| S2         | VLAN 99   | 192.168.99.2 | 255.255.255.0 |
| S3         | VLAN 99   | 192.168.99.3 | 255.255.255.0 |
| PC-A       | NIC       | 192.168.10.1 | 255.255.255.0 |
| PC-B       | NIC       | 192.168.20.1 | 255.255.255.0 |
| PC-C       | NIC       | 192.168.10.2 | 255.255.255.0 |

### Цели

- Настройте VTP, DTP и транковые каналы между коммутаторами
- S2 выступает в роли VTP-сервера; S1 и S3 — клиенты
- Добавьте VLAN и назначьте порты
- Настройте VLAN расширенного диапазона на S1 в режиме VTP transparent

---

### Часть 1 — Базовая настройка устройств

1. Соберите топологию согласно схеме.

<details>
<summary>S1</summary>
<pre><code>
Enable
Configure terminal
interface vlan 1
ip address 192.168.1.1 255.255.255.0
no shutdown
exit
hostname S1
do copy run start
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S2</summary>
<pre><code>
Enable
Configure terminal
interface vlan 1
ip address 192.168.1.2 255.255.255.0
no shutdown
exit
hostname S2
do copy run start
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3</summary>
<pre><code>
Enable
Configure terminal
interface vlan 1
ip address 192.168.1.3 255.255.255.0
no shutdown
exit
hostname S3
do copy run start
end
copy running-config startup-config
</code></pre>
</details>

2. Отключите DNS-поиск на каждом коммутаторе:

```
no ip domain-lookup
```

3. Задайте привилегированный и консольный пароли, включите logging synchronous:

<details>
<summary>S1, S2, S3</summary>
<pre><code>
enable
configure terminal
no ip domain-lookup
enable secret cisco
line console 0
password cisco
login
logging synchronous
end
copy running-config startup-config
</code></pre>
</details>

4. Задайте баннер входа:

<details>
<summary>S1, S2, S3</summary>
<pre><code>
enable
configure terminal
Banner motd "**This is a secure system. Authorized Access Only!
end
copy running-config startup-config
</code></pre>
</details>

---

### Часть 2 — Настройка VTP

<details>
<summary>S1 (client)</summary>
<pre><code>
enable
configure terminal
vtp domain CCNA
vtp password cisco
vtp version 3
vtp mode client
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S2 (server)</summary>
<pre><code>
enable
configure terminal
vtp domain CCNA
vtp password cisco
vtp version 3
vtp mode server
end
vtp primary server force
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3 (client)</summary>
<pre><code>
enable
configure terminal
vtp domain CCNA
vtp password cisco
vtp version 3
vtp mode client
end
copy running-config startup-config
</code></pre>
</details>

---

### Часть 3 — DTP и транковые порты

**Динамический транк: S1 — S2**

Переведите порт S1 в сторону S2 в режим `dynamic desirable`. S2 по умолчанию находится в режиме `dynamic auto` — транк поднимается автоматически:

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/1
switchport trunk encapsulation dot1q
switchport mode dynamic desirable
end
copy running-config startup-config
</code></pre>
</details>

**Статические транки: S1 — S3 и S2 — S3**

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/3
switchport trunk encapsulation dot1q
switchport mode trunk
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S2</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/3
switchport trunk encapsulation dot1q
switchport mode trunk
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/1
switchport trunk encapsulation dot1q
switchport mode trunk
interface Ethernet 0/3
switchport trunk encapsulation dot1q
switchport mode trunk
end
copy running-config startup-config
</code></pre>
</details>

Проверьте транки на S1:

```
show interfaces trunk
```

<details>
<summary>Вывод S1</summary>
<pre><code>
enable
configure terminal
Port        Mode             Encapsulation  Status        Native vlan
Et0/1       desirable        802.1q         trunking      1
Et0/3       on               802.1q         trunking      1
end
copy running-config startup-config
</code></pre>
</details>

---

### Часть 4 — Создание VLAN на сервере

<details>
<summary>S2</summary>
<pre><code>
enable
configure terminal
vlan 10
name Red
vlan 20
name Blue
vlan 30
name Yellow
vlan 99
name Management
end
copy running-config startup-config
</code></pre>
</details>

Проверьте, что VLAN распространились на клиентов:

<details>
<summary>S1 — show vlan brief</summary>
<pre><code>
enable
configure terminal
VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Et0/2
10   Red                              active
20   Blue                             active
30   Yellow                           active
99   Management                       active
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3 — show vlan brief</summary>
<pre><code>
enable
configure terminal
VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Et0/2
10   Red                              active
20   Blue                             active
30   Yellow                           active
99   Management                       active
end
copy running-config startup-config
</code></pre>
</details>

---

### Часть 5 — Назначение портов VLAN

Назначьте порты доступа и настройте Management SVI на всех коммутаторах.

| Коммутатор | Интерфейс | VLAN | Хост |
| ---------- | --------- | ---- | ---- |
| S1         | Et0/0     | 10   | PC-A |
| S2         | Et0/0     | 20   | PC-B |
| S3         | Et0/0     | 10   | PC-C |

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/0
switchport mode access
switchport access vlan 10
interface vlan 99
ip address 192.168.99.1 255.255.255.0
no shutdown
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S2</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/0
switchport mode access
switchport access vlan 20
interface vlan 99
ip address 192.168.99.2 255.255.255.0
no shutdown
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/0
switchport mode access
switchport access vlan 10
interface vlan 99
ip address 192.168.99.3 255.255.255.0
no shutdown
end
copy running-config startup-config
</code></pre>
</details>

---

### Часть 6 — Проверка связности

PC-A и PC-C находятся в VLAN 10 — проверьте доступность:

<details>
<summary>PC-A</summary>
<pre><code>
VPCS> ping 192.168.10.2
84 bytes from 192.168.10.2 icmp_seq=1 ttl=64 time=0.506 ms
84 bytes from 192.168.10.2 icmp_seq=2 ttl=64 time=0.802 ms
84 bytes from 192.168.10.2 icmp_seq=3 ttl=64 time=0.513 ms
84 bytes from 192.168.10.2 icmp_seq=4 ttl=64 time=0.761 ms
84 bytes from 192.168.10.2 icmp_seq=5 ttl=64 time=0.880 ms
</code></pre>
</details>

Проверьте доступность Management VLAN с коммутатора S2:

<details>
<summary>S2</summary>
<pre><code>
enable
configure terminal
S2(config-if)#do ping 192.168.99.1
Sending 5, 100-byte ICMP Echos to 192.168.99.1, timeout is 2 seconds:
.!!!!
Success rate is 80 percent (4/5), round-trip min/avg/max = 1/1/1 ms
S2(config-if)#do ping 192.168.99.2
Sending 5, 100-byte ICMP Echos to 192.168.99.2, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 4/4/4 ms
S2(config-if)#do ping 192.168.99.3
Sending 5, 100-byte ICMP Echos to 192.168.99.3, timeout is 2 seconds:
.!!!!
Success rate is 80 percent (4/5), round-trip min/avg/max = 1/1/1 ms
</code></pre>
</details>

---

### Часть 7 — VLAN расширенного диапазона

VLAN расширенного диапазона (1025–4096) нельзя управлять через VTP — коммутатор должен быть переведён в прозрачный режим.

Переведите S1 в VTP transparent:

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
vtp mode transparent
end
copy running-config startup-config
</code></pre>
</details>

Проверьте:

```
show vtp status
```

<details>
<summary>Вывод S1</summary>
<pre><code>
enable
configure terminal
VTP Version capable             : 1 to 3
VTP version running             : 1
VTP Domain Name                 : CCNA
VTP Pruning Mode                : Disabled
VTP Traps Generation            : Disabled
Feature VLAN:
--------------
VTP Operating Mode                : Transparent
Maximum VLANs supported locally   : 255
Number of existing VLANs          : 9
Configuration Revision            : 0
end
copy running-config startup-config
</code></pre>
</details>

Создайте VLAN 2000 расширенного диапазона:

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
vlan 2000
end
</code></pre>
</details>

Проверьте:

```
show vlan brief
```

<details>
<summary>Вывод S1</summary>
<pre><code>
enable
configure terminal
VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Et0/2
10   Red                              active    Et0/0
20   Blue                             active
30   Yellow                           active
99   Management                       active
1002 fddi-default                     act/unsup
1003 trcrf-default                    act/unsup
1004 fddinet-default                  act/unsup
1005 trbrf-default                    act/unsup
2000 VLAN2000                         active
end
copy running-config startup-config
</code></pre>
</details>

---

*Network Engineer Course | Лабораторная работа 01*
