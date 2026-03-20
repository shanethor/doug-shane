
-- Add key dates and gift tracking to touch_cadence_contacts
ALTER TABLE public.touch_cadence_contacts
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS anniversary DATE,
  ADD COLUMN IF NOT EXISTS milestone_date DATE,
  ADD COLUMN IF NOT EXISTS milestone_label TEXT,
  ADD COLUMN IF NOT EXISTS gift_preferences TEXT,
  ADD COLUMN IF NOT EXISTS relationship_tier TEXT DEFAULT 'B',
  ADD COLUMN IF NOT EXISTS last_gift_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS touch_type TEXT DEFAULT 'call';

-- Touch history log for tracking what was done
CREATE TABLE public.touch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cadence_contact_id UUID NOT NULL REFERENCES public.touch_cadence_contacts(id) ON DELETE CASCADE,
  touch_type TEXT NOT NULL DEFAULT 'call',
  note TEXT,
  calendar_event_id UUID REFERENCES public.calendar_events(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.touch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own touch history"
  ON public.touch_history
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
