/**
 * What a person sees when a database write fails. The raw message from
 * Postgres or PostgREST names constraints and columns, which helps nobody at
 * the screen and describes the schema to anyone probing it. Codes that mean
 * something to the person get a sentence; everything else gets one plain
 * line. Servers keep the detail in their own logs.
 */
export function friendlyDbError(error: { code?: string; message?: string } | null | undefined, fallback = "Could not save your changes. Please try again."): string {
  const code = error?.code ?? "";
  if (code === "23505") return "A record with these details already exists.";
  if (code === "23503") return "This refers to something that no longer exists. Refresh the page and try again.";
  if (code === "42501" || code === "PGRST301") return "You do not have permission to do that.";
  if (code === "23514") return "One of the values is not allowed here.";
  if (code === "22P02" || code === "22001") return "One of the values has the wrong format or is too long.";
  if (error?.message && /^(Solar Passport|Only a Solink administrator|A maintenance case|An appointment|Only the homeowner)/.test(error.message)) return error.message; // our own trigger messages are written for people
  return fallback;
}
