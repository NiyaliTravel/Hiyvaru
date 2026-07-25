ALTER TABLE "listener_profiles" ADD COLUMN "topics" jsonb;--> statement-breakpoint
ALTER TABLE "match_queue" ADD COLUMN "preferred_listener_id" uuid;