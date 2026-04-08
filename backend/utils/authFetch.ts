const API_BASE = "[localhost](http://localhost:8000)";

type AuthFetchOptions = RequestInit & {
  skipJsonContentType?: boolean;
};

export async function authFetch(
  path: string,
  options: AuthFetchOptions = {}
) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormData && !options.skipJsonContentType && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}
