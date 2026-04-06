
CREATE OR REPLACE FUNCTION public.get_engine_kpis(_user_id uuid, _since timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT source, tier, status
    FROM public.engine_leads
    WHERE owner_user_id = _user_id
      AND detected_at >= _since
  ),
  total AS (
    SELECT count(*) AS cnt FROM base
  ),
  converted AS (
    SELECT count(*) AS cnt FROM base WHERE status = 'converted'
  ),
  by_source AS (
    SELECT source,
           count(*) AS leads,
           count(*) FILTER (WHERE tier = 1) AS tier1
    FROM base
    GROUP BY source
  )
  SELECT jsonb_build_object(
    'totalLeads', (SELECT cnt FROM total),
    'converted', (SELECT cnt FROM converted),
    'sourceBreakdown', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('source', source, 'leads', leads, 'tier1', tier1)) FROM by_source),
      '[]'::jsonb
    )
  );
$$;
