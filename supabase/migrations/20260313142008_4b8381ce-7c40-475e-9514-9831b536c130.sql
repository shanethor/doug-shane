-- Add extraction tracking columns to client_documents table
ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS extraction_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS extraction_confidence numeric(4,3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS doc_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS extraction_metadata jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_pages integer DEFAULT NULL;

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_extraction_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.extraction_status IS NOT NULL AND NEW.extraction_status NOT IN ('pending', 'processing', 'complete', 'partial', 'failed') THEN
    RAISE EXCEPTION 'Invalid extraction_status: %. Must be one of: pending, processing, complete, partial, failed', NEW.extraction_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_extraction_status ON public.client_documents;
CREATE TRIGGER trg_validate_extraction_status
  BEFORE INSERT OR UPDATE ON public.client_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_extraction_status();

-- Index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_client_documents_extraction_status
  ON public.client_documents(extraction_status)
  WHERE extraction_status != 'complete';