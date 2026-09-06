---
title: "LPIC-2 210.4 Configuring an OpenLDAP Server"
date: 2026-02-23
description: "Конфигурация OpenLDAP slapd (slapd.conf vs slapd-config/LDIF), distinguished names, серверные утилиты (slapadd/slapcat/slapindex/slappasswd), ACL, настройка TLS, интеграция клиентов с NSLCD и PAM. Тема экзамена LPIC-2 210.4."
tags: ["Linux", "LPIC-2", "OpenLDAP", "LDAP", "slapd", "directory server"]
categories: ["LPIC-2"]
page_lang: "ru"
lang_pair: "/posts/lpic2/lpic2-210-4-openldap/"
pagefind_ignore: true
build:
  list: never
  render: always
---

> **Тема экзамена 210.4** — Configuring an OpenLDAP Server (вес: 4). Охватывает установку и настройку демона slapd, управление базой данных LDAP, контроль доступа, TLS и интеграцию клиентов Linux.

---

## Что такое OpenLDAP

OpenLDAP — наиболее популярная реализация LDAP в мире Linux. Основной серверный процесс, **`slapd` (Standalone LDAP Daemon)**, по умолчанию слушает на порту **389**. Основное применение: централизованная аутентификация пользователей в Linux-сети — аналог Microsoft Active Directory для Linux.

LDAP оптимизирован для **частых чтений и редких записей**.

---

## Структура каталога LDAP

Каталог построен в виде иерархического дерева, аналогичного DNS:

```ascii
dc=example,dc=com
    ├── ou=People
    │     ├── uid=alice
    │     └── uid=bob
    └── ou=Groups
          └── cn=admins
```

### Типы объектов:

- **Учётные записи пользователей** — для аутентификации и входа в Unix
- **Организационные единицы (ou)** — папки для группировки объектов по отделу, стране, типу
- **Группы** — для назначения прав доступа
- **Компьютеры** — инвентаризация оборудования
- **Контакты / Каталоги электронной почты** — адресные книги

### Аббревиатуры LDAP:

| Аббревиатура | Полное название | Пример |
|---|---|---|
| `cn` | Common Name | `cn=admin` |
| `dc` | Domain Component | `dc=example`, `dc=com` |
| `ou` | Organizational Unit | `ou=users` |
| `uid` | User ID | `uid=jdoe` |
| `o` | Organization | `o=MyCompany` |
| `sn` | Surname | `sn=Doe` |
| `c` | Country | `c=US` |
| `dn` | Distinguished Name | полный путь к объекту |

> LDAP использует camelCase для классов объектов: `inetOrgPerson`, `posixAccount`, `organizationalUnit`.

---

## Установка

```bash
# Debian/Ubuntu
apt install slapd ldap-utils

# Red Hat/CentOS
yum install openldap-servers openldap-clients
```

После установки `slapd` запускается автоматически с минимальной конфигурацией. Для интерактивной перенастройки:

```bash
dpkg-reconfigure slapd
```

Просмотр текущей конфигурации:
```bash
slapcat
```

Открыть порт 389 в UFW:
```bash
ufw allow ldap
```

---

## Distinguished Names

**DN (Distinguished Name)** однозначно идентифицирует запись в дереве. Он начинается с наиболее конкретного атрибута и переходит к более общим:

```
uid=donpezet,ou=users,dc=lpiclab,dc=com
```

**RDN (Relative Distinguished Name)** — крайний левый компонент DN, идентифицирующий запись среди соседних объектов.

Если имя содержит запятую, её необходимо экранировать:
```
CN=Supergroup,O=Crosby\, Stills\, Nash and Young,C=US
```

---

## Конфигурация slapd

OpenLDAP поддерживает два метода конфигурации.

### Метод 1: slapd.conf (устаревший)

Вся конфигурация в едином текстовом файле `/etc/slapd.conf` (или `/etc/openldap/slapd.conf`). Требуются три минимальные директивы:

```
suffix          "dc=example,dc=com"
rootdn          "cn=Manager,dc=example,dc=com"
rootpw          {SHA}<password-hash>
directory       /var/lib/ldap
```

- `suffix` — корень дерева LDAP (обычно доменное имя организации)
- `rootdn` — учётная запись с полными правами на весь каталог
- `rootpw` — пароль администратора (в современных версиях хранится зашифрованным)

> `slapd.conf` устарел с OpenLDAP 2.3. Для экзамена необходимо знать оба метода.

