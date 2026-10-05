# -*- coding: utf-8 -*-
"""Сборка v7: index.html, prices.html, faq.html из общих шаблонов."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, '/home/claude/akademiya-ulybki/_build'); sys.path.insert(0, HERE)
from prices_ru import PRICE, MAIN, MATERIALY_NOTE, FOOTNOTE, EDITION
from content import DIRECTIONS, REVIEWS, FAQ

TEL = "+7 (989) 751‑28‑51"; TELRAW = "+79897512851"
# Помощник-маскот в углу. Пока выключен по решению Егора (3 октября 2026):
# вместо него прежняя круглая кнопка с облачком. Разметка, стили и скрипт
# маскота сохранены целиком — чтобы вернуть, достаточно поставить True.
МАСКОТ = False
# Экскурсия пока живёт отдельным сайтом. После переезда на свой домен здесь
# будет просто "tour.html" — остальной код менять не придётся.
TOUR = "https://ermolaevegorit-create.github.io/akademiya-ulybki-tour/"
MAP_SRC = "https://yandex.ru/map-widget/v1/?ll=39.720852%2C43.608995&z=17&pt=39.720852%2C43.608995%2Cpm2blm"
# Короткий адрес для выпадающего меню на телефоне.
ADDR_SHORT = "Сочи, Виноградная, 55/1, 2‑й этаж"
# Мессенджеры. Кнопка рисуется только если ссылка заполнена: пустая строка —
# кнопки нет, чтобы на сайте не висела мёртвая ссылка.
#   Telegram — https://t.me/<имя_профиля> (Настройки -> Имя пользователя)
#   MAX      — https://max.ru/u/<код> (профиль -> «Поделиться» -> «Скопировать ссылку»)
CHANNELS = [
    ("wa",  "WhatsApp", "https://wa.me/79897512851"),
    ("max", "MAX",      ""),
    ("tg",  "Telegram", ""),
]
XRAY = ("снимок", "томограф", "томограмм", "клкт", "радиовизиограф")

def rub(v): return v + (" ₽" if (v[0].isdigit() or v.startswith("от") or v.startswith("+")) else "")

def price_list():
    """Рентген в клинике не делают: такие строки в прейскуранте не появляются,
    но фильтр оставлен на случай правки документа."""
    return [(s, n, [r for r in rows if not any(k in (r[0] + " " + r[2]).lower() for k in XRAY)])
            for s, n, rows in PRICE]

SITE = "https://akademiya-ulybki.ru"
METRIKA = "00000000"          # ← подставить номер счётчика Яндекс.Метрики

# ---------- версии файлов для кеша ----------
# Хостинг раздаёт styles.css и main.js с обычным кешем, и после правки
# браузер посетителя может ещё сутки показывать старую версию. Поэтому к
# ссылке добавляется короткий отпечаток содержимого: меняется файл —
# меняется адрес — кеш обновляется сразу. Сам файл при этом не переименован,
# так что ничего не ломается.
import hashlib
def ver(rel):
    p = os.path.join(HERE, rel)
    try:
        return "?v=" + hashlib.sha1(open(p, "rb").read()).hexdigest()[:8]
    except FileNotFoundError:
        return ""

# ---------- политика безопасности ----------
# Браузер физически не загрузит ресурс с чужого домена. Это страховка от
# того, что внешние шрифты или скрипты вернутся на сайт по недосмотру.
# Разрешены только свои файлы и российские сервисы — Метрика и Яндекс.Карты.
CSP = ("default-src 'self'; "
       "base-uri 'self'; "
       "object-src 'none'; "
       "form-action 'self'; "
       # frame-ancestors в <meta> браузер игнорирует — это только HTTP-заголовок.
       # Настроим на хостинге вместе с HSTS, когда переедем.
       "img-src 'self' data: https://mc.yandex.ru https://yastatic.net; "
       "font-src 'self' data:; "
       "style-src 'self' 'unsafe-inline'; "
       # 'unsafe-inline' убрано: вместо него bundle.py подставляет sha256 каждого
       # встроенного скрипта. Любой посторонний скрипт, попавший в разметку,
       # браузер откажется выполнять — хеш не совпадёт.
       "script-src 'self' __HASHES__ https://mc.yandex.ru https://yastatic.net; "
       "connect-src 'self' https://mc.yandex.ru; "
       "frame-src https://yandex.ru https://mc.yandex.ru")

# ---------- общие части ----------
ICON = {'wa': '<path d="M20.5 3.5A11.9 11.9 0 0 0 3.6 19.3L2 29l9.9-1.6A12 12 0 1 0 20.5 3.5Z"/><path d="M9 9.2c.3-.7.6-.7.9-.7h.6c.2 0 .6 0 .9.7l1.1 2.8c.1.3.2.6 0 .9l-.6.8c-.2.2-.4.5-.2.9a9.6 9.6 0 0 0 4.7 4.1c.4.2.7 0 .9-.2l.9-1c.2-.3.5-.3.8-.1l2.7 1.3c.4.2.7.3.8.5.1.4 0 1.4-.4 2-.4.7-1.6 1.4-2.5 1.5-2.2.2-5.4-1.4-7.7-3.8C8.6 16.2 7.2 13.2 7.4 11c.1-.9.9-1.4 1.6-1.8Z"/>', 'max': '<rect x="3.5" y="3.5" width="25" height="25" rx="7.5"/><path d="M9.5 22V10.6l6.5 7.2 6.5-7.2V22"/>', 'tg': '<path d="M28.4 5.2 3.6 14.6c-1.3.5-1.3 1.3-.2 1.6l6.1 1.9 2.3 7.1c.3.8.5 1.1 1.1 1.1.6 0 .9-.3 1.3-.7l2.9-2.8 6 4.4c1.1.6 1.9.3 2.2-1L29.6 7c.4-1.6-.6-2.3-1.2-1.8Z"/><path d="m10 18.1 12.4-7.8-9 8.5-.4 5"/>'}


TEL_ICON = ('<path d="M7 5h5l3 7-3.5 2a15 15 0 0 0 6.5 6.5L20 17l7 3v5a3 3 0 0 1-3 3'
            'A21 21 0 0 1 4 8a3 3 0 0 1 3-3"/>')


def quick():
    """Первый блок выпадающего меню: короткий адрес и кнопки связи.
    Стоит вверху, а не в самом низу: список разделов длиннее экрана телефона,
    и всё, что под ним, человек просто не увидит.
    Кнопка мессенджера рисуется только если ссылка заполнена — пустая строка
    в CHANNELS означает, что кнопки нет, чтобы не висела мёртвая ссылка."""
    def btn(cls, href, icon, name, ext=True, track=""):
        rel = ' target="_blank" rel="noopener nofollow"' if ext else ''
        tr = f' data-track="{track}"' if track else ''
        return (f'<a class="nav__ch {cls}" href="{href}"{rel}{tr}>'
                f'<svg viewBox="0 0 32 32" width="17" height="17" fill="none" stroke="currentColor" '
                f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{icon}</svg>'
                f'<span>{name}</span></a>')

    out = btn('nav__ch--tel', f'tel:{TELRAW}', TEL_ICON, 'Позвонить', ext=False, track='nav_tel')
    for key, name, href in CHANNELS:
        if href:
            out += btn(f'nav__ch--{key}', href, ICON[key], name, track=f'nav_{key}')
    return ('<div class="nav__quick">'
            f'<a class="nav__addr" href="index.html#kontakty">{ADDR_SHORT}</a>'
            f'<div class="nav__chs">{out}</div></div>')


# Заявка. Пока у сайта нет хостинга, отправлять её некуда: форма собирает
# сообщение и открывает WhatsApp клиники с готовым текстом. Ничего никуда
# не уходит и нигде не хранится — данные вводит и отправляет сам человек.
# Как появится обработчик на сервере, достаточно вписать адрес в FORM_ENDPOINT
# в main.js: разметка и стили меняться не будут.
#
# Полей намеренно три. Причину обращения не спрашиваем: ответ вроде
# «болит зуб» — это сведения о здоровье, особая категория персональных
# данных со своими требованиями к согласию и защите. Администратор
# уточнит всё голосом.
def lead_form(fid, eyebrow, title, text, btn="Записаться на приём", mod=""):
    return f'''<form class="lf{mod}" id="{fid}" novalidate>
      <div class="lf__head">
        <p class="eyebrow">{eyebrow}</p>
        <h3 class="lf__t">{title}</h3>
        <p class="lf__p">{text}</p>
      </div>
      <div class="lf__grid">
        <label class="lf__f">
          <span class="lf__l">Как вас зовут</span>
          <!-- У полей с именем и телефоном намеренно нет атрибута name.
               Без него браузер не может подставить их в адресную строку: если
               скрипт по какой-то причине не перехватит отправку, форма уйдёт
               обычным запросом — и тогда имя и телефон пациента оказались бы в
               адресе страницы, в истории браузера и в журналах сервера.
               Скрипт берёт поля по id, автоподстановку ведёт autocomplete —
               оба механизма в name не нуждаются. У переключателя времени name
               остаётся: без него три кнопки перестанут быть одной группой, а
               личных данных в нём нет. -->
          <input class="lf__i" type="text" id="{fid}-name" autocomplete="given-name"
                 required minlength="2" maxlength="60" placeholder="Имя">
        </label>
        <label class="lf__f">
          <span class="lf__l">Телефон</span>
          <!-- «+7» стоит отдельной надписью и набран жирнее остального номера:
               так сразу видно, что вводить нужно с девятки. Если всё же начнут
               с восьмёрки или с +7, поле снимет их само. -->
          <span class="lf__tel">
            <span class="lf__tel-code" aria-hidden="true">+7</span>
            <input class="lf__i lf__i--tel" type="tel" id="{fid}-tel" autocomplete="tel"
                   required inputmode="tel" maxlength="22" placeholder="(___) ___-__-__"
                   aria-describedby="{fid}-tel-code">
            <span class="vis-hidden" id="{fid}-tel-code">Код страны +7 подставляется сам</span>
          </span>
        </label>
      </div>
      <!-- Во всплывающем окне этот блок скрыт стилем (.lf--compact): там нужно
           спросить минимум, иначе окно занимает весь экран телефона. Поле не
           удалено, а скрыто — значение «в любое время» всё равно уходит в
           заявку, и разметка форм остаётся одна и та же. -->
      <fieldset class="lf__when">
        <legend class="lf__l">Когда удобно принять звонок</legend>
        <span class="lf__chips">
          <label class="lf__chip"><input type="radio" name="when" value="в любое время" checked><span>В любое время</span></label>
          <label class="lf__chip"><input type="radio" name="when" value="до 12:00"><span>До 12:00</span></label>
          <label class="lf__chip"><input type="radio" name="when" value="после 18:00"><span>После 18:00</span></label>
        </span>
      </fieldset>
      <label class="lf__ok">
        <input type="checkbox" name="ok" id="{fid}-ok" required>
        <span>Согласен на обработку имени и телефона для ответа на обращение — <a href="privacy.html" target="_blank" rel="noopener">политика обработки персональных данных</a></span>
      </label>
      <p class="lf__err" id="{fid}-err" role="alert" hidden></p>
      <button class="btn btn--fill lf__go" type="submit" data-track="lead_{fid}">{btn}</button>
      <p class="fine lf__fine">Ответим в рабочее время. Можно и просто позвонить: <a class="lnk" href="tel:{TELRAW}">{TEL}</a></p>
      <!-- Видно только тогда, когда в браузере выключены скрипты: отправлять
           заявку нечем, и пустая форма, которая молча ничего не делает, хуже,
           чем честная строка с телефоном. -->
      <p class="lf__nojs">Чтобы отправить заявку, нужен включённый JavaScript.
        Позвоните, пожалуйста: <a class="lnk" href="tel:{TELRAW}">{TEL}</a> —
        запишем на приём за минуту.</p>
    </form>'''


def head(title, desc, extra="", path="/", img="assets/photo/work-2.jpg"):
    return f"""<!doctype html>
