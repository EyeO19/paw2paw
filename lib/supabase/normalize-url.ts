const SUPABASE_HOST_PATTERN = /^[a-z0-9-]+\.supabase\.co$/i;

function redactUrlPrefix(url: string): string {
  return url.slice(0, 40);
}

/**
 * Validates and normalizes the Supabase project URL for Auth/REST clients.
 * Must be the base project URL — not the PostgREST path from the API panel.
 */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  if (raw === undefined || raw.trim() === "") {
    throw new Error(
      "Invalid SUPABASE_URL. Expected https://<project-ref>.supabase.co (no /rest/v1/ suffix, no trailing slash). Got: (empty)",
    );
  }

  if (raw !== raw.trim()) {
    throw new Error(
      `Invalid SUPABASE_URL. Expected https://<project-ref>.supabase.co (no /rest/v1/ suffix, no trailing slash). Got: ${redactUrlPrefix(raw)}`,
    );
  }

  if (raw.includes("/rest/v1")) {
    throw new Error(
      `Invalid SUPABASE_URL. Expected https://<project-ref>.supabase.co (no /rest/v1/ suffix, no trailing slash). Got: ${redactUrlPrefix(raw)}`,
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `Invalid SUPABASE_URL. Expected https://<project-ref>.supabase.co (no /rest/v1/ suffix, no trailing slash). Got: ${redactUrlPrefix(raw)}`,
    );
  }

  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new Error(
      `Invalid SUPABASE_URL. Expected https://<project-ref>.supabase.co (no /rest/v1/ suffix, no trailing slash). Got: ${redactUrlPrefix(raw)}`,
    );
  }

  const host = parsed.hostname;
  if (!SUPABASE_HOST_PATTERN.test(host)) {
    throw new Error(
      `Invalid SUPABASE_URL. Expected https://<project-ref>.supabase.co (no /rest/v1/ suffix, no trailing slash). Got: ${redactUrlPrefix(raw)}`,
    );
  }

  return `${parsed.protocol}//${host}`;
}
