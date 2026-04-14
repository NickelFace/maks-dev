---
title: "Linux Networking"
description: "ip, ss, tcpdump, nmcli, iptables — команды с примерами"
icon: "🌐"
group: "Networking"
tags: ["Linux", "ip", "ss", "tcpdump", "iptables", "nmcli"]
date: 2026-04-14
---

<div class="intro-card">
Быстрый справочник по сетевым инструментам Linux. Охватывает современный стек: <strong>iproute2</strong> (ip, ss), захват трафика (<strong>tcpdump</strong>), управление подключениями (<strong>nmcli</strong>) и файрвол (<strong>iptables</strong>).
</div>

## ip addr

<div class="ref-panel">
<div class="ref-panel-head">Управление адресами</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">ip addr</td><td class="desc">Показать все интерфейсы с адресами</td></tr>
<tr><td class="mono">ip a show dev eth0</td><td class="desc">Только один интерфейс</td></tr>
<tr><td class="mono">ip a add 192.168.1.10/24 dev eth0</td><td class="desc">Добавить IP-адрес</td></tr>
<tr><td class="mono">ip a del 192.168.1.10/24 dev eth0</td><td class="desc">Удалить IP-адрес</td></tr>
<tr><td class="mono">ip a flush dev eth0</td><td class="desc">Удалить все адреса с интерфейса</td></tr>
<tr><td class="mono">ip -6 a</td><td class="desc">Только IPv6 адреса</td></tr>
<tr><td class="mono">ip -br a</td><td class="desc">Краткий вывод (brief)</td></tr>
</tbody>
</table>
</div>
</div>

## ip link

<div class="ref-panel">
<div class="ref-panel-head">Управление интерфейсами</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">ip link show</td><td class="desc">Список всех интерфейсов</td></tr>
<tr><td class="mono">ip -br link</td><td class="desc">Краткий вывод со статусами</td></tr>
<tr><td class="mono">ip link set eth0 up</td><td class="desc">Включить интерфейс</td></tr>
<tr><td class="mono">ip link set eth0 down</td><td class="desc">Выключить интерфейс</td></tr>
<tr><td class="mono">ip link set eth0 mtu 9000</td><td class="desc">Установить MTU (jumbo frames)</td></tr>
<tr><td class="mono">ip link set eth0 promisc on</td><td class="desc">Включить promiscuous mode</td></tr>
<tr><td class="mono">ip link set eth0 name lan0</td><td class="desc">Переименовать интерфейс</td></tr>
<tr><td class="mono">ip link add veth0 type veth peer name veth1</td><td class="desc">Создать veth-пару</td></tr>
<tr><td class="mono">ip link add br0 type bridge</td><td class="desc">Создать bridge</td></tr>
<tr><td class="mono">ip link set eth0 master br0</td><td class="desc">Добавить интерфейс в bridge</td></tr>
<tr><td class="mono">ip link del veth0</td><td class="desc">Удалить интерфейс</td></tr>
</tbody>
</table>
</div>
</div>

## ip route

<div class="ref-panel">
<div class="ref-panel-head">Таблица маршрутизации</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">ip route</td><td class="desc">Показать таблицу маршрутов</td></tr>
<tr><td class="mono">ip r show table all</td><td class="desc">Все таблицы маршрутизации</td></tr>
<tr><td class="mono">ip r add default via 192.168.1.1</td><td class="desc">Установить шлюз по умолчанию</td></tr>
<tr><td class="mono">ip r add 10.0.0.0/8 via 10.1.0.1 dev eth0</td><td class="desc">Добавить статический маршрут</td></tr>
<tr><td class="mono">ip r del 10.0.0.0/8</td><td class="desc">Удалить маршрут</td></tr>
<tr><td class="mono">ip r replace 10.0.0.0/8 via 10.2.0.1</td><td class="desc">Заменить/добавить маршрут</td></tr>
<tr><td class="mono">ip r get 8.8.8.8</td><td class="desc">Маршрут до конкретного хоста</td></tr>
<tr><td class="mono">ip r add blackhole 10.10.0.0/16</td><td class="desc">Чёрная дыра (drop без ответа)</td></tr>
<tr><td class="mono">ip r add prohibit 10.10.0.0/16</td><td class="desc">Запрет с ICMP admin-prohibited</td></tr>
<tr><td class="mono">ip r flush cache</td><td class="desc">Очистить кэш маршрутов</td></tr>
</tbody>
</table>
</div>
</div>

## ip neigh

<div class="ref-panel">
<div class="ref-panel-head">ARP / NDP таблица</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">ip neigh show</td><td class="desc">Показать ARP/NDP таблицу</td></tr>
<tr><td class="mono">ip n show dev eth0</td><td class="desc">ARP для конкретного интерфейса</td></tr>
<tr><td class="mono">ip n add 192.168.1.1 lladdr aa:bb:cc:dd:ee:ff dev eth0 nud permanent</td><td class="desc">Статическая ARP-запись</td></tr>
<tr><td class="mono">ip n del 192.168.1.1 dev eth0</td><td class="desc">Удалить ARP-запись</td></tr>
<tr><td class="mono">ip n flush dev eth0</td><td class="desc">Очистить ARP для интерфейса</td></tr>
<tr><td class="mono">ip n flush all</td><td class="desc">Очистить весь ARP-кэш</td></tr>
</tbody>
</table>
</div>
</div>

