/* =============== AOS =============== */
AOS.init();

/* =============== SWIPER (Serviços) =============== */
if (window.Swiper) {
  const swiper = new Swiper('.mySwiper', {
    loop: false,
    speed: 500,
    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
    slidesPerView: 2,
    spaceBetween: 20,
    slidesOffsetBefore: 16,
    slidesOffsetAfter: 16,
    breakpoints: {
      0:   { slidesPerView: 1, spaceBetween: 16, centeredSlides: true, centeredSlidesBounds: true },
      768: { slidesPerView: 2, spaceBetween: 20, centeredSlides: false, centeredSlidesBounds: false }
    }
  });

  // simples anti double-click para não “pular” muitos slides
  let last = 0;
  document.querySelectorAll('.swiper-button-next, .swiper-button-prev')
    .forEach(btn => btn.addEventListener('click', e => {
      const now = Date.now();
      if (now - last < 250) { e.stopImmediatePropagation(); e.preventDefault(); }
      last = now;
    }, true));
}

/* =============== Ano no footer =============== */
const yrEl = document.getElementById("current-year");
if (yrEl) yrEl.textContent = new Date().getFullYear();

/* =============== Modal do Blog =============== */
(() => {
  const modalEl = document.getElementById('articleModal');
  const titleEl = document.getElementById('articleModalLabel');
  const contentEl = document.getElementById('articleContent');

  if (!modalEl || !titleEl || !contentEl) return;

  let lastTrigger = null;
  const MAP = {
    vba: 'tpl-article-vba',
    embedded: 'tpl-article-embedded',
    dashboard: 'tpl-article-dashboard',
    automation: 'tpl-article-automation'
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.open-article');
    if (!btn) return;

    lastTrigger = btn;
    const tplId = MAP[btn.getAttribute('data-article')];
    const tpl = tplId ? document.getElementById(tplId) : null;

    if (tpl) {
      contentEl.innerHTML = tpl.innerHTML.trim();
      const h2 = contentEl.querySelector('h2');
      titleEl.textContent = h2 ? h2.textContent : 'Artigo';
    } else {
      contentEl.innerHTML = '<p>Conteúdo não encontrado.</p>';
      titleEl.textContent = 'Artigo';
    }

    if (!contentEl.hasAttribute('tabindex')) contentEl.setAttribute('tabindex', '-1');
    const modal = window.bootstrap?.Modal.getOrCreateInstance(modalEl);
    modal?.show();
  });

  modalEl.addEventListener('shown.bs.modal', () => {
    contentEl?.focus?.({ preventScroll: true });
  });
  modalEl.addEventListener('hide.bs.modal', () => {
    const a = document.activeElement;
    if (a && modalEl.contains(a)) a.blur();
  });
  modalEl.addEventListener('hidden.bs.modal', () => {
    if (lastTrigger?.focus) lastTrigger.focus();
  });

  // mailto/# dentro do modal: fecha e navega
  modalEl.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    const isMailto = href.startsWith('mailto:');
    const isHash   = href.startsWith('#');
    if (!isMailto && !isHash) return;

    e.preventDefault();
    const go = () => {
      if (isMailto) window.location.href = href;
      else if (isHash) {
        const t = document.querySelector(href);
        if (t) {
          t.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.pushState(null, '', href);
          t.setAttribute('tabindex','-1');
          t.focus?.({ preventScroll: true });
        }
      }
    };
    const inst = window.bootstrap?.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function handler(){
      modalEl.removeEventListener('hidden.bs.modal', handler);
      go();
    });
    inst.hide();
  });
})();

/* =============== Rastro (Canvas) =============== */
(function () {
  const canvas = document.getElementById('trail-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  let dpr = Math.max(1, window.devicePixelRatio || 1);

  function resize() {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = canvas.clientWidth || innerWidth;
    const cssH = canvas.clientHeight || innerHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0,0,cssW,cssH);
  }
  resize();
  window.addEventListener('resize', resize);

  const points = [];
  const MAX_POINTS = 120;
  const FADE_MS = 650;
  const root = getComputedStyle(document.documentElement);
  const BASE_SIZE = parseInt(root.getPropertyValue('--trail-size')) || 18;
  const TRAIL_COLOR = root.getPropertyValue('--trail-color') || '111, 66, 193';
  const TRAIL_ALPHA = parseFloat(root.getPropertyValue('--trail-alpha')) || 0.14;

  function onMove(e) {
    const t = e.touches ? e.touches[0] : e;
    points.push({ x: t.clientX, y: t.clientY, t: performance.now() });
    if (points.length > MAX_POINTS) points.shift();
  }
  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });

  function loop(now) {
    const cssW = canvas.clientWidth || innerWidth;
    const cssH = canvas.clientHeight || innerHeight;
    ctx.clearRect(0,0,cssW,cssH);

    for (let i=0;i<points.length;i++){
      const p = points[i];
      const age = now - p.t;
      if (age > FADE_MS) continue;
      const life = 1 - (age / FADE_MS);
      const alpha = Math.max(0, life) * TRAIL_ALPHA;
      const size = BASE_SIZE * (0.35 + life * 0.65);

      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
      grd.addColorStop(0, `rgba(${TRAIL_COLOR}, ${alpha})`);
      grd.addColorStop(1, `rgba(${TRAIL_COLOR}, 0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI*2);
      ctx.fill();
    }
    while (points[0] && now - points[0].t > FADE_MS) points.shift();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* =============== LED via BOX-SHADOW DIRECIONAL (hover) =============== */

(function () {
  const SELECTOR = '.card, .blog-card, #servicos .swiper-slide';
  const items = document.querySelectorAll(SELECTOR);
  if (!items.length) return;

  items.forEach(el => {
    let rect = null, cx = 0, cy = 0;

    function computeCenter(){
      rect = el.getBoundingClientRect();
      cx = rect.left + rect.width  / 2;
      cy = rect.top  + rect.height / 2;
    }

    function onEnter(){ computeCenter(); }
    function onLeave(){
      el.style.setProperty('--sx', '0');
      el.style.setProperty('--sy', '0');
    }

    function onMove(e){
      const x = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      const y = e.clientY ?? (e.touches && e.touches[0]?.clientY);
      if (x == null || y == null) return;
      if (!rect) computeCenter();
      let dx = x - cx;
      let dy = y - cy;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const sx = Math.max(-1, Math.min(1, dx));
      const sy = Math.max(-1, Math.min(1, dy));
      el.style.setProperty('--sx', sx.toFixed(3));
      el.style.setProperty('--sy', sy.toFixed(3));
    }

    el.addEventListener('pointerenter', onEnter, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });
    el.addEventListener('pointermove',  onMove,  { passive: true });
    const recalc = () => { if (el.matches(':hover')) computeCenter(); };
    window.addEventListener('scroll', recalc, { passive: true });
    window.addEventListener('resize', recalc);
  });
})();

/* =============== Assinatura =============== */
(() => {
  const style = 'color:#6f42c1;font-weight:700;font-size:14px';
  console.log('%cEasyMakers • LED (box-shadow) by Yuri Geovane 🦉', style);
})();
