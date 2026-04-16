---
title: "phpLDAPadmin — Practice and Troubleshooting"
date: 2026-02-24
description: "Installing phpLDAPadmin on Ubuntu 24.04, resolving the mpm_event conflict with PHP-FPM, working with the LDAP tree through the GUI, changing passwords, and hands-on exercises."
tags: ["Linux", "OpenLDAP", "LDAP", "phpLDAPadmin", "Apache", "PHP", "Ubuntu"]
lang_pair: "/posts/ru/phpldapadmin-practice/"
---

A practical guide to deploying phpLDAPadmin on Ubuntu 24.04 and managing OpenLDAP through a graphical interface. For command-line background, see [LPIC-2 210.4 — Configuring an OpenLDAP Server](/posts/lpic2-210-4-openldap/).

---

## Installing OpenLDAP on Ubuntu

### Installing slapd

```bash
sudo apt update
sudo apt install -y slapd ldap-utils
```

After installation slapd starts automatically but without a complete configuration. The next step is to configure it via `dpkg-reconfigure`.

### Initial setup with dpkg-reconfigure

```bash
sudo dpkg-reconfigure slapd
```

| Prompt | Answer |
|---|---|
| Omit OpenLDAP server configuration? | `no` |
| DNS domain name | `lpiclab.com` |
| Organization name | `LPIC Lab` |
| Administrator password | `Admin1234!` |
| Database backend | MDB |
| Remove database when slapd is purged? | `no` |
| Move old database? | `yes` |

Verify that slapd is running and responding:

```bash
sudo systemctl status slapd

ldapsearch -x -H ldap://localhost \
  -D "cn=admin,dc=lpiclab,dc=com" \
  -w Admin1234! \
  -b "dc=lpiclab,dc=com"
```

`result: 0 Success` with the base entry `dc=lpiclab,dc=com` confirms everything is working.

### Common error: MDB KEYEXIST

If `dpkg-reconfigure` produces:

```
mdb_id2entry_put: mdb_put failed: MDB_KEYEXIST: Key/data pair already exists(-30799)
```

Old database files are left in `/var/lib/ldap/`. Fix manually:

```bash
sudo systemctl stop slapd
sudo rm -rf /var/lib/ldap/*
sudo rm -rf /etc/ldap/slapd.d/*
sudo dpkg-reconfigure slapd
```

Answer "yes" to "Move old database?" this time. If slapd did not stop cleanly:

```bash
sudo systemctl kill slapd
sleep 2
sudo rm -rf /var/lib/ldap/* /etc/ldap/slapd.d/*
sudo dpkg-reconfigure slapd
```

> **Important:** After `rm -rf /var/lib/ldap/*` the database is completely empty. All previously loaded entries must be re-added with `ldapadd`.

---

## LDAP Directory Structure

The lab is built on the `lpiclab.com` domain:

```
dc=lpiclab,dc=com
├── ou=People          # users
│   ├── uid=jsmith
│   ├── uid=mjones
│   ├── uid=akorolev
│   └── uid=tivanova
├── ou=Groups          # groups
│   ├── cn=admins
│   ├── cn=developers
│   └── cn=hr
└── ou=Services        # service accounts
    └── uid=svc-backup
```

| UID | Name | Group | gidNumber |
|---|---|---|---|
| jsmith | John Smith | admins | 1001 |
| mjones | Mary Jones | developers | 1002 |
| akorolev | Alexei Korolev | admins, developers | 1001 |
| tivanova | Tatiana Ivanova | developers, hr | 1002 |
| svc-backup | Backup Service | (service) | 2001 |

| UID | Password |
|---|---|
| jsmith | Smith2024! |
| mjones | Jones2024! |
| admin | Admin1234! |

---

## Installing phpLDAPadmin on Ubuntu 24.04

### Installing packages

phpLDAPadmin is not in the standard Ubuntu 24.04 repository in a working state. Install everything at once:

```bash
sudo apt update
sudo apt install -y phpldapadmin php php-ldap php-xml
```

Apache will automatically pick up the phpLDAPadmin config, but the PHP module needs to be enabled manually due to Ubuntu 24.04 specifics.

### Additional PHP packages

On Ubuntu 24.04 Apache runs with `mpm_event` by default, not `mpm_prefork`. The standard `php8.3` module is incompatible with `mpm_event`, so PHP-FPM is required:

```bash
sudo apt install -y php8.3-fpm
```

