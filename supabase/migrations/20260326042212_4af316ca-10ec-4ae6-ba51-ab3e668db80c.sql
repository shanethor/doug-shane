
-- Email discovered contacts from inbox scanning
CREATE TABLE public.email_discovered_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_address TEXT NOT NULL,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  domain TEXT,
  hunter_verified BOOLEAN,
  hunter_confidence INTEGER,
  hunter_position TEXT,
  hunter_company TEXT,
  hunter_linkedin_url TEXT,
  hunter_twitter_url TEXT,
  hunter_phone TEXT,
  enrichment_status TEXT NOT NULL DEFAULT 'pending',
  enrichment_data JSONB DEFAULT '{}',
  prospect_score INTEGER,
  matches_ideal_profile BOOLEAN DEFAULT false,
  seen_in_threads_with JSONB DEFAULT '[]',
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  email_frequency INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'discovered',
  linked_canonical_id UUID REFERENCES public.canonical_persons(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, email_address)
);

ALTER TABLE public.email_discovered_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own discovered contacts" ON public.email_discovered_contacts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own discovered contacts" ON public.email_discovered_contacts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own discovered contacts" ON public.email_discovered_contacts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own discovered contacts" ON public.email_discovered_contacts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- User consent records (append-only audit trail)
CREATE TABLE public.user_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  accepted BOOLEAN NOT NULL,
  accepted_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consent" ON public.user_consent_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own consent" ON public.user_consent_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Contact social profiles
CREATE TABLE public.contact_social_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_person_id UUID REFERENCES public.canonical_persons(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  profile_url TEXT,
  username TEXT,
  verified BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contact_social_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view social profiles of own contacts" ON public.contact_social_profiles
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.canonical_persons cp WHERE cp.id = canonical_person_id AND cp.owner_user_id = auth.uid())
  );
CREATE POLICY "Users can manage social profiles of own contacts" ON public.contact_social_profiles
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.canonical_persons cp WHERE cp.id = canonical_person_id AND cp.owner_user_id = auth.uid())
  );

-- Feeder list sessions
CREATE TABLE public.feeder_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL,
  client_canonical_id UUID REFERENCES public.canonical_persons(id),
  client_name TEXT,
  meeting_date DATE,
  status TEXT NOT NULL DEFAULT 'generating',
  generated_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.feeder_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feeder lists" ON public.feeder_lists
  FOR SELECT TO authenticated USING (auth.uid() = producer_id);
CREATE POLICY "Users can insert own feeder lists" ON public.feeder_lists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = producer_id);
CREATE POLICY "Users can update own feeder lists" ON public.feeder_lists
  FOR UPDATE TO authenticated USING (auth.uid() = producer_id);

-- Feeder list prospects
CREATE TABLE public.feeder_list_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feeder_list_id UUID REFERENCES public.feeder_lists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  email TEXT,
  phone TEXT,
  occupation TEXT,
  company TEXT,
  location TEXT,
  relationship_to_client TEXT,
  connection_type TEXT,
  life_event_signals JSONB DEFAULT '[]',
  is_mutual_with_producer BOOLEAN DEFAULT false,
  prospect_score INTEGER,
  suggested_talking_point TEXT,
  status TEXT NOT NULL DEFAULT 'discovered',
  enrichment_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.feeder_list_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feeder list prospects" ON public.feeder_list_prospects
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.feeder_lists fl WHERE fl.id = feeder_list_id AND fl.producer_id = auth.uid())
  );
CREATE POLICY "Users can update own feeder list prospects" ON public.feeder_list_prospects
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.feeder_lists fl WHERE fl.id = feeder_list_id AND fl.producer_id = auth.uid())
  );

-- Ideal prospect configuration templates
CREATE TABLE public.prospect_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Default',
  producer_id UUID NOT NULL,
  life_event_triggers JSONB DEFAULT '["new_baby", "marriage", "home_purchase", "job_change"]',
  age_range_min INTEGER,
  age_range_max INTEGER,
  location_radius_miles INTEGER DEFAULT 50,
  industry_preferences TEXT[] DEFAULT '{}',
  income_bracket TEXT,
  exclude_existing_contacts BOOLEAN DEFAULT true,
  connection_depth INTEGER DEFAULT 2,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.prospect_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own prospect profiles" ON public.prospect_profiles
  FOR ALL TO authenticated USING (auth.uid() = producer_id);

-- Enrichment API usage tracking
CREATE TABLE public.enrichment_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  endpoint TEXT,
  feeder_list_id UUID REFERENCES public.feeder_lists(id),
  email_discovered_contact_id UUID REFERENCES public.email_discovered_contacts(id),
  credits_consumed INTEGER DEFAULT 0,
  response_status INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.enrichment_api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api logs" ON public.enrichment_api_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own api logs" ON public.enrichment_api_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