### Метод 2: slapd-config (актуальный)

Начиная с OpenLDAP 2.3, конфигурация хранится в виде LDIF-файлов в `/etc/openldap/slapd.d/`. Эти файлы **нельзя редактировать вручную** — только через `ldapadd`, `ldapdelete`, `ldapmodify`. Ключевое преимущество: изменения применяются **без перезапуска slapd**.

Структура каталога `slapd.d`:
```ascii
/etc/openldap/slapd.d/
├── cn=config/
│   ├── cn=module{0}.ldif
│   ├── cn=schema/
│   │   ├── cn={0}core.ldif
│   │   ├── cn={1}cosine.ldif
│   │   └── cn={2}inetorgperson.ldif
│   ├── olcDatabase={0}config.ldif
│   └── olcDatabase={1}hdb.ldif
└── cn=config.ldif
```

Пример LDIF конфигурации базы данных:
```ldif
dn: olcDatabase=hdb,cn=config
objectClass: olcDatabaseConfig
objectClass: olcHdbConfig
olcDatabase: hdb
olcSuffix: dc=example,dc=com
olcRootDN: cn=Manager,dc=example,dc=com
olcRootPW: {SSHA}xEleXlHqbSyi2FkmObnQ5m4fReBrjwGb
olcDbDirectory: /var/lib/ldap
```

### Значения olcLogLevel:

| Уровень | Имя | Описание |
|---|---|---|
| 1 | trace | Вызовы функций |
| 8 | conns | Управление соединениями |
| 32 | filter | Обработка фильтров поиска |
| 128 | ACL | Обработка ACL |
| 256 | stats | Статистика соединений и операций |
| 32768 | none | Только критические сообщения |

```ldif
olcLogLevel: -1       # максимальное логирование
olcLogLevel: stats    # рекомендуется для production
olcLogLevel: conns filter    # только соединения и фильтры
```

### Ключевые атрибуты slapd-config:

| Атрибут | Назначение |
|---|---|
| `olcSuffix` | Корень дерева LDAP |
| `olcRootDN` | DN администратора |
| `olcRootPW` | Пароль администратора |
| `olcDbDirectory` | Путь к файлам базы данных |
| `olcAccess` | Правила ACL |
| `olcLogLevel` | Уровень логирования |

---

## Формат LDIF

LDIF (LDAP Data Interchange Format) — текстовый формат для работы с каталогом. Записи разделяются пустыми строками. Строки комментариев начинаются с `#`.

```ldif
# Комментарий
dn: cn=John Doe,dc=example,dc=com
cn: John Doe
objectClass: person
sn: Doe
```

> Пробел в конце строки считается частью значения атрибута — это приводит к ошибкам импорта с непонятными сообщениями.

### Операции changetype:

| changetype | Действие |
|---|---|
| `add` | Добавить новую запись |
| `delete` | Удалить запись |
| `modify` | Изменить атрибуты записи |
| `modrdn` | Переименовать запись |

```ldif
# Пример изменения
dn: uid=alice,ou=People,dc=example,dc=com
changetype: modify
replace: telephoneNumber
telephoneNumber: +1-555-9999
-
add: mail
mail: alice@example.com
```

---

## Создание объектов

### Организационные единицы (в первую очередь):

```ldif
dn: ou=users,dc=lab,dc=example,dc=com
objectClass: organizationalUnit
ou: users

dn: ou=groups,dc=lab,dc=example,dc=com
objectClass: organizationalUnit
ou: groups
```

```bash
ldapadd -x -D "cn=admin,dc=lab,dc=example,dc=com" -W -f ou.ldif
```

### Учётные записи пользователей:

```ldif
dn: uid=jdoe,ou=users,dc=lab,dc=example,dc=com
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: shadowAccount
cn: John Doe
sn: Doe
uid: jdoe
userPassword: {SSHA}hash
loginShell: /bin/bash
uidNumber: 10001
gidNumber: 10001
homeDirectory: /home/jdoe
```

### Группы:

```ldif
dn: cn=jdoe,ou=groups,dc=lab,dc=example,dc=com
objectClass: posixGroup
cn: jdoe
gidNumber: 10001
```

---

## Серверные утилиты

Работают непосредственно с файлами базы данных. **slapd должен быть остановлен** перед их запуском.

### slapadd

Добавляет объекты непосредственно в базу данных из LDIF-файла:

```bash
systemctl stop slapd
slapadd -l users.ldif
systemctl start slapd
```

### slapcat