## ss

<div class="ref-panel">
<div class="ref-panel-head">Статистика сокетов (замена netstat)</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">ss -tuln</td><td class="desc">Listening TCP/UDP порты</td></tr>
<tr><td class="mono">ss -tulnp</td><td class="desc">То же + имена процессов (root)</td></tr>
<tr><td class="mono">ss -ta</td><td class="desc">Все TCP-соединения</td></tr>
<tr><td class="mono">ss -ua</td><td class="desc">Все UDP-сокеты</td></tr>
<tr><td class="mono">ss -xa</td><td class="desc">Unix domain сокеты</td></tr>
<tr><td class="mono">ss -s</td><td class="desc">Сводная статистика по сокетам</td></tr>
<tr><td class="mono">ss -4 state established</td><td class="desc">Установленные IPv4-соединения</td></tr>
<tr><td class="mono">ss -tnp dst 10.0.0.1</td><td class="desc">Соединения к конкретному хосту</td></tr>
<tr><td class="mono">ss -tnp dport = :443</td><td class="desc">Соединения к порту 443</td></tr>
<tr><td class="mono">ss -tnp sport = :22</td><td class="desc">Соединения с порта 22</td></tr>
<tr><td class="mono">ss -tnp state time-wait</td><td class="desc">Соединения в состоянии TIME-WAIT</td></tr>
</tbody>
</table>
</div>
</div>

Флаги `ss`: `-t` TCP · `-u` UDP · `-l` listening · `-a` all · `-n` no resolve · `-p` processes · `-4`/`-6` IPv4/IPv6

## tcpdump

<div class="ref-panel">
<div class="ref-panel-head">Захват пакетов</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">tcpdump -i eth0</td><td class="desc">Захват на интерфейсе</td></tr>
<tr><td class="mono">tcpdump -i any</td><td class="desc">Захват на всех интерфейсах</td></tr>
<tr><td class="mono">tcpdump -i eth0 -n</td><td class="desc">Без DNS-резолвинга</td></tr>
<tr><td class="mono">tcpdump -i eth0 -nn</td><td class="desc">Без DNS и имён портов</td></tr>
<tr><td class="mono">tcpdump -i eth0 -c 100</td><td class="desc">Захватить 100 пакетов и выйти</td></tr>
<tr><td class="mono">tcpdump -i eth0 -w file.pcap</td><td class="desc">Сохранить в файл (Wireshark)</td></tr>
<tr><td class="mono">tcpdump -r file.pcap</td><td class="desc">Читать из файла</td></tr>
<tr><td class="mono">tcpdump -i eth0 -v</td><td class="desc">Подробный вывод</td></tr>
<tr><td class="mono">tcpdump -i eth0 port 80</td><td class="desc">Фильтр по порту</td></tr>
<tr><td class="mono">tcpdump -i eth0 host 10.0.0.1</td><td class="desc">Фильтр по хосту</td></tr>
<tr><td class="mono">tcpdump -i eth0 net 10.0.0.0/24</td><td class="desc">Фильтр по подсети</td></tr>
<tr><td class="mono">tcpdump -i eth0 src host 10.0.0.1</td><td class="desc">Только от источника</td></tr>
<tr><td class="mono">tcpdump -i eth0 tcp and not port 22</td><td class="desc">TCP без SSH</td></tr>
<tr><td class="mono">tcpdump 'tcp[tcpflags] & tcp-syn != 0'</td><td class="desc">Только SYN-пакеты</td></tr>
<tr><td class="mono">tcpdump 'tcp[tcpflags] == tcp-syn|tcp-ack'</td><td class="desc">Только SYN-ACK (handshake)</td></tr>
<tr><td class="mono">tcpdump -i eth0 icmp</td><td class="desc">Только ICMP (ping)</td></tr>
<tr><td class="mono">tcpdump -i eth0 udp port 53</td><td class="desc">DNS-запросы</td></tr>
</tbody>
</table>
</div>
</div>

## nmcli

