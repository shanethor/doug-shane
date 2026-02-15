
-- Role enum and user_roles table for admin access
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS on user_roles: users can read their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

-- Business submissions table
CREATE TABLE public.business_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT,
  description TEXT,
  file_urls JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submissions" ON public.business_submissions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create submissions" ON public.business_submissions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions" ON public.business_submissions
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions" ON public.business_submissions
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all submissions" ON public.business_submissions
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Insurance applications (prefilled from AI extraction)
CREATE TABLE public.insurance_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.business_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  gaps JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications" ON public.insurance_applications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications" ON public.insurance_applications
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications" ON public.insurance_applications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications" ON public.insurance_applications
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all applications" ON public.insurance_applications
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_business_submissions_updated_at
BEFORE UPDATE ON public.business_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insurance_applications_updated_at
BEFORE UPDATE ON public.insurance_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
