# -*- coding: utf-8 -*-
"""Готовит три состояния лампы для вступления: погашенную, горящую и
раскалённую.

Погашенная и горящая — два снимка одного и того же прибора, поэтому их
приходится совмещать: снимки обрезаны по-разному, и если наложить их как
есть, при перетекании лампа дёрнется. Совмещаем по силуэту.

Раскалённое состояние собирается из горящего. Каждый светодиод получает
ореол и четырёхлучевую звезду — те самые блики, которых не хватало живому
свету; панель линз дополнительно тянется к белому, а вокруг неё добавляется
мягкое свечение. Всё это запекается в картинку: во время наезда браузеру
остаётся только перетечь от одного растра к другому, а это несравнимо
дешевле, чем считать градиенты на каждом кадре.
"""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC_OFF = '/root/.claude/uploads/efd7a963-3100-5b1e-b58c-c6d7c4e2a9e8/cc443f1a-image.png'
SRC_ON  = '/root/.claude/uploads/efd7a963-3100-5b1e-b58c-c6d7c4e2a9e8/fd6899de-image.png'
OUT_OFF = 'assets/cut/lamp-off.webp'
OUT_ON  = 'assets/cut/lamp-on.webp'
OUT_HOT = 'assets/cut/lamp-hot.webp'
MAXW = 1140                      # шире не нужно: в макете прибор не бывает крупнее


