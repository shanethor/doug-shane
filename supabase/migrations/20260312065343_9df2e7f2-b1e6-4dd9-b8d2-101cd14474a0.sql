
-- Add new unique constraints on (user_id, provider, email_address) to allow multiple accounts per provider
ALTER TABLE public.email_connections 
  ADD CONSTRAINT email_connections_user_provider_email_unique UNIQUE (user_id, provider, email_address);

ALTER TABLE public.external_calendars 
  ADD CONSTRAINT external_calendars_user_provider_email_unique UNIQUE (user_id, provider, email_address);
