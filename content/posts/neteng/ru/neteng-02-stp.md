---
title: "Network Engineer — 02. STP"
date: 2025-08-12
description: "Лабораторная работа: построение коммутируемой сети с резервными каналами. Выбор корневого моста, стоимость порта, приоритет порта."
tags: ["Networking", "STP", "Spanning Tree", "Cisco"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-02-stp/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Лабораторная работа: Построение коммутируемой сети с резервными каналами

### Топология

![Topology](/img/neteng/02/Scheme.png)

### Таблица адресации

| Устройство | Интерфейс | IP-адрес    | Маска подсети |
| ---------- | --------- | ----------- | ------------- |
| S1         | VLAN 1    | 192.168.1.1 | 255.255.255.0 |
| S2         | VLAN 1    | 192.168.1.2 | 255.255.255.0 |
| S3         | VLAN 1    | 192.168.1.3 | 255.255.255.0 |

### Цели

- **Часть 1.** Соберите топологию и настройте базовые параметры устройств
- **Часть 2.** Выберите корневой мост
- **Часть 3.** Наблюдайте за выбором портов STP на основе стоимости порта
- **Часть 4.** Наблюдайте за выбором портов STP на основе приоритета порта

---

### Часть 1 — Базовая настройка устройств

1. Соберите топологию согласно схеме.

<details>
<summary>S1</summary>
<pre><code>
enable
conf t
hostname S1
no ip domain-lookup
enable secret class
line console 0
password cisco
login
logging synchronous
exit
line vty 0 4
password cisco
login
exit
banner motd "**This is a secure system. Authorized Access Only!**"
interface vlan 1
ip address 192.168.1.1 255.255.255.0
no shutdown
exit
do copy run start
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
no ip domain-lookup
enable secret class
line console 0
password cisco
login
logging synchronous
exit
line vty 0 4
password cisco
login
exit
banner motd "**This is a secure system. Authorized Access Only!**"
interface vlan 1
ip address 192.168.1.2 255.255.255.0
no shutdown
exit
do copy run start
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3</summary>
<pre><code>
enable
conf t
hostname S3
no ip domain-lookup
enable secret class
line console 0
password cisco
login
logging synchronous
exit
line vty 0 4
password cisco
login
exit
banner motd "**This is a secure system. Authorized Access Only!**"
interface vlan 1
ip address 192.168.1.3 255.255.255.0
no shutdown
exit
do copy run start
end
copy running-config startup-config
</code></pre>
</details>

2. Проверьте связность — отправьте ping со S1 на все коммутаторы:

```
ping 192.168.1.1
ping 192.168.1.2
ping 192.168.1.3
```

<details>
<summary>Вывод S1</summary>
<pre><code>
S1#ping 192.168.1.1
!!!!!
Success rate is 100 percent (5/5)
S1#ping 192.168.1.2
.!!!!
Success rate is 80 percent (4/5)
S1#ping 192.168.1.3
.!!!!
Success rate is 80 percent (4/5)
</code></pre>
</details>

---

### Часть 2 — Выбор корневого моста

Сначала отключите все порты, затем поднимите только Et0/0 и Et0/2 как транковые:

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
interface range Ethernet 0/0 - 3
shutdown
exit
interface range Ethernet 0/0, Ethernet 0/2
switchport trunk encapsulation dot1q
switchport mode trunk
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
interface range Ethernet 0/0 - 3
shutdown
exit
interface range Ethernet 0/0, Ethernet 0/2
switchport trunk encapsulation dot1q
switchport mode trunk
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
interface range Ethernet 0/0 - 3
shutdown
exit
interface range Ethernet 0/0, Ethernet 0/2
switchport trunk encapsulation dot1q
switchport mode trunk
no shutdown
end
copy running-config startup-config
</code></pre>
</details>

Проверьте состояние STP на каждом коммутаторе:

```
show spanning-tree
```

Коммутатор с **наименьшим Bridge ID** (приоритет + MAC-адрес) становится корневым мостом. При одинаковом приоритете по умолчанию (32768) побеждает коммутатор с наименьшим MAC-адресом. В данной лабораторной работе S1 имеет наименьший MAC и выбирается корневым.

<details>
<summary>S1 — корневой мост</summary>
<pre><code>
S1#show spanning-tree
VLAN0001
  Spanning tree enabled protocol ieee
  Root ID    Priority    32769
             Address     aabb.cc00.1100
             This bridge is the root
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec

  Bridge ID  Priority    32769  (priority 32768 sys-id-ext 1)
             Address     aabb.cc00.1100
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec
             Aging Time  300 sec

Interface           Role Sts Cost      Prio.Nbr Type
------------------- ---- --- --------- -------- --------------------------------
Et0/0               Desg FWD 100       128.1    Shr
Et0/2               Desg FWD 100       128.3    Shr
</code></pre>
</details>
<details>
<summary>S2 — некорневой, корневой порт Et0/0</summary>
<pre><code>
S2#show spanning-tree
VLAN0001
  Spanning tree enabled protocol ieee
  Root ID    Priority    32769
             Address     aabb.cc00.1100
             Cost        100
             Port        1 (Ethernet0/0)
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec

  Bridge ID  Priority    32769  (priority 32768 sys-id-ext 1)
             Address     aabb.cc00.2200
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec
             Aging Time  300 sec

Interface           Role Sts Cost      Prio.Nbr Type
------------------- ---- --- --------- -------- --------------------------------
Et0/0               Root FWD 100       128.1    Shr
Et0/2               Desg FWD 100       128.3    Shr
</code></pre>
</details>
<details>
<summary>S3 — некорневой, заблокированный порт Et0/0</summary>
<pre><code>
S3#show spanning-tree
VLAN0001
  Spanning tree enabled protocol ieee
  Root ID    Priority    32769
             Address     aabb.cc00.1100
             Cost        100
             Port        3 (Ethernet0/2)
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec

  Bridge ID  Priority    32769  (priority 32768 sys-id-ext 1)
             Address     aabb.cc00.3300
             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec
             Aging Time  300 sec

Interface           Role Sts Cost      Prio.Nbr Type
------------------- ---- --- --------- -------- --------------------------------
Et0/0               Altn BLK 100       128.1    Shr
Et0/2               Root FWD 100       128.3    Shr
</code></pre>
</details>

**Роли портов:**

- **Root** — лучший путь к корневому мосту (один на некорневой коммутатор)
- **Designated** — лучший порт сегмента для пересылки к корню (все порты корневого + один на сегмент)
- **Alternate** — заблокирован для предотвращения петель

Порт Et0/0 на S3 (в сторону S2) заблокирован, потому что оба коммутатора (S2 и S3) имеют одинаковую стоимость до корня (100). Но Bridge ID у S2 меньше, поэтому именно его порт Et0/2 становится назначенным (Designated), а Et0/0 на S3 переходит в Alternate (блокировка).

---

### Часть 3 — Выбор порта по стоимости

Путь с меньшей стоимостью до корня имеет приоритет. Стоимость по умолчанию для 10 Мбит/с — **100**.

На данный момент у S3 заблокирован Et0/0 (в сторону S2). Снизьте стоимость на корневом порту S3 (Et0/2) до **90** — это сделает путь S3 до корня дешевле, чем у S2:

<details>
<summary>S3</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/2
spanning-tree cost 90
end
copy running-config startup-config
</code></pre>
</details>

Теперь S3 достигает корня через Et0/2 со стоимостью **90**, тогда как S2 — со стоимостью **100**. На сегменте S2–S3 назначенным становится S3 — порт Et0/2 на S2 переходит в Alternate (блокировка).

<details>
<summary>S3 — после изменения стоимости</summary>
<pre><code>
S3#show spanning-tree
VLAN0001
  Root ID    Priority    32769
             Address     aabb.cc00.1100
             Cost        90
             Port        3 (Ethernet0/2)
...
Interface           Role Sts Cost      Prio.Nbr Type
------------------- ---- --- --------- -------- --------------------------------
Et0/0               Desg FWD 100       128.1    Shr
Et0/2               Root FWD 90        128.3    Shr
</code></pre>
</details>

![Топология после изменения стоимости](/img/neteng/02/44res_cost.png)

Верните стоимость к значению по умолчанию:

<details>
<summary>S3</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/2
no spanning-tree cost
end
copy running-config startup-config
</code></pre>
</details>

---

### Часть 4 — Выбор порта по приоритету

Включите резервные интерфейсы на всех коммутаторах для создания параллельных каналов:

<details>
<summary>S1, S2, S3</summary>
<pre><code>
enable
configure terminal
interface range Ethernet 0/1, Ethernet 0/3
switchport trunk encapsulation dot1q
switchport mode trunk
no shutdown
end
copy running-config startup-config
</code></pre>
</details>

Теперь между каждой парой коммутаторов два параллельных канала. STP должен заблокировать по одному на каждый сегмент. При равной стоимости пути STP выбирает порт с **наименьшим port ID** (приоритет × 256 + номер порта). При одинаковом приоритете (128) побеждает порт с меньшим номером интерфейса.

Проверьте новое состояние STP:

<details>
<summary>S1 — все порты Designated (корневой мост)</summary>
<pre><code>
S1#show spanning-tree
VLAN0001
  Root ID    Priority    32769
             Address     aabb.cc00.1100
             This bridge is the root
...
Interface           Role Sts Cost      Prio.Nbr Type
------------------- ---- --- --------- -------- --------------------------------
Et0/0               Desg FWD 100       128.1    Shr
Et0/1               Desg FWD 100       128.2    Shr
Et0/2               Desg FWD 100       128.3    Shr
Et0/3               Desg FWD 100       128.4    Shr
</code></pre>
</details>
<details>
<summary>S2 — Et0/0 Root, Et0/1 Alternate</summary>
<pre><code>
S2#show spanning-tree
...
Interface           Role Sts Cost      Prio.Nbr Type
------------------- ---- --- --------- -------- --------------------------------
Et0/0               Root FWD 100       128.1    Shr
Et0/1               Altn BLK 100       128.2    Shr
Et0/2               Desg FWD 100       128.3    Shr
Et0/3               Desg FWD 100       128.4    Shr
</code></pre>
</details>
<details>
<summary>S3 — Et0/2 Root, остальные Alternate</summary>
<pre><code>
S3#show spanning-tree
...
Interface           Role Sts Cost      Prio.Nbr Type
------------------- ---- --- --------- -------- --------------------------------
Et0/0               Altn BLK 100       128.1    Shr
Et0/1               Altn BLK 100       128.2    Shr
Et0/2               Root FWD 100       128.3    Shr
Et0/3               Altn BLK 100       128.4    Shr
</code></pre>
</details>

S2 имеет два пути до корня (Et0/0 и Et0/1 — оба ведут к S1). Побеждает Et0/0, так как его номер порта меньше (port ID 128.1 < 128.2). Et0/1 блокируется.

S3 имеет четыре порта: Et0/2 и Et0/3 ведут к S1, Et0/0 и Et0/1 — к S2. Корневым выбирается Et0/2 (прямой путь к корню, меньший номер). Остальные порты блокируются, так как роль назначенного на соответствующих сегментах занимают S1 или S2.

![Топология после включения всех портов](/img/neteng/02/54.png)

---

*Network Engineer Course | Лабораторная работа 02*
