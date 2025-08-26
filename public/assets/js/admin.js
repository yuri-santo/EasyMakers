// Painel refinado: Kanban + DnD + Fórum de notas + Modais + Toasts + Calendar + CSRF
const api = {
  tasks: "/api/tasks",
  tasksReorder: "/api/tasks/reorder",
  notes: "/api/notes",
  notesFeed: "/api/notes/feed",
  calAll: "/api/calendar",
  calMy: "/api/calendar/myevents",
};

const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => [...el.querySelectorAll(s)];

function readCookie(name){
  return document.cookie.split("; ").find(row => row.startsWith(name + "="))?.split("=")[1];
}
function csrf() {
  try { return decodeURIComponent(readCookie("XSRF-TOKEN") || ""); } catch { return ""; }
}

/* ---------------- Utils ---------------- */
async function fetchJSON(url, options = {}){
  const headers = Object.assign({}, options.headers || {}, { "X-CSRF-Token": csrf() });
  const res = await fetch(url, {
    credentials: "same-origin",     // garante envio dos cookies da sessão
    ...options,
    headers
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}\n${txt.slice(0,500)}`);
  try { return JSON.parse(txt); } catch { throw new Error(`Resposta não-JSON @ ${url}\n${txt.slice(0,500)}`); }
}
function toast(msg, type="ok"){
  const stack = qs("#toast-stack") || (() => {
    const d = document.createElement("div"); d.id = "toast-stack"; document.body.appendChild(d); return d;
  })();
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function fmtDate(d){
  try {
    if (!d) return "—";
    if (d._seconds) return new Date(d._seconds * 1000).toLocaleString();
    if (typeof d === "string") return new Date(d).toLocaleString();
    return new Date(d).toLocaleString();
  } catch { return "—"; }
}

/* ---------------- Logout ---------------- */
qs("#logout")?.addEventListener("click", async () => {
  try { await fetchJSON("/api/auth/logout", { method:"POST" }); } catch {}
  window.location.href = "/login";
});

/* ---------------- Tabs (left) ---------------- */
qsa(".nav-btn[data-leftpanel]").forEach(btn => {
  btn.addEventListener("click", () => {
    qsa(".nav-btn[data-leftpanel]").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    const target = btn.getAttribute("data-leftpanel");
    qsa(".left-panels .panel").forEach(p => p.classList.remove("is-active"));
    qs(`#panel-${target}`)?.classList.add("is-active");
  });
});

/* ---------------- Kanban ---------------- */
const els = {
  lists: { todo: qs("#todo"), doing: qs("#doing"), done: qs("#done") },
  addTodo: qs("#add-todo"),
  addDoing: qs("#add-doing"),
  addDone: qs("#add-done"),
  quickAdd: qs("#quick-add"),
};

els.addTodo?.addEventListener("click", () => newTask("todo"));
els.addDoing?.addEventListener("click", () => newTask("doing"));
els.addDone?.addEventListener("click", () => newTask("done"));
els.quickAdd?.addEventListener("click", () => newTask("todo"));

async function loadTasks() {
  for (const k of ["todo","doing","done"]) {
    if (els.lists[k]) els.lists[k].innerHTML = `<li class="skel" style="height:44px"></li><li class="skel" style="height:44px"></li>`;
  }
  const tasks = await fetchJSON(api.tasks);
  const by = { todo: [], doing: [], done: [] };
  for (const t of tasks) (by[t.status] ??= []).push(t);
  renderTasks(by);
  enableDnD();
}

function renderTasks(by){
  for (const k of ["todo","doing","done"]) if (els.lists[k]) els.lists[k].innerHTML = "";
  Object.keys(by).forEach(status => by[status].forEach(t => els.lists[status]?.append(taskItem(t))));
}
function taskItem(t){
  const li = document.createElement("li");
  li.draggable = true; li.dataset.id = t.id; li.dataset.status = t.status;

  const block = document.createElement("div");
  block.style.display = "flex"; block.style.flexDirection = "column";

  const title = document.createElement("span");
  title.className = "title"; title.textContent = t.title;

  const meta = document.createElement("span");
  meta.className = "card-meta";
  const sd = t.startDate ? new Date(t.startDate).toLocaleDateString() : "—";
  const dd = t.dueDate   ? new Date(t.dueDate).toLocaleDateString()   : "—";
  meta.textContent = `Início: ${sd} • Término: ${dd}`;

  const obs = document.createElement("span");
  obs.className = "card-meta";
  obs.textContent = t.observation ? `Obs: ${t.observation}` : " ";

  block.append(title, meta, obs);

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(
    iconBtn("✎", "Editar", () => openTaskModal(t)),
    iconBtn("×", "Excluir", async () => { if(!confirm("Excluir tarefa?")) return; await delTask(t.id); toast("Tarefa excluída"); await loadTasks(); }, "danger")
  );

  li.append(block, actions);
  return li;
}
function iconBtn(txt, title, onclick, variant){
  const b = document.createElement("button");
  b.className = "btn icon" + (variant ? ` ${variant}` : "");
  b.textContent = txt; b.title = title; b.onclick = onclick; return b;
}

