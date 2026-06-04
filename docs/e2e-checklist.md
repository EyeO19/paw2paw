# E2E checklist — Conversation (Phase 2 Chunk 4)

Use two browser sessions (or normal + incognito) as **Writer** and **Responder** on a **matched** thread unless noted.

## Prerequisites

- [ ] Migrations through `0008` applied (`send_message`, `close_thread` RPCs exist)
- [ ] Migration `0009_enable_realtime` applied (`messages` on `supabase_realtime` publication)
- [ ] RPC check: `send_message` and `close_thread` have `prosecdef = false`
- [ ] Dev: Confirm email disabled; test accounts onboarded with overlapping topic tags

---

## 1. Auth gating

- [ ] Logged out: visit `/thread/{id}` → redirects to `/login`

---

## 2. Thread not found

- [ ] Logged in: visit `/thread/{random-uuid}` → 404 (`notFound`)
- [ ] Logged in: visit another user's thread you don't participate in → 404 (RLS)

---

## 3. Pending thread (writer)

- [ ] Writer on `/thread/{pending-id}` → redirects to `/thread/{id}/pending`
- [ ] Non-writer on pending thread → redirects to `/respond`

---

## 4. Matched thread — messaging

- [ ] **Two-way send:** Writer and Responder each send a message; both appear for both users
- [ ] **Realtime (second tab):** Open same thread in two tabs as same user OR writer + responder in two browsers; send from one → appears in the other without full page reload
- [ ] **Scroll — scrolled up:** Scroll up in history; receive/send from other party → viewport does **not** jump to bottom
- [ ] **Scroll — at bottom:** Scroll to bottom; new message → auto-scrolls to show latest
- [ ] **Enter / Shift+Enter:** Enter sends; Shift+Enter adds newline
- [ ] **Empty send:** Whitespace-only → blocked client-side (no server roundtrip)

---

## 5. End conversation

- [ ] Click **End conversation** → browser confirm shows expected copy
- [ ] Confirm → ended banner visible; composer hidden
- [ ] Message history still visible (scrollable)
- [ ] Send blocked after end (composer gone; RPC would reject if forced)
- [ ] Other party still sees history; realtime can still deliver a message sent just before close

---

## 6. Closed thread URL

- [ ] Visit `/thread/{closed-id}` directly → conversation loads (not redirected to `/`)
- [ ] Banner shows ended state; no composer

---

## 7. Failed send / retry

- [ ] Tab A: end conversation
- [ ] Tab B (still showing composer briefly): attempt send → fails with retry affordance
- [ ] Retry after refresh or on failed row → recovers when thread still matched; appropriate error when closed

---

## 8. Resource bridge

- [ ] **Mobile width:** Resources in collapsible block above thread; expand → links visible
- [ ] **Desktop width:** Resource sidebar visible beside thread
- [ ] Each link opens correct Princeton resource URL in new tab (`noopener`)

---

## Sign-off

| Tester | Date | Pass/Fail | Notes |
|--------|------|-----------|-------|
|        |      |           |       |
