---
title: "Network Engineer — 17. Corporate Office Network"
date: 2026-01-09
description: "Проектирование и настройка корпоративной сети по трёхуровневой иерархической модели Cisco с использованием OSPF, HSRP, STP, DHCP, PAT и средств защиты L2"
tags: ["Networking", "OSPF", "HSRP", "STP", "DHCP", "NAT", "Cisco", "OTUS"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-17-project/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Организация сети офиса

![](/img/neteng/17/Corporate.png)

В этом файле укажу настроенные конфигурации устройств, а темы как защита сети, почему настраивал так или иначе буду разбивать на более мелкие файлы, для удобства восприятия.

## Разделы

1. [Адресация сети](#1)
2. [OSPF и проверка связности](#2)
3. [STP, HSRP](#3)
4. [DHCP и защита L2](#4)
5. [ISP, PAT, FTP, NTP](#5)

---

## <a name="1">Адресация сети предприятия</a>

Из частного диапазона адресов была выбрана **172.16.0.0/16** и **10.0.0.0/8**, чтобы избежать пересечения сетей, когда будем в будущем настраивать удалённую работу сотрудникам предприятия.

При построении модели предприятия было решено строить 3-уровневую иерархическую модель, предложенную компанией Cisco: **Enterprise Campus Architecture**. Планируется, что 80% трафика будет задействовано внутри предприятия и 20% — внешний.

**Access Layer** — подразумевает, что на 1 устройство ляжет не более 5% от общего трафика всего предприятия в среднем.

**Distribution Layer** — подразумевает, что на 1 устройство ляжет не более 20% от общего трафика всего предприятия в среднем.

**Core Layer** — подразумевает, что на 1 устройство ляжет не более 80% от общего трафика всего предприятия в среднем (может быть и до 100% — это нормально).

Трафик поделён на 9 VLAN-ов:

```
2    ENGINEER
3    ACCOUNTING
4    LAWYER
5    SKLAD
6    PROVISION
7    IT
20   MANAGEMENT
21   MANAGEMENT
```

VLAN 20 MANAGEMENT был добавлен при развёртывании Windows Server в 3-м блоке Distribution. Всю сеть предприятия можно поделить на **3 блока** Distribution, объединённых иерархически:

*Блок 1*: D-SW1 и D-SW2

*Блок 2*: D-SW3 и D-SW4

*Блок 3*: FarmDistSW1 и FarmDistSW2

Всё что ниже этих устройств — L2, всё что выше — L3.

---

### <a name="3">STP, HSRP</a>

Для первых 2-х блоков и перехода в L3 использовался протокол резервирования первого перехода — **HSRP**. Первая проблема — STP, а точнее PVST, который строит дерево за каждый VLAN. STP блокирует порты, и вследствие чего трафик идёт через Access коммутатор, нарушая идеологию иерархического построения сети.

За первый блок D-SW1 и D-SW2 у нас 3 домена трафика: VLAN 2, 3, 20. Будет 3 STP дерева, которые должны строиться согласно иерархической идеологии — вручную прописываем Root Primary и Root Secondary.

![](/img/neteng/17/DistributionBlock1.png)

Аналогичная ситуация во 2-м блоке, где уже 5 STP деревьев нужно построить.

![](/img/neteng/17/DistributionBlock2.png)

Пример на **D-SW1**:

<details>
<summary>D-SW1 — приоритеты STP + HSRP + Loopback</summary>
<pre><code>
enable
configure terminal
spanning-tree vlan 2,20 priority 24576
spanning-tree vlan 3 priority 28672

interface Vlan2
 ip address 172.16.2.251 255.255.255.0
 ip helper-address 5.5.5.11
 standby 0 ip 172.16.2.1
 standby 0 priority 150
 standby 0 preempt

interface Vlan3
 ip address 172.16.3.251 255.255.255.0
 ip helper-address 5.5.5.11
 standby 0 ip 172.16.3.1
 standby 0 preempt

interface Loopback0
 ip address 5.5.5.1 255.255.255.255
end
copy running-config startup-config
</code></pre>
</details>

Аналогичная настройка присутствует на остальных L3 Switch уровня Distribution.

---

## <a name="2">OSPF и проверка связности</a>

На каждом интерфейсе Router или Switch L3 прописан IP-адрес и настроен протокол динамической маршрутизации OSPF.

<details>
<summary>D-SW1 — настройка OSPF</summary>
<pre><code>
enable
configure terminal
router ospf 1
 router-id 1.1.1.1
 network 5.5.5.1 0.0.0.0 area 0
 network 10.0.1.0 0.0.0.3 area 0
 network 10.0.2.0 0.0.0.3 area 0
 network 172.16.2.0 0.0.0.255 area 0
 network 172.16.3.0 0.0.0.255 area 0
 network 172.16.20.0 0.0.0.255 area 0

interface Ethernet1/2
 no switchport
 ip address 10.0.1.1 255.255.255.252
 ip ospf dead-interval 20
 duplex auto

interface Ethernet1/3
 no switchport
 ip address 10.0.2.1 255.255.255.252
 ip ospf dead-interval 20
 duplex auto
end
copy running-config startup-config
</code></pre>
</details>

На этом этапе было проведено тестирование оборудования на отказоустойчивость и скорость сходимости в случае сбоя.

---

## <a name="4">DHCP и защита L2</a>

![](/img/neteng/17/Corporate.png)

### DHCP

<details>
<summary>DHCP-сервер — исключения + пулы (все VLAN)</summary>
<pre><code>
enable
configure terminal
ip dhcp excluded-address 172.16.2.1
ip dhcp excluded-address 172.16.3.1
ip dhcp excluded-address 172.16.4.1
ip dhcp excluded-address 172.16.5.1
ip dhcp excluded-address 172.16.6.1
ip dhcp excluded-address 172.16.7.1
ip dhcp excluded-address 172.16.20.1 172.16.20.5
ip dhcp excluded-address 172.16.21.1
ip dhcp excluded-address 172.16.21.5 172.16.21.8
ip dhcp excluded-address 172.16.2.251 172.16.2.252
ip dhcp excluded-address 172.16.3.251 172.16.3.252
ip dhcp excluded-address 172.16.3.253 172.16.3.254
ip dhcp excluded-address 172.16.4.253 172.16.4.254
ip dhcp excluded-address 172.16.5.253 172.16.5.254
ip dhcp excluded-address 172.16.6.253 172.16.6.254
ip dhcp excluded-address 172.16.7.253 172.16.7.254

ip dhcp pool VLAN2
 network 172.16.2.0 255.255.255.0
 default-router 172.16.2.1
 dns-server 192.168.1.1

ip dhcp pool VLAN3
 network 172.16.3.0 255.255.255.0
 default-router 172.16.3.1
 dns-server 192.168.1.1

ip dhcp pool VLAN4
 network 172.16.4.0 255.255.255.0
 default-router 172.16.4.1
 dns-server 192.168.1.1

ip dhcp pool VLAN5
 network 172.16.5.0 255.255.255.0
 default-router 172.16.5.1
 dns-server 192.168.1.1

ip dhcp pool VLAN6
 network 172.16.6.0 255.255.255.0
 default-router 172.16.6.1
 dns-server 192.168.1.1

ip dhcp pool VLAN7
 network 172.16.7.0 255.255.255.0
 default-router 172.16.7.1
 dns-server 192.168.1.1
end
copy running-config startup-config
</code></pre>
</details>

<details>
<summary>VPCS — проверка получения адреса по DHCP</summary>
<pre><code>
VPCS> ip dhcp
DORA IP 172.16.2.2/24 GW 172.16.2.1

VPCS> show ip
NAME        : VPCS[1]
IP/MASK     : 172.16.2.2/24
GATEWAY     : 172.16.2.1
DNS         : 192.168.1.1
DHCP SERVER : 10.0.19.1
DHCP LEASE  : 86394, 86400/43200/75600
MAC         : 00:50:79:66:68:1d
MTU         : 1500
</code></pre>
</details>

Настройка средств защиты коммутируемой среды:

1. **Port-security**
2. **~~Storm Control~~**
3. **DHCP Snooping**
4. **~~IP Source Guard~~**
5. **Dynamic ARP Inspection**

От некоторых технологий пришлось отказаться по причине их неподдержки в данной прошивке.

### Port-security

Функция коммутатора, позволяющая ограничить MAC-адреса, которым разрешено передавать данные через порт. Основная защита от атаки переполнения MAC-таблицы. Sticky не используется — на каждый порт ограничено 2 MAC-адреса, статический режим достаточен.

<details>
<summary>AccSW1 — port-security на access-портах</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/2
 switchport access vlan 2
 switchport mode access
 switchport port-security maximum 2
 switchport port-security

interface Ethernet0/3
 switchport access vlan 2
 switchport mode access
 switchport port-security maximum 2
 switchport port-security
end
copy running-config startup-config
</code></pre>
</details>

Настраивается **только на access-портах** коммутаторов уровня доступа.

### ~~Storm Control~~

Защита от широковещательного шторма — срезает трафик при превышении порогового уровня нагрузки. Настраивается на всех портах. К сожалению, данная технология не поддерживается на этих образах.

### DHCP Snooping

Защита от атак с использованием DHCP. Различает доверенные (в сторону сервера) и недоверенные (клиентские) порты.

<details>
<summary>AccSW1 — DHCP Snooping</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0
 ip dhcp snooping trust

interface Ethernet0/1
 ip dhcp snooping trust

ip dhcp snooping
ip dhcp snooping vlan 2
no ip dhcp snooping information option
ip dhcp relay information trust-all

interface Ethernet0/2
 ip dhcp snooping limit rate 10

interface Ethernet0/3
 ip dhcp snooping limit rate 10
end
copy running-config startup-config
</code></pre>
</details>

`no ip dhcp snooping information option` убирает option 82, которую snooping добавляет к DHCP Discover — без этого кадры сбрасываются на уровне Distribution.

### ~~IP Source Guard~~

Ограничивает IP-трафик на L2 интерфейсах на основе таблицы привязок DHCP snooping. Защита от IP-spoofing.

`AccSW1(config-if)# ip verify source port-security`

После ввода этой команды трафик переставал ходить, troubleshooting результата не дал — технология не используется.

### Dynamic ARP Inspection

Защита от ARP-spoofing атак.

<details>
<summary>AccSW1 — Dynamic ARP Inspection</summary>
<pre><code>
enable
configure terminal
ip arp inspection vlan 2

interface Ethernet0/0
 ip arp inspection trust

interface Ethernet0/1
 ip arp inspection trust

interface Ethernet0/2
 ip arp inspection limit rate 2

interface Ethernet0/3
 ip arp inspection limit rate 2
end
copy running-config startup-config
</code></pre>
</details>

---

## <a name="5">FTP, AAA server (Tacacs+), 3-й блок Distribution, ISP, PAT</a>

![](/img/neteng/17/DistributionBlock3.png)

Выход в интернет реализован через 3-й блок Distribution, который выходит к Edge-роутерам. Edge-роутеры реализуют механизм PAT для преобразования частных адресов в один публичный. Для резервирования подключаемся к провайдеру по схеме dual homed.

### PAT

<details>
<summary>E-R1 — настройка PAT</summary>
<pre><code>
enable
configure terminal
interface Ethernet0/0
 ip address 10.0.12.2 255.255.255.252
 ip nat inside

interface Ethernet0/1
 ip address 10.0.13.2 255.255.255.252
 ip nat inside

interface Ethernet0/2
 ip address 212.22.48.6 255.255.255.252
 ip nat outside

ip nat inside source list 1 interface Ethernet0/2 overload
ip route 0.0.0.0 0.0.0.0 212.22.48.5

access-list 1 permit 172.16.0.0 0.0.15.255
access-list 1 permit 172.20.20.0 0.0.0.255
end
copy running-config startup-config
</code></pre>
</details>

Windows Server 2012 с FTP-сервером развёрнут в 3-м блоке с 2-мя сетевыми адаптерами типа «мост» для резервирования через HSRP.

```
interface Vlan20
 ip address 172.20.20.251 255.255.255.0
 standby 1 ip 172.20.20.1
 standby 1 priority 150
 standby 1 preempt

interface Ethernet1/3
 switchport access vlan 20
 switchport mode access
```

### LACP

EtherChannel настроен на каждом блоке Distribution.

<details>
<summary>D-SW4 — LACP EtherChannel конфигурация + проверка</summary>
<pre><code>
enable
configure terminal
interface Port-channel1
 switchport trunk encapsulation dot1q
 switchport mode trunk

interface Ethernet1/0
 switchport trunk encapsulation dot1q
 switchport mode trunk
 channel-group 1 mode active

interface Ethernet1/1
 switchport trunk encapsulation dot1q
 switchport mode trunk
 channel-group 1 mode active

port-channel load-balance src-dst-mac

D-SW4#show etherchannel summary
Group  Port-channel  Protocol    Ports
------+-------------+-----------+-----------------------------------------------
1      Po1(SU)         LACP      Et1/0(P)    Et1/1(P)
end
copy running-config startup-config
</code></pre>
</details>

### FTP

Автоматическое архивирование конфигураций на FTP-сервер на всех устройствах:

**login**: admin | **password**: cisco

```
archive
 path ftp://admin:cisco@172.20.20.5/FarmDistSW1.txt
 write-memory
 time-period 360
```

### NTP

На Edge-роутерах (NTP-серверы):

```
ntp source Loopback0
ntp master 5
ntp peer 5.5.5.8
ntp server ntp3.stratum2.ru
ntp server 1.ru.pool.ntp.org prefer
```

На клиентах:

```
ntp update-calendar
ntp server 5.5.5.8
ntp server 5.5.5.7 prefer
```

---

*Network Engineer Course | Lab 17*
