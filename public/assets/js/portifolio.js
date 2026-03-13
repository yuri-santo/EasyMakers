const state = {
  projects: [],
  filter: "all",
  tech: "all",
  query: "",
};

function qs(selector) {
  return document.querySelector(selector);
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function refreshShell() {
  window.EasyMakersShell?.refreshReveals?.();
  window.EasyMakersShell?.refreshGlow?.();
  window.EasyMakersShell?.refreshSearch?.();
}

function categoryLabel(category) {
  const labels = {
    apps: "Apps",
    automation: "Automacao",
    bi: "Dashboards",
    mobile: "Mobile",
  };

  return labels[category] || "Case";
}

function imageUrl(project) {
  const raw = String(project.image || "").trim();
  if (!raw) return "/assets/img/painel.jpg";
  if (raw.startsWith("/")) return raw;
  return `/assets/img/${raw}`;
}

async function loadBundle() {
  try {
    const response = await fetch("/api/content/site", { credentials: "same-origin" });
    if (!response.ok) throw new Error("bundle");
    return await response.json();
  } catch {
    const response = await fetch("/assets/data/projects.json", { credentials: "same-origin" });
    return { projects: await response.json() };
  }
}

function getTechOptions() {
  const counts = new Map();
  state.projects.forEach((project) => {
    (project.tech || []).forEach((item) => {
      const key = String(item || "").trim();
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([label]) => label);
}

function getFilteredProjects() {
  const query = normalize(state.query);

  return state.projects.filter((project) => {
    const matchesFilter = state.filter === "all" || project.category === state.filter;
    const matchesTech = state.tech === "all" || (project.tech || []).some((item) => normalize(item) === normalize(state.tech));
    const haystack = normalize(
      [
        project.title,
        project.client,
        project.summary,
        project.description,
        ...(project.tech || []),
        ...(project.metrics || []),
      ].join(" ")
    );
    const matchesQuery = !query || haystack.includes(query);
    return matchesFilter && matchesTech && matchesQuery;
  });
}

function renderTechTags() {
  const host = qs("#portfolio-tech-tags");
  if (!host) return;

  const items = ["all", ...getTechOptions()];
  host.innerHTML = items
    .map((item) => {
      const active = state.tech === item;
      const label = item === "all" ? "Todas as tecnologias" : item;
      return `<button class="portfolio-tech-tag ${active ? "is-active" : ""}" type="button" data-tech="${item}">${label}</button>`;
    })
    .join("");

  host.querySelectorAll("[data-tech]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tech = button.getAttribute("data-tech") || "all";
      renderTechTags();
      renderProjects();
    });
  });
}

function renderProjects() {
  const host = qs("#portfolio-grid");
  if (!host) return;

  const items = getFilteredProjects();
  host.innerHTML = items.length
    ? items
        .map(
          (project, index) => `
            <article class="premium-card portfolio-card" data-id="${project.id}" data-reveal data-reveal-delay="${Math.min(index * 45, 260)}">
              <div class="portfolio-card__media">
                <img src="${imageUrl(project)}" alt="${project.title}" loading="lazy" />
              </div>
              <div class="portfolio-card__body">
                <div class="portfolio-card__topline">
                  <span class="portfolio-card__category">${categoryLabel(project.category)}</span>
                  <span class="portfolio-card__index">Case</span>
                </div>
                <h3>${project.title}</h3>
                <p class="portfolio-card__client">${project.client}</p>
                <p class="portfolio-card__summary">${project.summary}</p>
                <div class="portfolio-card__tags">
                  ${(project.tech || [])
                    .slice(0, 3)
                    .map((item) => `<span class="portfolio-card__tag">${item}</span>`)
                    .join("")}
                </div>
                <div class="portfolio-card__footer">
                  <span>${(project.metrics || []).length} destaque(s)</span>
                  <span>Abrir case</span>
                </div>
              </div>
            </article>
          `
        )
        .join("")
    : `<article class="portfolio-panel portfolio-panel--filters portfolio-empty"><strong>Nenhum case encontrado.</strong><p>Ajuste a busca ou os filtros para abrir outra combinacao de resultados.</p></article>`;

  const counter = qs("#portfolio-count");
  if (counter) counter.textContent = `${items.length} case(s)`;

  const activeTech = qs("#portfolio-active-tech");
  if (activeTech) activeTech.textContent = `Tecnologia: ${state.tech === "all" ? "todas" : state.tech}`;

  refreshShell();
}

function renderModal(project) {
  const modal = qs("#portfolio-modal");
  if (!modal) return;

  qs("#portfolio-modal-image").src = imageUrl(project);
  qs("#portfolio-modal-image").alt = project.title;
  qs("#portfolio-modal-category").textContent = categoryLabel(project.category);
  qs("#portfolio-modal-title").textContent = project.title;
  qs("#portfolio-modal-client").textContent = project.client;
  qs("#portfolio-modal-summary").textContent = project.summary || "";
  qs("#portfolio-modal-description").textContent = project.description;

  const tech = qs("#portfolio-modal-tech");
  tech.innerHTML = (project.tech || [])
    .map((item) => `<span class="portfolio-modal__tag">${item}</span>`)
    .join("");

  const metrics = qs("#portfolio-modal-metrics");
  metrics.innerHTML = (project.metrics || [])
    .map((item) => `<li>${item}</li>`)
    .join("");

  const cta = qs("#portfolio-modal-link");
  cta.href = project.link || "/#contato";

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.documentElement.style.overflow = "hidden";
}

function closeModal() {
  const modal = qs("#portfolio-modal");
  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.documentElement.style.overflow = "";
}

function initFilters() {
  qs("#portfolio-search-input")?.addEventListener("input", (event) => {
    state.query = event.target.value || "";
    renderProjects();
  });

  document.querySelectorAll(".portfolio-chip").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".portfolio-chip").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      state.filter = button.getAttribute("data-filter") || "all";
      renderProjects();
    });
  });
}

function initModalEvents() {
  qs("#portfolio-grid")?.addEventListener("click", (event) => {
    const card = event.target.closest(".portfolio-card");
    if (!card) return;

    const project = state.projects.find((item) => String(item.id) === card.getAttribute("data-id"));
    if (project) renderModal(project);
  });

  qs("#portfolio-modal")?.addEventListener("click", (event) => {
    if (event.target.closest("[data-close='true']")) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

async function boot() {
  initFilters();
  initModalEvents();

  try {
    const bundle = await loadBundle();
    state.projects = bundle.projects || [];
    renderTechTags();
    renderProjects();
  } catch (error) {
    console.error(error);
    const host = qs("#portfolio-grid");
    if (host) {
      host.innerHTML = `<article class="portfolio-panel portfolio-panel--filters portfolio-empty"><strong>Nao foi possivel carregar os cases agora.</strong><p>Tente novamente em instantes.</p></article>`;
    }
  }
}

boot();
