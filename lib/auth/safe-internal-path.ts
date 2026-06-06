/** Allow same-origin relative redirects only (no open redirect). */
export function safeInternalPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}
