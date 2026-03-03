
-- Calendar event types
CREATE TYPE public.calendar_event_type AS ENUM (
  'presentation', 'coverage_review', 'renewal_review', 'claim_review', 'follow_up', 'other'
);

CREATE TYPE public.calendar_event_status AS ENUM (
  'scheduled', 'completed', 'cancelled', 'no_show'
);

-- External calendar connections (Outlook/Google calendar, separate from email connections)
CREATE TABLE public.external_calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('outlook', 'google')),
  calendar_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  email_address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE public.external_calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendars"
  ON public.external_calendars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendars"
  ON public.external_calendars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendars"
  ON public.external_calendars FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendars"
  ON public.external_calendars FOR DELETE
  USING (auth.uid() = user_id);

-- Calendar events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  external_event_id TEXT,
  provider TEXT CHECK (provider IN ('outlook', 'google', 'aura')),
  event_type public.calendar_event_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  attendees TEXT[],
  status public.calendar_event_status NOT NULL DEFAULT 'scheduled',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
  ON public.calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON public.calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON public.calendar_events FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_external_calendars_updated_at
  BEFORE UPDATE ON public.external_calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast event lookups
CREATE INDEX idx_calendar_events_user_time ON public.calendar_events (user_id, start_time);
CREATE INDEX idx_calendar_events_lead ON public.calendar_events (lead_id);