<html lang="ru" class="js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<noscript><style>.intro,.slab__stone,.hint,.cookie,.vi-btn,.sfx-btn,.msc,.lfpop{{display:none!important}}.lf > *{{display:none!important}}.lf__nojs{{display:block!important}}</style></noscript>
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#ffffff">
<script>(function(){{try{{var v=JSON.parse(localStorage.getItem('au-vi')||'null');if(!v||!v.on)return;var c=document.documentElement.classList;c.add('vi');if(v.size>1)c.add('vi-'+v.size);if(v.scheme&&v.scheme!=='light')c.add('vi-'+v.scheme);if(v.noimg)c.add('vi-noimg');}}catch(e){{}}}})()</script>
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{SITE}{path}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="geo.region" content="RU-KDA"><meta name="geo.placename" content="Сочи">
<meta property="og:type" content="website"><meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="Академия улыбки">
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">
<meta property="og:url" content="{SITE}{path}"><meta property="og:image" content="{SITE}/{img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<link rel="icon" href="assets/logo.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/web/apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<link rel="preload" href="assets/font/golos-text-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/font/prata-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css{ver('styles.css')}">
{extra}
</head>
<body>
<script>document.documentElement.classList.add('js')</script>
<a class="skip" href="#main">К содержимому</a>
"""

def header(active=""):
    def a(href, txt, key):
        cls = ' class="is-cur"' if key == active else ''
        return f'<a href="{href}"{cls}>{txt}</a>'
    return f"""<header class="hdr" id="hdr">
  <div class="wrap hdr__in">
    <a class="brand" href="index.html"><img src="assets/logo.svg" alt="" width="34" height="29"><span class="brand__t"><b>Академия улыбки</b><i>стоматология Александры Белоусовой</i></span></a>
    <nav class="nav" id="nav" aria-label="Разделы">
      {quick()}
      {a('index.html#napravleniya','Направления','dir')}{a('index.html#pervyj-vizit','Первый визит','offer')}{a('index.html#vrach','Врач','doc')}{a('index.html#ekskursiya','Экскурсия','tour')}{a('faq.html','Вопросы','faq')}{a('prices.html','Цены','prices')}{a('docs.html','Документы','docs')}{a('index.html#kontakty','Контакты','contact')}
    </nav>
    <a class="hdr__tel" href="tel:{TELRAW}"><svg class="hdr__tel-i" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg><span>{TEL}</span></a>
    <button class="sfx-btn" type="button" id="sfx-toggle" aria-pressed="true" title="Выключить звук"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z"/><path class="sfx-wave" d="M15.6 9.4a4 4 0 0 1 0 5.2"/><path class="sfx-wave" d="M18.2 7.2a7.4 7.4 0 0 1 0 9.6"/><path class="sfx-off" d="M16 9.6l5 4.8M21 9.6l-5 4.8"/></svg><span class="vis-hidden">Звук</span></button>
    <button class="vi-btn" type="button" id="vi-toggle" aria-pressed="false" aria-controls="vi-panel" title="Версия для слабовидящих"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.6 12S5.2 5.6 12 5.6 22.4 12 22.4 12 18.8 18.4 12 18.4 1.6 12 1.6 12Z"/><circle cx="12" cy="12" r="3.1"/></svg><span class="vi-btn__t">Для слабовидящих</span></button>
    <button class="burger" type="button" aria-label="Меню" aria-expanded="false" aria-controls="nav"><span></span></button>
  </div>
</header>
<div class="vip" id="vi-panel" hidden role="region" aria-label="Настройки отображения">
  <div class="wrap vip__in">
    <div class="vip__g"><span class="vip__l">Размер текста</span>
      <button class="vip__b vip__b--a1" type="button" data-vi="size:1" aria-pressed="false" aria-label="Обычный размер">А</button>
      <button class="vip__b vip__b--a2" type="button" data-vi="size:2" aria-pressed="false" aria-label="Крупный размер">А</button>
      <button class="vip__b vip__b--a3" type="button" data-vi="size:3" aria-pressed="false" aria-label="Очень крупный размер">А</button>
    </div>
    <div class="vip__g"><span class="vip__l">Цвета</span>
      <button class="vip__b vip__c vip__c--l" type="button" data-vi="scheme:light" aria-pressed="false">Чёрным на белом</button>
      <button class="vip__b vip__c vip__c--d" type="button" data-vi="scheme:dark" aria-pressed="false">Белым на чёрном</button>
      <button class="vip__b vip__c vip__c--s" type="button" data-vi="scheme:sepia" aria-pressed="false">Коричневым на бежевом</button>
    </div>
    <div class="vip__g"><span class="vip__l">Изображения</span>
      <button class="vip__b" type="button" data-vi="noimg:0" aria-pressed="false">Показывать</button>
      <button class="vip__b" type="button" data-vi="noimg:1" aria-pressed="false">Скрыть</button>
    </div>
    <button class="vip__off" type="button" data-vi="off:1">Обычная версия сайта</button>
  </div>
</div>
<main id="main">
"""

MSC_BLOCK = """<!-- ПОМОЩНИК В УГЛУ
     Маскот клиники заменил круглую кнопку с иконкой. Задача та же: решение
     записаться приходит не там, где стоит форма, и возвращаться к ней человек
     чаще всего не станет. Облачко здесь — подпись к кнопке, а не меню: при
     наведении оно сразу говорит, зачем помощник нужен, а нажатие открывает
     форму записи. Промежуточного выбора нет — он стоял бы между человеком и
     единственным действием, ради которого помощник и поставлен.

     Кадры — отдельные картинки в общем холсте 256×256, меняются подменой src.
     Ни GIF, ни канвы: покадровая смена одного <img> дешевле и её видно
     программе чтения с экрана как один элемент.

     Сразу грузятся только покой и моргание; движения при наведении, нажатии,
     переносе и прыжке подтягиваются, когда впервые понадобятся.

     Это рисунок, а не человек и не живой оператор: облачко не обещает, что
     кто-то отвечает прямо сейчас, и ведёт к форме и телефону. -->
<div class="msc" id="msc" hidden>
  <div class="msc__bub" id="msc-bub" hidden aria-hidden="true">
    <button class="msc__x" type="button" aria-label="Скрыть подсказку" data-msc="close"></button>
    <!-- Три точки — то же, что в переписке: помощник «набирает». Нарисованы
         стилями, чтобы не тащить ради них картинку. -->
    <span class="msc__dots" aria-hidden="true"><i></i><i></i><i></i></span>
    <p class="msc__say" id="msc-say"></p>
  </div>
  <button class="msc__btn" id="msc-btn" type="button"
          aria-label="Проконсультироваться с врачом — записаться на приём">
    <span class="msc__ring" aria-hidden="true"></span>
    <!-- Полоски скорости видны только пока помощника тащат: без них перенос
         выглядел так, будто картинка просто ездит за курсором. -->
    <img class="msc__lines" id="msc-lines" src="assets/mascot/motion-lines.webp" alt=""
         width="128" height="102" loading="lazy" draggable="false" aria-hidden="true">
    <!-- Сюда скрипт подставляет искру, сердце или вопросительный знак — по
         одному короткому разу, когда помощнику есть чему порадоваться или о
         чём задуматься. -->
    <img class="msc__fx" id="msc-fx" src="" alt="" width="128" height="128"
         loading="lazy" draggable="false" aria-hidden="true" hidden>
    <img class="msc__img" id="msc-img" src="assets/mascot/idle.webp" alt=""
         width="256" height="256" draggable="false">
  </button>
</div>

"""
FAB_BLOCK = """<!-- КНОПКА ВЫЗОВА В УГЛУ
     Круглая кнопка с облачком — та, что была до маскота. Решение записаться
     приходит не там, где стоит форма, и возвращаться к ней человек чаще всего
     не станет. Появляется не сразу: сначала человек должен что-то прочитать,
     иначе это баннер поверх ещё не увиденной страницы. При наведении
     раскрывается подпись «Записаться», нажатие открывает окно записи. -->
<button class="fab" id="fab" type="button" aria-label="Записаться на приём">
  <span class="fab__ring" aria-hidden="true"></span>
  <span class="fab__ph" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4c-1.2 0-2.4-.2-3.5-.7L3 21l1.8-5.2A8.2 8.2 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/><circle cx="9" cy="11.5" r=".9" fill="currentColor" stroke="none"/><circle cx="12.5" cy="11.5" r=".9" fill="currentColor" stroke="none"/><circle cx="16" cy="11.5" r=".9" fill="currentColor" stroke="none"/></svg>
  </span>
  <span class="fab__t">Записаться</span>
</button>

"""

FOOTER = f"""</main>
<footer class="ftr">
  <div class="wrap ftr__in">
    <a class="brand" href="index.html"><img src="assets/logo.svg" alt="" width="34" height="29"><span class="brand__t"><b>Академия улыбки</b><i>стоматология Александры Белоусовой</i></span></a>
    <nav class="ftr__nav" aria-label="Подвал"><a href="index.html#napravleniya">Направления</a><a href="index.html#pervyj-vizit">Первый визит</a><a href="index.html#vrach">Врач</a><a href="faq.html">Вопросы</a><a href="prices.html">Цены</a><a href="docs.html">Документы</a><a href="index.html#kontakty">Контакты</a></nav>
    <div class="ftr__c"><a href="tel:{TELRAW}">{TEL}</a><span>Сочи, ул. Виноградная, 55/1, 2‑й этаж</span></div>
  </div>
  <div class="wrap ftr__legal">
    <div class="ftr__col">
    <p>ООО «Академия улыбки» · ОГРН 1262300000038 · ИНН 2366057010 · КПП 236601001 · Юридический адрес: 354008, Краснодарский край, г. Сочи, ул. Виноградная, д. 22/1Б, кв. 61 · Адрес осуществления деятельности: 354008, г. Сочи, Центральный район, ул. Виноградная, д. 55/1, пом. 22, 2‑й этаж</p>
    <p>Лицензия на осуществление медицинской деятельности № Л041‑01126‑23/05841444 от 03.08.2026, выдана Министерством здравоохранения Краснодарского края (приказ № 3046 от 03.08.2026). Работы и услуги: сестринское дело; организация здравоохранения и общественное здоровье, эпидемиология; ортодонтия; стоматология общей практики; стоматология ортопедическая; стоматология терапевтическая; стоматология хирургическая.</p>
    </div>
    <div class="ftr__col">
    <p>Информация на сайте не является публичной офертой и не заменяет очную консультацию врача. Цены и условия акций уточняйте по телефону. <span class="ftr__warn">Имеются противопоказания, необходима консультация специалиста.</span> Часть изображений на сайте создана или обработана с помощью искусственного интеллекта.</p>
    <p><a class="lnk" href="docs.html">Документы</a> · <a class="lnk" href="info.html">Сведения о клинике и лицензия</a> · <a class="lnk" href="privacy.html">Политика обработки персональных данных</a> · <button class="lnk" type="button" id="cookie-settings">Настройки cookie</button></p>
    <p>© 2026 Академия улыбки. 18+</p>
    </div>
  </div>
</footer>

<div class="lfpop" id="lfpop" hidden>
  <div class="lfpop__back" data-lf-close></div>
  <div class="lfpop__box" role="dialog" aria-modal="true" aria-labelledby="lf-pop-t">
    <button class="lfpop__x" type="button" aria-label="Закрыть" data-lf-close></button>
    <!-- Тот же помощник, что зовёт из угла, встречает и внутри окна: человек
         видит, что попал туда, куда нажимал. После отправки он подпрыгивает —
         это единственное место, где прыжок уместен. Картинка декоративная,
         поэтому alt пустой: всё, что нужно знать, сказано текстом рядом. -->
    {'<img class="lfpop__msc" id="lfpop-msc" src="assets/mascot/idle.webp" alt="" width="256" height="256" loading="lazy" draggable="false" aria-hidden="true">' if МАСКОТ else ''}
    {lead_form("lf-pop", "Прежде чем уйти", "Перезвоним и подберём время",
               "Имя и телефон — остальное спросим при звонке.",
               "Записаться", " lf--compact")}
  </div>
