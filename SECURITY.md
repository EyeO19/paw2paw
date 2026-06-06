# Security

## Threat model

Paw2Paw connects **anonymous peers** (students) in one-to-one support threads. We assume:

| Threat | Scenario |
|--------|----------|
| **Cross-user data access** | User A tries to read or post in User B’s thread |
| **RLS probing** | Attacker with a valid account fuzzes UUIDs, RPC args, or REST filters |
| **Leaked publishable key** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` extracted from the client bundle |
| **Insider / moderator abuse** | Future admin tools must not bypass audit or log message bodies |

We do **not** treat the crisis phrase interstitial or resource strip as security controls (see [Crisis UX](#crisis-ux-not-a-security-boundary)).

## What RLS enforces (four areas)

Authorization is defined in SQL migrations (`drizzle/0001_enable_rls.sql` and follow-ons). In plain English:

1. **Own profile only** — Users can read and update only their own row in `users` (`users_select_own`, `users_update_own`). Display identity is a hashed ID, not a reversible handle.

2. **Thread access by participation** — A user sees a thread only if they are `writer_id` or `responder_id` (`threads_select_participant`). Writers create pending threads; responders claim via RPC under `threads_claim_as_responder` with status transition to `matched`.

3. **Responder browse (opt-in + overlap)** — Opted-in responders see **only** pending, unclaimed threads whose `topic_tags` overlap their profile (`threads_select_claimable`, `messages_select_on_claimable_thread`). No access to matched threads they do not belong to.

4. **Messages and flags** — Participants read messages on their threads (`messages_select_thread_participant`), insert only as themselves (`messages_insert_participant_sender` + `send_message` RPC). Participants may set `flagged = true` on messages in their thread, one-way (`messages_flag_participant`); they cannot unflag or flag as a non-participant.

All write RPCs (`create_thread_with_message`, `claim_thread_for_responder`, `send_message`, `close_thread`) are **`SECURITY INVOKER`** — they execute with the caller’s JWT, so policies still apply.

## What we deliberately do not store or log

| Data | Handling |
|------|----------|
| **Raw display IDs / real names** | `hashed_display_id` only; derived with server secret `SIGN_DISPLAY_ID_SECRET` |
| **Message content in application logs** | Server actions and analytics must not log `content`; dev analytics logs event names only |
| **Email in analytics** | Auth email stays in Supabase Auth; not copied into analytics payloads |
| **IP addresses** | Not collected in app code; Supabase platform defaults apply |

Client-side crisis detection runs in the browser for UX; matched phrases are **not** persisted or sent to an analytics backend with message text.

## Crisis UX (not a security boundary)

The crisis resource strip and phrase interstitial are **values and safety-UX primitives**, not access control:

- They do not block sends, classify clinical risk, or hide messages from the other participant.
- A user can continue past the interstitial; the responder sees a normal message bubble.
- **Security** is “who can read/write which rows.” **Values** is “how we surface 988 and campus resources without surveillance or stigma.”

Do not rely on phrase matching for moderation or mandatory escalation in v1.

## Configuration hygiene

- Never commit `.env.local` or service-role keys.
- `DATABASE_URL` / `DATABASE_MIGRATE_URL` are server-only; not exposed to the client.
- Use Supabase **pooler** URIs for app and migrations; direct `db.*` hosts are often IPv6-only and unrelated to client security.

## Responsible disclosure

If you believe you have found a security issue:

1. **Preferred:** Open a [GitHub Security Advisory](https://github.com/eyeo19/paw2paw/security/advisories/new) or a private issue if you do not have advisory access — describe impact and reproduction without posting live user data.
2. **Alternative:** Email the maintainer via the contact on the GitHub profile linked from the repository.

Please allow reasonable time to fix before public disclosure. Do not test against production with other users’ accounts or real crisis content.

## Out of scope (known limits)

- No rate limiting on compose/send/claim in v1
- No automated moderation queue UI; `flagged` is stored for future review
- Signup flow has known polish issues; see `docs/known-issues.md`
