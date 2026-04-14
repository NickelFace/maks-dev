---
title: "Text Processing"
description: "grep, awk, sed, cut, sort, uniq, xargs — обработка текста в командной строке"
icon: "📝"
group: "Linux Core"
tags: ["grep", "awk", "sed", "xargs", "Linux"]
date: 2026-04-14
---

<div class="intro-card">
Инструменты обработки текста в Linux: <strong>grep</strong> (поиск), <strong>awk</strong> (поля и программы), <strong>sed</strong> (потоковый редактор), <strong>cut / sort / uniq / xargs</strong> — строительные блоки любого pipe-пайплайна.
</div>

## grep

<div class="ref-panel">
<div class="ref-panel-head">Флаги grep</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Флаг</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">-i</td><td class="desc">Без учёта регистра</td></tr>
<tr><td class="mono">-r / -R</td><td class="desc">Рекурсивный поиск (R следует по symlink)</td></tr>
<tr><td class="mono">-l</td><td class="desc">Только имена файлов с совпадениями</td></tr>
<tr><td class="mono">-L</td><td class="desc">Файлы БЕЗ совпадений</td></tr>
<tr><td class="mono">-n</td><td class="desc">Показать номера строк</td></tr>
<tr><td class="mono">-c</td><td class="desc">Подсчитать совпадающие строки</td></tr>
<tr><td class="mono">-v</td><td class="desc">Инвертировать совпадение</td></tr>
<tr><td class="mono">-w</td><td class="desc">Совпадение целого слова</td></tr>
<tr><td class="mono">-x</td><td class="desc">Совпадение всей строки</td></tr>
<tr><td class="mono">-E</td><td class="desc">Расширенные regex (egrep)</td></tr>
<tr><td class="mono">-P</td><td class="desc">Perl-совместимые regex (PCRE)</td></tr>
<tr><td class="mono">-F</td><td class="desc">Фиксированная строка (без regex)</td></tr>
<tr><td class="mono">-o</td><td class="desc">Только совпадающая часть строки</td></tr>
<tr><td class="mono">-A N</td><td class="desc">N строк после совпадения</td></tr>
<tr><td class="mono">-B N</td><td class="desc">N строк до совпадения</td></tr>
<tr><td class="mono">-C N</td><td class="desc">N строк вокруг совпадения</td></tr>
<tr><td class="mono">-m N</td><td class="desc">Остановить после N совпадений</td></tr>
<tr><td class="mono">--include="*.py"</td><td class="desc">Поиск только в .py файлах</td></tr>
<tr><td class="mono">--exclude-dir=".git"</td><td class="desc">Исключить директорию</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">Примеры grep</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">grep -rn "TODO" src/ --include="*.py"</td><td class="desc">Поиск TODO в Python-файлах</td></tr>
<tr><td class="mono">grep -E "^(ERROR|WARN)" app.log</td><td class="desc">Строки начинающиеся с ERROR или WARN</td></tr>
<tr><td class="mono">grep -oP "(?&lt;=Host: )\S+" access.log</td><td class="desc">Извлечь Host-заголовки</td></tr>
<tr><td class="mono">grep -v "^#" /etc/ssh/sshd_config | grep -v "^$"</td><td class="desc">Конфиг без комментариев и пустых строк</td></tr>
<tr><td class="mono">grep -c "ERROR" app.log</td><td class="desc">Подсчёт строк с ошибками</td></tr>
</tbody>
</table>
</div>
</div>

## awk

<div class="ref-panel">
<div class="ref-panel-head">Основные конструкции</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Выражение</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">awk '{print $1}'</td><td class="desc">Первое поле (разделитель — пробел)</td></tr>
<tr><td class="mono">awk '{print $NF}'</td><td class="desc">Последнее поле</td></tr>
<tr><td class="mono">awk '{print $1, $3}'</td><td class="desc">Поля 1 и 3 через пробел</td></tr>
<tr><td class="mono">awk -F: '{print $1}' /etc/passwd</td><td class="desc">Разделитель :</td></tr>
<tr><td class="mono">awk 'NR==5'</td><td class="desc">Вывести 5-ю строку</td></tr>
<tr><td class="mono">awk 'NR>=3 && NR<=7'</td><td class="desc">Строки 3–7</td></tr>
<tr><td class="mono">awk '/pattern/'</td><td class="desc">Строки совпадающие с паттерном</td></tr>
<tr><td class="mono">awk '!/pattern/'</td><td class="desc">Строки НЕ совпадающие</td></tr>
<tr><td class="mono">awk '$3 > 100 {print}'</td><td class="desc">Строки где поле 3 > 100</td></tr>
<tr><td class="mono">awk '{sum+=$1} END{print sum}'</td><td class="desc">Сумма первого столбца</td></tr>
<tr><td class="mono">awk 'END{print NR}'</td><td class="desc">Количество строк (аналог wc -l)</td></tr>
<tr><td class="mono">awk '{gsub(/old/,"new"); print}'</td><td class="desc">Глобальная замена в каждой строке</td></tr>
<tr><td class="mono">awk '!seen[$0]++'</td><td class="desc">Удалить дубликаты (сохранить порядок)</td></tr>
<tr><td class="mono">awk 'BEGIN{FS=":"; OFS="\t"} {print $1,$3}'</td><td class="desc">Входной и выходной разделители</td></tr>
<tr><td class="mono">awk '{a[$1]+=$2} END{for(k in a) print k,a[k]}'</td><td class="desc">Группировка по ключу с суммой</td></tr>
</tbody>
</table>
</div>
</div>

