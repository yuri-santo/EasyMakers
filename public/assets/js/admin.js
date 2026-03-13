const state = {
  bundle: {
    site: { hero: {}, about: {}, contact: {} },
    community: { faqs: [], testimonials: [] },
    comments: [],
    projects: [],
  },
  panel: "dashboard",
  selectedProjectId: "",
  selectedFaqId: "",
  selectedTestimonialId: "",
  projectQuery: "",
};

const PANEL_META = {
  dashboard: {
    title: "Central administrativa",
    subtitle: "Edite textos, portfolio e comunidade sem perder o estilo minimalista do site.",
  },
  portfolio: {
    title: "Portfolio",
    subtitle: "Gerencie os cases que aparecem na pagina publica.",
  },
  community: {
    title: "Comunidade",
    subtitle: "FAQ e depoimentos editaveis pela area administrativa.",
  },
  comments: {
    title: "Comentarios da comunidade",
    subtitle: "Comentarios publicados livremente pelos clientes no blog.",
  },
  kanban: {
    title: "Kanban interno",
    subtitle: "Acompanhe tarefas operacionais da equipe.",
  },
  calendar: {
    title: "Calendario operacional",
    subtitle: "Organize eventos locais e compromissos do time.",
  },
};

const api = {
  content: "/api/admin/content",
  tasks: "/api/tasks",
  calendar: "/api/calendar",
  myCalendar: "/api/calendar/myevents",
  logout: "/api/auth/logout",
};

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function readCookie(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

function csrf() {
  try {
    return decodeURIComponent(readCookie("XSRF-TOKEN") || "");
  } catch {
    return "";
  }
}

async function fetchJSON(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = csrf();
  if (token && !headers.has("X-CSRF-Token")) headers.set("X-CSRF-Token", token);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers,
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (response.status === 401) {
    window.location.assign("/login");
    throw new Error("Sessao expirada.");
  }

  if (!response.ok) {
    throw new Error((data && data.error) || raw || `HTTP ${response.status}`);
  }

  return data;
}

function toast(message, type = "ok") {
  const stack = qs("#toast-stack");
  if (!stack) return;

  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = message;
  stack.appendChild(item);
  window.setTimeout(() => item.remove(), 2600);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function splitComma(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ensureBundleShape(bundle) {
  return {
    site: bundle?.site || { hero: {}, about: {}, contact: {} },
    community: {
      faqs: bundle?.community?.faqs || [],
      testimonials: bundle?.community?.testimonials || [],
    },
    comments: bundle?.comments || [],
    projects: bundle?.projects || [],
  };
}

function setPanel(panel) {
  state.panel = panel;
  qsa(".nav-btn[data-panel]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panel === panel);
  });
  qsa(".panel").forEach((item) => {
    item.classList.toggle("is-active", item.id === `panel-${panel}`);
  });
  qs("#panel-title").textContent = PANEL_META[panel]?.title || PANEL_META.dashboard.title;
  qs("#panel-subtitle").textContent = PANEL_META[panel]?.subtitle || PANEL_META.dashboard.subtitle;
}

function fillSiteForm() {
  const site = state.bundle.site || {};
  qs("#site-hero-title").value = site.hero?.title || "";
  qs("#site-hero-lead").value = site.hero?.lead || "";
  qs("#site-hero-cta").value = site.hero?.ctaLabel || "";
  qs("#site-contact-email").value = site.contact?.email || "";
  qs("#site-about-title").value = site.about?.title || "";
  qs("#site-about-text").value = site.about?.text || "";
  qs("#site-contact-title").value = site.contact?.title || "";
  qs("#site-contact-text").value = site.contact?.text || "";
}

function renderStats() {
  qs("#stat-projects").textContent = String(state.bundle.projects.length);
  qs("#stat-faqs").textContent = String(state.bundle.community.faqs.length);
  qs("#stat-testimonials").textContent = String(state.bundle.community.testimonials.length);
  qs("#stat-comments").textContent = String(state.bundle.comments.length);
}

function filteredProjects() {
  const query = normalize(state.projectQuery);
  return state.bundle.projects.filter((project) => {
    if (!query) return true;
    return normalize([project.title, project.client, project.summary, ...(project.tech || [])].join(" ")).includes(query);
  });
}

function renderProjectsList() {
  const host = qs("#projects-list");
  if (!host) return;

  const items = filteredProjects();
  host.innerHTML = items.length
    ? items
        .map(
          (project) => `
            <article class="record-item ${String(project.id) === String(state.selectedProjectId) ? "is-selected" : ""}">
              <div class="record-copy">
                <strong>${escapeHtml(project.title)}</strong>
                <span>${escapeHtml(project.client)} - ${escapeHtml(project.category)}</span>
              </div>
              <button class="mini-btn" type="button" data-project-edit="${escapeHtml(project.id)}">Editar</button>
            </article>
          `
        )
        .join("")
    : `<div class="empty-list">Nenhum projeto encontrado.</div>`;

  qsa("[data-project-edit]", host).forEach((button) => {
    button.addEventListener("click", () => {
      const project = state.bundle.projects.find((item) => String(item.id) === button.dataset.projectEdit);
      if (project) fillProjectForm(project);
    });
  });
}

function fillProjectForm(project) {
  state.selectedProjectId = project?.id ? String(project.id) : "";
  qs("#project-id").value = state.selectedProjectId;
  qs("#project-title").value = project?.title || "";
  qs("#project-client").value = project?.client || "";
  qs("#project-category").value = project?.category || "apps";
  qs("#project-image").value = project?.image || "";
  qs("#project-summary").value = project?.summary || "";
  qs("#project-description").value = project?.description || "";
  qs("#project-tech").value = (project?.tech || []).join(", ");
  qs("#project-metrics").value = (project?.metrics || []).join("\n");
  qs("#project-link").value = project?.link || "/#contato";
  qs("#project-delete").disabled = !state.selectedProjectId;
  renderProjectsList();
}

function resetProjectForm() {
  fillProjectForm(null);
}

function renderFaqList() {
  const host = qs("#faq-admin-list");
  if (!host) return;

  const items = state.bundle.community.faqs;
  host.innerHTML = items.length
    ? items
        .map(
          (faq) => `
            <article class="record-item ${faq.id === state.selectedFaqId ? "is-selected" : ""}">
              <div class="record-copy">
                <strong>${escapeHtml(faq.question)}</strong>
                <span>${escapeHtml(faq.category)}</span>
              </div>
              <button class="mini-btn" type="button" data-faq-edit="${escapeHtml(faq.id)}">Editar</button>
            </article>
          `
        )
        .join("")
    : `<div class="empty-list">Nenhum FAQ cadastrado.</div>`;

  qsa("[data-faq-edit]", host).forEach((button) => {
    button.addEventListener("click", () => {
      const faq = items.find((item) => item.id === button.dataset.faqEdit);
      if (faq) fillFaqForm(faq);
    });
  });
}

function fillFaqForm(faq) {
  state.selectedFaqId = faq?.id || "";
  qs("#faq-id").value = state.selectedFaqId;
  qs("#faq-category").value = faq?.category || "";
  qs("#faq-tags").value = (faq?.tags || []).join(", ");
  qs("#faq-question").value = faq?.question || "";
  qs("#faq-answer").value = faq?.answer || "";
  qs("#faq-delete").disabled = !state.selectedFaqId;
  renderFaqList();
}

function resetFaqForm() {
  fillFaqForm(null);
}

function renderTestimonialList() {
  const host = qs("#testimonial-admin-list");
  if (!host) return;

  const items = state.bundle.community.testimonials;
  host.innerHTML = items.length
    ? items
        .map(
          (testimonial) => `
            <article class="record-item ${testimonial.id === state.selectedTestimonialId ? "is-selected" : ""}">
              <div class="record-copy">
                <strong>${escapeHtml(testimonial.name)}</strong>
                <span>${escapeHtml(testimonial.company)} - ${escapeHtml(testimonial.score)}</span>
              </div>
              <button class="mini-btn" type="button" data-testimonial-edit="${escapeHtml(testimonial.id)}">Editar</button>
            </article>
          `
        )
        .join("")
    : `<div class="empty-list">Nenhum depoimento cadastrado.</div>`;

  qsa("[data-testimonial-edit]", host).forEach((button) => {
    button.addEventListener("click", () => {
      const testimonial = items.find((item) => item.id === button.dataset.testimonialEdit);
      if (testimonial) fillTestimonialForm(testimonial);
    });
  });
}

function fillTestimonialForm(testimonial) {
  state.selectedTestimonialId = testimonial?.id || "";
  qs("#testimonial-id").value = state.selectedTestimonialId;
  qs("#testimonial-name").value = testimonial?.name || "";
  qs("#testimonial-role").value = testimonial?.role || "";
  qs("#testimonial-company").value = testimonial?.company || "";
  qs("#testimonial-score").value = testimonial?.score || "";
  qs("#testimonial-quote").value = testimonial?.quote || "";
  qs("#testimonial-delete").disabled = !state.selectedTestimonialId;
  renderTestimonialList();
}

function resetTestimonialForm() {
  fillTestimonialForm(null);
}

function renderCommentsList() {
  const host = qs("#comments-admin-list");
  if (!host) return;

  const items = state.bundle.comments;
  host.innerHTML = items.length
    ? items
        .map(
          (comment) => `
            <article class="comment-admin-item">
              <div class="comment-admin-copy">
                <strong>${escapeHtml(comment.author)}</strong>
                <span>${escapeHtml(comment.company || "Comunidade EasyMakers")}</span>
                <p>${escapeHtml(comment.message)}</p>
                <time>${escapeHtml(new Date(comment.createdAt).toLocaleString("pt-BR"))}</time>
              </div>
              <button class="mini-btn mini-btn-danger" type="button" data-comment-delete="${escapeHtml(comment.id)}">Excluir</button>
            </article>
          `
        )
        .join("")
    : `<div class="empty-list">Nenhum comentario publicado.</div>`;

  qsa("[data-comment-delete]", host).forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Excluir este comentario?")) return;
      try {
        await fetchJSON(`${api.content}/comments/${button.dataset.commentDelete}`, { method: "DELETE" });
        toast("Comentario removido.");
        await reloadContent();
      } catch (error) {
        toast(error.message || "Nao foi possivel excluir o comentario.", "err");
      }
    });
  });
}

