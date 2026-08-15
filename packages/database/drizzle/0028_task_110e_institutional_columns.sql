ALTER TABLE "institutional_flow_observations" ADD COLUMN "buy_average_price" numeric(28, 10);--> statement-breakpoint
ALTER TABLE "institutional_flow_observations" ADD COLUMN "sell_average_price" numeric(28, 10);--> statement-breakpoint
ALTER TABLE "institutional_flow_observations" ADD COLUMN "total_volume" numeric(28, 10);--> statement-breakpoint
ALTER TABLE "institutional_flow_observations" ADD COLUMN "market_share" numeric(20, 12);--> statement-breakpoint
ALTER TABLE "institutional_flow_observations" ADD COLUMN "rank" numeric(10, 0);--> statement-breakpoint
ALTER TABLE "institutional_flow_observations" ADD COLUMN "coverage_ratio" numeric(20, 12);--> statement-breakpoint
ALTER TABLE "settlement_snapshots" ADD COLUMN "coverage_ratio" numeric(20, 12);--> statement-breakpoint
ALTER TABLE "institutional_flow_observations" ADD CONSTRAINT "institutional_flow_market_share_check" CHECK ("institutional_flow_observations"."market_share" is null or ("institutional_flow_observations"."market_share" >= 0 and "institutional_flow_observations"."market_share" <= 1));--> statement-breakpoint
ALTER TABLE "institutional_flow_observations" ADD CONSTRAINT "institutional_flow_coverage_ratio_check" CHECK ("institutional_flow_observations"."coverage_ratio" is null or ("institutional_flow_observations"."coverage_ratio" >= 0 and "institutional_flow_observations"."coverage_ratio" <= 1));--> statement-breakpoint
ALTER TABLE "settlement_snapshots" ADD CONSTRAINT "settlement_snapshot_holding_ratio_check" CHECK ("settlement_snapshots"."holding_ratio" is null or ("settlement_snapshots"."holding_ratio" >= 0 and "settlement_snapshots"."holding_ratio" <= 1));--> statement-breakpoint
ALTER TABLE "settlement_snapshots" ADD CONSTRAINT "settlement_snapshot_change_ratio_check" CHECK ("settlement_snapshots"."change_ratio" is null or ("settlement_snapshots"."change_ratio" >= -1 and "settlement_snapshots"."change_ratio" <= 1));--> statement-breakpoint
ALTER TABLE "settlement_snapshots" ADD CONSTRAINT "settlement_snapshot_coverage_ratio_check" CHECK ("settlement_snapshots"."coverage_ratio" is null or ("settlement_snapshots"."coverage_ratio" >= 0 and "settlement_snapshots"."coverage_ratio" <= 1));--> statement-breakpoint
ALTER TABLE "settlement_snapshots" ADD CONSTRAINT "settlement_snapshot_residency_check" CHECK ("settlement_snapshots"."residency" in ('FOREIGN','DOMESTIC','UNKNOWN'));