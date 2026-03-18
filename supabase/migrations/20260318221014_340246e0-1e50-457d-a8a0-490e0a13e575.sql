
-- ═══════════════════════════════════════════════════════════
-- 1. Canonical Persons (Contact Resolver output)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.canonical_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  display_name TEXT,
  primary_email TEXT,
  primary_phone TEXT,
  company TEXT,
  title TEXT,
  linkedin_url TEXT,
  location TEXT,
  tier TEXT DEFAULT 'c' CHECK (tier IN ('s','a','b','c')),
  is_business_owner BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canonical_persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own canonical persons"
  ON public.canonical_persons FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Link network_contacts to canonical persons
ALTER TABLE public.network_contacts
  ADD COLUMN IF NOT EXISTS canonical_person_id UUID REFERENCES public.canonical_persons(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════
-- 2. Relationship Edges (graph)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.relationship_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  person_a_id UUID NOT NULL REFERENCES public.canonical_persons(id) ON DELETE CASCADE,
  person_b_id UUID NOT NULL REFERENCES public.canonical_persons(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'knows',
  email_score NUMERIC DEFAULT 0,
  call_score NUMERIC DEFAULT 0,
  calendar_score NUMERIC DEFAULT 0,
  social_score NUMERIC DEFAULT 0,
  overall_strength NUMERIC DEFAULT 0,
  last_touch TIMESTAMPTZ,
  interaction_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id, person_a_id, person_b_id)
);

ALTER TABLE public.relationship_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own edges"
  ON public.relationship_edges FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- 3. Sharing Levels (multi-pro visibility)
-- ═══════════════════════════════════════════════════════════
CREATE TYPE public.sharing_level AS ENUM ('private', 'mutual_only', 'shared');

CREATE TABLE public.contact_sharing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  canonical_person_id UUID NOT NULL REFERENCES public.canonical_persons(id) ON DELETE CASCADE,
  sharing_level public.sharing_level DEFAULT 'private',
  shared_with_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id, canonical_person_id, shared_with_user_id)
);

ALTER TABLE public.contact_sharing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sharing"
  ON public.contact_sharing_settings FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- 4. Contact Merge Queue (resolver review)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.contact_merge_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  contact_a_id UUID NOT NULL REFERENCES public.network_contacts(id) ON DELETE CASCADE,
  contact_b_id UUID NOT NULL REFERENCES public.network_contacts(id) ON DELETE CASCADE,
  confidence NUMERIC DEFAULT 0,
  match_reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  resolved_canonical_id UUID REFERENCES public.canonical_persons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.contact_merge_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own merge queue"
  ON public.contact_merge_queue FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- 5. Outreach Feedback Tracking
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.outreach_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  touch_id TEXT NOT NULL,
  target_name TEXT,
  target_company TEXT,
  outreach_type TEXT,
  action TEXT NOT NULL CHECK (action IN ('approved', 'dismissed', 'sent', 'replied', 'meeting_booked', 'intro_made', 'deal_opened', 'no_response')),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own feedback"
  ON public.outreach_feedback FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- 6. Data Visibility Settings (What Aura Sees)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.data_visibility_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source TEXT NOT NULL,
  data_type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, source, data_type)
);

ALTER TABLE public.data_visibility_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own visibility settings"
  ON public.data_visibility_settings FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
