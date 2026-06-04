ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "users_select_own"
  ON "public"."users"
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "users_insert_own"
  ON "public"."users"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "users_update_own"
  ON "public"."users"
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);--> statement-breakpoint
CREATE POLICY "threads_select_participant"
  ON "public"."threads"
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = writer_id
    OR auth.uid() = responder_id
  );--> statement-breakpoint
CREATE POLICY "threads_insert_writer_pending"
  ON "public"."threads"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = writer_id
    AND responder_id IS NULL
  );--> statement-breakpoint
CREATE POLICY "threads_update_participant"
  ON "public"."threads"
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = writer_id
    OR auth.uid() = responder_id
  );--> statement-breakpoint
CREATE POLICY "threads_claim_as_responder"
  ON "public"."threads"
  FOR UPDATE
  TO authenticated
  USING (
    responder_id IS NULL
    AND writer_id <> auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    responder_id = auth.uid()
    AND writer_id <> auth.uid()
    AND status = 'pending'
  );--> statement-breakpoint
CREATE POLICY "messages_select_thread_participant"
  ON "public"."messages"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "public"."threads" AS t
      WHERE t.id = messages.thread_id
        AND (
          auth.uid() = t.writer_id
          OR auth.uid() = t.responder_id
        )
    )
  );--> statement-breakpoint
CREATE POLICY "messages_insert_participant_sender"
  ON "public"."messages"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM "public"."threads" AS t
      WHERE t.id = thread_id
        AND (
          auth.uid() = t.writer_id
          OR auth.uid() = t.responder_id
        )
    )
  );
