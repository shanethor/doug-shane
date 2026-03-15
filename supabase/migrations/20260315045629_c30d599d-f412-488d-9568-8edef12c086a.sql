
-- 1. Create carriers table
CREATE TABLE public.carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  loss_run_email text,
  loss_run_fax text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view carriers"
  ON public.carriers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage carriers"
  ON public.carriers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert carriers"
  ON public.carriers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update carriers"
  ON public.carriers FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete carriers"
  ON public.carriers FOR DELETE
  TO authenticated
  USING (true);

-- 2. Add new columns to loss_run_requests
ALTER TABLE public.loss_run_requests
  ADD COLUMN IF NOT EXISTS named_insured text,
  ADD COLUMN IF NOT EXISTS insured_address text,
  ADD COLUMN IF NOT EXISTS insured_city text,
  ADD COLUMN IF NOT EXISTS insured_state text,
  ADD COLUMN IF NOT EXISTS insured_zip text,
  ADD COLUMN IF NOT EXISTS insured_phone text,
  ADD COLUMN IF NOT EXISTS signer_name text,
  ADD COLUMN IF NOT EXISTS signer_title text,
  ADD COLUMN IF NOT EXISTS signer_email text,
  ADD COLUMN IF NOT EXISTS producer_email text,
  ADD COLUMN IF NOT EXISTS producer_fax text,
  ADD COLUMN IF NOT EXISTS aor_needed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS signature_token text,
  ADD COLUMN IF NOT EXISTS signed_pdf_url text,
  ADD COLUMN IF NOT EXISTS returned_loss_run_url text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_scheduled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS days_before_renewal integer DEFAULT 90,
  ADD COLUMN IF NOT EXISTS years_requested integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES public.business_submissions(id),
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- 3. Add new statuses to loss_run_status enum
ALTER TYPE public.loss_run_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE public.loss_run_status ADD VALUE IF NOT EXISTS 'awaiting_signature';
ALTER TYPE public.loss_run_status ADD VALUE IF NOT EXISTS 'fulfilled';
ALTER TYPE public.loss_run_status ADD VALUE IF NOT EXISTS 'cancelled';

-- 4. Add columns to loss_run_policy_items
ALTER TABLE public.loss_run_policy_items
  ADD COLUMN IF NOT EXISTS carrier_id uuid REFERENCES public.carriers(id),
  ADD COLUMN IF NOT EXISTS policy_type text,
  ADD COLUMN IF NOT EXISTS fax_number text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
