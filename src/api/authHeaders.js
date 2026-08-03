/**
 * Optional Authorization header for Indexus permissioned meshes.
 * Set via:
 *   globalThis.__INDEXUS_BEARER__ = "<token>"
 *   or process.env.INDEXUS_BEARER
 */
export function authHeaders(extra = {}) {
  let token;
  try {
    token = globalThis.__INDEXUS_BEARER__;
  } catch (_) {
    token = undefined;
  }
  if (!token && typeof process !== "undefined" && process.env) {
    token = process.env.INDEXUS_BEARER;
  }
  const headers = { ...extra };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}
