---
title: "LPIC-1 110.3 — Securing Data with Encryption"
date: 2026-04-20
description: "OpenSSH client configuration, key-based logins, ssh-agent, server host keys, SSH port tunnels, X11 forwarding, GnuPG key generation, encryption, signing and revocation. LPIC-1 exam topic 110.3."
tags: ["Linux", "LPIC-1", "security", "SSH", "GPG", "encryption", "OpenSSH"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-110-3-encryption/"
---

> **Exam weight: 4** — LPIC-1 v5, Exam 102

## What You Need to Know

From the official LPIC-1 objectives:

- Perform basic OpenSSH 2 client configuration and usage.
- Understand the role of OpenSSH 2 server host keys.
- Perform basic GnuPG configuration, usage and revocation.
- Use GPG to encrypt, decrypt, sign and verify files.
- Understand SSH port tunnels (including X11 tunnels).

Key files and commands: `ssh`, `ssh-keygen`, `ssh-agent`, `ssh-add`, `ssh-copy-id`, `gpg`, `gpg-agent`, `~/.gnupg/`.

---

## OpenSSH Client Configuration and Usage

### Connecting to a Remote Host

```bash
ssh user@host              # connect as 'user' on 'host'
ssh user@192.168.1.77      # using IP address
ssh host                   # connect as the current local user
ssh user@host ls .ssh      # execute a single command and return
```

On first connection to a host, SSH shows the server's fingerprint and asks for confirmation. Once accepted, the fingerprint is stored in `~/.ssh/known_hosts`.

If a host's key changes (reinstall, DHCP address reuse), SSH warns of a potential man-in-the-middle attack. Remove the old key with:

```bash
ssh-keygen -R hostname           # remove all keys for hostname
ssh-keygen -f "~/.ssh/known_hosts" -R "192.168.1.77"   # explicit file
```

---

## Key-Based Logins

### Generating a Key Pair

```bash
ssh-keygen -t ecdsa              # generate ECDSA key pair
ssh-keygen -t ed25519            # generate Ed25519 key pair (most secure)
ssh-keygen -t rsa                # generate RSA key pair
ssh-keygen -t ecdsa -b 521       # specify key size in bits
```

Without `-t`, `ssh-keygen` generates RSA (2048 bits) by default.

Files created in `~/.ssh/`:

| File | Contents |
|---|---|
| `id_ecdsa` | Private key (protect this file) |
| `id_ecdsa.pub` | Public key (distribute to servers) |
| `known_hosts` | Trusted server public key fingerprints |

### Key Algorithm Summary

| Algorithm | Notes |
|---|---|
| RSA | Widely used; min 1024, default 2048 bits |
| DSA | Deprecated in OpenSSH 7.0; exactly 1024 bits |
| ecdsa | Elliptic curve; 256, 384, or 521 bits |
| ed25519 | EdDSA / Edwards curve; fixed 256 bits; most secure |

### Copying the Public Key to a Server

```bash
ssh-copy-id user@host                          # recommended method
cat id_ecdsa.pub | ssh user@host 'cat >> .ssh/authorized_keys'   # manual
```

The public key is appended to `~/.ssh/authorized_keys` on the remote host.

### SSH Authentication Agent

The agent holds decrypted private keys in memory so the passphrase is only entered once per session.

```bash
ssh-agent /bin/bash              # start a new shell with the agent
ssh-add                          # add default private key; enter passphrase once
ssh-add ~/.ssh/id_ed25519        # add a specific key
```

Once the key is loaded, subsequent SSH connections use it without prompting.

---

## OpenSSH Server Host Keys

Server host keys are stored in `/etc/ssh/`:

| File | Permissions | Purpose |
|---|---|---|
| `ssh_host_rsa_key` | `0600` | RSA private key |
| `ssh_host_rsa_key.pub` | `0644` | RSA public key |
| `ssh_host_ecdsa_key` | `0600` | ECDSA private key |
| `ssh_host_ecdsa_key.pub` | `0644` | ECDSA public key |
| `ssh_host_ed25519_key` | `0600` | Ed25519 private key |
| `ssh_host_ed25519_key.pub` | `0644` | Ed25519 public key |
| `ssh_config` | — | Client configuration |
| `sshd_config` | — | Server configuration |

View a key fingerprint:

```bash
ssh-keygen -l -f /etc/ssh/ssh_host_ed25519_key.pub    # fingerprint
ssh-keygen -lv -f /etc/ssh/ssh_host_ed25519_key.pub   # fingerprint + randomart
```

### Key sshd_config Directives

| Directive | Purpose |
|---|---|
| `PermitRootLogin` | Enable/disable root SSH logins |
| `AllowUsers` | Whitelist specific users |

---

## SSH Port Tunnels

Port tunnelling encrypts traffic from a local port and forwards it through an SSH connection.

### Local Port Tunnel (`-L`)

Traffic to `LOCAL_PORT` on the local machine is forwarded through the SSH server to `DEST_HOST:DEST_PORT`.

```bash
ssh -L 8585:www.gnu.org:80 debian
# Browse http://localhost:8585 → reaches www.gnu.org:80 via 'debian'

ssh -L 8585:www.gnu.org:80 -Nf ina@192.168.1.77
# -N: no remote command (port forwarding only)
# -f: run in background
```

### Remote (Reverse) Port Tunnel (`-R`)

Traffic arriving at `REMOTE_PORT` on the SSH server is forwarded to `DEST_HOST:DEST_PORT` from the local machine's perspective.

```bash
ssh -R 8585:localhost:80 -Nf ina@192.168.1.77
# Anyone connecting to 192.168.1.77:8585 reaches localhost:80
```

### Multiple Tunnels in One Command

```bash
ssh -L 8080:www.gnu.org:80 -L 8585:www.melpa.org:80 -Nf ina@halof
```

### X11 Tunnel (`-X`)

Forwards the X Window System display from the remote host to the local machine.

```bash
ssh -X user@host             # enable X11 forwarding
ssh -x user@host             # disable X11 forwarding
```

### Tunnel Summary

| Tunnel | Option | sshd_config Directive |
|---|---|---|
| Local | `-L LOCAL:DEST_HOST:DEST_PORT` | `AllowTcpForwarding` |
| Remote / Reverse | `-R REMOTE:DEST_HOST:DEST_PORT` | `GatewayPorts` |
| X11 | `-X` | `X11Forwarding` |

---

## GnuPG (GPG)

GnuPG (*GNU Privacy Guard*) is an open-source implementation of the OpenPGP standard. It uses asymmetric (public-key) cryptography: a private key (kept secret) and a public key (shared with correspondents).

### Key Generation

```bash
gpg --gen-key                # interactive; asks for name, email, passphrase
```

Creates `~/.gnupg/` with:

| Path | Contents |
|---|---|
| `openpgp-revocs.d/` | Revocation certificates |
| `private-keys-v1.d/` | Private keys |
| `pubring.kbx` | Public keyring |
| `trustdb.gpg` | Trust database |

### Key Management

```bash
gpg --list-keys              # list public keyring
gpg --fingerprint USER-ID    # show fingerprint for a key
```

The **KEY-ID** is the last 8 hexadecimal digits of the full key fingerprint.

### Exporting and Distributing Keys

```bash
gpg --export USER-ID > carol.pub.key                    # binary export
gpg --export --armor USER-ID > carol.pub.key            # ASCII armored (email-safe)
gpg --export --output carol.pub.key USER-ID             # equivalent with -o flag
```

Distribute via key servers:

```bash
gpg --keyserver keyserver-name --send-keys KEY-ID       # upload
gpg --keyserver keyserver-name --recv-keys KEY-ID       # download
```

### Importing Keys

```bash
gpg --import carol.pub.key
```

### Key Revocation

Use when a private key is compromised or no longer needed.

Step 1 — Create a revocation certificate:

```bash
gpg --output revocation_file.asc --gen-revoke USER-ID
```

Step 2 — Import it to apply the revocation:

```bash
gpg --import revocation_file.asc
```

Step 3 — Distribute the revoked key to correspondents (and key servers).

---

## Encrypting and Decrypting Files

### Encrypt

```bash
gpg --output encrypted-message --recipient carol --armor --encrypt unencrypted-message
```

| Option | Description |
|---|---|
| `--output` / `-o` | Output filename |
| `--recipient` / `-r` | Recipient's USER-ID |
| `--armor` / `-a` | ASCII armored output (safe for email) |
| `--encrypt` / `-e` | Encrypt the named input file |

### Decrypt

```bash
gpg --decrypt encrypted-message                          # print to stdout
gpg --output unencrypted-message --decrypt encrypted-message   # save to file
```

---

## Signing and Verifying Files

### Sign

```bash
gpg --output message.sig --sign message       # binary signed file
gpg --output message.asc --clearsign message  # cleartext (human-readable) signature
```

### Verify

```bash
gpg --verify message.sig
gpg --output message --decrypt message.sig    # verify and extract content
```

---

## GPG Short Options

| Long | Short |
|---|---|
| `--armor` | `-a` |
| `--output` | `-o` |
| `--recipient` | `-r` |
| `--decrypt` | `-d` |
| `--encrypt` | `-e` |
| `--sign` | `-s` |

### Other Useful gpg Options

```bash
gpg --export-secret-keys --output all_private.key    # export private keys
gpg --edit-key USER-ID                               # interactive key management menu
gpg --clearsign message                              # human-readable signed file
```

### gpg-agent

`gpg-agent` is a daemon that manages GPG private keys in memory (started on demand by `gpg`).

```bash
gpg-agent --help
gpg-agent -h
```

---

## Quick Reference

```
SSH key generation:
  ssh-keygen -t ed25519          most secure
  ssh-keygen -t ecdsa -b 521
  ssh-keygen -t rsa              default if -t omitted
  ~/.ssh/id_TYPE (private)  ~/.ssh/id_TYPE.pub (public)
  ~/.ssh/known_hosts             trusted server fingerprints
  ~/.ssh/authorized_keys         on server: allowed client public keys

Key distribution:
  ssh-copy-id user@host
  ssh-keygen -R hostname         remove stale known_hosts entry

Authentication agent:
  ssh-agent /bin/bash            start agent shell
  ssh-add                        load key into memory

Server host keys: /etc/ssh/ssh_host_TYPE_key (.pub)
  private: 0600  public: 0644
  ssh-keygen -l -f FILE          view fingerprint
  sshd_config: PermitRootLogin  AllowUsers

Port tunnels:
  ssh -L LOCAL:DEST:PORT server  local tunnel
  ssh -R REMOTE:DEST:PORT server remote tunnel
  ssh -X user@host               X11 forward
  -N no command  -f background

GPG:
  gpg --gen-key                  generate key pair
  gpg --list-keys                list keyring
  gpg --fingerprint USER-ID      fingerprint
  gpg --export --armor USER-ID > file    ASCII export
  gpg --import file              import key
  gpg --gen-revoke USER-ID       create revocation cert
  gpg --import revocation.asc    apply revocation

  gpg -r RECIPIENT -a -e FILE    encrypt
  gpg -d FILE                    decrypt
  gpg -s FILE                    sign (binary)
  gpg --clearsign FILE           sign (cleartext)
  gpg --verify FILE.sig          verify

  Short: -a armor  -o output  -r recipient  -d decrypt  -e encrypt  -s sign
  ~/.gnupg/: pubring.kbx  private-keys-v1.d/  openpgp-revocs.d/  trustdb.gpg
```

---

## Exam Questions

1. What command connects as user `alice` to host `server01`? → `ssh alice@server01`
2. Where are trusted server public key fingerprints stored on the client? → `~/.ssh/known_hosts`
3. How do you remove a stale host key for `server01` from `known_hosts`? → `ssh-keygen -R server01`
4. Which key type is considered most secure for `ssh-keygen`? → `ed25519`
5. What is the default key type when `ssh-keygen` is run without `-t`? → RSA (2048 bits)
6. What file on the remote server must contain the client's public key for key-based login? → `~/.ssh/authorized_keys`
7. What is the purpose of `ssh-agent`? → It holds decrypted private keys in memory so the passphrase only needs to be entered once per session.
8. What command adds a private key to the agent? → `ssh-add`
9. What are the permissions on server host private key files in `/etc/ssh/`? → `0600` (owner read/write only)
10. What SSH option creates a local port tunnel? → `-L LOCAL_PORT:DEST_HOST:DEST_PORT`
11. What SSH option creates a remote/reverse port tunnel? → `-R REMOTE_PORT:DEST_HOST:DEST_PORT`
12. What `-N` and `-f` options do in an SSH tunnel command? → `-N` means do not execute a remote command; `-f` runs SSH in the background.
13. What `sshd_config` directive enables X11 forwarding? → `X11Forwarding`
14. What GPG command generates a key pair? → `gpg --gen-key`
15. What is the KEY-ID in GPG? → The last 8 hexadecimal digits of the public key fingerprint.
16. How do you export a public key in ASCII armored format? → `gpg --export --armor USER-ID > file`
17. What is the correct order for revoking a GPG key? → 1. Create revocation certificate (`--gen-revoke`), 2. Import it (`--import`), 3. Distribute the revoked key.
18. What GPG option produces a human-readable (cleartext) signed file? → `--clearsign`

---

## Exercises

### Exercise 1 — SSH Key Setup

Generate an Ed25519 key pair and set up key-based login to a remote host.

<details>
<summary>Answer</summary>

```bash
ssh-keygen -t ed25519          # generates ~/.ssh/id_ed25519 and id_ed25519.pub
ssh-copy-id user@remote-host   # copies public key to authorized_keys
ssh user@remote-host           # login should succeed without password
```

</details>

---

### Exercise 2 — SSH Authentication Agent

Set up the authentication agent so you only type the passphrase once per session.

<details>
<summary>Answer</summary>

```bash
ssh-agent /bin/bash            # start agent-aware shell
ssh-add                        # enter passphrase once
ssh user@host1                 # no passphrase needed
ssh user@host2                 # no passphrase needed
```

</details>

---

### Exercise 3 — Local Port Tunnel

Create a local tunnel that forwards local port 8080 to `www.gnu.org:80` through SSH server `gateway` (user `admin`). Run it in the background without opening a shell.

<details>
<summary>Answer</summary>

```bash
ssh -L 8080:www.gnu.org:80 -Nf admin@gateway
```

</details>

---

### Exercise 4 — GPG Encrypt and Decrypt

Encrypt the file `secret.txt` for recipient `alice` with ASCII armored output, then decrypt it.

<details>
<summary>Answer</summary>

```bash
gpg --output secret.txt.asc --recipient alice --armor --encrypt secret.txt
gpg --output decrypted.txt --decrypt secret.txt.asc
```

</details>

---

### Exercise 5 — GPG Key Revocation

Revoke your GPG key because your private key has been compromised.

<details>
<summary>Answer</summary>

```bash
gpg --output revoke.asc --gen-revoke YOUR-USER-ID   # create cert, select reason
gpg --import revoke.asc                              # apply revocation
gpg --list-keys                                      # confirm [revoked] shown
```

Then distribute the revoked key to correspondents and key servers.

</details>

---

*LPIC-1 Study Notes | Topic 110: Security*