Встроенные переменные awk: `NR` (номер строки) · `NF` (количество полей) · `FS` (разделитель входа) · `OFS` (разделитель вывода) · `RS` (разделитель записей) · `ORS` (вывод записей) · `FILENAME`

## sed

<div class="ref-panel">
<div class="ref-panel-head">Команды sed</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Выражение</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">sed 's/old/new/'</td><td class="desc">Заменить первое вхождение в строке</td></tr>
<tr><td class="mono">sed 's/old/new/g'</td><td class="desc">Заменить все вхождения</td></tr>
<tr><td class="mono">sed 's/old/new/gi'</td><td class="desc">Замена без учёта регистра</td></tr>
<tr><td class="mono">sed -i 's/old/new/g' file</td><td class="desc">Замена прямо в файле (in-place)</td></tr>
<tr><td class="mono">sed -i.bak 's/.../.../' file</td><td class="desc">In-place с резервной копией .bak</td></tr>
<tr><td class="mono">sed -n '5p'</td><td class="desc">Вывести только строку 5</td></tr>
<tr><td class="mono">sed -n '3,7p'</td><td class="desc">Строки 3–7</td></tr>
<tr><td class="mono">sed -n '/pattern/p'</td><td class="desc">Строки совпадающие с паттерном</td></tr>
<tr><td class="mono">sed -n '/start/,/end/p'</td><td class="desc">Блок между двумя паттернами</td></tr>
<tr><td class="mono">sed '3d'</td><td class="desc">Удалить строку 3</td></tr>
<tr><td class="mono">sed '/pattern/d'</td><td class="desc">Удалить строки совпадающие с паттерном</td></tr>
<tr><td class="mono">sed '/^#/d; /^$/d'</td><td class="desc">Удалить комментарии и пустые строки</td></tr>
<tr><td class="mono">sed '5a\new line'</td><td class="desc">Добавить строку после строки 5</td></tr>
<tr><td class="mono">sed '5i\new line'</td><td class="desc">Вставить строку перед строкой 5</td></tr>
<tr><td class="mono">sed 'y/abc/ABC/'</td><td class="desc">Транслитерация символов</td></tr>
<tr><td class="mono">sed 'G'</td><td class="desc">Добавить пустую строку после каждой</td></tr>
<tr><td class="mono">sed -e 's/a/b/' -e 's/c/d/'</td><td class="desc">Несколько команд</td></tr>
</tbody>
</table>
</div>
</div>

## cut, sort, uniq, xargs

<div class="ref-panel">
<div class="ref-panel-head">cut — извлечение полей</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">cut -d: -f1 /etc/passwd</td><td class="desc">Поле 1 с разделителем :</td></tr>
<tr><td class="mono">cut -d, -f2-4</td><td class="desc">Поля 2, 3, 4</td></tr>
<tr><td class="mono">cut -d: -f1,3</td><td class="desc">Поля 1 и 3</td></tr>
<tr><td class="mono">cut -c1-10</td><td class="desc">Символы 1–10</td></tr>
<tr><td class="mono">cut -c-5</td><td class="desc">Первые 5 символов</td></tr>
<tr><td class="mono">cut -c10-</td><td class="desc">С 10-го символа до конца</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">sort — сортировка</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">sort</td><td class="desc">Алфавитная сортировка</td></tr>
<tr><td class="mono">sort -n</td><td class="desc">Числовая сортировка</td></tr>
<tr><td class="mono">sort -rn</td><td class="desc">Числовая обратная</td></tr>
<tr><td class="mono">sort -u</td><td class="desc">Уникальные строки</td></tr>
<tr><td class="mono">sort -k2,2n</td><td class="desc">По полю 2 числово</td></tr>
<tr><td class="mono">sort -t: -k3,3n /etc/passwd</td><td class="desc">Passwd по UID</td></tr>
<tr><td class="mono">sort -h</td><td class="desc">Human-readable числа (1K, 2M)</td></tr>
<tr><td class="mono">sort -R</td><td class="desc">Случайный порядок (shuffle)</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">uniq — уникальность</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">uniq</td><td class="desc">Убрать последовательные дубликаты (нужен sort)</td></tr>
<tr><td class="mono">uniq -c</td><td class="desc">Подсчёт повторений</td></tr>
<tr><td class="mono">uniq -d</td><td class="desc">Только дубликаты</td></tr>
<tr><td class="mono">uniq -u</td><td class="desc">Только уникальные</td></tr>
<tr><td class="mono">sort | uniq -c | sort -rn</td><td class="desc">Топ-частотных строк</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">xargs — передача аргументов</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Команда</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">find . -name "*.log" | xargs rm</td><td class="desc">Удалить все .log файлы</td></tr>
<tr><td class="mono">find . -name "*.py" | xargs grep "TODO"</td><td class="desc">grep по найденным файлам</td></tr>
<tr><td class="mono">cat hosts.txt | xargs -I{} ping -c1 {}</td><td class="desc">Ping каждого хоста</td></tr>
<tr><td class="mono">echo "a b c" | xargs -n1</td><td class="desc">Один аргумент за раз</td></tr>
<tr><td class="mono">xargs -P4 -I{} cmd {}</td><td class="desc">4 параллельных процесса</td></tr>
<tr><td class="mono">find . -print0 | xargs -0 rm</td><td class="desc">Null-разделители (файлы с пробелами)</td></tr>
<tr><td class="mono">xargs -n3 echo</td><td class="desc">По 3 аргумента на вызов</td></tr>
</tbody>
</table>
</div>
</div>
