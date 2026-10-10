CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
CREATE TABLE app_private.cron_config (
  name text PRIMARY KEY,
  value text NOT NULL
);
REVOKE ALL ON app_private.cron_config FROM PUBLIC, anon, authenticated;