
-- Clark profiles table
CREATE TABLE public.clark_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  producer_name TEXT,
  firm_name TEXT,
  firm_address TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  license_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clark submissions table
CREATE TABLE public.clark_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  client_name TEXT,
  business_name TEXT,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  missing_fields JSONB DEFAULT '[]'::jsonb,
  questionnaire_token TEXT UNIQUE,
  questionnaire_completed BOOLEAN DEFAULT false,
  carriers TEXT[] DEFAULT '{}',
  acord_forms TEXT[] DEFAULT '{}',
  final_zip_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add clark tier and submission count to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS clark_tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS clark_submission_count INTEGER DEFAULT 0;

-- RLS for clark_profiles
ALTER TABLE public.clark_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own clark profile"
  ON public.clark_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS for clark_submissions
ALTER TABLE public.clark_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own submissions"
  ON public.clark_submissions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin access
CREATE POLICY "Admins can view all clark profiles"
  ON public.clark_profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all clark submissions"
  ON public.clark_submissions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER set_clark_profiles_updated_at
  BEFORE UPDATE ON public.clark_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_clark_submissions_updated_at
  BEFORE UPDATE ON public.clark_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
