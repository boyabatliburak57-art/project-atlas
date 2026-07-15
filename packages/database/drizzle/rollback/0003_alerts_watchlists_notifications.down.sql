-- DESTRUCTIVE MANUAL ROLLBACK for 0003_alerts_watchlists_notifications.sql.
-- Alert, watchlist and notification data must be backed up before execution.
-- Drizzle migrations remain forward-only; after this rollback remove only the matching
-- migration journal row before reapplying forward.

BEGIN;

DROP TABLE IF EXISTS notification_outbox;
DROP TABLE IF EXISTS notification_deliveries;
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS alert_triggers;
DROP TABLE IF EXISTS alert_states;
DROP TABLE IF EXISTS alert_evaluations;
DROP TABLE IF EXISTS alert_revisions;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS watchlist_item_tags;
DROP TABLE IF EXISTS watchlist_items;
DROP TABLE IF EXISTS watchlists;
DROP FUNCTION IF EXISTS prevent_alert_revision_mutation();

COMMIT;
