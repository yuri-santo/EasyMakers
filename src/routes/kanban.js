import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { listTasks, createTask, updateTask, deleteTask, reorderColumn } from "../services/store.js";

export const kanbanRouter = Router();

const Status = z.enum(["todo","doing","done"]);

const createSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(140),
    status: Status.default("todo"),
    observation: z.string().max(1000).optional().default(""),
    startDate: z.string().datetime().optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    tags: z.array(z.string().max(32)).optional().default([]),
    assignees: z.array(z.string().max(128)).optional().default([]),
  })
});
const patchSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1).max(140).optional(),
    status: Status.optional(),
    observation: z.string().max(1000).optional(),
    startDate: z.string().datetime().optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    order: z.number().int().nonnegative().optional(),
  })
});
const reorderSchema = z.object({
  body: z.object({
    status: Status,
    orderedIds: z.array(z.string().min(1)).default([])
  })
});

kanbanRouter.get("/", async (_req, res, next) => {
  try { res.json(await listTasks()); } catch (e) { next(e); }
});
kanbanRouter.post("/", validate(createSchema), async (req, res, next) => {
  try { res.status(201).json(await createTask(req.body)); } catch (e) { next(e); }
});
kanbanRouter.patch("/:id", validate(patchSchema), async (req, res, next) => {
  try { res.json(await updateTask(req.params.id, req.body)); } catch (e) { next(e); }
});
kanbanRouter.delete("/:id", async (req, res, next) => {
  try { res.json(await deleteTask(req.params.id)); } catch (e) { next(e); }
});
kanbanRouter.post("/reorder", validate(reorderSchema), async (req, res, next) => {
  try { res.json(await reorderColumn(req.body.status, req.body.orderedIds)); } catch (e) { next(e); }
});
