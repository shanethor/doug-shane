
-- Lead data sources config table for multi-state property polling
CREATE TABLE public.lead_data_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL,
  source_name TEXT NOT NULL,
  api_url TEXT NOT NULL,
  api_type TEXT DEFAULT 'socrata',
  requires_auth BOOLEAN DEFAULT FALSE,
  auth_env_key TEXT,
  active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(state, source_name)
);

ALTER TABLE public.lead_data_sources ENABLE ROW LEVEL SECURITY;

-- Only admins can manage data sources
CREATE POLICY "Admins can manage lead_data_sources" ON public.lead_data_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can read
CREATE POLICY "Authenticated users can read lead_data_sources" ON public.lead_data_sources
  FOR SELECT TO authenticated
  USING (true);

-- Add state column to engine_leads if not exists
ALTER TABLE public.engine_leads ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.engine_leads ADD COLUMN IF NOT EXISTS trigger_type TEXT;
ALTER TABLE public.engine_leads ADD COLUMN IF NOT EXISTS flood_zone TEXT;
ALTER TABLE public.engine_leads ADD COLUMN IF NOT EXISTS flood_insurance_needed BOOLEAN DEFAULT FALSE;

-- Seed the initial data sources for Northeast states
INSERT INTO public.lead_data_sources (state, source_name, api_url, api_type, requires_auth, auth_env_key, notes) VALUES
  ('CT', 'ct_property_transfers', 'https://data.ct.gov/resource/5mzw-sjtu.json', 'socrata', false, null, 'Real-time property transfer data — ~500 new sales/week'),
  ('NY', 'nyc_acris_master', 'https://data.cityofnewyork.us/resource/8h5j-fqxa.json', 'socrata', false, null, 'NYC ACRIS Real Property Master — deeds, mortgages'),
  ('NY', 'nyc_acris_parties', 'https://data.cityofnewyork.us/resource/636b-3b5g.json', 'socrata', false, null, 'NYC ACRIS Party data — buyer/seller names'),
  ('NY', 'nyc_acris_legals', 'https://data.cityofnewyork.us/resource/uqqa-hyyf.json', 'socrata', false, null, 'NYC ACRIS Legals — property address from block/lot'),
  ('NY', 'nyc_pluto', 'https://data.cityofnewyork.us/resource/64uk-42ks.json', 'socrata', false, null, 'NYC PLUTO — property detail, year built, assessments'),
  ('MA', 'massgis_parcels', 'https://gis.massgis.state.ma.us/arcgis/rest/services/MASSGIS_DATA_PARCELS/MapServer/0/query', 'arcgis', false, null, 'MassGIS parcels — biannual bulk, ArcGIS REST for queries'),
  ('NJ', 'nj_mod4_assessments', 'https://www.nj.gov/treasury/taxation/lpt/proprecords.shtml', 'direct_download', false, null, 'NJ MOD-IV fixed-width assessment files — quarterly'),
  ('NJ', 'nj_sales_data', 'https://www.nj.gov/treasury/taxation/lpt/realtransfer.shtml', 'direct_download', false, null, 'NJ property sales Excel files — quarterly by county'),
  ('RI', 'ri_fema_coastal', 'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer', 'arcgis', false, null, 'RI relies on FEMA/NOAA coastal data — no statewide parcel API')
ON CONFLICT (state, source_name) DO NOTHING;
