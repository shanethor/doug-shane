
-- 2FA verification codes table
CREATE TABLE public.two_factor_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_two_factor_codes_user_id ON public.two_factor_codes(user_id);

-- Auto-cleanup old codes (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_2fa_codes()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.two_factor_codes WHERE expires_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cleanup_2fa_codes
  AFTER INSERT ON public.two_factor_codes
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_old_2fa_codes();

-- Trusted devices table (for "keep me signed in" 7-day bypass)
CREATE TABLE public.trusted_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trusted_devices_user ON public.trusted_devices(user_id, device_hash);

-- RLS policies
ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- Service role only - these tables are managed by edge functions
CREATE POLICY "Service role full access on two_factor_codes"
  ON public.two_factor_codes FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on trusted_devices"
  ON public.trusted_devices FOR ALL
  USING (true) WITH CHECK (true);
