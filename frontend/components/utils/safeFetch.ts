type ApiErrorShape = {
  message?: string;
};

export async function safeFetch(url: string, options?: RequestInit) {
  const headers: Record<string, string> = { ...(options?.headers as Record<string, string> || {}) };

  // Add Bearer token fallback for cross-origin authentication
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text();

  let data: ApiErrorShape | null = null;

  if (rawText) {
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error("Server returned invalid JSON response.");
      }
    } else {
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error("Unexpected server response received.");
      }
    }
  }

  if (res.status === 401) {
    // Token expired or invalid - clear storage and redirect to login
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      localStorage.removeItem("name");
      localStorage.removeItem("email");
      localStorage.removeItem("phone");
      localStorage.removeItem("location");
      localStorage.removeItem("photo");
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}
