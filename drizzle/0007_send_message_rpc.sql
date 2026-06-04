CREATE OR REPLACE FUNCTION "public"."send_message"(
  "p_thread_id" uuid,
  "p_content" text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_writer_id uuid;
  v_responder_id uuid;
  v_status "public"."thread_status";
  v_message_id uuid;
  v_trimmed text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_trimmed := btrim(p_content);

  IF v_trimmed = '' THEN
    RAISE EXCEPTION 'empty_content';
  END IF;

  IF length(v_trimmed) > 10000 THEN
    RAISE EXCEPTION 'content_too_long';
  END IF;

  SELECT writer_id, responder_id, status
    INTO v_writer_id, v_responder_id, v_status
  FROM "public"."threads"
  WHERE id = p_thread_id;

  IF v_writer_id IS NULL THEN
    RAISE EXCEPTION 'thread_not_matched';
  END IF;

  IF v_status <> 'matched' THEN
    RAISE EXCEPTION 'thread_not_matched';
  END IF;

  IF v_uid <> v_writer_id AND v_uid <> v_responder_id THEN
    RAISE EXCEPTION 'not_participant';
  END IF;

  INSERT INTO "public"."messages" ("thread_id", "sender_id", "content", "flagged")
  VALUES (p_thread_id, v_uid, v_trimmed, false)
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."send_message"(uuid, text) TO authenticated;
