
-- Community posts (board + win of the week)
CREATE TABLE public.connect_community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  post_type TEXT NOT NULL DEFAULT 'discussion',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  likes_count INT NOT NULL DEFAULT 0,
  replies_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.connect_community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all posts"
  ON public.connect_community_posts FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can create their own posts"
  ON public.connect_community_posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.connect_community_posts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

-- Community post likes
CREATE TABLE public.connect_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.connect_community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.connect_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read likes"
  ON public.connect_post_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can like posts"
  ON public.connect_post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own likes"
  ON public.connect_post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Relationship health checks
CREATE TABLE public.relationship_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_name TEXT NOT NULL,
  contact_company TEXT,
  health_score INT NOT NULL CHECK (health_score >= 1 AND health_score <= 5),
  notes TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.relationship_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own health checks"
  ON public.relationship_health_checks FOR ALL
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Referral tracking
CREATE TABLE public.connect_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id UUID NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_company TEXT,
  referred_contact_name TEXT NOT NULL,
  referred_contact_company TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.connect_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own referrals"
  ON public.connect_referrals FOR ALL
  TO authenticated USING (auth.uid() = sender_user_id)
  WITH CHECK (auth.uid() = sender_user_id);

-- Enable realtime for community posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.connect_community_posts;
