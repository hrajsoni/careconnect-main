/**
 * Stateless CSRF protection for mutating requests.
 *
 * The frontend fetches a token from /api/auth/csrf-token, stores it in memory,
 * and sends it as X-CSRF-Token for POST/PUT/PATCH/DELETE requests.
 * Tokens are kept in memory with a 24-hour TTL, which is acceptable for this
 * project setup and keeps the implementation simple for demonstration.
 */

const crypto = require("crypto");

const tokenStore = new Map();
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of tokenStore) {
    if (now > expiry) tokenStore.delete(token);
  }
}, 30 * 60 * 1000).unref();

function generateCsrfToken() {
  const token = crypto.randomBytes(32).toString("hex");
  tokenStore.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

function verifyCsrfToken(token) {
  if (!token || !tokenStore.has(token)) return false;

  const expiry = tokenStore.get(token);
  if (Date.now() > expiry) {
    tokenStore.delete(token);
    return false;
  }

  return true;
}

function csrfMiddleware(req, res, next) {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) return next();

  const token = req.headers["x-csrf-token"];

  if (!verifyCsrfToken(token)) {
    return res.status(403).json({
      success: false,
      message: "Invalid or missing CSRF token. Please refresh and try again.",
    });
  }

  return next();
}

module.exports = { csrfMiddleware, generateCsrfToken };
