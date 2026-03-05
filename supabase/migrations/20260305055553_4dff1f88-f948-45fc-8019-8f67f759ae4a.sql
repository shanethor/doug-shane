-- Fix trusted_devices: restrict to own records (uuid column)
DROP POLICY IF EXISTS "Service role full access on trusted_devices" ON public.trusted_devices;

CREATE POLICY "Users can read their own trusted devices"
  ON public.trusted_devices FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own trusted devices"
  ON public.trusted_devices FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own trusted devices"
  ON public.trusted_devices FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Fix two_factor_codes: restrict to own records (uuid column)
DROP POLICY IF EXISTS "Service role full access on two_factor_codes" ON public.two_factor_codes;

CREATE POLICY "Users can read their own 2FA codes"
  ON public.two_factor_codes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own 2FA codes"
  ON public.two_factor_codes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Fix beta_messages (text columns - already dropped in failed migration)
CREATE POLICY "Users can insert their own beta messages"
  ON public.beta_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid()::text);

CREATE POLICY "Users can read their own beta messages"
  ON public.beta_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid()::text OR recipient_id = auth.uid()::text);

-- Fix beta_todos (text columns - already dropped in failed migration)
CREATE POLICY "Users can insert their own beta todos"
  ON public.beta_todos FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Users can read own or assigned beta todos"
  ON public.beta_todos FOR SELECT TO authenticated
  USING (created_by = auth.uid()::text OR assignee_id = auth.uid()::text);

CREATE POLICY "Users can update own or assigned beta todos"
  ON public.beta_todos FOR UPDATE TO authenticated
  USING (created_by = auth.uid()::text OR assignee_id = auth.uid()::text)
  WITH CHECK (created_by = auth.uid()::text OR assignee_id = auth.uid()::text);