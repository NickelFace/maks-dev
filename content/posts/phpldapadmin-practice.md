---
title: "phpLDAPadmin — практика и траблшутинг"
date: 2026-04-11
description: "Установка phpLDAPadmin на Ubuntu 24.04, решение конфликта mpm_event с PHP-FPM, работа с LDAP-деревом через GUI, смена паролей и тренировочные задачи."
tags: ["Linux", "OpenLDAP", "LDAP", "phpLDAPadmin", "Apache", "PHP", "Ubuntu"]
---

Практическое руководство по развёртыванию phpLDAPadmin на Ubuntu 24.04 и работе с OpenLDAP через графический интерфейс. Для понимания команд рекомендуется прочитать [LPIC-2 210.4 — Configuring an OpenLDAP Server](/posts/lpic2-210-4-openldap/).

---

## Установка OpenLDAP на Ubuntu

### Установка slapd

```bash
sudo apt update
sudo apt install -y slapd ldap-utils
```

После установки slapd запускается автоматически, но без полноценной конфигурации. Следующий шаг — настройка через `dpkg-reconfigure`.

### Первоначальная настройка через dpkg-reconfigure

```bash
sudo dpkg-reconfigure slapd
```

| Вопрос | Ответ |
|---|---|
| Omit OpenLDAP server configuration? | `no` |
| DNS domain name | `lpiclab.com` |
| Organization name | `LPIC Lab` |
| Administrator password | `Admin1234!` |
| Database backend | MDB |
| Remove database when slapd is purged? | `no` |
| Move old database? | `yes` |

Проверь что slapd запустился и отвечает:

```bash
sudo systemctl status slapd

ldapsearch -x -H ldap://localhost \
  -D "cn=admin,dc=lpiclab,dc=com" \
  -w Admin1234! \
  -b "dc=lpiclab,dc=com"
```

Результат `result: 0 Success` с базовой записью `dc=lpiclab,dc=com` подтверждает, что всё работает.

### Типичная ошибка MDB KEYEXIST

Если при `dpkg-reconfigure` получаешь:

```
mdb_id2entry_put: mdb_put failed: MDB_KEYEXIST: Key/data pair already exists(-30799)
```

Это означает, что старые файлы базы остались в `/var/lib/ldap/`. Чиним вручную:

```bash
sudo systemctl stop slapd
sudo rm -rf /var/lib/ldap/*
sudo rm -rf /etc/ldap/slapd.d/*
sudo dpkg-reconfigure slapd
```

На этот раз обязательно отвечай "yes" на "Move old database?". Если slapd не остановился чисто:

```bash
sudo systemctl kill slapd
sleep 2
sudo rm -rf /var/lib/ldap/* /etc/ldap/slapd.d/*
sudo dpkg-reconfigure slapd
```

> **Important:** После `rm -rf /var/lib/ldap/*` база полностью пуста. Все ранее загруженные записи нужно добавлять заново через `ldapadd`.

---

## Структура LDAP-дерева на стенде

Стенд построен на базе домена `lpiclab.com`:

```
dc=lpiclab,dc=com
├── ou=People          # пользователи
│   ├── uid=jsmith
│   ├── uid=mjones
│   ├── uid=akorolev
│   └── uid=tivanova
├── ou=Groups          # группы
│   ├── cn=admins
│   ├── cn=developers
│   └── cn=hr
└── ou=Services        # сервисные аккаунты
    └── uid=svc-backup
```

| UID | Имя | Группа | gidNumber |
|---|---|---|---|
| jsmith | John Smith | admins | 1001 |
| mjones | Mary Jones | developers | 1002 |
| akorolev | Alexei Korolev | admins, developers | 1001 |
| tivanova | Tatiana Ivanova | developers, hr | 1002 |
| svc-backup | Backup Service | (сервисный) | 2001 |

| UID | Пароль |
|---|---|
| jsmith | Smith2024! |
| mjones | Jones2024! |
| admin | Admin1234! |

---

## Установка phpLDAPadmin на Ubuntu 24.04

### Установка пакетов

phpLDAPadmin не входит в стандартный репозиторий Ubuntu 24.04 в рабочем состоянии. Ставь всё за один раз:

```bash
sudo apt update
sudo apt install -y phpldapadmin php php-ldap php-xml
```

После этого Apache автоматически подхватывает конфиг phpLDAPadmin, но PHP-модуль нужно включать вручную из-за особенностей Ubuntu 24.04.

### Дополнительные пакеты PHP

На Ubuntu 24.04 Apache по умолчанию запускается с `mpm_event`, а не `mpm_prefork`. Стандартный модуль `php8.3` несовместим с `mpm_event`, поэтому нужен PHP-FPM:

```bash
sudo apt install -y php8.3-fpm
```

PHP-FPM работает как отдельный процесс и общается с Apache через FastCGI, без конфликтов с `mpm_event`.

### Настройка конфига phpLDAPadmin

```bash
sudo nano /etc/phpldapadmin/config.php
```

Найди и поправь три строки:

