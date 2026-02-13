
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  agency_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Quote requests
CREATE TABLE public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  industry TEXT,
  annual_revenue TEXT,
  employee_count TEXT,
  coverage_type TEXT NOT NULL,
  effective_date DATE,
  expiration_date DATE,
  current_carrier TEXT,
  current_premium TEXT,
  coverage_limits TEXT,
  deductible TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view own quotes" ON public.quote_requests FOR SELECT USING (auth.uid() = agent_id);
CREATE POLICY "Agents can insert own quotes" ON public.quote_requests FOR INSERT WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "Agents can update own quotes" ON public.quote_requests FOR UPDATE USING (auth.uid() = agent_id);
CREATE POLICY "Agents can delete own quotes" ON public.quote_requests FOR DELETE USING (auth.uid() = agent_id);

-- Quote documents
CREATE TABLE public.quote_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quote_requests(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view own quote docs" ON public.quote_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.quote_requests WHERE id = quote_id AND agent_id = auth.uid()));
CREATE POLICY "Agents can insert quote docs" ON public.quote_documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.quote_requests WHERE id = quote_id AND agent_id = auth.uid()));
CREATE POLICY "Agents can delete quote docs" ON public.quote_documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.quote_requests WHERE id = quote_id AND agent_id = auth.uid()));

-- Customer links
CREATE TABLE public.customer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quote_requests(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  customer_email TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view own links" ON public.customer_links FOR SELECT USING (auth.uid() = agent_id);
CREATE POLICY "Agents can create links" ON public.customer_links FOR INSERT WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "Agents can update own links" ON public.customer_links FOR UPDATE USING (auth.uid() = agent_id);
CREATE POLICY "Public can read links" ON public.customer_links FOR SELECT USING (true);

-- Customer submissions
CREATE TABLE public.customer_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES public.customer_links(id) ON DELETE CASCADE NOT NULL,
  quote_id UUID REFERENCES public.quote_requests(id) ON DELETE CASCADE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert submission" ON public.customer_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Agents can view own submissions" ON public.customer_submissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.quote_requests WHERE id = quote_id AND agent_id = auth.uid()));

-- Timestamp triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quote_requests_updated_at BEFORE UPDATE ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
