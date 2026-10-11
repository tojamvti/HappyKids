/* HappyKids – skrypty strony (bez bibliotek) */
(function () {
  'use strict';
  const doc = document.documentElement;
  const ROOT = doc.getAttribute('data-root') || '';            // '' na stronie głównej, '../' na podstronach
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = window.matchMedia('(min-width: 900px)');
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];

  /* ---------- „Wróć” i logo na podstronach: cofnij, jeśli przyszliśmy z tej strony ---------- */
  $$('.back, .logo-sub').forEach(a => a.addEventListener('click', e => {
    try {
      if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) {
        e.preventDefault(); history.back();
      }
    } catch (_) { /* zwykły link */ }
  }));

  /* ---------- rok w stopce ---------- */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- menu na telefonie ---------- */
  const burger = $('.burger'), nav = $('#menu');
  if (burger && nav) {
    const close = () => { burger.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); document.body.style.overflow = ''; };
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', nav).forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    desktop.addEventListener('change', close);
  }

  /* ---------- lista zdjęć z folderu (PHP), a gdy niedostępne – lista zapasowa ---------- */
  function loadPhotos(folder) {
    const fallback = () => ((window.HK_ZDJECIA || {})[folder] || []).map(p => (typeof p === 'string' ? { src: p, thumb: p } : p));
    if (window.HK_ZDJECIA_AUTO) return Promise.resolve(fallback());   // GitHub Pages: lista zbudowana automatycznie, bez PHP
    return fetch(ROOT + 'api/zdjecia.php?folder=' + folder, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw 0; return r.json(); })
      .then(list => (Array.isArray(list) && list.length ? list : fallback()))
      .catch(fallback);
  }
  window.HK_loadPhotos = loadPhotos;

  /* ---------- kwiatek: zdjęcia z folderu „kwiatek”, zmiana co 6 s ---------- */
  const flowerG = $('.flower-imgs');
  if (flowerG) {
    loadPhotos('kwiatek').then(list => {
      if (!list.length) return;
      const tpl = $('image', flowerG);
      flowerG.innerHTML = '';
      const imgs = list.map((p, i) => {
        const im = tpl.cloneNode(false);
        im.setAttribute('href', ROOT + (p.src || p));
        im.setAttribute('class', 'fl-img' + (i === 0 ? ' on' : ''));
        flowerG.appendChild(im);
        return im;
      });
      if (reduce || imgs.length < 2) return;
      let i = 0;
      setInterval(() => {
        const prev = imgs[i];
        i = (i + 1) % imgs.length;
        prev.classList.remove('on'); prev.classList.add('was');
        setTimeout(() => prev.classList.remove('was'), 1300);
        imgs[i].classList.add('on');
      }, 6000);
    });
  }

  /* ---------- galeria na stronie głównej: 3 najnowsze zdjęcia ---------- */
  const gHome = $('[data-gallery-home]');
  if (gHome) {
    loadPhotos('galeria').then(list => {
      const tiles = $$('img', gHome);
      list.slice(0, tiles.length).forEach((p, i) => { tiles[i].src = ROOT + (p.thumb || p.src); });
    });
  }

  /* ---------- linia przerywana rysowana przy przewijaniu (komputer) ---------- */
  const trail = $('.trail');
  let segs = [];
  function setupTrail() {
    if (!trail) return;
    segs = $$('.rev', trail).map(p => {
      const len = p.getTotalLength(), step = 3, ys = [];
      let m = -Infinity;
      for (let d = 0; d <= len; d += step) { m = Math.max(m, p.getPointAtLength(d).y); ys.push(m); }
      p.style.strokeDasharray = len + ' ' + len;
      return { p, len, step, ys };
    });
  }
  function drawTrail() {
    if (!segs.length || !desktop.matches) return;
    const top = trail.getBoundingClientRect().top;
    const line = window.innerHeight * 0.72 - top;
    segs.forEach(s => {
      let drawn = s.len;
      if (!reduce) {
        let lo = 0, hi = s.ys.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (s.ys[mid] <= line) lo = mid + 1; else hi = mid; }
        drawn = Math.min(s.len, lo * s.step);
      }
      s.p.style.strokeDashoffset = s.len - drawn;
    });
  }

  /* ---------- pojawianie się elementów (tylko tych poniżej ekranu przy otwarciu) ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('.rv, .link-m, .spiral-m').forEach(el => {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('pre'); io.observe(el); }
    });

    /* jednorazowe: maskotka + dymek, aparat, uścisk dłoni */
    const hello = el => { if (!el) return; el.classList.remove('hello'); void el.offsetWidth; el.classList.add('hello'); };
    const groups = [['.mascot', ['.mascot', '.bubble']], ['.dd-camera', ['.dd-camera']], ['.dd-hands', ['.dd-hands']]];
    const io2 = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const g = groups.find(x => e.target.matches(x[0]));
        g[1].forEach(sel => hello($(sel)));
        io2.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -18% 0px' });
    groups.forEach(g => { const el = $(g[0]); if (el) io2.observe(el); });
    const mascot = $('.mascot');
    if (mascot) mascot.addEventListener('click', () => { hello(mascot); hello($('.bubble')); });
  }

  /* ---------- karuzela „Nasz dzień” ---------- */
  const nd = $('.nd');
  if (nd) {
    const SLIDES = [
      ['7:00–9:00', 'Zabawy dowolne'],
      ['9:00–10:00', 'Powitanie, toaleta poranna, śniadanie'],
      ['10:00–11:00', 'Zajęcia edukacyjne'],
      ['11:15–12:30', 'Zabawa w ogrodzie'],
      ['12:30–13:00', 'Obiad'],
      ['13:00–14:00', 'J. angielski, odpoczynek'],
      ['14:00–14:45', 'Odpoczynek, zabawy dowolne'],
      ['15:30–16:00', 'Podwieczorek'],
      ['16:00–17:00', 'Zabawy dowolne, odbiór dzieci']
    ];
    const stage = $('.nd__stage', nd), dots = $('.nd__dots', nd), body = $('.nd__body', nd);
    const prev = $('.nd__arrow--prev', nd), next = $('.nd__arrow--next', nd), live = $('#nd-live');
    let cur = 0;
    const slides = SLIDES.map(([time, text], i) => {
      const el = document.createElement('div');
      el.className = 'nd__slide';
      el.setAttribute('role', 'group');
      el.setAttribute('aria-roledescription', 'slajd');
      el.setAttribute('aria-label', (i + 1) + ' z ' + SLIDES.length + ': ' + time);
      el.innerHTML = '<div class="nd__img"><img src="' + ROOT + 'karuzela/' + String(i + 1).padStart(2, '0') + '.webp" alt="' + text + '" draggable="false"' + (i > 2 ? ' loading="lazy"' : '') + '></div>' +
        '<div class="nd__cap"><span class="nd__txt">' + text + '</span><span class="nd__time">' + time + '</span></div>';
      el.addEventListener('click', () => { if (el.classList.contains('is-side')) go(i); });
      stage.appendChild(el);
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.className = 'nd__dot'; b.setAttribute('aria-label', time + ' – ' + text);
      b.addEventListener('click', () => go(i));
      li.appendChild(b); dots.appendChild(li);
      return el;
    });
    const dotBtns = $$('.nd__dot', dots);
    function render(announce) {
      const x = parseFloat(getComputedStyle(nd).getPropertyValue('--shift')) || 150;
      slides.forEach((el, i) => {
        const d = i - cur;
        el.classList.toggle('is-center', d === 0);
        el.classList.toggle('is-side', Math.abs(d) === 1);
        el.classList.toggle('is-hidden', Math.abs(d) > 1);
        el.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
        el.style.transform = 'translateX(' + (Math.max(-2, Math.min(2, d)) * x) + 'px)';
      });
      dotBtns.forEach((b, i) => b.setAttribute('aria-current', i === cur ? 'true' : 'false'));
      prev.disabled = cur === 0;
      next.disabled = cur === SLIDES.length - 1;
      if (announce) live.textContent = SLIDES[cur][0] + ': ' + SLIDES[cur][1];
    }
    function go(i) { const n = Math.max(0, Math.min(SLIDES.length - 1, i)); if (n === cur) return; cur = n; render(true); }
    prev.addEventListener('click', () => go(cur - 1));
    next.addEventListener('click', () => go(cur + 1));
    body.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
    });
    let sx = null, sy = null;
    stage.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
    stage.addEventListener('pointerup', e => {
      if (sx === null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(cur + (dx < 0 ? 1 : -1));
    });
    stage.addEventListener('pointercancel', () => { sx = null; });
    window.addEventListener('resize', () => render(false));
    render(false);
  }

  /* ---------- nagłówek: kompaktowy pasek po przewinięciu (komputer) ---------- */
  const hdr = $('.hdr');
  function headerState() {
    if (!hdr) return;
    const y = window.scrollY;
    if (!desktop.matches) { hdr.classList.remove('compact'); return; }
    if (y > 170) hdr.classList.add('compact');
    else if (y < 120) hdr.classList.remove('compact');
  }

  /* ---------- przewijanie ---------- */
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { drawTrail(); headerState(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', drawTrail);
  desktop.addEventListener('change', drawTrail);
  setupTrail(); drawTrail(); headerState();
  desktop.addEventListener('change', headerState);
})();

