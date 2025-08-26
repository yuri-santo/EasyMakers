import { firestore, FieldValue } from "../config/firebaseAdmin.js";
import { v4 as uuid } from "uuid";

const tasksCol     = () => firestore.collection("tasks");
const notesDoc     = () => firestore.collection("notes").doc("main");  
const notesFeedCol = () => firestore.collection("note_posts");          
const eventsCol    = () => firestore.collection("events");              

/** ============= KANBAN ============= */
export async function listTasks() {
  const snap = await tasksCol().get();
  const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const weight = { todo: 0, doing: 1, done: 2 };
  tasks.sort((a, b) => {
    const s = (weight[a.status] ?? 9) - (weight[b.status] ?? 9);
    if (s) return s;
    const ao = a.order ?? a.createdAt?.toMillis?.() ?? 0;
    const bo = b.order ?? b.createdAt?.toMillis?.() ?? 0;
    return ao - bo;
  });
  return tasks;
}
export async function createTask(payload) {
  const id = uuid();
  const data = {
    title: payload.title || "Nova tarefa",
    status: payload.status || "todo",
    observation: payload.observation || "",
    startDate: payload.startDate || null,
    dueDate: payload.dueDate || null,
    tags: payload.tags || [],
    assignees: payload.assignees || [],
    order: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
  await tasksCol().doc(id).set(data);
  return { id, ...data };
}
export async function updateTask(id, patch) {
  patch.updatedAt = FieldValue.serverTimestamp();
  await tasksCol().doc(id).set(patch, { merge: true });
  const snap = await tasksCol().doc(id).get();
  if (!snap.exists) throw new Error("Task not found");
  return { id, ...snap.data() };
}
export async function deleteTask(id) {
  await tasksCol().doc(id).delete();
  return { ok: true };
}
export async function reorderColumn(status, orderedIds = []) {
  const batch = firestore.batch();
  orderedIds.forEach((id, idx) => {
    batch.set(
      tasksCol().doc(id),
      { status, order: idx, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  });
  await batch.commit();
  return { ok: true };
}
export async function getNotes() {
  const snap = await notesDoc().get();
  return snap.exists ? snap.data() : { html: "", markdown: "" };
}
export async function saveNotes({ html = "", markdown = "" }) {
  await notesDoc().set(
    { html, markdown, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  const snap = await notesDoc().get();
  return snap.data();
}
export async function listNotePosts() {
  const snap = await notesFeedCol().orderBy("createdAt", "desc").get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function createNotePost({ markdown = "", title = "" }) {
  const id = uuid();
  const data = {
    title: title || markdown.split("\n")[0]?.slice(0, 80) || "Nota",
    markdown,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
  await notesFeedCol().doc(id).set(data);
  return { id, ...data };
}
export async function updateNotePost(id, { markdown = "", title }) {
  const patch = { markdown, updatedAt: FieldValue.serverTimestamp() };
  if (title !== undefined) patch.title = title;
  await notesFeedCol().doc(id).set(patch, { merge: true });
  const snap = await notesFeedCol().doc(id).get();
  return { id, ...snap.data() };
}
export async function deleteNotePost(id) {
  await notesFeedCol().doc(id).delete();
  return { ok: true };
}
export async function getMyEvents() {
  const snap = await eventsCol().where("source", "==", "local").get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function saveMyEvent(evt) {
  const id = evt.id || uuid();
  const data = {
    title: evt.title || "Evento",
    start: evt.start,
    end: evt.end || evt.start,
    allDay: !!evt.allDay,
    source: "local",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
  await eventsCol().doc(id).set(data, { merge: true });
  return { id, ...data };
}
export async function upsertIcsEvents(source, events = []) {
  const batch = firestore.batch();
  events.forEach(e => {
    if (!e?.id) return;
    batch.set(
      eventsCol().doc(e.id),
      { ...e, source, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  });
  await batch.commit();
  return { ok: true };
}
