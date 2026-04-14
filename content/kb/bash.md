---
title: "Bash & Scripting"
description: "Переменные, массивы, условия, циклы, функции, parameter expansion"
icon: "🐚"
group: "Linux Core"
tags: ["Bash", "Shell", "Scripting", "Linux"]
date: 2026-04-14
---

<div class="intro-card">
Справочник по Bash: <strong>parameter expansion</strong>, специальные переменные, массивы, тесты, циклы, функции. Всё что нужно для написания надёжных shell-скриптов.
</div>

## Переменные и expansion

<div class="ref-panel">
<div class="ref-panel-head">Parameter Expansion</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Выражение</th><th>Результат</th></tr></thead>
<tbody>
<tr><td class="mono">${VAR}</td><td class="desc">Значение VAR</td></tr>
<tr><td class="mono">${VAR:-default}</td><td class="desc">VAR если задан, иначе default (не присваивает)</td></tr>
<tr><td class="mono">${VAR:=default}</td><td class="desc">VAR если задан, иначе присвоить default</td></tr>
<tr><td class="mono">${VAR:?error msg}</td><td class="desc">VAR если задан, иначе вывести ошибку и выйти</td></tr>
<tr><td class="mono">${VAR:+alt}</td><td class="desc">alt если VAR задан, иначе пусто</td></tr>
<tr><td class="mono">${#VAR}</td><td class="desc">Длина строки</td></tr>
<tr><td class="mono">${VAR:2:5}</td><td class="desc">Подстрока: 5 символов с позиции 2</td></tr>
<tr><td class="mono">${VAR^^}</td><td class="desc">Весь текст в ВЕРХНИЙ регистр</td></tr>
<tr><td class="mono">${VAR,,}</td><td class="desc">Весь текст в нижний регистр</td></tr>
<tr><td class="mono">${VAR^}</td><td class="desc">Первый символ в верхний регистр</td></tr>
<tr><td class="mono">${VAR/old/new}</td><td class="desc">Заменить первое вхождение</td></tr>
<tr><td class="mono">${VAR//old/new}</td><td class="desc">Заменить все вхождения</td></tr>
<tr><td class="mono">${VAR#prefix}</td><td class="desc">Удалить кратчайший префикс (glob)</td></tr>
<tr><td class="mono">${VAR##prefix}</td><td class="desc">Удалить длиннейший префикс</td></tr>
<tr><td class="mono">${VAR%suffix}</td><td class="desc">Удалить кратчайший суффикс</td></tr>
<tr><td class="mono">${VAR%%suffix}</td><td class="desc">Удалить длиннейший суффикс</td></tr>
</tbody>
</table>
</div>
</div>

## Специальные переменные

<div class="ref-panel">
<div class="ref-panel-head">Special Parameters</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Переменная</th><th>Значение</th></tr></thead>
<tbody>
<tr><td class="mono">$0</td><td class="desc">Имя скрипта / оболочки</td></tr>
<tr><td class="mono">$1 .. $9</td><td class="desc">Позиционные параметры</td></tr>
<tr><td class="mono">${10} ..</td><td class="desc">Параметры ≥ 10 (нужны фигурные скобки)</td></tr>
<tr><td class="mono">$@</td><td class="desc">Все параметры как отдельные слова (с кавычками)</td></tr>
<tr><td class="mono">$*</td><td class="desc">Все параметры как одна строка</td></tr>
<tr><td class="mono">$#</td><td class="desc">Количество параметров</td></tr>
<tr><td class="mono">$?</td><td class="desc">Код выхода последней команды</td></tr>
<tr><td class="mono">$$</td><td class="desc">PID текущего процесса (shell)</td></tr>
<tr><td class="mono">$!</td><td class="desc">PID последнего фонового процесса</td></tr>
<tr><td class="mono">$_</td><td class="desc">Последний аргумент предыдущей команды</td></tr>
<tr><td class="mono">$-</td><td class="desc">Текущие флаги оболочки</td></tr>
</tbody>
</table>
</div>
</div>

## Массивы

<div class="ref-panel">
<div class="ref-panel-head">Arrays</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Выражение</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">arr=(alpha beta gamma)</td><td class="desc">Объявить массив</td></tr>
<tr><td class="mono">arr[0]="delta"</td><td class="desc">Присвоить элемент</td></tr>
<tr><td class="mono">arr+=("epsilon")</td><td class="desc">Добавить в конец</td></tr>
<tr><td class="mono">${arr[0]}</td><td class="desc">Первый элемент</td></tr>
<tr><td class="mono">${arr[-1]}</td><td class="desc">Последний элемент</td></tr>
<tr><td class="mono">${arr[@]}</td><td class="desc">Все элементы (по отдельности)</td></tr>
<tr><td class="mono">${arr[*]}</td><td class="desc">Все элементы (одна строка)</td></tr>
<tr><td class="mono">${#arr[@]}</td><td class="desc">Длина массива</td></tr>
<tr><td class="mono">${arr[@]:1:2}</td><td class="desc">Срез: 2 элемента с индекса 1</td></tr>
<tr><td class="mono">unset arr[1]</td><td class="desc">Удалить элемент</td></tr>
<tr><td class="mono">declare -A map</td><td class="desc">Ассоциативный массив (hash)</td></tr>
<tr><td class="mono">map[key]="value"</td><td class="desc">Присвоить ключ</td></tr>
<tr><td class="mono">${!map[@]}</td><td class="desc">Все ключи ассоциативного массива</td></tr>
</tbody>
</table>
</div>
</div>

## Тесты

<div class="ref-panel">
<div class="ref-panel-head">Файловые операторы</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Флаг</th><th>Истина если</th></tr></thead>
<tbody>
<tr><td class="mono">-e file</td><td class="desc">Существует (любой тип)</td></tr>
<tr><td class="mono">-f file</td><td class="desc">Обычный файл</td></tr>
<tr><td class="mono">-d file</td><td class="desc">Директория</td></tr>
<tr><td class="mono">-s file</td><td class="desc">Файл не пустой (size &gt; 0)</td></tr>
<tr><td class="mono">-L file</td><td class="desc">Символическая ссылка</td></tr>
<tr><td class="mono">-r / -w / -x</td><td class="desc">Читаемый / записываемый / исполняемый</td></tr>
<tr><td class="mono">-O file</td><td class="desc">Принадлежит текущему пользователю</td></tr>
<tr><td class="mono">f1 -nt f2</td><td class="desc">f1 новее f2</td></tr>
<tr><td class="mono">f1 -ot f2</td><td class="desc">f1 старее f2</td></tr>
</tbody>
</table>
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">Строковые и числовые операторы</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Выражение</th><th>Истина если</th></tr></thead>
<tbody>
<tr><td class="mono">-z str</td><td class="desc">Строка пустая</td></tr>
<tr><td class="mono">-n str</td><td class="desc">Строка не пустая</td></tr>
<tr><td class="mono">str1 = str2</td><td class="desc">Строки равны</td></tr>
<tr><td class="mono">str1 != str2</td><td class="desc">Строки не равны</td></tr>
<tr><td class="mono">str =~ regex</td><td class="desc">Совпадает с regex (только [[ ]])</td></tr>
<tr><td class="mono">n1 -eq n2</td><td class="desc">Числа равны</td></tr>
<tr><td class="mono">n1 -ne n2</td><td class="desc">Числа не равны</td></tr>
<tr><td class="mono">n1 -lt / -le / -gt / -ge n2</td><td class="desc">&lt; / ≤ / &gt; / ≥</td></tr>
</tbody>
</table>
</div>
</div>

## Условия и циклы

<div class="ref-panel">
<div class="ref-panel-head">Управляющие конструкции</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Конструкция</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">if [[ cond ]]; then ...; elif ...; else ...; fi</td><td class="desc">Условный блок</td></tr>
<tr><td class="mono">[[ cond ]] && cmd</td><td class="desc">Выполнить cmd если истина</td></tr>
<tr><td class="mono">[[ cond ]] || cmd</td><td class="desc">Выполнить cmd если ложь</td></tr>
<tr><td class="mono">case "$v" in pat1) ...;; pat2|pat3) ...;; *) ...;; esac</td><td class="desc">Switch/case</td></tr>
<tr><td class="mono">for i in {1..10}; do ...; done</td><td class="desc">Range loop</td></tr>
<tr><td class="mono">for f in *.txt; do ...; done</td><td class="desc">Glob loop</td></tr>
<tr><td class="mono">for (( i=0; i&lt;10; i++ )); do ...; done</td><td class="desc">C-style loop</td></tr>
<tr><td class="mono">for item in "${arr[@]}"; do ...; done</td><td class="desc">Array loop</td></tr>
<tr><td class="mono">while IFS= read -r line; do ...; done &lt; file</td><td class="desc">Читать строки из файла</td></tr>
<tr><td class="mono">while IFS= read -r line; do ...; done &lt; &lt;(cmd)</td><td class="desc">Читать строки из команды</td></tr>
<tr><td class="mono">until [[ cond ]]; do ...; done</td><td class="desc">Until loop</td></tr>
<tr><td class="mono">break / continue</td><td class="desc">Выйти / продолжить цикл</td></tr>
</tbody>
</table>
</div>
</div>

## Функции

<div class="ref-panel">
<div class="ref-panel-head">Functions</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Конструкция</th><th>Описание</th></tr></thead>
<tbody>
<tr><td class="mono">myfunc() { ...; }</td><td class="desc">Объявить функцию</td></tr>
<tr><td class="mono">function myfunc { ...; }</td><td class="desc">Альтернативный синтаксис</td></tr>
<tr><td class="mono">local var="$1"</td><td class="desc">Локальная переменная (только в функции)</td></tr>
<tr><td class="mono">return 0 / return 1</td><td class="desc">Код выхода функции</td></tr>
<tr><td class="mono">result=$(myfunc args)</td><td class="desc">Захватить вывод функции</td></tr>
<tr><td class="mono">myfunc "$@"</td><td class="desc">Передать все аргументы скрипта в функцию</td></tr>
<tr><td class="mono">declare -f myfunc</td><td class="desc">Показать определение функции</td></tr>
<tr><td class="mono">unset -f myfunc</td><td class="desc">Удалить функцию</td></tr>
</tbody>
</table>
</div>
</div>
