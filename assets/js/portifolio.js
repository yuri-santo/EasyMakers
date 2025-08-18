/* ==========================================================
   Portfólio • EasyMakers
   - Desktop: painel inline empurra/redimensiona o grid
   - Mobile: abre um modal
   ========================================================== */

/* util */
const qs  = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => [...el.querySelectorAll(s)];

/* elementos base */
const grid         = qs('#portfolioGrid');
const chips        = qsa('.chip');
const searchInput  = qs('#searchInput');
const modal        = qs('#projectModal');
const modalBody    = qs('#projectModal .modal-body');
const detailsTpl   = qs('#detailsTemplate');

/* estado */
let currentDetailsEl = null;
let currentOpenCard  = null;

/* ----------------------------
   Build / Preenche painel
---------------------------- */
function buildDetailsFromCard(card) {
  const frag = detailsTpl.content.cloneNode(true);
  const el   = frag.querySelector('.project-details');

  // popula
  const img  = frag.querySelector('.details-img');
  const t    = frag.querySelector('.details-title');
  const cl   = frag.querySelector('.details-client');
  const cat  = frag.querySelector('.details-category');
  const tech = frag.querySelector('.details-tech');
  const desc = frag.querySelector('.details-desc');
  const btn  = frag.querySelector('.btn-outline');

  const title = card.dataset.title || '';
  const client = card.dataset.client || '-';
  const category = mapCategory(card.dataset.category);
  const techs = card.dataset.tech || '-';
  const description = card.dataset.description || '';
  const link = card.dataset.link || '#';

  // tenta usar a imagem do card
  const cardImg = qs('img', card);
  if (cardImg && cardImg.src && cardImg.style.opacity !== '0') {
    img.src = cardImg.src;
    img.alt = title;
  } else {
    img.remove(); // se não tiver imagem, remove o container
    const media = frag.querySelector('.details-media');
    media.style.display = 'none';
  }

  t.textContent = title;
  cl.textContent = client;
  cat.textContent = category;
  tech.textContent = techs;
  desc.textContent = description;
  btn.href = link;

  // fecha (inline)
  frag.querySelector('.close-details').addEventListener('click', () => closeDetails());

  return el;
}

/* ----------------------------
   Abrir/Fechar painel inline
---------------------------- */
function openDetailsInline(card) {
  closeDetails(); // fecha qualquer aberto

  const detailsEl = buildDetailsFromCard(card);

  // injeta painel imediatamente depois do card clicado
  card.insertAdjacentElement('afterend', detailsEl);

  // guarda referências
  currentDetailsEl = detailsEl;
  currentOpenCard  = card;

  // anima entrada
  requestAnimationFrame(() => detailsEl.classList.add('is-visible'));

  // rola suavemente até o painel (se estiver fora de vista)
  const rect = detailsEl.getBoundingClientRect();
  const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  if (rect.bottom > vh - 40 || rect.top < 100) {
    detailsEl.scrollIntoView({behavior:'smooth', block:'center'});
  }
}

function closeDetails() {
  if (!currentDetailsEl) return;
  currentDetailsEl.classList.remove('is-visible');
  const el = currentDetailsEl;
  currentDetailsEl = null;
  currentOpenCard  = null;
  setTimeout(() => el.remove(), 180);
}

/* ----------------------------
   Modal (para mobile)
---------------------------- */
function openModal(card) {
  // limpa modal
  modalBody.innerHTML = '';

  // reaproveita o mesmo template
  const detailsEl = buildDetailsFromCard(card);
  detailsEl.classList.add('is-visible');
  detailsEl.style.display = 'block';
  modalBody.appendChild(detailsEl);

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden','false');
}

function closeModal() {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden','true');
  modalBody.innerHTML = '';
}

// fechar modal ao clicar backdrop ou botão
qsa('[data-close-modal]', modal).forEach(btn=>{
  btn.addEventListener('click', closeModal);
});

/* ----------------------------
   Filtros por chip/categoria
---------------------------- */
chips.forEach(chip=>{
  chip.addEventListener('click', ()=>{
    chips.forEach(c=>c.classList.remove('is-active'));
    chip.classList.add('is-active');

    const filter = chip.dataset.filter;
    filterGrid({ category: filter, query: searchInput.value });
  });
});

/* ----------------------------
   Busca (texto)
---------------------------- */
searchInput.addEventListener('input', ()=>{
  const active = qs('.chip.is-active');
  const filter = active ? active.dataset.filter : 'all';
  filterGrid({ category: filter, query: searchInput.value });
});

/* aplica filtro */
function filterGrid({category='all', query=''}) {
  const q = (query || '').toLowerCase().trim();

  qsa('.project-card', grid).forEach(card=>{
    const cat = card.dataset.category || '';
    const title= (card.dataset.title||'').toLowerCase();
    const client=(card.dataset.client||'').toLowerCase();
    const tech=(card.dataset.tech||'').toLowerCase();

    const catOk = (category === 'all') || (cat === category);
    const textOk = !q || title.includes(q) || client.includes(q) || tech.includes(q);

    card.style.display = (catOk && textOk) ? '' : 'none';
  });

  // se havia um painel aberto cujo card sumiu, fecha
  if (currentOpenCard && currentOpenCard.style.display === 'none') {
    closeDetails();
  }
}

/* ----------------------------
   Clique nos cards
---------------------------- */
grid.addEventListener('click', (ev)=>{
  const card = ev.target.closest('.project-card');
  if (!card) return;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  if (isMobile) {
    openModal(card);
  } else {
    // reabrir em outro card
    if (currentOpenCard === card) {
      closeDetails();
    } else {
      openDetailsInline(card);
    }
  }
});

/* fecha painel inline ao clicar fora dele */
document.addEventListener('click', (ev)=>{
  if (!currentDetailsEl) return;
  const clickedInsidePanel = ev.target.closest('.project-details');
  const clickedCard = ev.target.closest('.project-card');
  if (!clickedInsidePanel && !clickedCard) closeDetails();
});

/* ajuda: converte slug da categoria para rótulo humano */
function mapCategory(slug) {
  switch(slug){
    case 'automation': return 'Automação';
    case 'apps':       return 'Aplicativos & Sistemas';
    case 'bi':         return 'Dashboards & BI';
    default:           return 'Geral';
  }
}

/* inicialização: aplica “Tudo” + busca vazia */
filterGrid({category:'all', query:''});
