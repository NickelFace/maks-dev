---
title: "Lab 26 · SSH and Device Hardening"
date: 2026-09-06
description: "Replace Telnet with SSHv2, put local users behind AAA, and work through the hardening checklist that turns a lab router into something you would put in production."
tags: ["CCNA", "SSH", "AAA", "Security", "Lab"]
categories: ["CCNA"]
domain: 5
tool: "Packet Tracer"
duration: "45 min"
sources: "Jeremy's IT Lab Day 42 · Flackbox 33-1"
aliases: ["/ccna-labs/ccna-lab-33-device-security/"]
---

Telnet sends the password in cleartext. Not hashed, not obfuscated — the literal characters, in a packet anyone on the path can read. There is no configuration that makes it acceptable and no network where it should still be enabled.

Replacing it takes four commands, and this lab does that first and then works through the rest of the hardening checklist in the order that a device build actually follows.

## Topology

{{< topology cols="3" rows="2" caption="One router, one switch, one admin workstation" >}}
pc     ADMIN "10.0.10.50" at 0,0
switch SW1 "" at 1,0
router R1 "10.0.10.1" at 2,0

ADMIN — SW1
SW1 — R1
{{< /topology >}}

## Objectives

- Meet the four prerequisites for SSH and understand why each is required
- Generate an RSA key pair of an adequate size and force SSHv2
- Configure local users with privilege levels and restrict VTY access
- Enable AAA with a local fallback and explain the method-list order
- Work through the remaining hardening items and know what each defends against

---

## Part 1 — SSH

{{< step num="1" dev="R1" title="The four prerequisites — all of them, in order" open="true" >}}
```
R1(config)#hostname R1
R1(config)#ip domain-name lab.local
R1(config)#username admin privilege 15 secret Adm1n!Str0ng
R1(config)#crypto key generate rsa modulus 2048
The name for the keys will be: R1.lab.local
% Generating 2048 bit RSA keys, keys will be non-exportable...
[OK] (elapsed time was 4 seconds)
```

The order is not arbitrary. The RSA key is named `hostname.domain-name`, so **both must be set before generating it** — with the defaults, the key would be `Router.none` and IOS refuses:

```
% Please define a domain-name first.
```

**Modulus 2048 minimum.** The default when you type `crypto key generate rsa` without a modulus is 512 bits, which is trivially factorable and also **below the 768-bit floor SSHv2 requires** — so a 512-bit key silently leaves you on SSHv1. 2048 is the sane choice; 4096 costs noticeable CPU on older platforms for little practical gain.

Regenerating the key invalidates every stored host key on every client, which produces the "REMOTE HOST IDENTIFICATION HAS CHANGED" warning. Do it deliberately, not casually.

To remove and start over:

```
R1(config)#crypto key zeroize rsa
```
{{< /step >}}

{{< step num="2" dev="R1" title="Force version 2 and lock the VTY lines" >}}
```
R1(config)#ip ssh version 2
R1(config)#ip ssh time-out 60
R1(config)#ip ssh authentication-retries 3
R1(config)#line vty 0 4
R1(config-line)#transport input ssh
R1(config-line)#login local
R1(config-line)#exec-timeout 10 0
R1(config-line)#logging synchronous
R1(config-line)#end
```

**`transport input ssh` is the command that actually disables Telnet.** Everything before it enables SSH; without this line the router accepts both and an attacker simply chooses Telnet. The variants:

| Command | Effect |
|---|---|
| `transport input all` | Telnet **and** SSH — the default on older IOS |
| `transport input telnet` | Telnet only |
| **`transport input ssh`** | **SSH only — use this** |
| `transport input none` | no remote access at all |

`login local` tells the line to authenticate against the local username database rather than a line password. With `transport input ssh` this is mandatory — SSH requires a username, so a line password alone cannot work.

Check how many VTY lines the platform has and configure **all** of them. Many devices have 0–15, and configuring only 0–4 leaves eleven unprotected lines:

```
R1(config)#line vty 0 15
R1(config-line)#transport input ssh
R1(config-line)#login local
```

