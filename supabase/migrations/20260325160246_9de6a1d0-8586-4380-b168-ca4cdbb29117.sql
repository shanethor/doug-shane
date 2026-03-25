
INSERT INTO public.booking_links (
  user_id, title, description, duration_minutes, timezone,
  availability_template, min_notice_minutes, buffer_before, buffer_after,
  is_active, public_slug
) VALUES (
  '77f8c5de-6462-4721-b654-3909c398667b',
  'Aura Studio Discovery Call',
  'Learn how Aura Studio can build custom AI tools for your firm.',
  30,
  'America/New_York',
  '{"mon":["14:00-22:00"],"tue":["14:00-22:00"],"wed":["14:00-22:00"],"thu":["14:00-22:00"],"fri":["14:00-22:00"],"sat":[],"sun":[]}',
  60, 5, 5,
  true,
  'aura-studio'
) ON CONFLICT DO NOTHING;
