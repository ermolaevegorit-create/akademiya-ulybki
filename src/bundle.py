# -*- coding: utf-8 -*-
"""dist/: страницы с ассетами; single-file версии; версии для артефактов с подменой ссылок."""
import os, re, base64, mimetypes, shutil, sys, json

ROOT = os.path.dirname(os.path.abspath(__file__)); os.chdir(ROOT)
PAGES = ['index.html', 'prices.html', 'faq.html', 'privacy.html', 'info.html', 'docs.html']
LINKS = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}   # {'index.html': url, ...}
css = open('styles.css', encoding='utf-8').read()
js = open('main.js', encoding='utf-8').read()

# --- какие ассеты реально используются ---
used = set()
for p in PAGES:
    used |= set(re.findall(r'["\'(](assets/[^"\')\s]+)', open(p, encoding='utf-8').read()))
used |= set(re.findall(r'(assets/[^"\')\s]+)', css))
used |= set(re.findall(r'assets/[^\'"\s)]+', js))
EXTRA = {'assets/cut/tooth-mask.webp', 'assets/cut/tooth-edge.webp', 'assets/cut/tooth-ok.webp', 'assets/cut/tooth-bad.webp', 'assets/photo/facade.webp'}
# Иконки для домашнего экрана упомянуты только в site.webmanifest — разметку
# он не сканирует. В dist они нужны, внутрь однофайловых версий — нет.
# og:image указан полным адресом, а не относительным путём, поэтому в разметке
# его никто не находит. Без этой строки картинка для мессенджеров и соцсетей
# выдавала бы 404: проверено — ссылка на сайт приходила без превью.
DIST_ONLY = {'assets/web/icon-192.png', 'assets/web/icon-512.png',
             'assets/photo/work-2.jpg'}
# Кадры помощника скрипт запрашивает по имени: в разметке лежит только покой.
# Без этой строки однофайловая версия показывала бы неподвижного персонажа.
import glob as _glob
JS_NEED = set(EXTRA) | {f.replace('\\', '/') for f in _glob.glob('assets/mascot/*.webp')}
used |= EXTRA
used = {a for a in used if os.path.isfile(a)}

# --- обычная сборка для хостинга ---
shutil.rmtree('dist', ignore_errors=True); os.makedirs('dist', exist_ok=True)
for a in sorted(used | {d for d in DIST_ONLY if os.path.isfile(d)}):
    os.makedirs(os.path.dirname(f'dist/{a}'), exist_ok=True); shutil.copy(a, f'dist/{a}')
for p in PAGES: shutil.copy(p, f'dist/{p}')
shutil.copy('styles.css', 'dist/styles.css'); shutil.copy('main.js', 'dist/main.js')

# GSAP лежит у нас в vendor/ — внешних CDN на сайте нет
VENDOR = ['gsap.min.js', 'ScrollTrigger.min.js', 'Draggable.min.js']
os.makedirs('dist/vendor', exist_ok=True)
for v in VENDOR: shutil.copy(f'vendor/{v}', f'dist/vendor/{v}')

# служебные файлы: без них хостинг не отдаст 404, иконку на домашний экран
# и не покажет роботам карту сайта
for extra in ['robots.txt', 'sitemap.xml', 'llms.txt', '404.html', 'site.webmanifest']:
    if os.path.isfile(extra): shutil.copy(extra, f'dist/{extra}')

