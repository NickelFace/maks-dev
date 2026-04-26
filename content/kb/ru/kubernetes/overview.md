---
title: "Kubernetes: введение"
description: "Зачем нужен k8s, основные понятия: node, cluster, namespace, pod, kubectl"
icon: "☸️"
tags: ["Kubernetes", "k8s", "Containers", "DevOps"]
date: 2026-04-26
page_lang: "ru"
lang_pair: "/kb/kubernetes/overview/"
pagefind_ignore: true
build:
  list: never
  render: always
---

<div class="intro-card">
Kubernetes (k8s) — система оркестрации контейнеров на множестве серверов. Автоматический перезапуск при падении, масштабирование под нагрузку, обновления без даунтайма.
</div>

## Когда Docker перестаёт хватать

Один сервер с Docker отлично работает, пока не случается одно из трёх.

**Сервер упал.** Жёсткий диск умер, дата-центр потерял питание, провайдер что-то уронил. Docker не умеет ничего делать сам — приложение недоступно, пока ты вручную не поднимешь всё на другой машине. В 3 часа ночи.

**Нагрузка выросла.** Вышла реклама, пришло 10× больше пользователей. Один контейнер не справляется. Ты вручную запускаешь второй, третий — но как распределить трафик? Нужен балансировщик, нужно следить за каждым, обновлять вручную.

**Инфраструктура выросла.** Сначала один сервер с Docker справлялся. Потом стало два, потом пять. Как следить за тем, что где запущено? Как обновить приложение на всех сразу, не роняя сервис?

Вот для этого и нужен Kubernetes.

---

## Что такое Kubernetes

Kubernetes — диспетчер контейнеров на уровне кластера. Ты описываешь, **что** должно работать и в каком количестве — Kubernetes сам решает, **где** это запустить и что делать при сбоях.

- Сервер упал → контейнеры автоматически перезапускаются на других нодах
- Нагрузка выросла → Kubernetes добавляет нужное количество копий приложения
- Нужно обновить без остановки → rolling update: по одному поду, без даунтайма

Docker — один водитель с одной машиной. Kubernetes — диспетчер таксопарка из сотни машин: ты говоришь «нужно 10 машин в центре», а диспетчер сам разбирается, какие свободны и что делать, если одна сломается.

---

## Основные понятия

**Node** — отдельный физический или виртуальный сервер в кластере. Kubernetes распределяет работу между нодами.

**Cluster** — вся система целиком: несколько нод плюс управляющий компонент (control plane), который следит за состоянием кластера и принимает решения о размещении подов.

**Namespace** — логическое разделение внутри одного кластера. Кластер — это один большой офис, namespace — отдельные комнаты. В одном кластере можно держать `production`, `staging` и `dev` — и они не будут мешать друг другу. По умолчанию ресурсы создаются в namespace `default`.

**Pod** — минимальная единица запуска в Kubernetes. Kubernetes не запускает контейнеры напрямую — он запускает поды.

**kubectl** — командная строка для управления кластером. Как `docker` для Docker — только для Kubernetes.

---

## Pod и контейнер — в чём разница?

Под — обёртка вокруг одного или нескольких контейнеров. Контейнеры внутри одного пода:

- работают на одном сервере
- делят одну сеть (видят друг друга через `localhost`)
- могут делить общее хранилище (volumes)

В большинстве случаев **один под = один контейнер**. Несколько контейнеров в одном поде используют для тесно связанных вспомогательных процессов — например, основное приложение и sidecar-сборщик логов рядом с ним.

---

## Docker vs Kubernetes

<div class="ref-panel">
<div class="ref-panel-head">Сравнение</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Возможность</th><th style="text-align:center;width:50%">Docker</th><th style="text-align:center;width:50%">Kubernetes</th></tr></thead>
<tbody>
<tr><td class="desc" style="white-space:nowrap">Запуск контейнеров</td><td style="text-align:center">✅</td><td style="text-align:center">✅</td></tr>
<tr><td class="desc" style="white-space:nowrap">Один сервер</td><td style="text-align:center">✅</td><td style="text-align:center">✅</td></tr>
<tr><td class="desc" style="white-space:nowrap">Много серверов</td><td style="text-align:center">❌</td><td style="text-align:center">✅</td></tr>
<tr><td class="desc" style="white-space:nowrap">Авто-перезапуск при падении</td><td style="text-align:center">❌</td><td style="text-align:center">✅</td></tr>
<tr><td class="desc" style="white-space:nowrap">Балансировка нагрузки</td><td style="text-align:center">❌</td><td style="text-align:center">✅</td></tr>
<tr><td class="desc" style="white-space:nowrap">Масштабирование</td><td class="desc" style="text-align:center">вручную</td><td class="desc" style="text-align:center">автоматически</td></tr>
<tr><td class="desc" style="white-space:nowrap">Rolling update</td><td style="text-align:center">❌</td><td style="text-align:center">✅</td></tr>
</tbody>
</table>
</div>
</div>

---

## Первые команды

```bash
# посмотреть ноды кластера
kubectl get nodes

# посмотреть namespaces
kubectl get namespaces

# запустить pod с nginx
kubectl run nginx --image=nginx:alpine --restart=Never

# список подов
kubectl get pods

# подробная информация о поде
kubectl describe pod nginx

# удалить под
kubectl delete pod nginx
```

Вывод `kubectl get pods` выглядит так:

```
NAME    READY   STATUS    RESTARTS   AGE
nginx   1/1     Running   0          5m
```

`READY 1/1` означает, что из 1 контейнера в поде 1 готов. `RESTARTS` — сколько раз под перезапускался.

Синтаксис похож на Docker, но вместо контейнеров — поды, вместо одного хоста — кластер.

---

## О лабораторной среде

В лабораторных используется одноузловой кластер — Kubernetes уже установлен и запущен внутри виртуальной машины.

**Одноузловой кластер** — control plane и worker node находятся на одном сервере. Для продакшена так не делают, но для обучения этого полностью достаточно: все команды, объекты и поведение — идентичны многоузловому кластеру.