Restrict the source addresses too, with a standard ACL applied via `access-class` (Lab 21):

```
R1(config)#ip access-list standard MGMT-HOSTS
R1(config-std-nacl)#permit 10.0.10.0 0.0.0.255
R1(config-std-nacl)#exit
R1(config)#line vty 0 15
R1(config-line)#access-class MGMT-HOSTS in
```
{{< /step >}}

{{< verify dev="R1" cmd="show ip ssh" open="true" >}}
```
R1#show ip ssh
SSH Enabled - version 2.0
Authentication methods:publickey,keyboard-interactive,password
Authentication timeout: 60 secs; Authentication retries: 3
Minimum expected Diffie Hellman key size : 1024 bits
IOS Keys in SECSH format(ssh-rsa, base64 encoded):
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7...
```

**`version 2.0`**, not `1.99`. `1.99` means the router is willing to fall back to SSHv1, which is broken and should never be offered. If you see it, `ip ssh version 2` was not applied or the key is too small.

Then confirm Telnet is genuinely gone:

```
R1#show running-config | section line vty
line vty 0 15
 access-class MGMT-HOSTS in
 exec-timeout 10 0
 logging synchronous
 login local
 transport input ssh
```

And from the admin workstation, test both:

```
PC> telnet 10.0.10.1
Trying 10.0.10.1 ...
% Connection refused by remote host

PC> ssh -l admin 10.0.10.1
Password:
R1>
```

Telnet refused, SSH accepted. That is the pair of results that proves the change.
{{< /verify >}}

{{< verify dev="R1" cmd="show ssh and show users" >}}
```
R1#show ssh
Connection Version Mode Encryption  Hmac         State                Username
0          2.0     IN   aes256-cbc  hmac-sha1    Session started      admin
0          2.0     OUT  aes256-cbc  hmac-sha1    Session started      admin
```

Two rows per session — inbound and outbound are separately negotiated. `aes256-cbc` is the cipher actually in use, which is worth checking against your organisation's crypto policy rather than assuming.

```
R1#show users
    Line       User       Host(s)              Idle       Location
   0 con 0                idle                 00:12:04
*  2 vty 0     admin      idle                 00:00:00 10.0.10.50
```

The `*` marks your own session. Disconnect someone else's:

```
R1#clear line vty 0
```
{{< /verify >}}

---

## Part 2 — Users and privilege levels

{{< step num="3" dev="R1" title="Three accounts, three levels of access" >}}
```
R1(config)#username admin privilege 15 secret Adm1n!Str0ng
R1(config)#username netops privilege 5 secret 0psUser!24
R1(config)#username readonly privilege 1 secret R3ad0nly!9
R1(config)#privilege exec level 5 show running-config
R1(config)#privilege exec level 5 configure terminal
R1(config)#privilege exec level 5 interface
R1(config)#privilege exec level 5 shutdown
R1(config)#end
```

IOS has sixteen privilege levels, of which three are predefined:

| Level | Name | Default capability |
|---|---|---|
| **0** | — | `disable`, `enable`, `exit`, `help`, `logout` |
| **1** | user EXEC | the `>` prompt — basic `show`, `ping`, `telnet` |
| 2–14 | custom | nothing by default; you assign commands |
| **15** | privileged EXEC | everything — the `#` prompt |

Levels 2–14 start empty and you move commands into them with `privilege exec level`. The `netops` account above can view the config and bounce an interface, and nothing else.

Privilege levels are a blunt tool and worth knowing the limits of: a command granted at level 5 is granted in full, with no argument filtering. RBAC via **views** (`parser view`) or, better, per-command authorisation through TACACS+ is what production networks use. The exam expects privilege levels.

**`secret` not `password`.** `secret` is hashed; `password` is stored reversibly even with `service password-encryption`. On modern IOS you can pick the algorithm:

```
R1(config)#username admin privilege 15 algorithm-type scrypt secret Adm1n!Str0ng
```

Type 8 (PBKDF2) and type 9 (scrypt) are the current choices; type 5 (MD5) is what plain `secret` produces and is no longer considered adequate.
{{< /step >}}

