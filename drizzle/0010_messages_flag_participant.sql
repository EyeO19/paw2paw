CREATE POLICY "messages_flag_participant"
  ON "public"."messages"
  FOR UPDATE
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
  )
  WITH CHECK (flagged = true);
