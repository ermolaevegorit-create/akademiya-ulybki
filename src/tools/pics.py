# -*- coding: utf-8 -*-
"""Пережимает фотографии в WebP под тот размер, в котором их реально видно.

Замерено на живой странице (монитор 1920 при двойной плотности и телефон 390):
исходники приходили в 2–3 раза крупнее, чем показываются. Дипломы отдавались
по 308–380 КБ ради картинки шириной 291 px. Здесь ширины взяты как удвоенный
замеренный показ — запас на плотные экраны есть, лишнего нет.

Сами JPEG остаются на диске: на них ссылается og:image (соцсети и мессенджеры
webp в превью понимают хуже) и они же — запасной вариант, если webp
понадобится пересобрать.
"""
import os, sys
from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# файл -> ширина, до которой ужимаем (0 — оставить как есть, только сменить формат)
# assistent.jpg сюда намеренно не попал. В нём лежит метка C2PA — след
# обработки нейросетью. Метка подписывает конкретные байты, поэтому любое
# пережатие её ломает: переносить её в webp нечестно, а выбрасывать — значит
# убирать проверяемое свидетельство. Файл остаётся JPEG.
ЦЕЛИ = {
    'assets/editorial/chair.jpg':      640,
    'assets/editorial/scanner.jpg':    640,
    'assets/editorial/diploma.jpg':    640,
    'assets/photo/facade.jpg':         640,
    'assets/photo/work-1.jpg':        1000,
    'assets/photo/work-2.jpg':        1200,   # он же в hero, он же og:image
    'assets/photo/tour-reception.jpg':1400,
}
# свидетельства открывают в лупе и разглядывают. В лупе картинка занимает
# не больше 90% высоты окна: на экране 1080 это около 1340 px по ширине.
# Поэтому 1400 — предел, за которым пиксели уже никто не увидит.
for г in ('diplom-2015', 'internatura-2016', 'sertifikat-2016',
          'perepodgotovka-2019', 'sertifikat-2019', 'pk-2025'):
    ЦЕЛИ[f'assets/edu/{г}.jpg'] = 1400
    ЦЕЛИ[f'assets/edu/{г}-th.jpg'] = 220

КАЧЕСТВО = 82
# сканы документов: мелкий текст держится и на более сильном сжатии
КАЧЕСТВО_СКАНА = 78


def пережать(отн, ширина):
    ист = os.path.join(HERE, отн)
    если_нет = not os.path.isfile(ист)
    if если_нет:
        return None
    цель = os.path.join(HERE, os.path.splitext(отн)[0] + '.webp')
    im = Image.open(ист).convert('RGB')
    if ширина and im.width > ширина:
        im = im.resize((ширина, round(im.height * ширина / im.width)), Image.LANCZOS)
    к = КАЧЕСТВО_СКАНА if '/edu/' in отн and not отн.endswith('-th.jpg') else КАЧЕСТВО
    im.save(цель, 'WEBP', quality=к, method=6)
    return (отн, os.path.getsize(ист), os.path.getsize(цель), im.width, im.height)


if __name__ == '__main__':
    было = стало = 0
    for отн, ш in sorted(ЦЕЛИ.items()):
        r = пережать(отн, ш)
        if not r:
            print('нет файла:', отн); continue
        _, a, b, w, h = r
        было += a; стало += b
        print(f'{отн:42} {a//1024:4} КБ → {b//1024:4} КБ   {w}×{h}')
    print(f'\nвсего {было//1024} КБ → {стало//1024} КБ '
          f'(экономия {(было-стало)//1024} КБ, {100-стало*100//было}%)')
