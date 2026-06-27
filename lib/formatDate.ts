/** 
 * Format a date string in a locale-independent way to avoid SSR hydration mismatches.
 * Always uses UTC and produces consistent output on server and client.
 * e.g. "May 9, 2026"
 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
