---
title: "Network Engineer — 06. EIGRP for IPv4 (Advanced Features)"
date: 2025-10-09
description: "Лабораторная работа: расширенные функции EIGRP — автосуммаризация, перераспределение статики, таймеры hello/hold, процент пропускной способности"
tags: ["Networking", "EIGRP", "Routing", "Cisco", "OTUS"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-06-eigrp-advanced/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Лабораторная работа: Настройка расширенных функций EIGRP для IPv4

## Топология

![EIGRP advanced topology](/img/neteng/06/2.png)

### Таблица адресации

| Устройство | Интерфейс    | IP-адрес      | Маска подсети   | Шлюз по умолчанию |
| ---------- | ------------ | ------------- | --------------- | ------------------ |
| R1         | G0/0         | 192.168.1.1   | 255.255.255.0   | —                  |
|            | S0/0/0 (DCE) | 192.168.12.1  | 255.255.255.252 | —                  |
|            | S0/0/1       | 192.168.13.1  | 255.255.255.252 | —                  |
|            | Lo1          | 192.168.11.1  | 255.255.255.252 | —                  |
|            | Lo5          | 192.168.11.5  | 255.255.255.252 | —                  |
|            | Lo9          | 192.168.11.9  | 255.255.255.252 | —                  |
|            | Lo13         | 192.168.11.13 | 255.255.255.252 | —                  |
| R2         | G0/0         | 192.168.2.1   | 255.255.255.0   | —                  |
|            | S0/0/0       | 192.168.12.2  | 255.255.255.252 | —                  |
|            | S0/0/1 (DCE) | 192.168.23.1  | 255.255.255.252 | —                  |
|            | Lo1          | 192.168.22.1  | 255.255.255.252 | —                  |
| R3         | G0/0         | 192.168.3.1   | 255.255.255.0   | —                  |
|            | S0/0/0 (DCE) | 192.168.13.2  | 255.255.255.252 | —                  |
|            | S0/0/1       | 192.168.23.2  | 255.255.255.252 | —                  |
|            | Lo1          | 192.168.33.1  | 255.255.255.252 | —                  |
|            | Lo5          | 192.168.33.5  | 255.255.255.252 | —                  |
|            | Lo9          | 192.168.33.9  | 255.255.255.252 | —                  |
|            | Lo13         | 192.168.33.13 | 255.255.255.252 | —                  |
| PC-A       | NIC          | 192.168.1.3   | 255.255.255.0   | 192.168.1.1        |
| PC-B       | NIC          | 192.168.2.3   | 255.255.255.0   | 192.168.2.1        |
| PC-C       | NIC          | 192.168.3.3   | 255.255.255.0   | 192.168.3.1        |

## Цели

**Часть 1. Создать сеть и настроить основные параметры устройств**

**Часть 2. Настроить EIGRP и проверить подключение**

**Часть 3. Настроить EIGRP для автоматического объединения**

**Часть 4. Настроить и распространить статический маршрут по умолчанию**

**Часть 5. Выполнить точную настройку EIGRP**

- Настроить процент использования пропускной способности для EIGRP.
- Настроить интервал отправки пакетов приветствия (hello) и таймер удержания.

## Создание сети и настройка основных параметров устройств

R1

```
Enable
configure terminal
hostname R1

interface serial 0/0
ip address 192.168.12.1 255.255.255.252
no shutdown
interface serial 1/0
ip address 192.168.13.1 255.255.255.252
no shutdown
interface gi2/0
ip address 192.168.1.1 255.255.255.0
no shutdown

line console 0
exec-timeout 0 0
exit
no ip domain-lookup
enable secret class
line vty 0 15
logging synchronous
password cisco
login
exit

do copy run start
[Enter]
```

R2

```
Enable
configure terminal
hostname R2

interface serial 0/0
ip address 192.168.12.2 255.255.255.252
no shutdown
interface serial 1/0
ip address 192.168.23.1 255.255.255.252
no shutdown
interface gi2/0
ip address 192.168.2.1 255.255.255.0
no shutdown

line console 0
exec-timeout 0 0
exit
no ip domain-lookup
enable secret class
line vty 0 15
logging synchronous
password cisco
login
exit

do copy run start
[Enter]
```

R3

```
Enable
configure terminal
hostname R3

interface serial 0/0
ip address 192.168.13.2 255.255.255.252
no shutdown
interface serial 1/0
ip address 192.168.23.2 255.255.255.252
no shutdown
interface gi2/0
ip address 192.168.3.1 255.255.255.0
no shutdown

line console 0
exec-timeout 0 0
exit
no ip domain-lookup
enable secret class
line vty 0 15
logging synchronous
password cisco
login
exit

do copy run start
[Enter]
```

## Настройте EIGRP и проверьте подключение

Настройте на маршрутизаторе R1 маршрутизацию EIGRP с номером AS 1 для всех сетей с прямым подключением:

```
router eigrp 1
network 192.168.12.1 0.0.0.3
network 192.168.13.1 0.0.0.3
network 192.168.1.1 0.0.0.255
```

Для интерфейса локальной сети маршрутизатора R1 отключите передачу пакетов приветствия EIGRP:

```
passive-interface gigabitEthernet 2/0
```

Задайте пропускную способность на R1: S0/0/0 = 1024 Кбит/с, S0/0/1 = 64 Кбит/с. Примечание: команда `bandwidth` влияет только на вычисление метрики EIGRP, но не на реальную скорость канала.

R1

```
interface serial 0/0 
bandwidth 1024
interface serial 1/0
bandwidth 64
```

Настройте R2 (EIGRP AS 1, пассивный LAN, пропускная способность S0/0/0 = 1024 Кбит/с):

R2

```
router eigrp 1
network 192.168.2.1 0.0.0.255
network 192.168.12.2 0.0.0.3
network 192.168.23.1 0.0.0.3
passive-interface gigabitEthernet 2/0
interface serial 0/0
bandwidth 1024
```

Настройте R3 (EIGRP AS 1, пассивный LAN, пропускная способность S0/0/0 = 64 Кбит/с):

```
router eigrp 1
network 192.168.3.1 0.0.0.255
network 192.168.13.2 0.0.0.3
network 192.168.23.2 0.0.0.3
passive-interface gigabitEthernet 2/0
interface serial 0/0
bandwidth 64
```

### Проверьте связь

С PC-A:

```
C:\>ping 192.168.3.3

Pinging 192.168.3.3 with 32 bytes of data:

Reply from 192.168.3.3: bytes=32 time=2ms TTL=125
Reply from 192.168.3.3: bytes=32 time=2ms TTL=125
Reply from 192.168.3.3: bytes=32 time=2ms TTL=125
Reply from 192.168.3.3: bytes=32 time=2ms TTL=125

Ping statistics for 192.168.3.3:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 2ms, Maximum = 2ms, Average = 2ms
```

## Настройте EIGRP для автоматического объединения

### Проверьте значение автосуммаризации по умолчанию

Выполните команду `show ip protocols` на R1. Как по умолчанию настроено автоматическое объединение в EIGRP?

```
R1#show ip protocols 

Routing Protocol is "eigrp  1 " 
  Outgoing update filter list for all interfaces is not set 
  Incoming update filter list for all interfaces is not set 
  Default networks flagged in outgoing updates  
  Default networks accepted from incoming updates 
  EIGRP metric weight K1=1, K2=0, K3=1, K4=0, K5=0
  EIGRP maximum hopcount 100
  EIGRP maximum metric variance 1
Redistributing: eigrp 1
  Automatic network summarization is in effect  
  Automatic address summarization: 
    192.168.12.0/24 for GigabitEthernet2/0, Serial1/0
      Summarizing with metric 3011840
    192.168.13.0/24 for GigabitEthernet2/0, Serial0/0
      Summarizing with metric 40512000
  Maximum path: 4
  Routing for Networks:  
     192.168.12.0/30
     192.168.13.0/30
     192.168.1.0
  Passive Interface(s): 
    GigabitEthernet2/0
  Routing Information Sources:  
    Gateway         Distance      Last Update 
    192.168.12.2    90            4397620    
    192.168.13.2    90            5983078    
  Distance: internal 90 external 170
```

Автоматическое объединение в EIGRP **включено** по умолчанию.

### Настройте loopback-адреса на R1

```
interface loopback1
ip address 192.168.11.1 255.255.255.252
interface loopback 5
ip address 192.168.11.5 255.255.255.252
interface loopback 9
ip address 192.168.11.9 252.255.255.252
interface loopback 13
ip address 192.168.11.13 255.255.255.252
```

### Добавьте инструкции network для EIGRP на R1

```
router eigrp 1
network 192.168.11.1 0.0.0.3
network 192.168.11.5 0.0.0.3
network 192.168.11.9 0.0.0.3
network 192.168.11.13 0.0.0.3
```

### Как loopback-сети представлены на R2?

На маршрутизаторе R2 выполните команду `show ip route eigrp`. Как сети loopback представлены в результатах?

```
R2(config-if)#do sh ip route eigrp
D    192.168.1.0/24 [90/3014400] via 192.168.12.1, 00:39:04, Serial0/0
D    192.168.3.0/24 [90/2172416] via 192.168.23.2, 00:12:37, Serial1/0
D    192.168.11.0/24 [90/3139840] via 192.168.12.1, 00:00:12, Serial0/0
     192.168.12.0/24 is variably subnetted, 2 subnets, 2 masks
D       192.168.12.0/24 is a summary, 00:39:05, Null0
D    192.168.13.0/24 [90/41024000] via 192.168.12.1, 00:14:19, Serial0/0
                     [90/41024000] via 192.168.23.2, 00:12:37, Serial1/0
     192.168.23.0/24 is variably subnetted, 2 subnets, 2 masks
D       192.168.23.0/24 is a summary, 00:12:40, Null0
```

Сработала автосуммаризация сетей loopback до 192.168.11.0/24.

### Отключите автосуммаризацию на R1 командой `no auto-summary`

*Примечание: автосуммаризация включена по умолчанию — предположительно, опечатка в руководстве к лабораторной.*

```
R1(config-router)#no auto-summary 
R1(config-router)#
%DUAL-5-NBRCHANGE: IP-EIGRP 1: Neighbor 192.168.12.2 (Serial0/0) resync: summary configured
%DUAL-5-NBRCHANGE: IP-EIGRP 1: Neighbor 192.168.13.2 (Serial1/0) resync: summary configured
```

Таблица маршрутизации на R2 после отключения автосуммаризации на R1:

```
R2(config)#do show ip route eigrp
D    192.168.1.0/24 [90/3014400] via 192.168.12.1, 00:00:29, Serial0/0
D    192.168.3.0/24 [90/2172416] via 192.168.23.2, 00:38:45, Serial1/0
     192.168.11.0/30 is subnetted, 3 subnets
D       192.168.11.0 [90/3139840] via 192.168.12.1, 00:00:29, Serial0/0
D       192.168.11.4 [90/3139840] via 192.168.12.1, 00:00:29, Serial0/0
D       192.168.11.12 [90/3139840] via 192.168.12.1, 00:00:29, Serial0/0
     192.168.12.0/24 is variably subnetted, 2 subnets, 2 masks
D       192.168.12.0/24 is a summary, 01:05:13, Null0
     192.168.13.0/24 is variably subnetted, 2 subnets, 2 masks
D       192.168.13.0/24 [90/41024000] via 192.168.23.2, 00:38:45, Serial1/0
D       192.168.13.0/30 [90/41024000] via 192.168.12.1, 00:00:29, Serial0/0
     192.168.23.0/24 is variably subnetted, 2 subnets, 2 masks
D       192.168.23.0/24 is a summary, 00:38:48, Null0
```

Добавьте loopback-интерфейсы и инструкции network для EIGRP на R3, затем отключите автосуммаризацию:

```
interface loopback 1
ip address 192.168.33.1 255.255.255.252
interface loopback 5 
ip address 192.168.33.5 255.255.255.252
interface loopback 9
ip address 192.168.33.9 255.255.255.252
interface loopback 13
ip address 192.168.33.13 255.255.255.252

router eigrp 1
network 192.168.33.1 0.0.0.3
network 192.168.33.5 0.0.0.3
network 192.168.33.9 0.0.0.3
network 192.168.33.13 0.0.0.3
```

## Настройте и распространите статический маршрут по умолчанию

Настройте loopback-интерфейс на R2 и перераспределите статический маршрут по умолчанию через EIGRP:

```
interface loopback1
ip address 192.168.22.1 255.255.255.252
```

```
R2(config)# ip route 0.0.0.0 0.0.0.0 Lo1
```

```
R2(config)# router eigrp 1
R2(config-router)# redistribute static
```

Проверьте с помощью `show ip protocols` на R2:

```
R2#show ip protocols

Routing Protocol is "eigrp  1 " 
  Outgoing update filter list for all interfaces is not set 
  Incoming update filter list for all interfaces is not set 
  Default networks flagged in outgoing updates  
  Default networks accepted from incoming updates 
  EIGRP metric weight K1=1, K2=0, K3=1, K4=0, K5=0
  EIGRP maximum hopcount 100
  EIGRP maximum metric variance 1
Redistributing: eigrp 1, static 
  ...
```

Проверьте маршрут по умолчанию на R1 командой `show ip route eigrp | include 0.0.0.0`:

Примечание: команда с фильтром `include` не работает в Packet Tracer, но без неё всё работает:

```
R1(config-router)#do show ip route eigrp
D    192.168.2.0/24 [90/3014400] via 192.168.12.2, 00:18:18, Serial0/0
D    192.168.3.0/24 [90/3526400] via 192.168.12.2, 00:13:13, Serial0/0
     ...
D*EX 0.0.0.0/0 [170/4291840] via 192.168.12.2, 00:02:08, Serial0/0
```

Маршрут отображается как внешний EIGRP (EX) с административной дистанцией = 170.

## Точная настройка EIGRP

### Настройте процент использования пропускной способности для EIGRP

Разрешите EIGRP использовать 75% пропускной способности на канале R1–R2:

```
R1(config)# interface s0/0
R1(config-if)# ip bandwidth-percent eigrp 1 75

R2(config)# interface s0/0
R2(config-if)# ip bandwidth-percent eigrp 1 75
```

Примечание: данная команда не реализована в Packet Tracer.

```
R1(config-router)#interface s0/0
R1(config-if)#ip bandwidth-percent eigrp 1 75
                 ^
% Invalid input detected at '^' marker.
```

### Настройте таймеры hello и hold-time для EIGRP

Проверьте текущие значения командой `show ip eigrp interfaces detail` (недоступна в PT):

```
EIGRP-IPv4 Interfaces for AS(1)
...
Hello-interval is 5, Hold-time is 15
...
Interface BW percentage is 75
```

Задайте hello-interval = 60 с и hold-time = 180 с на последовательных интерфейсах R1:

```
R1(config)# interface s0/0
R1(config-if)# ip hello-interval eigrp 1 60
R1(config-if)# ip hold-time eigrp 1 180
R1(config)# interface s1/0
R1(config-if)# ip hello-interval eigrp 1 60
R1(config-if)# ip hold-time eigrp 1 180
```

Повторить на R2/R3 не удалось — изменение hold-time не поддерживается в Packet Tracer.

## Вопросы для повторения

1. В чём заключаются преимущества объединения маршрутов?

Уменьшение размера таблицы маршрутизации. (Best practices рекомендуют отключать автосуммаризацию в большинстве случаев.)

2. Почему при настройке таймеров EIGRP значение времени удержания должно быть равным или больше интервала приветствия?

Маршрутизаторы не установят соседские отношения в противном случае. Пакеты hello проверяют доступность соседа; после истечения hold-time маршрутизатор считает соседа недоступным.
