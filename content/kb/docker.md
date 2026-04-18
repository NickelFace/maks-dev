---
title: "Docker"
description: "run, build, compose, volumes, networks, images — essential commands"
icon: "🐳"
group: "Cloud & DevOps"
tags: ["Docker", "Containers", "DevOps"]
date: 2026-04-14
---

<div class="intro-card">
Docker reference: managing <strong>containers, images, volumes, networks</strong>. Docker Compose. Essential flags and usage patterns.
</div>

<div class="cert-coming-soon" style="margin-top:32px">
  <div class="coming-icon">🚧</div>
  <div>Content in development</div>
</div>

**Planned:**
- `docker run` — key flags: -d, -p, -v, -e, --name, --network, --rm
- Container management — start/stop/restart/rm/exec/logs/inspect/stats
- Images — build, pull, push, tag, rmi, history, save/load
- Volumes — create, ls, rm, inspect; bind mounts vs named volumes
- Networks — bridge/host/none, create, connect, inspect
- Docker Compose — up/down/ps/logs/exec, override files
- Cleanup — `docker system prune`, `docker image prune -a`
- Dockerfile — FROM, RUN, COPY, ENV, EXPOSE, CMD, ENTRYPOINT