async function newTask(status){ openTaskModal({ status, title:"Nova tarefa" }, true); }
async function createTask(payload){
  await fetchJSON(api.tasks, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
  toast("Tarefa criada");
}
async function patchTask(id, patch){
  const data = await fetchJSON(`${api.tasks}/${id}`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(patch) });
  return data;
}
async function delTask(id){ await fetchJSON(`${api.tasks}/${id}`, { method:"DELETE" }); }

/* ---- Modal de Tarefa ---- */
function openTaskModal(task={}, isCreate=false){
  const tpl = qs("#task-modal-tpl");
  const node = tpl.content.cloneNode(true);
  const backdrop = node.querySelector(".modal-backdrop");
  const elTitle = node.querySelector("#fm-title");
  const elObs   = node.querySelector("#fm-observation");
  const elStart = node.querySelector("#fm-startDate");
  const elDue   = node.querySelector("#fm-dueDate");
  const btnSave = node.querySelector("#fm-save");
  const btnCancel = node.querySelector("#fm-cancel");
  const btnX = node.querySelector(".modal-x");
  node.querySelector("#task-modal-title").textContent = isCreate ? "Nova tarefa" : "Editar tarefa";

  elTitle.value = task.title || "";
  elObs.value = task.observation || "";
  elStart.value = task.startDate ? String(task.startDate).slice(0,10) : "";
  elDue.value   = task.dueDate ? String(task.dueDate).slice(0,10) : "";

  const close = () => backdrop.remove();
  btnCancel.onclick = close; btnX.onclick = close;
  backdrop.addEventListener("click", e => { if(e.target === backdrop) close(); });

  btnSave.onclick = async () => {
    const payload = {
      title: elTitle.value.trim() || "Tarefa",
      observation: elObs.value.trim(),
      startDate: elStart.value || null,
      dueDate: elDue.value || null
    };
    if (isCreate) { payload.status = task.status || "todo"; await createTask(payload); }
    else { await patchTask(task.id, payload); toast("Tarefa atualizada"); }
    close(); await loadTasks();
  };

  document.body.appendChild(node);
}

/* ---- Drag & Drop ---- */
function enableDnD(){
  qsa(".dropzone").forEach(zone => {
    zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("dragover"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", async e => {
      e.preventDefault(); zone.classList.remove("dragover");
      const status = zone.id;
      const dragging = document.querySelector("li[draggable][data-dragging='1']");
      if (!dragging) return;
      const id = dragging.dataset.id;
      zone.appendChild(dragging);
      dragging.dataset.status = status;
      dragging.removeAttribute("data-dragging");
      await patchTask(id, { status, order: Date.now() });
      toast("Tarefa movida");
    });
  });
  qsa("li[draggable]").forEach(li => {
    li.addEventListener("dragstart", () => li.dataset.dragging = "1");
    li.addEventListener("dragend", () => li.removeAttribute("data-dragging"));
  });
}

/* ---------------- Notas ---------------- */
const notesEl = qs("#notes");
const notesPreview = qs("#notes-preview");
const saveNotesBtn = qs("#save-notes");
const notesStatus = qs("#notes-status");

function escapeHtml(s){ return (s ?? "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[m])); }
function mdToHtml(src){
  const esc = escapeHtml(src);
  let out = esc;
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/_([^_]+)_/g, "<em>$1</em>");
  out = out.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  out = out.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  out = out.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a href="$2" target="_blank" rel="noopener">$1</a>`);
  out = out.replace(/^\s*-\s+(.+)$/gm, "<li>$1</li>");
  out = out.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m.replace(/\n/g,"")}</ul>`);
  out = out.replace(/^(?!<h\d|<ul|<li|<p|<code|<strong|<em|<a)(.+)$/gm, "<p>$1</p>");
  return out;
}

async function loadNotesLive(){
  const data = await fetchJSON(api.notes);
  const md = data.markdown || data.html || "";
  if (notesEl) notesEl.value = md;
  if (notesPreview) notesPreview.innerHTML = mdToHtml(md);
}
notesEl?.addEventListener("input", () => {
  if (notesStatus) notesStatus.className = "status-dot saving";
  if (notesPreview) notesPreview.innerHTML = mdToHtml(notesEl.value);
});

