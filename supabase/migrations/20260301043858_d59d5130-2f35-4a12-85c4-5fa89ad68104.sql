
-- Trigger: notify on lead stage change
CREATE OR REPLACE FUNCTION public.notify_pipeline_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.owner_user_id,
      'pipeline',
      NEW.account_name || ' moved to ' || REPLACE(NEW.stage::text, '_', ' '),
      'Stage changed from ' || REPLACE(OLD.stage::text, '_', ' ') || ' to ' || REPLACE(NEW.stage::text, '_', ' '),
      '/pipeline/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_stage_notification
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pipeline_change();

-- Trigger: notify on document upload
CREATE OR REPLACE FUNCTION public.notify_document_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    NEW.user_id,
    'document',
    'New document: ' || LEFT(NEW.file_name, 80),
    'Document type: ' || NEW.document_type,
    CASE WHEN NEW.lead_id IS NOT NULL THEN '/pipeline/' || NEW.lead_id ELSE '/clients' END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_document_upload_notification
  AFTER INSERT ON public.client_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_document_upload();

-- Trigger: notify agent on intake submission
CREATE OR REPLACE FUNCTION public.notify_intake_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id UUID;
BEGIN
  SELECT agent_id INTO v_agent_id
  FROM public.intake_links
  WHERE id = NEW.intake_link_id;

  IF v_agent_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      v_agent_id,
      'pipeline',
      'New intake from ' || NEW.customer_name,
      NEW.business_name || ' — ' || COALESCE(NEW.requested_coverage, 'No coverage specified'),
      '/clients'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_intake_submission_notification
  AFTER INSERT ON public.intake_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_intake_submission();
