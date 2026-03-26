
-- Consent version management
CREATE TABLE public.consent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_type TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  body_text TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(consent_type, version)
);
ALTER TABLE public.consent_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read consent versions" ON public.consent_versions FOR SELECT TO authenticated USING (true);

-- Add consent_version_id to user_consent_records for linking
ALTER TABLE public.user_consent_records ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.user_consent_records ADD COLUMN IF NOT EXISTS consent_version_id UUID REFERENCES public.consent_versions(id);

-- Privacy/deletion requests (GDPR/CCPA)
CREATE TABLE public.privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('data_export', 'data_deletion', 'opt_out_sharing', 'right_to_know')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'denied')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  response_data JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own privacy requests" ON public.privacy_requests FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Feeder list analytics / conversion tracking
ALTER TABLE public.feeder_list_prospects ADD COLUMN IF NOT EXISTS converted_to_meeting BOOLEAN DEFAULT false;
ALTER TABLE public.feeder_list_prospects ADD COLUMN IF NOT EXISTS meeting_date TIMESTAMPTZ;
ALTER TABLE public.feeder_list_prospects ADD COLUMN IF NOT EXISTS converted_to_client BOOLEAN DEFAULT false;
ALTER TABLE public.feeder_list_prospects ADD COLUMN IF NOT EXISTS client_converted_at TIMESTAMPTZ;
ALTER TABLE public.feeder_list_prospects ADD COLUMN IF NOT EXISTS intro_email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.feeder_list_prospects ADD COLUMN IF NOT EXISTS intro_email_sent_at TIMESTAMPTZ;

-- Agency-wide network mapping
CREATE TABLE public.agency_network_overlaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  producer_user_ids UUID[] NOT NULL DEFAULT '{}',
  overlap_count INTEGER NOT NULL DEFAULT 1,
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agency_network_overlaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view agency overlaps" ON public.agency_network_overlaps FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Email signature contacts (Phase 2 - opt-in body parsing)
CREATE TABLE public.email_signature_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_email_id TEXT,
  extracted_name TEXT,
  extracted_email TEXT,
  extracted_phone TEXT,
  extracted_title TEXT,
  extracted_company TEXT,
  extracted_address TEXT,
  extracted_website TEXT,
  extracted_linkedin TEXT,
  confidence NUMERIC(3,2) DEFAULT 0,
  linked_canonical_id UUID REFERENCES public.canonical_persons(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_signature_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sig contacts" ON public.email_signature_contacts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Pre-meeting auto-trigger tracking
ALTER TABLE public.feeder_lists ADD COLUMN IF NOT EXISTS auto_triggered BOOLEAN DEFAULT false;
ALTER TABLE public.feeder_lists ADD COLUMN IF NOT EXISTS calendar_event_id UUID;
ALTER TABLE public.feeder_lists ADD COLUMN IF NOT EXISTS emailed_to_producer BOOLEAN DEFAULT false;
ALTER TABLE public.feeder_lists ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;

-- Intro email templates/drafts
CREATE TABLE public.intro_email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prospect_id UUID REFERENCES public.feeder_list_prospects(id),
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'cancelled')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.intro_email_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own intro drafts" ON public.intro_email_drafts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Seed initial consent versions
INSERT INTO public.consent_versions (consent_type, version, title, body_text) VALUES
('data_sharing_agreement', '1.0', 'Data Sharing Agreement', 'I acknowledge that AuRa will use data I provide and connect to power Connect Intelligence features. I understand my data will not be sold and I can revoke access at any time.'),
('social_enrichment', '1.0', 'Social Enrichment Consent', 'I consent to AuRa sending limited contact data to third-party enrichment providers for the purpose of building prospect profiles within my account.'),
('email_access', '1.0', 'Email Access Consent', 'I authorize AuRa to access my email headers (sender names, email addresses) in read-only mode for contact discovery. Email body content is never read in this mode.'),
('email_body_parsing', '1.0', 'Email Signature Parsing Consent', 'I authorize AuRa to read email signatures to extract contact information (names, phone numbers, titles). Only signature blocks are processed; email body content is not stored or analyzed.');
