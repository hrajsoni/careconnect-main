/**
 * fetchWithTimeout — wraps fetch() with an AbortController-based timeout.
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

  try {
    const res = await fetch(url, {
      ...options,
      credentials: options.credentials || 'include',
      headers: {
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