```php
$servers->setValue('server','host','127.0.0.1');
$servers->setValue('server','base',array('dc=lpiclab,dc=com'));
$servers->setValue('login','bind_id','cn=admin,dc=lpiclab,dc=com');
```

> **Tip:** Строки могут быть закомментированы или иметь другой домен по умолчанию. Используй `Ctrl+W` в nano для поиска по тексту.

### Настройка Apache

```bash
sudo a2enmod proxy_fcgi setenvif
sudo a2enconf php8.3-fpm phpldapadmin
sudo systemctl restart apache2 php8.3-fpm
```

Проверь что оба сервиса запустились:

```bash
sudo systemctl status apache2
sudo systemctl status php8.3-fpm
```

После этого открывай в браузере: `http://<server-ip>/phpldapadmin`

---

## Траблшутинг установки

### Ошибка 404 Not Found

Apache запущен, но не знает про phpLDAPadmin — алиас не подключён.

```bash
ls /etc/apache2/conf-available/ | grep phpldapadmin
ls /etc/apache2/conf-enabled/   | grep phpldapadmin
```

Если в `conf-available` есть файл, но в `conf-enabled` нет:

```bash
sudo a2enconf phpldapadmin
sudo systemctl reload apache2
```

Если конфига нет вообще, создай вручную:

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

### PHP-код отображается как текст

Apache не обрабатывает `.php` файлы. Проверь доступные модули:

```bash
ls /etc/apache2/mods-available/ | grep php
```

Если видишь `php8.3.load`:

```bash
sudo a2enmod php8.3
sudo systemctl restart apache2
```

Если получаешь ошибку про `mpm_event` — смотри следующий раздел.

### Конфликт mpm_event и php8.3

```
ERROR: Module mpm_event is enabled - cannot proceed due to conflicts.
```

`mpm_event` несовместим с модулем `php8.3` напрямую. Решение через PHP-FPM:

```bash
sudo apt install -y php8.3-fpm
sudo a2enmod proxy_fcgi setenvif
sudo a2enconf php8.3-fpm
sudo systemctl restart apache2 php8.3-fpm
```

> **Important:** Не пытайся отключать `mpm_event` и включать `mpm_prefork` на Ubuntu 24.04. PHP-FPM с `mpm_event` — правильный и производительный способ, именно его используют в продакшне.

---

## Работа в интерфейсе phpLDAPadmin

### Вход в систему

На странице входа вводи:

- **Login DN:** `cn=admin,dc=lpiclab,dc=com`
- **Password:** `Admin1234!`

После входа видишь левую панель с деревом каталога и правую с содержимым выбранной записи.

### Просмотр дерева каталога

В левой панели раскрой `dc=lpiclab,dc=com`. Увидишь три OU: `ou=People`, `ou=Groups`, `ou=Services`. Когда кликаешь на запись пользователя, например `uid=jsmith`, в правой панели отображаются все его атрибуты.

> **Tip:** phpLDAPadmin показывает DN каждой записи точно в том виде, в котором он используется в командах `ldapsearch`, `ldappasswd` и `ldapdelete`. Это помогает избежать опечаток при написании DN вручную.

### Создание записи через интерфейс

Выбери `ou=People` в левой панели, нажми **"Create a child entry"**. Интерфейс предложит шаблоны объектных классов:

- `inetOrgPerson` — для обычных пользователей
- `posixAccount` — для Linux-пользователей с UID/GID
- `organizationalUnit` — для OU

Заполни форму и нажми **"Create Object"**. phpLDAPadmin автоматически сформирует LDIF и отправит его на сервер.

### Редактирование атрибутов

Кликни на запись → **"Modify attribute"** → измени значение → **"Save Changes"**. Под капотом это тот же `ldapmodify` с `changetype: modify`.

---

## Смена пароля

### Через phpLDAPadmin

Кликни на запись пользователя → найди атрибут `userPassword` → нажми иконку замка или **"change password"**. Выбирай алгоритм **SSHA** — рекомендуемый вариант.

### Через ldappasswd (от имени admin)

```bash
ldappasswd -x -H ldap://localhost \
  -D "cn=admin,dc=lpiclab,dc=com" \
  -w Admin1234! \
  -s "NewPassword123!" \
  "uid=jsmith,ou=People,dc=lpiclab,dc=com"
```

### Пользователь меняет свой пароль сам

```bash
ldappasswd -x -H ldap://localhost \
  -D "uid=mjones,ou=People,dc=lpiclab,dc=com" \
  -w "Jones2024!" \
  -s "Jones2025!"
```

> **Warning:** Если получаешь `Result: No such object (32)`, указанный DN не существует в DIT. Проверь правильность пути через `ldapsearch` или в phpLDAPadmin.

### Смена пароля администратора через cn=config

Пароль `cn=admin` хранится не как запись в DIT, а в конфигурации `cn=config`. Поэтому `ldappasswd` вернёт ошибку 32. Правильный способ:

```bash
# Шаг 1: сгенерировать хэш
sudo slappasswd -s "Admin1234!"
# → {SSHA}Ab12Cd34Ef56...
```

