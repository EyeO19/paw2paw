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
    AND status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM "public"."users"
      WHERE id = auth.uid()
        AND opt_in_responder = true
    )
  );
