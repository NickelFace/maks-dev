---
title: "Kubernetes: Overview"
description: "Why k8s exists, core concepts: node, cluster, namespace, pod, kubectl"
icon: "☸️"
tags: ["Kubernetes", "k8s", "Containers", "DevOps"]
date: 2026-04-26
page_lang: "en"
lang_pair: "/kb/ru/kubernetes/overview/"
---

<div class="intro-card">
Kubernetes (k8s) — container orchestration across many servers. Automatic restart on failure, scaling under load, updates with zero downtime.
</div>

## When Docker isn't enough

A single Docker host works fine — until one of three things happens.

**The server dies.** A disk fails, the data centre loses power, the provider drops something. Docker does nothing on its own — your app is down until you manually bring everything up on another machine. At 3 AM.

**Load spikes.** An ad goes out, 10× more users arrive. One container can't keep up. You manually start a second, a third — but how do you distribute traffic? You need a load balancer, you need to watch each one, update them one by one.

**Infrastructure grows.** One Docker host was enough at first. Then two, then five. How do you track what's running where? How do you update the app across all of them without dropping the service?

That's what Kubernetes is for.

---

## What is Kubernetes

Kubernetes is a cluster-level container dispatcher. You describe **what** should run and how many copies — Kubernetes decides **where** to place it and what to do when things fail.

- Server dies → containers automatically restart on other nodes
- Load spikes → Kubernetes adds the required number of app replicas
- Need to update without downtime → rolling update: one pod at a time, zero downtime

Docker is one driver with one car. Kubernetes is a dispatcher managing a fleet of a hundred cars: you say "I need 10 cars downtown" and the dispatcher figures out which are free and what to do if one breaks down.

---

## Core concepts

**Node** — an individual physical or virtual server in the cluster. Kubernetes distributes work across nodes.

**Cluster** — the whole system: multiple nodes plus the control plane, which monitors cluster state and decides where to schedule pods.

**Namespace** — a logical partition inside a single cluster. Think of the cluster as one large office and namespaces as separate rooms. You can run `production`, `staging`, and `dev` in the same cluster without them interfering. Resources are created in the `default` namespace unless specified otherwise.

**Pod** — the smallest deployable unit in Kubernetes. Kubernetes doesn't run containers directly — it runs pods.

**kubectl** — the command-line tool for managing the cluster. Like `docker` for Docker, but for Kubernetes.

---

## Pod vs container

A pod is a wrapper around one or more containers. Containers inside the same pod:

- run on the same node
- share a network (they reach each other via `localhost`)
- can share storage (volumes)

In most cases **one pod = one container**. Multiple containers in a pod are used for tightly coupled helper processes — for example, a main app alongside a sidecar log collector.

---

## Docker vs Kubernetes

<div class="ref-panel">
<div class="ref-panel-head">Comparison</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Feature</th><th style="text-align:center;width:50%">Docker</th><th style="text-align:center;width:50%">Kubernetes</th></tr></thead>
<tbody>
<tr><td class="desc" style="white-space:nowrap">Run containers</td><td style="text-align:center">✅</td><td style="text-align:center">✅</td></tr>
<tr><td class="desc" style="white-space:nowrap">Single server</td><td style="text-align:center">✅</td><td style="text-align:center">✅</td></tr>
<tr><td class="desc" style="white-space:nowrap">Multiple servers</td><td style="text-align:center">❌</td><td style="text-align:center">✅</td></tr>
<tr><td class="desc" style="white-space:nowrap">Auto-restart on failure</td><td style="text-align:center">❌</td><td style="text-align:center">✅</td></tr>
<tr><td class="desc" style="white-space:nowrap">Load balancing</td><td style="text-align:center">❌</td><td style="text-align:center">✅</td></tr>
<tr><td class="desc" style="white-space:nowrap">Scaling</td><td class="desc" style="text-align:center">manual</td><td class="desc" style="text-align:center">automatic</td></tr>
<tr><td class="desc" style="white-space:nowrap">Rolling update</td><td style="text-align:center">❌</td><td style="text-align:center">✅</td></tr>
</tbody>
</table>
</div>
</div>

---

## First commands

```bash
# list cluster nodes
kubectl get nodes

# list namespaces
kubectl get namespaces

# run an nginx pod
kubectl run nginx --image=nginx:alpine --restart=Never

# list pods
kubectl get pods

# detailed pod info
kubectl describe pod nginx

# delete a pod
kubectl delete pod nginx
```

`kubectl get pods` output looks like this:

```
NAME    READY   STATUS    RESTARTS   AGE
nginx   1/1     Running   0          5m
```

`READY 1/1` means 1 out of 1 containers in the pod is ready. `RESTARTS` shows how many times the pod has been restarted.

The syntax is similar to Docker — but instead of containers you work with pods, and instead of a single host you have a cluster.

---

## Lab environment

The labs use a single-node cluster — Kubernetes is already installed and running inside the virtual machine.

**Single-node cluster** means the control plane and worker node are on the same server. This is not how production works, but for learning it is completely sufficient: all commands, objects, and behaviour are identical to a multi-node cluster.