Экспортирует содержимое базы данных в LDIF (резервное копирование, просмотр):

```bash
slapcat               # вывод на экран
slapcat -l all.ldif   # сохранить в файл
```

### slapindex

Перестраивает индексы базы данных (необходимо после ручных изменений файлов базы данных):

```bash
systemctl stop slapd
slapindex             # перестроить все
slapindex uid         # перестроить индекс конкретного атрибута
systemctl start slapd
```

### slappasswd

Генерирует хеш зашифрованного пароля для использования в LDIF-файлах и конфигурации:

```bash
slappasswd
# Ввести пароль дважды → возвращает: {SSHA}hash
```

---

## Контроль доступа (ACL)

По умолчанию все клиенты могут читать каталог. Пользователь `olcRootDN` всегда имеет полные права вне зависимости от настроек ACL.

Доступ к атрибутам управляется через `olcAccess`. Правила оцениваются по порядку — первое совпадение побеждает.

```ldif
# Защита паролей
olcAccess: to attrs=userPassword
  by self write
  by anonymous auth
  by * none

# Разрешить пользователям редактировать собственные данные
olcAccess: to *
  by self write
  by users read
  by * none
```

- `by self write` — пользователь может менять собственный пароль
- `by anonymous auth` — анонимные пользователи могут проходить аутентификацию (сравнение хешей), но не могут читать пароль
- `by * none` — всем остальным отказано

> Правила ACL читаются сверху вниз. Если ни одно правило не совпало, доступ по умолчанию запрещён.

---

## Схемы и классы объектов

**Схема** определяет допустимые значения `objectClass` и атрибуты.

- **Object ID** — числовой идентификатор, присваивается однократно
- **Атрибут** — конкретное значение, привязанное к объекту
- **Класс объекта** — шаблон с набором атрибутов

Наиболее популярная схема: **`inetOrgPerson`** — реализует «Белые страницы»: имена, адреса, электронную почту, телефоны.

Файлы схем: `/etc/openldap/schema/`
- `core.ldif`, `cosine.ldif`, `inetorgperson.ldif`, `nis.ldif`

> Объект может принадлежать нескольким `objectClass` одновременно. `objectClass: top` обязателен для всех объектов.

### Три objectClass для пользователя Unix:

| objectClass | Назначение |
|---|---|
| `inetOrgPerson` | Персональные данные (cn, mail, телефон) |
| `posixAccount` | Данные Unix (uid, gid, shell, homeDirectory) |
| `shadowAccount` | Атрибуты теневого пароля |

---

## TLS в OpenLDAP

По умолчанию OpenLDAP передаёт данные открытым текстом. TLS добавляется через **SASL** (Simple Authentication and Security Layer).

### Три необходимых файла TLS:

1. Сертификат CA (которому доверяет сервер)
2. Закрытый ключ сервера
3. Публичный сертификат сервера (распространяется клиентам)

### Генерация сертификатов:

```bash
# Шаг 1: Создать закрытый ключ
openssl genrsa -aes128 -out openldap.key 2048

# Удалить парольную фразу (необходимо для автоматического запуска)
openssl rsa -in openldap.key -out openldap.key

# Шаг 2: Создать CSR
openssl req -new -days 7300 -key openldap.key -out openldap.csr
# Common Name должно совпадать с именем хоста LDAP-сервера

# Шаг 3: Самоподписанный сертификат
openssl x509 -req -in openldap.csr \
  -out openldap.crt -signkey openldap.key -days 7300
```

### Разместить сертификаты:

```bash
cp openldap.key openldap.crt /etc/ldap/sasl2/
cp /etc/ssl/certs/ca-certificates.crt /etc/ldap/sasl2/
chown openldap: /etc/ldap/sasl2/*
```

### Применить TLS через LDIF:

```ldif
dn: cn=config
changetype: modify
replace: olcTLSCACertificateFile
olcTLSCACertificateFile: /etc/ldap/sasl2/ca-certificates.crt
-
replace: olcTLSCertificateFile
olcTLSCertificateFile: /etc/ldap/sasl2/openldap.crt
-
replace: olcTLSCertificateKeyFile
olcTLSCertificateKeyFile: /etc/ldap/sasl2/openldap.key
```

```bash
# Применить через SASL EXTERNAL (локальный сокет, требует root)
ldapmodify -Y EXTERNAL -H ldapi:/// -f tls.ldif

systemctl restart slapd
```