function renderAllContent() {
  renderStats();
  fillSiteForm();
  renderProjectsList();
  renderFaqList();
  renderTestimonialList();
  renderCommentsList();
}

async function reloadContent() {
  state.bundle = ensureBundleShape(await fetchJSON(api.content));
  renderAllContent();
}

function projectPayload() {
  return {
    title: qs("#project-title").value.trim(),
    client: qs("#project-client").value.trim(),
    category: qs("#project-category").value,
    image: qs("#project-image").value.trim() || "painel.jpg",
    summary: qs("#project-summary").value.trim(),
    description: qs("#project-description").value.trim(),
    tech: splitComma(qs("#project-tech").value),
    metrics: splitLines(qs("#project-metrics").value),
    link: qs("#project-link").value.trim() || "/#contato",
  };
}

function faqPayload() {
  return {
    category: qs("#faq-category").value.trim(),
    tags: splitComma(qs("#faq-tags").value),
    question: qs("#faq-question").value.trim(),
    answer: qs("#faq-answer").value.trim(),
  };
}

function testimonialPayload() {
  return {
    name: qs("#testimonial-name").value.trim(),
    role: qs("#testimonial-role").value.trim(),
    company: qs("#testimonial-company").value.trim(),
    score: qs("#testimonial-score").value.trim(),
    quote: qs("#testimonial-quote").value.trim(),
  };
}

