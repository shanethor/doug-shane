CREATE TABLE public.beta_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  assignee_id text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read beta todos" ON public.beta_todos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert beta todos" ON public.beta_todos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update beta todos" ON public.beta_todos FOR UPDATE USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.beta_todos;