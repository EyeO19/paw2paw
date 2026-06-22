-- Remove duplicate pending writer threads, keeping the earliest per writer.
DELETE FROM "public"."threads" AS t
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY writer_id
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM "public"."threads"
    WHERE status = 'pending'
  ) AS ranked
  WHERE rn > 1
) AS dupes
WHERE t.id = dupes.id;--> statement-breakpoint
CREATE UNIQUE INDEX "threads_writer_pending_unique"
  ON "public"."threads" ("writer_id")
  WHERE status = 'pending';--> statement-breakpoint
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
  v_normalized_tags text[];
  v_trimmed text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF cardinality(p_topic_tags) < 1 THEN
    RAISE EXCEPTION 'empty_topic_tags';
  END IF;

  v_trimmed := btrim(p_content);

  IF v_trimmed = '' THEN
    RAISE EXCEPTION 'empty_content';
  END IF;

  IF length(v_trimmed) > 10000 THEN
    RAISE EXCEPTION 'content_too_long';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  SELECT array_agg(tag ORDER BY tag)
    INTO v_normalized_tags
  FROM unnest(p_topic_tags) AS tag;

  SELECT t.id
    INTO v_thread_id
  FROM "public"."threads" AS t
  WHERE t.writer_id = v_uid
    AND t.status = 'pending'
  ORDER BY t.created_at DESC
  LIMIT 1;

  IF v_thread_id IS NOT NULL THEN
    RETURN v_thread_id;
  END IF;

  SELECT t.id
    INTO v_thread_id
  FROM "public"."threads" AS t
  INNER JOIN "public"."messages" AS m ON m.thread_id = t.id
  WHERE t.writer_id = v_uid
    AND t.status = 'pending'
    AND t.topic_tags = v_normalized_tags
    AND m.content = v_trimmed
    AND t.created_at > now() - interval '5 minutes'
  ORDER BY t.created_at DESC
  LIMIT 1;

  IF v_thread_id IS NOT NULL THEN
    RETURN v_thread_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "public"."threads"
    WHERE writer_id = v_uid
  ) AND NOT EXISTS (
    SELECT 1
    FROM "public"."threads"
    WHERE responder_id = v_uid
  ) THEN
    RAISE EXCEPTION 'respond_first_required';
  END IF;

  BEGIN
    INSERT INTO "public"."threads" ("writer_id", "responder_id", "status", "topic_tags")
    VALUES (v_uid, NULL, 'pending', v_normalized_tags)
    RETURNING "id" INTO v_thread_id;

    INSERT INTO "public"."messages" ("thread_id", "sender_id", "content", "flagged")
    VALUES (v_thread_id, v_uid, v_trimmed, false);
  EXCEPTION
    WHEN unique_violation THEN
      SELECT t.id
        INTO v_thread_id
      FROM "public"."threads" AS t
      WHERE t.writer_id = v_uid
        AND t.status = 'pending'
      ORDER BY t.created_at DESC
      LIMIT 1;

      IF v_thread_id IS NULL THEN
        RAISE;
      END IF;
  END;

  RETURN v_thread_id;
END;
$$;
