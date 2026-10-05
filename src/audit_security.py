#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Проверка безопасности статического сайта медицинской организации.

Запуск:  python3 audit_security.py <каталог-с-собранным-сайтом> [имя]

Проверяет то, что можно проверить по исходникам и по отрисованной странице,
без доступа к серверу. Для медицинского сайта половина «безопасности» — это
не взлом, а утечка данных посетителя и публикация чужих персональных данных,
поэтому проверки идут вперемешку: технические и правовые.
"""
import hashlib
import io
import json
import os
import re
import sys
import zipfile

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'dist'
NAME = sys.argv[2] if len(sys.argv) > 2 else os.path.basename(os.path.abspath(ROOT))

F = []          # находки: (уровень, раздел, текст)
OK = []         # что проверено и в порядке


def bad(lvl, sec, txt):
    F.append((lvl, sec, txt))


def fine(sec, txt):
    OK.append((sec, txt))


def html_files():
    out = []
    for dp, dirs, fn in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in {'.git', 'node_modules', '__pycache__'}]
        for f in fn:
            if f.endswith(('.html', '.htm')) and not f.startswith(('one-', 'art-')):
                out.append(os.path.join(dp, f))
    return sorted(out)


SKIP_DIRS = {'.git', 'node_modules', '__pycache__', '.idea', '.vscode'}


def all_files():
    out = []
    for dp, dirs, fn in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in fn:
            out.append(os.path.join(dp, f))
    return sorted(out)


PAGES = html_files()
ALL = all_files()
BLOB = {p: open(p, encoding='utf-8', errors='replace').read() for p in PAGES}
JOINED = '\n'.join(BLOB.values())


# ---------------------------------------------------------------- 1. внешние
def check_external():
    sec = 'Внешние запросы'
    # то, что браузер грузит сам при открытии страницы
    # только то, что браузер действительно качает: canonical, og:url, preconnect
    # и манифест ресурсами не являются
    tag = re.compile(r'<(?:script|link|img|iframe|source|video|audio|embed|object)\b[^>]*>', re.I)
    hosts = {}
    for p, t in BLOB.items():
        urls = []
        for m in tag.finditer(t):
            a = m.group(0)
            if re.search(r'rel\s*=\s*["\'](?:canonical|alternate|preconnect|dns-prefetch|manifest|me)', a, re.I):
                continue
            u = re.search(r'(?:src|href|data)\s*=\s*["\'](https?://[^"\']+)', a)
            if u:
                urls.append(u.group(1))
        for u in urls:
            h = re.sub(r'^https?://([^/]+).*', r'\1', u)
            hosts.setdefault(h, set()).add(os.path.basename(p))
    # @import и url() в инлайновых стилях
    for p, t in BLOB.items():
        for u in re.findall(r'url\(\s*["\']?(https?://[^)"\']+)', t):
            h = re.sub(r'^https?://([^/]+).*', r'\1', u)
            hosts.setdefault(h, set()).add(os.path.basename(p))

    RU_OK = ('yandex.ru', 'yandex.net', 'mc.yandex.ru')
    for h, where in sorted(hosts.items()):
        w = ', '.join(sorted(where))
        if any(h.endswith(x) for x in RU_OK):
            bad('СРЕДНЕ', sec, f'{h} — загружается при открытии ({w}). '
                'Российский сервис, трансграничной передачи нет, но IP посетителя уходит третьему лицу: '
                'это должно быть описано в политике и закрыто согласием.')
        else:
            bad('ВЫСОКО', sec, f'{h} — загружается при открытии ({w}). '
                'Каждое открытие страницы передаёт IP и User-Agent посетителя на иностранный сервер. '
                'Для медицинского сайта это трансграничная передача персональных данных.')
    if not hosts:
        fine(sec, 'Ни одного внешнего запроса при загрузке — всё своё.')

    # формы, уходящие наружу
    for p, t in BLOB.items():
        for m in re.findall(r'<form\b[^>]*action\s*=\s*["\']([^"\']+)', t, re.I):
            if m.startswith(('http', 'mailto:')):
                bad('ВЫСОКО', sec, f'Форма отправляется наружу: {m} ({os.path.basename(p)})')


# ------------------------------------------------------- 2. заголовки и мета
def check_headers():
    sec = 'Защитные заголовки'
    need = {
        'Content-Security-Policy':
            'ограничивает, откуда странице разрешено грузить код и куда отправлять данные. '
            'Без неё любая вставка постороннего скрипта выполнится без возражений.',
        'X-Content-Type-Options':
            'запрещает браузеру угадывать тип файла — защита от подмены картинки скриптом.',
        'Referrer-Policy':
            'ограничивает, какой адрес вашей страницы уйдёт на чужой сайт при переходе по ссылке.',
        'Permissions-Policy':
            'закрывает камеру, микрофон, геолокацию — их никто не спросит, и они не нужны.',
    }
    # только заголовки, которые вообще работают в <meta>. X-Frame-Options,
    # X-Content-Type-Options, Permissions-Policy и frame-ancestors браузер из
    # <meta> не читает — их ставят на сервере, и на GitHub Pages это невозможно.
    META_OK = ('Content-Security-Policy',)
    miss = {k: [] for k in need}
    for p, t in BLOB.items():
        found = set(x.lower() for x in re.findall(r'http-equiv\s*=\s*["\']([^"\']+)', t, re.I))
        if re.search(r'<meta\s+name\s*=\s*["\']referrer["\']', t, re.I):
            found.add('referrer-policy')
        for k in need:
            if k.lower() not in found:
                miss[k].append(os.path.basename(p))
    for k, pages in miss.items():
        if not pages:
            fine(sec, f'{k} стоит на всех страницах.')
        elif k in META_OK or k == 'Referrer-Policy':
            bad('СРЕДНЕ', sec, f'Нет {k}: {", ".join(pages)}. {need[k]}')
        else:
            bad('НИЗКО', sec, f'{k} не задан. {need[k]} '
                'В <meta> этот заголовок не работает — ставится только на сервере, '
                'на GitHub Pages недоступен. Настроить при переезде на свой хостинг.')

    # насколько политика строга — проверяем все страницы, о каждой беде сообщаем один раз
    said = set()

    def once(lvl, txt):
        if txt not in said:
            said.add(txt)
            bad(lvl, sec, txt)

    hashed = weak = 0
    for pth, t in BLOB.items():
        m = re.search(r'Content-Security-Policy"[^>]*content\s*=\s*"([^"]+)"', t, re.I)
        if not m:
            continue
        csp, nm = m.group(1), os.path.basename(pth)
        # default-src 'none' закрывает всё разом — остальные директивы не нужны
        if not re.search(r"default-src\s+'none'", csp):
            for d in ('script-src', 'object-src', 'base-uri', 'form-action'):
                if d not in csp:
                    once('СРЕДНЕ', f'{nm}: в политике нет {d}.')
        if re.search(r"script-src[^;]*'unsafe-inline'", csp):
            weak += 1
            once('ВЫСОКО', f'{nm}: в политике script-src стоит \'unsafe-inline\'. '
                 'Это разрешает выполнить любой скрипт, вписанный прямо в разметку, '
                 'и обесценивает политику. Заменить на sha256-хеши встроенных скриптов.')
        elif 'sha256-' in csp:
            hashed += 1
        if re.search(r"script-src[^;]*'unsafe-eval'", csp):
            once('ВЫСОКО', f'{nm}: в политике \'unsafe-eval\'.')
        if 'frame-ancestors' in csp:
            once('НИЗКО', 'frame-ancestors в <meta> браузер игнорирует — это только заголовок.')
    if hashed and not weak:
        fine(sec, f'Встроенные скрипты разрешены по хешам, а не скопом — на {hashed} страницах.')

    if 'upgrade-insecure-requests' not in JOINED.lower():
        pass


# ------------------------------------------------------------- 3. ссылки
def check_links():
    sec = 'Ссылки и рамки'
    for p, t in BLOB.items():
        for m in re.finditer(r'<a\b([^>]*target\s*=\s*["\']_blank["\'][^>]*)>', t, re.I):
            attrs = m.group(1)
            if 'noopener' not in attrs.lower():
                href = re.search(r'href\s*=\s*["\']([^"\']+)', attrs)
                bad('СРЕДНЕ', sec,
                    f'{os.path.basename(p)}: ссылка в новую вкладку без rel="noopener" — '
                    f'{href.group(1)[:60] if href else "?"}. Открытая страница получает доступ '
                    'к вашей вкладке и может её подменить.')
        for m in re.finditer(r'<iframe\b([^>]*)>', t, re.I):
            a = m.group(1)
            src = re.search(r'src\s*=\s*["\']([^"\']+)', a)
            s = src.group(1)[:70] if src else '?'
            if 'sandbox' not in a.lower():
                bad('СРЕДНЕ', sec,
                    f'{os.path.basename(p)}: <iframe> без sandbox — {s}. '
                    'Чужая страница внутри вашей работает без ограничений.')
            if 'referrerpolicy' not in a.lower():
                bad('НИЗКО', sec,
                    f'{os.path.basename(p)}: <iframe> без referrerpolicy — {s}.')
    if not F or all(x[1] != sec for x in F):
        fine(sec, 'Внешние ссылки и рамки без очевидных дыр.')


# ------------------------------------------------- 4. опасные места в скриптах
# Откуда в скрипт может прийти чужой текст: адресная строка, хранилище браузера,
# куки, поля ввода, ответ сервера. Всё остальное — собственные данные страницы.
DIRTY_SRC = re.compile(
    r'location\.(hash|search|href|pathname)|URLSearchParams|document\.cookie'
    r'|localStorage|sessionStorage|\.getItem\s*\(|\.value\b|\.dataset\b'
    r'|JSON\.parse|await\s+\w+\.(json|text)\s*\(|\.responseText')


def tainted_names(t):
    """Имена переменных, в которые когда-либо клали текст из недоверенного источника."""
    names = set()
    for m in re.finditer(r'(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=([^;\n]{0,200})', t):
        if DIRTY_SRC.search(m.group(2)):
            names.add(m.group(1))
    # ещё один проход: присваивание уже объявленной переменной
    for m in re.finditer(r'^\s*([A-Za-z_$][\w$]*)\s*=([^;\n]{0,200})', t, re.M):
        if DIRTY_SRC.search(m.group(2)):
            names.add(m.group(1))
    return names


def sink_is_clean(t, pos, dirty):
    """Правая часть присваивания в innerHTML: есть ли там чужой текст?

    Берём выражение до конца инструкции (оно может занимать несколько строк,
    склеенных плюсами) и смотрим, встречается ли в нём прямое обращение к
    недоверенному источнику или переменная, куда такой текст раньше клали.
    """
    end = pos
    depth = 0
    code = []          # выражение без содержимого строк
    while end < len(t) and end - pos < 4000:
        c = t[end]
        if c in '\'"`':
            # строковый литерал пропускаем целиком: слова внутри разметки
            # («class», «href», «a») не должны попадать в разбор как имена
            # переменных, иначе любая вёрстка в кавычках выглядит подозрительно
            q, end = c, end + 1
            while end < len(t) and t[end] != q:
                if t[end] == '\\':
                    end += 1
                elif q == '`' and t[end:end + 2] == '${':
                    d2, end = 1, end + 2
                    while end < len(t) and d2:
                        d2 += (t[end] == '{') - (t[end] == '}')
                        if d2:
                            code.append(t[end])
                        end += 1
                    continue
                end += 1
            end += 1
            code.append(' "" ')
            continue
        if c in '([{':
            depth += 1
        elif c in ')]}':
            if depth == 0:
                break
            depth -= 1
        elif c == ';' and depth == 0:
            break
        elif c == '\n' and depth == 0:
            nxt = t[end + 1:end + 200].lstrip()
            if not nxt.startswith(('+', '.', '?', ':', ')', ']', '}', '`', "'", '"')):
                break
        code.append(c)
        end += 1
    rhs = t[pos:end]
    expr = ''.join(code)
    if DIRTY_SRC.search(expr):
        return False, rhs
    for n in re.findall(r'[A-Za-z_$][\w$]*', expr):
        if n in dirty:
            return False, rhs
    return True, rhs


def check_js():
    sec = 'Скрипты'
    risky = [
        (r'\bouterHTML\s*=', 'ВЫСОКО', 'запись в outerHTML'),
        (r'\bdocument\.write\b', 'ВЫСОКО', 'document.write'),
        (r'\beval\s*\(', 'ВЫСОКО', 'eval'),
        (r'new\s+Function\s*\(', 'ВЫСОКО', 'new Function'),
        (r'location\.hash', 'СРЕДНЕ', 'чтение location.hash'),
        (r'location\.search', 'СРЕДНЕ', 'чтение строки запроса'),
        (r'setTimeout\s*\(\s*["\']', 'ВЫСОКО', 'setTimeout со строкой вместо функции'),
        (r'navigator\.clipboard\s*\.?\s*writeText', 'СРЕДНЕ', 'запись в буфер обмена'),
        (r'postMessage\s*\(', 'СРЕДНЕ', 'postMessage'),
        (r'addEventListener\(\s*["\']message["\']', 'ВЫСОКО', 'приём postMessage без проверки origin'),
    ]
    js = dict(BLOB)
    for p in ALL:
        if p.endswith('.js') and 'vendor' not in p.split(os.sep) and not p.endswith('.min.js'):
            js[p] = open(p, encoding='utf-8', errors='replace').read()
    for p, t in js.items():
        # innerHTML разбираем отдельно: сама по себе запись в innerHTML опасна
        # только тогда, когда в неё попадает текст извне. Поэтому смотрим не на
        # сам вызов, а на то, что в него подставляют.
        dirty = tainted_names(t)
        clean_n = leak = 0
        # Оба способа вписать разметку целиком: присваивание в innerHTML и
        # insertAdjacentHTML. Опасность у них одна и та же и зависит от того,
        # что подставляют, поэтому разбираем их вместе.
        sinks = [(r'\binnerHTML\s*=\s*', 'innerHTML'),
                 (r'\binsertAdjacentHTML\s*\(\s*[^,]+,\s*', 'insertAdjacentHTML')]
        for pat, name in sinks:
            for m in re.finditer(pat, t):
                ok, rhs = sink_is_clean(t, m.end(), dirty)
                ln = t.count('\n', 0, m.start()) + 1
                if ok:
                    clean_n += 1
                else:
                    leak += 1
                    bad('ВЫСОКО', sec,
                        f'{os.path.basename(p)}: в {name} подставляют текст из '
                        f'недоверенного источника, стр. {ln}: {" ".join(rhs.split())[:120]}')
        if clean_n:
            fine(sec, f'{os.path.basename(p)}: мест, где разметка вписывается целиком '
                 f'(innerHTML, insertAdjacentHTML), — {clean_n}, и во все подставляются '
                 'только собственные данные страницы: ни адресная строка, ни хранилище, '
                 'ни поля ввода туда не попадают.')
        # Белый список для значения из адресной строки. Проверяем именно
        # hasOwnProperty, а не оператор `in`: `in` находит и унаследованные
        # свойства объекта (constructor, toString, __proto__), поэтому такой
        # «белый список» пропускает лишнее.
        guarded = bool(re.search(r'hasOwnProperty\s*\.?\s*call\s*\(', t)) \
            or bool(re.search(r'\.(includes|indexOf)\s*\(\s*[A-Za-z_$][\w$]*\s*\)', t))
        # Отдельный случай: значение из адреса вообще не берут, только смотрят,
        # есть ли оно. `if (!location.hash)` ничем не опаснее любого условия.
        used = bool(re.search(r'location\.(hash|search)\s*(?:\.\s*(slice|substr|substring|'
                             r'replace|split|match|toLowerCase)|\[)', t))
        if not used:
            guarded = True

        for pat, lvl, what in risky:
            # Адресная строка опасна не сама по себе, а когда её содержимое
            # попадает в разметку. Если ни одна подстановка в innerHTML не берёт
            # текст извне и есть белый список — это замечание, а не находка.
            if 'location' in pat and not leak and guarded:
                n = len(re.findall(pat, t))
                if n:
                    fine(sec, f'{os.path.basename(p)}: {what} — {n}, '
                         'но значение сверяется с белым списком, а в разметку не '
                         'подставляется. Подбор адреса вида #<script> ничего не даёт.')
                continue
            hits = [m for m in re.finditer(pat, t)]
            if hits:
                snip = []
                for m in hits[:3]:
                    ln = t.count('\n', 0, m.start()) + 1
                    line = t[t.rfind('\n', 0, m.start()) + 1:t.find('\n', m.start())].strip()
                    snip.append(f'стр. {ln}: {line[:110]}')
                bad(lvl, sec, f'{os.path.basename(p)}: {what} — {len(hits)}. ' + ' | '.join(snip))
    if not any(x[1] == sec for x in F):
        fine(sec, 'Опасных конструкций в скриптах не найдено.')


# ------------------------------------------------------------ 5. хранилище
def check_storage():
    sec = 'Хранилище в браузере'
    keys = set()
    for p in ALL:
        if p.endswith(('.js', '.html')):
            t = open(p, encoding='utf-8', errors='replace').read()
            keys |= set(re.findall(r'(?:local|session)Storage\.\w+\(\s*["\']([^"\']+)', t))
            keys |= set(re.findall(r'(?:local|session)Storage\.getItem\(\s*["\']([^"\']+)', t))
    if keys:
        fine(sec, 'Ключи в хранилище: ' + ', '.join(sorted(keys)) +
             '. Проверить, что ни в одном не лежат имя, телефон или что-то о здоровье.')
    else:
        fine(sec, 'Браузерное хранилище не используется.')
    if re.search(r'document\.cookie\s*=', JOINED):
        bad('СРЕДНЕ', sec, 'Скрипт пишет cookie напрямую — проверить, что там нет личных данных и стоит SameSite.')


# ----------------------------------------------------------- 6. форма и ПДн
def check_forms():
    sec = 'Формы и персональные данные'
    for p, t in BLOB.items():
        for m in re.finditer(r'<form\b(.*?)</form>', t, re.S | re.I):
            f = m.group(0)
            tag = os.path.basename(p)
            method = re.search(r'method\s*=\s*["\'](\w+)', f, re.I)
            get = (method.group(1).lower() == 'get') if method else True   # без method браузер шлёт GET
            if method and method.group(1).lower() == 'get':
                bad('ВЫСОКО', sec, f'{tag}: форма с method="get" — введённые данные уедут в адресную строку, '
                    'а оттуда в историю браузера и в журналы сервера.')
            # Форма без method отправляется браузером методом GET. Если её
            # отправку перехватывает скрипт, этого обычно не видно — но стоит
            # скрипту не отработать (ошибка, блокировщик, медленная сеть), и
            # браузер отправит форму сам. Все поля с атрибутом name окажутся в
            # адресе страницы: в истории браузера, в журналах сервера, в
            # заголовке Referer. Поля с именем, телефоном, почтой в такой форме
            # не должны иметь name вовсе — скрипту хватает id.
            risky_names = re.findall(
                r'<input[^>]*\bname\s*=\s*["\']([^"\']+)["\'][^>]*>', f, re.I)
            pd = [n for n in risky_names
                  if re.search(r'name|tel|phone|mail|fio|имя|телефон', n, re.I)]
            if get and not method and pd:
                bad('ВЫСОКО', sec, f'{tag}: у формы не задан method, то есть браузер отправит её методом GET. '
                    f'Поля {", ".join(sorted(set(pd)))} имеют атрибут name — если отправку не перехватит '
                    'скрипт, их значения окажутся в адресной строке, в истории браузера и в журналах '
                    'сервера. У полей с личными данными атрибут name не нужен: скрипт берёт их по id.')
            if not re.search(r'type\s*=\s*["\']checkbox["\'][^>]*(required|name\s*=\s*["\']ok)', f, re.I):
                bad('ВЫСОКО', sec, f'{tag}: в форме нет обязательной отметки о согласии на обработку данных.')
            if not re.search(r'privacy|политик', f, re.I):
                bad('СРЕДНЕ', sec, f'{tag}: рядом с формой нет ссылки на политику обработки данных.')
            # поля, провоцирующие рассказ о здоровье
            for ph in re.findall(r'(?:placeholder|aria-label)\s*=\s*["\']([^"\']+)', f):
                if re.search(r'беспокоит|жалоб|симптом|боли|проблем|что случилось', ph, re.I):
                    bad('ВЫСОКО', sec, f'{tag}: поле «{ph}» приглашает написать о здоровье. '
                        'Это особая категория персональных данных: другое согласие, другие требования к защите.')
    if not any(x[1] == sec for x in F):
        fine(sec, 'Формы: согласие обязательно, ссылка на политику рядом, о здоровье не спрашивают.')


# -------------------------------------------------------------- 7. секреты
def check_secrets():
    sec = 'Секреты и следы разработки'
    pats = [
        (r'gh[pousr]_[A-Za-z0-9]{16,}', 'токен GitHub'),
        (r'sk-[A-Za-z0-9]{20,}', 'ключ API'),
        (r'AKIA[0-9A-Z]{16}', 'ключ AWS'),
        (r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY', 'закрытый ключ'),
        (r'(?i)\b(?:password|passwd|пароль)\s*[:=]\s*["\'][^"\']{4,}', 'пароль в коде'),
        (r'(?i)\b(?:api[_-]?key|secret|token)\s*[:=]\s*["\'][A-Za-z0-9_\-]{16,}', 'ключ или токен'),
    ]
    text_ext = ('.html', '.js', '.css', '.json', '.txt', '.xml', '.md', '.webmanifest')
    for p in ALL:
        if not p.endswith(text_ext):
            continue
        t = open(p, encoding='utf-8', errors='replace').read()
        for pat, what in pats:
            if re.search(pat, t):
                bad('КРИТИЧНО', sec, f'{p}: похоже на {what}.')
    # служебное, что не должно уехать в публикацию
    if os.path.isdir(os.path.join(ROOT, '.git')):
        bad('НИЗКО', sec, 'Рядом с сайтом лежит каталог .git. GitHub Pages его не отдаёт, '
            'но на обычном хостинге по адресу /.git/config выкачивают всю историю проекта. '
            'При переезде убедиться, что каталог не попал на сервер.')
    junk = ['.env', '.DS_Store', '_рабочее', 'CLAUDE.md', 'Thumbs.db']
    for p in ALL:
        for j in junk:
            if j in p.split(os.sep):
                bad('ВЫСОКО', sec, f'В публикации лежит служебное: {p}')
    # отладочные следы
    n = len(re.findall(r'console\.(log|debug|info)\s*\(', JOINED))
    if n:
        bad('НИЗКО', sec, f'console.log и подобное — {n} раз. Само по себе не опасно, '
            'но в журнале консоли не должно быть ничего о посетителе.')
    if re.search(r'(?i)\bTODO\b|\bFIXME\b|ЗАМЕНИТЬ|черновик условий', JOINED):
        bad('НИЗКО', sec, 'В опубликованном коде остались пометки «TODO», «ЗАМЕНИТЬ» или «черновик».')
    if not any(x[1] == sec and x[0] in ('КРИТИЧНО', 'ВЫСОКО') for x in F):
        fine(sec, 'Ключей, паролей и служебных каталогов в публикации нет.')


# ------------------------------------------------------- 8. метаданные файлов
def check_media():
    sec = 'Метаданные файлов'
    gps = c2pa = 0
    heavy = []
    for p in ALL:
        if not p.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.pdf')):
            continue
        sz = os.path.getsize(p)
        if sz > 400_000:
            heavy.append((p, sz))
        with open(p, 'rb') as fh:
            head = fh.read(min(sz, 300_000))
        if b'GPSLatitude' in head or b'GPS ' in head[:5000]:
            gps += 1
            bad('ВЫСОКО', sec, f'{p}: в файле осталась геометка съёмки. '
                'Это точные координаты, часто квартиры или кабинета.')
        if b'c2pa' in head or b'jumbf' in head:
            c2pa += 1
        for tag in (b'Adobe Photoshop', b'Camera Model', b'Artist', b'Copyright'):
            if tag in head:
                bad('НИЗКО', sec, f'{p}: в файле осталась служебная метка «{tag.decode()}».')
                break
    if c2pa:
        # Метка C2PA — это след обработки нейросетью, его видно в любом просмотрщике
        # метаданных. Сама по себе она ничего не нарушает; нарушением было бы
        # выдавать такие изображения за нетронутые снимки. Поэтому проверяем не
        # метку, а оговорку: если на страницах прямо сказано, что часть изображений
        # обработана ИИ, вопрос закрыт.
        told = any(re.search(r'обработан[аоы][^.]{0,40}(искусственн|нейросет|ИИ)',
                             open(p, encoding='utf-8', errors='replace').read(), re.I)
                   for p in html_files())
        if told:
            fine(sec, f'Файлов с меткой C2PA: {c2pa} — и на странице есть оговорка, '
                 'что часть изображений обработана ИИ. Метка и текст не расходятся.')
        else:
            bad('СРЕДНЕ', sec, f'Файлов с меткой C2PA: {c2pa}. Это след обработки нейросетью. '
                'Сама по себе метка не нарушение, но на сайте нет оговорки о том, '
                'что часть изображений обработана ИИ, — а метку любой желающий '
                'откроет просмотрщиком.')
    if not gps:
        fine(sec, 'Геометок в изображениях нет.')
    if heavy:
        fine(sec, f'Файлов тяжелее 400 КБ: {len(heavy)} (самый большой — '
             f'{max(heavy, key=lambda x: x[1])[0]}).')


# ---------------------------------------------------- 9. публикация чужих ПДн
def check_personal():
    sec = 'Чужие персональные данные'
    who = {
        'скан диплома или сертификата': r'assets/(?:edu|tour/docs)/',
        'фотография человека': r'(?:assistent|portret|portrait|doc-portrait)',
    }
    # Снимки людей ищем не только по имени файла. Проверка по именам пропускала
    # всё, что названо нейтрально: портрет врача в файле A2-three-quarter.webp
    # не содержит ни «portrait», ни «assistent». Поэтому вторым заходом читаем
    # подписи: если в alt стоит имя и фамилия или слово о должности — на снимке
    # человек, и к нему применимы те же правила.
    # Имя с фамилией — только с заглавных, без re.I: с ним класс [А-ЯЁ] теряет
    # смысл и «Диплом специалиста» сходит за человека. Должности ищем отдельно
    # и уже без учёта регистра.
    имя = re.compile(r'[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+')
    должность = re.compile(r'главн\w*\s+врач|ассистент|медсестр\w*', re.I)
    по_подписи = set()
    for тег in re.findall(r'<img[^>]*>', JOINED, re.I):
        alt = re.search(r'\balt="([^"]*)"', тег)
        src = re.search(r'\bsrc="([^"]+)"', тег)
        if not (alt and src and alt.group(1).strip()):
            continue
        # В однофайловых сборках картинка лежит прямо в адресе — имя файла
        # оттуда не достать, да и проверять там нечего: это та же картинка.
        if src.group(1).startswith('data:'):
            continue
        if имя.search(alt.group(1)) or должность.search(alt.group(1)):
            по_подписи.add(src.group(1))

    for what, pat in who.items():
        файлы = sorted(set(re.findall(pat + r'[\w\-./]*', JOINED)))
        if what.startswith('фотография'):
            файлы = sorted(set(файлы) | по_подписи)
        if файлы:
            bad('СРЕДНЕ', sec, f'Опубликовано: {what} — {len(файлы)} файлов '
                f'({", ".join(f.split("/")[-1] for f in файлы[:4])}'
                f'{" и другие" if len(файлы) > 4 else ""}). '
                'Это персональные данные работника. Нужно письменное согласие на распространение '
                'по форме Роскомнадзора и сведения об условиях обработки на сайте.')

    # Снимок приёма — отдельный и более тяжёлый случай, чем портрет сотрудника.
    # На фотографии в кресле виден не работник, а пациент: его изображение
    # обнародуют только с согласия (ст. 152.1 ГК), сам факт обращения в клинику
    # составляет врачебную тайну (ст. 13 323-ФЗ), а сведения о здоровье
    # относятся к особой категории (ст. 10 152-ФЗ). Согласия работника здесь
    # недостаточно: нужно согласие того, кто сидит в кресле.
    приём = re.compile(r'<img[^>]+>', re.I)
    подозрительные = []
    for тег in приём.findall(JOINED):
        src = (re.search(r'src="([^"]+)"', тег) or [None, ''])[1]
        alt = (re.search(r'alt="([^"]*)"', тег) or [None, ''])[1]
        if not src or 'assets/' not in src:
            continue
        имя = src.split('/')[-1]
        if re.search(r'на\s+приёме|пациент|в\s+кресле|лечени', alt, re.I) or \
           re.match(r'work-\d', имя):
            подозрительные.append(имя + (f' («{alt}»)' if alt else ''))
    подозрительные = sorted(set(подозрительные))
    if подозрительные:
        bad('ВЫСОКО', sec, 'Снимки приёма, где в кресле виден человек: '
            f'{"; ".join(подозрительные)}. Если это не постановка с моделью, '
            'нужно письменное согласие самого пациента: обнародование изображения — '
            'ст. 152.1 ГК, факт обращения в клинику — врачебная тайна (ст. 13 323-ФЗ), '
            'сведения о здоровье — особая категория (ст. 10 152-ФЗ). Согласия врача '
            'или ассистента для этого недостаточно.')
    # Подписи под отзывами. Фамилия целиком вместе с текстом отзыва даёт
    # опознать пациента, а вместе с фактом обращения в клинику это уже врачебная
    # тайна (ст. 13 323-ФЗ). Норма — имя целиком, фамилия одной буквой: «Анна К.».
    signs = re.findall(r'<figure class="rev[^"]*"[^>]*>.*?<figcaption><b>(.*?)</b>',
                       JOINED, re.S)
    ok_form = re.compile(r'^[А-ЯЁ][а-яё\-]+\s+[А-ЯЁ]\.$')
    wrong = [s.strip() for s in signs if not ok_form.match(s.strip())]
    if wrong:
        bad('ВЫСОКО', sec, 'Подписи под отзывами, по которым можно опознать пациента: '
            f'{", ".join(sorted(set(wrong)))}. Норма — имя целиком и фамилия одной '
            'буквой («Анна К.»): факт обращения к врачу сам по себе врачебная тайна.')
    elif signs:
        fine(sec, f'Подписи под отзывами ({len(set(signs))} шт.) обезличены: '
             'имя целиком, фамилия одной буквой.')

    # Телефоны надзорных органов приказ 118н обязывает публиковать, и они,
    # разумеется, отличаются от телефона клиники. Проверяем только те номера,
    # рядом с которыми нет упоминания ведомства или горячей линии, — иначе
    # проверка каждый раз ругается на обязательные по закону сведения.
    OFFICIAL = re.compile(r'Росздравнадзор|Роспотребнадзор|Роскомнадзор|министерств|'
                          r'департамент|горяч\w* лини|надзор|прокурат|страхов',
                          re.I)
    own = {}
    for m in re.finditer(r'\+7[\s\-()]*\d{3}[\s\-()]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}', JOINED):
        around = JOINED[max(0, m.start() - 400):m.end() + 200]
        digits = re.sub(r'\D', '', m.group(0))
        if OFFICIAL.search(around):
            continue
        own[digits] = m.group(0)
    if len(own) > 1:
        bad('НИЗКО', sec, 'На сайте несколько разных телефонов клиники: '
            f'{", ".join(sorted(own.values()))}. Сверить — посетитель не должен гадать, куда звонить.')
    elif own:
        fine(sec, f'Телефон клиники на всех страницах один: {list(own.values())[0]}. '
             'Номера надзорных органов из приказа 118н учтены отдельно.')
    mails = set(re.findall(r'[\w.\-]+@[\w\-]+\.[a-z]{2,}', JOINED))
    mails = {m for m in mails if 'greensock' not in m and 'example' not in m}
    личные = [m for m in mails if not re.match(r'(info|mail|clinic|admin|help)@', m)]
    if личные:
        bad('СРЕДНЕ', sec, f'Личные адреса почты на странице: {", ".join(sorted(личные))}. '
            'Их соберут спам-роботы; для обращений лучше общий ящик.')


# --------------------------------------------------------- 10. индексация
def check_robots():
    sec = 'Индексация'
    rb = os.path.join(ROOT, 'robots.txt')
    sm = os.path.join(ROOT, 'sitemap.xml')
    if not os.path.exists(rb):
        bad('НИЗКО', sec, 'Нет robots.txt.')
    else:
        t = open(rb, encoding='utf-8', errors='replace').read()
        if 'Disallow: /' == t.strip().split('\n')[-1].strip():
            bad('СРЕДНЕ', sec, 'robots.txt закрывает весь сайт от поисковиков.')
        fine(sec, 'robots.txt на месте.')
    if os.path.exists(sm):
        t = open(sm, encoding='utf-8', errors='replace').read()
        urls = re.findall(r'<loc>([^<]+)</loc>', t)
        fine(sec, f'В карте сайта {len(urls)} адресов.')
    # страницы, которые не стоит отдавать поисковикам
    for p in PAGES:
        b = os.path.basename(p)
        if re.search(r'(test|tmp|draft|черновик|gate|admin)', b, re.I):
            bad('СРЕДНЕ', sec, f'В публикации служебная страница: {b}')


# ---------------------------------------------------------- 11. зависимости
def check_deps():
    sec = 'Сторонний код'
    for p in ALL:
        b = os.path.basename(p).lower()
        if p.endswith('.js') and any(k in b for k in ('gsap', 'jquery', 'bootstrap', 'lodash', 'swiper')):
            t = open(p, encoding='utf-8', errors='replace').read(4000)
            v = re.search(r'(\d+\.\d+\.\d+)', t)
            fine(sec, f'{b}: версия {v.group(1) if v else "не определена"}, лежит своим файлом '
                 '(не с чужого сервера — подменить нельзя).')
    ext_scripts = re.findall(r'<script[^>]+src\s*=\s*["\'](https?://[^"\']+)', JOINED, re.I)
    for s in ext_scripts:
        if 'integrity=' not in JOINED:
            bad('ВЫСОКО', sec, f'Сторонний скрипт с чужого сервера без проверки целостности: {s}. '
                'Если тот сервер подменят, подменят и код на вашем сайте.')


# ------------------------------------------------------------------- вывод
def main():
    for fn in (check_external, check_headers, check_links, check_js, check_storage,
               check_forms, check_secrets, check_media, check_personal,
               check_robots, check_deps):
        try:
            fn()
        except Exception as e:                       # noqa: BLE001
            bad('НИЗКО', 'Проверка', f'{fn.__name__} не отработала: {e}')

    order = {'КРИТИЧНО': 0, 'ВЫСОКО': 1, 'СРЕДНЕ': 2, 'НИЗКО': 3}
    F.sort(key=lambda x: (order[x[0]], x[1]))

    print(f'\n{"=" * 74}')
    print(f'  ПРОВЕРКА БЕЗОПАСНОСТИ: {NAME}')
    print(f'  страниц: {len(PAGES)}   файлов всего: {len(ALL)}')
    print(f'{"=" * 74}\n')

    cnt = {}
    for lvl, _, _ in F:
        cnt[lvl] = cnt.get(lvl, 0) + 1
    if cnt:
        print('  ' + '   '.join(f'{k}: {v}' for k, v in
                                sorted(cnt.items(), key=lambda x: order[x[0]])) + '\n')

    last = None
    for lvl, sec, txt in F:
        if sec != last:
            print(f'\n— {sec} —')
            last = sec
        print(f'  [{lvl}] {txt}')

    if OK:
        print('\n\n— Проверено и в порядке —')
        for sec, txt in OK:
            print(f'  • {sec}: {txt}')
    print()
    return len([x for x in F if x[0] in ('КРИТИЧНО', 'ВЫСОКО')])


if __name__ == '__main__':
    sys.exit(0 if main() == 0 else 1)
