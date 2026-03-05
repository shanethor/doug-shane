-- Backfill external_calendars from email_connections using correct provider name
INSERT INTO public.external_calendars (user_id, provider, email_address, access_token, refresh_token, token_expires_at, is_active)
SELECT user_id,
  CASE WHEN provider = 'gmail' THEN 'google' ELSE provider END,
  email_address, access_token, refresh_token, token_expires_at, is_active
FROM public.email_connections
WHERE is_active = true
ON CONFLICT (user_id, provider) DO UPDATE SET
  access_token = EXCLUDED.access_token,
  refresh_token = EXCLUDED.refresh_token,
  token_expires_at = EXCLUDED.token_expires_at,
  email_address = EXCLUDED.email_address,
  is_active = EXCLUDED.is_active,
  updated_at = now();