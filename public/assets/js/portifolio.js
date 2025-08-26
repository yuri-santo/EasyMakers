(() => {
  const qs  = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));
  const raf = (fn) => requestAnimationFrame(fn);
  const header = qs('.sc-header');
  const grid   = qs('#grid');
  const qInput = qs('#q');
  const chips  = qsa('.chip');
  const drawer = qs('#drawer');
  const panel  = drawer?.querySelector('.drawer__panel');
  const body   = drawer?.querySelector('.drawer__body');
  const btnX   = drawer?.querySelector('.drawer__close');
  const back   = drawer?.querySelector('.drawer__backdrop');
  const tpl    = qs('#tpl-details');
  if (!header || !grid || !drawer || !panel || !body || !tpl) return;
  function setNavH(){
    const h = header.offsetHeight || 104;
    document.documentElement.style.setProperty('--nav-h', `${h}px`);
  }
  window.addEventListener('load', setNavH, { once:true });
  window.addEventListener('resize', setNavH, { passive:true });
  raf(setNavH);

  function mapCategory(slug){
    switch((slug||'').toLowerCase()){
      case 'apps': return 'Apps & Sistemas';
      case 'automation': return 'Automação';
      case 'bi': return 'Dashboards & BI';
      default: return 'Geral';
    }
  }

  function buildDetails(card){
    const node = tpl.content.firstElementChild.cloneNode(true);
    const inlineX = node.querySelector('.details-close');
    if (inlineX) inlineX.remove();
    const ds  = card.dataset || {};
    const img = card.querySelector('.card-media img');
    qs('.details-title',  node).textContent = ds.title   || card.querySelector('h3')?.textContent || 'Projeto';
    qs('.details-client', node).textContent = ds.client  || '—';
    qs('.details-category',node).textContent= mapCategory(ds.category);
    qs('.details-tech',   node).textContent = ds.tech    || card.querySelector('.meta')?.textContent || '—';
    qs('.details-desc',   node).textContent = ds.description || '';
    const media = qs('.details-img', node);
    if (media) {
      media.alt = ds.title || 'Prévia do projeto';
      const src = img?.getAttribute('src') || img?.src || '';
      media.src = src;
      media.loading = 'lazy';
      media.decoding = 'async';
    }
    const btn = qs('.btn-outline', node);
    if (btn) {
      const link = ds.link || '';
      if (link) btn.href = link; else btn.style.display = 'none';
    }
    return node;
  }

  function openDrawer(node){
    body.innerHTML = '';
    body.appendChild(node);
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow = 'hidden';
    raf(()=> btnX?.focus());
  }
  function closeDrawer(){
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden','true');
    body.innerHTML = '';
    document.documentElement.style.overflow = '';
  }
  btnX?.addEventListener('click', closeDrawer, { passive:true });
  back?.addEventListener('click', closeDrawer, { passive:true });
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeDrawer(); });

  function applyFilters(){
    const q = (qInput?.value || '').toLowerCase().trim();
    const active = qs('.chip.is-active');
    const cat = (active?.dataset.filter || 'all').toLowerCase();
    qsa('.card', grid).forEach(card=>{
      const c  = (card.dataset.category || '').toLowerCase();
      const t  = (card.dataset.title || card.querySelector('h3')?.textContent || '').toLowerCase();
      const cl = (card.dataset.client || '').toLowerCase();
      const te = (card.dataset.tech || card.querySelector('.meta')?.textContent || '').toLowerCase();

      const catOk = (cat === 'all') || (c === cat);
      const txtOk = !q || t.includes(q) || cl.includes(q) || te.includes(q);
      card.style.display = (catOk && txtOk) ? '' : 'none';
    });
  }
  chips.forEach(ch=>{
    ch.addEventListener('click', ()=>{
      chips.forEach(c=>c.classList.remove('is-active'));
      ch.classList.add('is-active');
      applyFilters();
    }, { passive:true });
  });
  qInput?.addEventListener('input', applyFilters, { passive:true });
  grid.addEventListener('click', (ev)=>{
    const card = ev.target.closest('.card');
    if (!card) return;
    if (ev.target.closest('a,button')) return;
    openDrawer(buildDetails(card));
  }, { passive:true });
  const all = chips.find(c => (c.dataset.filter||'') === 'all');
  if (all) all.classList.add('is-active');
  applyFilters();
})();


(() => {
  const style = 'color:#6f42c1;font-weight:700;font-size:14px';
  console.log('%cEasyMakers 🦉', style);
})();