-- Clean up old permissive policies that weren't dropped in the failed migration
DROP POLICY IF EXISTS "Anyone can insert beta messages" ON public.beta_messages;
DROP POLICY IF EXISTS "Anyone can insert beta todos" ON public.beta_todos;
DROP POLICY IF EXISTS "Anyone can update beta todos" ON public.beta_todos;