def trim(im):
    a = np.array(im.convert('RGBA'))
    ys, xs = np.where(a[:, :, 3] > 8)
    return im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def blob(mask, size):
    """мягкое пятно по маске: размываем и нормируем к единице"""
    b = np.array(Image.fromarray((mask * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(size))).astype(np.float32) / 255.0
    m = b.max()
    return b / m if m > 0 else b


def ellipse(w, h, cx, cy, rx, ry, feather=.22):
    yy, xx = np.mgrid[0:h, 0:w]
    d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    return np.clip((1.0 - d) / feather + .5, 0, 1)


def shift_to(src, ref):
    """Совмещаем силуэты: подбираем сдвиг, при котором маски совпадают лучше
    всего. Перебор мелкий — снимки уже приведены к одному размеру."""
    a = (np.array(src)[:, :, 3] > 128).astype(np.float32)
    b = (np.array(ref)[:, :, 3] > 128).astype(np.float32)
    best, bdx, bdy = -1, 0, 0
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            ov = float((np.roll(np.roll(a, dy, 0), dx, 1) * b).sum())
            if ov > best: best, bdx, bdy = ov, dx, dy
    if bdx or bdy:
        src = Image.fromarray(np.roll(np.roll(np.array(src), bdy, 0), bdx, 1), 'RGBA')
    return src, bdx, bdy, best / max(1.0, float(b.sum()))


def leds(rgb, alpha, panel):
    """Находим светодиоды: самые яркие пятна внутри панели линз."""
    lum = rgb.mean(2)
    hot = (lum > 236) & (panel > .35) & (alpha > 200)
    lab, n = ndimage.label(hot)
    out = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(xs) < 60: continue
        r = max(4.0, (len(xs) / np.pi) ** .5)
        out.append((xs.mean(), ys.mean(), r))
    out.sort(key=lambda t: -t[2])
    return out[:16]


def star(w, h, cx, cy, lh, lv, thick):
    """Блик-звезда: длинный горизонтальный штрих и короткий вертикальный —
    так блик ведёт себя в настоящей оптике и не превращается в крест."""
    yy, xx = np.mgrid[0:h, 0:w]
    dx, dy = xx - cx, yy - cy
    hor = np.exp(-(dy / thick) ** 2) * np.clip(1 - abs(dx) / lh, 0, 1) ** 2
    ver = np.exp(-(dx / (thick * .85)) ** 2) * np.clip(1 - abs(dy) / lv, 0, 1) ** 2
    return np.clip(hor + ver * .8, 0, 1)


def build():
    off = trim(Image.open(SRC_OFF)).convert('RGBA')
    on  = trim(Image.open(SRC_ON)).convert('RGBA')
    if off.width > MAXW:
        off = off.resize((MAXW, round(off.height * MAXW / off.width)), Image.LANCZOS)
    W, H = off.size
    on = on.resize((W, H), Image.LANCZOS)
    on, dx, dy, fit = shift_to(on, off)

    a_off = np.array(off).astype(np.float32)
    a_on  = np.array(on).astype(np.float32)
    rgb, alpha = a_on[:, :, :3].copy(), a_on[:, :, 3].copy()

    # --- где панель линз и где камера ---
    lum = a_off[:, :, :3].mean(2)
    solid = a_off[:, :, 3] > 200
    dark = (lum < 90) & solid
    lab, n = ndimage.label(dark)
    cam = None
    if n:
        sizes = ndimage.sum(dark, lab, range(1, n + 1))
        i = int(np.argmax(sizes)) + 1
        ys, xs = np.where(lab == i)
        cam = (xs.mean(), ys.mean(), max(xs.max() - xs.min(), ys.max() - ys.min()) / 2)
    cx, cy = (cam[0], cam[1]) if cam else (W * .5, H * .46)
    panel = ellipse(W, H, cx, cy - H * .012, W * .295, H * .215)
    if cam:
        panel = panel * (1 - ellipse(W, H, cam[0], cam[1], cam[2] * 1.18, cam[2] * 1.18, .35))
    panel *= (alpha / 255.0)

    # --- раскалённое состояние ---
    pts = leds(rgb, alpha, panel)
    hot = rgb.copy()
    halo = np.zeros((H, W), np.float32)
    rays = np.zeros((H, W), np.float32)
    for (x, y, r) in pts:
        m = np.zeros((H, W), np.float32)
        yy, xx = np.mgrid[0:H, 0:W]
        m[((xx - x) ** 2 + (yy - y) ** 2) < (r * 1.15) ** 2] = 1
        halo = np.maximum(halo, blob(m, r * 1.05) * .92)
        rays = np.maximum(rays, star(W, H, x, y, r * 10.0, r * 4.2, r * .26))
    # Лучи гасим к краю панели, иначе они обрубаются о край картинки и висят
    # под прибором отдельными полосами.
    rays *= ellipse(W, H, cx, cy - H * .012, W * .335, H * .30, .85)
    # свет расходится и за пределы линз
    spread = np.array(Image.fromarray((halo * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(W * .030))).astype(np.float32) / 255.0

    # Ореолы и лучи держим раздельно: если залить всю панель, вместо
    # раскалённых лампочек получается ровная белая плашка без бликов.
    k = np.clip(halo * .92 + rays * .95 + spread * .40 + panel * .10, 0, 1)[:, :, None]
    hot = 255 - (255 - hot) * (1 - k * .96)          # тянем к белому
    hot[:, :, 2] += k[:, :, 0] * 4                    # у сердцевины чуть холоднее
    hot[:, :, 0] += (spread - halo).clip(0) * 6       # ореол чуть теплее
    hot = np.clip(hot, 0, 255)

    # камера посреди залитой светом панели не должна остаться чёрной точкой
    if cam:
        cm = ellipse(W, H, cam[0], cam[1], cam[2] * 1.05, cam[2] * 1.05, .5)[:, :, None]
        hot = hot + (235 - hot) * cm * .55
        hot = np.clip(hot, 0, 255)

    # свет виден и за силуэтом прибора — поднимаем непрозрачность там, где он есть
    a_hot = np.clip(alpha + np.clip(spread * 1.25 + rays * 1.0 - .04, 0, 1) * 255, 0, 255)

    # Тени под прибором нет намеренно. Лампа висит в световом поле, а не
    # стоит на поверхности: тени не на что падать, и любая подложка под ней
    # читается не как объём, а как грязь на фоне.
    for path, arr in ((OUT_OFF, a_off.astype(np.uint8)),
                      (OUT_ON,  np.dstack([rgb, alpha]).astype(np.uint8)),
                      (OUT_HOT, np.dstack([hot, a_hot]).astype(np.uint8))):
        Image.fromarray(arr, 'RGBA').save(path, 'WEBP', quality=90, method=6)
    print(f'{W}×{H} · совмещение сдвигом ({dx},{dy}), силуэты совпали на {fit*100:.1f} % · '
          f'светодиодов найдено {len(pts)}')
    return W, H


if __name__ == '__main__':
    build()
