---
title: "Code block reference"
date: 2026-09-06
description: "Every block type the theme can render, on one page. Toggle the theme to check both palettes at once."
layout: "dev"
pagefind_ignore: true
sitemap:
  disable: true
---

This page exists to be looked at, not read. It renders one of each block type
through the real shortcodes and the real render hook, so a palette change can be
checked in both themes in about ten seconds: open it, toggle the theme, and look
for anything that stops being legible.

The floor in both palettes is the comment token — 5.5:1 on dark, 5.3:1 on light.
If comments and line numbers survive at 200% zoom, everything above them does.

## Inline

Inline `code` is the one code surface that follows the page rather than the
block: a chip painted with the block's own background reads as a broken block.
So `--code-inline-bg` and `--code-inline-fg` are page tokens, set in
`global.css`, while the syntax hues live in `chroma.css`.

## Shell session

{{< session host="maks@ubuntu" path="~/Projects/maks.top" >}}
$ hugo --gc --minify
Start building sites …
hugo v0.147.1+extended linux/amd64

                   | EN
-------------------+------
  Pages            | 1583
  Static files     |   61

Total in 1240 ms
$ echo "done"
done
{{< /session >}}

## Source file

{{< file path="/etc/nginx/conf.d/maks.top.conf" lang="nginx" hl="4" >}}
server {
    listen 443 ssl http2;
    server_name maks.top;
    root /var/www/maks.top/public;

    location / {
        try_files $uri $uri/ =404;
    }
}
{{< /file >}}

## Diff

{{< diff file="hugo.toml" >}}
@@ -18,6 +18,11 @@
 [params]
   author = "Maks"
+
+[module]
+  [[module.mounts]]
+    source       = "content"
+    target       = "content"
+    excludeFiles = ["**/ru/**"]
{{< /diff >}}

## Cisco IOS

A bare fence containing an IOS prompt is detected and tokenised — the mode is
bold and the hostname recedes, because tracking `config` → `config-if` →
`config-router` is most of what reading a long paste involves.

```
R1>enable
R1#configure terminal
R1(config)#router ospf 1
R1(config-router)#network 10.0.12.0 0.0.0.255 area 0   ! wildcard, not a mask
R1(config-router)#no passive-interface GigabitEthernet0/0
R1(config-router)#end
R1#show ip ospf neighbor
Neighbor ID     Pri   State           Dead Time   Address         Interface
2.2.2.2           1   FULL/DR         00:00:34    10.0.12.2       GigabitEthernet0/0
R1#show ip ospf nieghbor
                    ^
% Invalid input detected at '^' marker.
```

## Shell

```bash
#!/usr/bin/env bash
set -euo pipefail

SITE_DIR="${1:-/var/www/maks.top}"
for f in "$SITE_DIR"/public/**/*.html; do
  grep -q "<title>" "$f" || echo "no title: $f" >&2
done
```

## Program output

A bare fence with no prompt in it stays output — flat, unhighlighted, read as a
quotation. This is what keeps the ASCII diagrams sitting next to the Cisco
configs from being tokenised as commands.

```
10.0.0.0/8 is variably subnetted, 4 subnets, 2 masks
O        10.0.23.0/24 [110/2] via 10.0.12.2, 00:04:11, GigabitEthernet0/0
C        10.0.12.0/24 is directly connected, GigabitEthernet0/0
```
