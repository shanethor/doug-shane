CREATE TABLE public.beta_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id text NOT NULL,
  recipient_id text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read beta messages" ON public.beta_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert beta messages" ON public.beta_messages FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.beta_messages;