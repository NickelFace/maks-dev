---
title: "AWS CLI"
description: "EC2, S3, IAM, VPC, ECS — frequently used commands"
icon: "☁️"
group: "Cloud & DevOps"
tags: ["AWS", "Cloud", "CLI", "DevOps"]
date: 2026-04-14
---

<div class="intro-card">
AWS CLI reference: commands for <strong>EC2, S3, IAM, VPC, ECS</strong>. Profiles, output formats, useful JMESPath filters.
</div>

<div class="cert-coming-soon" style="margin-top:32px">
  <div class="coming-icon">🚧</div>
  <div>Content in development</div>
</div>

**Planned:**
- Configuration — `aws configure`, profiles, `--profile`, `--region`, `--output`
- EC2 — describe-instances, start/stop/terminate, run-instances, key pairs, security groups
- S3 — ls, cp, mv, rm, sync, presign, bucket policy
- IAM — users, roles, policies, `aws sts get-caller-identity`
- VPC — describe-vpcs, subnets, route tables, IGW, NAT
- ECS — list services/tasks, exec into container
- CloudWatch — describe-alarms, get-metric-data, logs tail
- JMESPath — output filtering via `--query`
- Pagination — `--max-items`, `--starting-token`
