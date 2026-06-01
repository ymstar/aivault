/**
 * Escape special Postgres pattern characters in ILIKE patterns.
 */
export function escapeIlike(pattern: string): string {
  return pattern.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Safely extract an error message from an unknown thrown value.
 */
export function errorMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