PHP-FPM runs as a separate process and communicates with Apache via FastCGI, avoiding conflicts with `mpm_event`.

### Configuring phpLDAPadmin

```bash
sudo nano /etc/phpldapadmin/config.php
```

Find and update three lines:

```php
$servers->setValue('server','host','127.0.0.1');
$servers->setValue('server','base',array('dc=lpiclab,dc=com'));
$servers->setValue('login','bind_id','cn=admin,dc=lpiclab,dc=com');
```

> **Tip:** Lines may be commented out or have a different default domain. Use `Ctrl+W` in nano to search.

### Configuring Apache

```bash
sudo a2enmod proxy_fcgi setenvif
sudo a2enconf php8.3-fpm phpldapadmin
sudo systemctl restart apache2 php8.3-fpm
```

Verify both services are running:

```bash
sudo systemctl status apache2
sudo systemctl status php8.3-fpm
```

Then open in a browser: `http://<server-ip>/phpldapadmin`

---

## Troubleshooting

### 404 Not Found

Apache is running but does not know about phpLDAPadmin — the alias is not loaded.

```bash
ls /etc/apache2/conf-available/ | grep phpldapadmin
ls /etc/apache2/conf-enabled/   | grep phpldapadmin
```

If the file exists in `conf-available` but not in `conf-enabled`:

```bash
sudo a2enconf phpldapadmin
sudo systemctl reload apache2
```

If the config does not exist at all, create it manually:

```bash
sudo nano /etc/apache2/conf-available/phpldapadmin.conf
```

```apache
Alias /phpldapadmin /usr/share/phpldapadmin/htdocs

<Directory /usr/share/phpldapadmin/htdocs>
    DirectoryIndex index.php
    Options +FollowSymLinks
    AllowOverride None
    Require all granted
</Directory>
```

```bash
sudo a2enconf phpldapadmin
sudo systemctl reload apache2
```

### PHP code renders as plain text

Apache is not processing `.php` files. Check available modules:

```bash
ls /etc/apache2/mods-available/ | grep php
```

If `php8.3.load` is listed:

```bash
sudo a2enmod php8.3
sudo systemctl restart apache2
```

If you get an error about `mpm_event`, see the next section.

### mpm_event and php8.3 conflict

```
ERROR: Module mpm_event is enabled - cannot proceed due to conflicts.
```

`mpm_event` is incompatible with the `php8.3` module directly. Solution via PHP-FPM:

```bash
sudo apt install -y php8.3-fpm
sudo a2enmod proxy_fcgi setenvif
sudo a2enconf php8.3-fpm
sudo systemctl restart apache2 php8.3-fpm
```

> **Important:** Do not try to disable `mpm_event` and enable `mpm_prefork` on Ubuntu 24.04. PHP-FPM with `mpm_event` is the correct, production-grade approach.

---

## Using the phpLDAPadmin Interface

### Logging in

On the login page enter:

- **Login DN:** `cn=admin,dc=lpiclab,dc=com`
- **Password:** `Admin1234!`

After login you see the left panel with the directory tree and the right panel with the selected entry's attributes.

### Browsing the directory tree

Expand `dc=lpiclab,dc=com` in the left panel. You will see three OUs: `ou=People`, `ou=Groups`, `ou=Services`. Clicking a user entry such as `uid=jsmith` shows all its attributes in the right panel.

> **Tip:** phpLDAPadmin displays each entry's DN exactly as it is used in `ldapsearch`, `ldappasswd`, and `ldapdelete` commands — helpful for avoiding typos when writing DNs by hand.

### Creating an entry

Select `ou=People` in the left panel and click **"Create a child entry"**. The interface offers object class templates:

- `inetOrgPerson` — for regular users
- `posixAccount` — for Linux users with UID/GID
- `organizationalUnit` — for OUs

Fill in the form and click **"Create Object"**. phpLDAPadmin generates the LDIF and submits it to the server automatically.

### Editing attributes

Click an entry → **"Modify attribute"** → change the value → **"Save Changes"**. Under the hood this is the same as `ldapmodify` with `changetype: modify`.

---

## Changing Passwords

### Via phpLDAPadmin

Click a user entry → find the `userPassword` attribute → click the lock icon or **"change password"**. Select **SSHA** as the algorithm — it is the recommended choice.

### Via ldappasswd (as admin)

```bash
ldappasswd -x -H ldap://localhost \
  -D "cn=admin,dc=lpiclab,dc=com" \
  -w Admin1234! \
  -s "NewPassword123!" \
  "uid=jsmith,ou=People,dc=lpiclab,dc=com"
```

