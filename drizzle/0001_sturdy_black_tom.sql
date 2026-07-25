ALTER TABLE "escalations" ADD COLUMN "police_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_enc" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_iv" text;