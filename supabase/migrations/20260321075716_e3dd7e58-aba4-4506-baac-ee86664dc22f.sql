
-- Booking links table
CREATE TABLE public.booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Meeting',
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  availability_template JSONB NOT NULL DEFAULT '{"mon":["09:00-12:00","13:00-17:00"],"tue":["09:00-12:00","13:00-17:00"],"wed":["09:00-12:00","13:00-17:00"],"thu":["09:00-12:00","13:00-17:00"],"fri":["09:00-12:00","13:00-17:00"]}'::jsonb,
  min_notice_minutes INTEGER NOT NULL DEFAULT 120,
  buffer_before INTEGER NOT NULL DEFAULT 0,
  buffer_after INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  public_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booking_links_slug_unique UNIQUE (public_slug)
);

-- Booked meetings table
CREATE TABLE public.booked_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID NOT NULL REFERENCES public.booking_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  notes TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  external_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.booking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booked_meetings ENABLE ROW LEVEL SECURITY;

-- Booking links: owners can CRUD
CREATE POLICY "Users manage own booking links" ON public.booking_links
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Booking links: public can read active links by slug (for public booking page)
CREATE POLICY "Public can read active booking links" ON public.booking_links
  FOR SELECT TO anon USING (is_active = true);

-- Booked meetings: owners can read their meetings
CREATE POLICY "Users read own booked meetings" ON public.booked_meetings
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Booked meetings: anon can insert (public booking)
CREATE POLICY "Public can create booked meetings" ON public.booked_meetings
  FOR INSERT TO anon WITH CHECK (true);

-- Booked meetings: authenticated can also insert
CREATE POLICY "Auth can create booked meetings" ON public.booked_meetings
  FOR INSERT TO authenticated WITH CHECK (true);

-- Booked meetings: public can read to check availability
CREATE POLICY "Public can read booked meetings for availability" ON public.booked_meetings
  FOR SELECT TO anon USING (status = 'scheduled');

-- Updated at triggers
CREATE TRIGGER update_booking_links_updated_at BEFORE UPDATE ON public.booking_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booked_meetings_updated_at BEFORE UPDATE ON public.booked_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
