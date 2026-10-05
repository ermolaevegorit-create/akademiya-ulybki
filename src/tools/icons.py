# -*- coding: utf-8 -*-
"""Иконки для вкладки, домашнего экрана и манифеста — из assets/logo.svg.

Логотип широкий (34×29), поэтому он не растягивается в квадрат, а вписывается
в белое поле с полями по краям: так иконка выглядит одинаково и в Safari на
айфоне, и в списке приложений Android. Запускать после правки логотипа:
    python3 tools/icons.py
"""
import os, cairosvg
from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, "assets/logo.svg")
OUT = os.path.join(HERE, "assets/web")
os.makedirs(OUT, exist_ok=True)

SIZES = [("apple-touch-icon.png", 180, 0.78),   # Safari, домашний экран
         ("icon-192.png", 192, 0.78),           # манифест
         ("icon-512.png", 512, 0.78)]           # манифест, сплеш

for name, side, fill in SIZES:
    inner = int(side * fill)
    png = cairosvg.svg2png(url=SRC, output_width=inner)
    from io import BytesIO
    logo = Image.open(BytesIO(png)).convert("RGBA")
    canvas = Image.new("RGB", (side, side), "#FFFFFF")
    x = (side - logo.width) // 2
    y = (side - logo.height) // 2
    canvas.paste(logo, (x, y), logo)
    path = os.path.join(OUT, name)
    canvas.save(path, "PNG", optimize=True)
    print(name, canvas.size, os.path.getsize(path) // 1024 or 1, "KB")
