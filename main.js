/* Академия улыбки · v8 */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [].slice.call((r || document).querySelectorAll(s));
  const html = document.documentElement;
  html.classList.add('js');                       // класс ставим скриптом: разметка может прийти без него
  /* Страница открывается сверху. Браузер по умолчанию возвращает человека
     туда, где он был в прошлый раз на этом адресе, и длинный документ
     открывался с середины — как будто его уже листали. Якорь в ссылке
     по-прежнему работает: его обрабатывает сам браузер. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) addEventListener('pageshow', () => scrollTo(0, 0));
  addEventListener('DOMContentLoaded', () => {  // браузер сбрасывает настройку на разборе разметки
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  });
  // Версия для слабовидящих подразумевает покой: без вступления, без параллакса,
  // игры сразу в конечном состоянии — ровно то же, что и при системной просьбе
  // убрать анимацию.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || html.classList.contains('vi');
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const track = (ev, data) => { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: ev }, data || {})); };
  const hasGsap = !!(window.gsap && window.ScrollTrigger && window.Draggable);
  const dpr = Math.min(2, devicePixelRatio || 1);
  const ASSETS = window.__ASSETS || {};           // подстановка путей для single-file сборки
  const asset = p => ASSETS[p] || p;

  /* ---------------------------------------------------------------------
     ЗВУК

     Звуки синтезируются прямо в браузере. Готовых файлов нет намеренно: это
     лишние запросы, лишний вес, лицензии на семплы — и разрешение media-src в
     политике безопасности, которого сейчас нет и не нужно. Несколько
     осцилляторов и короткая огибающая дают ровно то, что требуется.

     Где звук есть и где его нет. Звук — это отклик на игру: подхватить
     инструмент, положить его в лоток, стереть камень, зажечь лампу. По
     ссылкам меню и по кнопке «позвонить» не звучит ничего: человек, который
     ищет телефон клиники, не должен получать в ответ щелчок.

     Громкость намеренно низкая, каждый звук короче трети секунды и ни один не
     повторяется чаще, чем успевает затихнуть предыдущий. Выключатель — в
     шапке, выбор запоминается. В версии для слабовидящих и в режиме покоя
     звука нет вовсе: там задача противоположная.

     Контекст создаётся только после первого действия человека — до него
     браузер всё равно запретит воспроизведение, и это правильно.
  --------------------------------------------------------------------- */
  const sfx = (function () {
    const KEY = 'au-sfx';
    let ctx = null, master = null, on = true, last = 0;
    try { on = localStorage.getItem(KEY) !== '0'; } catch (e) {}

    const quiet = () => html.classList.contains('vi') || html.classList.contains('still');

    function ready() {
      if (quiet() || !on) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (e) { return null; }
        master = ctx.createGain();
        master.gain.value = .11;               // тихо: звук сопровождает, а не объявляет
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }

    /* Одна нота: частота, длительность, форма волны и как громко.
       Огибающая с мягкой атакой — резкий старт слышен как щелчок динамика. */
    function note(f0, f1, dur, type, vol, delay) {
      const c = ctx, t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + Math.min(.012, dur * .25));
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + .02);
    }

    /* Шум через полосовой фильтр — из него получается всё «неметаллическое»:
       скрип по камню, шорох, выдох лампы. */
    function noise(dur, freq, q, vol, delay) {
      const c = ctx, t = c.currentTime + (delay || 0);
      const n = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = freq; bp.Q.value = q || 1;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      src.connect(bp); bp.connect(g); g.connect(master);
      src.start(t); src.stop(t + dur + .02);
    }

    /* Характер звука повторяет характер действия: взять — короткий светлый
       щелчок, положить — тише и ниже, с металлическим призвуком, готово —
       три ноты вверх. */
    const VOICES = {
      pick:   () => { note(1460, 1180, .05, 'triangle', .5); },
      place:  () => { note(680, 520, .11, 'triangle', .45); note(1020, 940, .16, 'sine', .22, .01); },
      scrape: () => { noise(.045, 1900, 1.2, .30); },
      tap:    () => { note(900, 820, .045, 'sine', .40); },
      reveal: () => { note(523, 523, .16, 'sine', .40); note(784, 784, .30, 'sine', .34, .1); },
      done:   () => { note(659, 659, .12, 'sine', .38); note(880, 880, .12, 'sine', .34, .09);
                      note(1319, 1319, .30, 'sine', .28, .18); },
      uv:     () => { noise(.55, 520, .8, .18); note(180, 300, .55, 'sine', .20); },
      lamp:   () => { note(220, 180, .10, 'sine', .45); noise(.30, 900, .7, .14, .03); },
      sent:   () => { note(587, 587, .12, 'sine', .40); note(880, 880, .28, 'sine', .34, .1); },
      nope:   () => { note(300, 260, .09, 'triangle', .34); note(240, 210, .12, 'triangle', .30, .11); },
    };

    /* Скрип по камню приходит десятками событий в секунду. Без ограничителя
       это сплошное жужжание, а не отклик, поэтому одинаковые звуки чаще
       определённого шага не повторяем. */
    const GAP = { scrape: 70, pick: 40, tap: 60 };

    function play(name) {
      if (!VOICES[name] || !ready()) return;
      const now = performance.now(), gap = GAP[name] || 0;
      if (gap && now - last < gap) return;
      last = now;
      try { VOICES[name](); } catch (e) {}
    }

    function set(v) {
      on = !!v;
      try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
      const b = $('#sfx-toggle');
      if (b) { b.setAttribute('aria-pressed', String(on));
               b.title = on ? 'Выключить звук' : 'Включить звук'; }
      if (on) play('tap');
    }

    addEventListener('DOMContentLoaded', () => {
      const b = $('#sfx-toggle'); if (!b) return;
      if (quiet()) { b.hidden = true; return; }
      set(on);
      b.addEventListener('click', () => set(!on));
    });

    return { play, set, get on() { return on; } };
  })();

  /* Настоящее изменение размера окна, а не спрятавшаяся адресная строка.

     На телефоне браузер убирает и возвращает адресную строку прямо во время
     прокрутки: ширина та же, высота скачет на 60–120 px, и событие resize
     прилетает десятки раз за одну прокрутку. Всё, что на него навешано —
     пересчёты, перевыделение полотен canvas, замеры дорожек, — выполняется в
     тот самый момент, когда человек ведёт страницу пальцем. Отсюда и рывки.

     Настоящим считаем только то, где изменилась ширина или высота скакнула
     больше чем на четверть экрана: поворот, разделённый экран, окно на
     рабочем столе. Всё прочее пропускаем, а оставшееся ещё и придерживаем,
     чтобы за серию событий пересчитать один раз. */
  function onRealResize(fn, delay) {
    let w = innerWidth, h = innerHeight, t = 0;
    addEventListener('resize', () => {
      if (innerWidth === w && Math.abs(innerHeight - h) <= innerHeight * .25) return;
      w = innerWidth; h = innerHeight;
      clearTimeout(t); t = setTimeout(fn, delay || 150);
    }, { passive: true });
  }

  /* ---------- шапка, меню, активный раздел ---------- */
  const hdr = $('#hdr');
  addEventListener('scroll', () => hdr.classList.toggle('stuck', scrollY > 8), { passive: true });
  const burger = $('.burger');
  burger.addEventListener('click', () => burger.setAttribute('aria-expanded', document.body.classList.toggle('nav-open')));
  /* Меню закрывается и с клавиатуры: открытое меню без выхода по Escape —
     ловушка для того, кто не пользуется мышью. */
  addEventListener('keydown', e => { if (e.key !== 'Escape' || !document.body.classList.contains('nav-open')) return;
    document.body.classList.remove('nav-open'); burger.setAttribute('aria-expanded', 'false'); burger.focus(); });
  $$('.nav a').forEach(a => a.addEventListener('click', () => { document.body.classList.remove('nav-open'); burger.setAttribute('aria-expanded', 'false'); }));
  (function activeNav() {
    const links = $$('.nav a, .pnav a').filter(a => a.hash && $(a.hash));
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map(links.map(a => [a.hash.slice(1), a]));
    /* Раньше побеждал тот раздел, о котором наблюдатель отчитался последним.
       При загрузке он отчитывается обо всех сразу, последними в разметке идут
       контакты — и на самом верху страницы, пока человек смотрит вступление,
       в меню горели «Контакты». Теперь держим список тех, кто действительно в
       кадре, и выбираем из них тот, что пересекает линию чтения. Никого в
       кадре нет — не подсвечиваем ничего. */
    const видны = new Set();
    function обновить() {
      const линия = innerHeight * 0.3;
      let лучший = null, ближе = Infinity;
      видны.forEach(id => {
        const el = document.getElementById(id); if (!el) return;
        const r = el.getBoundingClientRect();
        const d = (r.top <= линия && r.bottom >= линия) ? 0
                : Math.min(Math.abs(r.top - линия), Math.abs(r.bottom - линия));
        if (d < ближе) { ближе = d; лучший = id; }
      });
      links.forEach(a => a.classList.remove('is-active'));
      const a = лучший && map.get(лучший);
      if (a) a.classList.add('is-active');
    }
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) видны.add(e.target.id); else видны.delete(e.target.id); });
      обновить();
    }, { rootMargin: '-30% 0px -60% 0px' });
    map.forEach((a, id) => io.observe($('#' + id)));
  })();

  /* появление блоков */
  const io = 'IntersectionObserver' in window && new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  $$('.rv').forEach(el => io ? io.observe(el) : el.classList.add('in'));
  /* страховка: если наблюдатель почему-то не сработал, показываем всё через 2,5 с */
  setTimeout(() => $$('.rv').forEach(el => el.classList.add('in')), 2500);
  $$('[data-track]').forEach(a => a.addEventListener('click', () => track(a.dataset.track)));

  /* аккордеоны: в группе открыт только один */
  $$('details[name]').forEach(d => d.addEventListener('toggle', () => {
    if (!d.open) return;
    $$(`details[name="${d.getAttribute('name')}"]`).forEach(o => { if (o !== d && o.open) o.open = false; });
  }));

  /* Карта по нажатию.

     Раньше рамка Яндекса грузилась при открытии страницы: каждый посетитель,
     даже не дойдя до контактов, отдавал свой IP третьему лицу. Для сайта
     медицинской организации это передача персональных данных, о которой
     человека никто не спросил. Плюс рамку режут блокировщики, и на её месте
     оставался пустой серый прямоугольник.

     Теперь на месте карты сразу стоит фотография входа с адресом, а карта
     подключается только если человек её попросил. */
  (function mapOnDemand() {
    const map = $('#map'); if (!map) return;
    const btn = $('#map-go', map); if (!btn) return;
    btn.addEventListener('click', () => {
      const src = btn.getAttribute('data-map-src'); if (!src) return;
      const fr = document.createElement('iframe');
      fr.className = 'map__frame';
      fr.src = src;
      fr.title = 'Карта: Виноградная, 55/1';
      fr.loading = 'lazy';
      fr.allowFullscreen = true;
      fr.referrerPolicy = 'no-referrer';
      fr.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
      map.appendChild(fr);
      map.classList.add('is-live');
      sfx.play('tap');
      track('map_open');
    });
  })();


  /* ---------- согласие на cookie и статистика ----------
     Технические cookie работают всегда; счётчик подключается только после «Принять всё».
     Выбор хранится год, отозвать можно кнопкой «Настройки cookie» в подвале. */
  (function consent() {
    const bar = $('#cookie'); if (!bar) return;
    const KEY = 'au-consent';
    const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
    const write = v => { try { localStorage.setItem(KEY, v + '|' + Date.now()); } catch (e) {} };
    const METRIKA = window.__METRIKA || '';        // номер счётчика подставляется при выкладке

    function startMetrika() {
      if (!METRIKA || window.ym) return;
      window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
      window.ym.l = +new Date();
      const s = document.createElement('script');
      s.async = true; s.src = 'https://mc.yandex.ru/metrika/tag.js';
      document.head.appendChild(s);
      ym(METRIKA, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false, defer: true });
    }
    function decide(v, remember) {
      if (remember) write(v);
      bar.hidden = true; document.body.classList.remove('has-cookie');
      html.style.setProperty('--cookie-h', '0px');
      if (v === 'all') startMetrika();
    }
    /* Высота полосы нужна в двух местах, поэтому считаем её всегда.
       В режиме для слабовидящих баннер растянут во всю ширину внизу экрана —
       страница получает отступ в его высоту, иначе полоса закрывает последние
       строки. На узком экране на ту же высоту поднимается кнопка вызова:
       раньше она пряталась и не возвращалась. */
    const pad = () => html.style.setProperty(
      '--cookie-h', (bar.hidden ? 0 : bar.offsetHeight + 8) + 'px');
    function show() { bar.hidden = false; document.body.classList.add('has-cookie'); pad();
      /* Полоса переносится по-разному при повороте телефона — высота меняется. */
      addEventListener('resize', pad, { passive: true }); }

    const saved = (read() || '').split('|')[0];
    /* поверх вступления окно не показываем — ждём, пока откроется содержимое */
    const ready = cb => document.querySelector('#intro') && !html.classList.contains('ready')
      ? setTimeout(() => ready(cb), 400) : setTimeout(cb, 900);
    if (saved === 'all') startMetrika();
    else if (saved !== 'need') ready(show);

    $('#cookie-yes').addEventListener('click', () => { decide('all', true); track('consent_all'); });
    $('#cookie-no').addEventListener('click', () => { decide('need', true); track('consent_min'); });
    const st = $('#cookie-settings'); if (st) st.addEventListener('click', e => { e.preventDefault(); show(); });
    addEventListener('resize', pad, { passive: true });

    /* события отправляем и в Метрику, когда она разрешена */
    const push = window.dataLayer = window.dataLayer || [];
    const orig = push.push.bind(push);
    push.push = a => { if (window.ym && METRIKA && a && a.event) try { ym(METRIKA, 'reachGoal', a.event); } catch (e) {} return orig(a); };
  })();


  /* ---------- версия для слабовидящих ----------
     Выбор хранится в браузере и применяется скриптом в <head> до отрисовки,
     чтобы страница не показалась сначала в обычном виде. Здесь — управление. */
  (function vision() {
    const KEY = 'au-vi';
    const btn = $('#vi-toggle'), panel = $('#vi-panel');
    if (!btn || !panel) return;
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
    let st = read();

    function paint(s) {
      const c = html.classList;
      c.toggle('vi', !!s.on);
      ['vi-2', 'vi-3'].forEach(k => c.remove(k));
      if (s.on && s.size > 1) c.add('vi-' + s.size);
      ['vi-dark', 'vi-sepia'].forEach(k => c.remove(k));
      if (s.on && s.scheme && s.scheme !== 'light') c.add('vi-' + s.scheme);
      c.toggle('vi-noimg', !!(s.on && s.noimg));
      panel.hidden = !s.on;
      btn.setAttribute('aria-pressed', s.on ? 'true' : 'false');
      $$('[data-vi]', panel).forEach(b => {
        const p = b.dataset.vi.split(':'), k = p[0], v = p[1];
        const cur = k === 'size' ? String(s.size || 1)
                  : k === 'scheme' ? (s.scheme || 'light')
                  : k === 'noimg' ? (s.noimg ? '1' : '0') : null;
        if (cur !== null) b.setAttribute('aria-pressed', cur === v ? 'true' : 'false');
      });
    }

    // включение и выключение перезагружают страницу: вступление и игры
    // настраиваются один раз при загрузке и на лету не переключаются
    btn.addEventListener('click', () => {
      st = read(); st.on = !st.on;
      if (st.on && !st.size) st.size = 2;
      save(st); location.reload();
    });

    panel.addEventListener('click', e => {
      const b = e.target.closest ? e.target.closest('[data-vi]') : null;
      if (!b) return;
      const p = b.dataset.vi.split(':'), k = p[0], v = p[1];
      st = read();
      if (k === 'off') { st.on = false; save(st); location.reload(); return; }
      if (k === 'size') st.size = +v;
      if (k === 'scheme') st.scheme = v;
      if (k === 'noimg') st.noimg = v === '1';
      save(st); paint(st);
    });

    paint(st);
  })();

  /* ---------- ЗАЯВКА ----------
     Пока сайт лежит на GitHub Pages, отправлять заявку некуда: он умеет
     только отдавать готовые файлы. Поэтому форма собирает сообщение и
     открывает WhatsApp клиники с готовым текстом — человек сам нажимает
     «отправить». Так на сайте не появляется ни одного места, где чужие
     имя и телефон хотя бы на секунду где-то лежат.
     Как появится обработчик на сервере, впишите его адрес в FORM_ENDPOINT —
     форма начнёт отправлять заявку напрямую, разметка не изменится. */
  const FORM_ENDPOINT = '';

  (function leadForms() {
    const forms = $$('.lf'); if (!forms.length) return;

    /* Перехват отправки вешаем первым делом — до всего остального.
       Если ниже что-нибудь сломается, обработчик уже стоит, и браузер не
       отправит форму сам: иначе страница просто перезагрузилась бы, человек
       решил бы, что заявка ушла, а она бы никуда не ушла. */
    forms.forEach(f => f.addEventListener('submit', e => {
      e.preventDefault();
      try { send(f); } catch (err) {
        const box = f.querySelector('.lf__err');
        if (box) { box.textContent = 'Не получилось отправить. Позвоните, пожалуйста, по телефону.';
                   box.hidden = false; }
      }
    }));

    const WA = '79897512851';

    /* ---------- телефон ----------
       Поле само приводит номер к одному виду: +7 (989) 751-28-51.

       Разбор простой. Из того, что набрали, берём цифры. Если первая — 7 или
       8, это код страны или междугородняя восьмёрка: номер начинается после
       неё. Если первая другая (почти всегда 9), человек просто не стал
       набирать начало — дописываем код сами. Дальше десять цифр расставляются
       по местам.

       Так одинаково разбираются +7 989…, 8 989…, 989… и номер, вставленный
       из буфера со скобками и дефисами. */
    const тело = (v, живой) => {
      let d = String(v || '').replace(/\D/g, '');
      /* Семёрка впереди — всегда код страны: российский номер с неё не
         начинается.

         С восьмёркой два случая. Когда человек набирает её руками, это
         междугородняя восьмёрка — он просто начал привычным образом, и её
         надо снять сразу, не дожидаясь второй цифры: «+7 (8…» в поле
         выглядит ошибкой. Когда номер вставили из буфера или подставил
         браузер, видно всю строку, и там восьмёрка может быть первой цифрой
         кода города (Сочи — 862, Петербург — 812). Тогда снимаем её, только
         если дальше идёт девятка (мобильный) или если цифр больше десяти —
         в номере их ровно десять, лишняя впереди может быть только
         восьмёркой набора. */
      if (d[0] === '7') d = d.slice(1);
      if (d[0] === '8' && (живой || d[1] === '9' || d.length > 10)) d = d.slice(1);
      return d.slice(0, 10);
    };
    /* «+7» стоит отдельной надписью слева от поля, в самом поле его нет:
       так сразу видно, что набирать нужно с девятки. */
    const красиво = d => {
      if (!d) return '';
      let s = '(' + d.slice(0, 3);
      if (d.length >= 3) s += ')';
      if (d.length > 3) s += ' ' + d.slice(3, 6);
      if (d.length > 6) s += '-' + d.slice(6, 8);
      if (d.length > 8) s += '-' + d.slice(8, 10);
      return s;
    };
    /* Сколько цифр номера стоит левее каретки — по этому числу её и вернём
       на место после переписывания поля. Иначе каретка прыгала бы в конец
       при любой правке в середине. */
    const цифрДо = (v, pos) => (v.slice(0, pos).match(/\d/g) || []).length;
    const местоПосле = (s, n) => {
      if (!s) return 0;
      if (n <= 0) return Math.min(1, s.length);      // сразу после «(»
      let к = 0;
      for (let i = 0; i < s.length; i++) {
        if (s[i] >= '0' && s[i] <= '9' && ++к === n) return i + 1;
      }
      return s.length;
    };

    function маска(el) {
      let прежнее = тело(el.value), снято = false;
      const править = e => {
        const было = прежнее;
        const v = el.value;
        let n = цифрДо(v, el.selectionStart == null ? v.length : el.selectionStart);
        /* Набор руками — это вставка одного знака. Всё остальное (буфер,
           автозаполнение, первичная правка) разбираем по всей строке.

           Восьмёрку снимаем на лету только один раз за заполнение. Иначе у
           того, кто набирает городской через междугороднюю — 8 862 … —
           пропали бы обе восьмёрки подряд, и от номера осталось бы девять
           цифр. Счётчик сбрасывается, когда поле правят стиранием. */
        if (e && /delete/i.test(e.inputType || '')) снято = false;
        const живой = !!(e && e.inputType === 'insertText') && !снято;
        const сырые = v.replace(/\D/g, '');
        let d = тело(v, живой);
        if (живой && сырые.length && d.length < сырые.length) снято = true;
        /* Забой по разделителю: браузер стёр скобку или дефис, цифр столько
           же. Человек метил в цифру — убираем её. */
        if (e && e.inputType === 'deleteContentBackward' && d.length === было.length && n > 0) {
          d = d.slice(0, n - 1) + d.slice(n); n--;
        }
        const s = красиво(d);
        прежнее = d;
        if (el.value !== s) el.value = s;
        const p = местоПосле(s, n);
        try { el.setSelectionRange(p, p); } catch (err) {}
      };
      el.addEventListener('input', править);
      /* Номер могли вставить ещё до того, как скрипт сюда добрался, или
         подставить автозаполнением браузера — приводим к виду и тогда. */
      el.addEventListener('change', () => править(null));
      if (el.value) править(null);
    }
    $$('.lf__i[type=tel]').forEach(маска);


    function fail(el, msg, box) {
      sfx.play('nope');            // поле не заполнено: мягко, без резкости
      el.setAttribute('aria-invalid', 'true');
      box.textContent = msg; box.hidden = false;
      el.focus();
      return false;
    }

    function send(f) {
      /* Имя и телефон ищем по id: атрибута name у них нет намеренно —
         так браузер не сможет подставить их в адресную строку, если отправку
         вдруг не перехватит скрипт. */
      const name = f.querySelector('.lf__i[type=text]'), tel = f.querySelector('.lf__i[type=tel]'),
            ok = f.querySelector('[name=ok]'), box = f.querySelector('.lf__err'),
            when = f.querySelector('[name=when]:checked');
      [name, tel].forEach(el => el.removeAttribute('aria-invalid'));
      box.hidden = true;

      if (name.value.trim().length < 2) return fail(name, 'Напишите, как к вам обращаться.', box);
      const номер = тело(tel.value);
      if (номер.length < 10) return fail(tel, 'Проверьте номер: в нём должно быть десять цифр после +7.', box);
      const полный = '+7 ' + красиво(номер);
      if (!ok.checked) { box.textContent = 'Без согласия на обработку данных мы не сможем перезвонить.';
        box.hidden = false; ok.focus(); return false; }

      const text = 'Здравствуйте! Меня зовут ' + name.value.trim()
        + '. Хочу записаться на приём. Телефон: ' + полный
        + '. Звонить ' + (when ? when.value : 'в любое время') + '.';

      if (FORM_ENDPOINT) {
        fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.value.trim(), tel: '+7' + номер,
                                 when: when ? when.value : '', page: location.pathname }) })
          .then(r => { if (!r.ok) throw 0; done(f); })
          .catch(() => { box.textContent = 'Не получилось отправить. Позвоните, пожалуйста, по телефону.';
                         box.hidden = false; });
      } else {
        open('https://wa.me/' + WA + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
        done(f);
      }
      track('lead_send');
      return true;
    }

    function done(f) {
      sfx.play('sent');            // заявка ушла — короткое подтверждение
      f.classList.add('is-sent');
      /* Единственное место, где помощник прыгает: заявка ушла. В покое
         (и в режиме для слабовидящих) прыжка нет — там ничего не скачет. */
      if (typeof mascot !== 'undefined') { mascot.react('jump'); mascot.cheer(); }
      const мп = $('#lfpop-msc');
      if (мп && !reduced) {
        мп.src = asset('assets/mascot/jump_03.webp');
        setTimeout(() => { мп.src = asset('assets/mascot/idle.webp'); }, 900);
      }
      const head = $('.lf__head', f);
      head.innerHTML = '<p class="eyebrow">Готово</p>'
        + '<h3 class="lf__t">Спасибо, заявка у нас</h3>'
        + '<p class="lf__done">Перезвоним в рабочее время. Если нужно срочно — '
        + '<a class="lnk" href="tel:+79897512851">+7 (989) 751‑28‑51</a>.</p>';
      try { localStorage.setItem('au-lead', '1'); } catch (e) {}
      if (pop && !pop.hidden) setTimeout(closePop, 2600);
    }


    /* ---------- всплывающее окно ----------
       Показываем один раз и только тому, кто уже читал страницу: после блока
       о враче и не раньше двадцати пяти секунд, либо когда курсор уходит за
       верхнюю кромку окна. Закрытое окно не возвращается две недели, а после
       отправленной заявки — не возвращается вовсе. */
    const pop = $('#lfpop'); if (!pop) return;
    let shown = false, lastFocus = null;

    const seen = () => { try {
      if (localStorage.getItem('au-lead')) return true;
      const t = +localStorage.getItem('au-lead-pop') || 0;
      return t && Date.now() - t < 14 * 864e5;
    } catch (e) { return false; } };

    /* force — окно открыто нажатием, а не само. Нажатие выполняем всегда:
       человек попросил форму, и «вы это окно уже видели» тут не ответ. */
    function openPop(force) {
      if (!force && (shown || seen() || html.classList.contains('vi'))) return;
      /* Пока висит полоса о cookie, окно не открываем само: на телефоне оба
         приходят снизу и налезают друг на друга, а человек получает два
         требования сразу. Сперва пусть ответит на первое — окно подождёт
         следующего повода (прокрутки или ухода курсора). */
      const bar = $('#cookie');
      if (!force && bar && !bar.hidden) return;
      shown = true; lastFocus = document.activeElement;
      pop.hidden = false;
      const first = $('#lf-pop-name', pop); if (first) setTimeout(() => first.focus(), 340);
      track('lead_pop_open');
    }
    function closePop() {
      if (pop.hidden) return;
      pop.hidden = true;
      try { localStorage.setItem('au-lead-pop', String(Date.now())); } catch (e) {}
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    $$('[data-lf-close]', pop).forEach(el => el.addEventListener('click', closePop));
    /* Любая кнопка с data-lf-open открывает то же окно заявки. Так вторая
       форма на странице не нужна: одна разметка, одна проверка, одна отправка. */
    $$('[data-lf-open]').forEach(el => el.addEventListener('click', () => openPop(true)));
    addEventListener('keydown', e => {
      if (pop.hidden) return;
      if (e.key === 'Escape') { closePop(); return; }
      if (e.key !== 'Tab') return;
      /* фокус не должен уходить из окна: за ним человек не видит, где он */
      const f = $$('a[href],button,input,select,textarea', pop).filter(el => !el.disabled && el.offsetParent);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* ---------- помощник в углу ----------
       Есть на каждой странице: решение записаться приходит не там, где стоит
       форма. Появляется не сразу — сначала человек должен что-то прочитать,
       иначе это просто баннер поверх ещё не увиденной страницы.

       Персонаж собран из отдельных картинок в общем холсте: состояние меняет
       src одного <img>. Ни GIF, ни канвы, ни постоянного requestAnimationFrame
       — смена кадров идёт по таймеру и только пока состояние живо.

       Порядок состояний строгий: перенос важнее нажатия, нажатие важнее
       прыжка, прыжок важнее наведения, наведение важнее моргания. Из любого
       состояния возвращаемся в покой. */
    const mascot = (function () {
      const box = $('#msc'), btn = $('#msc-btn'), img = $('#msc-img'),
            bub = $('#msc-bub'), say = $('#msc-say');
      const пусто = { say(){}, think(){}, hideBubble(){}, react(){}, cheer(){},
                      setPosition(){}, resetPosition(){}, show(){}, hide(){} };
      if (!box || !btn || !img) return пусто;

      const ПУТЬ = 'assets/mascot/';
      /* Пути выписаны целиком, а не собраны из кусков: сборщик ищет ассеты в
         тексте скрипта обычным поиском и склеенное имя не найдёт. */
      const РЯДЫ = {
        blink: ['assets/mascot/blink_01.webp', 'assets/mascot/blink_02.webp',
                'assets/mascot/blink_03.webp', 'assets/mascot/blink_04.webp'],
        hover: ['assets/mascot/hover_01.webp', 'assets/mascot/hover_02.webp',
                'assets/mascot/hover_03.webp', 'assets/mascot/hover_04.webp'],
        click: ['assets/mascot/click_01.webp', 'assets/mascot/click_02.webp',
                'assets/mascot/click_03.webp', 'assets/mascot/click_04.webp',
                'assets/mascot/click_05.webp'],
        jump:  ['assets/mascot/jump_01.webp', 'assets/mascot/jump_02.webp',
                'assets/mascot/jump_03.webp', 'assets/mascot/jump_04.webp',
                'assets/mascot/jump_05.webp'],
        landing: ['assets/mascot/landing_01.webp', 'assets/mascot/landing_02.webp',
                  'assets/mascot/landing_03.webp'],
        /* Повороты. Из них собирается «огляделся»: персонаж поворачивает
           голову и возвращается. Шаг у них длиннее, чем у взмаха, — это взгляд,
           а не дёрганье. */
        влево: ['assets/mascot/three-quarter-left.webp', 'assets/mascot/left.webp',
                'assets/mascot/three-quarter-left.webp'],
        вправо: ['assets/mascot/three-quarter-right.webp', 'assets/mascot/right.webp',
                 'assets/mascot/three-quarter-right.webp'],
        назад: ['assets/mascot/three-quarter-right.webp', 'assets/mascot/right.webp',
                'assets/mascot/back.webp', 'assets/mascot/right.webp',
                'assets/mascot/three-quarter-right.webp'],
        радость: ['assets/mascot/jump_01.webp', 'assets/mascot/jump_02.webp',
                  'assets/mascot/jump_01.webp', 'assets/mascot/landing_03.webp'],
      };
      const ПОКОЙ = 'assets/mascot/idle.webp', ПЕРЕНОС = 'assets/mascot/drag.webp';
      const ШАГ = { blink: 65, hover: 110, click: 110, jump: 90, landing: 100,
                    влево: 300, вправо: 300, назад: 280, радость: 130 };
      const ЭФФЕКТЫ = { искра: 'assets/mascot/sparkle.webp',
                        сердце: 'assets/mascot/heart.webp',
                        вопрос: 'assets/mascot/question.webp' };

      /* Ряды подтягиваем по требованию. Сразу с разметкой приходит только
         покой; моргание — первое, что понадобится, его греем на простое. */
      const греты = {};
      function греть(имя) {
        if (греты[имя]) return;
        греты[имя] = 1;
        (РЯДЫ[имя] || []).forEach(p => { const i = new Image(); i.src = asset(p); });
      }
      const простой = window.requestIdleCallback || (f => setTimeout(f, 1200));
      простой(() => греть('blink'));

      let состояние = 'idle', таймер = 0, миг = 0;
      const тише = () => { clearTimeout(таймер); таймер = 0; };

      function покой() { состояние = 'idle'; img.src = asset(ПОКОЙ); заводитьМиг(); }

      /* Проигрывает ряд кадр за кадром и возвращает в покой. */
      function ряд(имя, потом) {
        тише(); clearTimeout(миг);
        состояние = имя; греть(имя);
        const к = РЯДЫ[имя], шаг = ШАГ[имя] || 100;
        let i = 0;
        const дальше = () => {
          if (состояние !== имя) return;            // перебило состояние поважнее
          if (i >= к.length) { (потом || покой)(); return; }
          img.src = asset(к[i++]);
          таймер = setTimeout(дальше, шаг);
        };
        дальше();
      }

      /* Моргание — единственное, что происходит само. Со случайным перерывом,
         и только в покое: перебивать им нажатие или перенос незачем. */
      function заводитьМиг() {
        clearTimeout(миг);
        if (reduced || !box.classList.contains('is-on')) return;
        миг = setTimeout(() => {
          if (состояние === 'idle' && !document.hidden) ряд('blink');
          else заводитьМиг();
        }, 4000 + Math.random() * 3000);
      }

      /* Короткая вспышка над плечом: искра, сердце или знак вопроса.
         Картинку подставляем в момент показа — до первого раза её не грузим. */
      const фхЭл = $('#msc-fx');
      let фхТаймер = 0;
      function эффект(имя) {
        if (!фхЭл || reduced || !ЭФФЕКТЫ[имя]) return;
        clearTimeout(фхТаймер);
        фхЭл.classList.remove('is-on');
        фхЭл.src = asset(ЭФФЕКТЫ[имя]);
        фхЭл.hidden = false;
        void фхЭл.offsetWidth;                      // перезапуск анимации
        фхЭл.classList.add('is-on');
        фхТаймер = setTimeout(() => { фхЭл.classList.remove('is-on'); фхЭл.hidden = true; }, 1600);
      }

      /* ---------- облачко ----------
         Теперь это подсказка, а не меню. Наводят мышь — помощник сразу
         говорит, зачем он здесь; нажимают — открывается форма записи.
         Промежуточный шаг с выбором убран: он стоял между человеком и тем
         единственным действием, ради которого помощник и нужен. */
      const РЕПЛИКА = 'На приём!';
      let открыто = false, таймерПодсказки = 0;
      function показать(текст) {
        bub.classList.remove('is-dots');
        say.textContent = текст || РЕПЛИКА;
        bub.hidden = false; открыто = true;
        сторона();
      }
      /* Сначала точки, потом фраза — как в переписке. Пауза небольшая: это
         приём, а не ожидание ответа. */
      function подумать(фраза, держать) {
        bub.classList.add('is-dots');
        say.textContent = '';
        bub.hidden = false; открыто = true;
        сторона();
        clearTimeout(таймерПодсказки);
        таймерПодсказки = setTimeout(() => {
          if (!открыто) return;
          bub.classList.remove('is-dots');
          say.textContent = фраза;
          таймерПодсказки = setTimeout(спрятать, держать || 4200);
        }, 750);
      }
      function спрятать() { clearTimeout(таймерПодсказки);
        bub.classList.remove('is-dots'); bub.hidden = true; открыто = false; }
      /* Облачко всегда в ту сторону, где есть место: хвостик переезжает
         вместе с ним. */
      function сторона() {
        const r = btn.getBoundingClientRect();
        box.classList.toggle('msc--left', r.left + r.width / 2 < innerWidth / 2);
      }

      /* ---------- куда ведёт нажатие ---------- */
      const кФорме = () => {
        /* В покое и в версии для слабовидящих всплывающего окна нет вовсе —
           ведём к форме, которая уже стоит на странице, а если её нет
           (внутренние страницы), к контактам. */
        if (html.classList.contains('still') || html.classList.contains('vi')) {
          const т = $('.lfband .lf') || $('#kontakty') || $('.ftr');
          if (т) { т.scrollIntoView({ behavior: 'smooth', block: 'center' });
                   const f = $('input', т); if (f) setTimeout(() => f.focus(), 500); }
          return;
        }
        openPop(true);
      };
      $('[data-msc="close"]', bub).addEventListener('click', () => {
        спрятать(); btn.focus();
      });
      addEventListener('keydown', e => {
        if (e.key === 'Escape' && открыто) спрятать();
      });

      /* ---------- чем помощник занят, пока его не трогают ----------
         Одного моргания мало: персонаж выглядит картинкой. Поэтому изредка он
         машет рукой, а ещё реже — думает вслух. Правила простые: только в
         покое, только когда вкладку видно, не чаще раза в полминуты и не
         больше трёх реплик за посещение. Всё это отключено в режиме покоя и
         у слабовидящих: там ничего не должно возникать само. */
      /* Реплики. Все до одной ведут туда же, куда и нажатие, — к форме
         записи. Обещать в облачке то, чего нажатие не делает, нечестно: человек
         нажмёт за «посмотреть цены», а получит форму. */
      const РЕПЛИКИ = ['Есть вопрос?', 'Записать вас на приём?',
                       'Подобрать удобное время?', 'Нужна консультация?',
                       'Помочь с записью?', 'Запись — имя и телефон',
                       'Перезвоним, когда удобно', 'Спросить можно что угодно',
                       'Записаться?', 'Подскажу по записи'];
      /* Занятия на простое. Пустой угол с моргающей картинкой — это не жизнь,
         а зависший кадр, поэтому помощник то оглядывается, то машет, то
         задумывается вслух. Каждое занятие короткое и редкое: оно должно
         ловиться боковым зрением, а не отвлекать от чтения.

         Веса подобраны так, чтобы чаще было тихое (оглядеться, помахать), а
         заметное (прыжок, реплика) — изредка. */
      const ЗАНЯТИЯ = [
        { вес: 3, что: () => ряд(Math.random() < .5 ? 'влево' : 'вправо') },
        { вес: 3, что: () => ряд('hover') },
        { вес: 1, что: () => { ряд('назад'); } },
        { вес: 1, что: () => { эффект('искра'); ряд('радость'); } },
        { вес: 2, реплика: true, что: () => { эффект('вопрос'); подумать(дальшеРеплика()); } },
      ];
      let реплик = 0, занятий = 0, занятие = 0, ходРеплик = 0;
      /* Реплики идут по кругу со случайным началом — чтобы при двух визитах
         подряд не повторялась одна и та же. */
      const началоРеплик = Math.floor(Math.random() * РЕПЛИКИ.length);
      const дальшеРеплика = () => РЕПЛИКИ[(началоРеплик + ходРеплик++) % РЕПЛИКИ.length];

      function заводитьЗанятие() {
        clearTimeout(занятие);
        /* Десяти раз за посещение достаточно. Дальше помощник только моргает:
           жест раз в полминуты до конца долгого чтения — это уже навязчивость,
           а не признак жизни. */
        if (reduced || занятий >= 10) return;
        занятие = setTimeout(() => {
          const можно = состояние === 'idle' && !открыто && !тащим && !document.hidden
                     && box.classList.contains('is-on');
          if (можно) {
            занятий++;
            /* Вслух — не больше трёх раз за посещение; дальше только движения. */
            const пул = ЗАНЯТИЯ.filter(з => !з.реплика || реплик < 3);
            const всего = пул.reduce((с, з) => с + з.вес, 0);
            let r = Math.random() * всего, выбор = пул[0];
            for (const з of пул) { r -= з.вес; if (r <= 0) { выбор = з; break; } }
            if (выбор.реплика) реплик++;
            выбор.что();
          }
          заводитьЗанятие();
        }, 24000 + Math.random() * 20000);
      }

      /* ---------- наведение ----------
         Подсказка выходит сразу, без задержки: это не всплывающее меню, а
         подпись к кнопке — ждать её человек не станет. Движение персонажа
         идёт заодно, но только если на устройстве действительно есть мышь. */
      /* Реакция на наведение каждый раз разная. Варианты лежат колодой: она
         перемешивается и раздаётся до конца, поэтому подряд одно и то же не
         выпадает, а за семь наведений человек увидит весь набор. Первое
         наведение всегда взмах — это приветствие, оно должно быть узнаваемым. */
      /* Повороты головы сюда не берём: на наведении они читаются вяло, человек
         ждёт отклика, а получает медленный разворот. Все варианты строятся на
         двух живых движениях — взмах и подскок — и различаются эффектом и
         ритмом. Повороты остаются там, где они к месту: на простое и в
         перетаскивании. */
      const ПРИВЕТЫ = [
        () => ряд('hover'),
        () => { эффект('сердце'); ряд('hover'); },
        () => { эффект('искра'); ряд('hover'); },
        () => ряд('радость'),
        () => { эффект('сердце'); ряд('радость'); },
        () => { эффект('искра'); ряд('радость'); },
        () => ряд('hover', () => ряд('hover')),
      ];
      let колода = [], первыйПривет = true;
      function привет() {
        if (первыйПривет) { первыйПривет = false; ряд('hover'); return; }
        if (!колода.length) {
          колода = ПРИВЕТЫ.slice();
          for (let i = колода.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = колода[i]; колода[i] = колода[j]; колода[j] = t;
          }
        }
        колода.pop()();
      }

      const сМышью = matchMedia('(hover: hover)').matches;
      if (сМышью) {
        let греломПриветы = 0;
        btn.addEventListener('mouseenter', () => {
          if (тащим) return;
          показать();
          /* Кадры поворотов и радости подтягиваем при первом же наведении,
             чтобы вторая реакция не дёргалась на загрузке. */
          if (!греломПриветы) {
            греломПриветы = 1;
            простой(() => { ['радость', 'jump', 'landing'].forEach(греть); });
          }
          if (!reduced && состояние === 'idle') привет();
        });
        btn.addEventListener('mouseleave', () => { if (!тащим) спрятать(); });
      }
      /* С клавиатуры наведения нет — его заменяет фокус. */
      btn.addEventListener('focus', () => { if (!тащим) показать(); });
      btn.addEventListener('blur', спрятать);

      /* ---------- нажатие ---------- */
      function нажали() {
        if (состояние === 'drag') return;
        sfx.play('tap'); track('msc_click');
        спрятать();
        кФорме();
        if (!reduced) ряд('click');
      }

      /* ---------- перенос ----------
         Pointer Events, а не отдельные ветки для мыши и пальца. Перенос
         начинается только после 8 px движения: без порога обычное нажатие
         превращалось бы в микроперетаскивание и не срабатывало. */
      const ЗАПАС = 8, КЛЮЧ = 'au-msc';
      let x = 0, y = 0, взяли = null, тащим = false;

      function поставить(нx, нy) {
        const r = btn.getBoundingClientRect();
        const ш = r.width, в = r.height;
        /* Не даём утащить за край: держим целиком в окне с отступом. */
        const минX = -(innerWidth - ш - 24), максX = 0;
        const минY = -(innerHeight - в - 24), максY = 0;
        x = Math.min(максX, Math.max(минX, нx));
        y = Math.min(максY, Math.max(минY, нy));
        box.style.setProperty('--msc-x', x + 'px');
        box.style.setProperty('--msc-y', y + 'px');
        сторона();
      }
      function запомнить() {
        try { localStorage.setItem(КЛЮЧ, x + ',' + y); } catch (e) {}
      }
      (function вспомнить() {
        try {
          const в = (localStorage.getItem(КЛЮЧ) || '').split(',');
          if (в.length === 2) поставить(+в[0] || 0, +в[1] || 0);
        } catch (e) {}
      })();

      btn.addEventListener('pointerdown', e => {
        if (e.button) return;
        взяли = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x0: x, y0: y };
      });
      /* Наклон и полоски скорости. Без них перенос выглядел так, будто
         картинка просто ездит за курсором: кадр один и тот же, ничего не
         происходит. Теперь помощник заваливается в сторону движения тем
         сильнее, чем быстрее его тянут, а за спиной появляются полоски.
         Скорость считаем по последнему шагу указателя и сглаживаем, иначе
         наклон дёргается на каждом кадре. */
      let пред = null, скорость = 0, вверхвниз = 0, кадрПереноса = '';
      /* Поза зависит от того, куда тянут. Вверх — персонаж летит, руки вверх;
         вниз — группируется перед приземлением; вбок — просто заваливается.
         Кадр меняем только когда он действительно другой: подмена src на
         каждом движении мыши — лишняя работа для браузера. */
      const поза = () => {
        if (вверхвниз < -110) return 'assets/mascot/jump_03.webp';
        if (вверхвниз > 110) return 'assets/mascot/landing_01.webp';
        return ПЕРЕНОС;
      };
      function живость(e) {
        const т = performance.now();
        if (пред) {
          const дт = Math.max(8, т - пред.t);
          const vx = (e.clientX - пред.x) / дт * 1000;       // пикселей в секунду
          const vy = (e.clientY - пред.y) / дт * 1000;
          скорость = скорость * .7 + vx * .3;
          вверхвниз = вверхвниз * .7 + vy * .3;
          const наклон = Math.max(-16, Math.min(16, скорость / 55));
          box.style.setProperty('--msc-tilt', наклон.toFixed(1) + 'deg');
          box.style.setProperty('--msc-speed',
            Math.min(.85, Math.hypot(скорость, вверхвниз) / 900).toFixed(2));
          if (Math.abs(скорость) > 60) box.classList.toggle('is-back', скорость > 0);
          const к = поза();
          if (к !== кадрПереноса) { кадрПереноса = к; img.src = asset(к); }
        }
        пред = { x: e.clientX, y: e.clientY, t: т };
      }
      addEventListener('pointermove', e => {
        if (!взяли || e.pointerId !== взяли.id) return;
        const дx = e.clientX - взяли.sx, дy = e.clientY - взяли.sy;
        if (!тащим) {
          if (Math.hypot(дx, дy) < ЗАПАС) return;
          тащим = true; состояние = 'drag'; тише(); clearTimeout(миг);
          спрятать();
          пред = null; скорость = 0; вверхвниз = 0; кадрПереноса = ПЕРЕНОС;
          box.classList.add('is-drag'); img.src = asset(ПЕРЕНОС);
          греть('landing'); греть('jump'); sfx.play('pick');
          try { btn.setPointerCapture(взяли.id); } catch (err) {}
        }
        живость(e);
        поставить(взяли.x0 + дx, взяли.y0 + дy);
      }, { passive: true });
      let былПеренос = false;
      function отпустили(e) {
        if (!взяли || (e && e.pointerId !== взяли.id)) return;
        const тащили = тащим;
        взяли = null; тащим = false;
        if (!тащили) return;                      // обычное нажатие разберёт click
        былПеренос = true;
        box.classList.remove('is-drag');
        box.style.setProperty('--msc-tilt', '0deg');
        box.style.setProperty('--msc-speed', '0');
        box.classList.remove('is-back');
        пред = null; скорость = 0; вверхвниз = 0; кадрПереноса = '';
        запомнить();
        упасть();
      }

      /* Отпустили — помощник падает и приземляется.

         Падение короткое и с хвостом: сначала он проседает вниз с разгоном,
         потом подбрасывается и успокаивается. Кадры идут не ровной чередой, а
         под движение: группировка в падении, удар о землю в нижней точке,
         выпрямление на отскоке. Без этого отпускание выглядело так, будто
         картинку просто положили на место. */
      function упасть() {
        тише(); clearTimeout(миг);
        состояние = 'landing';
        sfx.play('place');
        if (reduced) { box.style.setProperty('--msc-drop', '0px'); покой(); return; }
        img.src = asset('assets/mascot/landing_01.webp');
        const точка = { v: 0 };
        const сдвиг = () => box.style.setProperty('--msc-drop', точка.v.toFixed(1) + 'px');
        gsap.timeline({ onComplete() {
            box.style.setProperty('--msc-drop', '0px');
            if (состояние === 'landing') покой();
          } })
          .to(точка, { v: 16, duration: .17, ease: 'power2.in', onUpdate: сдвиг })
          .add(() => { if (состояние === 'landing') img.src = asset('assets/mascot/landing_02.webp'); })
          .to(точка, { v: -7, duration: .16, ease: 'power2.out', onUpdate: сдвиг })
          .add(() => { if (состояние === 'landing') img.src = asset('assets/mascot/landing_03.webp'); })
          .to(точка, { v: 0, duration: .22, ease: 'power1.inOut', onUpdate: сдвиг });
      }
      addEventListener('pointerup', отпустили);
      addEventListener('pointercancel', отпустили);
      /* Нажатие разбираем на click, а не на pointerup.
         Почему. На пальце браузер шлёт click примерно через мгновение после
         pointerup — в той же точке экрана. Если открыть форму раньше, этот
         запоздавший click попадает уже в подложку окна и тут же её закрывает:
         замерено — окно открывалось и мгновенно схлопывалось, человек не
         успевал ничего увидеть. На click же приходят и мышь, и палец, и
         клавиатура (Enter с пробелом), так что ветка одна на всех.
         После переноса click всё равно прилетает — его гасим. */
      btn.addEventListener('click', () => {
        if (былПеренос) { былПеренос = false; return; }
        нажали();
      });

      /* После поворота экрана прежний сдвиг может унести персонажа за край. */
      onRealResize(() => поставить(x, y), 200);

      /* Помощник отходит в сторону над играми.

         На телефоне он крупнее прежней кнопки и накрывал два инструмента из
         пяти в игре про пломбу: замерено — «Свет» и «Полировка» оказывались
         под ним, а по ним надо попадать пальцем. Пока площадка игры на
         экране, помощник уходит; игра прокрутилась — возвращается.
         На мониторе он стоит далеко от площадок и никому не мешает, поэтому
         правило только для узких экранов. */
      (function встороне() {
        if (!window.IntersectionObserver) return;
        const площадки = $$('#fill-arena, #tray-stage');
        if (!площадки.length) return;
        const занято = new Set();
        const глядя = new IntersectionObserver(записи => {
          записи.forEach(з => з.isIntersecting ? занято.add(з.target) : занято.delete(з.target));
          box.classList.toggle('is-shy', innerWidth <= 900 && занято.size > 0);
        }, { threshold: .35 });
        площадки.forEach(э => глядя.observe(э));
        onRealResize(() => box.classList.toggle('is-shy', innerWidth <= 900 && занято.size > 0), 200);
      })();

      /* ---------- показ ----------
         Порог — примерно половина экрана прокрутки после того, как страница
         открыта. На главной «открыта» означает, что вступление закончилось. */
      let готов = false, показан = false;
      const сверить = () => {
        if (html.classList.contains('ready') && scrollY >= innerHeight * .6) готов = true;
        box.classList.toggle('is-on', готов);
        /* Моргание заводим ровно один раз, на переходе в показ. Сверка идёт
           каждые 0.7 с, и если заводить её отсюда каждый раз, отсчёт до
           моргания обнуляется быстрее, чем успевает дойти до конца, —
           замерено: за 15 секунд не сменился ни один кадр. */
        if (готов && !показан) {
          показан = true; box.hidden = false; заводитьМиг(); заводитьЗанятие();
          /* На телефоне наведения нет, и помощник остался бы безымянной
             картинкой в углу. Поэтому подсказку один раз показываем сами —
             и убираем, чтобы она не висела над страницей. */
          if (!сМышью) setTimeout(() => {
            if (!открыто && !тащим) {
              показать();
              таймерПодсказки = setTimeout(спрятать, 5200);
            }
          }, 1400);
        }
      };
      addEventListener('scroll', сверить, { passive: true });
      setInterval(сверить, 700);
      setTimeout(сверить, 3000);

      return {
        say(текст) { показать(текст); },
        think() { показать('…'); },
        hideBubble: спрятать,
        react(что) {
          if (reduced && что !== 'click') return;
          if (РЯДЫ[что]) ряд(что);
        },
        setPosition: поставить,
        resetPosition() { поставить(0, 0); запомнить(); },
        cheer() { эффект('сердце'); },
        show() { box.hidden = false; box.classList.add('is-on'); },
        hide() { box.classList.remove('is-on'); спрятать(); },
      };
    })();

    /* ---------- круглая кнопка в углу ----------
       Стоит на странице, когда маскот выключен (флаг МАСКОТ в build.py).
       Та же роль: решение записаться приходит не там, где стоит форма.
       Появляется после полэкрана прокрутки на открытой странице и уступает
       место полосе о cookie — обе живут в одном углу, поэтому состояние
       пересчитывается, а не ставится однажды. */
    (function fab() {
      const b = $('#fab'); if (!b) return;
      b.addEventListener('click', () => {
        track('fab_click');
        /* В покое и в версии для слабовидящих окна нет — ведём к форме на
           странице, а на внутренних страницах — к контактам. */
        if (html.classList.contains('still') || html.classList.contains('vi')) {
          const t = $('.lfband .lf') || $('#kontakty') || $('.ftr');
          if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' });
                   const f = $('input', t); if (f) setTimeout(() => f.focus(), 500); }
          return;
        }
        openPop(true);
      });
      const bar = $('#cookie');
      let armed = false;
      const sync = () => {
        if (html.classList.contains('ready') && scrollY >= innerHeight * .6) armed = true;
        const busy = bar && !bar.hidden;
        b.classList.toggle('is-on', armed && !busy);
      };
      addEventListener('scroll', sync, { passive: true });
      setInterval(sync, 700);
      setTimeout(sync, 3000);
    })();

    /* Само окно приходит только на главной: там есть что прочитать до него —
       направления, первый визит, врач. На внутренних страницах человек пришёл
       за конкретным (цены, документы), и перебивать его нечем. */
    const doc = $('#vrach');
    if (!doc || seen()) return;
    const start = Date.now();
    const watch = () => {
      if (shown) return;
      if (Date.now() - start < 25000) return;
      if (!html.classList.contains('ready')) return;
      if (doc.getBoundingClientRect().top > 0) return;   // блок о враче ещё не прочитан
      openPop();
    };
    addEventListener('scroll', watch, { passive: true });
    setTimeout(watch, 25500);
    /* уход курсора за верхнюю кромку — человек собрался закрыть вкладку */
    if (finePointer) document.addEventListener('mouseout', e => {
      if (!e.relatedTarget && e.clientY <= 0 && html.classList.contains('ready')
          && Date.now() - start > 12000) openPop();
    });
  })();

  if (!$('#intro')) { html.classList.add('ready'); if (!hasGsap || reduced) html.classList.add('still'); return; }   // внутренние страницы

  /* статичная версия: всё показано, игры в конечном состоянии */
  if (!hasGsap || reduced) {
    /* Статичный режим — это не «скрипта нет»: раньше он подменял класс js
       на no-js, а правило .no-js .cookie прятало баннер согласия. В режиме
       для слабовидящих человек переставал видеть выбор по cookie. */
    html.classList.add('still'); html.classList.add('ready');
    const ib = $('#intro'); if (ib) ib.remove();
    $('.offer').classList.add('is-open'); $('.fill').classList.add('is-done'); $('#promo').hidden = false;
    $('#tray-stage').classList.add('is-clean'); $('#tray-cta').hidden = false;
    return;
  }
  gsap.registerPlugin(ScrollTrigger, Draggable);

  /* ---------- ВСТУПЛЕНИЕ ----------
     Лампа крупная с самого начала и горит ровно, без мигания: по мере движения
     усиливается сияние, лампа наезжает, растворяется в свете — и кадр сразу
     переходит в первый экран. Одно движение без остановок и промежуточных
     экранов. Надписи видны сразу и растворяются при первом движении.
     Два режима: если документ прокручивается сам — ведёт скролл (назад тоже);
     если нет (страница внутри iframe по высоте контента — так устроен артефакт),
     ведём колесом и жестом. */
  (function intro() {
    const box = $('#intro'); if (!box) return;
    /* Завесу гасим на липком слое, а не на всей секции: у слоя есть свой
       уровень наложения, и первый экран уходит под него целиком. Если гасить
       секцию, она сама становится контекстом наложения и низ кадра начинает
       проступать поверх завесы — свет сходит неровно. */
    const veil = $('.intro__inner', box) || box;
    /* Пока идёт вступление, остальная страница снята с отрисовки: браузеру
       не приходится верстать десять секций и три холста на первом же кадре.
       Снимаем этот режим навсегда, как только вступление открыто или человек
       нажал ссылку на якорь — иначе прокрутка к разделу промахнётся мимо. */
    let liteOff = false;
    const lite = on => { if (liteOff) return; if (!on) liteOff = true;
      html.classList.toggle('lite', on); };
    /* Возврат к обычной отрисовке — самый дорогой кадр всего вступления:
       десять секций и три холста верстаются разом. Раньше это происходило
       на самом выходе к первому экрану и читалось как заминка. Теперь
       возвращаем по две секции за кадр — та же работа расходится на
       несколько кадров.
       При обычной прокрутке этого не делаем вовсе: content-visibility: auto
       сам показывает то, что попало в кадр, и пропускает остальное — так
       весь путь идёт без единого длинного кадра. Снимаем режим только по
       нажатию ссылки на якорь: там прокрутка должна попасть точно в раздел,
       а по заглушкам она промахивается. Один кадр на осознанном нажатии
       не заметен. */
    let unliting = false;
    const unlite = () => {
      if (liteOff || unliting) return;
      unliting = true;
      const els = $$('.sec').concat($$('.ftr'));
      let i = 0;
      const step = () => {
        /* По одной секции за кадр. На две приходилось по 150 мс на кадр при
           шестикратном замедлении процессора — заминка была заметна глазом. */
        for (let n = 0; n < 1 && i < els.length; n++, i++) {
          els[i].classList.add('lite-off');
          void els[i].offsetHeight;      // считаем вёрстку здесь, а не когда она понадобится
        }
        if (i < els.length) requestAnimationFrame(step);
        else { liteOff = true; html.classList.remove('lite'); }
      };
      step();
    };
    addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href*="#"]');
      if (a) { unlite(); lite(false); } }, true);
    addEventListener('hashchange', () => { unlite(); lite(false); });
    const par   = $('#intro-par'),
          stage = $('.intro__stage', box),
          on    = $('.intro__on', box),
          hotim = $('.intro__hot', box),
          glow  = $('.intro__glow', box),
          bloom = $('.intro__bloom', box),
          flash = $('.intro__flash', box),
          hint  = $('.intro__hint', box),
          slogan= $$('.intro__slogan', box),
          slogTop = slogan[0], slogBot = slogan[1],
          btn   = $('#intro-lamp'),
          hdrEl = $('#hdr');

    /* Одна шкала 0→1: примерно два экрана прокрутки или одно нажатие.
       Сначала включается свет и уходит текст — наезда в это время нет вовсе.
       Наезд начинается только с 0.18, поэтому нажатие на лампу может сразу
       перевести шкалу в эту точку: свет вспыхивает, надписи уходят, а размер
       кадра при этом не меняется ни на пиксель.
         0.00–0.12  слоган и подсказка уходят
         0.00–0.18  лампа разгорается ровно, от погашенной до горящей
         0.18–0.62  свет продолжает расти: горящая перетекает в раскалённую
         0.18–0.76  наезд 1→2.8 одной дугой, всё быстрее к концу
         0.18–0.72  сияние набирает силу ровно, без ступеней
         0.26–0.78  ореол расходится по кадру, всё быстрее
         0.62–0.80  засвет: кадр заливает белым
         0.62–0.74  корпус растворяется в свете, пока не вырос до предела:
                    дальше растровую картинку увеличивать незачем — свет
                    доводят градиенты, они рисуются несравнимо дешевле
         0.82–1.00  свет расходится, проступает первый экран
       У каждого свойства ровно один отрезок: раньше наезд шёл двумя дугами
       и на их стыке (0.53) скорость падала до нуля — посреди вступления
       была видимая остановка. Теперь скорость нигде не обнуляется.
       Лампа увеличивается вокруг собственного центра и никуда не смещается. */
    const saneViewport = innerHeight >= 320 && innerHeight <= 1700;
    const tall = saneViewport && document.documentElement.scrollHeight - innerHeight > 60;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    /* Если браузер умеет привязывать анимацию к прокрутке сам, всю визуальную
       часть ведёт CSS: скрипт остаётся только для состояний, инерции и нажатия.
       Иначе собираем прежний таймлайн и ведём кадры вручную. Дорожка у CSS —
       прокрутка страницы, поэтому в варианте без прокрутки (артефакт в рамке)
       путь только скриптовый. */
    const SDA = tall && CSS.supports('animation-timeline', 'scroll()') && !reduced;
    if (SDA) html.classList.add('sda');

    /* Начальные значения ставит сам стиль; трогать их из скрипта нужно только
       на скриптовом пути. GSAP переписывает свойство translate в transform,
       а кадры анимации перебивают transform целиком — центровка бы поехала. */
    [on, hotim].forEach(im => { if (im && im.decode) im.decode().catch(() => {}); });

    let tl = null;
    if (!SDA) {
    gsap.set(stage, { scale: 1, transformOrigin: '50% 50%' });
    /* Сияние вынесено из лампы и не масштабируется вовсе: меняется только
       яркость. Пока оно росло вместе с наездом, браузер каждый кадр
       перерисовывал градиент в несколько тысяч пикселей. */
    gsap.set(glow,  { xPercent: -50, yPercent: -50, opacity: 0 });
    gsap.set(bloom, { xPercent: -50, yPercent: -50, scale: .18, opacity: 0 });
    gsap.set(on,    { opacity: 0 });
    gsap.set(hotim, { opacity: 0 });
    gsap.set(flash, { opacity: 0 });
    gsap.set(slogan.concat([hint]), { opacity: 1, y: 0 });

    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    /* Скорость нигде не обрывается: у каждого движения разгон, ровный ход и
       торможение, а на стыках скорости совпадают — плавности подобраны так,
       чтобы наклон в конце одного отрезка равнялся наклону в начале
       следующего. Раньше почти всё влетало в свою последнюю точку на полном
       ходу и мгновенно замирало: разрыв по скорости глаз читает как угол. */
    tl.to(slogTop, { opacity: 0, y: -26, duration: .11, ease: 'power1.inOut' }, 0)
      .to(slogBot, { opacity: 0, y: 26, duration: .11, ease: 'power1.inOut' }, 0)
      .to(hint,   { opacity: 0, duration: .08, ease: 'power1.inOut' }, 0)
      .to(on,     { opacity: 1, duration: .14, ease: 'power1.inOut' }, 0)
      /* Перетекание в раскалённую копию заканчивается на половине пути:
         дальше горящая снимается с отрисовки и наезд ведёт одна картинка
         вместо двух — самая дорогая часть кадра дешевеет вдвое. */
      .to(hotim,  { opacity: 1, duration: .38, ease: 'power1.inOut' }, .06)
      /* Наезд начинается почти сразу, а не после того, как лампа разгорится.
         Прежняя пауза в 18 % шкалы — это на телефоне почти три сотни пикселей
         прокрутки, на которых кадр не двигался вовсе, и читалась она как
         задержка отклика. Теперь свет и движение идут вместе. */
      .to(stage,  { scale: 1.353, duration: .20, ease: 'power1.in' }, 0)
      .to(stage,  { scale: 2.624, duration: .36, ease: 'none' }, .20)
      .to(stage,  { scale: 2.800, duration: .10, ease: 'power1.out' }, .56)
      .to(glow,   { opacity: 1, duration: .58, ease: 'power1.inOut' }, 0)
      .to(bloom,  { opacity: 1, duration: .56, ease: 'power1.inOut' }, .10)
      .to(bloom,  { scale: .556, duration: .16, ease: 'power1.in' }, .10)
      .to(bloom,  { scale: 1.965, duration: .30, ease: 'none' }, .26)
      .to(bloom,  { scale: 2.200, duration: .10, ease: 'power1.out' }, .56)
      /* засвет приходит в полную силу плавно и без удара */
      .to(flash,  { opacity: 1, duration: .14, ease: 'power1.inOut' }, .52)
      .to(stage,  { opacity: 0, duration: .08, ease: 'power1.inOut' }, .58)
      .to(flash,  { opacity: 1, duration: 0 }, 1);   // держим длительность шкалы равной 1
    /* Подъём первого экрана начинается ещё под светом и идёт ровным ходом всю
       видимую часть перехода, а тормозит только в самом конце: так движение
       не выдыхается к моменту, когда завеса сходит. */
    const hTxt = $('.hero__txt'), hPh = $('.hero__ph');
    const rise = (el, a1, a2, a3) => {
      tl.fromTo(el, { y: a1 }, { y: a2, duration: .12, ease: 'power1.in' }, .54)
        .to(el, { y: a3, duration: .16, ease: 'none' }, .66)
        .to(el, { y: 0,  duration: .18, ease: 'power1.out' }, .82);
    };
    if (hTxt) rise(hTxt, 86, 69, 25);
    if (hPh)  rise(hPh,  40, 32, 12);
    }

    let pos = 0, closed = false;
    function apply() {
      if (!SDA) {
        tl.progress(pos);
        /* белый не держим отдельным экраном: как только кадр залит, он сразу
           расходится и под ним проступает первый экран. Сход длиннее самого
           засвета — за это время первый экран успевает подняться на место. */
        if (pos <= .66) veil.style.opacity = '1';
        else { const t = Math.min(1, (pos - .66) / .24);
               veil.style.opacity = String(1 - t * t * (3 - 2 * t)); }   // та же S-образная кривая, что в стилях
      }
      const open = pos > .985;
      box.classList.toggle('is-moving', pos > .004);
      /* кадр залит белым — лампу и сияние снимаем с отрисовки совсем */
      box.classList.toggle('is-lit', pos > .16);
      box.classList.toggle('is-hot', pos > .46);
      box.classList.toggle('is-blank', pos > .66);
      html.classList.toggle('ready', open);
      /* Шапка лежит поверх кадра вступления и в переходе не участвовала:
         пока страница была ещё на четыре пятых белой, шапка уже стояла
         резкая и непрозрачная — два слоя в разных состояниях и читались
         как шов. Меняем её не на выходе, а в тот момент, когда кадр залит
         светом: на белом подмена фона не видна вовсе. */
      /* Шапка идёт вместе с завесой, а не переключается скачком: пока кадр
         ещё белый, она такая же прозрачная, и остановка прокрутки посреди
         перехода выглядит как переход, а не как сломанная страница.
         На основном пути фон ведёт та же дорожка, что и остальную сцену;
         здесь остаётся только класс с подсветкой текста и наведением. */
      if (hdrEl) {
        hdrEl.classList.toggle('hdr--ghost', pos < .90);
        if (!SDA) { const t = Math.min(1, Math.max(0, (pos - .66) / .24));
          hdrEl.style.backgroundColor = 'rgba(255,255,255,' + (.92 * t * t * (3 - 2 * t)).toFixed(3) + ')'; }
      }
      box.style.pointerEvents = open ? 'none' : '';
      if (open && !closed) {
        closed = true; track('intro_done');
        /* Вступление пройдено — экономный режим больше не нужен, и держать его
           дальше вредно. Пока он включён, каждая секция размечается ровно в тот
           момент, когда въезжает в кадр, и её содержимое появляется уже внутри
           экрана: браузер считает это сдвигом вёрстки. Замерено на обычной
           прокрутке — от 0,5 до 1,2 при пороге 0,1. Снимаем по две секции за
           кадр, на простое, чтобы не отнимать кадры у самого перехода. */
        const потом = window.requestIdleCallback || (f => setTimeout(f, 400));
        потом(() => { unlite(); lite(false); });
        if (!tall) setTimeout(() => { if (box.parentNode) box.remove(); }, 260);
      }
      if (!open) closed = false;
    }

    /* лампа ведёт за курсором. Размах — полная амплитуда от края до края
       экрана, то есть смещение вдвое меньше: 72 → ±36 по горизонтали.
       Меньшие значения на глаз неотличимы от неподвижной картинки. */
    if (finePointer && !reduced) {
      const qx = gsap.quickTo(par, 'x', { duration: .9, ease: 'power2.out' }),
            qy = gsap.quickTo(par, 'y', { duration: .9, ease: 'power2.out' });
      /* слушаем окно, а не само вступление: шапка лежит поверх кадра и
         перехватывала события — у верхней кромки экрана лампа замирала */
      addEventListener('pointermove', e => {
        if (closed || pos > .2) return;
        const k = Math.max(0, 1 - pos * 5);
        qx((e.clientX / innerWidth - .5) * 72 * k); qy((e.clientY / innerHeight - .5) * 44 * k);
      }, { passive: true });
      document.addEventListener('pointerleave', () => { qx(0); qy(0); });
    }

    if (tall) {                       /* обычная страница: шкалу ведёт скролл, назад тоже */
      box.classList.add('is-tall');

      /* Пришли по ссылке с якорем — например «Врач» из подвала другой
         страницы. Тогда экономный режим не включаем вовсе.

         Почему. В экономном режиме секции получают content-visibility:auto:
         браузер не размечает то, что за экраном, и считает их высоту по
         заглушке в 900 px. Прыжок к якорю он вычисляет по этим заглушкам, а
         потом секции размечаются по-настоящему, их высота меняется — и
         прокрутка остаётся не там. Замерено: промах от 200 до 2000 пикселей,
         то есть человек нажимал «Врач», а попадал на отзывы.

         Заодно после загрузки дважды поправляем положение: картинки и шрифты
         догружаются и могут сдвинуть разметку ещё раз. */
      const якорь = location.hash.length > 1 && document.querySelector(location.hash);
      if (!якорь) lite(true);
      else {
        const доводка = () => { const el = document.querySelector(location.hash);
          if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' }); };
        addEventListener('load', () => { доводка(); setTimeout(доводка, 350); });
      }
      let raf = 0, driving = false, LEN = 1;
      /* Единица шкалы — ровно то положение прокрутки, при котором первый экран
         встаёт по верху кадра. Иначе конец шкалы и конец вступления расходятся
         на высоту шапки, и любое движение вверх у первого экрана возвращало
         обратно к лампе. */
      /* Шапка липкая и лежит поверх содержимого, поэтому дорожка должна
         кончаться на её высоту раньше: иначе первая строка первого экрана
         оказывается ровно под шапкой и её не видно. */
      const heroTop = () => { const h = $('#hero'), pad = hdrEl ? hdrEl.offsetHeight : 0;
        return h ? Math.max(1, Math.round(h.getBoundingClientRect().top + scrollY) - pad)
                 : Math.max(1, box.offsetHeight - innerHeight - pad); };
      /* Длину дорожки считаем, не трогая прокрутку. Раньше здесь страница
         прыгала в ноль и обратно: scrollTo(0) → замер → scrollTo(назад).
         На телефоне это и было причиной рывков. Браузер на мобильном прячет
         и показывает адресную строку прямо во время прокрутки, от этого
         срабатывает resize, а resize дёргал этот замер — то есть палец ведёт
         страницу вниз, а скрипт в этот момент швыряет её в начало и возвращает.
         Замер в прокрутке не нуждается: getBoundingClientRect().top + scrollY
         даёт положение в документе, одинаковое при любой прокрутке. */
      const measure = () => { LEN = heroTop();
        html.style.setProperty('--intro-len', LEN + 'px'); };   // одна запись, не на кадр
      const at = y => { pos = Math.min(1, Math.max(0, y / LEN)); apply(); };
      /* Инерция: как только прокрутка замерла посреди вступления, доводим её
         сами — вниз до первого экрана, вверх обратно к лампе. Зависнуть на
         белом кадре нельзя. */
      let ride = null;
      function stopRide() { if (ride) { ride.kill(); ride = null; } driving = false; }
      const rest = () => {};
      /* В прокрутку мы не вмешиваемся вовсе. Раньше, если человек
         останавливался во второй половине вступления, скрипт перехватывал
         прокрутку и сам дотягивал страницу до первого экрана. Срабатывало
         это не всегда — зависело от того, как посчиталось направление
         движения, — и непредсказуемость читалась как сбой сильнее, чем
         любой стык. Теперь кадр идёт ровно за пальцем и колесом в обе
         стороны, а довести сценарий одним движением можно нажатием на
         лампу или на «Прокрутите вниз». */
      const fromScroll = () => { raf = 0; if (driving) return; at(scrollY); };
      addEventListener('scroll', () => { if (!raf && !driving) raf = requestAnimationFrame(fromScroll); }, { passive: true });
      /* На телефоне resize — это чаще всего не поворот экрана, а спрятавшаяся
         адресная строка: ширина та же, высота скакнула на 60–120 px, и так
         десятки раз за одну прокрутку. Пересчитывать дорожку на каждый такой
         скачок значит менять шкалу под пальцем — кадр дёргается. Высота кадра
         задана в svh, то есть от неподвижной части экрана, и от адресной
         строки не зависит вовсе; значит и пересчитывать нечего.
         Реагируем только на настоящее изменение: другая ширина или скачок
         высоты больше четверти экрана (поворот, разделённый экран). */
      onRealResize(() => { measure(); at(scrollY); }, 120);
      /* палец на вступлении отменяет начатую по нажатию проводку */
      box.addEventListener('touchstart', stopRide, { passive: true });
      scrollTo(0, 0); measure(); at(0);
      /* Прокрутку по нажатию ведём сами: ставим положение и тут же перерисовываем
         в том же кадре. Иначе событие scroll разбирается через кадр и картина
         отстаёт от позиции — это и читается как рывки. */
      /* Одно нажатие проводит весь путь: лампа, засвет и дальше прямо к первому
         экрану — без остановки на промежуточном кадре. */
      /* Нажали — сперва только свет: лампа разгорается, надписи уходят,
         размер кадра не меняется. И лишь потом, отдельной дугой, наезд.
         Точка LIGHT — место шкалы, где свет уже полный, а наезда ещё нет. */
      /* Нажатие ведёт одной дугой от текущего места до первого экрана.
         Ни задержки перед стартом, ни остановки на «свет уже полный»:
         человек нажал — кадр трогается в том же кадре отрисовки. */
      const run = () => {
        const end = LEN;
        if (end - scrollY < 8) return;
        sfx.play('lamp');          // свет включают — звук у этого действия тёплый и низкий
        stopRide(); driving = true;
        const frac = (end - scrollY) / LEN;
        ride = gsap.to({ y: scrollY }, { y: end, duration: Math.max(1.1, 2.6 * frac),
          ease: 'power1.inOut', overwrite: true,
          onUpdate() { const y = this.targets()[0].y; scrollTo({ top: y, behavior: 'instant' }); at(y); },
          onComplete() { ride = null; driving = false; at(scrollY); rest(); },
          onInterrupt() { ride = null; driving = false; rest(); } });
      };
      btn.addEventListener('click', run);
      $$('.intro__go', box).forEach(el => el.addEventListener('click', run));
      addEventListener('keydown', e => {
        if (closed || !['Enter', ' ', 'Spacebar'].includes(e.key)) return;
        if (document.activeElement && /^(A|BUTTON|INPUT|SUMMARY)$/.test(document.activeElement.tagName)
            && document.activeElement !== btn) return;
        e.preventDefault(); run();
      });
      return;
    }

    /* документ не прокручивается сам (артефакт в iframe по высоте контента) */
    const BUDGET = 2700;   // столько же «пути», сколько на обычной странице
    const step = dy => { pos = Math.min(1, Math.max(0, pos + dy / BUDGET)); apply(); };
    box.addEventListener('wheel', e => { if (closed) return; if (e.deltaY > 0 && pos < 1) e.preventDefault(); step(e.deltaY); }, { passive: false });
    let ty = null;
    box.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
    box.addEventListener('touchmove', e => { if (closed) return; const y = e.touches[0].clientY;
      if (ty != null) { if (ty > y && pos < 1) e.preventDefault(); step((ty - y) * 1.6); } ty = y; }, { passive: false });
    const run = () => {
      if (pos > .98) return;
      pos = Math.max(pos, .18); apply();          // свет сразу, наезд следом
      gsap.to({ v: pos }, { v: 1, duration: 3.2, delay: .16, ease: 'power1.inOut', overwrite: true,
        onUpdate() { pos = this.targets()[0].v; apply(); },
        onComplete() { const h = $('#hero'); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }); };
    addEventListener('keydown', e => { if (closed) return;
      if (['Enter', ' ', 'Spacebar'].includes(e.key)) { e.preventDefault(); run(); return; }
      if (['ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); step(600); }
      if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); step(-600); } });
    btn.addEventListener('click', run);
    $$('.intro__go', box).forEach(el => el.addEventListener('click', run));
    apply();
  })();

  /* ---------- крошки (общий помощник) ---------- */
  function makeParticles(canvas, stageEl) {
    const ctx = canvas.getContext('2d'); let parts = [], raf = 0;
    const size = () => { const r = stageEl.getBoundingClientRect(); canvas.width = Math.round(r.width * 1.2 * dpr); canvas.height = Math.round(r.height * dpr); };
    size(); onRealResize(size, 180);
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts = parts.filter(p => p.life > 0);
      for (const p of parts) { p.vy += .32 * dpr; p.x += p.vx; p.y += p.vy; p.life -= .022; p.rot += .1;
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .8); ctx.restore(); }
      raf = parts.length ? requestAnimationFrame(tick) : 0;
    }
    const GREY = ['#C7C3BC', '#B5B1AA', '#D9D6CF', '#A9A5A0'];
    return (pt, n, burst, palette) => {
      if (!canvas.width) size();                 // секция могла быть не размечена при загрузке
      const gr = canvas.getBoundingClientRect(), pal = palette || GREY;
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = burst ? 2 + Math.random() * 5 : 1 + Math.random() * 2.6;
        parts.push({ x: (pt.x - gr.left) * dpr, y: (pt.y - gr.top) * dpr, vx: Math.cos(a) * sp * dpr, vy: (-Math.abs(Math.sin(a)) * sp - 1) * dpr, s: (1.5 + Math.random() * 3) * dpr, life: 1, c: pal[Math.random() * pal.length | 0], rot: Math.random() * 6 }); }
      if (!raf) raf = requestAnimationFrame(tick);
    };
  }

  /* ---------- КАМЕНЬ: стирается и медленно нарастает обратно ---------- */
  (function stoneGame() {
    const offer = $('.offer'), slab = $('#slab'), stone = $('#stone'), stage = $('#stage'), hp = $('#hp'), hint = $('#drill-hint');
    const c = stone.getContext('2d'); const spawn = makeParticles($('#crumbs'), stage);
    const tex = document.createElement('canvas'); const tc = tex.getContext('2d');
    let open = false, ops = 0, last = null, idle = 0, visible = false;

    function paintTexture(W, H) {
      tex.width = W; tex.height = H;
      const g = tc.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#E2DED7'); g.addColorStop(1, '#CFCAC2'); tc.fillStyle = g; tc.fillRect(0, 0, W, H);
      for (let i = 0; i < W * H / 260; i++) { const x = Math.random() * W, y = Math.random() * H, s = Math.random() * 2.2 * dpr + .6; tc.fillStyle = Math.random() < .5 ? `rgba(120,116,110,${Math.random() * .12})` : `rgba(255,255,255,${Math.random() * .35})`; tc.fillRect(x, y, s, s); }
      tc.lineCap = 'round';
      for (let i = 0; i < 7; i++) { tc.strokeStyle = `rgba(95,92,88,${.05 + Math.random() * .07})`; tc.lineWidth = (1 + Math.random() * 4) * dpr; tc.beginPath(); let x = Math.random() * W, y = Math.random() * H; tc.moveTo(x, y);
        for (let k = 0; k < 4; k++) { const nx = x + (Math.random() - .5) * W * .6, ny = y + (Math.random() - .5) * H * .6; tc.quadraticCurveTo(x + (Math.random() - .5) * 200, y + (Math.random() - .5) * 200, nx, ny); x = nx; y = ny; } tc.stroke(); }
      for (let i = 0; i < 18; i++) { const x = Math.random() * W, y = Math.random() * H, rad = (20 + Math.random() * 90) * dpr; const rg = tc.createRadialGradient(x, y, 0, x, y, rad); rg.addColorStop(0, `rgba(110,106,100,${Math.random() * .08})`); rg.addColorStop(1, 'rgba(110,106,100,0)'); tc.fillStyle = rg; tc.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
      let eg = tc.createLinearGradient(0, H - 10 * dpr, 0, H); eg.addColorStop(0, 'rgba(70,66,60,0)'); eg.addColorStop(1, 'rgba(70,66,60,.35)'); tc.fillStyle = eg; tc.fillRect(0, H - 10 * dpr, W, 10 * dpr);
      eg = tc.createLinearGradient(W - 7 * dpr, 0, W, 0); eg.addColorStop(0, 'rgba(70,66,60,0)'); eg.addColorStop(1, 'rgba(70,66,60,.28)'); tc.fillStyle = eg; tc.fillRect(W - 7 * dpr, 0, 7 * dpr, H);
      eg = tc.createLinearGradient(0, 0, 0, 6 * dpr); eg.addColorStop(0, 'rgba(255,255,255,.55)'); eg.addColorStop(1, 'rgba(255,255,255,0)'); tc.fillStyle = eg; tc.fillRect(0, 0, W, 6 * dpr);
    }
    const pct = document.getElementById('drill-pct');
    function setDrill(r) { if (!pct) return; const v = Math.round(Math.min(1, r / .62) * 100); pct.textContent = v > 2 ? v + ' %' : ''; }
    function reset() {
      setDrill(0);
      const r = slab.getBoundingClientRect(); const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
      if (!W || !H) return;
      stone.width = W; stone.height = H; paintTexture(W, H);
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, W, H); c.drawImage(tex, 0, 0);
      ops = 0; last = null;
    }
    reset();
    onRealResize(() => { if (!open) reset(); }, 200);

    /* камень зарастает, пока его не трогают */
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting;
      if (visible && !stone.width) reset();      // размеры появились только сейчас
    }), { threshold: .15 }).observe(stage);
    setInterval(() => {
      if (open || !visible || idle < 12) { idle++; return; }   // ~2,6 с покоя — и камень медленно нарастает
      c.globalCompositeOperation = 'destination-over'; c.globalAlpha = .015; c.drawImage(tex, 0, 0);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }, 220);

    function erase(x, y, rad) {
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.globalAlpha = 1; c.beginPath();
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, rr = rad * (.7 + Math.random() * .5); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      c.closePath(); c.fill(); c.globalCompositeOperation = 'source-over';
    }
    function ratio() { const W = stone.width, H = stone.height, step = 14 * dpr | 0, d = c.getImageData(0, 0, W, H).data; let n = 0, e = 0; for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) { n++; if (d[(y * W + x) * 4 + 3] < 40) e++; } return e / n; }
    function scrub(px, py, radCss) {
      if (open) return false;
      const sr = stone.getBoundingClientRect(); if (!(px > sr.left && px < sr.right && py > sr.top && py < sr.bottom)) { last = null; return false; }
      idle = 0; stone.classList.remove('pulse'); hint.classList.add('is-touched');
      sfx.play('scrape');         // шорох по камню, с ограничителем частоты
      const cx = (px - sr.left) * dpr, cy = (py - sr.top) * dpr, rad = radCss * dpr;
      if (last) { const dx = cx - last.x, dy = cy - last.y, n = Math.max(1, Math.round(Math.hypot(dx, dy) / (rad * .35))); for (let i = 1; i <= n; i++) erase(last.x + dx * i / n, last.y + dy * i / n, rad); } else erase(cx, cy, rad);
      last = { x: cx, y: cy }; spawn({ x: px, y: py }, 4);
      if (++ops % 6 === 0) { const r = ratio(); setDrill(r); if (r > .62) openOffer('scrub'); }
      return true;
    }
    let scrubbing = false;
    stone.addEventListener('pointerdown', e => { scrubbing = true; last = null; stone.setPointerCapture(e.pointerId); scrub(e.clientX, e.clientY, e.pointerType === 'touch' ? 46 : 36); });
    stone.addEventListener('pointermove', e => { if (scrubbing) scrub(e.clientX, e.clientY, e.pointerType === 'touch' ? 46 : 36); });
    ['pointerup', 'pointercancel'].forEach(ev => stone.addEventListener(ev, () => { scrubbing = false; last = null; }));

    if (hp && finePointer) {
      gsap.set(hp, { y: -50, opacity: 0 });
      const o = new IntersectionObserver(es => { es.forEach(e => { if (!e.isIntersecting) return; o.disconnect();
        gsap.to(hp, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', onComplete: () => hp.classList.add('wiggle') }); }); }, { threshold: .2 });
      o.observe(hp);
      Draggable.create(hp, { type: 'x,y', zIndexBoost: false, minimumMovement: 3,
        onPress() { gsap.killTweensOf(hp); hp.classList.add('is-drag'); hp.classList.remove('wiggle'); last = null; sfx.play('pick'); },
        onRelease() { hp.classList.remove('is-drag', 'is-drill'); last = null; },
        onDrag() { const r = hp.getBoundingClientRect(); hp.classList.toggle('is-drill', !!scrub(r.left + r.width * .998, r.top + r.height * .117, 38)); } });
    }
    function openOffer(how) {
      if (open) return; open = true; offer.classList.add('is-open'); if (hp) hp.classList.remove('is-drill');
      sfx.play('reveal');         // из-под камня показалось предложение
      const sr = stone.getBoundingClientRect(); for (let i = 0; i < 6; i++) spawn({ x: sr.left + Math.random() * sr.width, y: sr.top + Math.random() * sr.height }, 10, true);
      gsap.to(stone, { opacity: 0, duration: .8, ease: 'power2.out', onComplete: () => { stone.style.pointerEvents = 'none'; } });
      /* Наконечник свою работу сделал. Дальше он просто лежит поверх карточки
         и накрывает строку с ценами по прейскуранту — мелкий текст под
         железкой не прочитать. Убираем его вместе с камнем.
         Через стиль это не сделать: перетаскиванием управляет GSAP, и он
         держит прозрачность во встроенном стиле, который сильнее любого
         правила из таблицы. Поэтому гасим тем же GSAP. */
      if (hp) gsap.to(hp, { opacity: 0, duration: .7, ease: 'power2.out',
        onComplete: () => { hp.style.pointerEvents = 'none'; } });
      gsap.fromTo('.slab__offer', { scale: .985 }, { scale: 1, duration: .9, ease: 'power2.out' });
      track('offer_open', { how });
      // когда секция ушла с экрана — камень нарастает заново, можно просверлить ещё раз
      setTimeout(() => {
        const back = new IntersectionObserver(es => es.forEach(e => {
          if (e.isIntersecting || !open) return;
          back.disconnect(); open = false; offer.classList.remove('is-open');
          stone.style.pointerEvents = ''; reset(); gsap.set(stone, { opacity: 1 }); stone.classList.add('pulse'); hint.classList.remove('is-touched');
          /* камень нарос заново — значит и инструмент нужен снова */
          if (hp) { hp.style.pointerEvents = ''; gsap.to(hp, { opacity: 1, duration: .5 }); }
        }), { threshold: 0 });
        back.observe(stage);
      }, 4000);
    }
    $('#drill-skip').addEventListener('click', () => { sfx.play('tap'); openOffer('button'); });
  })();

  /* ---------- РЕСТАВРАЦИЯ: четыре этапа ----------
     1 — травление эмали: гель ложится только по краю дефекта;
     2 — промывание водой из пистолета «вода‑воздух»;
     3 — послойная укладка композита: заполнить дефект целиком;
     4 — полимеризация: свет копится, пока лампу держат у зуба.
     Если к моменту засветки заполнено меньше 90 %, композит рассыпается
     и раунд начинается заново — так же, как недолговечная пломба в жизни. */
  (function fillGame() {
    const fill = $('.fill'), box = $('#tooth-box'), bad = $('#th-bad'), okImg = $('#th-ok'), shine = $('#shine'),
          etchC = $('#etch'), paintC = $('#paint'), wet = $('#wet'),
          arena = $('#fill-arena'), stageEl = $('#fill-stage'), rack = $('#rack'),
          bar = $('#cure-bar'), barFill = $('#cure-bar i'),
          say = $('#fill-say'), score = $('#fill-score'), again = $('#fill-again');
    if (!box) return;

    
    const TOOLS = [
      { k: 1, el: $('#t-etch'),  tip: [.03, .94] },
      { k: 2, el: $('#t-rinse'), tip: [.03, .96] },
      { k: 3, el: $('#t-comp'),  tip: [.02, .97] },
      { k: 4, el: $('#t-uv'),    tip: [.03, .98] },
      { k: 5, el: $('#t-pol'),   tip: [.02, .67] }
    ];
    const ec = etchC.getContext('2d', { willReadFrequently: true });
    const pc = paintC.getContext('2d', { willReadFrequently: true });

    /* сколько нужно покрыть, чтобы этап засчитался; дальше доводим сами */
    const GOAL = .80;
    const touchOnly = !finePointer;   // на телефоне инструменты не таскаем — работает палец
    let stage = 1, W = 0, H = 0, done = 0, seen = 0, last = null, ops = 0, busy = false;
    let ptsEdge = [], ptsFull = [], imgEdge = null, imgFull = null;
    const bits = makeParticles($('#bits'), stageEl);
    const PINK = ['#EFA0C6', '#E981BA', '#F7B9D8', '#D96FA8'];

    /* ---- размеры и маски ---- */
    /* Пока секция не размечена, размеры неизвестны. Поэтому маски помечаем
       готовыми только после загрузки, а ожидающих будим списком — иначе повторный
       вызов срабатывает раньше времени и точки замера остаются пустыми. */
    let masksReady = false, masksWait = [];
    function loadMasks(cb) {
      if (masksReady) { cb && cb(); return; }
      if (cb) masksWait.push(cb);
      if (imgFull) return;                       // уже грузим
      let n = 0; const ok = () => { if (++n === 2) { masksReady = true;
        const q = masksWait; masksWait = []; q.forEach(f => f()); } };
      imgEdge = new Image(); imgEdge.crossOrigin = 'anonymous'; imgEdge.onload = ok; imgEdge.onerror = ok;
      imgFull = new Image(); imgFull.crossOrigin = 'anonymous'; imgFull.onload = ok; imgFull.onerror = ok;
      imgEdge.src = asset('assets/cut/tooth-edge.webp');
      imgFull.src = asset('assets/cut/tooth-mask.webp');
      const me = `url("${imgEdge.src}") center/100% 100% no-repeat`, mf = `url("${imgFull.src}") center/100% 100% no-repeat`;
      etchC.style.webkitMask = etchC.style.mask = me;
      paintC.style.webkitMask = paintC.style.mask = mf;
      if (shine) { const ms = `url("${asset('assets/cut/tooth-ok.webp')}") center/100% 100% no-repeat`;
        shine.style.webkitMask = shine.style.mask = ms; }
    }
    function sizeCanvases() {
      const r = box.getBoundingClientRect(); if (!r.width) return;
      W = Math.round(r.width * dpr); H = Math.round(r.height * dpr);
      [etchC, paintC].forEach(c => { c.width = W; c.height = H; });
      ec.setTransform(1, 0, 0, 1, 0, 0); pc.setTransform(1, 0, 0, 1, 0, 0);
      samplePts();
    }
    function samplePoints(img) {
      if (!img || !img.complete || !img.naturalWidth || !W) return [];
      const off = document.createElement('canvas'); off.width = W; off.height = H;
      const oc = off.getContext('2d', { willReadFrequently: true }); oc.drawImage(img, 0, 0, W, H);
      let d; try { d = oc.getImageData(0, 0, W, H).data; } catch (e) { return []; }
      const step = Math.max(3, Math.round(5 * dpr)), out = [];
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (d[(y * W + x) * 4 + 3] > 150) out.push([x, y]);
      return out;
    }
    function samplePts() { ptsEdge = samplePoints(imgEdge); ptsFull = samplePoints(imgFull); }
    function cover(ctx, pts, thr) {
      if (!pts.length) return 0;
      let d; try { d = ctx.getImageData(0, 0, W, H).data; } catch (e) { return 0; }
      let n = 0; for (const [x, y] of pts) if (d[(y * W + x) * 4 + 3] > (thr || 25)) n++;
      return n / pts.length;
    }

    /* ---- рисование ---- */
    function toCanvas(px, py) {
      const r = box.getBoundingClientRect();
      if (!(px > r.left - 60 && px < r.right + 60 && py > r.top - 60 && py < r.bottom + 60)) return null;
      return { x: (px - r.left) / r.width * W, y: (py - r.top) / r.height * H, w: r.width };
    }
    function stroke(ctx, p, radCss, color, erase) {
      const rad = radCss / p.w * W;
      ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
      ctx.fillStyle = ctx.strokeStyle = color; ctx.lineCap = ctx.lineJoin = 'round';
      if (last) { ctx.lineWidth = rad * 2; ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      last = { x: p.x, y: p.y };
    }
    function work(px, py, radCss) {
      if (busy) return false;
      const p = toCanvas(px, py); if (!p) { last = null; return false; }
      if (stage === 1) { stroke(ec, p, radCss * 1.35, '#3FC3DC'); if (++ops % 4 === 0) readout(); return true; }
      if (stage === 2) { stroke(ec, p, radCss * 1.8, '#000', true); wet.classList.add('is-on');
        if (++ops % 4 === 0) readout(); return true; }
      if (stage === 3) { stroke(pc, p, radCss * 1.1, '#EFA0C6'); if (++ops % 4 === 0) readout(); return true; }
      return false;
    }
    /* показываем прогресс, но НИКОГДА не переключаем этап во время мазка */
    function readout() {
      if (stage === 1) say.textContent = 'Подготовка: ' + pc100(cover(ec, ptsEdge) / GOAL) + ' %';
      else if (stage === 2) say.textContent = 'Промывание: ' + pc100((1 - cover(ec, ptsEdge)) / GOAL) + ' %';
      else if (stage === 3) { const v = cover(pc, ptsFull) / GOAL;
        say.textContent = 'Заполнено ' + pc100(v) + ' %' + (v >= 1 ? ' — теперь лампа' : ''); }
    }
    const pc100 = v => Math.round(Math.max(0, Math.min(1, v)) * 100);

    /* Дозаполнение: как только пройдено 80 %, остаток доводим сами — ровно и
       без выискивания последних пикселей. Кадр за кадром возвращаем снимок
       холста и поверх кладём заливку с растущей прозрачностью, поэтому переход
       идёт плавно и не зависит от частоты кадров. */
    function flood(ctx, color, erase, cb) {
      if (!W) { cb && cb(); return; }
      busy = true; last = null;
      const snap = document.createElement('canvas'); snap.width = W; snap.height = H;
      snap.getContext('2d').drawImage(ctx.canvas, 0, 0);
      gsap.to({ v: 0 }, { v: 1, duration: .5, ease: 'power2.inOut',
        onUpdate() {
          const v = this.targets()[0].v;
          ctx.clearRect(0, 0, W, H); ctx.drawImage(snap, 0, 0);
          ctx.save();
          ctx.globalAlpha = v; ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
          ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
          ctx.restore();
        },
        onComplete() {
          ctx.clearRect(0, 0, W, H);
          if (!erase) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); }
          busy = false; cb && cb();
        } });
    }
    /* переключаем этап только когда инструмент отпущен */
    function finishStroke() {
      if (busy) return;
      if (stage === 1 && cover(ec, ptsEdge) >= GOAL) {
        say.textContent = 'Край пройден — гель ложится ровным слоем.';
        flood(ec, '#3FC3DC', false, () => setStage(2));
      } else if (stage === 2 && cover(ec, ptsEdge) <= 1 - GOAL) {
        say.textContent = 'Гель смывается начисто.';
        flood(ec, '#000', true, () => setStage(3));
      } else if (stage === 3 && cover(pc, ptsFull) >= GOAL) {
        say.textContent = 'Дефект закрыт — композит расходится до краёв.';
        flood(pc, '#EFA0C6', false, () => setStage(4));
      } else readout();
    }

    /* ---- этапы ---- */
    const TXT = touchOnly ? {
      1: 'Этап 1. Подготовка: проведите пальцем по краю дефекта.',
      2: 'Этап 2. Промывание: проведите пальцем ещё раз — гель смоется.',
      3: 'Этап 3. Композит: закрывайте дефект — с 80 % материал разойдётся до краёв сам.',
      4: 'Этап 4. Свет: приложите палец к зубу и держите, пока полоса не заполнится.',
      5: 'Этап 5. Полировка: держите палец на зубе — реставрация заблестит.'
    } : {
      1: 'Этап 1. Подготовка: синим шприцом пройдите по краю дефекта.',
      2: 'Этап 2. Промывание: смойте гель водой из пистолета.',
      3: 'Этап 3. Композит: закрывайте дефект — с 80 % материал разойдётся до краёв сам.',
      4: 'Этап 4. Свет: поднесите лампу к зубу и держите, пока полоса не заполнится.',
      5: 'Этап 5. Полировка: пройдите щёткой по зубу — реставрация заблестит.'
    };
    /* лампу можно взять уже на укладке — если композита мало, реставрация сорвётся */
    const canUse = t => t.k === stage || (t.k === 4 && stage === 3);
    function setStage(k) {
      if (k > 1) sfx.play('place');   // этап пройден, следующий инструмент на очереди
      const prev = stage;
      stage = k; ops = 0; last = null;
      if (k === 3 && prev === 2) { ec.clearRect(0, 0, W, H); wet.classList.add('is-on'); }  // гель смыт начисто
      TOOLS.forEach(t => { t.el.classList.toggle('is-off', !canUse(t)); t.el.classList.toggle('wiggle', t.k === k && !reduced); });
      say.textContent = TXT[k] || '';
      fill.classList.toggle('is-ready', k === 4);
    }
    function updScore() {
      score.textContent = done ? 'Зуб восстановлен и отполирован' + (seen > done ? ' · попыток: ' + seen : '')
                               : (seen ? 'Попыток: ' + seen : '');
    }

    /* ---- раунд ---- */
    function reset() {
      busy = false; lamp = null;
      gsap.set([etchC, paintC, bad], { opacity: 1, filter: 'none' });
      gsap.set(okImg, { opacity: 0, filter: 'none' });
      if (shine) gsap.set(shine, { opacity: 0 });
      $$('.spark', box).forEach(el => el.remove());
      cancelAnimationFrame(raf); raf = 0; exposure = 0; barFill.style.width = '0%';
      fill.classList.remove('is-done', 'is-curing', 'is-arming', 'is-fail', 'is-polishing');
      wet.classList.remove('is-on');
      loadMasks(() => { sizeCanvases(); ec.clearRect(0, 0, W, H); pc.clearRect(0, 0, W, H); });
      if (W) { ec.clearRect(0, 0, W, H); pc.clearRect(0, 0, W, H); }
      TOOLS.forEach(t => gsap.set(t.el, { x: 0, y: 0 }));
      setStage(1); updScore();
    }
    again.addEventListener('click', () => { sfx.play('tap'); track('fill_again'); reset(); });

    /* ---- провал: композит рассыпается и растворяется ---- */
    function crumble() {
      busy = true; fill.classList.add('is-fail');
      cancelAnimationFrame(raf); raf = 0; exposure = 0; barFill.style.width = '0%';
      fill.classList.remove('is-curing', 'is-arming'); TOOLS[3].el.classList.remove('is-lit');
      const r = box.getBoundingClientRect();
      for (let i = 0; i < 24; i++) bits({ x: r.left + r.width * (.2 + Math.random() * .6), y: r.top + r.height * (.45 + Math.random() * .45) }, 5, true, PINK);
      say.textContent = 'Композит уложен не до конца — реставрация не выдержала.';
      gsap.to(paintC, { opacity: 0, duration: 1.2, ease: 'power1.in', onComplete() {
        pc.clearRect(0, 0, W, H); ec.clearRect(0, 0, W, H); gsap.set([paintC, etchC], { opacity: 1, filter: 'none' });
        TOOLS.forEach(t => gsap.set(t.el, { x: 0, y: 0 }));
        seen++; updScore(); busy = false; setStage(1);
        say.textContent = 'Так и в жизни: пройдёте этапы небрежно — пломба окажется недолговечной. Раунд заново, этап 1.';
      } });
      track('fill_fail');
    }

    /* ---- полимеризация ---- */
    const NEED = 1500; let exposure = 0, tPrev = 0, raf = 0, lamp = null, full = false;
    function tipNear(t) {
      const r = t.el.getBoundingClientRect(), b = box.getBoundingClientRect();
      const x = r.left + r.width * t.tip[0], y = r.top + r.height * t.tip[1];
      const pad = b.width * .52;
      return x > b.left - pad && x < b.right + pad && y > b.top - pad && y < b.bottom + pad;
    }
    function loop(t) {
      const dt = tPrev ? t - tPrev : 16; tPrev = t;
      const near = !!(lamp && !busy && (stage === 3 || stage === 4) && (held || tipNear(lamp)));
      TOOLS[3].el.classList.toggle('is-lit', near);
      fill.classList.toggle('is-curing', near);
      if (near) exposure = Math.min(NEED, exposure + dt); else exposure = Math.max(0, exposure - dt * .5);
      barFill.style.width = (exposure / NEED * 100) + '%';
      if (exposure >= NEED) { finishCure(); return; }
      raf = requestAnimationFrame(loop);
    }
    function startCure(byHand) {
      if (raf || busy) return;
      if (cover(pc, ptsFull) < GOAL) { crumble(); return; }   // меньше 80 % — реставрация срывается
      tPrev = 0; fill.classList.add('is-arming'); raf = requestAnimationFrame(loop);
    }
    function stopCure() {
      cancelAnimationFrame(raf); raf = 0;
      TOOLS[3].el.classList.remove('is-lit'); fill.classList.remove('is-curing');
      gsap.to({ v: exposure }, { v: 0, duration: .6, onUpdate() { exposure = this.targets()[0].v; barFill.style.width = (exposure / NEED * 100) + '%'; },
        onComplete() { fill.classList.remove('is-arming'); } });
    }
    function finishCure() {
      cancelAnimationFrame(raf); raf = 0; lamp = null;
      full = cover(pc, ptsFull) > .95;
      fill.classList.remove('is-curing', 'is-arming');
      fill.classList.add('is-done'); TOOLS[3].el.classList.remove('is-lit', 'wiggle');
      /* зуб становится здоровым: свет размывает границы и проявляет целую коронку */
      gsap.to([etchC, paintC], { opacity: 0, filter: 'blur(9px)', duration: 1.1, ease: 'power2.inOut' });
      gsap.to(bad, { opacity: 0, filter: 'blur(7px)', duration: 1.2, ease: 'power2.inOut' });
      gsap.fromTo(okImg, { opacity: 0, filter: 'blur(12px)' },
        { opacity: 1, filter: 'blur(0px)', duration: 1.3, ease: 'power2.out', delay: .15 });
      gsap.to(TOOLS[3].el, { x: 0, y: 0, duration: .5 });
      /* Снимаем размытие, когда оно отработало. Значение filter остаётся на
         элементе и после анимации, а каждый такой элемент браузер держит
         отдельным слоем — лишние слои на сцене ни к чему. */
      setTimeout(() => gsap.set([etchC, paintC, bad], { filter: 'none' }), 1400);
      setTimeout(() => setStage(5), 900);            // остаётся отполировать
      track('cure_done', { full: full });
    }

    /* ---- полировка: щётка ходит по зубу, полоса набирается ---- */
    const POL = 1300; let polish = 0, pPrev = 0, praf = 0, brush = null;
    function polLoop(t) {
      const dt = pPrev ? t - pPrev : 16; pPrev = t;
      const near = !!(brush && !busy && stage === 5 && (held || tipNear(brush)));
      fill.classList.toggle('is-polishing', near);
      if (near) polish = Math.min(POL, polish + dt); else polish = Math.max(0, polish - dt * .5);
      barFill.style.width = (polish / POL * 100) + '%';
      if (polish >= POL) { finishPolish(); return; }
      praf = requestAnimationFrame(polLoop);
    }
    function startPolish(byHand) { if (praf || busy) return;
      pPrev = 0; fill.classList.add('is-arming'); praf = requestAnimationFrame(polLoop); }
    function stopPolish() {
      cancelAnimationFrame(praf); praf = 0; fill.classList.remove('is-polishing');
      gsap.to({ v: polish }, { v: 0, duration: .6, onUpdate() { polish = this.targets()[0].v; barFill.style.width = (polish / POL * 100) + '%'; },
        onComplete() { fill.classList.remove('is-arming'); } });
    }
    function finishPolish() {
      cancelAnimationFrame(praf); praf = 0; busy = true; brush = null;
      fill.classList.remove('is-polishing', 'is-arming');
      TOOLS.forEach(t => { t.el.classList.add('is-off'); t.el.classList.remove('wiggle'); gsap.to(t.el, { x: 0, y: 0, duration: .5 }); });
      done++; seen++; updScore();
      say.textContent = full
        ? 'Готово. Дефект закрыт полностью, край отполирован — такая реставрация служит десять лет и дольше.'
        : 'Готово, но композит лёг не до конца: край такой пломбы изнашивается быстрее. В клинике это решает послойная укладка.';
      const promo = $('#promo');
      if (promo && promo.hidden) { promo.hidden = false; gsap.from(promo, { y: 12, opacity: 0, duration: .7, ease: 'power2.out' }); }
      gleam();
      track('polish_done');
    }

    /* ---- блеск на вылеченном зубе: блик проходит по коронке, вспыхивают искры ---- */
    const SPARK = '<svg class="spark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c.7 6.6 4.7 10.6 12 12-7.3 1.4-11.3 5.4-12 12-.7-6.6-4.7-10.6-12-12C7.3 10.6 11.3 6.6 12 0z"/></svg>';
    function gleam() {
      if (!shine) return;
      gsap.set(shine, { opacity: 1 });
      gsap.fromTo(shine.firstElementChild || shine, { xPercent: 0 }, { xPercent: 0, duration: 0 });
      gsap.fromTo(shine, { '--sx': '-60%' }, { '--sx': '150%', duration: 1.5, ease: 'power2.inOut' });
      $$('.spark', box).forEach(el => el.remove());
      [[34, 26], [62, 44], [46, 68], [72, 22]].forEach(([x, y], i) => {
        box.insertAdjacentHTML('beforeend', SPARK);
        const el = box.lastElementChild;
        el.style.left = x + '%'; el.style.top = y + '%';
        el.style.width = (8 + Math.random() * 8) + 'px';
        gsap.fromTo(el, { scale: 0, opacity: 0, rotate: -25 },
          { scale: 1, opacity: 1, rotate: 0, duration: .5, ease: 'back.out(2)', delay: .5 + i * .18,
            onComplete() { gsap.to(el, { opacity: .18, scale: .65, duration: 1.3, ease: 'sine.inOut',
              yoyo: true, repeat: -1, repeatDelay: 1.6 + Math.random() * 2.4 }); } });
      });
    }

    /* ---- инструменты: перетаскиваем только мышью ---- */
    if (!touchOnly) TOOLS.forEach(t => {
      Draggable.create(t.el, { type: 'x,y', zIndexBoost: false, minimumMovement: 2,
        onPress() {
          if (!canUse(t) || busy) { this.endDrag(); sfx.play('nope'); return; }
          gsap.killTweensOf(t.el);
          sfx.play('pick');                               // инструмент взяли
          t.el.classList.add('is-drag'); t.el.classList.remove('wiggle'); last = null;
          if (t.k === 4) { lamp = t; startCure(); }
          if (t.k === 5) { brush = t; startPolish(); }
        },
        onRelease() {
          t.el.classList.remove('is-drag'); last = null;
          if (t.k === 4) { lamp = null; if (!busy) stopCure(); }
          else if (t.k === 5) { brush = null; if (!busy) stopPolish(); }
          else finishStroke();
          gsap.to(t.el, { x: 0, y: 0, duration: .5, ease: 'power2.out' });
        },
        onDrag() {
          if (t.k >= 4) return;
          const r = t.el.getBoundingClientRect();
          work(r.left + r.width * t.tip[0], r.top + r.height * t.tip[1], 46);
        } });
    });

    /* ---- палец или курсор прямо по зубу ----
       На телефоне это единственный способ работы: инструменты не перетаскиваем,
       палец сам делает то, что нужно на текущем этапе — мажет на первых трёх,
       держит свет и полировку на последних двух. */
    let on = false, held = 0;
    const radFor = e => e.pointerType === 'touch' ? 64 : 48;
    box.addEventListener('pointerdown', e => {
      if (busy) return;
      if (stage >= 4) {                       // свет и полировка: держим палец на зубе
        if (!touchOnly && e.pointerType !== 'touch') return;
        held = e.pointerId; box.setPointerCapture(e.pointerId);
        if (stage === 4) { lamp = TOOLS[3]; gsap.set(TOOLS[3].el, { x: 0, y: 0 }); startCure(true); }
        else { brush = TOOLS[4]; gsap.set(TOOLS[4].el, { x: 0, y: 0 }); startPolish(true); }
        return;
      }
      on = true; last = null; box.setPointerCapture(e.pointerId); work(e.clientX, e.clientY, radFor(e));
    });
    box.addEventListener('pointermove', e => { if (on) work(e.clientX, e.clientY, radFor(e)); });
    ['pointerup', 'pointercancel'].forEach(ev => box.addEventListener(ev, () => {
      if (held) { held = 0; lamp = null; brush = null; if (!busy) { stopCure(); stopPolish(); } return; }
      if (!on) return; on = false; last = null; finishStroke(); }));

    /* ---- появление и старт ---- */
    gsap.set(TOOLS.map(t => t.el), { y: 24, opacity: 0 });
    const io2 = new IntersectionObserver(es => { es.forEach(e => { if (!e.isIntersecting) return; io2.disconnect();
      loadMasks(() => { sizeCanvases(); setStage(stage); });
      gsap.to(TOOLS.map(t => t.el), { y: 0, opacity: 1, duration: .8, ease: 'power3.out', stagger: .1 }); }); }, { threshold: .2 });
    io2.observe(stageEl);

    onRealResize(sizeCanvases, 180);
    reset();
  })();


  /* ---------- ЛОТОК: ультрафиолет на три секунды ---------- */
  (function trayGame() {
    const stage = $('#tray-stage'), tools = $$('.tool', stage), done = $('#tray-done'), hint = $('#tray-hint'), cta = $('#tray-cta');
    let timer = null;
    const inTray = el => { const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
      const cx = (r.left + r.width / 2 - s.left) / s.width, cy = (r.top + r.height * .62 - s.top) / s.height;
      return cx > .13 && cx < .87 && cy > .5 && cy < .98; };
    function check() {
      const all = tools.every(inTray);
      /* Как только в лоток лёг первый инструмент, надпись «Лоток» не нужна:
         цель уже понятна, а поверх инструментов она мешает. */
      stage.classList.toggle('is-started', tools.some(inTray));
      if (all && !stage.classList.contains('is-uv') && !stage.classList.contains('is-clean')) {
        stage.classList.add('is-uv'); done.textContent = 'Многоступенчатая стерилизация';
        sfx.play('uv');            // лампа разгорается: выдох, а не щелчок
        hint.classList.add('is-touched'); gsap.to(hint, { opacity: 0, duration: .5 });
        clearTimeout(timer);
        timer = setTimeout(() => {                       // свет плавно гаснет, инструменты остаются чистыми
          stage.classList.remove('is-uv'); stage.classList.add('is-clean');
          done.textContent = 'Набор стерилен';
          sfx.play('done');
          sparkle();
          cta.hidden = false; gsap.from(cta, { y: 12, opacity: 0, duration: .8, ease: 'power2.out' });
        }, 3000);
        track('tray_done');
      } else if (!all) { clearTimeout(timer); stage.classList.remove('is-uv', 'is-clean'); done.textContent = ''; $$('.spark', stage).forEach(el => el.remove()); }
    }
    function sparkle() {
      const SP = '<svg class="spark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c.7 6.6 4.7 10.6 12 12-7.3 1.4-11.3 5.4-12 12-.7-6.6-4.7-10.6-12-12C7.3 10.6 11.3 6.6 12 0z"/></svg>';
      tools.forEach(t => {
        const spots = [[18, 22], [52, 46], [78, 70], [36, 78]].slice(0, 3 + (Math.random() * 2 | 0));
        spots.forEach(([x, y]) => {
          t.insertAdjacentHTML('beforeend', SP);
          const el = t.lastElementChild;
          el.style.left = (x + (Math.random() * 14 - 7)) + '%'; el.style.top = (y + (Math.random() * 14 - 7)) + '%';
          el.style.width = (7 + Math.random() * 7) + 'px';
          gsap.fromTo(el, { scale: 0, opacity: 0, rotate: -30 },
            { scale: 1, opacity: 1, rotate: 0, duration: .45, ease: 'back.out(2)', delay: Math.random() * 1.1,
              onComplete() { gsap.to(el, { opacity: .15, scale: .7, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1, repeatDelay: 1.4 + Math.random() * 2.4, delay: .3 }); } });
        });
      });
    }
    /* ---- появление ---- */
    let live = false;                       // магнит включаем только после выкладки
    gsap.set(tools, { y: -50, opacity: 0 });
    const o = new IntersectionObserver(es => { es.forEach(e => { if (!e.isIntersecting) return; o.disconnect();
      gsap.to(tools, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: .12,
        onComplete() { M.forEach(m => { if (m.el.dataset.slot === undefined && !m.up) { m.cx = 0; m.cy = 0; m.bx = 0; m.by = 0; } }); live = true; } }); }); }, { threshold: .3 });
    o.observe(stage);

    /* Пять мест в лотке: отпущенный рядом инструмент сам встаёт в ближайшее
       свободное. Пока инструмент не уложен, он тянется к курсору и подрастает —
       так его заметно проще подхватить. Положение каждого инструмента ведёт
       один общий цикл, поэтому магнит, перетаскивание и укладка не спорят
       друг с другом за одно и то же свойство. */
    const SLOT_X = [.20, .35, .50, .65, .80], SLOT_Y = .76;
    const R = 190, PULL = .34, GROW = .22, DRAG_S = 1.14, K = .18;

    const touchTray = !finePointer;
    const M = tools.map(el => ({ el, bx: 0, by: 0, cx: 0, cy: 0, cs: 1, up: false,
      sx: gsap.quickSetter(el, 'x', 'px'), sy: gsap.quickSetter(el, 'y', 'px'),
      /* scale в quickSetter не поддерживается — ставим обе оси по отдельности */
      sa: gsap.quickSetter(el, 'scaleX'), sb: gsap.quickSetter(el, 'scaleY') }));
    tools.forEach((el, i) => { el.__m = M[i]; });

    const anchor = el => { const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height * .62 }; };
    const slotPoint = i => { const s = stage.getBoundingClientRect();
      return { x: s.left + s.width * SLOT_X[i], y: s.top + s.height * SLOT_Y }; };
    function nearTray(el) {
      const s = stage.getBoundingClientRect(), a = anchor(el);
      return (a.y - s.top) / s.height > .45;
    }
    function snap(el) {
      const taken = new Set(tools.filter(t => t !== el && t.dataset.slot !== undefined).map(t => +t.dataset.slot));
      let best = -1, bd = Infinity;
      const a = anchor(el);
      SLOT_X.forEach((_, i) => { if (taken.has(i)) return;
        const p = slotPoint(i), d = Math.hypot(p.x - a.x, p.y - a.y);
        if (d < bd) { bd = d; best = i; } });
      if (best < 0) return false;
      const p = slotPoint(best), m = el.__m;
      m.bx = m.cx + (p.x - a.x); m.by = m.cy + (p.y - a.y);
      el.dataset.slot = best; dirty = true; kick();
      return true;
    }

    let mx = -1e5, my = -1e5, raf = 0, over = false, dirty = false;
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }
    function loop() {
      raf = 0;
      let busy = false;
      for (const m of M) {
        if (m.el.classList.contains('is-drag')) {          // тащат: положение ведёт Draggable
          m.cx = gsap.getProperty(m.el, 'x'); m.cy = gsap.getProperty(m.el, 'y');
          if (Math.abs(DRAG_S - m.cs) > .002) { m.cs += (DRAG_S - m.cs) * K; m.sa(m.cs); m.sb(m.cs); }
          busy = true; continue;
        }
        let tx = m.bx, ty = m.by, ts = m.up ? DRAG_S : 1;
        if (m.up) {                                        // взят в руку по тапу
          if (Math.abs(ts - m.cs) > .002) { m.cs += (ts - m.cs) * K; m.sa(m.cs); m.sb(m.cs); busy = true; }
          continue;
        }
        if (over && m.el.dataset.slot === undefined) {     // не уложен — тянется к курсору
          const r = m.el.getBoundingClientRect();
          const dx = mx - (r.left + r.width / 2 - m.cx), dy = my - (r.top + r.height * .55 - m.cy);
          const k = Math.max(0, 1 - Math.hypot(dx, dy) / R);
          if (k > 0) { tx = m.bx + dx * PULL * k; ty = m.by + dy * PULL * k; ts = 1 + GROW * k; }
        }
        if (Math.abs(tx - m.cx) > .06 || Math.abs(ty - m.cy) > .06 || Math.abs(ts - m.cs) > .002) {
          m.cx += (tx - m.cx) * K; m.cy += (ty - m.cy) * K; m.cs += (ts - m.cs) * K;
          m.sx(m.cx); m.sy(m.cy); m.sa(m.cs); m.sb(m.cs); busy = true;
        }
      }
      if (busy) { raf = requestAnimationFrame(loop); return; }
      if (dirty) { dirty = false; check(); }   // всё доехало на места — пересчитываем
    }
    if (finePointer && !reduced) {
      stage.addEventListener('pointermove', e => { if (!live) return;
        mx = e.clientX; my = e.clientY; over = true; kick(); });
      stage.addEventListener('pointerleave', () => { over = false; kick(); });
    }

    /* Телефон: инструменты не таскаем — тап по инструменту берёт его в руку,
       тап по лотку кладёт на свободное место. Пальцем это заметно надёжнее,
       чем волочить мелкий предмет по экрану. */
    if (touchTray) {
      /* Одно нажатие вместо двух. Прежняя механика — «возьми в руку, потом
         нажми на лоток» — требовала попасть дважды, причём первый раз по
         предмету шириной в несколько пикселей. Теперь нажатие на инструмент
         сразу укладывает его в ближайшее свободное место, а повторное
         нажатие по уложенному возвращает его обратно. Ошибиться нечем. */
      tools.forEach(el => el.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        const m = el.__m;
        el.classList.remove('wiggle');
        live = true;
        if (el.dataset.slot !== undefined) {          // уже в лотке — забираем
          delete el.dataset.slot; m.bx = 0; m.by = 0; dirty = true; kick();
          sfx.play('pick');
        } else if (snap(el)) { sfx.play('place'); }
        else { check(); }                             // свободных мест нет
      }));
      hint.textContent = 'Нажимайте на инструменты — они соберутся в набор, и начнётся многоступенчатая стерилизация.';
    }
    if (!touchTray) Draggable.create(tools, { type: 'x,y', bounds: stage, zIndexBoost: false, minimumMovement: 3,
      onPress() {
        const el = this.target, m = el.__m;
        gsap.killTweensOf(el); live = true;
        sfx.play('pick');                                 // инструмент взяли в руку
        el.classList.add('is-drag'); el.classList.remove('wiggle');
        delete el.dataset.slot;
        gsap.set(el, { x: m.cx, y: m.cy });               // стартуем ровно оттуда, где инструмент виден
      },
      onRelease() {
        const el = this.target, m = el.__m;
        el.classList.remove('is-drag');
        m.cx = gsap.getProperty(el, 'x'); m.cy = gsap.getProperty(el, 'y');
        m.bx = m.cx; m.by = m.cy;
        if (nearTray(el) && snap(el)) sfx.play('place');   // лёг в лоток
        else { kick(); check(); }
      } });
  })();


  addEventListener('load', () => ScrollTrigger.refresh());
})();
