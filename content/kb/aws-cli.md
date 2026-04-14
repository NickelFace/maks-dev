---
title: "AWS CLI"
description: "EC2, S3, IAM, VPC, ECS — часто используемые команды"
icon: "☁️"
group: "Cloud & DevOps"
tags: ["AWS", "Cloud", "CLI", "DevOps"]
date: 2026-04-14
---

<div class="intro-card">
Справочник AWS CLI: команды для работы с <strong>EC2, S3, IAM, VPC, ECS</strong>. Профили, форматы вывода, полезные JMESPath-фильтры.
</div>

<div class="cert-coming-soon" style="margin-top:32px">
  <div class="coming-icon">🚧</div>
  <div>Контент в разработке</div>
</div>

**Планируется:**
- Конфигурация — `aws configure`, профили, `--profile`, `--region`, `--output`
- EC2 — describe-instances, start/stop/terminate, run-instances, key pairs, security groups
- S3 — ls, cp, mv, rm, sync, presign, bucket policy
- IAM — users, roles, policies, `aws sts get-caller-identity`
- VPC — describe-vpcs, subnets, route tables, IGW, NAT
- ECS — список сервисов/задач, exec в контейнер
- CloudWatch — describe-alarms, get-metric-data, logs tail
- JMESPath — фильтрация вывода через `--query`
- Пагинация — `--max-items`, `--starting-token`
