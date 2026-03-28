
-- Lead Marketplace tables
CREATE TABLE public.lead_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lead_type TEXT NOT NULL DEFAULT 'general',
  estimated_value NUMERIC DEFAULT 0,
  referral_offer_type TEXT DEFAULT 'flat_fee',
  referral_offer_value NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  elo_min NUMERIC DEFAULT NULL,
  elo_max NUMERIC DEFAULT NULL,
  preferred_industries TEXT[] DEFAULT '{}',
  preferred_states TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_post_id UUID REFERENCES public.lead_posts(id) ON DELETE CASCADE NOT NULL,
  claimer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_elo (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  elo_rating NUMERIC NOT NULL DEFAULT 1200,
  reliability_score NUMERIC NOT NULL DEFAULT 50,
  deals_completed INTEGER NOT NULL DEFAULT 0,
  positive_ratings INTEGER NOT NULL DEFAULT 0,
  negative_ratings INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_claim_id UUID REFERENCES public.lead_claims(id) ON DELETE CASCADE NOT NULL,
  rater_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rated_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead Generator tables
CREATE TABLE public.company_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  industry TEXT DEFAULT '',
  icp_description TEXT DEFAULT '',
  target_geos TEXT[] DEFAULT '{}',
  typical_deal_size TEXT DEFAULT '',
  revenue_range TEXT DEFAULT '',
  target_buyer_titles TEXT[] DEFAULT '{}',
  website_urls TEXT[] DEFAULT '{}',
  extracted_profile JSONB DEFAULT '{}',
  vertical_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.generated_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL DEFAULT 'web',
  company_name TEXT NOT NULL,
  website TEXT DEFAULT '',
  location TEXT DEFAULT '',
  firmographics JSONB DEFAULT '{}',
  contacts JSONB DEFAULT '[]',
  fit_score NUMERIC DEFAULT 0,
  intent_score NUMERIC DEFAULT NULL,
  raw_source_links TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  data_quality_score NUMERIC DEFAULT NULL,
  vertical_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.lead_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_elo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_leads ENABLE ROW LEVEL SECURITY;

-- lead_posts: anyone authenticated can read open posts, owners manage their own
CREATE POLICY "Anyone can view open lead posts" ON public.lead_posts FOR SELECT TO authenticated USING (status = 'open' OR owner_user_id = auth.uid());
CREATE POLICY "Users manage own lead posts" ON public.lead_posts FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Users update own lead posts" ON public.lead_posts FOR UPDATE TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "Users delete own lead posts" ON public.lead_posts FOR DELETE TO authenticated USING (owner_user_id = auth.uid());

-- lead_claims: claimers and post owners can see claims
CREATE POLICY "Users see relevant claims" ON public.lead_claims FOR SELECT TO authenticated USING (claimer_user_id = auth.uid() OR lead_post_id IN (SELECT id FROM public.lead_posts WHERE owner_user_id = auth.uid()));
CREATE POLICY "Users create claims" ON public.lead_claims FOR INSERT TO authenticated WITH CHECK (claimer_user_id = auth.uid());
CREATE POLICY "Relevant users update claims" ON public.lead_claims FOR UPDATE TO authenticated USING (claimer_user_id = auth.uid() OR lead_post_id IN (SELECT id FROM public.lead_posts WHERE owner_user_id = auth.uid()));

-- user_elo: public read, users manage own
CREATE POLICY "Anyone can view elo" ON public.user_elo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own elo" ON public.user_elo FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own elo" ON public.user_elo FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- lead_ratings: public read, raters insert
CREATE POLICY "Anyone can view ratings" ON public.lead_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create ratings" ON public.lead_ratings FOR INSERT TO authenticated WITH CHECK (rater_user_id = auth.uid());

-- company_profiles: owner only
CREATE POLICY "Users manage own profiles" ON public.company_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own profiles" ON public.company_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own profiles" ON public.company_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- generated_leads: owner only
CREATE POLICY "Users see own generated leads" ON public.generated_leads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own generated leads" ON public.generated_leads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own generated leads" ON public.generated_leads FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own generated leads" ON public.generated_leads FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_lead_posts_updated_at BEFORE UPDATE ON public.lead_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lead_claims_updated_at BEFORE UPDATE ON public.lead_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_elo_updated_at BEFORE UPDATE ON public.user_elo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON public.company_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_generated_leads_updated_at BEFORE UPDATE ON public.generated_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
