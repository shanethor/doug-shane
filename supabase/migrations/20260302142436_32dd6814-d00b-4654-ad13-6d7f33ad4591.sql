
-- Trigger: auto-create notification when a new client_document is uploaded
CREATE OR REPLACE FUNCTION public.notify_on_client_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _account_name text;
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    SELECT account_name INTO _account_name FROM leads WHERE id = NEW.lead_id;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, link, metadata)
  VALUES (
    NEW.user_id,
    'document',
    'New document uploaded',
    COALESCE(_account_name, 'Client') || ' — ' || NEW.file_name,
    CASE WHEN NEW.lead_id IS NOT NULL THEN '/leads/' || NEW.lead_id ELSE NULL END,
    jsonb_build_object('document_id', NEW.id, 'lead_id', NEW.lead_id, 'file_name', NEW.file_name)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_document ON client_documents;
CREATE TRIGGER trg_notify_client_document
  AFTER INSERT ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_client_document();

-- Trigger: auto-create notification when an intake submission is completed
CREATE OR REPLACE FUNCTION public.notify_on_intake_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agent_id uuid;
BEGIN
  SELECT agent_id INTO _agent_id FROM intake_links WHERE id = NEW.intake_link_id;

  IF _agent_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, link, metadata)
    VALUES (
      _agent_id,
      'pipeline',
      'Intake form submitted',
      NEW.business_name || ' — ' || NEW.customer_name,
      NULL,
      jsonb_build_object('intake_submission_id', NEW.id, 'business_name', NEW.business_name, 'customer_name', NEW.customer_name)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_intake_submission ON intake_submissions;
CREATE TRIGGER trg_notify_intake_submission
  AFTER INSERT ON intake_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_intake_submission();

-- Trigger: notify on personal intake submission
CREATE OR REPLACE FUNCTION public.notify_on_personal_intake()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'submitted' AND (OLD.status IS DISTINCT FROM 'submitted') THEN
    INSERT INTO notifications (user_id, type, title, body, link, metadata)
    VALUES (
      NEW.agent_id,
      'pipeline',
      'Personal intake submitted',
      'A client completed their personal lines intake form',
      '/inbox',
      jsonb_build_object('personal_intake_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_personal_intake ON personal_intake_submissions;
CREATE TRIGGER trg_notify_personal_intake
  AFTER UPDATE ON personal_intake_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_personal_intake();

-- Trigger: notify on lead stage change
CREATE OR REPLACE FUNCTION public.notify_on_lead_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO notifications (user_id, type, title, body, link, metadata)
    VALUES (
      NEW.owner_user_id,
      'pipeline',
      'Lead moved to ' || NEW.stage,
      NEW.account_name,
      '/leads/' || NEW.id,
      jsonb_build_object('lead_id', NEW.id, 'old_stage', OLD.stage, 'new_stage', NEW.stage)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lead_stage ON leads;
CREATE TRIGGER trg_notify_lead_stage
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_lead_stage_change();
