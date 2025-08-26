import { Router } from "express";
import {
  listTasks, createTask, updateTask, deleteTask, reorderColumn
} from "../services/store.js";

export const kanbanRouter = Router();

kanbanRouter.get("/", async (_req, res, next) => {
  try { res.json(await listTasks()); } catch (e) { next(e); }
});

kanbanRouter.post("/", async (req, res, next) => {
  try { res.status(201).json(await createTask(req.body || {})); } catch (e) { next(e); }
});

kanbanRouter.patch("/:id", async (req, res, next) => {
  try { res.json(await updateTask(req.params.id, req.body || {})); } catch (e) { next(e); }
});

kanbanRouter.delete("/:id", async (req, res, next) => {
  try { res.json(await deleteTask(req.params.id)); } catch (e) { next(e); }
});

/** Atualiza a ordem/coluna com array de IDs */
kanbanRouter.post("/reorder", async (req, res, next) => {
  try {
    const { status, orderedIds } = req.body || {};
    res.json(await reorderColumn(status, orderedIds || []));
  } catch (e) { next(e); }
});
