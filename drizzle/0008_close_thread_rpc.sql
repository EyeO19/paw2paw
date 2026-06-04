CREATE OR REPLACE FUNCTION "public"."close_thread"("p_thread_id" uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_writer_id uuid;
  v_responder_id uuid;
  v_status "public"."thread_status";
  v_updated integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT writer_id, responder_id, status
    INTO v_writer_id, v_responder_id, v_status
  FROM "public"."threads"
  WHERE id = p_thread_id;

  IF v_writer_id IS NULL THEN
    RAISE EXCEPTION 'thread_not_matched';
  END IF;

  IF v_uid <> v_writer_id AND v_uid <> v_responder_id THEN
    RAISE EXCEPTION 'not_participant';
  END IF;

  IF v_status = 'closed' THEN
    RAISE EXCEPTION 'already_closed';
  END IF;

  IF v_status <> 'matched' THEN
    RAISE EXCEPTION 'thread_not_matched';
  END IF;

  UPDATE "public"."threads"
  SET status = 'closed'
  WHERE id = p_thread_id
    AND status = 'matched'
    AND (writer_id = v_uid OR responder_id = v_uid);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'already_closed';
  END IF;
END;
$$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."close_thread"(uuid) TO authenticated;
