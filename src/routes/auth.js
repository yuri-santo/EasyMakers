// src/routes/auth.js
import { Router } from "express";
import { auth as fbAuth } from "../config/firebaseAdmin.js";
import { createSession, createLocalSession, clearSession, requireAuth, validateInitialAdminLogin } from "../middlewares/auth.js";

export const authRouter = Router();

// Troca idToken (Firebase client) por session cookie HttpOnly
authRouter.post("/session", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ error: "idToken required" });
    const { csrfToken } = await createSession(res, idToken);
    return res.json({ ok: true, csrfToken });
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = validateInitialAdminLogin(email, password);
    if (!result.ok) {
      if (result.reason === "missing-env") {
        return res.status(500).json({ error: "INIT_ADMIN_EMAIL/INIT_ADMIN_PASSWORD not configured" });
      }
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { csrfToken } = await createLocalSession(res, String(email || "").trim());
    return res.json({ ok: true, csrfToken });
  } catch {
    return res.status(500).json({ error: "Unable to create local session" });
  }
});

// Logout: limpa cookie e (tenta) revogar refresh tokens
authRouter.post("/logout", requireAuth, async (req, res) => {
  try {
    if (req.user?.authType !== "local") {
      await fbAuth.revokeRefreshTokens(req.user.uid);
    }
  } catch {}
  clearSession(res);
  return res.json({ ok: true });
});

// Whoami
authRouter.get("/me", requireAuth, (req, res) => {
  const { uid, email, name, picture } = req.user;
  res.json({ uid, email, name, picture, authType: req.user?.authType || "firebase" });
});
