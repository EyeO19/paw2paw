CREATE OR REPLACE FUNCTION "public"."create_thread_with_message"(
  "p_topic_tags" text[],
  "p_content" text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_thread_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF cardinality(p_topic_tags) < 1 THEN
    RAISE EXCEPTION 'empty_topic_tags';
  END IF;

  IF btrim(p_content) = '' THEN
    RAISE EXCEPTION 'empty_content';
  END IF;

  IF length(btrim(p_content)) > 10000 THEN
    RAISE EXCEPTION 'content_too_long';
  END IF;

  INSERT INTO "public"."threads" ("writer_id", "responder_id", "status", "topic_tags")
  VALUES (v_uid, NULL, 'pending', p_topic_tags)
  RETURNING "id" INTO v_thread_id;

  INSERT INTO "public"."messages" ("thread_id", "sender_id", "content", "flagged")
  VALUES (v_thread_id, v_uid, btrim(p_content), false);

  RETURN v_thread_id;
END;
$$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."create_thread_with_message"(text[], text) TO authenticated;
