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

export function getStoredRole() {
  return localStorage.getItem("role");
}

export function getStoredSession() {
  return {
    token: localStorage.getItem("token"),
    role: localStorage.getItem("role"),
    userId: localStorage.getItem("userId"),
  };
}
