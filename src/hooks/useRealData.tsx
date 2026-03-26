import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getAuthHeaders } from "@/lib/auth-fetch";

/** Check if user has real email connections */
export function useRealEmailData() {
  const { user } = useAuth();
  const [hasEmail, setHasEmail] = useState<boolean | null>(null);
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
        method: "POST", headers, body: JSON.stringify({ action: "list" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const conns = data.connections || [];
        setHasEmail(conns.length > 0);
        if (conns.length > 0) {
          // Fetch synced emails
          const { data: syncedEmails } = await supabase
            .from("synced_emails")
            .select("*")
            .eq("user_id", user.id)
            .order("received_at", { ascending: false })
            .limit(50);
          setEmails((syncedEmails as any[]) || []);
        }
      } else {
        setHasEmail(false);
      }
    } catch {
      setHasEmail(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);
  return { hasEmail, emails, loading, refresh };
}

/** Check if user has real pipeline leads */
export function useRealPipelineData() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(100);
      setLeads((data as any[]) || []);
    } catch {} finally { setLoading(false); }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);
  return { leads, hasLeads: leads.length > 0, loading, refresh };
}

/** Check if user has real calendar events */
export function useRealCalendarData() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time", { ascending: true })
        .limit(200);
      setEvents((data as any[]) || []);
    } catch {} finally { setLoading(false); }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);
  return { events, hasEvents: events.length > 0, loading, refresh };
}

/** Check if user has real network contacts */
export function useRealNetworkData() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("canonical_persons")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(500);
      setContacts((data as any[]) || []);
    } catch {} finally { setLoading(false); }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);
  return { contacts, hasContacts: contacts.length > 0, loading, refresh };
}
