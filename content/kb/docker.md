---
title: "Docker"
description: "run, build, compose, volumes, networks, images — основные команды"
icon: "🐳"
group: "Cloud & DevOps"
tags: ["Docker", "Containers", "DevOps"]
date: 2026-04-14
---

<div class="intro-card">
Справочник Docker: управление <strong>контейнерами, образами, томами, сетями</strong>. Docker Compose. Основные флаги и паттерны использования.
</div>

<div class="cert-coming-soon" style="margin-top:32px">
  <div class="coming-icon">🚧</div>
  <div>Контент в разработке</div>
</div>

**Планируется:**
- `docker run` — ключевые флаги: -d, -p, -v, -e, --name, --network, --rm
- Управление контейнерами — start/stop/restart/rm/exec/logs/inspect/stats
- Образы — build, pull, push, tag, rmi, history, save/load
- Тома — create, ls, rm, inspect; bind mounts vs named volumes
- Сети — bridge/host/none, create, connect, inspect
- Docker Compose — up/down/ps/logs/exec, override файлы
- Очистка — `docker system prune`, `docker image prune -a`
- Dockerfile — FROM, RUN, COPY, ENV, EXPOSE, CMD, ENTRYPOINT
