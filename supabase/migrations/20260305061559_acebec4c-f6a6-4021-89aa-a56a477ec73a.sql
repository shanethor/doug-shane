-- Add unique constraint on calendar_events so sync upsert works
ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_user_id_external_event_id_key UNIQUE (user_id, external_event_id);