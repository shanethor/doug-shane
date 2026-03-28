
-- Add classification columns to email_discovered_contacts
DO $$
BEGIN
  -- Add contact_type with new enum values if not already the right type
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_classification_type') THEN
    CREATE TYPE public.contact_classification_type AS ENUM ('person_business', 'person_personal', 'company', 'spam_or_system', 'unknown');
  END IF;
END$$;

-- Drop old contact_type column if it exists and re-add with proper type
ALTER TABLE public.email_discovered_contacts
  ADD COLUMN IF NOT EXISTS classification_type text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS classification_confidence real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_filtered boolean DEFAULT false;

-- Add same columns to network_contacts for synced contacts
ALTER TABLE public.network_contacts
  ADD COLUMN IF NOT EXISTS classification_type text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS classification_confidence real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_filtered boolean DEFAULT false;
