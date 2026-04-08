/**
 * csrfToken.js — Module-level CSRF token store for the frontend.
 *
 * The token is kept in a plain module variable (not localStorage,
 * not a cookie) so it lives only in the JS heap for this page session.
 * It is fetched once on app load by CsrfLoader and then read by
 * fetchWithTimeout for every mutating request.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

let _csrfToken = '';

/** Returns the current CSRF token (empty string if not yet fetched). */
export function getCsrfToken() {
  return _csrfToken;
}

/**
 * Fetches a fresh CSRF token from the server and stores it.
 * Called once on app mount via CsrfLoader.
 * Safe to call multiple times — subsequent calls replace the old token.
 */
export async function initCsrfToken() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/csrf-token`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.csrfToken) {
        _csrfToken = data.csrfToken;
      }
    }
  } catch {
    // Non-fatal — the app still works, CSRF header will just be empty
    // and the server will reject mutating requests with 403
    console.warn('[CareConnect] Failed to fetch CSRF token.');
  }
}
