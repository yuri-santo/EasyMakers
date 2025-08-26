import { adminAuth } from "../config/firebaseAdmin.js";

export const COOKIE_NAME = "__session";
export const CSRF_COOKIE = "XSRF-TOKEN";

const isProd = process.env.NODE_ENV === "production";
const cookieSecure = process.env.COOKIE_SECURE === "true" || isProd;

export function setSessionCookieOn(res, sessionCookie, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  res.cookie(COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeMs,
  });
}
export async function createSessionFromIdToken(res, idToken, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: maxAgeMs });
  setSessionCookieOn(res, sessionCookie, maxAgeMs);
  return sessionCookie;
}
export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.clearCookie(CSRF_COOKIE, { path: "/" });
}
export async function requireAuthPage(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.redirect("/login");
  try {
    req.user = await adminAuth.verifySessionCookie(token, true);
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
    req.user = await adminAuth.verifySessionCookie(token, true);
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
export const requireAuth = requireAuthPage;            
