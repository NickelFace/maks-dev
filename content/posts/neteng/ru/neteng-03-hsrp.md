---
title: "Network Engineer — 03. HSRP"
date: 2025-09-06
description: "Лабораторная работа: настройка резервирования первого перехода с помощью HSRP. Активный/резервный маршрутизатор, виртуальный IP, приоритет и вытеснение."
tags: ["Networking", "HSRP", "Redundancy", "Cisco"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-03-hsrp/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Лабораторная работа: Настройка HSRP (резервирование первого перехода)

### Топология

![HSRP topology](/img/neteng/03/HSRP.png)

### Таблица адресации

| Устройство | Интерфейс    | IP-адрес        | Маска подсети   | Шлюз        |
| ---------- | ------------ | --------------- | --------------- | ----------- |
| R1         | G0/1         | 192.168.1.1     | 255.255.255.0   | —           |
|            | S0/0/0 (DCE) | 10.1.1.1        | 255.255.255.252 | —           |
| R2         | S0/0/0       | 10.1.1.2        | 255.255.255.252 | —           |
|            | S0/0/1 (DCE) | 10.2.2.2        | 255.255.255.252 | —           |
|            | Lo1          | 209.165.200.225 | 255.255.255.224 | —           |
| R3         | G0/1         | 192.168.1.3     | 255.255.255.0   | —           |
|            | S0/0/1       | 10.2.2.1        | 255.255.255.252 | —           |
| PC-A       | NIC          | 192.168.1.31    | 255.255.255.0   | 192.168.1.1 |
| PC-C       | NIC          | 192.168.1.33    | 255.255.255.0   | 192.168.1.3 |

### Цели

- **Часть 1.** Соберите топологию и проверьте связность
- **Часть 2.** Настройте резервирование первого перехода HSRP

---

### Часть 1 — Базовая настройка маршрутизаторов

<details>
<summary>R1</summary>
<pre><code>
Enable
Configure terminal
no ip domain-lookup
hostname R1
enable secret class
service password-encryption
banner motd "This is a secure system. Authorized Access Only!"
line vty 0 4
 logging synchronous
 password cisco
 login
line con 0
 exec-timeout 0 0
 logging synchronous
 password cisco
 login
interface Serial1/0
 ip address 10.1.1.1 255.255.255.252
 clock rate 128000
 no shutdown
interface Ethernet0/0
 ip address 192.168.1.1 255.255.255.0
 duplex full
 no shutdown
do copy run start
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R2</summary>
<pre><code>
Enable
Configure terminal
no ip domain-lookup
hostname R2
enable secret class
service password-encryption
banner motd "This is a secure system. Authorized Access Only!"
line vty 0 4
 logging synchronous
 password cisco
 login
line con 0
 exec-timeout 0 0
 logging synchronous
 password cisco
 login
interface Serial1/0
 ip address 10.1.1.2 255.255.255.252
 no shutdown
interface Serial1/1
 ip address 10.2.2.2 255.255.255.252
 clock rate 128000
 no shutdown
interface Loopback0
 ip address 209.165.200.225 255.255.255.224
do copy run start
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
service password-encryption
banner motd "This is a secure system. Authorized Access Only!"
line vty 0 4
 logging synchronous
 password cisco
 login
line con 0
 exec-timeout 0 0
 logging synchronous
 password cisco
 login
interface Serial1/1
 ip address 10.2.2.1 255.255.255.252
 no shutdown
interface Ethernet0/0
 ip address 192.168.1.3 255.255.255.0
 duplex full
 no shutdown
do copy run start
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>PC-A</summary>
<pre><code>
set pcname PC-A
ip 192.168.1.31 192.168.1.1 24
</code></pre>
</details>
<details>
<summary>PC-C</summary>
<pre><code>
set pcname PC-C
ip 192.168.1.33 192.168.1.3 24
</code></pre>
</details>

---

### RIP для доступа в интернет

<details>
<summary>R1</summary>
<pre><code>
enable
configure terminal
router rip
 version 2
 network 10.0.0.0
 network 192.168.1.0
 no auto-summary
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R2</summary>
<pre><code>
enable
configure terminal
router rip
 version 2
 network 10.0.0.0
 default-information originate
 no auto-summary
ip route 0.0.0.0 0.0.0.0 Loopback0
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R3</summary>
<pre><code>
enable
configure terminal
router rip
 version 2
 network 10.0.0.0
 network 192.168.1.0
 no auto-summary
end
copy running-config startup-config
</code></pre>
</details>

Проверьте таблицы маршрутизации и выполните ping с компьютеров до `209.165.200.225`.

<details>
<summary>Трассировка с PC-A</summary>
<pre><code>
PC-A> trace 209.165.200.225
1   192.168.1.1   1.555 ms
2   10.1.1.2      10.647 ms
</code></pre>
</details>

---

### Часть 2 — Настройка HSRP

HSRP предоставляет виртуальный IP-адрес, общий для R1 и R3. R1 становится активным с приоритетом 150; R3 — резервным.

<details>
<summary>R1 (Active)</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0
 standby 1 ip 192.168.1.254
 standby version 2
 standby 1 priority 150
 standby 1 preempt
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R3 (Standby)</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0
 standby 1 ip 192.168.1.254
 standby version 2
end
copy running-config startup-config
</code></pre>
</details>

Смените шлюз по умолчанию на ПК и коммутаторах на виртуальный IP **192.168.1.254**:

<details>
<summary>PC-A</summary>
<pre><code>
ip 192.168.1.31 192.168.1.254 24
</code></pre>
</details>
<details>
<summary>PC-C</summary>
<pre><code>
ip 192.168.1.33 192.168.1.254 24
</code></pre>
</details>
<details>
<summary>S1, S3 (шлюз управления)</summary>
<pre><code>
enable
configure terminal
ip default-gateway 192.168.1.254
end
copy running-config startup-config
</code></pre>
</details>

---

### Проверка

```
show standby brief
```

<details>
<summary>R1 — Active</summary>
<pre><code>
enable
configure terminal
R1(config-if)#do show standby brief
                     P indicates configured to preempt.
                     |
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Gig6/0      1    150 P Active  local           192.168.1.3     192.168.1.254
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R3 — Standby</summary>
<pre><code>
enable
configure terminal
R3(config-if)#do sh stan bri
                     P indicates configured to preempt.
                     |
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Gig9/0      1    100   Standby 192.168.1.1     local           192.168.1.254
end
copy running-config startup-config
</code></pre>
</details>

Детальное состояние:

<details>
<summary>R1 show standby</summary>
<pre><code>
enable
configure terminal
R1(config)#do sh stand
GigabitEthernet6/0 - Group 1 (version 2)
  State is Active
    12 state changes, last state change 02:02:36
  Virtual IP address is 192.168.1.254
  Active virtual MAC address is 0000.0C9F.F001
    Local virtual MAC address is 0000.0C9F.F001 (v2 default)
  Hello time 3 sec, hold time 10 sec
    Next hello sent in 0.774 secs
  Preemption enabled
  Active router is local
  Standby router is 192.168.1.3, priority 100 (expires in 8 sec)
  Priority 150 (configured 150)
  Group name is hsrp-Gig6/0-1 (default)
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R3 show standby</summary>
<pre><code>
R3#show standby
GigabitEthernet9/0 - Group 1 (version 2)
  State is Standby
    12 state changes, last state change 02:02:48
  Virtual IP address is 192.168.1.254
  Active virtual MAC address is 0000.0C9F.F001
    Local virtual MAC address is 0000.0C9F.F001 (v2 default)
  Hello time 3 sec, hold time 10 sec
    Next hello sent in 1.657 secs
  Preemption disabled
  Active router is 192.168.1.1, priority 150 (expires in 9 sec)
    MAC address is 0000.0C9F.F001
  Standby router is local
  Priority 100 (default 100)
  Group name is hsrp-Gig9/0-1 (default)
</code></pre>
</details>

Тест отказоустойчивости — отправьте ping на `209.165.200.225` и отключите аплинк R1. R3 перехватит управление после истечения hold time:

<details>
<summary>PC-A ping при переключении</summary>
<pre><code>
enable
configure terminal
C:\>ping 209.165.200.225

Pinging 209.165.200.225 with 32 bytes of data:
Reply from 209.165.200.225: bytes=32 time=2ms TTL=254
Request timed out.
Reply from 209.165.200.225: bytes=32 time=2ms TTL=254
Reply from 209.165.200.225: bytes=32 time<1ms TTL=254

Ping statistics for 209.165.200.225:
    Packets: Sent = 4, Received = 3, Lost = 1 (25% loss)
</code></pre>
</details>

После отключения R1 — R3 становится активным:

<details>
<summary>R3 — после отключения R1</summary>
<pre><code>
enable
configure terminal
R3(config-if)#do sh stan bri
                     P indicates configured to preempt.
                     |
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Gig9/0      1    100 P Active  local           192.168.1.1     192.168.1.254
end
copy running-config startup-config
</code></pre>
</details>

---

### Изменение приоритетов HSRP

Повысьте приоритет R3 до 200 и включите preempt:

```
R3(config)# interface Ethernet0/0
R3(config-if)# standby 1 priority 200
R3(config-if)# standby 1 preempt
```

<details>
<summary>R3 после изменения приоритета</summary>
<pre><code>
R3#show standby brief
                     P indicates configured to preempt.
                     |
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Gig9/0      1    200 P Active  local           unknown         192.168.1.254
</code></pre>
</details>

После повторного подключения R1 он остаётся резервным, так как приоритет R3 (200) теперь выше:

<details>
<summary>R1 — после повышения приоритета R3</summary>
<pre><code>
enable
configure terminal
R1(config-if)#do sh stan bri
                     P indicates configured to preempt.
                     |
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Gig6/0      1    100 P Standby 192.168.1.3     local           192.168.1.254
end
copy running-config startup-config
</code></pre>
</details>

**Важное замечание:** Без `preempt` маршрутизатор с более высоким приоритетом не перехватит управление у текущего активного маршрутизатора. Необходимы оба параметра: `priority` и `preempt`.

---

*Network Engineer Course | Лабораторная работа 03*
