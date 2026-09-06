/* Академия улыбки · v8 */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [].slice.call((r || document).querySelectorAll(s));
  const html = document.documentElement;
  html.classList.add('js');                       // класс ставим скриптом: разметка может прийти без него
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const track = (ev, data) => { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: ev }, data || {})); };
  const hasGsap = !!(window.gsap && window.ScrollTrigger && window.Draggable);
  const dpr = Math.min(2, devicePixelRatio || 1);
  const ASSETS = window.__ASSETS || {};           // подстановка путей для single-file сборки
  const asset = p => ASSETS[p] || p;

  /* ---------- шапка, меню, активный раздел ---------- */
  const hdr = $('#hdr');
  addEventListener('scroll', () => hdr.classList.toggle('stuck', scrollY > 8), { passive: true });
  const burger = $('.burger');
  burger.addEventListener('click', () => burger.setAttribute('aria-expanded', document.body.classList.toggle('nav-open')));
  $$('.nav a').forEach(a => a.addEventListener('click', () => { document.body.classList.remove('nav-open'); burger.setAttribute('aria-expanded', 'false'); }));
  (function activeNav() {
    const links = $$('.nav a, .pnav a').filter(a => a.hash && $(a.hash));
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map(links.map(a => [a.hash.slice(1), a]));
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { links.forEach(a => a.classList.remove('is-active')); const a = map.get(e.target.id); if (a) a.classList.add('is-active'); } });
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

  /* карта: подмена фотографией, если iframe не загрузился */
  (function mapFallback() {
    const map = $('#map'); if (!map) return;
    const fr = $('.map__frame', map); if (!fr) return;
    let loaded = false; fr.addEventListener('load', () => { loaded = true; });
    setTimeout(() => { if (loaded) return;
      fr.remove(); map.classList.add('is-fallback');
      map.insertAdjacentHTML('beforeend', `<img class="map__ph bw" src="${asset('assets/photo/facade.jpg')}" alt="Вход в клинику"><p class="map__note">Сочи, ул. Виноградная, 55/1 — вход с улицы, второй этаж.</p>`);
    }, 6000);
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
      if (v === 'all') startMetrika();
    }
    function show() { bar.hidden = false; document.body.classList.add('has-cookie'); }

    const saved = (read() || '').split('|')[0];
    /* поверх вступления окно не показываем — ждём, пока откроется содержимое */
    const ready = cb => document.querySelector('#intro') && !html.classList.contains('ready')
      ? setTimeout(() => ready(cb), 400) : setTimeout(cb, 900);
    if (saved === 'all') startMetrika();
    else if (saved !== 'need') ready(show);

    $('#cookie-yes').addEventListener('click', () => { decide('all', true); track('consent_all'); });
    $('#cookie-no').addEventListener('click', () => { decide('need', true); track('consent_min'); });
    const st = $('#cookie-settings'); if (st) st.addEventListener('click', e => { e.preventDefault(); show(); });

    /* события отправляем и в Метрику, когда она разрешена */
    const push = window.dataLayer = window.dataLayer || [];
    const orig = push.push.bind(push);
    push.push = a => { if (window.ym && METRIKA && a && a.event) try { ym(METRIKA, 'reachGoal', a.event); } catch (e) {} return orig(a); };
  })();

  if (!$('#intro')) { html.classList.add('ready'); if (!hasGsap || reduced) html.classList.replace('js', 'no-js'); return; }   // внутренние страницы

  /* статичная версия: всё показано, игры в конечном состоянии */
  if (!hasGsap || reduced) {
    html.classList.replace('js', 'no-js'); html.classList.add('ready');
    const ib = $('#intro'); if (ib) ib.remove();
    $('.offer').classList.add('is-open'); $('.fill').classList.add('is-done'); $('#promo').hidden = false;
    $('#tray-stage').classList.add('is-clean'); $('#tray-cta').hidden = false;
    return;
  }
  gsap.registerPlugin(ScrollTrigger, Draggable);

  /* ---------- ВСТУПЛЕНИЕ ----------
     Лампа крупная с самого начала и горит ровно, без мигания: по мере движения
     усиливается сияние и блики, лампа наезжает и уходит за границы экрана,
     открывая содержимое. Надписи видны сразу и растворяются при первом движении.
     Два режима: если документ прокручивается сам — ведёт скролл (назад тоже);
     если нет (страница внутри iframe по высоте контента — так устроен артефакт),
     ведём колесом и жестом. */
  (function intro() {
    const box = $('#intro'); if (!box) return;
    const par   = $('#intro-par'),
          stage = $('.intro__stage', box),
          on    = $('.intro__on', box),
          glow  = $('.intro__glow', box),
          bloom = $('.intro__bloom', box),
          flash = $('.intro__flash', box),
          hint  = $('.intro__hint', box),
          slogan= $('.intro__slogan', box),
          words = $$('.intro__words i', box),
          btn   = $('#intro-lamp'),
          hdrEl = $('#hdr');

    /* Одна шкала 0→1. Пять «прокруток» — лампа и засвет, ещё три — экран со словами.
         0.00–0.07  включается свет, слоган уходит
         0.07–0.38  спокойное приближение, сияние набирает силу
         0.38–0.52  ещё ближе и ярче, засвет расходится по всему кадру
         0.52–0.58  кадр залит светом
         0.53–0.66  три слова проступают по одному
         0.66–0.80  пауза: слова держатся
         0.80–0.93  слова уходят по одному
         0.93–1.00  растворение, дальше первый экран
       Лампа увеличивается вокруг собственного центра и никуда не смещается.        */
    gsap.set(stage, { scale: 1, transformOrigin: '50% 50%' });
    gsap.set(glow,  { xPercent: -50, yPercent: -50, scale: .55, opacity: 0 });
    gsap.set(bloom, { xPercent: -50, yPercent: -50, scale: .18, opacity: 0 });
    gsap.set(on,    { opacity: 0 });
    gsap.set(flash, { opacity: 0 });
    gsap.set(words, { opacity: 0, y: 44, scale: .9 });
    gsap.set([slogan, hint], { opacity: 1 });

    const STOP = .66;                        // конец «ламповой» части: слова показаны

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    tl.to(on,     { opacity: 1, duration: .07, ease: 'power1.inOut' }, 0)
      .to(glow,   { opacity: .32, scale: .8, duration: .07, ease: 'power1.inOut' }, 0)
      .to(slogan, { opacity: 0, y: -22, duration: .06, ease: 'power1.in' }, 0)
      .to(hint,   { opacity: 0, duration: .04, ease: 'power1.in' }, 0)
      /* приближение: свет расходится по кадру, а не только по корпусу лампы */
      .to(stage,  { scale: 1.45, duration: .31, ease: 'power1.inOut' }, .07)
      .to(glow,   { opacity: .68, scale: 1.5, duration: .31, ease: 'power1.inOut' }, .07)
      .to(bloom,  { opacity: .45, scale: .55, duration: .31, ease: 'power1.inOut' }, .07)
      .to(stage,  { scale: 2.8, duration: .14, ease: 'power1.in' }, .38)
      .to(glow,   { opacity: 1, scale: 3.1, duration: .14, ease: 'power1.in' }, .38)
      .to(bloom,  { opacity: .96, scale: 1.35, duration: .14, ease: 'power1.in' }, .38)
      .to(stage,  { scale: 6.5, duration: .12, ease: 'power2.in' }, .52)
      /* корпус растворяется в свете, иначе на весь кадр расползается серый пластик */
      .to(stage,  { opacity: 0, duration: .09, ease: 'power1.in' }, .49)
      .to(bloom,  { scale: 2.4, duration: .12, ease: 'power2.in' }, .52)
      .to(flash,  { opacity: 1, duration: .06, ease: 'power2.in' }, .52)
      /* слова: шире амплитуда, спокойнее выход */
      .to(words,  { opacity: 1, y: 0, scale: 1, duration: .075, stagger: .028, ease: 'power2.out' }, .53)
      .to(words,  { opacity: 0, y: -40, scale: .94, duration: .075, stagger: .028, ease: 'power2.in' }, .80)
      .to(flash,  { opacity: 1, duration: 0 }, 1);   // держим длительность шкалы равной 1

    const saneViewport = innerHeight >= 320 && innerHeight <= 1700;
    const tall = saneViewport && document.documentElement.scrollHeight - innerHeight > 60;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    let pos = 0, closed = false, phase = 0;
    function apply() {
      tl.progress(pos);
      box.style.opacity = pos > .93 ? String(Math.max(0, 1 - (pos - .93) / .065)) : '1';
      const open = pos > .985;
      box.classList.toggle('is-moving', pos > .004);
      /* кадр залит белым — лампу и сияние снимаем с отрисовки совсем */
      box.classList.toggle('is-blank', pos > .60);
      html.classList.toggle('ready', open);
      if (hdrEl) hdrEl.classList.toggle('hdr--ghost', !open);
      box.style.pointerEvents = open ? 'none' : '';
      if (pos < STOP - .02) phase = 0;
      if (open && !closed) {
        closed = true; track('intro_done');
        if (!tall) setTimeout(() => { if (box.parentNode) box.remove(); }, 260);
      }
      if (!open) closed = false;
    }

    /* лампа едва заметно ведёт за курсором */
    if (finePointer && !reduced) {
      const qx = gsap.quickTo(par, 'x', { duration: 1.2, ease: 'power2.out' }),
            qy = gsap.quickTo(par, 'y', { duration: 1.2, ease: 'power2.out' });
      box.addEventListener('pointermove', e => {
        if (closed || pos > .2) return;
        const k = Math.max(0, 1 - pos * 5);
        qx((e.clientX / innerWidth - .5) * 24 * k); qy((e.clientY / innerHeight - .5) * 15 * k);
      });
      box.addEventListener('pointerleave', () => { qx(0); qy(0); });
    }

    /* нажатие: первое — до экрана со словами, второе — слова уходят и открывается сайт */
    function target() { return phase === 0 ? STOP : 1; }
    function afterRun() {
      if (phase === 0) { phase = 1; return; }
      const h = $('#hero'); if (h) h.scrollIntoView({ behavior: tall ? 'auto' : 'smooth', block: 'start' });
    }

    if (tall) {                       /* обычная страница: шкалу ведёт скролл, назад тоже */
      box.classList.add('is-tall');
      let raf = 0, driving = false;
      const at = y => {
        const len = box.offsetHeight - innerHeight;
        pos = len > 0 ? Math.min(1, Math.max(0, y / len)) : 1;
        apply();
      };
      const fromScroll = () => { raf = 0; if (!driving) at(scrollY); };
      addEventListener('scroll', () => { if (!raf && !driving) raf = requestAnimationFrame(fromScroll); }, { passive: true });
      addEventListener('resize', () => at(scrollY));
      scrollTo(0, 0); at(0);
      /* Прокрутку по нажатию ведём сами: ставим положение и тут же перерисовываем
         в том же кадре. Иначе событие scroll разбирается через кадр и картина
         отстаёт от позиции — это и читается как рывки. */
      const run = () => {
        const len = box.offsetHeight - innerHeight, to = target();
        driving = true;
        gsap.to({ y: scrollY }, { y: len * to + (to === 1 ? 2 : 0), duration: to === 1 ? 2.6 : 3.6,
          ease: 'power2.inOut', overwrite: true,
          onUpdate() { const y = this.targets()[0].y; scrollTo({ top: y, behavior: 'instant' }); at(y); },
          onComplete() { driving = false; at(scrollY); afterRun(); },
          onInterrupt() { driving = false; } });
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
    const BUDGET = 3960;   // столько же «пути», сколько на обычной странице
    const step = dy => { pos = Math.min(1, Math.max(0, pos + dy / BUDGET)); apply(); };
    box.addEventListener('wheel', e => { if (closed) return; if (e.deltaY > 0 && pos < 1) e.preventDefault(); step(e.deltaY); }, { passive: false });
    let ty = null;
    box.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
    box.addEventListener('touchmove', e => { if (closed) return; const y = e.touches[0].clientY;
      if (ty != null) { if (ty > y && pos < 1) e.preventDefault(); step((ty - y) * 1.6); } ty = y; }, { passive: false });
    const run = () => { const to = target();
      gsap.to({ v: pos }, { v: to, duration: to === 1 ? 2.6 : 3.6, ease: 'power2.inOut', overwrite: true,
        onUpdate() { pos = this.targets()[0].v; apply(); }, onComplete: afterRun }); };
    addEventListener('keydown', e => { if (closed) return;
      if (['Enter', ' ', 'Spacebar'].includes(e.key)) { e.preventDefault(); run(); return; }
      if (['ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); step(600); }
      if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); step(-600); } });
    btn.addEventListener('click', run);
    $$('.intro__go', box).forEach(el => el.addEventListener('click', run));
    apply();
  })();

  /* ---------- карусель с приёма ---------- */
  (function shots() {
    const box = $('#shots'); if (!box) return;
    const imgs = $$('.shots__track img', box), dots = $('.shots__dots', box);
    let i = 0;
    imgs.forEach((_, k) => {
      const d = document.createElement('button'); d.type = 'button'; d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', 'Фото ' + (k + 1)); d.setAttribute('aria-selected', k === 0);
      d.addEventListener('click', () => show(k)); dots.appendChild(d);
    });
    function show(k) {
      i = (k + imgs.length) % imgs.length;
      imgs.forEach((im, n) => im.classList.toggle('is-cur', n === i));
      $$('button', dots).forEach((d, n) => d.setAttribute('aria-selected', n === i));
    }
    $$('.shots__nav', box).forEach(b => b.addEventListener('click', () => show(i + (+b.dataset.dir))));
  })();

  /* ---------- крошки (общий помощник) ---------- */
  function makeParticles(canvas, stageEl) {
    const ctx = canvas.getContext('2d'); let parts = [], raf = 0;
    const size = () => { const r = stageEl.getBoundingClientRect(); canvas.width = Math.round(r.width * 1.2 * dpr); canvas.height = Math.round(r.height * dpr); };
    size(); addEventListener('resize', size);
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts = parts.filter(p => p.life > 0);
      for (const p of parts) { p.vy += .32 * dpr; p.x += p.vx; p.y += p.vy; p.life -= .022; p.rot += .1;
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .8); ctx.restore(); }
      raf = parts.length ? requestAnimationFrame(tick) : 0;
    }
    const GREY = ['#C7C3BC', '#B5B1AA', '#D9D6CF', '#A9A5A0'];
    return (pt, n, burst, palette) => {
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
      carve(W, H);
    }
    /* надпись, выдавленная в камне: тень снизу-справа, свет сверху-слева */
    function carve(W, H) {
      const TXT = 'СПЕЦИАЛЬНОЕ ПРЕДЛОЖЕНИЕ', FIT = W * .74;
      let size = H * .12;
      const setFont = s => { tc.font = '400 ' + s + 'px Prata, Georgia, "Times New Roman", serif'; };
      const width = s => { setFont(s); const tr = s * .16;
        return TXT.split('').reduce((a, ch) => a + tc.measureText(ch).width + tr, -tr); };
      let w = width(size);
      if (w > FIT) { size *= FIT / w; w = width(size); }          // ужимаем под ширину плиты
      const d = Math.max(1.2, size * .06), track = size * .16;
      tc.save();
      tc.textAlign = 'center'; tc.textBaseline = 'middle'; setFont(size);
      const draw = (dx, dy, color) => {
        tc.fillStyle = color;
        let x = W / 2 - w / 2;
        for (const ch of TXT) {
          const cw = tc.measureText(ch).width;
          tc.fillText(ch, x + cw / 2 + dx, H * .5 + dy);
          x += cw + track;
        }
      };
      draw(d, d, 'rgba(86,82,76,.40)');            // тень в глубине борозды
      draw(-d, -d, 'rgba(255,255,255,.75)');       // подсвеченная кромка
      draw(0, 0, 'rgba(203,198,190,.70)');         // дно борозды
      tc.restore();
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
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (!open) reset(); }, 200); });

    /* камень зарастает, пока его не трогают */
    new IntersectionObserver(es => es.forEach(e => visible = e.isIntersecting), { threshold: .15 }).observe(stage);
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
      const cx = (px - sr.left) * dpr, cy = (py - sr.top) * dpr, rad = radCss * dpr;
      if (last) { const dx = cx - last.x, dy = cy - last.y, n = Math.max(1, Math.round(Math.hypot(dx, dy) / (rad * .35))); for (let i = 1; i <= n; i++) erase(last.x + dx * i / n, last.y + dy * i / n, rad); } else erase(cx, cy, rad);
      last = { x: cx, y: cy }; spawn({ x: px, y: py }, 4);
      if (++ops % 6 === 0) { const r = ratio(); setDrill(r); if (r > .62) openOffer('scrub'); }
      return true;
    }
    let scrubbing = false;
    stone.addEventListener('pointerdown', e => { scrubbing = true; last = null; stone.setPointerCapture(e.pointerId); scrub(e.clientX, e.clientY, e.pointerType === 'touch' ? 30 : 22); });
    stone.addEventListener('pointermove', e => { if (scrubbing) scrub(e.clientX, e.clientY, e.pointerType === 'touch' ? 30 : 22); });
    ['pointerup', 'pointercancel'].forEach(ev => stone.addEventListener(ev, () => { scrubbing = false; last = null; }));

    if (hp && finePointer) {
      gsap.set(hp, { y: -50, opacity: 0 });
      const o = new IntersectionObserver(es => { es.forEach(e => { if (!e.isIntersecting) return; o.disconnect();
        gsap.to(hp, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', onComplete: () => hp.classList.add('wiggle') }); }); }, { threshold: .2 });
      o.observe(hp);
      Draggable.create(hp, { type: 'x,y', zIndexBoost: false, minimumMovement: 3,
        onPress() { gsap.killTweensOf(hp); hp.classList.add('is-drag'); hp.classList.remove('wiggle'); last = null; },
        onRelease() { hp.classList.remove('is-drag', 'is-drill'); last = null; },
        onDrag() { const r = hp.getBoundingClientRect(); hp.classList.toggle('is-drill', !!scrub(r.left + r.width * .998, r.top + r.height * .117, 20)); } });
    }
    function openOffer(how) {
      if (open) return; open = true; offer.classList.add('is-open'); if (hp) hp.classList.remove('is-drill');
      const sr = stone.getBoundingClientRect(); for (let i = 0; i < 6; i++) spawn({ x: sr.left + Math.random() * sr.width, y: sr.top + Math.random() * sr.height }, 10, true);
      gsap.to(stone, { opacity: 0, duration: .8, ease: 'power2.out', onComplete: () => { stone.style.pointerEvents = 'none'; } });
      gsap.fromTo('.slab__offer', { scale: .985 }, { scale: 1, duration: .9, ease: 'power2.out' });
      track('offer_open', { how });
      // когда секция ушла с экрана — камень нарастает заново, можно просверлить ещё раз
      setTimeout(() => {
        const back = new IntersectionObserver(es => es.forEach(e => {
          if (e.isIntersecting || !open) return;
          back.disconnect(); open = false; offer.classList.remove('is-open');
          stone.style.pointerEvents = ''; reset(); gsap.set(stone, { opacity: 1 }); stone.classList.add('pulse'); hint.classList.remove('is-touched');
        }), { threshold: 0 });
        back.observe(stage);
      }, 4000);
    }
    $('#drill-skip').addEventListener('click', () => openOffer('button'));
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

    let stage = 1, W = 0, H = 0, done = 0, seen = 0, last = null, ops = 0, busy = false;
    let ptsEdge = [], ptsFull = [], imgEdge = null, imgFull = null;
    const bits = makeParticles($('#bits'), stageEl);
    const PINK = ['#EFA0C6', '#E981BA', '#F7B9D8', '#D96FA8'];

    /* ---- размеры и маски ---- */
    function loadMasks(cb) {
      if (imgFull) { cb && cb(); return; }
      let n = 0; const ok = () => { if (++n === 2) cb && cb(); };
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
      if (stage === 1) say.textContent = 'Подготовка: ' + pc100(cover(ec, ptsEdge) / .82) + ' %';
      else if (stage === 2) say.textContent = 'Промывание: ' + pc100(1 - cover(ec, ptsEdge) / .82) + ' %';
      else if (stage === 3) { const v = cover(pc, ptsFull) / .99;
        say.textContent = 'Заполнено ' + pc100(v) + ' %' + (v >= 1 ? ' — теперь лампа' : ''); }
    }
    const pc100 = v => Math.round(Math.max(0, Math.min(1, v)) * 100);
    /* переключаем этап только когда инструмент отпущен */
    function finishStroke() {
      if (busy) return;
      if (stage === 1 && cover(ec, ptsEdge) > .82) setStage(2);
      else if (stage === 2 && cover(ec, ptsEdge) < .12) setStage(3);
      else if (stage === 3 && cover(pc, ptsFull) >= .99) setStage(4);
      else readout();
    }

    /* ---- этапы ---- */
    const TXT = {
      1: 'Этап 1. Подготовка: синим шприцом пройдите по краю дефекта.',
      2: 'Этап 2. Промывание: смойте гель водой из пистолета.',
      3: 'Этап 3. Композит: заполните дефект целиком, до 100 %.',
      4: 'Этап 4. Свет: поднесите лампу к зубу и держите, пока полоса не заполнится.',
      5: 'Этап 5. Полировка: пройдите щёткой по зубу — реставрация заблестит.'
    };
    /* лампу можно взять уже на укладке — если композита мало, реставрация сорвётся */
    const canUse = t => t.k === stage || (t.k === 4 && stage === 3);
    function setStage(k) {
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
    again.addEventListener('click', () => { track('fill_again'); reset(); });

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
    const NEED = 2600; let exposure = 0, tPrev = 0, raf = 0, lamp = null, full = false;
    function tipNear(t) {
      const r = t.el.getBoundingClientRect(), b = box.getBoundingClientRect();
      const x = r.left + r.width * t.tip[0], y = r.top + r.height * t.tip[1];
      const pad = b.width * .18;
      return x > b.left - pad && x < b.right + pad && y > b.top - pad && y < b.bottom + pad;
    }
    function loop(t) {
      const dt = tPrev ? t - tPrev : 16; tPrev = t;
      const near = !!(lamp && !busy && (stage === 3 || stage === 4) && tipNear(lamp));
      TOOLS[3].el.classList.toggle('is-lit', near);
      fill.classList.toggle('is-curing', near);
      if (near) exposure = Math.min(NEED, exposure + dt); else exposure = Math.max(0, exposure - dt * .5);
      barFill.style.width = (exposure / NEED * 100) + '%';
      if (exposure >= NEED) { finishCure(); return; }
      raf = requestAnimationFrame(loop);
    }
    function startCure() {
      if (raf || busy) return;
      if (cover(pc, ptsFull) < .90) { crumble(); return; }   // меньше 90 % — реставрация срывается
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
      full = cover(pc, ptsFull) > .99;
      fill.classList.remove('is-curing', 'is-arming');
      fill.classList.add('is-done'); TOOLS[3].el.classList.remove('is-lit', 'wiggle');
      /* зуб становится здоровым: свет размывает границы и проявляет целую коронку */
      gsap.to([etchC, paintC], { opacity: 0, filter: 'blur(9px)', duration: 1.1, ease: 'power2.inOut' });
      gsap.to(bad, { opacity: 0, filter: 'blur(7px)', duration: 1.2, ease: 'power2.inOut' });
      gsap.fromTo(okImg, { opacity: 0, filter: 'blur(12px)' },
        { opacity: 1, filter: 'blur(0px)', duration: 1.3, ease: 'power2.out', delay: .15 });
      gsap.to(TOOLS[3].el, { x: 0, y: 0, duration: .5 });
      setTimeout(() => setStage(5), 900);            // остаётся отполировать
      track('cure_done', { full: full });
    }

    /* ---- полировка: щётка ходит по зубу, полоса набирается ---- */
    const POL = 2200; let polish = 0, pPrev = 0, praf = 0, brush = null;
    function polLoop(t) {
      const dt = pPrev ? t - pPrev : 16; pPrev = t;
      const near = !!(brush && !busy && stage === 5 && tipNear(brush));
      fill.classList.toggle('is-polishing', near);
      if (near) polish = Math.min(POL, polish + dt); else polish = Math.max(0, polish - dt * .5);
      barFill.style.width = (polish / POL * 100) + '%';
      if (polish >= POL) { finishPolish(); return; }
      praf = requestAnimationFrame(polLoop);
    }
    function startPolish() { if (praf || busy) return; pPrev = 0; fill.classList.add('is-arming'); praf = requestAnimationFrame(polLoop); }
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

    /* ---- инструменты ---- */
    TOOLS.forEach(t => {
      Draggable.create(t.el, { type: 'x,y', zIndexBoost: false, minimumMovement: 2,
        onPress() {
          if (!canUse(t) || busy) { this.endDrag(); return; }
          gsap.killTweensOf(t.el);
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
          work(r.left + r.width * t.tip[0], r.top + r.height * t.tip[1], 15);
        } });
    });

    /* ---- палец или курсор прямо по зубу ---- */
    let on = false;
    const radFor = e => e.pointerType === 'touch' ? 22 : 16;
    box.addEventListener('pointerdown', e => { if (stage !== 1 && stage !== 2 && stage !== 3 || busy) return; on = true; last = null; box.setPointerCapture(e.pointerId); work(e.clientX, e.clientY, radFor(e)); });
    box.addEventListener('pointermove', e => { if (on) work(e.clientX, e.clientY, radFor(e)); });
    ['pointerup', 'pointercancel'].forEach(ev => box.addEventListener(ev, () => { if (!on) return; on = false; last = null; finishStroke(); }));

    /* ---- появление и старт ---- */
    gsap.set(TOOLS.map(t => t.el), { y: 24, opacity: 0 });
    const io2 = new IntersectionObserver(es => { es.forEach(e => { if (!e.isIntersecting) return; io2.disconnect();
      gsap.to(TOOLS.map(t => t.el), { y: 0, opacity: 1, duration: .8, ease: 'power3.out', stagger: .1 }); }); }, { threshold: .2 });
    io2.observe(stageEl);

    let rt2; addEventListener('resize', () => { clearTimeout(rt2); rt2 = setTimeout(sizeCanvases, 180); });
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
      if (all && !stage.classList.contains('is-uv') && !stage.classList.contains('is-clean')) {
        stage.classList.add('is-uv'); done.textContent = 'Многоступенчатая стерилизация';
        hint.classList.add('is-touched'); gsap.to(hint, { opacity: 0, duration: .5 });
        clearTimeout(timer);
        timer = setTimeout(() => {                       // свет плавно гаснет, инструменты остаются чистыми
          stage.classList.remove('is-uv'); stage.classList.add('is-clean');
          done.textContent = 'Набор стерилен';
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
    gsap.set(tools, { y: -50, opacity: 0 });
    const o = new IntersectionObserver(es => { es.forEach(e => { if (!e.isIntersecting) return; o.disconnect();
      gsap.to(tools, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: .12 }); }); }, { threshold: .3 });
    o.observe(stage);
    Draggable.create(tools, { type: 'x,y', bounds: stage, zIndexBoost: false, minimumMovement: 3,
      onPress() { gsap.killTweensOf(this.target); this.target.classList.add('is-drag'); this.target.classList.remove('wiggle'); },
      onRelease() { this.target.classList.remove('is-drag'); check(); } });
  })();

  addEventListener('load', () => ScrollTrigger.refresh());
})();
