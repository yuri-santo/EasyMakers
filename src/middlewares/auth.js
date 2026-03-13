import crypto from "node:crypto";
import { adminAuth } from "../config/firebaseAdmin.js";

export const COOKIE_NAME = "__session";
export const CSRF_COOKIE = "XSRF-TOKEN";

const isProd = process.env.NODE_ENV === "production";
const cookieSecure = process.env.COOKIE_SECURE === "true" || isProd;
const localAdminEmail = String(process.env.INIT_ADMIN_EMAIL || "").trim().toLowerCase();
const localAdminPassword = String(process.env.INIT_ADMIN_PASSWORD || "");
const localSessionSecret = String(
  process.env.SESSION_SECRET || process.env.COOKIE_SECRET || process.env.INIT_ADMIN_PASSWORD || "easy-local-session"
);

function signLocalSessionPayload(payload) {
  return crypto.createHmac("sha256", localSessionSecret).update(payload).digest("base64url");
}

function buildCsrfToken(maxAgeMs) {
  const csrfToken = crypto.randomBytes(24).toString("hex");
  return { csrfToken, maxAgeMs };
}

function createLocalSessionToken(user, maxAgeMs) {
  const payload = Buffer.from(
    JSON.stringify({
      uid: user.uid || "local-admin",
      email: user.email,
      name: user.name || "Administrador",
      authType: "local",
      exp: Date.now() + maxAgeMs,
    }),
    "utf8"
  ).toString("base64url");

  const signature = signLocalSessionPayload(payload);
  return `local.${payload}.${signature}`;
}

function verifyLocalSessionToken(token) {
  if (!token?.startsWith("local.")) return null;

  const [, payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = signLocalSessionPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!data?.exp || data.exp < Date.now()) return null;

  return {
    uid: data.uid,
    email: data.email,
    name: data.name,
    authType: "local",
  };
}

async function resolveSessionUser(token) {
  const localUser = verifyLocalSessionToken(token);
  if (localUser) return localUser;
  return adminAuth.verifySessionCookie(token, true);
}

function secureCompare(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function setSessionCookieOn(res, sessionCookie, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  res.cookie(COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeMs,
  });
}
export function setCsrfCookieOn(res, csrfToken, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  res.cookie(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeMs,
  });
}
export async function createSessionFromIdToken(res, idToken, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: maxAgeMs });
  setSessionCookieOn(res, sessionCookie, maxAgeMs);
  const { csrfToken } = buildCsrfToken(maxAgeMs);
  setCsrfCookieOn(res, csrfToken, maxAgeMs);
  return { sessionCookie, csrfToken };
}
export async function createLocalSession(res, email, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  const sessionCookie = createLocalSessionToken(
    {
      uid: "local-admin",
      email,
      name: "Administrador",
    },
    maxAgeMs
  );
  setSessionCookieOn(res, sessionCookie, maxAgeMs);
  const { csrfToken } = buildCsrfToken(maxAgeMs);
  setCsrfCookieOn(res, csrfToken, maxAgeMs);
  return { sessionCookie, csrfToken };
}
export function validateInitialAdminLogin(email, password) {
  if (!localAdminEmail || !localAdminPassword) return { ok: false, reason: "missing-env" };
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");
  return {
    ok: secureCompare(normalizedEmail, localAdminEmail) && secureCompare(normalizedPassword, localAdminPassword),
    reason: "invalid-credentials",
  };
}
export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.clearCookie(CSRF_COOKIE, { path: "/" });
}
export async function requireAuthPage(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.redirect("/login");
  try {
    req.user = await resolveSessionUser(token);
    return next();
  } catch {
    clearSession(res);
    return res.redirect("/login");
  }
}
export async function ensureLoggedInAPI(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "auth/unauthenticated" });
  try {
    req.user = await resolveSessionUser(token);
    return next();
  } catch {
    clearSession(res);
    return res.status(401).json({ error: "auth/invalid-session" });
  }
}
export function csrfProtection(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get("X-CSRF-Token");
  if (cookieToken && headerToken && cookieToken === headerToken) return next();
  return res.status(403).json({ error: "CSRF token invalid" });
}
export const createSession = createSessionFromIdToken; 
export const requireAuth = ensureLoggedInAPI;
