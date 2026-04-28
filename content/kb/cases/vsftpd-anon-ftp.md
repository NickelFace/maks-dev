---
title: "Anonymous File Storage with vsftpd"
description: "Set up an anonymous FTP server in minutes for hassle-free LAN file sharing"
icon: "📁"
group: "Cases"
tags: ["Linux", "FTP", "vsftpd", "LAN", "Networking"]
date: 2026-04-28
page_lang: "en"
lang_pair: "/kb/cases/ru/vsftpd-anon-ftp/"
---

<div class="intro-card">
Quick case — spin up an anonymous <strong>vsftpd</strong> FTP server for local network file sharing. Any client connects without a password and can freely upload and download files.
</div>

## Why vsftpd

vsftpd (Very Secure FTP Daemon) is the standard FTP server in most Linux distributions. It's lightweight, stable, and well-documented. Despite the "Very Secure" name, it works great in anonymous mode — everything is locked down by default, and you explicitly enable what you need.

## Installation

```bash
sudo apt update
sudo apt install vsftpd -y
```

After installation vsftpd starts automatically as a systemd service. Stop it before configuring:

```bash
sudo systemctl stop vsftpd
```

## Directory Setup

The FTP server runs as the system user `ftp` in anonymous mode. Create the directory structure:

```bash
sudo mkdir -p /var/ftp/pub
sudo chown root:root /var/ftp
sudo chmod 555 /var/ftp
sudo chown ftp:ftp /var/ftp/pub
sudo chmod 2777 /var/ftp/pub
```

- `/var/ftp` — anonymous user root. vsftpd **requires** this directory to be non-writable, otherwise the server refuses to start with `refusing to run with writable root inside chroot()`. Hence `555` permissions owned by `root`.
- `/var/ftp/pub` — working directory for uploads and downloads. The `setgid` bit (`2777`) ensures new files inherit the group ownership.

## vsftpd Configuration

Replace the config file entirely:

```bash
sudo tee /etc/vsftpd.conf > /dev/null << 'EOF'
listen=YES
listen_ipv6=NO

anonymous_enable=YES
no_anon_password=YES
local_enable=NO

anon_root=/var/ftp

anon_upload_enable=YES
anon_mkdir_write_enable=YES
anon_other_write_enable=YES
write_enable=YES

anon_umask=000
file_open_mode=0666

pasv_enable=YES
pasv_min_port=30000
pasv_max_port=30050

xferlog_enable=YES
log_ftp_protocol=YES
EOF
```

| Parameter | What it does |
|---|---|
| `anonymous_enable=YES` | Enable anonymous login |
| `no_anon_password=YES` | Skip password prompt |
| `local_enable=NO` | Deny system user logins |
| `anon_root=/var/ftp` | Anonymous user root directory |
| `anon_upload_enable=YES` | Allow file uploads |
| `anon_mkdir_write_enable=YES` | Allow directory creation |
| `anon_other_write_enable=YES` | Allow delete and rename |
| `write_enable=YES` | Global write flag |
| `anon_umask=000` | Files created with maximum permissions |
| `pasv_min_port` / `pasv_max_port` | Passive mode port range |

## Firewall

```bash
sudo ufw allow 21/tcp
sudo ufw allow 30000:30050/tcp
```

Passive mode is FTP's classic headache. When listing a directory or transferring files, the server opens an extra data port. Without a fixed range, vsftpd picks random high ports and the client hangs on `PASV` waiting for a connection through a blocked port.

## Start the Server

```bash
sudo systemctl start vsftpd
sudo systemctl status vsftpd
```

Verify the port is listening:

```bash
ss -tlnp | grep :21
```

## Connecting Clients

**From a Linux terminal:**

```bash
ftp 192.168.50.187
# Login: anonymous
# Password: empty (just press Enter)
ftp> cd pub
ftp> put myfile.txt        # upload a file
ftp> mput *.png            # upload multiple files
ftp> get document.pdf      # download a file
```

**From a phone (Android / iOS):**

Any FTP client works — CX File Explorer, Total Commander, Solid Explorer. Enter the server IP, port 21, connection type anonymous. Files will be in `/pub`.

**From a browser:**

Open `ftp://192.168.50.187/pub/` — download only, browser upload is not supported.

## Common Issues

**Client hangs on directory listing**

Passive mode problem. Either open the port range in the firewall (see above), or switch the client to active mode:

```
ftp> passive
Passive mode: off.
ftp> ls
```

**`refusing to run with writable root inside chroot()`**

The anonymous root directory is writable:

```bash
sudo chmod 555 /var/ftp
sudo systemctl restart vsftpd
```

**`Anonymous users may not overwrite existing files`**

`anon_other_write_enable=YES` is missing from the config. Add it and restart.

## Security: Remember to Shut Down

An anonymous FTP server with full write access is an intentional security hole. Use it only temporarily and only on a trusted local network.

```bash
sudo systemctl stop vsftpd
sudo systemctl disable vsftpd
```

Or restore the default config:

```bash
sudo apt install --reinstall vsftpd
```

## Alternative: Python One-liner

If you only need to serve files for download — no installation required:

```bash
python3 -m http.server 8080 -d /path/to/files
```

Open `http://IP:8080` in the phone browser and download. For full two-way file exchange, FTP remains the simplest option.