</div>

{MSC_BLOCK if МАСКОТ else FAB_BLOCK}
<div class="cookie" id="cookie" hidden role="dialog" aria-modal="false" aria-labelledby="cookie-t">
  <p class="cookie__t" id="cookie-t"><b>Cookie и статистика</b></p>
  <p class="cookie__d">Технические cookie нужны для работы сайта. С вашего согласия включим Яндекс.Метрику — обезличенную статистику, чтобы делать сайт удобнее. <a href="privacy.html">Подробнее</a>.</p>
  <div class="cookie__b">
    <button class="btn btn--fill" type="button" id="cookie-yes">Принять всё</button>
    <button class="btn" type="button" id="cookie-no">Только необходимые</button>
  </div>
</div>

<script>window.__METRIKA="";</script>   <!-- ← номер счётчика Яндекс.Метрики; пусто = статистика выключена -->
<script src="vendor/gsap.min.js{ver('vendor/gsap.min.js')}"></script>
<script src="vendor/ScrollTrigger.min.js{ver('vendor/ScrollTrigger.min.js')}"></script>
<script src="vendor/Draggable.min.js{ver('vendor/Draggable.min.js')}"></script>
<script src="main.js{ver('main.js')}"></script>
</body>
</html>
"""

LD_ORG = json.dumps({"@context":"https://schema.org","@type":["Dentist","MedicalClinic"],"name":"Стоматологическая клиника «Академия улыбки»","legalName":"ООО «Академия улыбки»","telephone":TELRAW,"url":"https://akademiya-ulybki.ru/","address":{"@type":"PostalAddress","streetAddress":"ул. Виноградная, д. 55/1, пом. 22, 2-й этаж","addressLocality":"Сочи","addressRegion":"Краснодарский край","postalCode":"354008","addressCountry":"RU"},"geo":{"@type":"GeoCoordinates","latitude":43.608995,"longitude":39.720852},"hasMap":"https://yandex.ru/maps/org/akademiya_ulybki/196221666219/","foundingDate":"2026","employee":{"@type":"Physician","name":"Белоусова Александра Сергеевна","jobTitle":"Врач стоматолог-терапевт, хирург, имплантолог","alumniOf":"Новосибирский государственный медицинский университет"},"hasCredential":{"@type":"EducationalOccupationalCredential","credentialCategory":"license","name":"Лицензия Л041-01126-23/05841444","dateCreated":"2026-08-03","recognizedBy":{"@type":"GovernmentOrganization","name":"Министерство здравоохранения Краснодарского края"}},"identifier":[{"@type":"PropertyValue","propertyID":"ИНН","value":"2366057010"},{"@type":"PropertyValue","propertyID":"ОГРН","value":"1262300000038"}]}, ensure_ascii=False)

LD_SITE = json.dumps({"@context":"https://schema.org","@type":"WebSite","name":"Академия улыбки","url":SITE+"/","inLanguage":"ru-RU","publisher":{"@type":"Organization","name":"ООО «Академия улыбки»"}}, ensure_ascii=False)

def ld_faq(pairs):
    import re
    return json.dumps({"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
        {"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":re.sub("<[^>]+>","",a).strip()}} for q, a in pairs]}, ensure_ascii=False)

# ---------- фрагменты ----------
def directions():
    out = ""
    for slug, name, lead, items in DIRECTIONS:
        li = "".join(f"<li>{i}</li>" for i in items)
        # Направления и группы прейскуранта названы по-разному: прейскурант
        # повторяет разделы документа Александры. Ведём на существующий якорь,
        # иначе ссылка «Цены по направлению» открывает верх страницы.
        PRICE_ANCHOR = {"gigiena": "parodontologiya", "terapiya": "terapiya",
                        "parodontologiya": "parodontologiya", "hirurgiya": "hirurgiya",
                        "protezirovanie": "ortopediya", "estetika": "ortopediya"}
        out += f'<details class="dir qa" name="dir"><summary><span><b>{name}</b><small>{lead}</small></span><i aria-hidden="true"></i></summary><div class="qa__a dir__a"><ul>{li}</ul><a class="lnk" href="prices.html#{PRICE_ANCHOR.get(slug, slug)}">Цены по направлению</a></div></details>\n'
    return out

def reviews():
    return "".join(f'<figure class="rev rv"><blockquote>{t}</blockquote><figcaption><b>{n}</b></figcaption></figure>\n' for n, s, t in REVIEWS)

def faq_items(items, open_first=False, group="faq"):
    out = ""
    for k, (q, a) in enumerate(items):
        out += f'<details class="qa" name="{group}"{" open" if (open_first and k == 0) else ""}><summary><span>{q}</span><i aria-hidden="true"></i></summary><div class="qa__a">{a}</div></details>\n'
    return out

# Восемь вопросов вместо пяти: разворот с портретом высокий, и короткий список
# оставлял справа пустоту. Выбраны те, что задают до первого приёма, по одному
# из каждой темы — и заодно это восемь вопросов в разметке для поиска.
TEASER = [FAQ[0][1][0], FAQ[0][1][1], FAQ[0][1][3], FAQ[1][1][0],
          FAQ[2][1][1], FAQ[2][1][5], FAQ[3][1][0], FAQ[4][1][0]]
LD_FAQ = ld_faq(TEASER)

def ld_crumbs(имя, путь):
    """Хлебные крошки для поиска: в выдаче вместо голого адреса появляется
    путь «Академия улыбки → Цены»."""
    return json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Главная", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": имя, "item": SITE + путь},
        ]}, ensure_ascii=False)


def faq_teaser():
    return faq_items(TEASER)

EDU = [
 ("diplom-2015", "Диплом специалиста", "Новосибирский государственный медицинский университет Минздрава России", "2015",
  "Специальность «Стоматология», квалификация «врач-стоматолог». Очная форма обучения, пять лет."),
 ("internatura-2016", "Диплом об окончании интернатуры", "Новосибирский государственный медицинский университет Минздрава России", "2016",
  "Послевузовское профессиональное образование по специальности «Стоматология»."),
 ("sertifikat-2016", "Сертификат специалиста по стоматологии", "Новосибирский государственный медицинский университет Минздрава России", "2016",
  "Допуск к осуществлению медицинской деятельности по специальности «Стоматология». С 2021 года допуск подтверждается свидетельством об аккредитации."),
 ("perepodgotovka-2019", "Диплом о профессиональной переподготовке", "ООО «ДКА‑МЕД», Москва", "2019",
  "Программа «Организация здравоохранения и общественное здоровье», 576 часов."),
 ("sertifikat-2019", "Сертификат специалиста по организации здравоохранения", "ООО «ДКА‑МЕД», Москва", "2019",
  "Специальность «Организация здравоохранения и общественное здоровье»."),
 ("pk-2025", "Удостоверение о повышении квалификации", "Ставропольский институт непрерывного образования «Центр‑С»", "2025",
  "Программа «Организация здравоохранения и общественное здоровье», 144 часа."),
]

def edu_items():
    """Документы врача: миниатюра раскрывается в полный скан по нажатию.
    Раскрытие делает сам браузер тегом details — без скрипта и без ловушек
    для клавиатуры и чтения с экрана."""
    out = ""
    for slug, title, org, year, desc in EDU:
        out += (f'<details class="edu__i"><summary>'
                f'<img class="edu__th" src="assets/edu/{slug}-th.jpg" alt="" width="360" height="262" loading="lazy" decoding="async">'
                f'<span class="edu__tx"><b>{title}</b><span>{org} · {year}</span></span>'
                f'<i aria-hidden="true"></i></summary>'
                f'<div class="edu__a"><img src="assets/edu/{slug}.jpg" loading="lazy" decoding="async" '
                f'alt="{title}, {year}" width="1500" height="1091"><p>{desc}</p></div></details>\n      ')
    return out

def price_groups_full():
    out = ""
    for slug, name, rows in price_list():
        tr = "".join(f'<tr><td>{n}{f"<span>{note}</span>" if note else ""}</td><td>{rub(v)}</td></tr>' for n, v, note in rows)
        lead = f'<p class="pgrp__note">{MATERIALY_NOTE}</p>' if slug == "materialy" else ""
        out += f'<section class="pgrp" id="{slug}"><h2>{name}</h2>{lead}<table><tbody>{tr}</tbody></table></section>\n'
    return out

def price_main():
    """Короткий список самого частого — над полным прейскурантом."""
    tr = "".join(f'<tr><td>{n}{f"<span>{note}</span>" if note else ""}</td><td>{rub(v)}</td></tr>'
                 for n, v, note in MAIN)
    return f'<table><tbody>{tr}</tbody></table>'

def price_nav():
    return "".join(f'<a href="#{slug}">{name.split(" — ")[0]}</a>' for slug, name, rows in price_list())

# ---------- страницы ----------
import urllib.parse
wa = "https://wa.me/79897512851?text=" + urllib.parse.quote("Здравствуйте! Прошёл игру на сайте и получил промокод ПЛОМБА-10. Хочу записаться на лечение кариеса.")
INDEX = head("Академия улыбки — стоматология в Сочи, Виноградная 55/1",
  "Стоматология в Сочи на Виноградной, 55/1: лечение, имплантация, коронки и виниры. Час на первый приём и письменный план лечения.",
  f'<script type="application/ld+json">{LD_ORG}</script>\n<script type="application/ld+json">{LD_FAQ}</script>\n<script type="application/ld+json">{LD_SITE}</script>') + header("") + f"""
<!-- ВСТУПЛЕНИЕ: свет включается -->
<section class="intro" id="intro" aria-label="Вступление">
  <div class="intro__inner">
    <img class="intro__glow" src="assets/cut/flare-bloom.webp" alt="" width="853" height="854" aria-hidden="true" draggable="false">
    <span class="intro__bloom" aria-hidden="true"></span>
    <p class="intro__slogan"><b>Создаём сияние здоровой улыбки</b></p>
    <p class="intro__slogan intro__slogan--under"><b>Под светом достижений медицинской науки</b></p>
    <div class="intro__par" id="intro-par">
      <div class="intro__stage">
        <span class="intro__aura" aria-hidden="true"></span>
        <button class="intro__lamp" id="intro-lamp" type="button" aria-label="Включить свет и перейти к сайту">
          <img class="intro__off" src="assets/cut/lamp-off.webp" alt="" width="1139" height="683" draggable="false">
          <img class="intro__on" src="assets/cut/lamp-on.webp" alt="" width="1139" height="683" draggable="false">
          <img class="intro__hot" src="assets/cut/lamp-hot.webp" alt="" width="1139" height="683" draggable="false">
        </button>
      </div>
    </div>
    <div class="intro__flash" aria-hidden="true"></div>
    <div class="intro__foot">
      <p class="intro__where">{ADDR_SHORT}</p>
      <a class="btn btn--fill intro__call" href="tel:{TELRAW}" data-track="intro_call">Позвонить</a>
      <p class="intro__hint"><button class="intro__go" type="button" aria-label="Перейти к сайту"><span class="intro__golabel">Прокрутите вниз</span><span class="intro__arrow" aria-hidden="true"></span></button></p>
    </div>
  </div>
