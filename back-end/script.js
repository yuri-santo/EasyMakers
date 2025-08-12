AOS.init();
// Evita múltiplas instâncias
if (window.__servicosSwiper) {
  window.__servicosSwiper.destroy(true, true);
}

window.__servicosSwiper = new Swiper('.mySwiper', {
  slidesPerView: 2,
  spaceBetween: 20,
  loop: false,
  speed: 500,
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev'
  },
  breakpoints: {
    0:   { slidesPerView: 1, spaceBetween: 16 },
    768: { slidesPerView: 2, spaceBetween: 20 }
  }
});

// Bloqueia clique duplo muito rápido (caso seu tema dispare 2 eventos)
(() => {
  let last = 0;
  document.querySelectorAll('.swiper-button-next, .swiper-button-prev')
    .forEach(btn => btn.addEventListener('click', e => {
      const now = Date.now();
      if (now - last < 350) { e.stopImmediatePropagation(); e.preventDefault(); }
      last = now;
    }, true));
})();



document.getElementById("current-year").textContent = new Date().getFullYear();

// Blog modal (lógica simples com <template>) — versão corrigida
(() => {
  const modalEl = document.getElementById('articleModal');
  const titleEl = document.getElementById('articleModalLabel');
  const contentEl = document.getElementById('articleContent');

  if (!modalEl || !titleEl || !contentEl) {
    console.warn('[Modal] Elementos do modal não encontrados.');
    return;
  }

  let lastTrigger = null;

  const MAP = {
    vba: 'tpl-article-vba',
    embedded: 'tpl-article-embedded',
    dashboard: 'tpl-article-dashboard',
    automation: 'tpl-article-automation'
  };

  // abre o modal ao clicar em qualquer .open-article
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.open-article');
    if (!btn) return;

    lastTrigger = btn;

    const key = btn.getAttribute('data-article');
    const tplId = MAP[key];
    const tpl = tplId ? document.getElementById(tplId) : null;

    if (tpl) {
      contentEl.innerHTML = tpl.innerHTML.trim();
      const h2 = contentEl.querySelector('h2');
      titleEl.textContent = h2 ? h2.textContent : 'Artigo';
    } else {
      contentEl.innerHTML = '<p>Conteúdo não encontrado.</p>';
      titleEl.textContent = 'Artigo';
    }

    // garante que o conteúdo possa receber foco (a11y)
    if (!contentEl.hasAttribute('tabindex')) contentEl.setAttribute('tabindex', '-1');

    const modal = window.bootstrap?.Modal.getOrCreateInstance(modalEl);
    modal?.show();
  });

  // ===== Correções de acessibilidade (evita "Blocked aria-hidden...")
  // foca o conteúdo quando abrir
  modalEl.addEventListener('shown.bs.modal', () => {
    contentEl?.focus?.({ preventScroll: true });
  });

  // desfoca qualquer elemento dentro do modal antes de esconder
  modalEl.addEventListener('hide.bs.modal', () => {
    const active = document.activeElement;
    if (active && modalEl.contains(active)) active.blur();
  });

  // devolve foco para quem abriu
  modalEl.addEventListener('hidden.bs.modal', () => {
    if (lastTrigger?.focus) lastTrigger.focus();
  });

  // links internos dentro do modal (mailto: e #ancora): fecha primeiro, navega depois
  modalEl.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    const isMailto = href.startsWith('mailto:');
    const isHash = href.startsWith('#');
    if (!isMailto && !isHash) return;

    e.preventDefault();

    const go = () => {
      if (isMailto) {
        window.location.href = href;
      } else if (isHash) {
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.pushState(null, '', href);
          target.setAttribute('tabindex', '-1');
          target.focus?.({ preventScroll: true });
        }
      }
    };

    const inst = window.bootstrap?.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', function handler() {
      modalEl.removeEventListener('hidden.bs.modal', handler);
      go();
    });
    inst.hide();
  });
})();

(() => {
  const style1 = 'color:#6A5ACD;font-weight:700;font-size:14px';
  console.log(`%c  ,_,  \n (O,O) \n (   ) \n -"-"-`, style1);
  console.log('%cEasyMakers', style1);
})();


