---
title: "Анонимное файлохранилище на vsftpd"
description: "Поднять анонимный FTP-сервер за пару минут для обмена файлами в локальной сети"
icon: "📁"
group: "Cases"
tags: ["Linux", "FTP", "vsftpd", "LAN", "Networking"]
date: 2026-04-28
page_lang: "ru"
lang_pair: "/kb/cases/vsftpd-anon-ftp/"
pagefind_ignore: true
build:
  list: never
  render: always
---

<div class="intro-card">
Быстрый кейс — поднять анонимный FTP-сервер на <strong>vsftpd</strong> для обмена файлами в локальной сети. Любой клиент подключается без пароля, может загружать и скачивать файлы.
</div>

## Почему vsftpd

vsftpd (Very Secure FTP Daemon) — стандартный FTP-сервер в большинстве дистрибутивов Linux. Лёгкий, стабильный, хорошо документирован. Несмотря на название «Very Secure», прекрасно работает в режиме анонимного доступа — по умолчанию всё заблокировано, нужно явно разрешить то, что необходимо.

## Установка

```bash
sudo apt update
sudo apt install vsftpd -y
```

После установки vsftpd автоматически запустится как systemd-сервис. Останавливаем перед настройкой:

```bash
sudo systemctl stop vsftpd
```

## Подготовка каталогов

FTP-сервер в анонимном режиме работает от имени системного пользователя `ftp`. Создаём структуру:

```bash
sudo mkdir -p /var/ftp/pub
sudo chown root:root /var/ftp
sudo chmod 555 /var/ftp
sudo chown ftp:ftp /var/ftp/pub
sudo chmod 2777 /var/ftp/pub
```

- `/var/ftp` — корень анонимного пользователя. vsftpd **требует**, чтобы этот каталог не был доступен на запись, иначе сервер откажется стартовать с ошибкой `refusing to run with writable root inside chroot()`. Поэтому права `555` и владелец `root`.
- `/var/ftp/pub` — рабочий каталог для загрузки и скачивания. Бит `setgid` (`2777`) обеспечивает наследование группы для новых файлов.

## Конфигурация vsftpd

Полностью заменяем конфигурационный файл:

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

| Параметр | Что делает |
|---|---|
| `anonymous_enable=YES` | Включает анонимный вход |
| `no_anon_password=YES` | Не спрашивать пароль |
| `local_enable=NO` | Запретить вход системным пользователям |
| `anon_root=/var/ftp` | Корневой каталог анонима |
| `anon_upload_enable=YES` | Разрешить загрузку файлов |
| `anon_mkdir_write_enable=YES` | Разрешить создание каталогов |
| `anon_other_write_enable=YES` | Разрешить удаление и переименование |
| `write_enable=YES` | Глобальный флаг записи |
| `anon_umask=000` | Файлы создаются с максимальными правами |
| `pasv_min_port` / `pasv_max_port` | Диапазон портов для пассивного режима |

## Настройка файрвола

```bash
sudo ufw allow 21/tcp
sudo ufw allow 30000:30050/tcp
```

Пассивный режим — отдельная головная боль FTP-протокола. При листинге каталога или передаче файлов сервер открывает дополнительный порт для данных. Без указания диапазона vsftpd использует случайные высокие порты, и клиент зависнет на `PASV`, ожидая подключения через заблокированный порт.

## Запуск

```bash
sudo systemctl start vsftpd
sudo systemctl status vsftpd
```

Проверяем, что порт слушает:

```bash
ss -tlnp | grep :21
```

## Подключение клиентов

**С Linux-машины через терминал:**

```bash
ftp 192.168.50.187
# Логин: anonymous
# Пароль: пустой (просто Enter)
ftp> cd pub
ftp> put myfile.txt        # загрузить файл
ftp> mput *.png            # загрузить несколько файлов
ftp> get document.pdf      # скачать файл
```

**С телефона (Android / iOS):**

Любой FTP-клиент — CX File Explorer, Total Commander, Solid Explorer. Указываем IP сервера, порт 21, тип подключения — анонимный. Файлы будут в каталоге `/pub`.

**Из браузера:**

Открываем `ftp://192.168.50.187/pub/` — только скачивание, загрузка через браузер не поддерживается.

## Типичные проблемы

**Клиент зависает при листинге каталога**

Проблема с пассивным режимом. Откройте диапазон портов в файрволе или переключите клиент в активный режим:

```
ftp> passive
Passive mode: off.
ftp> ls
```

**`refusing to run with writable root inside chroot()`**

Корневой каталог анонима доступен на запись:

```bash
sudo chmod 555 /var/ftp
sudo systemctl restart vsftpd
```

**`Anonymous users may not overwrite existing files`**

Отсутствует `anon_other_write_enable=YES` в конфиге. Добавьте и перезапустите сервер.

## Безопасность: не забудьте выключить

Анонимный FTP с полным доступом на запись — сознательная дыра. Используйте только временно и только в доверенной локальной сети.

```bash
sudo systemctl stop vsftpd
sudo systemctl disable vsftpd
```

Или верните стандартный конфиг:

```bash
sudo apt install --reinstall vsftpd
```

## Альтернатива: однострочник на Python

Если нужно только раздать файлы на скачивание — без установки чего-либо:

```bash
python3 -m http.server 8080 -d /path/to/files
```

Открываете `http://IP:8080` в браузере телефона — и скачиваете. Для полноценного двустороннего обмена FTP остаётся самым простым вариантом.
