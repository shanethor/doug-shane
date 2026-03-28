ALTER TABLE public.network_contacts
  DROP CONSTRAINT network_contacts_canonical_person_id_fkey,
  ADD CONSTRAINT network_contacts_canonical_person_id_fkey
    FOREIGN KEY (canonical_person_id) REFERENCES public.canonical_persons(id)
    ON DELETE SET NULL;

ALTER TABLE public.email_discovered_contacts
  DROP CONSTRAINT email_discovered_contacts_linked_canonical_id_fkey,
  ADD CONSTRAINT email_discovered_contacts_linked_canonical_id_fkey
    FOREIGN KEY (linked_canonical_id) REFERENCES public.canonical_persons(id)
    ON DELETE SET NULL;

ALTER TABLE public.feeder_lists
  DROP CONSTRAINT feeder_lists_client_canonical_id_fkey,
  ADD CONSTRAINT feeder_lists_client_canonical_id_fkey
    FOREIGN KEY (client_canonical_id) REFERENCES public.canonical_persons(id)
    ON DELETE SET NULL;

ALTER TABLE public.email_signature_contacts
  DROP CONSTRAINT email_signature_contacts_linked_canonical_id_fkey,
  ADD CONSTRAINT email_signature_contacts_linked_canonical_id_fkey
    FOREIGN KEY (linked_canonical_id) REFERENCES public.canonical_persons(id)
    ON DELETE SET NULL;