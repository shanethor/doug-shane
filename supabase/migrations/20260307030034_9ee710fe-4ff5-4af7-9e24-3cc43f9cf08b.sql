
-- ACORD Extraction Runs — stores each extraction attempt
CREATE TABLE public.acord_extraction_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id TEXT,
  submission_id UUID REFERENCES public.business_submissions(id) ON DELETE SET NULL,
  form_type TEXT NOT NULL,
  form_version TEXT,
  raw_ocr_text TEXT,
  model_output JSONB DEFAULT '{}'::jsonb,
  final_output JSONB DEFAULT '{}'::jsonb,
  page_count INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- ACORD Field Corrections — tracks human-in-the-loop fixes
CREATE TABLE public.acord_field_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_run_id UUID REFERENCES public.acord_extraction_runs(id) ON DELETE CASCADE NOT NULL,
  form_type TEXT NOT NULL,
  field_path TEXT NOT NULL,
  field_label TEXT,
  original_value TEXT,
  corrected_value TEXT NOT NULL,
  corrected_by_user_id UUID NOT NULL,
  corrected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.acord_extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acord_field_corrections ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see/manage their own extraction runs
CREATE POLICY "Users manage own extraction runs" ON public.acord_extraction_runs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can see all extraction runs
CREATE POLICY "Admins manage all extraction runs" ON public.acord_extraction_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: users can manage corrections they created
CREATE POLICY "Users manage own corrections" ON public.acord_field_corrections
  FOR ALL TO authenticated
  USING (corrected_by_user_id = auth.uid())
  WITH CHECK (corrected_by_user_id = auth.uid());

-- Admins can manage all corrections
CREATE POLICY "Admins manage all corrections" ON public.acord_field_corrections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_extraction_runs_form_type ON public.acord_extraction_runs(form_type);
CREATE INDEX idx_extraction_runs_user ON public.acord_extraction_runs(user_id);
CREATE INDEX idx_field_corrections_run ON public.acord_field_corrections(extraction_run_id);
CREATE INDEX idx_field_corrections_form_field ON public.acord_field_corrections(form_type, field_path);
