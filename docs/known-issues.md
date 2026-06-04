# Known issues (deferred)

Tracked bugs and polish items intentionally deferred until after the MVP framework is complete. Add new entries at the bottom using the same template.

---

## Auth signup

| Field | Detail |
|-------|--------|
| **Symptom** | "Invalid path specified in request URL" error on `/signup` form submit |
| **Surface** | Visible after typing email + password and clicking Sign up |
| **Suspected cause** | Server Action path or Supabase redirect URL misconfig |
| **Severity** | Blocking end-to-end signup, but not blocking MVP framework definition since auth works at data layer |
| **Defer until** | Post–Chunk 5 polish pass |

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
