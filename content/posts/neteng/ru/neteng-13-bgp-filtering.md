---
title: "Network Engineer — 13. BGP Path Selection and Filtering"
date: 2025-12-07
description: "Настройка фильтрации BGP-маршрутов для московского и петербургского офисов, настройка провайдеров на отправку только маршрута по умолчанию"
tags: ["Networking", "BGP", "Filtering", "Routing", "Cisco", "OTUS"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-13-bgp-filtering/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## BGP. Фильтрация

### Домашнее задание

Цель: Настроить фильтрацию для офиса Москва. Настроить фильтрацию для офиса С.-Петербург.

1. Настроить фильтрацию в офисе Москва так, чтобы не появилось транзитного трафика (AS-path)
2. Настроить фильтрацию в офисе С.-Петербург так, чтобы не появилось транзитного трафика (Prefix-list)
3. Настроить провайдера Киторн так, чтобы в офис Москва отдавался только маршрут по-умолчанию
4. Настроить провайдера Ламас так, чтобы в офис Москва отдавался только маршрут по-умолчанию и префикс офиса С.-Петербург
5. Все сети в лабораторной работе должны иметь IP связность
6. План работы и изменения зафиксированы в документации

![Топология EVE](/img/neteng/11/1.png)

---

## Москва — предотвращение транзитного трафика (AS-path)

AS 1001 не должна стать транзитной между Киторн и Ламас. AS-path access-list, разрешающий только локально анонсированные маршруты (`^$`), применяется на выход к обоим провайдерам. Отдельный loopback-интерфейс анонсирует агрегированный московский префикс в интернет.

<details>
<summary>R14 — настройка BGP</summary>
<pre><code>
enable
configure terminal
interface Loopback0
 ip address 1.1.1.14 255.255.255.255

interface Loopback14
 ip address 200.20.20.14 255.255.252.0

ip as-path access-list 1 permit ^$
ip as-path access-list 1 deny .*

router bgp 1001
 bgp router-id 14.14.14.14
 bgp log-neighbor-changes
 network 200.20.20.0 mask 255.255.252.0
 neighbor MSK peer-group
 neighbor MSK remote-as 1001
 neighbor MSK update-source Loopback0
 neighbor MSK next-hop-self
 neighbor 1.1.1.15 peer-group MSK
 neighbor 100.100.100.2 remote-as 101
 neighbor 100.100.100.2 filter-list 1 out
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R15 — настройка BGP</summary>
<pre><code>
enable
configure terminal
interface Loopback0
 ip address 1.1.1.15 255.255.255.255

interface Loopback15
 ip address 200.20.20.15 255.255.252.0

ip as-path access-list 1 permit ^$
ip as-path access-list 1 deny .*

router bgp 1001
 bgp router-id 15.15.15.15
 bgp log-neighbor-changes
 network 200.20.20.0 mask 255.255.252.0
 neighbor 1.1.1.14 remote-as 1001
 neighbor 1.1.1.14 next-hop-self
 neighbor 111.111.111.2 remote-as 301
 neighbor 111.111.111.2 route-map LP in
 neighbor 111.111.111.2 filter-list 1 out
end
copy running-config startup-config
</code></pre>
</details>

Проверка — AS 1001 присутствует только в пути к собственной сети 200.20.20.0/22, транзитных маршрутов нет:

<details>
<summary>R22 — show ip bgp</summary>
<pre><code>
R22#show ip bgp
BGP table version is 47, local router ID is 110.110.110.1

     Network          Next Hop            Metric LocPrf Weight Path
 *   77.77.77.8/30    110.110.110.2                          0 301 520 i
 *>                   100.100.100.6                          0 520 i
 *   77.77.77.12/30   110.110.110.2                          0 301 520 i
 *>                   100.100.100.6                          0 520 i
 *>  100.100.100.0/30 0.0.0.0                  0         32768 i
 *>  100.100.100.4/30 0.0.0.0                  0         32768 i
 r   110.110.110.0/30 100.100.100.6                          0 520 301 i
 r>                   110.110.110.2            0             0 301 i
 *   111.110.35.8/30  110.110.110.2                          0 301 520 i
 *>                   100.100.100.6                          0 520 i
 *   111.110.35.12/30 110.110.110.2                          0 301 520 i
 *>                   100.100.100.6                          0 520 i
 *   111.111.111.0/30 100.100.100.6                          0 520 301 i
 *>                   110.110.110.2            0             0 301 i
 *   111.111.111.4/30 100.100.100.6                          0 520 301 i
 *>                   110.110.110.2            0             0 301 i
 *   200.20.20.0/22   110.110.110.2                          0 301 1001 i
 *>                   100.100.100.1            0             0 1001 i
 *   210.110.35.0/30  110.110.110.2                          0 301 520 i
 *>                   100.100.100.6                          0 520 i
</code></pre>
</details>

<details>
<summary>R21 — show ip bgp</summary>
<pre><code>
R21#show ip bgp
BGP table version is 13, local router ID is 111.111.111.5

     Network          Next Hop            Metric LocPrf Weight Path
 *   77.77.77.8/30    110.110.110.1                          0 101 520 i
 *>                   111.111.111.6            0             0 520 i
 *   77.77.77.12/30   110.110.110.1                          0 101 520 i
 *>                   111.111.111.6                          0 520 i
 *   100.10.8.0/22    110.110.110.1                          0 101 520 2042 i
 *>                   111.111.111.6                          0 520 2042 i
 *   100.100.100.0/30 111.111.111.6                          0 520 101 i
 *>                   110.110.110.1            0             0 101 i
 *   100.100.100.4/30 111.111.111.6                          0 520 101 i
 *>                   110.110.110.1            0             0 101 i
 *>  110.110.110.0/30 0.0.0.0                  0         32768 i
 *   111.110.35.8/30  110.110.110.1                          0 101 520 i
 *>                   111.111.111.6                          0 520 i
 *   111.110.35.12/30 110.110.110.1                          0 101 520 i
 *>                   111.111.111.6                          0 520 i
 *>  111.111.111.0/30 0.0.0.0                  0         32768 i
 *>  111.111.111.4/30 0.0.0.0                  0         32768 i
 *   200.20.20.0/22   110.110.110.1                          0 101 1001 i
 *>                   111.111.111.1            0             0 1001 i
 *   210.110.35.0/30  110.110.110.1                          0 101 520 i
 *>                   111.111.111.6                          0 520 i
</code></pre>
</details>

---

## Санкт-Петербург — предотвращение транзитного трафика (prefix-list)

R18 использует шаблоны peer-session/peer-policy для сессий с Триадой. Prefix-list `DEFAULT` разрешает на выход только агрегат 100.10.8.0/22; filter-list дополнительно блокирует маршруты с непустым AS-path.

<details>
<summary>R18 — настройка BGP</summary>
<pre><code>
enable
configure terminal
interface Loopback18
 ip address 100.10.8.18 255.255.252.0

ip as-path access-list 1 permit ^$
ip as-path access-list 1 deny .*

ip prefix-list DEFAULT seq 15 permit 100.10.8.0/22 le 32
ip prefix-list DEFAULT seq 20 deny 0.0.0.0/0 le 32

route-map FILTER permit 10
 match ip address prefix-list DEFAULT

router bgp 2042
 template peer-policy TRIADA_POLICY
  route-map FILTER out
  filter-list 1 out
 exit-peer-policy
 !
 template peer-session TRIADA
  remote-as 520
 exit-peer-session
 !
 bgp router-id 18.18.18.18
 bgp log-neighbor-changes
 network 100.10.8.0 mask 255.255.252.0
 neighbor SPB peer-group
 neighbor SPB remote-as 2042
 neighbor SPB update-source Loopback0
 neighbor SPB next-hop-self
 neighbor 1.1.2.16 peer-group SPB
 neighbor 1.1.2.17 peer-group SPB
 neighbor 1.1.2.32 peer-group SPB
 neighbor 77.77.77.9 inherit peer-session TRIADA
 neighbor 77.77.77.9 inherit peer-policy TRIADA_POLICY
 neighbor 77.77.77.13 inherit peer-session TRIADA
 neighbor 77.77.77.13 inherit peer-policy TRIADA_POLICY
end
copy running-config startup-config
</code></pre>
</details>

Триада получает от AS 2042 только 100.10.8.0/22 — транзита нет:

<details>
<summary>R24 — show ip bgp</summary>
<pre><code>
R24#show ip bgp
BGP table version is 19, local router ID is 24.24.24.24

     Network          Next Hop            Metric LocPrf Weight Path
 *>  77.77.77.8/30    0.0.0.0                  0         32768 i
 *>i 77.77.77.12/30   50.0.26.1                0    100      0 i
 * i 100.10.8.0/22    50.0.26.1                0    100      0 2042 i
 *>                   77.77.77.10              0             0 2042 i
 *>i 100.100.100.0/30 50.0.23.1                0    100      0 101 i
 *                    111.111.111.5                          0 301 101 i
 *>i 100.100.100.4/30 50.0.23.1                0    100      0 101 i
 *                    111.111.111.5                          0 301 101 i
 *>  110.110.110.0/30 111.111.111.5            0             0 301 i
 *>i 111.110.35.8/30  50.0.25.1                0    100      0 i
 *>i 111.110.35.12/30 50.0.26.1                0    100      0 i
 *>  111.111.111.0/30 111.111.111.5            0             0 301 i
 r>  111.111.111.4/30 111.111.111.5            0             0 301 i
 * i 200.20.20.0/22   50.0.23.1                0    100      0 101 1001 i
 *>                   111.111.111.5                          0 301 1001 i
 *>i 210.110.35.0/30  50.0.25.1                0    100      0 i
</code></pre>
</details>

<details>
<summary>R26 — show ip bgp</summary>
<pre><code>
R26#show ip bgp
BGP table version is 26, local router ID is 26.26.26.26

     Network          Next Hop            Metric LocPrf Weight Path
 *>i 77.77.77.8/30    50.0.24.1                0    100      0 i
 *>  77.77.77.12/30   0.0.0.0                  0         32768 i
 * i 100.10.8.0/22    50.0.24.1                0    100      0 2042 i
 *>                   77.77.77.14              0             0 2042 i
 *>i 100.100.100.0/30 50.0.23.1                0    100      0 101 i
 *>i 100.100.100.4/30 50.0.23.1                0    100      0 101 i
 *>i 110.110.110.0/30 50.0.24.1                0    100      0 301 i
 *>i 111.110.35.8/30  50.0.25.1                0    100      0 i
 *>  111.110.35.12/30 0.0.0.0                  0         32768 i
 *>i 111.111.111.0/30 50.0.24.1                0    100      0 301 i
 *>i 111.111.111.4/30 50.0.24.1                0    100      0 301 i
 * i 200.20.20.0/22   50.0.23.1                0    100      0 101 1001 i
 *>i                  50.0.24.1                0    100      0 301 1001 i
 *>i 210.110.35.0/30  50.0.25.1                0    100      0 i
</code></pre>
</details>

---

## Киторн → только маршрут по умолчанию в Москву

Prefix-list `ISP` на R22 разрешает на выход в AS 1001 только маршрут по умолчанию и 100.10.8.0/22. `default-originate` генерирует дефолт даже при отсутствии 0.0.0.0/0 в таблице маршрутизации R22.

<details>
<summary>R22 (Киторн, AS 101) — настройка BGP</summary>
<pre><code>
enable
configure terminal
ip prefix-list ISP seq 5 permit 0.0.0.0/0
ip prefix-list ISP seq 10 permit 100.10.8.0/22
ip prefix-list ISP seq 20 deny 0.0.0.0/0 le 32

route-map DEFAULT permit 10
 match ip address prefix-list ISP

router bgp 101
 bgp log-neighbor-changes
 network 100.100.100.0 mask 255.255.255.252
 network 100.100.100.4 mask 255.255.255.252
 neighbor 100.100.100.1 remote-as 1001
 neighbor 100.100.100.1 default-originate
 neighbor 100.100.100.1 route-map DEFAULT out
 neighbor 100.100.100.6 remote-as 520
 neighbor 110.110.110.2 remote-as 301
end
copy running-config startup-config
</code></pre>
</details>

R14 получает от Киторн только маршрут по умолчанию:

<details>
<summary>R14 — show ip bgp</summary>
<pre><code>
R14#show ip bgp
BGP table version is 25, local router ID is 14.14.14.14

     Network          Next Hop            Metric LocPrf Weight Path
 r>  0.0.0.0          100.100.100.2                          0 101 i
 *>i 77.77.77.8/30    1.1.1.15                 0    150      0 301 520 i
 *>i 77.77.77.12/30   1.1.1.15                 0    150      0 301 520 i
 *>i 100.10.8.0/22    1.1.1.15                 0    150      0 301 520 2042 i
 *>i 110.110.110.0/30 1.1.1.15                 0    150      0 301 i
 *>i 111.110.35.8/30  1.1.1.15                 0    150      0 301 520 i
 *>i 111.110.35.12/30 1.1.1.15                 0    150      0 301 520 i
 *>i 111.111.111.0/30 1.1.1.15                 0    150      0 301 i
 *>i 111.111.111.4/30 1.1.1.15                 0    150      0 301 i
 * i 200.20.20.0/22   1.1.1.15                 0    100      0 i
 *>                   0.0.0.0                  0         32768 i
 *>i 210.110.35.0/30  1.1.1.15                 0    150      0 301 520 i
</code></pre>
</details>

---

## Ламас → маршрут по умолчанию + префикс С.-Петербурга в Москву

R21 использует тот же подход с prefix-list `ISP` — разрешает на выход в AS 1001 только 0.0.0.0/0 и 100.10.8.0/22.

<details>
<summary>R21 (Ламас, AS 301) — настройка BGP</summary>
<pre><code>
enable
configure terminal
ip prefix-list ISP seq 5 permit 0.0.0.0/0
ip prefix-list ISP seq 10 permit 100.10.8.0/22
ip prefix-list ISP seq 15 deny 0.0.0.0/0 le 32

route-map DEFAULT permit 10
 match ip address prefix-list ISP

router bgp 301
 bgp log-neighbor-changes
 network 110.110.110.0 mask 255.255.255.252
 network 111.111.111.0 mask 255.255.255.252
 network 111.111.111.4 mask 255.255.255.252
 neighbor 110.110.110.1 remote-as 101
 neighbor 111.111.111.1 remote-as 1001
 neighbor 111.111.111.1 route-map DEFAULT out
 neighbor 111.111.111.6 remote-as 520
end
copy running-config startup-config
</code></pre>
</details>

R15 получает 100.10.8.0/22 от Ламас (LP=150, предпочтительный); дефолт приходит от Киторн через iBGP от R14:

<details>
<summary>R15 / R14 — show ip bgp</summary>
<pre><code>
R15#show ip bgp
BGP table version is 48, local router ID is 15.15.15.15

     Network          Next Hop            Metric LocPrf Weight Path
 r>i 0.0.0.0          1.1.1.14                 0    100      0 101 i
 *>  100.10.8.0/22    111.111.111.2                 150      0 301 520 2042 i
 * i 200.20.20.0/22   1.1.1.14                 0    100      0 i
 *>                   0.0.0.0                  0         32768 i

R14#show ip bgp
BGP table version is 53, local router ID is 14.14.14.14

     Network          Next Hop            Metric LocPrf Weight Path
 r>  0.0.0.0          100.100.100.2                          0 101 i
 *   100.10.8.0/22    100.100.100.2                          0 101 520 2042 i
 *>i                  1.1.1.15                 0    150      0 301 520 2042 i
 * i 200.20.20.0/22   1.1.1.14                 0    100      0 i
 *>                   0.0.0.0                  0         32768 i
</code></pre>
</details>

---

## Проверка полной IP-связности

<details>
<summary>R14 — ping до всех удалённых офисов</summary>
<pre><code>
R14#ping 77.77.77.10 source e0/2
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/2 ms

R14#ping 77.77.77.14 source e0/2
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/2 ms

R14#ping 210.110.35.2 source e0/2
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/2 ms

R14#ping 111.110.35.10 source e0/2
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/2 ms

R14#ping 111.110.35.14 source e0/2
!!!!!  Success rate is 100 percent (5/5), round-trip min/avg/max = 1/1/1 ms
</code></pre>
</details>

---

## Полные конфигурации роутеров

<details>
<summary>R14 (AS 1001) — изменения лаб. 13</summary>
<pre><code>
enable
configure terminal
interface Loopback14
 ip address 200.20.20.14 255.255.252.0

ip as-path access-list 1 permit ^$
ip as-path access-list 1 deny .*

router bgp 1001
 bgp router-id 14.14.14.14
 bgp log-neighbor-changes
 network 200.20.20.0 mask 255.255.252.0
 neighbor MSK peer-group
 neighbor MSK remote-as 1001
 neighbor MSK update-source Loopback0
 neighbor MSK next-hop-self
 neighbor 1.1.1.15 peer-group MSK
 neighbor 100.100.100.2 remote-as 101
 neighbor 100.100.100.2 filter-list 1 out
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R15 (AS 1001) — изменения лаб. 13</summary>
<pre><code>
enable
configure terminal
interface Loopback15
 ip address 200.20.20.15 255.255.252.0

ip as-path access-list 1 permit ^$
ip as-path access-list 1 deny .*

router bgp 1001
 bgp router-id 15.15.15.15
 bgp log-neighbor-changes
 network 200.20.20.0 mask 255.255.252.0
 neighbor 1.1.1.14 remote-as 1001
 neighbor 1.1.1.14 update-source Loopback0
 neighbor 1.1.1.14 next-hop-self
 neighbor 111.111.111.2 remote-as 301
 neighbor 111.111.111.2 route-map LP in
 neighbor 111.111.111.2 filter-list 1 out

route-map LP permit 10
 set local-preference 150
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R18 — Санкт-Петербург (AS 2042) — изменения лаб. 13</summary>
<pre><code>
enable
configure terminal
interface Loopback18
 ip address 100.10.8.18 255.255.252.0

ip as-path access-list 1 permit ^$
ip as-path access-list 1 deny .*

ip prefix-list DEFAULT seq 15 permit 100.10.8.0/22 le 32
ip prefix-list DEFAULT seq 20 deny 0.0.0.0/0 le 32

route-map FILTER permit 10
 match ip address prefix-list DEFAULT

router bgp 2042
 template peer-policy TRIADA_POLICY
  route-map FILTER out
  filter-list 1 out
 exit-peer-policy
 !
 template peer-session TRIADA
  remote-as 520
 exit-peer-session
 !
 bgp router-id 18.18.18.18
 bgp log-neighbor-changes
 network 100.10.8.0 mask 255.255.252.0
 neighbor SPB peer-group
 neighbor SPB remote-as 2042
 neighbor SPB update-source Loopback0
 neighbor SPB next-hop-self
 neighbor 1.1.2.16 peer-group SPB
 neighbor 1.1.2.17 peer-group SPB
 neighbor 1.1.2.32 peer-group SPB
 neighbor 77.77.77.9 inherit peer-session TRIADA
 neighbor 77.77.77.9 inherit peer-policy TRIADA_POLICY
 neighbor 77.77.77.13 inherit peer-session TRIADA
 neighbor 77.77.77.13 inherit peer-policy TRIADA_POLICY
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R22 — Киторн (AS 101) — изменения лаб. 13</summary>
<pre><code>
enable
configure terminal
ip prefix-list ISP seq 5 permit 0.0.0.0/0
ip prefix-list ISP seq 10 permit 100.10.8.0/22
ip prefix-list ISP seq 20 deny 0.0.0.0/0 le 32

route-map DEFAULT permit 10
 match ip address prefix-list ISP

router bgp 101
 bgp log-neighbor-changes
 network 100.100.100.0 mask 255.255.255.252
 network 100.100.100.4 mask 255.255.255.252
 neighbor 100.100.100.1 remote-as 1001
 neighbor 100.100.100.1 default-originate
 neighbor 100.100.100.1 route-map DEFAULT out
 neighbor 100.100.100.6 remote-as 520
 neighbor 110.110.110.2 remote-as 301
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>R21 — Ламас (AS 301) — изменения лаб. 13</summary>
<pre><code>
enable
configure terminal
ip prefix-list ISP seq 5 permit 0.0.0.0/0
ip prefix-list ISP seq 10 permit 100.10.8.0/22
ip prefix-list ISP seq 15 deny 0.0.0.0/0 le 32

route-map DEFAULT permit 10
 match ip address prefix-list ISP

router bgp 301
 bgp log-neighbor-changes
 network 110.110.110.0 mask 255.255.255.252
 network 111.111.111.0 mask 255.255.255.252
 network 111.111.111.4 mask 255.255.255.252
 neighbor 110.110.110.1 remote-as 101
 neighbor 111.111.111.1 remote-as 1001
 neighbor 111.111.111.1 route-map DEFAULT out
 neighbor 111.111.111.6 remote-as 520
end
copy running-config startup-config
</code></pre>
</details>

---

*Network Engineer Course | Lab 13*
