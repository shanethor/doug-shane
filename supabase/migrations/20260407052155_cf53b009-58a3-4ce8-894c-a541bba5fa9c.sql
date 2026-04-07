
-- Social posts table for LinkedIn analytics data
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin_url TEXT,
  post_url TEXT,
  post_text TEXT,
  post_format TEXT DEFAULT 'text',
  posted_at TIMESTAMP WITH TIME ZONE,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  reposts INTEGER DEFAULT 0,
  views INTEGER,
  impressions INTEGER,
  engagement_rate NUMERIC(5,2),
  audience_demographics JSONB,
  source TEXT NOT NULL DEFAULT 'proxycurl',
  external_post_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, external_post_id)
);

-- LinkedIn profile sync metadata
CREATE TABLE public.social_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  linkedin_url TEXT NOT NULL,
  profile_name TEXT,
  headline TEXT,
  follower_count INTEGER DEFAULT 0,
  connection_count INTEGER,
  profile_photo_url TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_source TEXT NOT NULL DEFAULT 'proxycurl',
  extension_installed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own social posts" ON public.social_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own social posts" ON public.social_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own social posts" ON public.social_posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own social profile" ON public.social_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own social profile" ON public.social_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own social profile" ON public.social_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Allow service role to upsert from edge functions (extension ingest)
CREATE POLICY "Service role full access posts" ON public.social_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access profiles" ON public.social_profiles FOR ALL USING (true) WITH CHECK (true);