> `-Y EXTERNAL` использует аутентификацию SASL через сокет (только локально). `ldapi:///` = подключение через Unix-сокет.

---

## Интеграция клиента Linux

Клиент Linux по умолчанию ничего не знает об OpenLDAP. Необходимы два компонента:

**PAM** — модуль `pam_ldap` подключает PAM к LDAP-серверу для аутентификации при входе.

**NSLCD** (Name Service LDAP Connection Daemon) — фоновый процесс, выполняющий поиск имён через LDAP.

### Установка клиентских пакетов:

```bash
apt install libnss-ldapd libpam-ldapd ldap-utils
```

Мастер установки запрашивает:
1. IP/имя хоста LDAP-сервера (несколько для резервирования)
2. Базовый DN (например, `dc=lpiclab,dc=com`)
3. Сервисы для поиска через LDAP: выбрать `passwd`, `shadow`, `group`

### Автоматическое создание домашних каталогов:

Добавить в `/etc/pam.d/common-session`:
```
session optional pam_mkhomedir.so skel=/etc/skel umask=077
```

### Включить TLS в NSLCD:

Добавить в `/etc/nslcd.conf`:
```
ssl start_tls
tls_reqcert allow
```

```bash
systemctl restart nslcd
```

---

## Шпаргалка для экзамена

### Ключевые пути

| Путь | Назначение |
|---|---|
| `/etc/openldap/slapd.conf` | Устаревший файл конфигурации |
| `/etc/openldap/slapd.d/` | Актуальный каталог slapd-config (LDIF-файлы) |
| `/var/lib/ldap/` | Файлы базы данных OpenLDAP |
| `/etc/openldap/schema/` | Файлы схем |
| `/etc/ldap/sasl2/` | TLS-сертификаты |
| `/etc/ldap/ldap.conf` | Конфигурация LDAP-клиента (Debian) |
| `/etc/openldap/ldap.conf` | Конфигурация LDAP-клиента (Red Hat) |
| `/etc/nslcd.conf` | Конфигурация демона NSLCD (клиент) |

### Ключевые команды

```bash
slappasswd                                          # сгенерировать хеш пароля
slapcat                                             # экспортировать базу данных в LDIF
slapcat -l all.ldif                                 # экспортировать в файл
slapadd -l file.ldif                                # импортировать (slapd остановлен!)
slapindex                                           # перестроить индексы (slapd остановлен!)
dpkg-reconfigure slapd                              # интерактивная перенастройка
ldapadd -x -D "cn=admin,dc=..." -W -f file.ldif    # добавить объекты
ldapmodify -x -D "cn=admin,dc=..." -W -f mod.ldif  # изменить объекты
ldapdelete -x -D "cn=admin,dc=..." -W "dn=..."     # удалить объект
ldapsearch -x -b "dc=..." "(filter)"               # поиск
ldappasswd -x -D "cn=admin,dc=..." -W -s pass "dn" # сменить пароль
# Применить конфигурацию TLS через сокет:
ldapmodify -Y EXTERNAL -H ldapi:/// -f tls.ldif
```

### Ключевые факты для экзамена

| Факт | Подробности |
|---|---|
| Демон slapd | Сервер OpenLDAP, порт 389 |
| slapd.conf | Устаревший метод, deprecated с версии 2.3 |
| slapd-config | Актуальный метод, `/etc/slapd.d/`, на основе LDIF |
| Файлы slapd.d | Нельзя редактировать вручную — использовать ldapmodify |
| slapadd vs ldapadd | `slapadd` = прямая работа с БД (сервер остановлен); `ldapadd` = через протокол (сервер запущен) |
| slappasswd | Генерирует хеш `{SSHA}` для LDIF-файлов |
| slapcat | Экспортирует БД в LDIF (резервная копия) |
| Классы объектов пользователя Unix | `inetOrgPerson` + `posixAccount` + `shadowAccount` |
| ACL rootdn | Всегда имеет полный доступ независимо от правил olcAccess |
| Импорт TLS | `ldapmodify -Y EXTERNAL -H ldapi:///` |

---

## Практика

Для работы с OpenLDAP через GUI и пошагового развёртывания стенда:

**[phpLDAPadmin — практика и траблшутинг](/posts/misc/phpldapadmin-practice/)** — установка phpLDAPadmin на Ubuntu 24.04, решение конфликта `mpm_event` с PHP-FPM, работа с деревом каталога через интерфейс, тренировочные задачи с `ldapsearch`, `ldapmodify`, `ldappasswd`.
