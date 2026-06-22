CREATE OR REPLACE FUNCTION "public"."claim_thread_for_responder"("p_thread_id" uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_writer_id uuid;
  v_thread_tags text[];
  v_user_tags text[];
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

  SELECT topic_tags
    INTO v_user_tags
  FROM "public"."users"
  WHERE id = v_uid;

  SELECT writer_id, topic_tags
    INTO v_writer_id, v_thread_tags
  FROM "public"."threads"
  WHERE id = p_thread_id;

  IF v_writer_id IS NULL THEN
    RAISE EXCEPTION 'thread_not_available';
  END IF;

  IF v_writer_id = v_uid THEN
    RAISE EXCEPTION 'self_match_forbidden';
  END IF;

  IF NOT (v_user_tags && v_thread_tags) THEN
    RAISE EXCEPTION 'thread_not_available';
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
