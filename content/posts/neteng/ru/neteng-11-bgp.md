---
title: "Network Engineer — 11. BGP Basics"
date: 2025-11-20
description: "Настройка eBGP между автономными системами для обеспечения связности между офисами Москвы и Санкт-Петербурга"
tags: ["Networking", "BGP", "eBGP", "Routing", "Cisco", "OTUS"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-11-bgp/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## BGP. Основы

### Домашнее задание

Цель: Настроить BGP между автономными системами. Организовать доступность между офисами Москва и С.-Петербург.

1. eBGP между офисом Москва и двумя провайдерами — Киторн и Ламас
2. Настроить eBGP между провайдерами Киторн и Ламас
3. Настроить eBGP между Ламас и Триада
4. eBGP между офисом С.-Петербург и провайдером Триада
5. Организовать IP-доступность между офисами Москва и С.-Петербург
6. Задокументировать план работы и внесённые изменения

![EVE Topology](/img/neteng/11/1.png)

Добавлен линк между R14 и R15 — для упрощения подключения к area 0 и для обеспечения отказоустойчивости при прохождении трафика через интернет.

---

## eBGP — Москва ↔ Киторн и Ламас

<details>
<summary>R14 (AS 1001) — конфигурация</summary>
<pre><code>
router bgp 1001
 bgp router-id 14.14.14.14
 bgp log-neighbor-changes
 neighbor 10.10.10.26 remote-as 1001
 neighbor 100.100.100.2 remote-as 101
</code></pre>
</details>

<details>
<summary>R14 — show bgp summary</summary>
<pre><code>
BGP router identifier 14.14.14.14, local AS number 1001
BGP table version is 84, main routing table version 84

Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.10.10.26     4         1001     379     383       84    0    0 05:34:13        9
100.100.100.2   4          101     381     378       84    0    0 05:33:33       10
</code></pre>
</details>

<details>
<summary>R15 (AS 1001) — конфигурация</summary>
<pre><code>
router bgp 1001
 bgp router-id 15.15.15.15
 bgp log-neighbor-changes
 neighbor 10.10.10.25 remote-as 1001
 neighbor 111.111.111.2 remote-as 301
</code></pre>
</details>

<details>
<summary>R15 — show bgp summary</summary>
<pre><code>
BGP router identifier 15.15.15.15, local AS number 1001
BGP table version is 50, main routing table version 50

Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.10.10.25     4         1001     385     380       50    0    0 05:35:41        9
111.111.111.2   4          301     378     373       50    0    0 05:34:10       10
</code></pre>
</details>

<details>
<summary>R21 — Ламас (AS 301) — конфигурация</summary>
<pre><code>
router bgp 301
 bgp router-id 21.21.21.21
 bgp log-neighbor-changes
 network 110.110.110.0 mask 255.255.255.252
 network 111.111.111.0 mask 255.255.255.252
 network 111.111.111.4 mask 255.255.255.252
 neighbor 110.110.110.1 remote-as 101
 neighbor 111.111.111.1 remote-as 1001
 neighbor 111.111.111.6 remote-as 520
</code></pre>
</details>

<details>
<summary>R21 — show bgp summary</summary>
<pre><code>
BGP router identifier 21.21.21.21, local AS number 301
BGP table version is 30, main routing table version 30

Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
110.110.110.1   4          101     385     380       30    0    0 05:35:38        7
111.111.111.1   4         1001     375     379       30    0    0 05:35:38        1
111.111.111.6   4          520     361     364       30    0    0 05:20:03        6
</code></pre>
</details>

<details>
<summary>R22 — Киторн (AS 101) — конфигурация</summary>
<pre><code>
router bgp 101
 bgp router-id 22.22.22.22
 bgp log-neighbor-changes
 network 100.100.100.0 mask 255.255.255.252
 network 100.100.100.4 mask 255.255.255.252
 neighbor 100.100.100.1 remote-as 1001
 neighbor 100.100.100.6 remote-as 520
 neighbor 110.110.110.2 remote-as 301
</code></pre>
</details>

<details>
<summary>R22 — show bgp summary</summary>
<pre><code>
BGP router identifier 22.22.22.22, local AS number 101
BGP table version is 41, main routing table version 41

Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
100.100.100.1   4         1001     383     386       41    0    0 05:37:31        1
100.100.100.6   4          520     363     369       41    0    0 05:23:07        6
110.110.110.2   4          301     382     386       41    0    0 05:36:40        8
</code></pre>
</details>

---

## eBGP — Киторн/Ламас ↔ Триада

<details>
<summary>R23 — Триада (AS 520) — конфигурация</summary>
<pre><code>
router bgp 520
 bgp router-id 23.23.23.23
 bgp log-neighbor-changes
 neighbor 50.0.24.1 remote-as 520
 neighbor 50.0.24.1 update-source Loopback0
 neighbor 50.0.25.1 remote-as 520
 neighbor 50.0.25.1 update-source Loopback0
 neighbor 50.0.26.1 remote-as 520
 neighbor 50.0.26.1 update-source Loopback0
 neighbor 100.100.100.5 remote-as 101
</code></pre>
</details>

<details>
<summary>R23 — show bgp summary</summary>
<pre><code>
BGP router identifier 23.23.23.23, local AS number 520
BGP table version is 32, main routing table version 32

Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
50.0.24.1       4          520     364     364       32    0    0 05:23:00        5
50.0.25.1       4          520     358     363       32    0    0 05:22:01        2
50.0.26.1       4          520     357     362       32    0    0 05:20:51        2
100.100.100.5   4          101     371     366       32    0    0 05:25:02        5
</code></pre>
</details>

<details>
<summary>R24 — Триада (AS 520) — конфигурация</summary>
<pre><code>
router bgp 520
 bgp router-id 24.24.24.24
 bgp log-neighbor-changes
 network 77.77.77.8 mask 255.255.255.252
 neighbor 50.0.23.1 remote-as 520
 neighbor 50.0.23.1 update-source Loopback0
 neighbor 50.0.25.1 remote-as 520
 neighbor 50.0.25.1 update-source Loopback0
 neighbor 50.0.26.1 remote-as 520
 neighbor 50.0.26.1 update-source Loopback0
 neighbor 77.77.77.10 remote-as 2042
 neighbor 111.111.111.5 remote-as 301
</code></pre>
</details>

<details>
<summary>R24 — show bgp summary</summary>
<pre><code>
BGP router identifier 24.24.24.24, local AS number 520
BGP table version is 22, main routing table version 22

Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
50.0.23.1       4          520     367     367       22    0    0 05:25:27        4
50.0.25.1       4          520     359     365       22    0    0 05:24:28        2
50.0.26.1       4          520     361     362       22    0    0 05:23:18        2
77.77.77.10     4         2042     370     368       22    0    0 05:25:27        0
111.111.111.5   4          301     371     367       22    0    0 05:25:27        5
</code></pre>
</details>

---

## eBGP — Санкт-Петербург ↔ Триада

<details>
<summary>R26 — Триада (AS 520) — конфигурация</summary>
<pre><code>
router bgp 520
 bgp router-id 26.26.26.26
 bgp log-neighbor-changes
 network 77.77.77.12 mask 255.255.255.252
 network 111.110.35.12 mask 255.255.255.252
 neighbor 50.0.23.1 remote-as 520
 neighbor 50.0.23.1 update-source Loopback0
 neighbor 50.0.24.1 remote-as 520
 neighbor 50.0.24.1 update-source Loopback0
 neighbor 50.0.25.1 remote-as 520
 neighbor 50.0.25.1 update-source Loopback0
 neighbor 77.77.77.14 remote-as 2042
</code></pre>
</details>

<details>
<summary>R26 — show bgp summary</summary>
<pre><code>
BGP router identifier 26.26.26.26, local AS number 520
BGP table version is 16, main routing table version 16

Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
50.0.23.1       4          520     366     361       16    0    0 05:24:08        4
50.0.24.1       4          520     363     362       16    0    0 05:24:08        5
50.0.25.1       4          520     363     359       16    0    0 05:24:08        2
77.77.77.14     4         2042     370     363       16    0    0 05:24:08        0
</code></pre>
</details>

<details>
<summary>R18 — Санкт-Петербург (AS 2042) — конфигурация</summary>
<pre><code>
router bgp 2042
 bgp router-id 18.18.18.18
 bgp log-neighbor-changes
 neighbor 77.77.77.9 remote-as 520
 neighbor 77.77.77.13 remote-as 520
</code></pre>
</details>

<details>
<summary>R18 — show bgp summary</summary>
<pre><code>
BGP router identifier 18.18.18.18, local AS number 2042
BGP table version is 1, main routing table version 1

Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
77.77.77.9      4          520      10       2        1    0    0 00:00:24       10
77.77.77.13     4          520       6       2        1    0    0 00:00:24        5
</code></pre>
</details>

---

## Проверка доступности — Москва ↔ Санкт-Петербург

<details>
<summary>R15 ping R18</summary>
<pre><code>
R15#ping 77.77.77.10
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 77.77.77.10, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/1 ms

R15#ping 77.77.77.14
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 77.77.77.14, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/1 ms
</code></pre>
</details>

<details>
<summary>R14 ping R18</summary>
<pre><code>
R14#ping 77.77.77.10
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 77.77.77.10, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/2 ms

R14#ping 77.77.77.14
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 77.77.77.14, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/2 ms
</code></pre>
</details>

---

## Сети провайдеров

| Triada           | Lamas            | Kitorn           |
| ---------------- | ---------------- | ---------------- |
| 77.77.77.8/30    | 111.111.111.0/30 | 100.100.100.0/30 |
| 77.77.77.12/30   | 110.110.110.0/30 | 100.100.100.4/30 |
| 111.110.35.8/30  | 111.111.111.4/30 |                  |
| 111.110.35.12/30 |                  |                  |
| 210.110.35.0/30  |                  |                  |

Полные конфигурации роутеров: [SharePoint](https://e9exu-my.sharepoint.com/:f:/g/personal/nickelface_ermaon_com/Euh_hOXWUWRAr0awcVlpJVYBzobOZWNdcKt4VLkLif40EA?e=GGNmyl)

---

*Network Engineer Course | Lab 11*
