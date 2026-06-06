# Design decisions (ADR-lite)

Append-only log of notable decisions. Add a new entry when you make a call worth revisiting.

---

## 2025-06 — RLS at the database, not in application code

**Context:** Thread and message access must hold even if a Server Action is wrong or a client calls Supabase directly. Supabase exposes PostgREST with the user’s JWT.

**Tradeoffs considered:**
- App-layer checks only — faster to write, easy to bypass via direct API calls
- RLS + `SECURITY INVOKER` RPCs — policies are single source of truth; more SQL to maintain

**At 10× scale:** Keep RLS; add integration tests against policies; consider `list_claimable_threads` RPC if browse queries need optimization.

---

## 2025-06 — FIFO matching v1 (not weighted)

**Context:** Responders need a fair, predictable queue while MVP proves the conversation loop.

**Tradeoffs considered:**
- FIFO by `created_at` — simple, explainable, possible starvation of niche tags
- Weighted score (wait + overlap − load) — better fit, more tuning and gaming surface

**At 10× scale:** See `docs/matching.md` v2; keep atomic claim RPC; add metrics on wait time and claim-to-first-reply.

---

## 2025-06 — Sender-side crisis interstitial, no receiver badge

**Context:** High-specificity phrases trigger a non-blocking modal before send; 988 strip is always visible.

**Tradeoffs considered:**
- Receiver warning/badge — signals distress but risks stigma and fake “risk classification” from regex
- Sender-only interstitial — preserves dignity; responder may miss implicit distress

**At 10× scale:** Revisit passive affordances (e.g. expanded resources on thread open) before message-level labels; community review for any new phrases.

---

## 2025-06 — Soft close (`status = 'closed'`), no delete

**Context:** Either participant can end a conversation; both should retain history.

**Tradeoffs considered:**
- Hard delete — simpler GDPR story, harms safety review and user reference
- Soft close + hidden composer — autonomy without erasing accountability

**At 10× scale:** Retention policy for closed threads; export for users; moderator tooling that reads flagged rows without logging content.

---

## 2025-06 — Session pooler for migrations, Transaction pooler for app runtime

**Context:** Drizzle Kit needs a stable Postgres session; Next.js on Vercel uses short-lived serverless connections. Direct `db.*` host is IPv6-only on many networks.

**Tradeoffs considered:**
- Direct connection for everything — fails on IPv4 Macs; bad for serverless fan-out
- Transaction `:6543` + `prepare: false` for app; Session `:5432` for migrate — two URLs, correct semantics

**At 10× scale:** CI migrate job with `DATABASE_MIGRATE_URL`; connection limits on pool size per Vercel concurrency docs.

---

## 2025-06 — `text[]` for `topic_tags`, not enum

**Context:** Writers and responders tag threads with overlapping interests; onboarding picks from a curated list in code (`lib/constants/topic-tags.ts`).

**Tradeoffs considered:**
- Postgres enum — strict, requires migration per new tag
- `text[]` + app validation — flexible; overlap via `&&` in SQL

**At 10× scale:** Normalize tags table if we need analytics per tag; until then, cap array length in validation and RPC.

---

## 2025-06 — Hashed display IDs, never raw

**Context:** Peers must not see each other’s emails or chosen handles in the UI.

**Tradeoffs considered:**
- Random UUID per session — no stable identity for repeat abuse patterns
- HMAC hashed display ID with server secret — stable, non-reversible, no PII in `users` row

**At 10× scale:** Rotate secret strategy documented; never expose hash to client analytics; rate-limit account creation if abuse appears.

---

## Decision: Profile row created on first sign-in, not signup

**Context:** Supabase Auth manages `auth.users` (email, password, session). Our app data
lives in `public.users` (hashed_display_id, topic_tags, opt_in_responder). These are
separate schemas linked by a foreign key on `id`.

**Tradeoffs considered:**

- **Option A — create profile on signup (atomic).** No orphan window. But requires
  wrapping signUp + insert in a transaction or trigger; if the insert fails after auth
  succeeds, we have an auth user with no profile and no clean rollback. Also creates
  rows for users who never confirm their email, accumulating garbage.

- **Option B — create profile on first sign-in (chosen).** Clean separation: auth
  concerns stay in auth, profile concerns stay in public. Orphan window exists between
  signup and first sign-in (could be minutes, could be never if user abandons). For
  unconfirmed users, only the auth row exists — easier to garbage-collect.

- **Option C — create profile via Supabase Auth Hook.** Possible but adds vendor-specific
  glue and obscures the flow. Defer until we need server-side automation that signup +
  first-sign-in can't cover.

**Choice:** Option B. The orphan window is bounded and observable; the alternative
hides failure modes inside a transaction we'd have to maintain ourselves.

**At 10× scale:** Add a nightly cleanup job that deletes `auth.users` rows where no
`public.users` exists after 7 days. Prevents accumulation of abandoned signups without
affecting users mid-onboarding.

**Revisit if:** We add Sign in with Google / Apple. SSO providers may create profile
rows synchronously, in which case Option A becomes cheap. At that point, evaluate
unifying the two paths.