{{< step num="4" dev="R1" title="AAA with a local fallback" open="true" >}}
```
R1(config)#aaa new-model
R1(config)#aaa authentication login default local
R1(config)#aaa authentication enable default enable
R1(config)#aaa authorization exec default local
R1(config)#aaa accounting exec default start-stop group tacacs+
R1(config)#end
```

**`aaa new-model` changes authentication behaviour immediately and globally.** Enable it over an SSH session with no working method configured and you lock yourself out of the device. Configure the method list in the same session, and keep a console connection open.

The three A's:

| | Question | Command |
|---|---|---|
| **Authentication** | who are you? | `aaa authentication` |
| **Authorization** | what may you do? | `aaa authorization` |
| **Accounting** | what did you do? | `aaa accounting` |

With a central server, the method list is a fallback chain evaluated left to right:

```
R1(config)#tacacs server TAC1
R1(config-server-tacacs)#address ipv4 10.0.10.200
R1(config-server-tacacs)#key T@c@csK3y
R1(config-server-tacacs)#exit
R1(config)#aaa group server tacacs+ TAC-GROUP
R1(config-sg-tacacs+)#server name TAC1
R1(config-sg-tacacs+)#exit
R1(config)#aaa authentication login default group TAC-GROUP local
```

`group TAC-GROUP local` means: try TACACS+, and **if the server is unreachable**, fall back to the local database. The distinction that catches people: the fallback fires only when the server does not answer, **not** when it answers "denied". A rejected password does not fall through to the local database, which is correct behaviour and the reason a locked-out user cannot bypass central policy.

**Always include `local` at the end of the chain.** A network where the TACACS+ server is unreachable is exactly the network you need to log into.

TACACS+ versus RADIUS, which is a guaranteed exam question:

| | TACACS+ | RADIUS |
|---|---|---|
| Standard | **Cisco** | **RFC 2865** |
| Transport | **TCP 49** | **UDP 1812/1813** (or 1645/1646) |
| Encryption | **entire payload** | **password only** |
| AAA separation | **all three independent** | authentication and authorization **combined** |
| Best for | **device administration** | **network access (802.1X)** |

TACACS+ separates authorization from authentication, which is what makes per-command authorization possible. RADIUS combines them, which is why it suits network access control where the decision is a single yes/no.
{{< /step >}}

---

## Part 3 — The rest of the checklist

{{< step num="5" dev="R1" title="Everything else a build should include" >}}
```
R1(config)#service password-encryption
R1(config)#no service password-recovery
R1(config)#banner motd ^
***********************************************************
  AUTHORISED ACCESS ONLY
  This system is monitored. Disconnect immediately if you
  are not an authorised user.
***********************************************************
^
R1(config)#login block-for 120 attempts 4 within 60
R1(config)#login on-failure log
R1(config)#login on-success log
R1(config)#security passwords min-length 10
R1(config)#no ip http server
R1(config)#no ip http secure-server
R1(config)#no cdp run
R1(config)#end
```

Item by item, with what each actually defends against:

**`login block-for 120 attempts 4 within 60`** — four failed logins in sixty seconds and the router refuses all login attempts for two minutes. This is the single most effective line here: it turns an online password-guessing attack from thousands of attempts per minute into a handful.

Exempt the management subnet so an operator's typo does not lock out the whole team:

```
R1(config)#login quiet-mode access-class MGMT-HOSTS
```

**The banner wording matters legally.** "Welcome" has been argued in court as an invitation. State that access is restricted and monitored, and say nothing about what the device is or who owns it — a banner naming the organisation and the platform is free reconnaissance.

The delimiter is the character after `banner motd`; the text may not contain it.

**`no service password-recovery`** blocks the config-register-0x2142 procedure from Lab 01. It is genuine protection for a device in a physically insecure location, and it means a forgotten password requires wiping the device entirely. Understand that trade-off before enabling it.

**`no ip http server`** — the web management interface has a long history of vulnerabilities and is almost never used. If it is needed, use `ip http secure-server` and restrict it with `ip http access-class`.

**`no cdp run`** on internet-facing and untrusted interfaces (Lab 14). Keep it on internal infrastructure links where it earns its keep.

