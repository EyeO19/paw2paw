# Matching

## v1 (implemented)

Paw2Paw uses a simple **FIFO queue** for responders browsing open threads.

### Rules

- Thread must be `status = pending` with `responder_id` null.
- Responder cannot be the writer (`writer_id <> auth.uid()`).
- Responder must have `opt_in_responder = true`.
- **Browse:** `/respond` lists all open pending threads (oldest first); no topic filtering.
- **Order:** `created_at ASC` (oldest waiting thread first).
- **Cap:** 20 threads per `/respond` load (no pagination in MVP).
- **Claim:** `claim_thread_for_responder` RPC sets `responder_id` and `status = matched` in one `UPDATE` with a race guard (`ROW_COUNT = 0` → `already_claimed`).

### Why FIFO for v1

- Fair wait times: no thread sits indefinitely while newer ones are claimed.
- Predictable behavior for students and support.
- Minimal logic: no weights, no randomness, no cold-start tuning.

### Browse + claim security

- RLS policies `threads_select_claimable` and `messages_select_on_claimable_thread` allow opted-in responders to see eligible pending threads (and messages on those threads for preview), regardless of topic overlap.
- Claim runs as `SECURITY INVOKER` under `threads_claim_as_responder` with `WITH CHECK (status = 'matched')`.

---

## v2 (not implemented)

Weighted matching to improve fairness beyond queue age alone.

### Goals

1. **Wait-time fairness** — still prioritize long-waiting threads, but not exclusively.
2. **Topic fit** — prefer deeper overlap (`|user_tags ∩ thread_tags|`) when wait times are similar.
3. **Responder load balancing** — avoid one responder accumulating many active `matched` threads.

### Sketch score (example)

```
score(thread, responder) =
  w_wait * minutes_waiting
  + w_overlap * cardinality(topic_tags_overlap)
  - w_load * active_matched_count(responder)
```

Sort descending; claim top eligible row (still via atomic RPC).

### Considerations

- Anti-gaming: rate limits on claim without first message.
- Metrics: queue depth, median wait, claim-to-first-reply latency.
- Policy: may require narrowing `messages_select_on_claimable_thread` if writers can add multiple messages while pending.

### Migration path from v1

- Keep FIFO as fallback when scores tie.
- Introduce optional `match_score` column or sort in a `list_claimable_threads` RPC.
- A/B or feature flag before replacing pure FIFO ordering in `/respond`.
