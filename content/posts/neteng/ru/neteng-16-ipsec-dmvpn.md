---
title: "Network Engineer — 16. IPSec over DMVPN"
date: 2026-01-01
description: "Настройка GRE поверх IPSec между Москвой и Санкт-Петербургом, а также DMVPN поверх IPSec между Москвой, Чокурдахом и Лабытнанги"
tags: ["Networking", "IPSec", "DMVPN", "GRE", "VPN", "Cisco", "OTUS"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-16-ipsec-dmvpn/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## IPSec over DMVPN

### Домашнее задание

Цель: Настроить GRE поверх IPSec между офисами Москва и С.-Петербург. Настроить DMVPN поверх IPSec между офисами Москва и Чокурдах, Лабытнанги.

1. Настроить GRE поверх IPSec между офисами Москва и С.-Петербург
2. Настроить DMVPN поверх IPSec между Москва и Чокурдах, Лабытнанги
3. Все узлы в офисах в лабораторной работе должны иметь IP связность
4. План работы и изменения зафиксированы в документации

![Топология EVE](/img/neteng/11/1.png)

---

## GRE поверх IPSec — Москва ↔ Санкт-Петербург

IKEv1 с pre-shared key, 3DES/MD5, транспортный режим (GRE выполняет инкапсуляцию, IPSec добавляет только шифрование). Профиль `protect-gre` прикрепляется напрямую к Tunnel0.

<details>
<summary>R15 — IPSec + GRE конфигурация</summary>
<pre><code>
enable
configure terminal
interface Tunnel0
 ip address 10.0.0.1 255.255.255.252
 ip mtu 1400
 ip tcp adjust-mss 1360
 tunnel source 200.20.20.15
 tunnel destination 100.10.8.18
 tunnel protection ipsec profile protect-gre

crypto isakmp policy 1
 encr 3des
 hash md5
 authentication pre-share
 group 2
 lifetime 86400

crypto isakmp key cisco address 100.10.8.18

crypto ipsec transform-set TS esp-3des esp-md5-hmac
 mode transport

crypto ipsec profile protect-gre
 set security-association lifetime seconds 86400
 set transform-set TS
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R18 — IPSec + GRE конфигурация</summary>
<pre><code>
enable
configure terminal
interface Tunnel0
 ip address 10.0.0.2 255.255.255.252
 ip mtu 1400
 ip tcp adjust-mss 1360
 tunnel source 100.10.8.18
 tunnel destination 200.20.20.15
 tunnel protection ipsec profile protect-gre

crypto isakmp policy 1
 encr 3des
 hash md5
 authentication pre-share
 group 2
 lifetime 86400

crypto isakmp key cisco address 200.20.20.15

crypto ipsec transform-set TS esp-3des esp-md5-hmac
 mode transport

crypto ipsec profile protect-gre
 set security-association lifetime seconds 86400
 set transform-set TS
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R18 — проверка GRE + IPSec</summary>
<pre><code>
R18#ping 10.0.0.1
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 6/6/6 ms

R18#ping 10.0.0.2
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 4/4/5 ms

R18#show crypto session
Crypto session current status

Interface: Tunnel0
Session status: UP-ACTIVE
Peer: 200.20.20.15 port 500
  IKEv1 SA: local 100.10.8.18/500 remote 200.20.20.15/500 Active
  IPSEC FLOW: permit 47 host 100.10.8.18 host 200.20.20.15
        Active SAs: 4, origin: crypto map
</code></pre>
</details>

---

## DMVPN поверх IPSec — Москва хаб, Чокурдах и Лабытнанги споки

Та же политика IKEv1, но с wildcard pre-shared key (`address 0.0.0.0`) — адреса споков динамические. Режим трансформации — tunnel (не transport), так как используется mGRE.

<details>
<summary>R14 — DMVPN хаб + IPSec</summary>
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
 tunnel protection ipsec profile protect-gre

crypto isakmp policy 1
 encr 3des
 hash md5
 authentication pre-share
 group 2

crypto isakmp key isakmp1234 address 0.0.0.0

crypto ipsec transform-set TS esp-3des esp-md5-hmac
 mode tunnel

crypto ipsec profile protect-gre
 set security-association lifetime seconds 86400
 set transform-set TS
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R28 — DMVPN спок (Чокурдах) + IPSec</summary>
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
 tunnel protection ipsec profile protect-gre

crypto isakmp policy 1
 encr 3des
 hash md5
 authentication pre-share
 group 2

crypto isakmp key isakmp1234 address 0.0.0.0

crypto ipsec transform-set TS esp-3des esp-md5-hmac
 mode tunnel

crypto ipsec profile protect-gre
 set security-association lifetime seconds 86400
 set transform-set TS
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R27 — DMVPN спок (Лабытнанги) + IPSec</summary>
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
 tunnel protection ipsec profile protect-gre

crypto isakmp policy 1
 encr 3des
 hash md5
 authentication pre-share
 group 2

crypto isakmp key isakmp1234 address 0.0.0.0

crypto ipsec transform-set TS esp-3des esp-md5-hmac
 mode tunnel

crypto ipsec profile protect-gre
 set security-association lifetime seconds 86400
 set transform-set TS
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R27 — проверка DMVPN + IPSec</summary>
<pre><code>
R27#show dmvpn
Interface: Tunnel0, IPv4 NHRP Details
Type:Spoke, NHRP Peers:2,

 # Ent  Peer NBMA Addr Peer Tunnel Add State  UpDn Tm Attrb
 ----- --------------- --------------- ----- -------- -----
     2 200.20.20.14           10.1.0.1    UP 01:01:14     S
                              10.1.0.3    UP 00:00:08     D
     1 111.110.35.14          10.1.0.2    UP 00:00:10     D

R27#show crypto isakmp sa
dst             src             state          conn-id status
200.20.20.14    210.110.35.2    QM_IDLE           1001 ACTIVE
210.110.35.2    111.110.35.14   QM_IDLE           1002 ACTIVE
111.110.35.14   210.110.35.2    QM_IDLE           1003 ACTIVE

R27#ping 10.1.0.1
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 6/6/7 ms

R27#ping 10.1.0.2
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 8/9/10 ms

R27#ping 10.1.0.3
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 7/7/8 ms
</code></pre>
</details>

---

## Полные конфигурации роутеров

<details>
<summary>R15 (AS 1001) — изменения лаб. 16</summary>
<pre><code>
enable
configure terminal
interface Tunnel0
 ip address 10.0.0.1 255.255.255.252
 ip mtu 1400
 ip tcp adjust-mss 1360
 tunnel source 200.20.20.15
 tunnel destination 100.10.8.18
 tunnel protection ipsec profile protect-gre

crypto isakmp policy 1
 encr 3des
 hash md5
 authentication pre-share
 group 2
 lifetime 86400

crypto isakmp key cisco address 100.10.8.18

crypto ipsec transform-set TS esp-3des esp-md5-hmac
 mode transport

crypto ipsec profile protect-gre
 set security-association lifetime seconds 86400
 set transform-set TS
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R18 — Санкт-Петербург (AS 2042) — изменения лаб. 16</summary>
<pre><code>
enable
configure terminal
interface Tunnel0
 ip address 10.0.0.2 255.255.255.252
 ip mtu 1400
 ip tcp adjust-mss 1360
 tunnel source 100.10.8.18
 tunnel destination 200.20.20.15
 tunnel protection ipsec profile protect-gre

crypto isakmp policy 1
 encr 3des
 hash md5
 authentication pre-share
 group 2
 lifetime 86400

crypto isakmp key cisco address 200.20.20.15

crypto ipsec transform-set TS esp-3des esp-md5-hmac
 mode transport

crypto ipsec profile protect-gre
 set security-association lifetime seconds 86400
 set transform-set TS
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R14 (AS 1001) — изменения лаб. 16</summary>
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
 tunnel protection ipsec profile protect-gre

crypto isakmp policy 1
 encr 3des
 hash md5
 authentication pre-share
 group 2

crypto isakmp key isakmp1234 address 0.0.0.0

crypto ipsec transform-set TS esp-3des esp-md5-hmac
 mode tunnel

crypto ipsec profile protect-gre
 set security-association lifetime seconds 86400
 set transform-set TS
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R28 — Чокурдах — изменения лаб. 16</summary>
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
 tunnel protection ipsec profile protect-gre

crypto isakmp policy 1
 encr 3des
 hash md5
 authentication pre-share
 group 2

crypto isakmp key isakmp1234 address 0.0.0.0

crypto ipsec transform-set TS esp-3des esp-md5-hmac
 mode tunnel

crypto ipsec profile protect-gre
 set security-association lifetime seconds 86400
 set transform-set TS
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R27 — Лабытнанги — изменения лаб. 16</summary>
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
 tunnel protection ipsec profile protect-gre

crypto isakmp policy 1
 encr 3des
 hash md5
 authentication pre-share
 group 2

crypto isakmp key isakmp1234 address 0.0.0.0

crypto ipsec transform-set TS esp-3des esp-md5-hmac
 mode tunnel

crypto ipsec profile protect-gre
 set security-association lifetime seconds 86400
 set transform-set TS
end
copy running-config startup-config
</code></pre>
</details>

---

*Network Engineer Course | Lab 16*
