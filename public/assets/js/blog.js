const state = {
  bundle: null,
  tag: "all",
  query: "",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function qs(selector) {
  return document.querySelector(selector);
}

function refreshShell() {
  window.EasyMakersShell?.refreshReveals?.();
  window.EasyMakersShell?.refreshGlow?.();
  window.EasyMakersShell?.refreshSearch?.();
}

async function loadBundle() {
  try {
    const response = await fetch("/api/content/site", { credentials: "same-origin" });
    if (!response.ok) throw new Error("bundle");
    return await response.json();
  } catch {
    const [community, comments] = await Promise.all([
      fetch("/assets/data/community.json").then((res) => res.json()),
      fetch("/assets/data/comments.json").then((res) => res.json()).catch(() => []),
    ]);
    return { community, comments };
  }
}

function renderTags() {
  const faqs = state.bundle?.community?.faqs || [];
  const host = qs("#faq-tags");
  if (!host) return;

  const tags = ["all", ...new Set(faqs.map((item) => item.category))];
  host.innerHTML = tags
    .map((tag) => `<button type="button" class="filter-tag ${tag === state.tag ? "is-active" : ""}" data-tag="${tag}">${tag === "all" ? "Todos" : tag}</button>`)
    .join("");

  host.querySelectorAll(".filter-tag").forEach((button) => {
    button.addEventListener("click", () => {
      state.tag = button.getAttribute("data-tag") || "all";
      renderFaqs();
      renderTags();
    });
  });
}

function filteredFaqs() {
  const faqs = state.bundle?.community?.faqs || [];
  const query = normalize(state.query);

  return faqs.filter((item) => {
    const matchesTag = state.tag === "all" || item.category === state.tag;
    const matchesQuery = !query || normalize([item.question, item.answer, ...(item.tags || [])].join(" ")).includes(query);
    return matchesTag && matchesQuery;
  });
}

function renderFaqs() {
  const host = qs("#faq-list");
  if (!host) return;

  const items = filteredFaqs();
  host.innerHTML = items.length
    ? items
        .map(
          (item, index) => `
            <article class="premium-card faq-item" data-reveal data-reveal-delay="${index * 50}">
              <span class="faq-item__meta">${item.category}</span>
              <h3>${item.question}</h3>
              <p>${item.answer}</p>
            </article>
          `
        )
        .join("")
    : `<article class="faq-item"><h3>Nenhum resultado</h3><p>Tente outro filtro ou outro termo de busca.</p></article>`;

  refreshShell();
}

function renderTestimonials() {
  const host = qs("#testimonial-list");
  if (!host) return;

  const items = state.bundle?.community?.testimonials || [];
  host.innerHTML = items.length
    ? items
        .map(
          (item, index) => `
            <article class="premium-card testimonial-card" data-testimonial-id="${escapeHtml(item.id)}" role="button" tabindex="0" data-reveal data-reveal-delay="${index * 40}">
              <span class="testimonial-card__meta">${escapeHtml(item.score)}</span>
              <h3>${escapeHtml(item.name)}</h3>
              <p>${escapeHtml(item.quote)}</p>
              <div class="testimonial-card__author">${escapeHtml(item.role)} - ${escapeHtml(item.company)}</div>
            </article>
          `
        )
        .join("")
    : `<article class="testimonial-card"><h3>Sem depoimentos publicados</h3><p>Assim que novos depoimentos forem adicionados pelo painel, eles aparecem aqui.</p></article>`;

  refreshShell();
}

function bindTestimonialModal() {
  const host = qs("#testimonial-list");
  const modal = qs("#testimonial-modal");
  if (!host || !modal) return;

  const badge = qs("#testimonial-modal-badge");
  const title = qs("#testimonial-modal-title");
  const author = qs("#testimonial-modal-author");
  const quote = qs("#testimonial-modal-quote");
  const closeBtn = modal.querySelector(".shell-modal__close");

  if (!badge || !title || !author || !quote || !(closeBtn instanceof HTMLElement)) return;

  function setOpen(next) {
    const isOpen = modal.getAttribute("aria-hidden") === "false";
    if (next === isOpen) return;

    if (next) {
      modal.__lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-modal-open");
      closeBtn.focus();
    } else {
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-modal-open");
      modal.__lastFocus?.focus?.();
      modal.__lastFocus = null;
    }
  }

  function openById(id) {
    const items = state.bundle?.community?.testimonials || [];
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    badge.textContent = item.score || "Depoimento";
    title.textContent = item.name || "Depoimento";
    author.textContent = [item.role, item.company].filter(Boolean).join(" - ");
    quote.textContent = item.quote || "";
    setOpen(true);
  }

  host.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const card = target?.closest?.("[data-testimonial-id]");
    if (!(card instanceof HTMLElement) || !host.contains(card)) return;
    openById(card.dataset.testimonialId || "");
  });

  host.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target instanceof Element ? event.target : null;
    const card = target?.closest?.("[data-testimonial-id]");
    if (!(card instanceof HTMLElement) || !host.contains(card)) return;
    event.preventDefault();
    openById(card.dataset.testimonialId || "");
  });

  modal.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    if (target.dataset.close === "true") setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (modal.getAttribute("aria-hidden") !== "false") return;
    setOpen(false);
  });
}

function renderComments() {
  const host = qs("#comments-list");
  const count = qs("#comments-count");
  if (!host || !count) return;

  const items = state.bundle?.comments || [];
  count.textContent = `${items.length} comentario(s)`;
  host.innerHTML = items.length
    ? items
        .map(
          (item, index) => `
            <article class="premium-card comment-card" data-reveal data-reveal-delay="${index * 30}">
              <h3>${item.author}</h3>
              <p>${item.message}</p>
              <div class="comment-card__author">${item.company || "Comunidade EasyMakers"}</div>
              <span class="comment-card__date">${new Date(item.createdAt).toLocaleString("pt-BR")}</span>
            </article>
          `
        )
        .join("")
    : `<article class="comment-card"><h3>Nenhum comentario ainda</h3><p>Seja o primeiro a compartilhar uma duvida ou experiencia.</p></article>`;

  refreshShell();
}

async function submitComment(event) {
  event.preventDefault();

  const status = qs("#comment-status");
  const author = qs("#comment-author");
  const company = qs("#comment-company");
  const message = qs("#comment-message");

  try {
    status.textContent = "Publicando...";
    const response = await fetch("/api/content/comments", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: author.value.trim(),
        company: company.value.trim(),
        message: message.value.trim(),
      }),
    });

    if (!response.ok) throw new Error("comment");
    state.bundle.comments = await response.json();
    author.value = "";
    company.value = "";
    message.value = "";
    status.textContent = "Comentario publicado.";
    renderComments();
  } catch {
    status.textContent = "Nao foi possivel publicar agora.";
  }
}

async function boot() {
  state.bundle = await loadBundle();
  renderTags();
  renderFaqs();
  renderTestimonials();
  renderComments();
  bindTestimonialModal();

  qs("#faq-search")?.addEventListener("input", (event) => {
    state.query = event.target.value || "";
    renderFaqs();
  });

  qs("#comment-form")?.addEventListener("submit", submitComment);
}

boot();
