ALTER TABLE "public"."threads" ADD COLUMN "topic_tags" text[] DEFAULT '{}'::text[] NOT NULL;
