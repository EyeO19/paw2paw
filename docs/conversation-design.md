# Conversation design

## Principles

Paw2Paw conversations are anonymous peer support threads. The UI shows messages as **you** vs **them** (left/right alignment) without names, roles, or avatars tied to real identity.

## Deliberate omissions

### Read receipts — NO

Read receipts create pressure to respond quickly and perform availability. The product favors **considered, asynchronous support** over reactive back-and-forth. Participants see message history and timestamps, not whether the other person has opened a message.

### Typing indicators — NO

Typing indicators imply immediate response expectations and can feel surveillant in sensitive topics. We omit them for the same reason as read receipts: reduce performance anxiety and let people compose thoughtful replies.

## End conversation — soft close

Ending a conversation sets `threads.status = 'closed'`.

- **History stays visible** for both participants.
- **Composer is hidden**; no new messages via `send_message` RPC.
- **Not an archive/delete** — records remain for continuity, safety review, and personal reference.

Hard delete would harm accountability and user trust if someone needs to re-read what was shared. Soft close balances autonomy (“I’m done”) with safety.

## Realtime

- Channel name: `conversation:{threadId}` for readable Supabase logs.
- Subscribe to `INSERT` on `public.messages` filtered by `thread_id`.
- **Publication:** migration `0009_enable_realtime.sql` runs `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages` (not a dashboard change).
- **Reconnect:** on resubscribe after disconnect, refetch messages and merge by `id` (do not blind-append duplicates).
- Subscription remains active when `closed` so a last message can arrive before both clients reflect the ended state.

## Optimistic sends

- Temporary ids: `tmp-{uuid}` until `send_message` returns the real id.
- Failed sends stay in the list with **Retry** (no content logged on the server).
- Realtime may deliver the same message before the action returns; de-dupe by real id or tmp heuristic (sender + content + time window).

## Scroll behavior

Auto-scroll to the latest message only when the user is already **near the bottom** (~80px). Scrolling up to read history is not interrupted by incoming messages.

## Message ordering

`ORDER BY created_at ASC, id ASC` for deterministic ordering in UI and refetch.

## Resource bridge

Static campus resources live in `lib/constants/resources.ts`, rendered above/outside the message stream (collapsible on mobile, sidebar on desktop). Reused for crisis interstitial in a later chunk.

## Out of scope (Chunk 4)

- Read receipts, typing indicators, push notifications
- Edit/delete messages, attachments, reactions
- Service-role or bypass-RLS writes
