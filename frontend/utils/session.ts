export function clearStoredAuth() {
  [
    "token",
    "role",
    "userId",
    "name",
    "email",
    "phone",
    "location",
    "photo",
    "createdAt",
    "verificationStatus",
    "rejectionReason",
  ].forEach((key) => localStorage.removeItem(key));
}

export function getStoredRole(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem("role")
    : null;
}

export function getStoredSession() {
  if (typeof window === "undefined")
    return { token: null, role: null, userId: null };
  return {
    token: localStorage.getItem("token"),
    role: localStorage.getItem("role"),
    userId: localStorage.getItem("userId"),
  };
}

export function getDashboardPath(role: string | null): string {
  switch (role) {
    case "admin":          return "/dashboard/admin";
    case "nurse":          return "/dashboard/nurse";
    case "care_assistant": return "/dashboard/care-assistant";
    default:               return "/dashboard/patient";
  }
}