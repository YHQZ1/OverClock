CREATE TABLE "match_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"seed" integer NOT NULL,
	"winner_side" smallint,
	"scores" jsonb NOT NULL,
	"action_log" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"side" smallint NOT NULL,
	"format" text NOT NULL,
	"name" text NOT NULL,
	"players" jsonb NOT NULL,
	"total_score" integer NOT NULL,
	"match_points" integer NOT NULL,
	"won" boolean,
	"crashes" integer NOT NULL,
	"downtime_sec" real NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"format" text NOT NULL,
	"theme" text NOT NULL,
	"winner_side" smallint,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_rounds" ADD CONSTRAINT "match_rounds_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_teams" ADD CONSTRAINT "match_teams_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_teams_board_idx" ON "match_teams" USING btree ("format","hidden","match_points");--> statement-breakpoint
CREATE INDEX "matches_completed_at_idx" ON "matches" USING btree ("completed_at");