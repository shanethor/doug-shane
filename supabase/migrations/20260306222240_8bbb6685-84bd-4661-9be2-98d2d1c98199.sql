
-- Migrate existing 'user' roles to 'producer'
UPDATE public.user_roles SET role = 'producer' WHERE role = 'user';

-- Manager-to-Producer assignment table
CREATE TABLE public.manager_producer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  producer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(manager_user_id, producer_user_id)
);
ALTER TABLE public.manager_producer_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can do anything, managers can see their own assignments
CREATE POLICY "Admins full access on manager_producer_assignments"
  ON public.manager_producer_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers see own assignments"
  ON public.manager_producer_assignments FOR SELECT TO authenticated
  USING (manager_user_id = auth.uid());

-- Client Service Assignment table
CREATE TABLE public.client_service_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_service_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'all_clients',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(producer_user_id, client_service_user_id)
);
ALTER TABLE public.client_service_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on client_service_assignments"
  ON public.client_service_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Producers manage own CS assignments"
  ON public.client_service_assignments FOR ALL TO authenticated
  USING (producer_user_id = auth.uid());

CREATE POLICY "CS users see their assignments"
  ON public.client_service_assignments FOR SELECT TO authenticated
  USING (client_service_user_id = auth.uid());

-- Client Service Clients junction table
CREATE TABLE public.client_service_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.client_service_assignments(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, lead_id)
);
ALTER TABLE public.client_service_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on client_service_clients"
  ON public.client_service_clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Producers manage own CS clients"
  ON public.client_service_clients FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_service_assignments csa
      WHERE csa.id = assignment_id AND csa.producer_user_id = auth.uid()
    )
  );

CREATE POLICY "CS users see their client assignments"
  ON public.client_service_clients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_service_assignments csa
      WHERE csa.id = assignment_id AND csa.client_service_user_id = auth.uid()
    )
  );

-- Security definer function to get a user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1),
    'producer'
  )
$$;

-- Security definer function to get accessible lead IDs for a user
CREATE OR REPLACE FUNCTION public.get_accessible_lead_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Get user's role
  WITH user_role AS (
    SELECT COALESCE(
      (SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1),
      'producer'
    ) AS role
  )
  SELECT l.id FROM public.leads l, user_role ur
  WHERE
    CASE ur.role
      -- Admin: all leads
      WHEN 'admin' THEN true
      -- Producer: own leads only
      WHEN 'producer' THEN l.owner_user_id = _user_id
      -- Manager: leads from assigned producers
      WHEN 'manager' THEN l.owner_user_id IN (
        SELECT producer_user_id FROM public.manager_producer_assignments
        WHERE manager_user_id = _user_id
      ) OR l.owner_user_id = _user_id
      -- Client Services: delegated leads
      WHEN 'client_services' THEN (
        -- All clients from producers with scope = 'all_clients'
        l.owner_user_id IN (
          SELECT producer_user_id FROM public.client_service_assignments
          WHERE client_service_user_id = _user_id AND scope = 'all_clients'
        )
        OR
        -- Specific clients
        l.id IN (
          SELECT csc.lead_id FROM public.client_service_clients csc
          JOIN public.client_service_assignments csa ON csa.id = csc.assignment_id
          WHERE csa.client_service_user_id = _user_id AND csa.scope = 'specific_clients'
        )
      )
      ELSE false
    END
$$;
