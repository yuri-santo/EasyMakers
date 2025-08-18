/* =======================================================
   Portfólio com PAINEL LATERAL EasyMakers
   - Carrega assets/data/projects.json
   - Renderiza GRID de cards
   - Ao clicar em um card, abre painel lateral com infos
   - Reaproveita o LED/box-shadow direcional do script global
   ======================================================= */

(function () {
  const cardsEl  = document.getElementById('cards');     // grid
  const catalog  = document.getElementById('catalog');   // wrapper (para classe .panel-open)
  const panel    = document.getElementById('panel');     // painel lateral
  const qEl      = document.getElementById('q');         // busca
  const filters  = document.getElementById('filters');   // chips (opcional)

  let DATA = [];
  let ACTIVE = new Set();
  let QUERY = '';
  let SELECTED_ID = null;

  // --- fetch JSON ---
  fetch('assets/data/projects.json')
    .then(r => r.json())
    .then(json => { DATA = json; buildFilters(); render(); })
    .catch(() => { cardsEl.innerHTML = '<p>Não foi possível carregar o portfólio.</p>'; });

  // --- filtros por categoria (chips) ---
  function buildFilters(){
    const cats = [...new Set(DATA.map(d => d.category))].sort();
    filters.innerHTML = [
      `<button class="chip active" data-cat="__all">Tudo</button>`,
      ...cats.map(c => `<button class="chip" data-cat="${c}">${c}</button>`)
    ].join('');

    filters.addEventListener('click', (e)=>{
      const b = e.target.closest('.chip'); if (!b) return;
      [...filters.querySelectorAll('.chip')].forEach(x => x.classList.remove('active'));
      const cat = b.getAttribute('data-cat');
      if (cat === '__all') { ACTIVE.clear(); } else { ACTIVE = new Set([cat]); }
      b.classList.add('active');
      closePanel();
      render();
    });

    qEl?.addEventListener('input', () => { QUERY = qEl.value.trim().toLowerCase(); closePanel(); render(); });
  }

  // --- render do GRID ---
  function render(){
    const list = DATA.filter(p => {
      const byCat = ACTIVE.size ? ACTIVE.has(p.category) : true;
      const hay = [p.title, p.client, p.category, ...(p.stack||[])].join(' ').toLowerCase();
      const byQ  = QUERY ? hay.includes(QUERY) : true;
      return byCat && byQ;
    });

    cardsEl.innerHTML = list.map(cardHTML).join('') || '<p class="mt-4">Nenhum resultado encontrado.</p>';

    // LED direcional – reaproveita suas regras adicionando classe .card
    cardsEl.querySelectorAll('.tile').forEach(el => el.classList.add('card'));

    // Click de seleção
    cardsEl.addEventListener('click', onCardClick);
  }

  // --- HTML do card ---
  function cardHTML(p){
    const stack = (p.stack||[]).slice(0,3).join(' • ');
    return `
      <article class="tile" data-id="${p.id}">
        <img class="thumb" src="${p.thumb}" alt="${p.title}" loading="lazy">
        <h6>${p.title}</h6>
        <div class="meta">${p.client || ''}${p.client ? ' • ' : ''}${stack}</div>
      </article>
    `;
  }

  // --- Ao clicar em um card, abre o painel e “move” o layout ---
  function onCardClick(e){
    const tile = e.target.closest('.tile'); if (!tile) return;
    const id   = tile.getAttribute('data-id');
    const proj = DATA.find(x => x.id === id); if (!proj) return;

    SELECTED_ID = id;

    // marca visual no card
    cardsEl.querySelectorAll('.tile').forEach(t => t.classList.toggle('is-selected', t === tile));

    // abre o painel e popula
    openPanel(proj);

    // garante foco para acessibilidade
    panel.focus({ preventScroll: true });
  }

  // --- abre painel com dados do projeto ---
  function openPanel(p){
    catalog.classList.add('panel-open');

    panel.innerHTML = `
      <div class="pp-head d-flex align-items-center justify-content-between">
        <h5 class="m-0">${p.title}</h5>
        <button class="pp-close" aria-label="Fechar painel">&times;</button>
      </div>

      <div class="pp-body">
        <img class="pp-thumb" src="${(p.media && p.media[0]) || p.thumb}" alt="${p.title}">
        <div class="pp-meta">
          <p><strong>Cliente:</strong> ${p.client || '—'}</p>
          <p><strong>Categoria:</strong> ${p.category}</p>
          <p><strong>Tecnologias:</strong> ${(p.stack||[]).join(', ') || '—'}</p>
          <p><strong>Descrição:</strong> ${p.summary || '—'}</p>
        </div>

        <div class="pp-actions">
          ${p.link ? `<a class="btn-outline-brand" href="${p.link}" target="_blank" rel="noopener">Ver projeto</a>` : ''}
          <button class="btn-outline-brand" id="btn-orc">Solicitar orçamento</button>
        </div>
      </div>
    `;

    // fechar painel
    panel.querySelector('.pp-close').addEventListener('click', closePanel);
    document.getElementById('btn-orc')?.addEventListener('click', ()=>location.href='index.php#contato');

    // ESC fecha
    document.addEventListener('keydown', escClose);
  }

  function closePanel(){
    catalog.classList.remove('panel-open');
    SELECTED_ID = null;
    cardsEl.querySelectorAll('.tile').forEach(t => t.classList.remove('is-selected'));
    document.removeEventListener('keydown', escClose);
  }

  function escClose(e){ if (e.key === 'Escape') closePanel(); }
})();
