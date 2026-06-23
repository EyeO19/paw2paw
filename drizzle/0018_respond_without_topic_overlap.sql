DROP POLICY "threads_select_claimable" ON "public"."threads";--> statement-breakpoint
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
    )
  );--> statement-breakpoint
DROP POLICY "messages_select_on_claimable_thread" ON "public"."messages";--> statement-breakpoint
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
        )
    )
  );--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."claim_thread_for_responder"("p_thread_id" uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_writer_id uuid;
  v_updated integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."threads"
    WHERE responder_id = v_uid
      AND status = 'matched'
  ) THEN
    RAISE EXCEPTION 'active_responder_thread_exists';
  END IF;

  SELECT writer_id
    INTO v_writer_id
  FROM "public"."threads"
  WHERE id = p_thread_id;

  IF v_writer_id IS NULL THEN
    RAISE EXCEPTION 'thread_not_available';
  END IF;

  IF v_writer_id = v_uid THEN
    RAISE EXCEPTION 'self_match_forbidden';
  END IF;

  UPDATE "public"."threads"
  SET responder_id = v_uid, status = 'matched'
  WHERE id = p_thread_id
    AND status = 'pending'
    AND responder_id IS NULL
    AND writer_id <> v_uid;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'already_claimed';
  END IF;

  RETURN p_thread_id;
END;
$$;
