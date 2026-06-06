# Known issues (deferred)

Tracked bugs and polish items intentionally deferred until after the MVP framework is complete. Add new entries at the bottom using the same template.

---

## Auth signup — resolved (2025-06)

| Field | Detail |
|-------|--------|
| **Symptom** | "Invalid path specified in request URL" error on `/signup` form submit |
| **Root cause** | `NEXT_PUBLIC_SUPABASE_URL` set to the PostgREST URL (`…/rest/v1/`) instead of the base project URL |
| **Fix** | `lib/supabase/normalize-url.ts` validates and rejects bad URLs at client init; env corrected to `https://<project-ref>.supabase.co` |
| **Lesson learned** | Supabase shows the REST API URL prominently in the dashboard's API panel; the base URL is what we need. We added URL normalization to prevent this from happening again. |

---

## Template (copy for new entries)

```markdown
## [Short title]

| Field | Detail |
|-------|--------|
| **Symptom** | |
| **Surface** | |
| **Suspected cause** | |
| **Severity** | |
| **Defer until** | |
```
