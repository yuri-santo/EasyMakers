import { Router } from "express";
import {
  getNotes, saveNotes,
  listNotePosts, createNotePost, updateNotePost, deleteNotePost
} from "../services/store.js";

export const notesRouter = Router();

/** Editor “ao vivo” (compatível com seu painel atual) */
notesRouter.get("/", async (_req, res, next) => {
  try { res.json(await getNotes()); } catch (e) { next(e); }
});
notesRouter.post("/", async (req, res, next) => {
  try { res.status(201).json(await saveNotes(req.body || {})); } catch (e) { next(e); }
});

/** Feed tipo fórum */
notesRouter.get("/feed", async (_req, res, next) => {
  try { res.json(await listNotePosts()); } catch (e) { next(e); }
});
notesRouter.post("/feed", async (req, res, next) => {
  try { res.status(201).json(await createNotePost(req.body || {})); } catch (e) { next(e); }
});
notesRouter.patch("/feed/:id", async (req, res, next) => {
  try { res.json(await updateNotePost(req.params.id, req.body || {})); } catch (e) { next(e); }
});
notesRouter.delete("/feed/:id", async (req, res, next) => {
  try { res.json(await deleteNotePost(req.params.id)); } catch (e) { next(e); }
});
