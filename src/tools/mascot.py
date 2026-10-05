# -*- coding: utf-8 -*-
"""Готовит кадры маскота для сайта.

Из пака приходят PNG 512×512 по 140–165 КБ каждый — это 4 МБ на весь набор.
Показываем маскота в 96–116 px, значит на плотном экране хватает 256 px.
Единый холст у всех кадров трогать нельзя: на нём держится совмещение,
поэтому уменьшаем весь квадрат целиком, а не видимую часть.
"""
import os, shutil
from PIL import Image

ПАК = '/home/claude/mascot-pack/outputs/academy-smile-mascot-png-pack'
ЦЕЛЬ = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets/mascot')

# что берём. Повороты, лупу, планшет, зуб и часть эффектов не берём: на сайте
# им нечего делать, а каждый кадр — это вес.
КАДРЫ = ['mascot/idle.png', 'mascot/drag.png']
КАДРЫ += [f'mascot/blink/blink_0{i}.png' for i in range(1, 5)]
КАДРЫ += [f'mascot/hover/hover_0{i}.png' for i in range(1, 5)]
КАДРЫ += [f'mascot/click/click_0{i}.png' for i in range(1, 6)]
КАДРЫ += [f'mascot/jump/jump_0{i}.png' for i in range(1, 6)]
КАДРЫ += [f'mascot/landing/landing_0{i}.png' for i in range(1, 4)]
# повороты: из них собирается «огляделся» — единственное занятие, где персонаж
# действительно куда-то смотрит, а не машет руками на месте
КАДРЫ += ['mascot/turn/front.png', 'mascot/turn/three-quarter-left.png',
          'mascot/turn/left.png', 'mascot/turn/three-quarter-right.png',
          'mascot/turn/right.png', 'mascot/turn/back.png']

ШИРИНА = 256          # кадры персонажа
ШИРИНА_МЕЛОЧЬ = 128   # искры и сердце — украшение, показываются ещё мельче
МЕЛОЧЬ = ['effects/sparkle.png', 'effects/heart.png', 'effects/motion-lines.png',
          'effects/question.png']


def перегнать(отн, ширина):
    ист = os.path.join(ПАК, отн)
    if not os.path.isfile(ист):
        return None
    im = Image.open(ист).convert('RGBA')
    if im.width > ширина:
        im = im.resize((ширина, round(im.height * ширина / im.width)), Image.LANCZOS)
    имя = отн.split('/')[-1].replace('.png', '.webp')
    цель = os.path.join(ЦЕЛЬ, имя)
    im.save(цель, 'WEBP', quality=88, method=6)
    return os.path.getsize(ист), os.path.getsize(цель), имя


if __name__ == '__main__':
    os.makedirs(ЦЕЛЬ, exist_ok=True)
    было = стало = 0
    for отн in КАДРЫ + МЕЛОЧЬ:
        ш = ШИРИНА_МЕЛОЧЬ if отн in МЕЛОЧЬ else ШИРИНА
        r = перегнать(отн, ш)
        if not r:
            print('нет файла:', отн); continue
        a, b, имя = r
        было += a; стало += b
        print(f'{имя:20} {a//1024:4} КБ → {b//1024:3} КБ')
    print(f'\nкадров: {len(КАДРЫ) + len(МЕЛОЧЬ)}   {было//1024} КБ → {стало//1024} КБ')
