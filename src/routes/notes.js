import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import {
  getNotes, saveNotes,
  listNotePosts, createNotePost, updateNotePost, deleteNotePost
} from "../services/store.js";

export const notesRouter = Router();

const saveDocSchema = z.object({
  body: z.object({
    markdown: z.string().max(10000).default(""),
    html: z.string().max(15000).optional()
  })
});
const postCreateSchema = z.object({
  body: z.object({
    markdown: z.string().min(1).max(10000),
    title: z.string().max(140).optional()
  })
});
const postPatchSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    markdown: z.string().min(1).max(10000).optional(),
    title: z.string().max(140).optional()
  })
});

notesRouter.get("/", async (_req, res, next) => {
  try { res.json(await getNotes()); } catch (e) { next(e); }
});
notesRouter.post("/", validate(saveDocSchema), async (req, res, next) => {
  try { res.status(201).json(await saveNotes(req.body)); } catch (e) { next(e); }
});

notesRouter.get("/feed", async (_req, res, next) => {
  try { res.json(await listNotePosts()); } catch (e) { next(e); }
});
notesRouter.post("/feed", validate(postCreateSchema), async (req, res, next) => {
  try { res.status(201).json(await createNotePost(req.body)); } catch (e) { next(e); }
});
notesRouter.patch("/feed/:id", validate(postPatchSchema), async (req, res, next) => {
  try { res.json(await updateNotePost(req.params.id, req.body)); } catch (e) { next(e); }
});
notesRouter.delete("/feed/:id", async (req, res, next) => {
  try { res.json(await deleteNotePost(req.params.id)); } catch (e) { next(e); }
});
