
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing jobs if any (idempotent)
DO $$ BEGIN
  PERFORM cron.unschedule(jobname) FROM cron.job WHERE jobname IN
    ('signal-ingest-2h','signal-image-retry-30m','signal-learn-daily','signal-digest-hourly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('signal-ingest-2h', '0 */2 * * *', $$
  SELECT net.http_post(
    url := 'https://wxastapzvnktttlhaiwe.supabase.co/functions/v1/signal-ingest',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4YXN0YXB6dm5rdHR0bGhhaXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjUwNzQsImV4cCI6MjA4NjU0MTA3NH0.YrMEKU-mvGYKmYcdRiZUorl1WXv2mDCY97GZ8ead9vI"}'::jsonb,
    body := '{}'::jsonb);
$$);

SELECT cron.schedule('signal-image-retry-30m', '*/30 * * * *', $$
  SELECT net.http_post(
    url := 'https://wxastapzvnktttlhaiwe.supabase.co/functions/v1/signal-image-retry',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4YXN0YXB6dm5rdHR0bGhhaXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjUwNzQsImV4cCI6MjA4NjU0MTA3NH0.YrMEKU-mvGYKmYcdRiZUorl1WXv2mDCY97GZ8ead9vI"}'::jsonb,
    body := '{}'::jsonb);
$$);

SELECT cron.schedule('signal-learn-daily', '0 2 * * *', $$
  SELECT net.http_post(
    url := 'https://wxastapzvnktttlhaiwe.supabase.co/functions/v1/signal-learn',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4YXN0YXB6dm5rdHR0bGhhaXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjUwNzQsImV4cCI6MjA4NjU0MTA3NH0.YrMEKU-mvGYKmYcdRiZUorl1WXv2mDCY97GZ8ead9vI"}'::jsonb,
    body := '{}'::jsonb);
$$);

SELECT cron.schedule('signal-digest-hourly', '5 * * * *', $$
  SELECT net.http_post(
    url := 'https://wxastapzvnktttlhaiwe.supabase.co/functions/v1/signal-digest',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4YXN0YXB6dm5rdHR0bGhhaXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjUwNzQsImV4cCI6MjA4NjU0MTA3NH0.YrMEKU-mvGYKmYcdRiZUorl1WXv2mDCY97GZ8ead9vI"}'::jsonb,
    body := '{}'::jsonb);
$$);
