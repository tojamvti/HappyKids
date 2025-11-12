/* ===== Sticky cień navbara przy scrollu ===== */
const navWrap = document.querySelector('.nav-wrap');
const onScrollHeader = () => {
  if (!navWrap) return;
  if (window.scrollY > 6) navWrap.classList.add('scrolled');
  else navWrap.classList.remove('scrolled');
};
window.addEventListener('scroll', onScrollHeader);
window.addEventListener('load', onScrollHeader);

/* ===== Mobile: zamykanie menu po kliknięciu linku ===== */
const navToggle = document.getElementById('nav-toggle');
const mainNav = document.querySelector('.main-nav');

if (mainNav) {
  mainNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      if (navToggle && navToggle.checked) navToggle.checked = false;
    });
  });
}

/* ===== Scroll spy (stabilny, z offsetem nagłówka) ===== */
(() => {
  const links = Array.from(document.querySelectorAll('.main-nav a'));
  if (!links.length) return;

  const sections = links
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  // stały offset = topbar + navbar z CSS
  const cssVar = name => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
  const headerOffset = cssVar('--topbar-h') + cssVar('--nav-h'); // px

  // ułatwienie: aktywacja linku po id sekcji
  const setActive = (id) => {
    links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === `#${id}`));
  };

  const onScroll = () => {
    // wybierz sekcję, której górna krawędź jest najbliżej headera, ale nie poniżej niego
    let currentId = sections[0]?.id || '';
    let bestTop = -Infinity;

    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      const top = rect.top - headerOffset; // pozycja względem dolnej krawędzi nagłówka
      // chcemy najwyższą (najbliższą 0) wartość top, ale nie dodatnią (czyli sekcja już "weszła")
      if (top <= 4 && top > bestTop) {
        bestTop = top;
        currentId = sec.id;
      }
    });

    // zabezpieczenie: gdy jesteśmy na samej górze
    if (window.scrollY < 2) currentId = sections[0]?.id || currentId;

    setActive(currentId);
  };

  // reaguj na scroll i zmiany rozmiaru (debounce)
  let t;
  const debounced = () => { clearTimeout(t); t = setTimeout(onScroll, 50); };

  window.addEventListener('scroll', debounced, { passive: true });
  window.addEventListener('resize', debounced);
  window.addEventListener('load', debounced);

  onScroll();
})();


// ===== Prosta karuzela: 3/2/1 okienka, strzałki i kropki =====
(function simpleCarousel(){
  const carousel = document.querySelector('#nasz-dzien .carousel');
  const track    = document.getElementById('dayGrid');
  const prevBtn  = document.querySelector('#nasz-dzien .carousel-btn.prev');
  const nextBtn  = document.querySelector('#nasz-dzien .carousel-btn.next');
  const dotsWrap = document.getElementById('dayDots');
  if (!carousel || !track || !prevBtn || !nextBtn || !dotsWrap) return;

  const cards = Array.from(track.children);
  let perView = 3, gap = 16, page = 0;

  const calcPerView = () => {
    const w = window.innerWidth;
    if (w <= 640) perView = 1;
    else if (w <= 1000) perView = 2;
    else perView = 3;
  };

  const getGap = () => {
    const cs = getComputedStyle(track);
    // w flex gap dostępny jako column-gap/gap
    const g = parseFloat(cs.columnGap || cs.gap || '16');
    gap = isNaN(g) ? 16 : g;
  };

  const pagesCount = () => Math.max(1, Math.ceil(cards.length / perView));

  const slideWidth = () => {
    // szerokość pojedynczej karty + gap (ostatnia karta w wierszu ma gap za sobą, więc liczymy blokowo)
    const first = cards[0];
    if (!first) return 0;
    return first.getBoundingClientRect().width + gap;
  };

  const updateDots = () => {
    const total = pagesCount();
    dotsWrap.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      if (i === page) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', () => { page = i; render(); });
      dotsWrap.appendChild(b);
    }
  };

  const render = () => {
    const step = slideWidth() * perView; // przesuwamy „stronami”
    track.style.transform = `translateX(${-page * step}px)`;
    // strzałki enable/disable
    prevBtn.disabled = (page === 0);
    nextBtn.disabled = (page >= pagesCount() - 1);
    // kropki
    Array.from(dotsWrap.children).forEach((d, i) => {
      d.toggleAttribute('aria-current', i === page);
    });
  };

  const goPrev = () => { if (page > 0) { page--; render(); } };
  const goNext = () => { if (page < pagesCount() - 1) { page++; render(); } };

  prevBtn.addEventListener('click', goPrev);
  nextBtn.addEventListener('click', goNext);

  const onResize = () => {
    const prevPer = perView;
    calcPerView(); getGap();
    if (prevPer !== perView) updateDots();
    page = Math.min(page, pagesCount() - 1);
    render();
  };

  // init
  calcPerView(); getGap(); updateDots(); render();
  window.addEventListener('resize', () => { clearTimeout(window.__crR); window.__crR = setTimeout(onResize, 120); });
})();

/* ===== Rok w stopce (jeśli gdzieś użyjesz) ===== */
(() => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();





// ===== MODAL: otwieranie, zamykanie, focus-trap =====
const modal = document.getElementById('partnerModal');
const modalImg = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDescription');
const closeBtn = modal.querySelector('.modal-close');

let lastFocused = null;

function openModal({ src, alt, name, description }) {
  lastFocused = document.activeElement;

  modalImg.src = src;
  modalImg.alt = alt || name || 'Logo partnera';
  modalTitle.textContent = name || alt || '';
  modalDesc.textContent = description || '';

  modal.setAttribute('aria-hidden', 'false');

  // focus na zamknięciu (lub pierwszy focusowalny element)
  closeBtn.focus();

  // zablokuj scroll body
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.setAttribute('aria-hidden', 'true');
  modalImg.src = '';
  document.body.style.overflow = ''; // przywróć scroll
  if (lastFocused) lastFocused.focus();
}

// otwieranie po kliknięciu w logo
document.querySelectorAll('.partner').forEach(btn => {
  btn.addEventListener('click', () => {
    const img = btn.querySelector('img');
    openModal({
      src: img.src,
      alt: img.alt,
      name: btn.dataset.name,
      description: btn.dataset.description
    });
  });
});

// zamykanie: X, klik w tło, ESC
closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (modal.getAttribute('aria-hidden') === 'false' && e.key === 'Escape') {
    closeModal();
  }
});

// focus trap w modalu
modal.addEventListener('keydown', (e) => {
  if (modal.getAttribute('aria-hidden') === 'true') return;
  if (e.key !== 'Tab') return;

  const focusables = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    last.focus();
    e.preventDefault();
  } else if (!e.shiftKey && document.activeElement === last) {
    first.focus();
    e.preventDefault();
  }
});




