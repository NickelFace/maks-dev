---
title: "Network Engineer — 06. EIGRP for IPv4 (базовая настройка)"
date: 2025-10-01
description: "Лабораторная работа: базовая настройка EIGRP для IPv4 — соседи, таблица топологии, настройка пропускной способности, пассивные интерфейсы."
tags: ["Networking", "EIGRP", "Routing", "Cisco"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-06-eigrp/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Лабораторная работа: Базовая настройка EIGRP для IPv4

### Топология

![EIGRP topology](/img/neteng/06/1.png)

### Таблица адресации

| Устройство | Интерфейс    | IP-адрес    | Маска подсети   | Шлюз по умолчанию |
| ---------- | ------------ | ----------- | --------------- | ------------------ |
| R1         | G0/0         | 192.168.1.1 | 255.255.255.0   | —                  |
|            | S0/0/0 (DCE) | 10.1.1.1    | 255.255.255.252 | —                  |
|            | S0/0/1       | 10.3.3.1    | 255.255.255.252 | —                  |
| R2         | G0/0         | 192.168.2.1 | 255.255.255.0   | —                  |
|            | S0/0/0       | 10.1.1.2    | 255.255.255.252 | —                  |
|            | S0/0/1 (DCE) | 10.2.2.2    | 255.255.255.252 | —                  |
| R3         | G0/0         | 192.168.3.1 | 255.255.255.0   | —                  |
|            | S0/0/0 (DCE) | 10.3.3.2    | 255.255.255.252 | —                  |
|            | S0/0/1       | 10.2.2.1    | 255.255.255.252 | —                  |
| PC-A       | NIC          | 192.168.1.3 | 255.255.255.0   | 192.168.1.1        |
| PC-B       | NIC          | 192.168.2.3 | 255.255.255.0   | 192.168.2.1        |
| PC-C       | NIC          | 192.168.3.3 | 255.255.255.0   | 192.168.3.1        |

### Цели

- **Часть 1.** Собрать сеть и проверить подключение
- **Часть 2.** Настроить маршрутизацию EIGRP
- **Часть 3.** Проверить маршрутизацию EIGRP
- **Часть 4.** Настроить пропускную способность и пассивные интерфейсы

---

### Часть 1 — Базовая настройка устройств

<details>
<summary>R1</summary>
<pre><code>
enable
configure terminal
hostname R1
interface Serial0/0
 ip address 10.1.1.1 255.255.255.252
 no shutdown
interface Serial1/0
 ip address 10.3.3.1 255.255.255.252
 no shutdown
interface GigabitEthernet2/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
no ip domain-lookup
enable secret class
line vty 0 15
 logging synchronous
 password cisco
 login
line con 0
 exec-timeout 0 0
 logging synchronous
banner motd "This is a secure system. Authorized Access Only!"
do copy run start
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R2</summary>
<pre><code>
enable
configure terminal
hostname R2
interface Serial0/0
 ip address 10.1.1.2 255.255.255.252
 no shutdown
interface Serial1/0
 ip address 10.2.2.2 255.255.255.252
 no shutdown
interface GigabitEthernet2/0
 ip address 192.168.2.1 255.255.255.0
 no shutdown
no ip domain-lookup
enable secret class
line vty 0 15
 logging synchronous
 password cisco
 login
line con 0
 exec-timeout 0 0
 logging synchronous
banner motd "This is a secure system. Authorized Access Only!"
do copy run start
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R3</summary>
<pre><code>
enable
configure terminal
hostname R3
interface Serial0/0
 ip address 10.3.3.2 255.255.255.252
 no shutdown
interface Serial1/0
 ip address 10.2.2.1 255.255.255.252
 no shutdown
interface GigabitEthernet2/0
 ip address 192.168.3.1 255.255.255.0
 no shutdown
no ip domain-lookup
enable secret class
line vty 0 15
 logging synchronous
 password cisco
 login
line con 0
 exec-timeout 0 0
 logging synchronous
banner motd "This is a secure system. Authorized Access Only!"
do copy run start
end
copy running-config startup-config
</code></pre>
</details>

---

### Часть 2 — Настройка маршрутизации EIGRP

Включите EIGRP AS 10 и объявите все напрямую подключённые сети:

<details>
<summary>R1</summary>
<pre><code>
enable
configure terminal
router eigrp 10
 network 10.1.1.0 0.0.0.3
 network 192.168.1.0 0.0.0.255
 network 10.3.3.0 0.0.0.3
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R2</summary>
<pre><code>
enable
configure terminal
router eigrp 10
 network 10.1.1.0 0.0.0.3
 network 192.168.2.0 0.0.0.255
 network 10.2.2.0 0.0.0.3
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R3</summary>
<pre><code>
enable
configure terminal
router eigrp 10
 network 10.2.2.0 0.0.0.3
 network 192.168.3.0 0.0.0.255
 network 10.3.3.0 0.0.0.3
end
copy running-config startup-config
</code></pre>
</details>

Шаблонные маски рекомендуются, так как IOS требует их для неклассовых подсетей. Маску можно опустить только при анонсировании классовой сети (например, `network 192.168.1.0` без маски).

---

### Часть 3 — Проверка маршрутизации EIGRP

**Таблица соседей:**

<details>
<summary>R1 — show ip eigrp neighbors</summary>
<pre><code>
enable
configure terminal
R1(config-router)#do show ip eigrp neighbors
IP-EIGRP neighbors for process 10
H   Address         Interface      Hold Uptime    SRTT   RTO   Q   Seq
                                   (sec)          (ms)        Cnt  Num
0   10.1.1.2        Se0/0          11   00:32:24  40     1000  0   9
1   10.3.3.2        Se1/0          11   00:32:11  40     1000  0   14
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R2 — show ip eigrp neighbors</summary>
<pre><code>
enable
configure terminal
R2(config-router)#do show ip eigrp neighbors
IP-EIGRP neighbors for process 10
H   Address         Interface      Hold Uptime    SRTT   RTO   Q   Seq
                                   (sec)          (ms)        Cnt  Num
0   10.1.1.1        Se0/0          10   00:34:17  40     1000  0   9
1   10.2.2.1        Se1/0          11   00:34:04  40     1000  0   13
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R3 — show ip eigrp neighbors</summary>
<pre><code>
enable
configure terminal
R3(config)#do show ip eigrp neighbor
IP-EIGRP neighbors for process 10
H   Address         Interface      Hold Uptime    SRTT   RTO   Q   Seq
                                   (sec)          (ms)        Cnt  Num
0   10.2.2.2        Se1/0          11   00:35:19  40     1000  0   10
1   10.3.3.1        Se0/0          13   00:35:18  40     1000  0   10
end
copy running-config startup-config
</code></pre>
</details>

**Таблица маршрутизации:**

<details>
<summary>R1 — show ip route eigrp</summary>
<pre><code>
enable
configure terminal
R1(config-router)#do show ip route eigrp
     10.0.0.0/8 is variably subnetted, 4 subnets, 2 masks
D       10.0.0.0/8 is a summary, 00:41:44, Null0
D       10.2.2.0/30 [90/21024000] via 10.1.1.2, 00:38:32, Serial0/0
                    [90/21024000] via 10.3.3.2, 00:38:19, Serial1/0
D    192.168.2.0/24 [90/20514560] via 10.1.1.2, 00:38:32, Serial0/0
D    192.168.3.0/24 [90/20514560] via 10.3.3.2, 00:38:19, Serial1/0
end
copy running-config startup-config
</code></pre>
</details>

R1 имеет два пути к 10.2.2.0/30, так как оба Serial0/0 и Serial1/0 имеют одинаковую пропускную способность по умолчанию (128 Кбит/с), что даёт одинаковые метрики.

**Таблица топологии:**

<details>
<summary>R1 — show ip eigrp topology</summary>
<pre><code>
R1#show ip eigrp topology
IP-EIGRP Topology Table for AS 10/ID(192.168.1.1)

Codes: P - Passive, A - Active, U - Update, Q - Query, R - Reply,
       r - Reply status

P 10.0.0.0/8, 1 successors, FD is 20512000
         via Summary (20512000/0), Null0
P 10.1.1.0/30, 1 successors, FD is 20512000
         via Connected, Serial0/0
P 10.2.2.0/30, 2 successors, FD is 21024000
         via 10.1.1.2 (21024000/20512000), Serial0/0
         via 10.3.3.2 (21024000/20512000), Serial1/0
P 10.3.3.0/30, 1 successors, FD is 20512000
         via Connected, Serial1/0
P 192.168.1.0/24, 1 successors, FD is 5120
         via Connected, GigabitEthernet2/0
P 192.168.2.0/24, 1 successors, FD is 20514560
         via 10.1.1.2 (20514560/5120), Serial0/0
P 192.168.3.0/24, 1 successors, FD is 20514560
         via 10.3.3.2 (20514560/5120), Serial1/0
</code></pre>
</details>

Возможных преемников нет, так как для этого требуется резервный путь без петель с AD < FD текущего преемника — в симметричной треугольной топологии такого пути не существует.

**Параметры протокола:**

<details>
<summary>R1 — show ip protocols</summary>
<pre><code>
R1#show ip protocols

Routing Protocol is "eigrp 10"
  Outgoing update filter list for all interfaces is not set
  Incoming update filter list for all interfaces is not set
  Default networks flagged in outgoing updates
  Default networks accepted from incoming updates
  EIGRP metric weight K1=1, K2=0, K3=1, K4=0, K5=0
  EIGRP maximum hopcount 100
  EIGRP maximum metric variance 1
Redistributing: eigrp 10
  Automatic network summarization is in effect
  Automatic address summarization:
    10.0.0.0/8 for GigabitEthernet2/0
      Summarizing with metric 20512000
  Maximum path: 4
  Routing for Networks:
     10.1.1.0/30
     192.168.1.0
     10.3.3.0/30
  Routing Information Sources:
    Gateway         Distance      Last Update
    10.1.1.2        90            3332124
    10.3.3.2        90            3345257
  Distance: internal 90 external 170
</code></pre>
</details>

Номер AS: **10** | Анонсируемые сети: 10.1.1.0/30, 10.3.3.0/30, 192.168.1.0 | AD внутренний: **90** | Максимум равностоимостных маршрутов: **4** (по умолчанию)

---

### Часть 4 — Пропускная способность и пассивные интерфейсы

Пропускная способность последовательного интерфейса по умолчанию — **128 Кбит/с**. Канал R1–R3 медленнее, чем R1–R2 и R2–R3, поэтому задаём пропускную способность для корректного расчёта метрики EIGRP:

<details>
<summary>R1 — show interface Serial0/0 (до изменения)</summary>
<pre><code>
R1#show interface serial 0/0
Serial0/0 is up, line protocol is up (connected)
  Hardware is HD64570
  Internet address is 10.1.1.1/30
  MTU 1500 bytes, BW 128 Kbit, DLY 20000 usec,
     reliability 255/255, txload 1/255, rxload 1/255
  Encapsulation HDLC, loopback not set, keepalive set (10 sec)
</code></pre>
</details>

Задаём пропускную способность: каналы R1–R2: 2000 Кбит/с, канал R1–R3: 64 Кбит/с:

<details>
<summary>R1</summary>
<pre><code>
enable
configure terminal
interface Serial0/0
 bandwidth 2000
interface Serial1/0
 bandwidth 64
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R2</summary>
<pre><code>
enable
configure terminal
interface Serial0/0
 bandwidth 2000
interface Serial1/0
 bandwidth 2000
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>R3</summary>
<pre><code>
enable
configure terminal
interface Serial0/0
 bandwidth 64
interface Serial1/0
 bandwidth 2000
end
copy running-config startup-config
</code></pre>
</details>

После изменения пропускной способности на R1 маршрут к 10.2.2.0/30 становится единственным — через R2 (медленный канал к R3 больше не является предпочтительным):

<details>
<summary>R1 — show ip route (после изменения пропускной способности)</summary>
<pre><code>
R1#show ip route
     10.0.0.0/8 is variably subnetted, 4 subnets, 2 masks
D       10.0.0.0/8 is a summary, 00:00:45, Null0
C       10.1.1.0/30 is directly connected, Serial0/0
D       10.2.2.0/30 [90/21024000] via 10.1.1.2, 00:00:42, Serial0/0
C       10.3.3.0/30 is directly connected, Serial1/0
C    192.168.1.0/24 is directly connected, GigabitEthernet2/0
D    192.168.2.0/24 [90/1794560] via 10.1.1.2, 00:00:42, Serial0/0
D    192.168.3.0/24 [90/21026560] via 10.1.1.2, 00:00:28, Serial0/0
</code></pre>
</details>

<details>
<summary>R1 — show interface Serial0/0 (после bandwidth 2000)</summary>
<pre><code>
R1#show interfaces serial 0/0
Serial0/0 is up, line protocol is up (connected)
  Hardware is HD64570
  Internet address is 10.1.1.1/30
  MTU 1500 bytes, BW 2000 Kbit, DLY 20000 usec,
     reliability 255/255, txload 1/255, rxload 1/255
</code></pre>
</details>

Настройте GigabitEthernet2/0 как пассивный на всех маршрутизаторах — LAN-интерфейсам не нужно отправлять hello-пакеты EIGRP, но подключённая сеть по-прежнему анонсируется:

```
router eigrp 10
 passive-interface GigabitEthernet2/0
```

Проверьте командой `show ip protocols` — пассивный интерфейс должен отображаться в выводе:

<details>
<summary>R1 — show ip protocols (с пассивным интерфейсом)</summary>
<pre><code>
R1#show ip protocols

Routing Protocol is "eigrp 10"
  EIGRP metric weight K1=1, K2=0, K3=1, K4=0, K5=0
  EIGRP maximum hopcount 100
  EIGRP maximum metric variance 1
Redistributing: eigrp 10
  Automatic network summarization is in effect
  Automatic address summarization:
    10.0.0.0/8 for GigabitEthernet2/0
      Summarizing with metric 1792000
  Maximum path: 4
  Routing for Networks:
     10.1.1.0/30
     192.168.1.0
     10.3.3.0/30
  Passive Interface(s):
    GigabitEthernet2/0
  Routing Information Sources:
    Gateway         Distance      Last Update
    10.1.1.2        90            7664182
    10.3.3.2        90            7680578
  Distance: internal 90 external 170
</code></pre>
</details>

---

### Контрольные вопросы

Преимущества EIGRP перед статической маршрутизацией: поддержка балансировки нагрузки с неравными метриками (`variance`), меньшие накладные расходы по сравнению с OSPF, возможный преемник для практически мгновенного переключения при отказе, суммаризация маршрутов в любой точке топологии.

---

*Network Engineer Course | Лабораторная работа 06*