</section>
"""+f"""
<!-- ПЕРВЫЙ ЭКРАН -->
<section class="hero" id="hero">
  <div class="wrap hero__in">
    <div class="hero__txt">
      <p class="eyebrow">Новая стоматологическая клиника · Сочи, Виноградная, 55/1</p>
      <h1 class="hero__h">Стоматология, в которой на&nbsp;вас есть время</h1>
      <p class="hero__lead">«Академия улыбки» открылась в 2026 году. Два кабинета, врач с <b>одиннадцатилетней практикой</b> и <b>час на первый приём</b>: осмотр, план лечения и ответы на вопросы — <b>без спешки и лишних процедур</b>.</p>
      <div class="hero__cta">
        <a class="btn btn--fill" href="tel:{TELRAW}">Позвонить {TEL}</a>
        <a class="lnk" href="https://wa.me/79897512851" target="_blank" rel="noopener nofollow">Написать в WhatsApp</a>
      </div>
    </div>
    <figure class="hero__ph">
      <img src="assets/photo/work-2.jpg" alt="Александра Белоусова на приёме" width="1448" height="1086" fetchpriority="high">
    </figure>
  </div>
</section>

<!-- ДОКАЗАТЕЛЬСТВА -->
<section class="proof" aria-label="Факты о клинике">
  <div class="wrap proof__in">
    <div><b>Лицензия</b><span>Л041‑01126‑23/05841444, Минздрав Краснодарского края</span></div>
    <div><b>Открылись в 2026</b><span>два кабинета и новое оборудование</span></div>
    <div><b>11 лет практики</b></div>
    <div><b>Приём по записи</b></div>
  </div>
</section>

<!-- НАПРАВЛЕНИЯ -->
<section class="sec" id="napravleniya">
  <div class="wrap dirs__in">
    <header class="sec__head rv"><p class="eyebrow">Что мы делаем</p><h2>Шесть направлений — комплекс в одном месте</h2><p class="sec__note">Диагностика, лечение, хирургия и протезирование — <b>в одной клинике и у одного врача</b>: не нужно ходить по специалистам и пересобирать план лечения в каждом новом кабинете.</p><p><a class="btn" href="prices.html">Открыть прейскурант</a></p></header>
    <div class="dirs rv">{directions()}</div>
  </div>
</section>

<!-- ПЕРВЫЙ ВИЗИТ: оффер под камнем -->
<section class="sec offer sec--band" id="pervyj-vizit">
  <div class="wrap offer__in">
    <div class="offer__txt rv">
      <p class="eyebrow">Первый визит</p>
      <h2>Гигиена и консультация — в один приём</h2>
      <p class="lead">После профессиональной гигиены врач видит зубы без налёта и камня: <b>осмотр точнее, а план лечения короче</b>. Новым пациентам — <b>оба этапа одним визитом</b>.</p>
      <p class="sec__note--b">Лечение идёт по современным протоколам. Все шесть направлений в одних руках: терапия, хирургия и протезирование планируются вместе, поэтому <b>ход лечения и результат видны уже на первых этапах</b>. Переделывать не приходится, а на результат <b>врач даёт гарантию</b>. <span class="tag">срок гарантии уточняет клиника</span></p>
      <ul class="incl">
        <li>Ультразвук, Air Flow, полировка щёткой и пастой</li>
        <li>Осмотр и беседа — 60 минут</li>
        <li>Фотопротокол, письменный план и смета</li>
        <li>При необходимости — направление на КЛКТ</li>
      </ul>
      <p class="hint hint--quiet" id="drill-hint"><button class="lnk offer__skip" type="button" id="drill-skip">Показать цену</button></p>
    </div>
    <div class="offer__stage rv" id="stage">
      <div class="slab" id="slab">
        <div class="slab__offer">
          <p class="eyebrow">Первый визит</p>
          <p class="slab__price"><b>5 000 ₽</b> <s>6 000 ₽</s></p>
          <p class="slab__what">Профессиональная гигиена обеих челюстей и первичная консультация с письменным планом лечения</p>
          <a class="btn btn--fill" href="tel:{TELRAW}" data-track="offer_cta">Позвонить и записаться</a>
          <p class="fine slab__fine">По прейскуранту гигиена 5 000 ₽ и консультация 1 000 ₽. Новым пациентам консультацию не считаем. <span class="tag">скидку для новых пациентов утверждает клиника</span></p>
        </div>
        <canvas class="slab__stone pulse" id="stone" aria-hidden="true"></canvas>
      </div>
      <canvas class="offer__crumbs" id="crumbs" aria-hidden="true"></canvas>
      <span class="drill__pct" id="drill-pct" aria-hidden="true"></span>
      <div class="obj obj--hp only-fine" id="hp"><img src="assets/cut/handpiece.webp" alt="" width="585" height="692" draggable="false"></div>
    </div>
  </div>
</section>

<!-- КАБИНЕТ -->
<section class="sec equip equip--plain" id="kabinet">
  <div class="wrap">
    <div class="equip__grid">
      <figure class="rv"><img class="bw" src="assets/editorial/chair.jpg" alt="Рабочее место врача" width="1600" height="1600" loading="lazy"><figcaption><b>Два изолированных кабинета</b><span>В каждом своя стоматологическая установка. Приём идёт по предварительной записи</span></figcaption></figure>
      <figure class="rv"><img class="bw" src="assets/editorial/scanner.jpg" alt="Внутриротовой сканер" width="1600" height="1600" loading="lazy"><figcaption><b>Внутриротовой сканер</b><span>Цифровые слепки без слепочной массы. Комфорт, точность, современные технологии</span></figcaption></figure>
      <figure class="rv"><img class="bw" src="assets/photo/assistent.jpg" alt="Ассистент готовит стерильный набор инструментов к приёму" width="1000" height="1250" loading="lazy"><figcaption><b>Ассистент на каждом приёме</b><span>Инструменты проходят автоклав и раскрываются при пациенте: индивидуальная упаковка на каждый набор</span></figcaption></figure>
      <figure class="rv"><img class="bw" src="assets/editorial/diploma.jpg" alt="Диплом специалиста" width="1600" height="1600" loading="lazy"><figcaption><b>Диплом государственного образца</b><span>Квалификация врача-стоматолога подтверждена государством. В стоматологии — одиннадцатый год.</span></figcaption></figure>
    </div>
  </div>
</section>

<!-- ЭКСКУРСИЯ -->
<section class="sec tour sec--band" id="ekskursiya">
  <div class="wrap tour__in">
    <figure class="tour__ph rv">
      <img class="bw" src="assets/photo/tour-reception.jpg" alt="Ресепшн и зона ожидания клиники" width="1400" height="933" loading="lazy">
    </figure>
    <div class="tour__txt rv">
      <p class="eyebrow">Экскурсия</p>
      <h2>Изучите клинику до того, как придёте</h2>
      <!-- Сначала то, ради чего стоит смотреть, и только потом приглашение.
           Обратный порядок — сначала «посмотрите», потом «а там вот что» —
           требует от человека поверить на слово и только после этого
           вознаграждает. -->
      <p class="lead">Два изолированных кабинета, в каждом своя установка. Стерилизационная зона с автоклавом: инструменты раскрывают при пациенте, одноразовое уходит в утилизацию после каждого приёма. Цифровой сканер вместо слепочной массы. Чистота и удобство складываются из мелочей, которые на приёме обычно не показывают.</p>
      <p class="sec__note--b">Всё это можно рассмотреть своими глазами — онлайн и без записи. Экскурсия интерактивная, а по дороге спрятана игра: победите кариес и заберите подарочный сертификат в клинику. <span class="tag">номинал сертификата утверждает клиника</span></p>
      <p><a class="btn btn--fill" href="{TOUR}" target="_blank" rel="noopener" data-track="tour_open">Пройти экскурсию</a></p>
    </div>
  </div>
</section>

<!-- ИГРА: ПЛОМБА -->
<section class="sec fill" id="plomba">
  <div class="wrap">
    <header class="sec__head sec__head--c rv"><p class="eyebrow">Материалы</p><h2>Реставрация, которая служит десять лет и дольше</h2><p class="sec__note">Современные композиты держатся <b>десять лет и дольше</b> — но только если аккуратно пройдены <b>все этапы</b>: подготовка эмали, промывание, послойная укладка, полимеризация калиброванной лампой и полировка края. Небрежность на любом из них — и пломба окажется недолговечной.</p></header>
    <div class="fill__in rv" id="fill-arena">
      <div class="fill__stage" id="fill-stage">
        <div class="tooth" id="tooth-box">
          <img class="tooth__bad" id="th-bad" src="assets/cut/tooth-bad.webp" alt="Зуб с трещиной и сколами" width="620" height="762" draggable="false" loading="lazy">
          <img class="tooth__ok" id="th-ok" src="assets/cut/tooth-ok.webp" alt="Восстановленный зуб" width="620" height="762" draggable="false" loading="lazy">
          <canvas class="tooth__lay tooth__etch" id="etch" aria-hidden="true"></canvas>
          <canvas class="tooth__lay tooth__paint" id="paint" aria-hidden="true"></canvas>
          <span class="tooth__wet" id="wet" aria-hidden="true"></span>
          <span class="tooth__shine" id="shine" aria-hidden="true"></span>
        </div>
        <span class="uvwash" id="uvwash" aria-hidden="true"></span>
        <canvas class="fill__bits" id="bits" aria-hidden="true"></canvas>
        <div class="cureBar" id="cure-bar" aria-hidden="true"><i></i></div>
      </div>
      <div class="rack" id="rack">
        <div class="obj obj--tool is-off" id="t-etch" data-k="1"><img src="assets/cut/etch-syringe.webp" alt="Шприц с гелем для подготовки эмали" width="900" height="864" draggable="false" loading="lazy"><b class="obj__n">1</b><span class="obj__c">Подготовка</span></div>
        <div class="obj obj--tool is-off" id="t-rinse" data-k="2"><img src="assets/cut/water-gun.webp" alt="Пистолет вода‑воздух" width="620" height="900" draggable="false" loading="lazy"><b class="obj__n">2</b><span class="obj__c">Промывание</span></div>
        <div class="obj obj--tool is-off" id="t-comp" data-k="3"><img src="assets/cut/syringe.webp" alt="Шприц с композитом" width="760" height="652" draggable="false" loading="lazy"><b class="obj__n">3</b><span class="obj__c">Композит</span></div>
        <div class="obj obj--tool is-off" id="t-uv" data-k="4"><img src="assets/cut/cure-lamp.webp" alt="Полимеризационная лампа" width="760" height="681" draggable="false" loading="lazy"><span class="obj__glow" aria-hidden="true"></span><b class="obj__n">4</b><span class="obj__c">Свет</span></div>
        <div class="obj obj--tool is-off" id="t-pol" data-k="5"><img src="assets/cut/polish.webp" alt="Наконечник со щёткой для полировки" width="900" height="782" draggable="false" loading="lazy"><b class="obj__n">5</b><span class="obj__c">Полировка</span></div>
      </div>
      <p class="fill__say" id="fill-say" role="status"></p>
      <div class="fill__bot">
        <p class="fill__score" id="fill-score"></p>
        <button class="fill__again" type="button" id="fill-again" title="Пройти заново" aria-label="Пройти заново"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.6h-4.6"/></svg></button>
      </div>
      <div class="promo" id="promo" hidden>
        <p class="eyebrow">Готово</p>
        <p class="promo__code">ПЛОМБА‑10</p>
        <p class="promo__t">Промокод на скидку 10 % на лечение кариеса для новых пациентов. Назовите его администратору или отправьте в сообщении. <span class="tag">черновик условий</span></p>
        <a class="btn btn--fill" href="{wa}" target="_blank" rel="noopener nofollow" data-track="promo_wa">Получить скидку в WhatsApp</a>
      </div>
    </div>
    <ol class="steps vi-only">
      <li><b>Подготовка эмали</b><span>Гель протравливает поверхность, чтобы композит сцепился с тканью зуба.</span></li>
      <li><b>Промывание и сушка</b><span>Гель смывается водой, поверхность высушивается воздухом.</span></li>
      <li><b>Послойная укладка композита</b><span>Материал вносится тонкими слоями — так он меньше даёт усадку.</span></li>
      <li><b>Полимеризация светом</b><span>Каждый слой засвечивается калиброванной лампой.</span></li>
      <li><b>Шлифовка и полировка</b><span>Край пломбы выводится вровень с эмалью и полируется.</span></li>
    </ol>
  </div>
