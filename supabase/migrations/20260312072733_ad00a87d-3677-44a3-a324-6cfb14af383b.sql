
ALTER TABLE public.email_connections 
  DROP CONSTRAINT IF EXISTS email_connections_user_id_provider_key;

ALTER TABLE public.external_calendars 
  DROP CONSTRAINT IF EXISTS external_calendars_user_id_provider_key;
