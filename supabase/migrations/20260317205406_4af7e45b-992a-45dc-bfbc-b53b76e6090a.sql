
-- ai_error_logs table
CREATE TABLE public.ai_error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid,
  session_id text,
  function_name text NOT NULL,
  operation text,
  error_code text,
  error_message text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  duration_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false
);

ALTER TABLE public.ai_error_logs ENABLE ROW LEVEL SECURITY;

-- INSERT: authenticated users can insert their own logs
CREATE POLICY "Users insert own ai error logs"
  ON public.ai_error_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- SELECT: user sees own logs, admin sees all
CREATE POLICY "Users read own or admin reads all ai error logs"
  ON public.ai_error_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- UPDATE: admin only (to mark resolved)
CREATE POLICY "Admins update ai error logs"
  ON public.ai_error_logs FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_error_logs;

-- user_log_access table
CREATE TABLE public.user_log_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  granted_by uuid,
  granted_at timestamptz DEFAULT now() NOT NULL,
  notes text
);

ALTER TABLE public.user_log_access ENABLE ROW LEVEL SECURITY;

-- SELECT: user sees own row
CREATE POLICY "Users read own log access"
  ON public.user_log_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- INSERT: admin only
CREATE POLICY "Admins insert log access"
  ON public.user_log_access FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- DELETE: admin only
CREATE POLICY "Admins delete log access"
  ON public.user_log_access FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