</section>

<!-- ВРАЧ -->
<section class="sec doc" id="vrach">
  <div class="wrap doc__in">
    <div class="doc__txt rv">
      <div class="doc__head">
        <img class="doc__ava" src="assets/cut/doc-portrait.webp" alt="Белоусова Александра Сергеевна" width="600" height="600" loading="lazy">
        <div>
          <p class="eyebrow">Кто ведёт приём</p>
          <h2>Белоусова Александра Сергеевна</h2>
        </div>
      </div>
      <p class="lead">Стоматолог-терапевт, хирург, имплантолог. <b>В практике с 2015 года.</b> Основатель клиники и её главный врач: диагностику, лечение, удаление, имплантацию и протезирование пациент проходит <b>у одного специалиста</b>.</p>
      <dl class="creds">
        <div><dt>Образование</dt><dd>Новосибирский государственный медицинский университет, «Стоматология», 2015</dd></div>
        <div><dt>Стаж</dt><dd>11 лет</dd></div>
        <div><dt>Специализации</dt><dd>Терапия, эндодонтия, пародонтология, хирургия, имплантация, ортопедия</dd></div>
      </dl>
    </div>
    <figure class="doc__ph doc__ph--one rv">
      <img class="bw" src="assets/photo/work-1.jpg" alt="Александра Белоусова на приёме" width="1448" height="1086" loading="lazy">
      <figcaption>Александра Сергеевна на приёме</figcaption>
    </figure>
  </div>
</section>

<!-- ПЕРЕБИВКА: после врача -->
<section class="sec lfband" id="zapis" aria-label="Записаться на приём">
  <div class="wrap lfband__in lfband__in--pair rv">
    {lead_form("lf-doc", "Запись", "Записаться к Александре Сергеевне",
               "Оставьте имя и телефон — подберём время под ваш график. Первичная консультация с осмотром и письменным планом лечения — 1 000 ₽.")}
    <!-- Что будет после отправки. Главный страх у формы без ответа — «я оставлю
         телефон, и что?». Здесь только то, что форма действительно делает, и
         факт о приёме, который есть на странице выше: ничего, чего клиника не
         может выполнить. -->
    <aside class="lfnext">
      <p class="eyebrow">Что дальше</p>
      <ol class="lfnext__l">
        <li><b>Перезвоним</b><span>в то время, которое вы выбрали</span></li>
        <li><b>Подберём день и час</b><span>под ваш график</span></li>
        <li><b>Приём — час</b><span>осмотр, письменный план и ответы на вопросы</span></li>
      </ol>
    </aside>
  </div>
</section>

<!-- ОТЗЫВЫ -->
<section class="sec revs" id="otzyvy">
  <div class="wrap">
    <header class="sec__head sec__head--c rv"><p class="eyebrow">Отзывы</p><h2>Что пишут пациенты</h2></header>
    <div class="revs__grid">{reviews()}</div>
  </div>
</section>

<!-- ИГРА: СТЕРИЛЬНОСТЬ -->
<section class="sec tray sec--band" id="sterilno">
  <div class="wrap">
    <header class="sec__head sec__head--c rv"><p class="eyebrow">Стерильность</p><h2>Набор инструментов — на одного пациента</h2><p class="sec__note">Каждый набор проходит <b>стерилизацию в автоклаве</b> и хранится <b>в упаковке до вашего приёма</b>. Одноразовое — слюноотсосы, салфетки, перчатки, стаканы — <b>утилизируется после каждого пациента</b>.</p><p class="hint hint--c rv" id="tray-hint"><span class="hint__i" aria-hidden="true"></span>Соберите набор — начнётся многоступенчатая стерилизация.</p></header>
    <div class="tray__stage rv" id="tray-stage">
      <svg class="tray__svg" viewBox="0 0 800 380" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <radialGradient id="uvhalo" cx="50%" cy="50%"><stop offset="0" stop-color="#8C64FF" stop-opacity=".55"/><stop offset="55%" stop-color="#8C64FF" stop-opacity=".18"/><stop offset="100%" stop-color="#8C64FF" stop-opacity="0"/></radialGradient>
          <radialGradient id="uvwash-g" cx="50%" cy="20%"><stop offset="0" stop-color="#8C64FF" stop-opacity=".30"/><stop offset="60%" stop-color="#8C64FF" stop-opacity=".10"/><stop offset="100%" stop-color="#8C64FF" stop-opacity="0"/></radialGradient>
          <filter id="soft" x="-40%" y="-120%" width="180%" height="360%"><feGaussianBlur stdDeviation="18"/></filter>
        </defs>
        <ellipse class="tray__wash" cx="400" cy="250" rx="330" ry="150" fill="url(#uvwash-g)" filter="url(#soft)"/>
        <ellipse class="tray__halo" cx="400" cy="70" rx="290" ry="52" fill="url(#uvhalo)" filter="url(#soft)"/>
        <line class="tray__wire" x1="400" y1="0" x2="400" y2="70" stroke-width="1.5"/>
        <line class="tray__tube" x1="180" y1="70" x2="620" y2="70" stroke-width="4" stroke-linecap="round"/>
        <rect class="tray__rect" x="120" y="216" width="560" height="120" rx="14"/>
        <rect class="tray__rim" x="134" y="228" width="532" height="96" rx="10"/>
      </svg>
      <div class="tool tool--mirror wiggle" data-tool="mirror"><img src="assets/cut/mirror.webp" alt="Зеркало" width="389" height="525" draggable="false"></div>
      <div class="tool tool--probe wiggle" data-tool="probe"><img src="assets/cut/probe.webp" alt="Зонд" width="457" height="415" draggable="false"></div>
      <div class="tool tool--tweezers wiggle" data-tool="tweezers"><img src="assets/cut/tweezers.webp" alt="Пинцет" width="566" height="368" draggable="false"></div>
      <div class="tool tool--forceps wiggle" data-tool="forceps"><img src="assets/cut/forceps.webp" alt="Щипцы для удаления зуба" width="854" height="900" draggable="false"></div>
      <div class="tool tool--bur wiggle" data-tool="bur"><img src="assets/cut/bur.webp" alt="Бор" width="100" height="1200" draggable="false"></div>
      <p class="tray__done" id="tray-done" aria-live="polite"></p>
    </div>
    <div class="tray__cta" id="tray-cta" hidden>
      <p class="tray__cta-t">Набор готов к вашему приёму</p>
      <a class="btn btn--fill" href="tel:{TELRAW}" data-track="tray_cta">Записаться на приём</a>
      <p class="tray__cta-p">Первичная консультация с планом лечения — <b>1 000 ₽</b></p>
    </div>
  </div>
    <ul class="steps steps--plain vi-only">
      <li><b>Одноразовое — в отходы</b><span>Слюноотсосы, салфетки, перчатки и стаканы меняются после каждого пациента.</span></li>
      <li><b>Многоразовое — в автоклав</b><span>Зеркало, зонд, пинцет, щипцы и боры проходят стерилизацию паром под давлением.</span></li>
      <li><b>Индивидуальная упаковка</b><span>Набор запаивается и хранится закрытым до приёма.</span></li>
      <li><b>Вскрытие при пациенте</b><span>Упаковка открывается в кабинете, у вас на глазах.</span></li>
    </ul>
    <p class="vi-only"><a class="btn btn--fill" href="tel:{TELRAW}" data-track="tray_cta_vi">Записаться на приём</a></p>
</section>


<!-- ВОПРОСЫ -->
<section class="sec faqt" id="voprosy">
  <div class="wrap faqt__in">
    <!-- Разворот как в журнальном интервью: слева тот, кто отвечает, справа
         вопросы. Издание нигде не названо и журналист не выдуман — это приём
         вёрстки, а не ссылка на несуществующую публикацию. Подписи под
         снимком нет намеренно: кто отвечает, сказано в заголовке, а второй
         раз представлять врача, у которого на сайте есть отдельный раздел, —
         лишнее. Имя остаётся в alt: для поиска и для чтения с экрана. -->
    <figure class="faqt__who rv">
      <span class="faqt__ph-w">
        <img class="faqt__ph" src="assets/cut/A2-three-quarter.webp"
             alt="Александра Белоусова, главный врач клиники «Академия улыбки»"
             width="298" height="1000" loading="lazy" decoding="async" draggable="false">
      </span>
    </figure>
    <div class="faqt__talk">
      <header class="sec__head faqt__head rv">
        <p class="eyebrow">Вопросы и ответы</p>
        <h2>Главный врач отвечает на частые вопросы пациентов</h2>
      </header>
      <div class="qas qas--talk rv">{faq_teaser()}</div>
      <p class="faqt__all rv"><a class="btn" href="faq.html">Все вопросы</a></p>
    </div>
  </div>
</section>

<!-- ПЕРЕБИВКА: после вопросов.
     Раньше здесь стояла вторая такая же форма, что и после врача: те же поля,
     тот же текст, разница только в надписи на кнопке. Повтор одного экрана
     внутри одной страницы человек перестаёт замечать, а остаётся ощущение, что
     у него настойчиво просят телефон. Теперь здесь одна строка и два действия:
     позвонить сразу или открыть то же окно заявки. -->
<section class="sec lfband lfband--alt lfband--slim" id="svyaz" aria-label="Задать вопрос">
  <div class="wrap lfband__in lfband__in--slim rv">
    <p class="eyebrow">Остались вопросы</p>
    <h3 class="lfslim__t">Свяжемся с вами в удобное время</h3>
    <p class="lfslim__acts">
      <a class="btn btn--fill" href="tel:{TELRAW}" data-track="faq_call">Позвонить {TEL}</a>
      <button class="lnk lfslim__more" type="button" data-lf-open data-track="faq_lead">Оставить заявку</button>
    </p>
  </div>
</section>

<!-- КОНТАКТЫ -->
<section class="sec contact sec--band" id="kontakty">
  <div class="wrap contact__in">
    <div class="rv contact__top">
     <div class="contact__info">
      <p class="eyebrow">Контакты</p>
      <h2>Виноградная, 55/1</h2>
      <dl class="creds">
        <div><dt>Адрес</dt><dd>Сочи, ул. Виноградная, 55/1, пом. 22, 2‑й этаж<br><span class="small">140 м от санатория «Радуга», есть парковка</span></dd></div>
        <div><dt>Телефон</dt><dd><a class="lnk" href="tel:{TELRAW}">{TEL}</a></dd></div>
        <div><dt>WhatsApp</dt><dd><a class="lnk" href="https://wa.me/79897512851" target="_blank" rel="noopener nofollow">Написать</a></dd></div>
        <div><dt>Приём</dt><dd>По предварительной записи</dd></div>
        <div><dt>Оплата</dt><dd>Наличные, карта, QR‑код. Рассрочка обсуждается на приёме</dd></div>
      </dl>
     </div>
      <!-- Единственное цветное фото на странице — и намеренно последнее.
           В чёрно-белом варианте здесь серое здание и облака: получалось
           похоже на траурное объявление, а это финальный кадр перед тем,
           как человек решает позвонить. В цвете работают вывеска и небо. -->
      <figure class="contact__photo"><img src="assets/photo/facade.jpg" alt="Вход в клинику" width="952" height="1268" loading="lazy"><figcaption>Вход с улицы Виноградной</figcaption></figure>
    </div>
    <!-- Место под карту. Пока её не открыли, здесь не фотография, а спокойная
         плашка: фотография входа стоит в своей колонке рядом с реквизитами и
         никуда не переезжает. Раньше было наоборот — снимок занимал место
         карты, а по нажатию уезжал наверх и превращался в миниатюру. Человек
         нажимал на карту, а в ответ у него перестраивалась вся страница.
         Высота плашки равна высоте рамки, поэтому при открытии ничего не
         сдвигается: карта просто встаёт на своё место. -->
    <div class="map rv" id="map">
      <div class="map__ask">
        <!-- Схема вместо пустого прямоугольника. Нарисована разметкой, а не
             картинкой: весит ноль, читается при любом размере шрифта и
             переживает режим для слабовидящих. Чужую карту по-прежнему не
             грузим, пока человек её не попросил, — чтобы не отдавать IP
             каждого посетителя третьей стороне.
             Оба дома нечётные и стоят по одной стороне улицы: санаторий
             «Радуга» — Виноградная, 53, клиника — 55/1. Это всё, что схема
             утверждает; точную геометрию показывает настоящая карта. -->
        <div class="plan">
          <p class="plan__street">ул. Виноградная</p>
          <div class="plan__road" aria-hidden="true"></div>
          <div class="plan__row">
            <div class="plan__sp">
              <p class="plan__n">55/1</p>
              <p class="plan__name">Академия улыбки</p>
              <p class="plan__fine">вход с улицы · 2‑й этаж · парковка</p>
            </div>
            <p class="plan__dist"><span>140 м</span></p>
            <div class="plan__sp plan__sp--nb">
              <p class="plan__n">53</p>
              <p class="plan__name">Санаторий «Радуга»</p>
            </div>
          </div>
        </div>
        <button class="map__go" type="button" id="map-go" data-map-src="{MAP_SRC}">Показать карту</button>
      </div>
    </div>
  </div>
