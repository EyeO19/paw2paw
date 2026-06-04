CREATE TYPE "public"."thread_status" AS ENUM('pending', 'matched', 'closed');--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "thread_status" DEFAULT 'pending' NOT NULL,
	"writer_id" uuid NOT NULL,
	"responder_id" uuid
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hashed_display_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opt_in_responder" boolean DEFAULT false NOT NULL,
	"topic_tags" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_id_auth_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_writer_id_users_id_fk" FOREIGN KEY ("writer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_responder_id_users_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_thread_id_created_at_idx" ON "messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "threads_status_created_at_idx" ON "threads" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_hashed_display_id_unique" ON "users" USING btree ("hashed_display_id");