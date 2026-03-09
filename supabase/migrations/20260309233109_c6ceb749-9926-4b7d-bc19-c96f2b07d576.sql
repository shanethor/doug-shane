-- Fix get_accessible_lead_ids to handle 'advisor' role (renamed from 'producer')
CREATE OR REPLACE FUNCTION public.get_accessible_lead_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_role AS (
    SELECT COALESCE(
      (SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1),
      'advisor'
    ) AS role
  )
  SELECT l.id FROM public.leads l, user_role ur
  WHERE
    CASE ur.role
      WHEN 'admin' THEN true
      WHEN 'producer' THEN l.owner_user_id = _user_id
      WHEN 'advisor' THEN l.owner_user_id = _user_id
      WHEN 'manager' THEN l.owner_user_id IN (
        SELECT producer_user_id FROM public.manager_producer_assignments
        WHERE manager_user_id = _user_id
      ) OR l.owner_user_id = _user_id
      WHEN 'client_services' THEN (
        l.owner_user_id IN (
          SELECT producer_user_id FROM public.client_service_assignments
          WHERE client_service_user_id = _user_id AND scope = 'all_clients'
        )
        OR
        l.id IN (
          SELECT csc.lead_id FROM public.client_service_clients csc
          JOIN public.client_service_assignments csa ON csa.id = csc.assignment_id
          WHERE csa.client_service_user_id = _user_id AND csa.scope = 'specific_clients'
        )
      )
      ELSE false
    END
$$;

-- Allow admins and managers to view all profiles (needed for scoreboard/directory)
CREATE POLICY "Admins and managers can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- Drop the old restrictive policy first
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Allow admins and managers to view all producer goals (needed for scoreboard)
CREATE POLICY "Admins and managers can view all goals"
  ON public.producer_goals FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view their own goals" ON public.producer_goals;