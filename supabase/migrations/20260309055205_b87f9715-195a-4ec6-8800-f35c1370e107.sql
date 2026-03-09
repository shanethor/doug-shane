
-- Fix: Pipeline notifications should link to /pipeline, not /inbox or NULL

-- Update intake submission notification trigger to link to /pipeline
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
      '/pipeline',
      jsonb_build_object('intake_submission_id', NEW.id, 'business_name', NEW.business_name, 'customer_name', NEW.customer_name)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Update personal intake notification trigger to link to /pipeline
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
      '/pipeline',
      jsonb_build_object('personal_intake_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Fix existing pipeline notifications that have NULL or wrong links
UPDATE notifications
SET link = '/pipeline'
WHERE type = 'pipeline'
  AND (link IS NULL OR link = '/inbox');
