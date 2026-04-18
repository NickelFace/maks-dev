---
title: "Network Engineer — 15. DMVPN"
date: 2025-12-23
description: "Настройка GRE-туннеля между Москвой и Санкт-Петербургом, а также DMVPN между Москвой, Чокурдахом и Лабытнанги"
tags: ["Networking", "DMVPN", "GRE", "VPN", "Cisco", "OTUS"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-15-dmvpn/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## VPN. GRE и DMVPN

### Домашнее задание

Цель: Настроить GRE между офисами Москва и С.-Петербург. Настроить DMVPN между офисами Москва и Чокурдах, Лабытнанги.

1. Настроить GRE между офисами Москва и С.-Петербург
2. Настроить DMVPN между Москва и Чокурдах, Лабытнанги
3. Все узлы в офисах в лабораторной работе должны иметь IP связность
4. План работы и изменения зафиксированы в документации

![Топология EVE](/img/neteng/11/1.png)

---

## GRE — Москва ↔ Санкт-Петербург

Туннель GRE точка-точка между R15 (Москва) и R18 (Санкт-Петербург) использует публичные Loopback-адреса каждого AS как конечные точки туннеля.

R15:
```
interface Tunnel0
 ip address 10.0.0.1 255.255.255.252
 tunnel source 200.20.20.15
 tunnel destination 100.10.8.18
```

R18:
```
interface Tunnel0
 ip address 10.0.0.2 255.255.255.252
 tunnel source 100.10.8.18
 tunnel destination 200.20.20.15
```

---

## DMVPN — Москва хаб, Чокурдах и Лабытнанги споки

R14 — DMVPN-хаб. R28 (Чокурдах) и R27 (Лабытнанги) — споки. Оба спока не имеют собственного публичного адреса — в качестве источника туннеля используется IP аплинк-интерфейса в сторону Триады. `ip nhrp registration no-unique` позволяет повторную регистрацию.

<details>
<summary>R14 — DMVPN хаб</summary>
<pre><code>
enable
configure terminal
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
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R28 — DMVPN спок (Чокурдах)</summary>
<pre><code>
enable
configure terminal
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
 tunnel source Ethernet0/0
 tunnel mode gre multipoint
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R27 — DMVPN спок (Лабытнанги)</summary>
<pre><code>
enable
configure terminal
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
 tunnel source Ethernet0/0
 tunnel mode gre multipoint
end
copy running-config startup-config
</code></pre>
</details>

---

## Проверка IP-связности

<details>
<summary>R14 — DMVPN ping + show dmvpn</summary>
<pre><code>
R14#ping 10.1.0.1
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 4/4/5 ms

R14#ping 10.1.0.2
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 2/4/7 ms

R14#ping 10.1.0.3
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 4/5/7 ms

R14#show dmvpn
Interface: Tunnel0, IPv4 NHRP Details
Type:Hub, NHRP Peers:3,

 # Ent  Peer NBMA Addr Peer Tunnel Add State  UpDn Tm Attrb
 ----- --------------- --------------- ----- -------- -----
     1 UNKNOWN                10.1.0.1  NHRP    never    IX
     1 111.110.35.14          10.1.0.2    UP 00:03:22     D
     1 210.110.35.2           10.1.0.3    UP 00:03:38     D
</code></pre>
</details>

<details>
<summary>R15 — GRE-туннель ping</summary>
<pre><code>
R15>ping 10.0.0.2
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 5/5/7 ms

R15>ping 10.0.0.1
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 1/4/5 ms
</code></pre>
</details>

---

## Полные конфигурации роутеров

<details>
<summary>R15 (AS 1001) — изменения лаб. 15</summary>
<pre><code>
enable
configure terminal
interface Tunnel0
 ip address 10.0.0.1 255.255.255.252
 tunnel source 200.20.20.15
 tunnel destination 100.10.8.18
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R18 — Санкт-Петербург (AS 2042) — изменения лаб. 15</summary>
<pre><code>
enable
configure terminal
interface Tunnel0
 ip address 10.0.0.2 255.255.255.252
 tunnel source 100.10.8.18
 tunnel destination 200.20.20.15
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R14 (AS 1001) — изменения лаб. 15</summary>
<pre><code>
enable
configure terminal
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
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R28 — Чокурдах — изменения лаб. 15</summary>
<pre><code>
enable
configure terminal
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
 tunnel source Ethernet0/0
 tunnel mode gre multipoint
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R27 — Лабытнанги — изменения лаб. 15</summary>
<pre><code>
enable
configure terminal
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
 tunnel source Ethernet0/0
 tunnel mode gre multipoint
end
copy running-config startup-config
</code></pre>
</details>

---

*Network Engineer Course | Lab 15*
