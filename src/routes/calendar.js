import { Router } from "express";
import { unifiedIcs } from "../services/calendar.js";
import { getMyEvents, saveMyEvent } from "../services/store.js";

export const calendarRouter = Router();

// Retorna ICS (Google/Outlook) + eventos locais
calendarRouter.get("/", async (_req, res, next) => {
  try {
    const [ics, locals] = await Promise.all([
      unifiedIcs({
        googleUrl: process.env.GOOGLE_ICS,
        outlookUrl: process.env.OUTLOOK_ICS
      }),
      getMyEvents()
    ]);
    res.json([...ics, ...locals]);
  } catch (e) { next(e); }
});

// CRUD mínimo para eventos locais
calendarRouter.get("/myevents", async (_req, res, next) => {
  try {
    res.json(await getMyEvents());
  } catch (e) { next(e); }
});

calendarRouter.post("/myevents", async (req, res, next) => {
  try {
    const created = await saveMyEvent(req.body || {});
    res.status(201).json(created);
  } catch (e) { next(e); }
});
