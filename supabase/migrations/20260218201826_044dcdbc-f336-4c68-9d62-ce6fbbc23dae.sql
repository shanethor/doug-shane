
CREATE TABLE public.generated_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_type TEXT NOT NULL, -- 'restaurant_supplement' or 'contractor_supplement'
  form_data JSONB NOT NULL DEFAULT '{}',
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

ALTER TABLE public.generated_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generated forms"
  ON public.generated_forms FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create generated forms"
  ON public.generated_forms FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated forms"
  ON public.generated_forms FOR DELETE USING (auth.uid() = user_id);
