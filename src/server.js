import "dotenv/config";
import path from "path";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";

import { kanbanRouter } from "./routes/kanban.js";
import { calendarRouter } from "./routes/calendar.js";
import { authRouter } from "./routes/auth.js";
import { publicContentRouter, adminContentRouter } from "./routes/content.js";
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
app.use("/api/content", apiLimiter, publicContentRouter);
app.use("/api/admin/content", apiLimiter, requireAuth, csrfProtection, adminContentRouter);
app.get("/login", (_req, res) => res.sendFile(path.join(publicDir, "login.html")));
app.get("/logout", (_req, res) => { clearSession(res); res.redirect("/login"); });
app.get("/blog", (_req, res) => res.sendFile(path.join(publicDir, "blog.html")));
app.get("/portfolio", (_req, res) => res.sendFile(path.join(publicDir, "portifolio.html")));
app.get("/portifolio", (_req, res) => res.sendFile(path.join(publicDir, "portifolio.html")));
app.get("/politica-de-privacidade", (_req, res) => res.sendFile(path.join(publicDir, "politica-de-privacidade.html")));

app.use(express.static(publicDir));

app.use("/api/tasks", apiLimiter, requireAuth, csrfProtection, kanbanRouter);
app.use("/api/calendar", apiLimiter, requireAuth, csrfProtection, calendarRouter);

app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal error" });
});

app.listen(process.env.PORT || 8080, () => {
  console.log("EasyMakers rodando em http://localhost:8080");
});
