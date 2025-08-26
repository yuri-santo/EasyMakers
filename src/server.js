import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "./config/firebaseAdmin.js"; // inicializa Firestore

import { kanbanRouter } from "./routes/kanban.js";
import { notesRouter } from "./routes/notes.js";
import { calendarRouter } from "./routes/calendar.js";

const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Rate limiting básico (protege endpoints externos)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120
});
app.use("/api", limiter);

// API
app.use("/api/tasks", kanbanRouter);
app.use("/api/notes", notesRouter);
app.use("/api/calendar", calendarRouter);

// Static
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "..", "public")));

// SPA/Admin
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});
app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "admin.html"));
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal error" });
});

app.listen(PORT, () => {
  console.log(`EasyMakers rodando em http://localhost:${PORT}`);
});