async function handleSiteSubmit(event) {
  event.preventDefault();
  const payload = {
    hero: {
      title: qs("#site-hero-title").value.trim(),
      lead: qs("#site-hero-lead").value.trim(),
      ctaLabel: qs("#site-hero-cta").value.trim(),
    },
    about: {
      title: qs("#site-about-title").value.trim(),
      text: qs("#site-about-text").value.trim(),
    },
    contact: {
      title: qs("#site-contact-title").value.trim(),
      text: qs("#site-contact-text").value.trim(),
      email: qs("#site-contact-email").value.trim(),
    },
  };

  try {
    await fetchJSON(`${api.content}/site`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    toast("Informacoes do site salvas.");
    await reloadContent();
  } catch (error) {
    toast(error.message || "Nao foi possivel salvar o site.", "err");
  }
}

async function handleProjectSubmit(event) {
  event.preventDefault();
  const id = qs("#project-id").value.trim();

  try {
    await fetchJSON(id ? `${api.content}/projects/${id}` : `${api.content}/projects`, {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(projectPayload()),
    });
    toast(id ? "Projeto atualizado." : "Projeto criado.");
    await reloadContent();
    if (id) {
      const project = state.bundle.projects.find((item) => String(item.id) === id);
      fillProjectForm(project || null);
    } else {
      fillProjectForm(state.bundle.projects[0] || null);
    }
  } catch (error) {
    toast(error.message || "Nao foi possivel salvar o projeto.", "err");
  }
}

async function handleFaqSubmit(event) {
  event.preventDefault();
  const id = qs("#faq-id").value.trim();

  try {
    await fetchJSON(id ? `${api.content}/faqs/${id}` : `${api.content}/faqs`, {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(faqPayload()),
    });
    toast(id ? "FAQ atualizado." : "FAQ criado.");
    await reloadContent();
    if (id) {
      const faq = state.bundle.community.faqs.find((item) => item.id === id);
      fillFaqForm(faq || null);
    } else {
      fillFaqForm(state.bundle.community.faqs[0] || null);
    }
  } catch (error) {
    toast(error.message || "Nao foi possivel salvar o FAQ.", "err");
  }
}

async function handleTestimonialSubmit(event) {
  event.preventDefault();
  const id = qs("#testimonial-id").value.trim();

  try {
    await fetchJSON(id ? `${api.content}/testimonials/${id}` : `${api.content}/testimonials`, {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(testimonialPayload()),
    });
    toast(id ? "Depoimento atualizado." : "Depoimento criado.");
    await reloadContent();
    if (id) {
      const testimonial = state.bundle.community.testimonials.find((item) => item.id === id);
      fillTestimonialForm(testimonial || null);
    } else {
      fillTestimonialForm(state.bundle.community.testimonials[0] || null);
    }
  } catch (error) {
    toast(error.message || "Nao foi possivel salvar o depoimento.", "err");
  }
}

async function handleDeleteProject() {
  const id = qs("#project-id").value.trim();
  if (!id || !window.confirm("Excluir este projeto?")) return;

  try {
    await fetchJSON(`${api.content}/projects/${id}`, { method: "DELETE" });
    toast("Projeto removido.");
    await reloadContent();
    resetProjectForm();
  } catch (error) {
    toast(error.message || "Nao foi possivel excluir o projeto.", "err");
  }
}

async function handleDeleteFaq() {
  const id = qs("#faq-id").value.trim();
  if (!id || !window.confirm("Excluir este FAQ?")) return;

  try {
    await fetchJSON(`${api.content}/faqs/${id}`, { method: "DELETE" });
    toast("FAQ removido.");
    await reloadContent();
    resetFaqForm();
  } catch (error) {
    toast(error.message || "Nao foi possivel excluir o FAQ.", "err");
  }
}

async function handleDeleteTestimonial() {
  const id = qs("#testimonial-id").value.trim();
  if (!id || !window.confirm("Excluir este depoimento?")) return;

  try {
    await fetchJSON(`${api.content}/testimonials/${id}`, { method: "DELETE" });
    toast("Depoimento removido.");
    await reloadContent();
    resetTestimonialForm();
  } catch (error) {
    toast(error.message || "Nao foi possivel excluir o depoimento.", "err");
  }
}

function initPanelNavigation() {
  qsa(".nav-btn[data-panel]").forEach((button) => {
    button.addEventListener("click", () => setPanel(button.dataset.panel));
  });
}

function initContentHandlers() {
  qs("#site-form")?.addEventListener("submit", handleSiteSubmit);
  qs("#project-form")?.addEventListener("submit", handleProjectSubmit);
  qs("#faq-form")?.addEventListener("submit", handleFaqSubmit);
  qs("#testimonial-form")?.addEventListener("submit", handleTestimonialSubmit);

  qs("#project-search")?.addEventListener("input", (event) => {
    state.projectQuery = event.target.value || "";
    renderProjectsList();
  });

  qs("#project-new")?.addEventListener("click", resetProjectForm);
  qs("#faq-new")?.addEventListener("click", resetFaqForm);
  qs("#testimonial-new")?.addEventListener("click", resetTestimonialForm);

  qs("#project-reset")?.addEventListener("click", resetProjectForm);
  qs("#faq-reset")?.addEventListener("click", resetFaqForm);
  qs("#testimonial-reset")?.addEventListener("click", resetTestimonialForm);

  qs("#project-delete")?.addEventListener("click", handleDeleteProject);
  qs("#faq-delete")?.addEventListener("click", handleDeleteFaq);
  qs("#testimonial-delete")?.addEventListener("click", handleDeleteTestimonial);

  qs("#refresh-data")?.addEventListener("click", async () => {
    await Promise.all([reloadContent(), loadTasksSafe(), initCalendarSafe()]);
    toast("Painel atualizado.");
  });
}

function initLogout() {
  qs("#logout")?.addEventListener("click", async () => {
    try {
      await fetchJSON(api.logout, { method: "POST" });
    } catch {
      // ignore
    }
    window.location.assign("/login");
  });
}

function iconButton(label, onClick, variant = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `mini-btn ${variant}`.trim();
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

const taskEls = {
  todo: () => qs("#todo"),
  doing: () => qs("#doing"),
  done: () => qs("#done"),
};

async function loadTasks() {
  ["todo", "doing", "done"].forEach((key) => {
    const host = taskEls[key]?.();
    if (host) host.innerHTML = `<li class="skel" style="height:52px"></li><li class="skel" style="height:52px"></li>`;
  });

  const tasks = await fetchJSON(api.tasks);
  const grouped = { todo: [], doing: [], done: [] };
  tasks.forEach((task) => {
    const bucket = grouped[task.status] || grouped.todo;
    bucket.push(task);
  });

  ["todo", "doing", "done"].forEach((key) => {
    const host = taskEls[key]?.();
    if (!host) return;
    host.innerHTML = "";
    grouped[key].forEach((task) => host.appendChild(taskItem(task)));
  });
  enableDnD();
}

function taskItem(task) {
  const item = document.createElement("li");
  item.draggable = true;
  item.dataset.id = task.id;
  item.dataset.status = task.status;

  const copy = document.createElement("div");
  copy.className = "task-copy";
  copy.innerHTML = `
    <span class="title">${escapeHtml(task.title)}</span>
    <span class="card-meta">Inicio: ${task.startDate ? new Date(task.startDate).toLocaleDateString("pt-BR") : "-"}</span>
    <span class="card-meta">Termino: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "-"}</span>
  `;

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(
    iconButton("Editar", () => openTaskModal(task)),
    iconButton(
      "Excluir",
      async () => {
        if (!window.confirm("Excluir tarefa?")) return;
        await fetchJSON(`${api.tasks}/${task.id}`, { method: "DELETE" });
        toast("Tarefa excluida.");
        await loadTasksSafe();
      },
      "mini-btn-danger"
    )
  );

  item.append(copy, actions);
  return item;
}

async function createTask(payload) {
  await fetchJSON(api.tasks, { method: "POST", body: JSON.stringify(payload) });
}

async function patchTask(id, patch) {
  await fetchJSON(`${api.tasks}/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

function openTaskModal(task = {}, isCreate = false) {
  const template = qs("#task-modal-tpl");
  if (!template) return;

  const fragment = template.content.cloneNode(true);
  const backdrop = qs(".modal-backdrop", fragment);
  qs("#task-modal-title", fragment).textContent = isCreate ? "Nova tarefa" : "Editar tarefa";
  qs("#fm-title", fragment).value = task.title || "";
  qs("#fm-observation", fragment).value = task.observation || "";
  qs("#fm-startDate", fragment).value = task.startDate ? String(task.startDate).slice(0, 10) : "";
  qs("#fm-dueDate", fragment).value = task.dueDate ? String(task.dueDate).slice(0, 10) : "";

  const close = () => backdrop.remove();
  qs(".modal-x", fragment).addEventListener("click", close);
  qs("#fm-cancel", fragment).addEventListener("click", close);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });

  qs("#fm-save", fragment).addEventListener("click", async () => {
    const payload = {
      title: qs("#fm-title", fragment).value.trim() || "Tarefa",
      observation: qs("#fm-observation", fragment).value.trim(),
      startDate: qs("#fm-startDate", fragment).value || null,
      dueDate: qs("#fm-dueDate", fragment).value || null,
    };

    if (isCreate) {
      payload.status = task.status || "todo";
      await createTask(payload);
      toast("Tarefa criada.");
    } else {
      await patchTask(task.id, payload);
      toast("Tarefa atualizada.");
    }
    close();
    await loadTasksSafe();
  });

  document.body.appendChild(fragment);
}

function enableDnD() {
  qsa(".dropzone").forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("dragover");
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("dragover");
    });

    zone.addEventListener("drop", async (event) => {
      event.preventDefault();
      zone.classList.remove("dragover");
      const dragged = document.querySelector("li[draggable][data-dragging='1']");
      if (!dragged) return;
      dragged.removeAttribute("data-dragging");
      zone.appendChild(dragged);
      await patchTask(dragged.dataset.id, { status: zone.id, order: Date.now() });
      toast("Tarefa movida.");
    });
  });

  qsa("li[draggable]").forEach((item) => {
    item.addEventListener("dragstart", () => {
      item.dataset.dragging = "1";
    });
    item.addEventListener("dragend", () => {
      item.removeAttribute("data-dragging");
    });
  });
}

function initTaskButtons() {
  qs("#quick-add")?.addEventListener("click", () => openTaskModal({ status: "todo" }, true));
  qs("#add-todo")?.addEventListener("click", () => openTaskModal({ status: "todo" }, true));
  qs("#add-doing")?.addEventListener("click", () => openTaskModal({ status: "doing" }, true));
  qs("#add-done")?.addEventListener("click", () => openTaskModal({ status: "done" }, true));
}

let calendar = null;

async function initCalendar() {
  const el = qs("#calendar");
  if (!el || !window.FullCalendar) return;

  const events = await fetchJSON(api.calendar);
  if (calendar) calendar.destroy();

  calendar = new window.FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    height: 700,
    events,
  });
  calendar.render();
}

function initCalendarForm() {
  qs("#add-local-event")?.addEventListener("click", async () => {
    const start = qs("#evt-start").value;
    const end = qs("#evt-end").value || start;
    const title = qs("#evt-title").value.trim() || "Evento";
    if (!start) {
      toast("Informe a data inicial.", "err");
      return;
    }

    try {
      await fetchJSON(api.myCalendar, {
        method: "POST",
        body: JSON.stringify({ title, start, end }),
      });
      qs("#evt-title").value = "";
      toast("Evento adicionado.");
      await initCalendarSafe();
    } catch (error) {
      toast(error.message || "Nao foi possivel adicionar o evento.", "err");
    }
  });
}

async function loadTasksSafe() {
  try {
    await loadTasks();
  } catch (error) {
    console.error(error);
    ["todo", "doing", "done"].forEach((key) => {
      const host = taskEls[key]?.();
      if (host) host.innerHTML = `<li class="empty-list">Nao foi possivel carregar as tarefas.</li>`;
    });
  }
}

async function initCalendarSafe() {
  try {
    await initCalendar();
  } catch (error) {
    console.error(error);
    const host = qs("#calendar");
    if (host) host.innerHTML = `<div class="empty-list">Nao foi possivel carregar o calendario.</div>`;
  }
}

function initBootState() {
  setPanel("dashboard");
  resetProjectForm();
  resetFaqForm();
  resetTestimonialForm();
}

async function boot() {
  initPanelNavigation();
  initContentHandlers();
  initLogout();
  initTaskButtons();
  initCalendarForm();
  initBootState();

  await Promise.all([reloadContent(), loadTasksSafe(), initCalendarSafe()]);
}

boot();