<div class="ref-panel">
<div class="ref-panel-head">NetworkManager CLI</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">nmcli device status</td><td class="desc">Статус всех устройств</td></tr>
<tr><td class="mono">nmcli device show eth0</td><td class="desc">Детальная информация об интерфейсе</td></tr>
<tr><td class="mono">nmcli connection show</td><td class="desc">Список всех подключений</td></tr>
<tr><td class="mono">nmcli connection show --active</td><td class="desc">Только активные</td></tr>
<tr><td class="mono">nmcli con up "name"</td><td class="desc">Активировать подключение</td></tr>
<tr><td class="mono">nmcli con down "name"</td><td class="desc">Деактивировать подключение</td></tr>
<tr><td class="mono">nmcli con reload</td><td class="desc">Перечитать файлы конфигурации</td></tr>
<tr><td class="mono">nmcli con add type ethernet ifname eth0 con-name myconn</td><td class="desc">Создать Ethernet-подключение</td></tr>
<tr><td class="mono">nmcli con mod "name" ipv4.addresses "192.168.1.10/24"</td><td class="desc">Установить статический IP</td></tr>
<tr><td class="mono">nmcli con mod "name" ipv4.gateway "192.168.1.1"</td><td class="desc">Установить шлюз</td></tr>
<tr><td class="mono">nmcli con mod "name" ipv4.dns "8.8.8.8 1.1.1.1"</td><td class="desc">Установить DNS</td></tr>
<tr><td class="mono">nmcli con mod "name" ipv4.method manual</td><td class="desc">Переключить на статику</td></tr>
<tr><td class="mono">nmcli con mod "name" ipv4.method auto</td><td class="desc">Переключить на DHCP</td></tr>
<tr><td class="mono">nmcli con del "name"</td><td class="desc">Удалить подключение</td></tr>
<tr><td class="mono">nmcli general hostname myhost</td><td class="desc">Установить hostname</td></tr>
<tr><td class="mono">nmcli networking off / on</td><td class="desc">Отключить / включить сеть</td></tr>
</tbody>
</table>
</div>
</div>

## iptables

<div class="ref-panel">
<div class="ref-panel-head">Просмотр и очистка правил</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">iptables -L -n -v</td><td class="desc">Все правила с счётчиками</td></tr>
<tr><td class="mono">iptables -L INPUT --line-numbers</td><td class="desc">Правила с номерами строк</td></tr>
<tr><td class="mono">iptables -t nat -L -n -v</td><td class="desc">Таблица NAT</td></tr>
<tr><td class="mono">iptables -F</td><td class="desc">Очистить все правила (filter)</td></tr>
<tr><td class="mono">iptables -F INPUT</td><td class="desc">Очистить только INPUT</td></tr>
<tr><td class="mono">iptables -X</td><td class="desc">Удалить пользовательские цепочки</td></tr>
<tr><td class="mono">iptables -Z</td><td class="desc">Обнулить счётчики</td></tr>
<tr><td class="mono">iptables -D INPUT 3</td><td class="desc">Удалить правило #3 в INPUT</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">Основные правила</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT</td><td class="desc">Разрешить ответный трафик</td></tr>
<tr><td class="mono">iptables -A INPUT -p tcp --dport 22 -j ACCEPT</td><td class="desc">Разрешить SSH</td></tr>
<tr><td class="mono">iptables -A INPUT -p tcp --dport 80,443 -j ACCEPT</td><td class="desc">Разрешить HTTP/HTTPS</td></tr>
<tr><td class="mono">iptables -A INPUT -i lo -j ACCEPT</td><td class="desc">Разрешить loopback</td></tr>
<tr><td class="mono">iptables -A INPUT -j DROP</td><td class="desc">Заблокировать всё остальное</td></tr>
<tr><td class="mono">iptables -I INPUT 1 -s 10.0.0.0/8 -j ACCEPT</td><td class="desc">Вставить правило в начало</td></tr>
<tr><td class="mono">iptables -A INPUT -p icmp -j ACCEPT</td><td class="desc">Разрешить ping</td></tr>
<tr><td class="mono">iptables -A INPUT -m limit --limit 3/min -j LOG --log-prefix "DROP: "</td><td class="desc">Логировать с rate limit</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">NAT и Forwarding</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">iptables -A FORWARD -i eth0 -o eth1 -j ACCEPT</td><td class="desc">Разрешить форвардинг</td></tr>
<tr><td class="mono">iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE</td><td class="desc">NAT / masquerade (PAT)</td></tr>
<tr><td class="mono">iptables -t nat -A POSTROUTING -s 192.168.0.0/24 -o eth0 -j SNAT --to-source 1.2.3.4</td><td class="desc">SNAT с фиксированным IP</td></tr>
<tr><td class="mono">iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination 192.168.1.10:80</td><td class="desc">Port forwarding (DNAT)</td></tr>
<tr><td class="mono">iptables-save > /etc/iptables/rules.v4</td><td class="desc">Сохранить правила</td></tr>
<tr><td class="mono">iptables-restore < /etc/iptables/rules.v4</td><td class="desc">Восстановить правила</td></tr>
</tbody>
</table>
</div>
</div>

Цепочки: `INPUT` (входящий трафик хоста) · `OUTPUT` (исходящий) · `FORWARD` (транзитный) · `PREROUTING` · `POSTROUTING`  
Таблицы: `filter` (по умолчанию) · `nat` · `mangle` · `raw`
