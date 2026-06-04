DROP POLICY "threads_claim_as_responder" ON "public"."threads";--> statement-breakpoint
CREATE POLICY "threads_claim_as_responder"
  ON "public"."threads"
  FOR UPDATE
  TO authenticated
  USING (
    responder_id IS NULL
    AND writer_id <> auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM "public"."users"
      WHERE id = auth.uid()
        AND opt_in_responder = true
    )
  )
  WITH CHECK (
    responder_id = auth.uid()
    AND writer_id <> auth.uid()
    AND status = 'matched'
    AND EXISTS (
      SELECT 1
      FROM "public"."users"
      WHERE id = auth.uid()
        AND opt_in_responder = true
    )
  );--> statement-breakpoint
CREATE POLICY "threads_select_claimable"
  ON "public"."threads"
  FOR SELECT
  TO authenticated
  USING (
    status = 'pending'
    AND responder_id IS NULL
    AND writer_id <> auth.uid()
    AND EXISTS (
      SELECT 1
      FROM "public"."users" AS u
      WHERE u.id = auth.uid()
        AND u.opt_in_responder = true
        AND u.topic_tags && "threads"."topic_tags"
    )
  );--> statement-breakpoint
CREATE POLICY "messages_select_on_claimable_thread"
  ON "public"."messages"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "public"."threads" AS t
      WHERE t.id = messages.thread_id
        AND t.status = 'pending'
        AND t.responder_id IS NULL
        AND t.writer_id <> auth.uid()
        AND EXISTS (
          SELECT 1
          FROM "public"."users" AS u
          WHERE u.id = auth.uid()
            AND u.opt_in_responder = true
            AND u.topic_tags && t.topic_tags
        )
    )
  );
