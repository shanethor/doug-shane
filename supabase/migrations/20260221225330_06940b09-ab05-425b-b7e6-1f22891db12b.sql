
-- Pipeline lead stages enum
CREATE TYPE public.lead_stage AS ENUM ('prospect', 'quoting', 'presenting', 'lost');

-- Policy status enum
CREATE TYPE public.policy_status AS ENUM ('pending', 'approved', 'rejected');

-- Document type enum
CREATE TYPE public.document_type AS ENUM ('binder', 'dec', 'invoice', 'other');

-- Leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  state TEXT,
  business_type TEXT,
  lead_source TEXT,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage lead_stage NOT NULL DEFAULT 'prospect',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Policies table
CREATE TABLE public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  producer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carrier TEXT NOT NULL,
  line_of_business TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  effective_date DATE NOT NULL,
  annual_premium DECIMAL(12,2) NOT NULL,
  revenue DECIMAL(12,2) GENERATED ALWAYS AS (annual_premium * 0.12) STORED,
  status policy_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by_user_id UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by_user_id UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Policy documents table (file_url stores a URL string)
CREATE TABLE public.policy_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  document_type document_type NOT NULL DEFAULT 'other',
  uploaded_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead notes table
CREATE TABLE public.lead_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log table
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Leads RLS
CREATE POLICY "Producers see own leads" ON public.leads
  FOR SELECT USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Producers create own leads" ON public.leads
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Producers update own leads" ON public.leads
  FOR UPDATE USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Producers delete own leads" ON public.leads
  FOR DELETE USING (owner_user_id = auth.uid());

-- Policies RLS
CREATE POLICY "Producers see own policies" ON public.policies
  FOR SELECT USING (producer_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Producers create own policies" ON public.policies
  FOR INSERT WITH CHECK (producer_user_id = auth.uid());

CREATE POLICY "Producers update own policies" ON public.policies
  FOR UPDATE USING (producer_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Policy documents RLS
CREATE POLICY "Users see related policy docs" ON public.policy_documents
  FOR SELECT USING (
    uploaded_by_user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.policies p WHERE p.id = policy_id AND p.producer_user_id = auth.uid())
  );

CREATE POLICY "Users upload policy docs" ON public.policy_documents
  FOR INSERT WITH CHECK (uploaded_by_user_id = auth.uid());

-- Lead notes RLS
CREATE POLICY "Users see notes on own leads" ON public.lead_notes
  FOR SELECT USING (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_user_id = auth.uid())
  );

CREATE POLICY "Users create notes" ON public.lead_notes
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Audit log RLS
CREATE POLICY "Admins see audit log" ON public.audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users write audit" ON public.audit_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Updated_at triggers
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