Создай `changepass.ldif`:

```ldif
dn: olcDatabase={1}mdb,cn=config
changetype: modify
replace: olcRootPW
olcRootPW: {SSHA}Ab12Cd34Ef56...
```

```bash
# Шаг 2: применить через Unix-сокет от root
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f changepass.ldif

# Шаг 3: проверить
ldapsearch -x -H ldap://localhost \
  -D "cn=admin,dc=lpiclab,dc=com" \
  -w "Admin1234!" \
  -b "dc=lpiclab,dc=com" "(objectClass=*)"
```

> **Important:** `-Y EXTERNAL -H ldapi:///` аутентифицирует по UID процесса через Unix-сокет. Root получает права на `cn=config` без пароля. Работает только локально на сервере.

---

## Практика — пошаговый стенд

**Домен:** `lpiclab.com` · **Base DN:** `dc=lpiclab,dc=com` · **Admin DN:** `cn=admin,dc=lpiclab,dc=com`

### Шаг 1. Установка OpenLDAP

```bash
sudo apt update && sudo apt install -y slapd ldap-utils
sudo dpkg-reconfigure slapd
```

**Troubleshooting перед запуском:**

```bash
sudo systemctl status slapd
ldapsearch -x -H ldap://localhost -b "dc=lpiclab,dc=com"

# Если нужно начать чисто:
sudo systemctl stop slapd && sudo systemctl kill slapd
sleep 2
sudo rm -rf /var/lib/ldap/* /etc/ldap/slapd.d/*
sudo dpkg-reconfigure slapd
```

### Шаг 2. Базовая структура (base.ldif)

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

> **Note:** Создавай `base.ldif` в `~/` через `nano base.ldif`. `ldapadd` читает путь через флаг `-f`.

### Шаг 3. Пользователи (users.ldif)

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

# Задай нормальные пароли:
ldappasswd -x -H ldap://localhost -D "cn=admin,dc=lpiclab,dc=com" -w Admin1234! \
  -s "Smith2024!" "uid=jsmith,ou=People,dc=lpiclab,dc=com"

ldappasswd -x -H ldap://localhost -D "cn=admin,dc=lpiclab,dc=com" -w Admin1234! \
  -s "Jones2024!" "uid=mjones,ou=People,dc=lpiclab,dc=com"
```

### Шаг 4. Группы (groups.ldif)

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

### Шаг 5. Тренировочные задачи

```bash
# Поиск всех пользователей
ldapsearch -x -H ldap://localhost \
  -b "ou=People,dc=lpiclab,dc=com" "(objectClass=posixAccount)"

# Поиск по конкретному uid
ldapsearch -x -H ldap://localhost \
  -b "dc=lpiclab,dc=com" "(uid=mjones)"

# Поиск с фильтром по группе
ldapsearch -x -H ldap://localhost \
  -b "ou=Groups,dc=lpiclab,dc=com" "(cn=developers)"

# Поиск только определённых атрибутов
ldapsearch -x -H ldap://localhost \
  -b "ou=People,dc=lpiclab,dc=com" "(objectClass=inetOrgPerson)" cn mail

# Поиск всех объектов (аутентифицированный)
ldapsearch -x -H ldap://localhost \
  -D "cn=admin,dc=lpiclab,dc=com" -w "Admin1234!" \
  -b "dc=lpiclab,dc=com" "(objectClass=*)"

# Аутентифицированный поиск от имени пользователя
ldapsearch -x -H ldap://localhost \
  -D "uid=jsmith,ou=People,dc=lpiclab,dc=com" -w "Smith2024!" \
  -b "dc=lpiclab,dc=com" "(uid=jsmith)"

# Смена пароля пользователем самостоятельно
ldappasswd -x -H ldap://localhost \
  -D "uid=mjones,ou=People,dc=lpiclab,dc=com" -w "Jones2024!" \
  -s "NewJones2025!"

# Удаление записи
ldapdelete -x -H ldap://localhost \
  -D "cn=admin,dc=lpiclab,dc=com" -w Admin1234! \
  "uid=svc-backup,ou=Services,dc=lpiclab,dc=com"
```

**Изменение атрибута (modify.ldif):**

```ldif
dn: uid=akorolev,ou=People,dc=lpiclab,dc=com
changetype: modify
replace: mail
mail: alexei.korolev@lpiclab.com
```

```bash
ldapmodify -x -H ldap://localhost -D "cn=admin,dc=lpiclab,dc=com" -w Admin1234! -f modify.ldif
```

**Добавление пользователя в группу:**

```ldif
dn: cn=hr,ou=Groups,dc=lpiclab,dc=com
changetype: modify
add: memberUid
memberUid: mjones
```

### Шаг 6. Конфигурация /etc/ldap/ldap.conf

```bash
sudo apt install -y ldap-utils
sudo nano /etc/ldap/ldap.conf
```

```
BASE    dc=lpiclab,dc=com
URI     ldap://192.168.x.x
```

После этого `ldapsearch` работает без `-H` и `-b`:

```bash
ldapsearch -x "(uid=jsmith)"
```