### User changes their own password

```bash
ldappasswd -x -H ldap://localhost \
  -D "uid=mjones,ou=People,dc=lpiclab,dc=com" \
  -w "Jones2024!" \
  -s "Jones2025!"
```

> **Warning:** If you get `Result: No such object (32)`, the specified DN does not exist in the DIT. Verify the path with `ldapsearch` or in phpLDAPadmin.

### Changing the admin password via cn=config

The `cn=admin` password is stored not as a DIT entry but in `cn=config`. Running `ldappasswd` against it will return error 32. The correct approach:

```bash
# Step 1: generate the hash
sudo slappasswd -s "Admin1234!"
# → {SSHA}Ab12Cd34Ef56...
```

Create `changepass.ldif`:

```ldif
dn: olcDatabase={1}mdb,cn=config
changetype: modify
replace: olcRootPW
olcRootPW: {SSHA}Ab12Cd34Ef56...
```

```bash
# Step 2: apply via Unix socket as root
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f changepass.ldif

# Step 3: verify
ldapsearch -x -H ldap://localhost \
  -D "cn=admin,dc=lpiclab,dc=com" \
  -w "Admin1234!" \
  -b "dc=lpiclab,dc=com" "(objectClass=*)"
```

> **Important:** `-Y EXTERNAL -H ldapi:///` authenticates by process UID via the Unix socket. Root gets access to `cn=config` without a password. Works only locally on the server.

---

## Hands-on Lab

**Domain:** `lpiclab.com` · **Base DN:** `dc=lpiclab,dc=com` · **Admin DN:** `cn=admin,dc=lpiclab,dc=com`

### Step 1. Install OpenLDAP

```bash
sudo apt update && sudo apt install -y slapd ldap-utils
sudo dpkg-reconfigure slapd
```

**Troubleshooting before proceeding:**

```bash
sudo systemctl status slapd
ldapsearch -x -H ldap://localhost -b "dc=lpiclab,dc=com"

# If you need a clean start:
sudo systemctl stop slapd && sudo systemctl kill slapd
sleep 2
sudo rm -rf /var/lib/ldap/* /etc/ldap/slapd.d/*
sudo dpkg-reconfigure slapd
```

### Step 2. Base structure (base.ldif)

```ldif
dn: ou=People,dc=lpiclab,dc=com
objectClass: organizationalUnit
ou: People

dn: ou=Groups,dc=lpiclab,dc=com
objectClass: organizationalUnit
ou: Groups

dn: ou=Services,dc=lpiclab,dc=com
objectClass: organizationalUnit
ou: Services
```

```bash
ldapadd -x -H ldap://localhost -D "cn=admin,dc=lpiclab,dc=com" -w Admin1234! -f base.ldif
```

> **Note:** Create `base.ldif` in `~/` with `nano base.ldif`. `ldapadd` reads the path via the `-f` flag.

### Step 3. Users (users.ldif)

```ldif
dn: uid=jsmith,ou=People,dc=lpiclab,dc=com
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: shadowAccount
uid: jsmith
cn: John Smith
sn: Smith
givenName: John
mail: jsmith@lpiclab.com
uidNumber: 1001
gidNumber: 1001
homeDirectory: /home/jsmith
loginShell: /bin/bash
userPassword: {SSHA}changeme

dn: uid=mjones,ou=People,dc=lpiclab,dc=com
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: shadowAccount
uid: mjones
cn: Mary Jones
sn: Jones
givenName: Mary
mail: mjones@lpiclab.com
uidNumber: 1002
gidNumber: 1002
homeDirectory: /home/mjones
loginShell: /bin/bash
userPassword: {SSHA}changeme

dn: uid=akorolev,ou=People,dc=lpiclab,dc=com
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: shadowAccount
uid: akorolev
cn: Alexei Korolev
sn: Korolev
givenName: Alexei
mail: akorolev@lpiclab.com
uidNumber: 1003
gidNumber: 1001
homeDirectory: /home/akorolev
loginShell: /bin/bash
userPassword: {SSHA}changeme

dn: uid=tivanova,ou=People,dc=lpiclab,dc=com
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: shadowAccount
uid: tivanova
cn: Tatiana Ivanova
sn: Ivanova
givenName: Tatiana
mail: tivanova@lpiclab.com
uidNumber: 1004
gidNumber: 1002
homeDirectory: /home/tivanova
loginShell: /bin/bash
userPassword: {SSHA}changeme

dn: uid=svc-backup,ou=Services,dc=lpiclab,dc=com
objectClass: inetOrgPerson
objectClass: posixAccount
uid: svc-backup
cn: Backup Service
sn: Service
uidNumber: 2001
gidNumber: 2001
homeDirectory: /var/backup
loginShell: /sbin/nologin
userPassword: {SSHA}changeme
```

