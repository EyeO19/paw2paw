CREATE TYPE "public"."wellbeing_response" AS ENUM('up', 'down', 'neutral');--> statement-breakpoint
ALTER TABLE "public"."threads"
  ADD COLUMN "wellbeing_prompt_sent_at" timestamptz,
  ADD COLUMN "wellbeing_prompt_sender_id" uuid REFERENCES "public"."users"("id") ON DELETE restrict,
  ADD COLUMN "wellbeing_response" "public"."wellbeing_response",
  ADD COLUMN "wellbeing_responded_by" uuid REFERENCES "public"."users"("id") ON DELETE restrict,
  ADD COLUMN "wellbeing_responded_at" timestamptz;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."send_wellbeing_prompt"("p_thread_id" uuid)
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
  v_prompt_sent_at timestamptz;
  v_updated integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT writer_id, responder_id, status, wellbeing_prompt_sent_at
    INTO v_writer_id, v_responder_id, v_status, v_prompt_sent_at
  FROM "public"."threads"
  WHERE id = p_thread_id;

  IF v_writer_id IS NULL THEN
    RAISE EXCEPTION 'thread_not_matched';
  END IF;

  IF v_uid <> v_writer_id AND v_uid <> v_responder_id THEN
    RAISE EXCEPTION 'not_participant';
  END IF;

  IF v_status <> 'closed' THEN
    RAISE EXCEPTION 'thread_not_closed';
  END IF;

  IF v_prompt_sent_at IS NOT NULL THEN
    RAISE EXCEPTION 'wellbeing_prompt_already_sent';
  END IF;

  UPDATE "public"."threads"
  SET
    wellbeing_prompt_sent_at = now(),
    wellbeing_prompt_sender_id = v_uid
  WHERE id = p_thread_id
    AND status = 'closed'
    AND wellbeing_prompt_sent_at IS NULL
    AND (writer_id = v_uid OR responder_id = v_uid);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'wellbeing_prompt_already_sent';
  END IF;
END;
$$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."send_wellbeing_prompt"(uuid) TO authenticated;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."respond_wellbeing_check"(
  "p_thread_id" uuid,
  "p_response" "public"."wellbeing_response"
)
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
  v_prompt_sender_id uuid;
  v_existing_response "public"."wellbeing_response";
  v_updated integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_response IS NULL THEN
    RAISE EXCEPTION 'invalid_response';
  END IF;

  SELECT
    writer_id,
    responder_id,
    status,
    wellbeing_prompt_sender_id,
    wellbeing_response
    INTO v_writer_id, v_responder_id, v_status, v_prompt_sender_id, v_existing_response
  FROM "public"."threads"
  WHERE id = p_thread_id;

  IF v_writer_id IS NULL THEN
    RAISE EXCEPTION 'thread_not_matched';
  END IF;

  IF v_uid <> v_writer_id AND v_uid <> v_responder_id THEN
    RAISE EXCEPTION 'not_participant';
  END IF;

  IF v_status <> 'closed' THEN
    RAISE EXCEPTION 'thread_not_closed';
  END IF;

  IF v_prompt_sender_id IS NULL THEN
    RAISE EXCEPTION 'wellbeing_prompt_not_sent';
  END IF;

  IF v_uid = v_prompt_sender_id THEN
    RAISE EXCEPTION 'cannot_respond_to_own_prompt';
  END IF;

  IF v_existing_response IS NOT NULL THEN
    RAISE EXCEPTION 'wellbeing_already_responded';
  END IF;

  UPDATE "public"."threads"
  SET
    wellbeing_response = p_response,
    wellbeing_responded_by = v_uid,
    wellbeing_responded_at = now()
  WHERE id = p_thread_id
    AND status = 'closed'
    AND wellbeing_prompt_sent_at IS NOT NULL
    AND wellbeing_response IS NULL
    AND wellbeing_prompt_sender_id <> v_uid
    AND (writer_id = v_uid OR responder_id = v_uid);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'wellbeing_already_responded';
  END IF;
END;
$$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."respond_wellbeing_check"(uuid, "public"."wellbeing_response") TO authenticated;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."reopen_thread"("p_thread_id" uuid)
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
  v_response "public"."wellbeing_response";
  v_updated integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT writer_id, responder_id, status, wellbeing_response
    INTO v_writer_id, v_responder_id, v_status, v_response
  FROM "public"."threads"
  WHERE id = p_thread_id;

  IF v_writer_id IS NULL THEN
    RAISE EXCEPTION 'thread_not_matched';
  END IF;

  IF v_uid <> v_writer_id AND v_uid <> v_responder_id THEN
    RAISE EXCEPTION 'not_participant';
  END IF;

  IF v_status <> 'closed' THEN
    RAISE EXCEPTION 'thread_not_closed';
  END IF;

  IF v_response IS NULL OR v_response = 'up' THEN
    RAISE EXCEPTION 'reopen_not_allowed';
  END IF;

  UPDATE "public"."threads"
  SET
    status = 'matched',
    wellbeing_prompt_sent_at = NULL,
    wellbeing_prompt_sender_id = NULL,
    wellbeing_response = NULL,
    wellbeing_responded_by = NULL,
    wellbeing_responded_at = NULL
  WHERE id = p_thread_id
    AND status = 'closed'
    AND wellbeing_response IS NOT NULL
    AND wellbeing_response <> 'up'
    AND (writer_id = v_uid OR responder_id = v_uid);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'reopen_not_allowed';
  END IF;
END;
$$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."reopen_thread"(uuid) TO authenticated;
