import "dotenv/config";
import fs from "fs";
import path from "path";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";

import { kanbanRouter } from "./routes/kanban.js";
import { notesRouter } from "./routes/notes.js";
import { calendarRouter } from "./routes/calendar.js";
import { authRouter } from "./routes/auth.js";
import { requireAuth, requireAuthPage, csrfProtection, clearSession } from "./middlewares/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://www.gstatic.com",          
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com"
        ],
        scriptSrcElem: [
          "'self'",
          "https://www.gstatic.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com"
        ],
        styleSrcElem: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",     
          "https://cdn.jsdelivr.net",
          "https://unpkg.com",
          "data:"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://cdn-icons-png.flaticon.com"
        ],
        connectSrc: [
          "'self'",
          "https://www.googleapis.com",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com"
        ],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        baseUri: ["'self'"]
      }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const authLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });
const apiLimiter  = rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false });

app.get("/admin", requireAuthPage, (_req, res) => res.sendFile(path.join(publicDir, "admin.html")));
app.get("/admin.html", requireAuthPage, (_req, res) => res.sendFile(path.join(publicDir, "admin.html")));
app.use("/api/auth", authLimiter, authRouter);
app.get("/login", (_req, res) => res.sendFile(path.join(publicDir, "login.html")));
app.get("/logout", (_req, res) => { clearSession(res); res.redirect("/login"); });
app.get("/firebase_config.json", (_req, res) => {
  const filePath = path.join(publicDir, "firebase_config.json");
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  const cfg = {
    apiKey: process.env.FIREBASE_WEB_API_KEY,
    authDomain:
      process.env.FIREBASE_AUTH_DOMAIN ||
      (process.env.FIREBASE_PROJECT_ID ? `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com` : undefined),
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      (process.env.FIREBASE_PROJECT_ID ? `${process.env.FIREBASE_PROJECT_ID}.appspot.com` : undefined),
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  };
  if (!cfg.apiKey || !cfg.projectId || !cfg.appId) {
    return res
      .status(404)
      .json({ error: "Firebase web config missing. Crie public/firebase_config.json ou defina FIREBASE_WEB_* no .env." });
  }
  res.type("application/json").send(JSON.stringify(cfg));
});

app.use(express.static(publicDir));

app.use("/api/tasks", apiLimiter, requireAuth, csrfProtection, kanbanRouter);
app.use("/api/notes", apiLimiter, requireAuth, csrfProtection, notesRouter);
app.use("/api/calendar", apiLimiter, requireAuth, csrfProtection, calendarRouter);

app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal error" });
});

app.listen(process.env.PORT || 8080, () => {
  console.log("EasyMakers rodando em http://localhost:8080");
});
