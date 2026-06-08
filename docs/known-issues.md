# Known issues

Open items are triaged by roadmap priority. Resolved items are kept for history.

---

## Open

### No email or push notifications — **P2**

| Field | Detail |
|-------|--------|
| **Symptom** | Writers are not alerted when a thread is claimed or when a new message arrives |
| **Surface** | Pending and inbox flows; users must check back manually |
| **Mitigation** | Honest copy on pending page (`fix(copy)` pending); inbox lists all participant threads |
| **Address in** | P2 — minimal match notification (email or Realtime on `threads.status`) per `docs/roadmap-resume.md` expansion |

### Production deploy not live — **P0.2**

| Field | Detail |
|-------|--------|
| **Symptom** | README shows “Live demo: coming soon” |
| **Surface** | Recruiters and external reviewers |
| **Address in** | P0.2 — Vercel deploy, env vars, prod `pnpm db:migrate`, update README with URL + Loom |

### No automated tests or CI — **P1**

| Field | Detail |
|-------|--------|
| **Symptom** | `pnpm lint` / `pnpm build` not enforced on push; no unit or E2E tests in repo |
| **Surface** | Regression risk on auth, RLS-sensitive paths, crisis phrase detector |
| **Address in** | P1 — GitHub Actions + focused tests per resume roadmap |

### App shell and design system polish — **P2**

| Field | Detail |
|-------|--------|
| **Symptom** | No persistent nav; `window.confirm` for end conversation; shadcn/ui not adopted |
| **Surface** | General UX polish |
| **Address in** | P2 — app shell, accessible dialogs, optional shadcn per `docs/roadmap-resume.md` |

### No route-level loading/error/not-found files — **P2**

| Field | Detail |
|-------|--------|
| **Symptom** | No `loading.tsx`, `error.tsx`, or `not-found.tsx` in `app/`; async routes use inline form `pending` states and `notFound()` calls only |
| **Surface** | Route transitions and unhandled server errors show Next.js defaults |
| **Address in** | P2 — add per-route loading and error boundaries per project conventions |

### Root layout metadata not updated — **P2**

| Field | Detail |
|-------|--------|
| **Symptom** | `app/layout.tsx` `metadata` still shows create-next-app defaults ("Create Next App") |
| **Surface** | Browser tab title and SEO snippets |
| **Address in** | P2 polish — set title/description to Paw2Paw branding |

---

## Resolved

### ~~Auth signup — “Invalid path specified in request URL”~~ — **RESOLVED** `083c269`

| Field | Detail |
|-------|--------|
| **Symptom** | Signup form returned “Invalid path specified in request URL” |
| **Root cause** | `NEXT_PUBLIC_SUPABASE_URL` used PostgREST path (`…/rest/v1/`) instead of base project URL |
| **Fix** | `lib/supabase/normalize-url.ts` fails loudly on bad URLs; env uses `https://<ref>.supabase.co` |
| **Lesson learned** | Supabase shows the REST API URL prominently in the dashboard's API panel; the base URL is what we need. We added URL normalization to prevent this from happening again. |

---

## Template (copy for new entries)

```markdown
### [Short title] — **P?**

| Field | Detail |
|-------|--------|
| **Symptom** | |
| **Surface** | |
| **Address in** | |
```