</section>

""" + FOOTER

PRICES = head("Цены на лечение зубов в Сочи — «Академия улыбки»",
  "Прейскурант стоматологической клиники «Академия улыбки» в Сочи: консультация, гигиена, лечение, хирургия, имплантация, протезирование, виниры.",
  f'<script type="application/ld+json">{LD_ORG}</script>\n'
  f'<script type="application/ld+json">{ld_crumbs("Цены", "/prices.html")}</script>',
  path="/prices.html") + header("prices") + f"""
<section class="page">
  <div class="wrap page__head">
    <p class="eyebrow">Прейскурант</p>
    <h1>Цены на услуги</h1>
    <p class="lead">{EDITION} Цены в рублях, <b>не являются публичной офертой</b>. Точная стоимость фиксируется <b>в письменном плане лечения</b> после осмотра. В стоимость лечения входят анестезия и изоляция. Рентгеновские снимки и КЛКТ выполняются по направлению в диагностическом центре.</p>
  </div>
  <div class="wrap pmain">
    <h2>Чаще всего спрашивают</h2>
    {price_main()}
    <p class="pmain__note">Ниже — полный прейскурант со всеми позициями и кодами по номенклатуре медицинских услуг (приказ Минздрава России № 804н).</p>
  </div>
  <nav class="pnav" aria-label="Группы услуг"><div class="wrap pnav__in">{price_nav()}</div></nav>
  <div class="wrap prices">{price_groups_full()}</div>
  <div class="wrap notes">
    <p><b>О наименованиях.</b> {FOOTNOTE}</p>
    <div class="wrap notes">
    <p><b>Рассрочка.</b> Для планового лечения; условия обсуждаются на приёме, когда составлен план.</p>
    <p><b>Налоговый вычет 13 %.</b> Выдаём договор, копию лицензии и справку об оплате медицинских услуг.</p>
    <p><b>Вопросы по ценам</b> — по телефону <a class="lnk" href="tel:{TELRAW}">{TEL}</a>.</p>
  </div>
</section>
""" + FOOTER

def faq_page():
    ld = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}
    import re
    body = ""
    for topic, items in FAQ:
        body += f'<section class="faqg"><h2>{topic}</h2>{faq_items(items)}</section>\n'
        for q, a in items:
            ld["mainEntity"].append({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":re.sub("<[^>]+>","",a).strip()}})
    n = sum(len(i) for _, i in FAQ)
    return head("Вопросы о лечении зубов — «Академия улыбки», Сочи",
      "Ответы врача-стоматолога на частые вопросы: первый визит, гигиена и отбеливание, лечение, удаление, имплантация, коронки и виниры.",
      f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>', path="/faq.html") + header("faq") + f"""
<section class="page">
  <div class="wrap page__head">
    <p class="eyebrow">Вопросы и ответы</p>
    <h1>{n} вопросов, которые задают чаще всего</h1>
    <p class="lead">Отвечает <b>Александра Белоусова</b>, врач стоматолог-терапевт, хирург, имплантолог, главный врач клиники. Ответы общие: как обстоят дела именно у вас, можно узнать только на осмотре.</p>
    <nav class="pnav pnav--inline" aria-label="Темы">{"".join(f'<a href="#t{k}">{t}</a>' for k,(t,_) in enumerate(FAQ))}</nav>
  </div>
  <div class="wrap faq">{"".join(f'<section class="faqg" id="t{k}"><h2>{t}</h2>{faq_items(i)}</section>' for k,(t,i) in enumerate(FAQ))}</div>
  <div class="wrap faq__foot">
    <p class="lead">Не нашли свой вопрос? Позвоните — <a class="lnk" href="tel:{TELRAW}">{TEL}</a> — или напишите в <a class="lnk" href="https://wa.me/79897512851" target="_blank" rel="noopener nofollow">WhatsApp</a>.</p>
  </div>
</section>
""" + FOOTER

PRIVACY = head("Политика обработки персональных данных — «Академия улыбки»",
  "Как стоматология «Академия улыбки» обрабатывает персональные данные посетителей сайта, какие cookie использует и как направить запрос.",
  f'<script type="application/ld+json">{ld_crumbs("Политика обработки персональных данных", "/privacy.html")}</script>',
  path="/privacy.html") + header("") + f"""
<section class="page">
  <div class="wrap page__head">
    <p class="crumb"><a href="docs.html">← Документы</a></p>
    <h1>Политика обработки персональных данных</h1>
    <p class="lead">Редакция от 6 сентября 2026 года. Документ подготовлен по 152‑ФЗ «О персональных данных» и 323‑ФЗ «Об основах охраны здоровья граждан». <span class="tag">черновик — требует проверки юристом</span></p>
  </div>
  <div class="wrap notes doc__legal">
    <h2>1. Оператор</h2>
    <p>ООО «Академия улыбки», ОГРН 1262300000038, ИНН 2366057010. Адрес: 354008, Краснодарский край, г. Сочи, ул. Виноградная, д. 55/1, пом. 22. Телефон {TEL}.</p>
    <h2>2. Какие данные мы обрабатываем через сайт</h2>
    <p><b>Данные, которые вы указываете сами.</b> В форме обратной связи на сайте вы сообщаете <b>имя</b> и <b>номер телефона</b>. Эти два поля — всё, что запрашивает форма.</p>
    <p>Форма не предназначена для сведений о состоянии здоровья. Не указывайте в ней жалобы, диагнозы, перенесённые заболевания и принимаемые препараты: такие сведения относятся к специальной категории персональных данных, и обсуждать их правильнее на приёме или по телефону, а не в открытой форме на сайте.</p>
    <p>Отправляя форму, вы подтверждаете согласие на обработку указанных данных — для этого под формой стоит отдельная отметка. Без неё форма не отправляется.</p>
    <p><b>Данные, которые собираются автоматически.</b> При посещении сайта обрабатываются обезличенные технические данные: IP‑адрес, тип устройства и браузера, источник перехода, просмотренные страницы, время на странице, нажатия на кнопки «Позвонить» и «Написать». Эти данные не позволяют установить личность.</p>
    <h2>3. Цели обработки</h2>
    <p><b>Имя и телефон из формы</b> обрабатываются с одной целью: связаться с вами, чтобы ответить на вопрос и согласовать время приёма. Для рассылок, рекламы и передачи третьим лицам эти данные не используются. Правовое основание — ваше согласие, пункт 1 части 1 статьи 6 Федерального закона № 152‑ФЗ.</p>
    <p><b>Технические данные</b> обрабатываются для обеспечения работы сайта, защиты от сбоев и злоупотреблений, оценки удобства разделов. Правовое основание — законный интерес оператора, а для статистики — ваше согласие.</p>
    <h2 id="cookie-razdel">4. Cookie</h2>
    <p><b>Необходимые.</b> Хранят ваш выбор в этом окне согласия и технические настройки отображения. Работают всегда, без них сайт не может функционировать корректно.</p>
    <p><b>Статистические.</b> Яндекс.Метрика (ООО «Яндекс», Россия). Включаются только после нажатия «Принять всё». Собирают обезличенную статистику посещений. Отозвать согласие можно в любой момент кнопкой «Настройки cookie» в подвале сайта или очисткой cookie в браузере.</p>
    <p>Рекламные и таргетинговые cookie сайт не использует. Данные за пределы Российской Федерации не передаются.</p>
    <h2>5. Сроки, хранение и защита</h2>
    <p><b>Имя и телефон из формы</b> хранятся до достижения цели обращения и уничтожаются не позднее одного года с даты обращения. Если вы стали пациентом клиники, ваши данные переходят в медицинскую документацию и хранятся по срокам, установленным для медицинских карт.</p>
    <p><b>Технические логи</b> хранятся не более шести месяцев, статистика Яндекс.Метрики — по правилам сервиса.</p>
    <p>Данные обрабатываются на серверах, расположенных на территории Российской Федерации. Доступ к ним имеют только работники клиники, которым он нужен по должности; передача идёт по защищённому соединению (HTTPS). Данные за пределы Российской Федерации не передаются. Третьим лицам данные не передаются, за исключением поставщика услуг хостинга, действующего по поручению оператора в соответствии с частью 3 статьи 6 Федерального закона № 152‑ФЗ.</p>
    <h2>6. Ваши права</h2>
    <p>Вы вправе получить сведения об обработке ваших персональных данных, потребовать уточнения, блокирования или уничтожения данных, если они неполные, неточные, незаконно полученные или не нужны для заявленной цели, а также отозвать ранее данное согласие.</p>
    <h2 id="zapros">7. Как направить запрос</h2>
    <p>Запрос подаётся письменно по адресу клиники, устно по телефону <a class="lnk" href="tel:{TELRAW}">{TEL}</a> либо в форме электронного документа, подписанного электронной подписью.</p>
    <p>Чтобы мы могли вас идентифицировать и не выдать сведения постороннему, статья 14 Федерального закона № 152‑ФЗ требует указать в запросе:</p>
    <p>— фамилию, имя и отчество;<br>
       — номер основного документа, удостоверяющего личность, дату его выдачи и выдавший орган;<br>
       — сведения, подтверждающие ваше участие в отношениях с клиникой: номер договора, дату обращения или иные сведения, либо сведения, иным образом подтверждающие факт обработки ваших данных;<br>
       — вашу подпись.</p>
    <p><b>Сроки ответа.</b> Сведения об обработке предоставляем в течение десяти рабочих дней с даты получения запроса; срок может быть продлён не более чем на пять рабочих дней — с уведомлением о причинах продления. Неточные данные уточняем в течение семи рабочих дней с даты предоставления подтверждающих сведений. При отзыве согласия или достижении цели обработки прекращаем обработку и уничтожаем данные в срок, не превышающий тридцати дней.</p>
    <p><b>Отзыв согласия на статистические cookie</b> — кнопкой «Настройки cookie» в подвале любой страницы, сразу и без обращения к нам. Отзыв согласия на обработку данных, переданных при обращении в клинику, — письменным заявлением по адресу клиники.</p>
    <p><b>Куда обращаться по вопросам обработки персональных данных:</b> по телефону <a class="lnk" href="tel:{TELRAW}">{TEL}</a> или письмом по адресу клиники — 354008, г. Сочи, ул. Виноградная, 55/1, пом. 22. Обращение принимает ответственный за организацию обработки персональных данных, назначенный приказом по организации в порядке статьи 22.1 Федерального закона № 152‑ФЗ.</p>
    <p>Если ответ вас не устроил, вы вправе обратиться в Управление Роскомнадзора по Краснодарскому краю и Республике Адыгея или в суд.</p>
    <h2>8. Изменения</h2>
    <p>Новая редакция публикуется на этой странице. Продолжая пользоваться сайтом, вы соглашаетесь с действующей редакцией.</p>
    <p class="crumb crumb--foot"><a href="docs.html">← Вернуться к документам</a><a class="crumb__up" href="#main">Наверх ↑</a></p>
  </div>