Two more worth adding:

```
R1(config)#exception crashinfo file flash:crashinfo
R1(config)#archive
R1(config-archive)#log config
R1(config-archive-log-cfg)#logging enable
R1(config-archive-log-cfg)#notify syslog
```

`archive log config` records **every configuration command** with the user and source address that entered it, and ships it to syslog. It is the closest thing IOS has to an audit trail without a TACACS+ server.
{{< /step >}}

{{< verify dev="R1" cmd="show login and archive log config all" open="true" >}}
```
R1#show login
     A default login delay of 1 second is applied.
     No Quiet-Mode access list has been configured.

     Router enabled to watch for login Attacks.
     If more than 4 login failures occur in 60 seconds or less,
     logins will be disabled for 120 seconds.

     Router presently in Normal-Mode.
     Current Watch Window
        Time remaining: 41 seconds.
        Login failures: 1, Login failures since last successful login 1.
```

`Normal-Mode` is accepting logins; `Quiet-Mode` means the threshold tripped and it is blocking. Failed attempts are counted in the watch window shown.

Force it into quiet mode with four bad passwords and watch:

```
R1#show login failures
Total failed logins: 4
Detailed information about last 50 failures

    Username        SourceIPAddr    lPort Count TimeStamp
    admin           10.0.10.77      22    4     15:12:44 AEST Sat Sep 6 2026
```

Source address and timestamp per failure — enough to feed into a syslog alert.

And the configuration audit trail:

```
R1#show archive log config all
 idx   sess           user@line      Logged command
    1     1        admin@vty0        |  interface GigabitEthernet0/1
    2     1        admin@vty0        |   shutdown
    3     1        admin@vty0        |   no shutdown
```
{{< /verify >}}

{{< verify dev="R1" cmd="show running-config | include service|no ip http|banner" >}}
The hardening audit, in one command:

```
R1#show running-config | include service password|no service|no ip http|login block|security passwords
service password-encryption
no service password-recovery
no ip http server
no ip http secure-server
login block-for 120 attempts 4 within 60
security passwords min-length 10
```

Six lines. Run this on every device in a build and any missing line is a finding.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| `% Please define a domain-name first` | `ip domain-name` missing | set hostname and domain, then generate the key |
| SSH shows version 1.99 | key too small, or `ip ssh version 2` missing | regenerate at 2048; force v2 |
| SSH refused, Telnet works | `transport input ssh` missing | check `show run \| section line vty` |
| Cannot log in over SSH | `login local` missing, or no username | SSH requires a username |
| Locked out after `aaa new-model` | no method list configured | console in; configure `aaa authentication login default local` |
| TACACS+ down, nobody can log in | no `local` fallback in the method list | append `local` |
| Only some VTY sessions are secured | configured `vty 0 4` on a device with 0–15 | configure all lines |
| Forgot the password, cannot recover | `no service password-recovery` | the device must be wiped |

## Exam notes

- SSH prerequisites: **hostname**, **ip domain-name**, **RSA key (2048)**, **a local user**. Then `transport input ssh`.
- The key is named `hostname.domain-name` — both must exist before generating it.
- **`transport input ssh`** is what disables Telnet. `ip ssh version 2` forces v2; `1.99` means fallback is still offered.
- SSH is **TCP 22**, Telnet **TCP 23**.
- `secret` is hashed, `password` is not. `service password-encryption` is type 7 — reversible.
- Privilege levels: **0**, **1** (user EXEC), 2–14 custom, **15** (privileged EXEC).
- `aaa new-model` takes effect immediately — configure the method list in the same session.
- Method lists fall back only when the server is **unreachable**, not when it denies. Always end with `local`.
- **TACACS+**: Cisco, **TCP 49**, encrypts the **whole payload**, separates all three A's — device administration.
- **RADIUS**: RFC, **UDP 1812/1813**, encrypts the **password only**, combines authn and authz — network access.

---

*Sources: Jeremy's IT Lab Day 42 · Flackbox CCNA Lab Guide 33-1 · verified in Packet Tracer 8.2.*