print('dist assets', sum(os.path.getsize(f'dist/{a}') for a in sorted(used)) // 1024, 'KB',
      '· vendor', sum(os.path.getsize(f'dist/vendor/{v}') for v in VENDOR) // 1024, 'KB')

# --- single-file: всё внутрь ---
def inline(path):
    mt = mimetypes.guess_type(path)[0] or 'application/octet-stream'
    if path.endswith('.svg'): mt = 'image/svg+xml'
    return f'data:{mt};base64,' + base64.b64encode(open(path, 'rb').read()).decode()

CACHE = {}
def data(a): 
    if a not in CACHE: CACHE[a] = inline(a)
    return CACHE[a]

for p in PAGES:
    h = open(p, encoding='utf-8').read()
    need = set(re.findall(r'["\'(](assets/[^"\')\s]+)', h))   # только относительные пути, не абсолютные og:image
    if 'id="tooth-box"' in h: need |= set(re.findall(r'assets/[^\'"\s)]+', js)) | EXTRA
    need = {a for a in need if os.path.isfile(a)}
    MAP = {a: data(a) for a in sorted(need)}
    css_one = re.sub(r'url\((assets/[^)\'"]+)\)', lambda m: 'url(' + MAP.get(m.group(1), m.group(1)) + ')', css)
    # в шим кладём только то, что запрашивает скрипт по имени: остальное уже вшито в разметку
    shim_map = {a: MAP[a] for a in sorted(need & JS_NEED) if a in MAP}
    shim = '<script>window.__ASSETS=' + json.dumps(shim_map, ensure_ascii=False) + ';</script>'
    one = re.sub(r'"(assets/[^"]+)"', lambda m: '"' + MAP.get(m.group(1), m.group(1)) + '"', h)
    # шрифты уже вшиты в css как data:, предзагружать нечего
    one = re.sub(r'<link rel="preload"[^>]*>', '', one)
    one = re.sub(r'<link rel="manifest"[^>]*>', '', one)
    one = re.sub(r'<link rel="stylesheet" href="styles\.css[^"]*">', lambda _: f'<style>\n{css_one}\n</style>', one)
    # GSAP внутрь файла одним блоком вместо трёх ссылок на vendor/
    gsap_src = '\n;\n'.join(open(f'vendor/{v}', encoding='utf-8').read() for v in VENDOR)
    one = re.sub(r'<script src="vendor/[^"]*"></script>\s*', '', one)
    one = re.sub(r'<script src="main\.js[^"]*"></script>',
                 lambda _: f'<script>\n{gsap_src}\n</script>' + shim + f'<script>\n{js}\n</script>', one)
    open(f'dist/one-{p}', 'w', encoding='utf-8').write(one)

    art = one
    # В рамке артефакта карту не открыть: сторонние кадры туда не пускают.
    # Вместо площадки с кнопкой показываем фотографию входа и адрес словами.
    art = re.sub(r'<div class="map__ask">.*?</div>',
                 '<img class="map__ph" src="' + MAP.get('assets/photo/facade.webp', '') + '" alt="Вход в клинику">'
                 '<p class="map__note">Здесь будет карта Яндекса. Сочи, ул. Виноградная, 55/1 — вход с улицы, второй этаж.</p>',
                 art, flags=re.S)
    for page, url in LINKS.items():
        if page == p: art = art.replace(f'href="{page}#', 'href="#').replace(f'href="{page}"', 'href="#main"')
        else: art = art.replace(f'href="{page}', f'href="{url}')
    art = re.sub(r'^\s*<!DOCTYPE[^>]*>\s*', '', art, flags=re.I)
    art = re.sub(r'<html[^>]*>|</html>|<head>|</head>|<body[^>]*>|</body>', '', art, flags=re.I)
    art = re.sub(r'<meta charset[^>]*>|<meta name="viewport"[^>]*>', '', art, flags=re.I)
    # в рамке артефакта политика безопасности и манифест только мешают:
    # head там свой, а файлы по относительным путям недоступны
    art = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', '', art, flags=re.I)
    art = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', art, flags=re.I)
    open(f'dist/art-{p}', 'w', encoding='utf-8').write(art.strip() + '\n')
    print(p, 'single', len(one.encode()) // 1024, 'KB')


# ---------------------------------------------------------------------------
# Хеши встроенных скриптов для политики безопасности.
# Считаем в самом конце: к этому моменту bundle.py уже мог вложить в страницу
# и стили, и GSAP, и main.js — от этого содержимое скриптов меняется, а значит
# меняются и хеши. Плейсхолдер __HASHES__ приходит из build.py.
# ---------------------------------------------------------------------------
import base64
import hashlib


def put_hashes(path):
    t = open(path, encoding='utf-8').read()
    if '__HASHES__' not in t:
        return
    inline = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', t, re.S)
    hs = []
    for src in inline:
        d = hashlib.sha256(src.encode('utf-8')).digest()
        h = "'sha256-" + base64.b64encode(d).decode() + "'"
        if h not in hs:
            hs.append(h)
    t = t.replace('__HASHES__', ' '.join(hs))
    open(path, 'w', encoding='utf-8').write(t)
    return len(hs)


for _f in sorted(os.listdir('dist')):
    if _f.endswith('.html'):
        put_hashes(os.path.join('dist', _f))
print('политика безопасности: хеши встроенных скриптов подставлены')