</section>
""" + FOOTER

def doc_row(title, desc, href=None, state=None):
    """Строка раздела «Документы». Внешние ссылки открываются в новой вкладке:
    иначе человек уходит с сайта клиники на портал правовой информации и
    возвращается только кнопкой «назад»."""
    if href and href.startswith("http"):
        t = f'<a class="docs__t docs__t--ext" href="{href}" target="_blank" rel="noopener nofollow">{title}</a>'
    elif href:
        t = f'<a class="docs__t" href="{href}">{title}</a>'
    else:
        t = f'<span class="docs__t docs__t--off">{title}</span>'
    s = f'<span class="docs__s docs__s--{ {"готовится":"soon","форма":"form","по запросу":"ask"}.get(state,"soon") }">{state}</span>' if state else ''
    return f'<li>{t}{s}<p>{desc}</p></li>' 

DOCS = head("Документы и лицензия — «Академия улыбки», Сочи",
  "Лицензия, сведения о клинике, политика обработки персональных данных, образцы договоров и правила оказания платных медицинских услуг.",
  f'<script type="application/ld+json">{LD_ORG}</script>\n'
  f'<script type="application/ld+json">{ld_crumbs("Документы", "/docs.html")}</script>',
  path="/docs.html") + header("docs") + f"""
<section class="page">
  <div class="wrap page__head">
    <p class="eyebrow">Правовая информация</p>
    <h1>Документы</h1>
    <p class="lead">Всё, что клиника обязана показать пациенту по приказу Минздрава России № 118н и правилам оказания платных медицинских услуг. Разделы идут в том же порядке, что и в приказе.</p>
    <nav class="pnav pnav--inline" aria-label="Разделы">
      <a href="#o-klinike">О клинике</a><a href="#obrazovanie">Образование врача</a><a href="#uslugi">Платные услуги</a><a href="#prava-pacienta">Права пациента</a><a href="#personalnye-dannye">Персональные данные</a><a href="#obrashcheniya-doc">Обращения и контроль</a>
    </nav>
  </div>
  <div class="wrap docs">

    <h2 id="o-klinike">О клинике</h2>
    <ul class="docs__l">
      {doc_row("Сведения о медицинской организации", "Полное наименование и реквизиты, адреса, режим работы, лицензия и перечень работ по ней, порядок оказания услуг.", "info.html")}
      {doc_row("Лицензия на медицинскую деятельность", "Номер, дата выдачи, лицензирующий орган и полный перечень работ и услуг, на которые выдана лицензия.", "info.html#licenziya")}
      {doc_row("Документы об образовании и квалификации врача", "Диплом специалиста, интернатура, профессиональная переподготовка и повышение квалификации — с указанием учреждения, программы и года.", "info.html#vrach")}
      {doc_row("Выписка из реестра лицензий с двумерным кодом", "Бумажные лицензии с 2022 года не выдают: действительность проверяется по выписке из государственного реестра.", None, "готовится")}
      {doc_row("Выписка из ЕГРЮЛ", "Предоставляется для ознакомления по требованию — по телефону или в клинике.", None, "по запросу")}
    </ul>

    <h2 id="obrazovanie">Документы об образовании врача</h2>
    <p class="edu__note">Документы 2015 и 2016 годов выданы на фамилию Бондарева — врач сменила фамилию после замужества.</p>
    <div class="edu">
      {edu_items()}
    </div>

    <h2 id="uslugi">Платные услуги</h2>
    <ul class="docs__l">
      {doc_row("Цены на услуги", "Действующий прейскурант с кодами по номенклатуре медицинских услуг. Точная стоимость лечения фиксируется в письменном плане после осмотра.", "prices.html")}
      {doc_row("Образцы договоров на оказание платных медицинских услуг", "Для взрослого пациента, для ребёнка через законного представителя и для заказчика — юридического лица.", None, "готовится")}
      {doc_row("Правила предоставления платных медицинских услуг", "Постановление Правительства Российской Федерации от 30.05.2026 № 659, действует с 1 сентября 2026 года. Официальный текст на портале правовой информации.", "http://publication.pravo.gov.ru/document/0001202606010083")}
    </ul>

    <h2 id="prava-pacienta">Права пациента</h2>
    <ul class="docs__l">
      {doc_row("Права и обязанности пациента", "Выбор врача, информация о состоянии здоровья, врачебная тайна, отказ от вмешательства, копии медицинских документов.", "info.html#prava")}
      {doc_row("Информированное добровольное согласие на медицинское вмешательство", "Подписывается до начала лечения. Форма и порядок — по статье 20 Федерального закона № 323‑ФЗ.", None, "форма")}
      {doc_row("Правила поведения пациента в клинике", "Утверждаются приказом по организации. Договор ссылается на них в силу части 3 статьи 27 Федерального закона № 323‑ФЗ.", None, "готовится")}
      {doc_row("Право получить медицинскую помощь бесплатно", "Клиника работает на платной основе. Тот же вид помощи можно получить без взимания платы в медицинских организациях, участвующих в программе государственных гарантий.", "info.html#besplatno")}
    </ul>

    <h2 id="personalnye-dannye">Персональные данные</h2>
    <ul class="docs__l">
      {doc_row("Политика обработки персональных данных", "Какие данные обрабатываются, зачем, сколько хранятся и кому передаются.", "privacy.html")}
      {doc_row("Как направить запрос о своих данных", "Что указать в запросе по статье 14 Федерального закона № 152‑ФЗ и в какие сроки клиника обязана ответить.", "privacy.html#zapros")}
      {doc_row("Согласие на обработку персональных данных", "Бланк, который подписывается на первом приёме. Отдельно — согласие на обработку сведений о состоянии здоровья.", None, "форма")}
      {doc_row("Настройки cookie", "Изменить или отозвать согласие на статистические cookie можно в любой момент: кнопка «Настройки cookie» стоит в самом низу каждой страницы.", "privacy.html#cookie-razdel")}
    </ul>

    <h2 id="obrashcheniya-doc">Обращения и контроль</h2>
    <ul class="docs__l">
      {doc_row("Отзыв, предложение или претензия", "Лично в клинике, по телефону или письмом по адресу клиники. Срок ответа на письменное обращение — 30 дней.", "info.html#obrashcheniya")}
      {doc_row("Контролирующие органы", "Министерство здравоохранения Краснодарского края, территориальный орган Росздравнадзора, Управление Роспотребнадзора по Краснодарскому краю.", "info.html#kontrol")}
      {doc_row("Клинические рекомендации Министерства здравоохранения", "Рубрикатор, на основе которого оказывается медицинская помощь.", "https://cr.minzdrav.gov.ru/")}
    </ul>

    <p class="docs__note">Пометка <b>«готовится»</b> означает, что документ существует в клинике, но ещё не выложен здесь; <b>«форма»</b> — бланк, который подписывают на приёме; <b>«по запросу»</b> — выдаётся по требованию. Любой из них можно попросить по телефону <a class="lnk" href="tel:{TELRAW}">{TEL}</a>.</p>
  </div>
</section>
""" + FOOTER

INFO = head("Сведения о клинике, лицензия и врач — «Академия улыбки», Сочи",
  "Реквизиты ООО «Академия улыбки», лицензия на медицинскую деятельность, сведения о враче, права пациента и контакты контролирующих органов.",
  f'<script type="application/ld+json">{LD_ORG}</script>\n'
  f'<script type="application/ld+json">{ld_crumbs("Сведения о клинике", "/info.html")}</script>',
  path="/info.html") + header("") + f"""
