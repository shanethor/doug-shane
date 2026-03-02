
-- Trigger: notify on loss_run_requests status change
CREATE OR REPLACE FUNCTION public.notify_on_loss_run_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'not_requested' THEN
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT account_name, owner_user_id INTO v_lead
  FROM public.leads WHERE id = NEW.lead_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  v_title := 'Loss Runs: ' || 
    CASE NEW.status
      WHEN 'requested' THEN 'Requested'
      WHEN 'sent' THEN 'Sent to carrier'
      WHEN 'partial_received' THEN 'Partially received'
      WHEN 'complete_received' THEN 'Complete'
      WHEN 'not_needed' THEN 'Not needed'
      ELSE NEW.status
    END;

  v_body := v_lead.account_name;

  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  VALUES (
    v_lead.owner_user_id,
    'loss_run',
    v_title,
    v_body,
    '/leads/' || NEW.lead_id,
    jsonb_build_object('lead_id', NEW.lead_id, 'status', NEW.status)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_loss_run_change ON public.loss_run_requests;
CREATE TRIGGER trg_notify_loss_run_change
  AFTER INSERT OR UPDATE ON public.loss_run_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_loss_run_change();
