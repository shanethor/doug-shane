
-- Table to track user corrections of AI-extracted field values
CREATE TABLE public.extraction_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  submission_id uuid REFERENCES public.business_submissions(id) ON DELETE CASCADE,
  form_id text NOT NULL,
  field_key text NOT NULL,
  field_label text,
  ai_value text,
  corrected_value text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extraction_corrections ENABLE ROW LEVEL SECURITY;

-- Users can insert their own corrections
CREATE POLICY "Users insert own corrections"
  ON public.extraction_corrections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own corrections
CREATE POLICY "Users read own corrections"
  ON public.extraction_corrections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Admins can update status
CREATE POLICY "Admins update corrections"
  ON public.extraction_corrections FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Also allow admins to read all feature suggestions
CREATE POLICY "Admins read all suggestions"
  ON public.feature_suggestions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
