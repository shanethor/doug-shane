-- Add connect_vertical column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS connect_vertical text;

-- Add an index for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_connect_vertical ON public.profiles (connect_vertical);