<section class="page">
  <div class="wrap page__head">
    <p class="crumb"><a href="docs.html">← Документы</a></p>
    <h1>Сведения о медицинской организации</h1>
    <p class="lead">Раздел размещён по приказу Минздрава России № 118н от 13.03.2025 (действует с 1 сентября 2025 года, заменил приказ № 956н) и Правилам предоставления платных медицинских услуг (постановление Правительства РФ № 736 от 11.05.2023). <span class="tag">черновик — требует проверки юристом</span></p>
  </div>
  <div class="wrap notes doc__legal">

    <h2>Организация</h2>
    <p><b>Полное наименование:</b> Общество с ограниченной ответственностью «Академия улыбки».<br>
       <b>Сокращённое наименование:</b> ООО «Академия улыбки».<br>
       <b>ОГРН</b> 1262300000038 · <b>ИНН</b> 2366057010 · <b>КПП</b> 236601001.<br>
       <b>Юридический адрес:</b> 354008, Краснодарский край, г. Сочи, ул. Виноградная, д. 22/1Б, кв. 61.<br>
       <b>Адрес осуществления медицинской деятельности:</b> 354008, г. Сочи, Центральный район, ул. Виноградная, д. 55/1, пом. 22, 2‑й этаж.<br>
       <b>Телефон:</b> <a class="lnk" href="tel:{TELRAW}">{TEL}</a>.</p>
    <p><b>Главный врач:</b> Белоусова Александра Сергеевна. Сведения о лице, имеющем право действовать без доверенности, содержатся в ЕГРЮЛ: их можно получить бесплатно по ИНН или ОГРН в <a class="lnk" href="https://egrul.nalog.ru/" target="_blank" rel="noopener nofollow">сервисе ФНС России</a>.</p>
    <p><b>Режим работы:</b> приём по предварительной записи по телефону <a class="lnk" href="tel:{TELRAW}">{TEL}</a>.</p>

    <h2 id="licenziya">Лицензия</h2>
    <p>Лицензия на осуществление медицинской деятельности <b>№ Л041‑01126‑23/05841444 от 03.08.2026</b>, выдана Министерством здравоохранения Краснодарского края (приказ № 3046 от 03.08.2026). Срок действия — бессрочно.</p>
    <p><b>Работы и услуги по лицензии:</b> сестринское дело; организация здравоохранения и общественное здоровье, эпидемиология; ортодонтия; стоматология общей практики; стоматология ортопедическая; стоматология терапевтическая; стоматология хирургическая.</p>
    <p><b>Лицензирующий орган:</b> Министерство здравоохранения Краснодарского края.</p>

    <h2 id="vrach">Сведения о медицинском работнике</h2>
    <p><b>Белоусова Александра Сергеевна</b> — главный врач, врач-стоматолог‑терапевт, врач-стоматолог‑хирург, имплантолог.<br>
       <b>Образование:</b> Новосибирский государственный медицинский университет, специальность «Стоматология», 2015 год.<br>
       <b>Стаж по специальности:</b> с 2015 года.<br>
       <b>Специализации:</b> терапия, эндодонтия, пародонтология, хирургия, имплантация, ортопедия.<br>
       <b>Послевузовское образование:</b> интернатура по специальности «Стоматология», Новосибирский государственный медицинский университет Минздрава России, 2016 год.<br>
       <b>Дополнительное профессиональное образование:</b> профессиональная переподготовка по программе «Организация здравоохранения и общественное здоровье», 576 часов, 2019 год; повышение квалификации по той же программе, 144 часа, 2025 год.</p>
    <p>Сведения о медицинских работниках ведутся в Федеральном регистре медицинских работников: проверить квалификацию врача можно в <a class="lnk" href="https://nmfo-vo.edu.rosminzdrav.ru/" target="_blank" rel="noopener nofollow">системе непрерывного медицинского образования Минздрава России</a>.</p>

    <h2>Виды медицинской помощи и порядок оказания услуг</h2>
    <p>Клиника оказывает первичную специализированную медико-санитарную помощь в амбулаторных условиях по профилю «стоматология» — <b>на возмездной основе, по договору</b>. Перечень услуг и цены — на странице <a class="lnk" href="prices.html">«Цены»</a>. Договор заключается в письменной форме до начала лечения; до подписания вам предоставляется информация о состоянии здоровья, методах лечения, возможных рисках и альтернативах.</p>
    <p><b>Запись на первичный приём</b> — по телефону <a class="lnk" href="tel:{TELRAW}">{TEL}</a> или в WhatsApp. Возьмите с собой паспорт; если есть — свежие снимки, выписки, список принимаемых препаратов.</p>
    <p><b>Подготовка к приёму:</b> отдельная подготовка не требуется. Перед хирургическим вмешательством не приходите натощак и заранее сообщите врачу о принимаемых лекарствах и хронических заболеваниях.</p>
    <p><b>Результаты обследований</b> — фотопротокол, план лечения и смету вы получаете на руки в день приёма; снимки передаются в электронном виде.</p>

    <h2 id="besplatno">Право на бесплатную медицинскую помощь</h2>
    <p>Вы вправе получить медицинскую помощь <b>бесплатно</b> в рамках Программы государственных гарантий бесплатного оказания гражданам медицинской помощи и территориальной программы Краснодарского края — в медицинских организациях, участвующих в этих программах. ООО «Академия улыбки» оказывает услуги на платной основе; отказ от платных услуг не влечёт отказа в неотложной помощи.</p>

    <h2 id="prava">Права и обязанности пациента</h2>
    <p>Права граждан в сфере охраны здоровья установлены Федеральным законом № 323‑ФЗ от 21.11.2011. В частности, вы имеете право на выбор врача, на уважительное и гуманное отношение, на облегчение боли, на информацию о своих правах и о состоянии здоровья, на сохранение врачебной тайны, на информированное добровольное согласие и на отказ от медицинского вмешательства, на получение копий медицинских документов, на возмещение вреда, причинённого здоровью, и на допуск законного представителя.</p>
    <p>Пациент обязан сообщать врачу достоверные сведения о состоянии здоровья, соблюдать назначения и режим лечения, а также правила поведения в клинике.</p>

    <h2 id="obrashcheniya">Обращения, претензии и контроль</h2>
    <p>Отзыв, предложение или претензию можно передать лично в клинике, по телефону <a class="lnk" href="tel:{TELRAW}">{TEL}</a> или письмом на адрес клиники. Срок ответа на письменное обращение — 30 дней.</p>
    <p id="kontrol"><b>Органы, осуществляющие контроль:</b></p>
    <p><b>Министерство здравоохранения Краснодарского края</b> — лицензирующий орган и учредитель краевой системы здравоохранения. Приёмная и электронная форма обращения — на официальном сайте <a class="lnk" href="https://minzdrav.krasnodar.ru" target="_blank" rel="noopener nofollow">minzdrav.krasnodar.ru</a>.</p>
    <p><b>Территориальный орган Росздравнадзора по Краснодарскому краю</b> — 350015, г. Краснодар, ул. Северная, д. 315. Приёмная: <a class="lnk" href="tel:+78619910896">+7 (861) 991‑08‑96</a>, почта info@reg23.roszdravnadzor.gov.ru, сайт <a class="lnk" href="https://23reg.roszdravnadzor.gov.ru" target="_blank" rel="noopener nofollow">23reg.roszdravnadzor.gov.ru</a>.</p>
    <p><b>Управление Роспотребнадзора по Краснодарскому краю</b> — защита прав потребителей медицинских услуг. Контакты, приём обращений и территориальные отделы — на официальном сайте <a class="lnk" href="https://23.rospotrebnadzor.ru" target="_blank" rel="noopener nofollow">23.rospotrebnadzor.ru</a>.</p>

    <h2>Важное предупреждение</h2>
    <p class="ftr__warn"><b>Имеются противопоказания. Необходима консультация специалиста.</b> Информация на сайте носит справочный характер, не является публичной офертой и не заменяет очную консультацию врача. Часть изображений на сайте создана или обработана с помощью искусственного интеллекта.</p>

    <p class="crumb crumb--foot"><a href="docs.html">← Вернуться к документам</a><a class="crumb__up" href="#main">Наверх ↑</a></p>
  </div>
</section>
""" + FOOTER

ROBOTS = f"""User-agent: *
Allow: /
Disallow: /*?utm_
Disallow: /*?yclid
Disallow: /*?gclid
Sitemap: {SITE}/sitemap.xml
Host: {SITE.replace('https://','')}
"""
# Сплошного «Disallow: /*?» здесь быть не должно: к styles.css и main.js
# добавлен отпечаток вида ?v=1a2b3c4d, и такой запрет закрыл бы роботам
# доступ к стилям и скриптам — страница в их глазах развалилась бы.

MANIFEST = json.dumps({
  "name": "Академия улыбки — стоматология в Сочи",
  "short_name": "Академия улыбки",
  "description": "Стоматологическая клиника Александры Белоусовой. Сочи, ул. Виноградная, 55/1.",
  "lang": "ru-RU",
  "dir": "ltr",
  "start_url": "./index.html",
  "scope": "./",
  "display": "browser",
  "background_color": "#FFFFFF",
  "theme_color": "#FFFFFF",
  "icons": [
    {"src": "assets/logo.svg", "sizes": "any", "type": "image/svg+xml"},
    {"src": "assets/web/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "assets/web/icon-512.png", "sizes": "512x512", "type": "image/png"},
    {"src": "assets/web/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ]
}, ensure_ascii=False, indent=2) + "\n"

# Страница 404 намеренно самодостаточна: ни стилей, ни шрифтов, ни скриптов
# снаружи. Хостинг отдаёт её в ответ на любой неверный адрес, в том числе
# вложенный, и относительные ссылки на ассеты в такой ситуации ломаются.
NOTFOUND = f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="robots" content="noindex, follow">
<meta name="description" content="Такой страницы на сайте стоматологии «Академия улыбки» нет. Вернитесь на главную или позвоните в клинику.">
<title>Страница не найдена — стоматология «Академия улыбки», Сочи</title>
<link rel="icon" href="assets/logo.svg" type="image/svg+xml">
<style>
  :root{{color-scheme:light}}
  body{{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;
    background:#FFFFFF;color:#14161A;
    font:400 17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}}
  .b{{max-width:34rem;text-align:center}}
  .n{{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#5F646D;margin:0 0 18px}}
  h1{{font:600 clamp(26px,5vw,36px)/1.2 Georgia,"Times New Roman",serif;margin:0 0 14px;letter-spacing:-.01em}}
  p{{color:#4B5058;margin:0 0 14px}}
  .l{{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:26px}}
  .l a{{display:inline-block;padding:12px 20px;border:1px solid rgba(20,22,26,.18);
    border-radius:2px;color:#14161A;text-decoration:none;font-size:15px}}
  .l a:first-child{{background:#1B3D96;border-color:#1B3D96;color:#fff}}
  .l a:hover{{border-color:#1B3D96}}
  .t{{margin-top:30px;font-size:15px;color:#5F646D}}
  .t a{{color:#1B3D96}}
</style>
</head>
<body>
  <div class="b">
    <p class="n">Ошибка 404</p>
    <h1>Такой страницы нет</h1>
    <p>Возможно, адрес набран с опечаткой или страницу перенесли. Всё, что есть на сайте, собрано на главной.</p>
    <div class="l">
      <a href="index.html">На главную</a>
      <a href="prices.html">Цены</a>
      <a href="faq.html">Вопросы</a>
      <a href="info.html">Сведения о клинике</a>
    </div>
    <p class="t">Если вы искали запись на приём — позвоните: <a href="tel:{TELRAW}">{TEL}</a></p>
  </div>
</body>
</html>
"""

PAGES_MAP = [("/", "1.0", "weekly"), ("/prices.html", "0.9", "monthly"), ("/faq.html", "0.8", "monthly"), ("/privacy.html", "0.2", "yearly"), ("/info.html", "0.4", "yearly"), ("/docs.html", "0.5", "yearly")]
SITEMAP = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + \
  "".join(f'  <url><loc>{SITE}{p}</loc><lastmod>2026-09-06</lastmod><changefreq>{c}</changefreq><priority>{pr}</priority></url>\n' for p, pr, c in PAGES_MAP) + '</urlset>\n'

LLMS = f"""# Академия улыбки

> Стоматологическая клиника в Сочи, ул. Виноградная, 55/1, пом. 22, 2‑й этаж. Открыта в 2026 году. Приём ведёт Белоусова Александра Сергеевна — стоматолог-терапевт, хирург, имплантолог, в практике с 2015 года, основатель и главный врач клиники. Телефон {TEL}.

Один врач ведёт пациента на всех этапах: диагностика, терапия, эндодонтия, хирургия, имплантация, ортопедия, ортодонтия. Первый приём — 60 минут с письменным планом лечения и сметой. Работа в бинокулярной оптике, цифровые слепки внутриротовым сканером, стерилизация инструментов в автоклаве с индивидуальной упаковкой каждого набора.

Лицензия на медицинскую деятельность № Л041‑01126‑23/05841444 от 03.08.2026, выдана Министерством здравоохранения Краснодарского края. Рентгенологические исследования (в том числе КЛКТ) выполняются по направлению в диагностическом центре.

## Страницы
- [Главная]({SITE}/): направления, первый визит, врач, оборудование, отзывы, контакты
- [Цены]({SITE}/prices.html): полный прейскурант по направлениям
- [Вопросы и ответы]({SITE}/faq.html): ответы врача на частые вопросы пациентов
- [Сведения о клинике, лицензия и права пациента]({SITE}/info.html)
- [Документы: лицензия, договоры, права пациента]({SITE}/docs.html)
- [Политика обработки персональных данных]({SITE}/privacy.html)

## Пояснения
- Информация на сайте не является публичной офертой и не заменяет очную консультацию. Имеются противопоказания, необходима консультация специалиста.
- Часть изображений на сайте создана или обработана с помощью искусственного интеллекта.
- Точная стоимость лечения фиксируется в письменном плане после осмотра.
"""

def в_webp(html):
    """Подменяет ссылки на фотографии их webp-вариантами, если те собраны.

    Атрибуты width/height переписываем по настоящему размеру webp: браузер
    держит по ним пропорцию до загрузки картинки, и расхождение вернуло бы
    сдвиг вёрстки. JPEG с диска не убираем — на него ссылается og:image.
    """
    import re as _re

    def подмена(m):
        тег, путь = m.group(0), m.group(1)
        веб = os.path.splitext(путь)[0] + '.webp'
        файл = os.path.join(HERE, веб)
        if not os.path.isfile(файл):
            return тег
        тег = тег.replace(путь, веб)
        try:
            from PIL import Image
            w, h = Image.open(файл).size
            тег = _re.sub(r'width="\d+"', f'width="{w}"', тег)
            тег = _re.sub(r'height="\d+"', f'height="{h}"', тег)
        except Exception:
            pass
        return тег

    return _re.sub(r'<img [^>]*src="(assets/[^"]+\.jpg)"[^>]*>', подмена, html)


for name, html in [("index.html", INDEX), ("prices.html", PRICES), ("faq.html", faq_page()), ("privacy.html", PRIVACY), ("info.html", INFO), ("docs.html", DOCS)]:
    open(os.path.join(HERE, name), "w", encoding="utf-8").write(в_webp(html))
    print(name, len(html) // 1024, "KB")
for name, txt in [("robots.txt", ROBOTS), ("sitemap.xml", SITEMAP), ("llms.txt", LLMS),
                  ("404.html", NOTFOUND), ("site.webmanifest", MANIFEST)]:
    open(os.path.join(HERE, name), "w", encoding="utf-8").write(txt)