```bash
ldapadd -x -H ldap://localhost -D "cn=admin,dc=lpiclab,dc=com" -w Admin1234! -f users.ldif

# Set proper passwords:
ldappasswd -x -H ldap://localhost -D "cn=admin,dc=lpiclab,dc=com" -w Admin1234! \
  -s "Smith2024!" "uid=jsmith,ou=People,dc=lpiclab,dc=com"

ldappasswd -x -H ldap://localhost -D "cn=admin,dc=lpiclab,dc=com" -w Admin1234! \
  -s "Jones2024!" "uid=mjones,ou=People,dc=lpiclab,dc=com"
```

### Step 4. Groups (groups.ldif)

```ldif
dn: cn=admins,ou=Groups,dc=lpiclab,dc=com
objectClass: posixGroup
cn: admins
gidNumber: 1001
memberUid: jsmith
memberUid: akorolev

dn: cn=developers,ou=Groups,dc=lpiclab,dc=com
objectClass: posixGroup
cn: developers
gidNumber: 1002
memberUid: mjones
memberUid: tivanova
memberUid: akorolev

dn: cn=hr,ou=Groups,dc=lpiclab,dc=com
objectClass: posixGroup
cn: hr
gidNumber: 1003
memberUid: tivanova
```

```bash
ldapadd -x -H ldap://localhost -D "cn=admin,dc=lpiclab,dc=com" -w Admin1234! -f groups.ldif
```

### Step 5. Practice tasks

```bash
# Search all users
ldapsearch -x -H ldap://localhost \
  -b "ou=People,dc=lpiclab,dc=com" "(objectClass=posixAccount)"

# Search by specific uid
ldapsearch -x -H ldap://localhost \
  -b "dc=lpiclab,dc=com" "(uid=mjones)"

# Search with group filter
ldapsearch -x -H ldap://localhost \
  -b "ou=Groups,dc=lpiclab,dc=com" "(cn=developers)"

# Return specific attributes only
ldapsearch -x -H ldap://localhost \
  -b "ou=People,dc=lpiclab,dc=com" "(objectClass=inetOrgPerson)" cn mail

# Authenticated search as admin
ldapsearch -x -H ldap://localhost \
  -D "cn=admin,dc=lpiclab,dc=com" -w "Admin1234!" \
  -b "dc=lpiclab,dc=com" "(objectClass=*)"

# Authenticated search as a regular user
ldapsearch -x -H ldap://localhost \
  -D "uid=jsmith,ou=People,dc=lpiclab,dc=com" -w "Smith2024!" \
  -b "dc=lpiclab,dc=com" "(uid=jsmith)"

# User changes their own password
ldappasswd -x -H ldap://localhost \
  -D "uid=mjones,ou=People,dc=lpiclab,dc=com" -w "Jones2024!" \
  -s "NewJones2025!"

# Delete an entry
ldapdelete -x -H ldap://localhost \
  -D "cn=admin,dc=lpiclab,dc=com" -w Admin1234! \
  "uid=svc-backup,ou=Services,dc=lpiclab,dc=com"
```

**Modify an attribute (modify.ldif):**

```ldif
dn: uid=akorolev,ou=People,dc=lpiclab,dc=com
changetype: modify
replace: mail
mail: alexei.korolev@lpiclab.com
```

```bash
ldapmodify -x -H ldap://localhost -D "cn=admin,dc=lpiclab,dc=com" -w Admin1234! -f modify.ldif
```

**Add a user to a group:**

```ldif
dn: cn=hr,ou=Groups,dc=lpiclab,dc=com
changetype: modify
add: memberUid
memberUid: mjones
```

### Step 6. Configure /etc/ldap/ldap.conf

```bash
sudo apt install -y ldap-utils
sudo nano /etc/ldap/ldap.conf
```

```
BASE    dc=lpiclab,dc=com
URI     ldap://192.168.x.x
```

After this `ldapsearch` works without `-H` and `-b`:

```bash
ldapsearch -x "(uid=jsmith)"
```
