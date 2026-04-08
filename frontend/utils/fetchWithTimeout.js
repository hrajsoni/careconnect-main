import { getCsrfToken } from './csrfToken';

/**
 * fetchWithTimeout — wraps fetch() with an AbortController-based timeout,
 * and automatically injects the X-CSRF-Token header on mutating requests
 * (POST, PUT, DELETE, PATCH).
 *
 * @param {string} url - The request URL.
 * @param {RequestInit} [options={}] - Standard fetch options (method, headers, body, etc.).
 * @param {number} [timeoutMs=10000] - Timeout in milliseconds (default: 10s).
 * @returns {Promise<Response>} - Resolves with the fetch Response.
 * @throws {Error} - Throws 'Request timed out. Please try again.' on timeout,
 *                   or re-throws the original error for all other failures.
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Inject X-CSRF-Token on mutating requests
  const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  const method = (options.method || 'GET').toUpperCase();
  const csrfHeaders = mutatingMethods.includes(method)
    ? { 'X-CSRF-Token': getCsrfToken() }
    : {};

  try {
    const res = await fetch(url, {
      ...options,
      credentials: options.credentials || 'include',
      headers: {
        ...csrfHeaders,
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  }
}