/* ---------- okienko z opisem partnera ---------- */
(function () {
  'use strict';
  const pm = document.getElementById('pm');
  if (!pm) return;
  const btns = [...document.querySelectorAll('.partner-btn')];
  const logo = document.getElementById('pm-logo'), name = document.getElementById('pm-name'), desc = document.getElementById('pm-desc'), count = document.getElementById('pm-count');
  const prev = pm.querySelector('.pm-prev'), next = pm.querySelector('.pm-next'), close = pm.querySelector('.pm-close');
  let cur = 0, opener = null;
  function show(i) {
    cur = Math.max(0, Math.min(btns.length - 1, i));
    const b = btns[cur];
    logo.src = b.dataset.logo; logo.alt = b.dataset.name;
    name.textContent = b.dataset.name; desc.textContent = b.dataset.desc;
    count.textContent = (cur + 1) + ' / ' + btns.length;
    prev.disabled = cur === 0; next.disabled = cur === btns.length - 1;
  }
  function open(i, from) {
    opener = from; show(i);
    pm.hidden = false; requestAnimationFrame(() => pm.classList.add('open'));
    document.body.style.overflow = 'hidden'; close.focus();
  }
  function shut() {
    pm.classList.remove('open');
    setTimeout(() => { pm.hidden = true; }, 250);
    document.body.style.overflow = '';
    if (opener) opener.focus();
  }
  btns.forEach((b, i) => b.addEventListener('click', () => open(i, b)));
  prev.addEventListener('click', () => show(cur - 1));
  next.addEventListener('click', () => show(cur + 1));
  close.addEventListener('click', shut);
  pm.addEventListener('click', e => { if (e.target === pm) shut(); });
  document.addEventListener('keydown', e => {
    if (pm.hidden) return;
    if (e.key === 'Escape') shut();
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
    if (e.key === 'Tab') {
      const f = [...pm.querySelectorAll('button:not(:disabled)')], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
})();
