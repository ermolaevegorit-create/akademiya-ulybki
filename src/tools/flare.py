# -*- coding: utf-8 -*-
"""Готовит блики для вступления из присланных заготовок.

Заготовки синие и рассчитаны на тёмный кадр. У нас кадр светлый, поэтому
цвет уводится к холодному белому: остаётся лёгкий голубой край, какой и
бывает у светодиодного света, но само пятно белое — иначе на светлом фоне
получается синяя клякса, а не свет.

Берём только круглый ореол с кольцами. Горизонтальная полоса читается как
наклейка поверх кадра — особенно к концу наезда, когда перестаёт двигаться.
Восьмилучевую звезду тоже не берём: для клиники она выглядит эффектом из
игры, а не светом.
"""
import numpy as np
from PIL import Image

U = '/root/.claude/uploads/efd7a963-3100-5b1e-b58c-c6d7c4e2a9e8/'
SRC_BLOOM  = U + '9de9c990-image.png'
OUT_BLOOM  = 'assets/cut/flare-bloom.webp'


def trim(im, thr=3):
    a = np.array(im.convert('RGBA'))
    ys, xs = np.where(a[:, :, 3] > thr)
    return im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def cool_white(im, keep=.22, gain=1.0):
    """Уводим цвет к белому, сохраняя долю исходного холодного оттенка."""
    a = np.array(im.convert('RGBA')).astype(np.float32)
    rgb, al = a[:, :, :3], a[:, :, 3]
    rgb = 255 - (255 - rgb) * keep                 # ближе к белому
    al = np.clip(al * gain, 0, 255)
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255), al]).astype(np.uint8), 'RGBA')


def feather(im, power=2.6, keep=.0):
    """Заготовка ореола рассчитана на тёмный кадр: у диска плотная середина и
    резкий край. На светлом поле такой край читается как обведённый круг.
    Гасим прозрачность к краю, чтобы остался ореол, а не диск."""
    a = np.array(im.convert('RGBA')).astype(np.float32)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    fall = np.clip(1 - r ** 2, 0, 1) ** power
    a[:, :, 3] *= fall * (1 - keep) + fall ** 3 * keep
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')


def build():
    bl = feather(cool_white(trim(Image.open(SRC_BLOOM)), keep=.20))
    if bl.width > 900:
        bl = bl.resize((900, round(bl.height * 900 / bl.width)), Image.LANCZOS)
    bl.save(OUT_BLOOM, 'WEBP', quality=95, method=6)
    print(f'ореол {bl.size}')


if __name__ == '__main__':
    build()
