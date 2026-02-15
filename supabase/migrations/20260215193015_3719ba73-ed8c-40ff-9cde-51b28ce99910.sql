
-- Custom ACORD form templates uploaded by producers
CREATE TABLE public.custom_form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  form_id TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates"
  ON public.custom_form_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create templates"
  ON public.custom_form_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.custom_form_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.custom_form_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Track field overrides for learning component
CREATE TABLE public.field_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  form_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  ai_value TEXT,
  override_value TEXT NOT NULL,
  submission_id UUID REFERENCES public.business_submissions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.field_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own overrides"
  ON public.field_overrides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create overrides"
  ON public.field_overrides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add narrative column to business_submissions
ALTER TABLE public.business_submissions
  ADD COLUMN IF NOT EXISTS narrative TEXT,
  ADD COLUMN IF NOT EXISTS coverage_lines TEXT[] DEFAULT '{}';

-- Add update trigger for custom_form_templates
CREATE TRIGGER update_custom_form_templates_updated_at
  BEFORE UPDATE ON public.custom_form_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