saveNotesBtn?.addEventListener("click", async () => {
  try {
    const markdown = notesEl?.value || "";
    await fetchJSON(api.notes, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ markdown }) });
    await fetchJSON(api.notesFeed, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ markdown }) });
    if (notesStatus) {
      notesStatus.className = "status-dot saved";
      setTimeout(() => notesStatus.className = "status-dot", 1500);
    }
    toast("Nota publicada");
    await loadNotesFeed();
  } catch (e) {
    toast("Erro ao salvar nota", "err");
    console.error(e);
  }
});

const feedEl = qs("#notes-feed");
async function loadNotesFeed(){
  if (feedEl) feedEl.innerHTML = `<div class="skel" style="height:72px"></div><div class="skel" style="height:72px"></div>`;
  const posts = await fetchJSON(api.notesFeed);
  if (!feedEl) return;
  feedEl.innerHTML = "";
  if (!posts.length) { const empty = qs("#notes-empty"); if (empty) empty.hidden = false; return; }
  const empty = qs("#notes-empty"); if (empty) empty.hidden = true;
  posts.forEach(p => feedEl.append(noteCard(p)));
}
function noteCard(p){
  const wrap = document.createElement("div"); wrap.className = "note-card";
  const header = document.createElement("div"); header.className = "header";
  const avatar = document.createElement("div"); avatar.className = "avatar";
  avatar.textContent = (p.title?.trim?.()[0] || "N").toUpperCase();
  const title = document.createElement("div"); title.className = "title";
  title.textContent = p.title || "Nota";
  const meta = document.createElement("div"); meta.className = "meta";
  meta.textContent = fmtDate(p.createdAt);
  header.append(avatar, title, meta);

  const body = document.createElement("div"); body.className = "body";
  body.innerHTML = mdToHtml(p.markdown || "");

  const actions = document.createElement("div"); actions.className = "actions";
  const edit = iconBtn("✎", "Editar nota", () => openNoteModal(p));
  const del  = iconBtn("×", "Excluir nota", async () => {
    if(!confirm("Excluir esta nota?")) return;
    await fetchJSON(`${api.notesFeed}/${p.id}`, { method:"DELETE" });
    toast("Nota excluída");
    await loadNotesFeed();
  }, "danger");
  actions.append(edit, del);

  wrap.append(header, body, actions);
  return wrap;
}
function openNoteModal(note){
  const tpl = qs("#note-modal-tpl");
  const node = tpl.content.cloneNode(true);
  const backdrop = node.querySelector(".modal-backdrop");
  const x = node.querySelector(".modal-x");
  const title = node.querySelector("#fn-title");
  const md = node.querySelector("#fn-markdown");
  const save = node.querySelector("#fn-save");
  const cancel = node.querySelector("#fn-cancel");

  title.value = note.title || "";
  md.value = note.markdown || "";

  const close = () => backdrop.remove();
  x.onclick = close; cancel.onclick = close;
  backdrop.addEventListener("click", e => { if(e.target === backdrop) close(); });

  save.onclick = async () => {
    await fetchJSON(`${api.notesFeed}/${note.id}`, {
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ title: title.value, markdown: md.value })
    });
    toast("Nota atualizada");
    close(); await loadNotesFeed();
  };

  document.body.appendChild(node);
}

/* ---------------- Calendário ---------------- */
let calendar;
async function initCalendar(){
  const events = await fetchJSON(api.calAll);
  const el = document.getElementById("calendar");
  if (!el || !window.FullCalendar) return;
  if (calendar) calendar.destroy();
  calendar = new FullCalendar.Calendar(el, { initialView:"dayGridMonth", height:700, events });
  calendar.render();
}
qs("#add-local-event")?.addEventListener("click", async () => {
  const title = qs("#evt-title")?.value || "Evento";
  const start = qs("#evt-start")?.value;
  const end   = qs("#evt-end")?.value || start;
  if(!start) return alert("Informe a data/hora inicial");
  await fetchJSON(api.calMy, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ title, start, end }) });
  toast("Evento adicionado");
  await initCalendar();
  const t = qs("#evt-title"); if (t) t.value = "";
});

/* ---------------- Refresh ---------------- */
qs("#refresh-data")?.addEventListener("click", async () => {
  await Promise.all([loadTasks(), loadNotesLive(), loadNotesFeed(), initCalendar()]);
  toast("Atualizado");
});

/* ---------------- Boot ---------------- */
(async function(){
  await Promise.all([loadTasks(), loadNotesLive(), loadNotesFeed(), initCalendar()]);
})();

(() => {
  const style = 'color:#6f42c1;font-weight:700;font-size:14px';
  console.log('%cEasyMakers 🦉', style);
})();