
-- Add win_probability column to leads (default based on stage)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS win_probability integer DEFAULT NULL;

-- Add stage_changed_at column to track when stage last changed
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz DEFAULT now();

-- Backfill stage_changed_at with updated_at for existing leads
UPDATE public.leads SET stage_changed_at = updated_at WHERE stage_changed_at IS NULL OR stage_changed_at = now();

-- Create a trigger to auto-set stage_changed_at when stage changes
CREATE OR REPLACE FUNCTION public.set_stage_changed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.stage_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_stage_changed_at ON public.leads;
CREATE TRIGGER trg_set_stage_changed_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stage_changed_at();
