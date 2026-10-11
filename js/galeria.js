/* Galeria: siatka zdjęć z folderu „galeria” + powiększenie (strzałki, klawiatura, przesunięcie palcem) */
(function () {
  'use strict';
  const ROOT = document.documentElement.getAttribute('data-root') || '';
  const grid = document.getElementById('g-grid');
  const lb = document.getElementById('lb'), img = document.getElementById('lb-img'), count = document.getElementById('lb-count');
  const prev = lb.querySelector('.lb-prev'), next = lb.querySelector('.lb-next'), close = lb.querySelector('.lb-close');
  let list = [], cur = 0, opener = null;

  window.HK_loadPhotos('galeria').then(l => {
    list = l;
    grid.innerHTML = '';
    if (!list.length) { grid.innerHTML = '<p class="g-empty">Zdjęcia pojawią się wkrótce.</p>'; return; }
    list.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Powiększ zdjęcie ' + (i + 1) + ' z ' + list.length);
      b.innerHTML = '<img src="' + ROOT + (p.thumb || p.src) + '" alt="Zdjęcie z życia przedszkola" loading="lazy">';
      b.addEventListener('click', () => open(i, b));
      grid.appendChild(b);
    });
  });

  function show(i) {
    cur = Math.max(0, Math.min(list.length - 1, i));
    img.src = ROOT + list[cur].src;
    img.alt = 'Zdjęcie ' + (cur + 1) + ' z ' + list.length;
    count.textContent = (cur + 1) + ' / ' + list.length;
    prev.disabled = cur === 0;
    next.disabled = cur === list.length - 1;
    [cur - 1, cur + 1].forEach(j => { if (list[j]) { const pre = new Image(); pre.src = ROOT + list[j].src; } });
  }
  function open(i, from) {
    opener = from; show(i);
    lb.hidden = false; requestAnimationFrame(() => lb.classList.add('open'));
    document.body.style.overflow = 'hidden';
    close.focus();
  }
  function shut() {
    lb.classList.remove('open');
    setTimeout(() => { lb.hidden = true; }, 250);
    document.body.style.overflow = '';
    if (opener) opener.focus();
  }
  prev.addEventListener('click', () => show(cur - 1));
  next.addEventListener('click', () => show(cur + 1));
  close.addEventListener('click', shut);
  lb.addEventListener('click', e => { if (e.target === lb || e.target.tagName === 'FIGURE') shut(); });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') shut();
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
    if (e.key === 'Tab') {                                  // fokus zostaje w oknie powiększenia
      const f = [...lb.querySelectorAll('button:not(:disabled)')];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  let sx = null;
  const fig = lb.querySelector('figure');
  fig.addEventListener('pointerdown', e => { sx = e.clientX; });
  fig.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
  });
})();
