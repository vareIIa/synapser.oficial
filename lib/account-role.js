export function normalizeAccountRole(value) {
  return typeof value === "string" && value.trim().toLowerCase() === "admin" ? "admin" : "user";
}
