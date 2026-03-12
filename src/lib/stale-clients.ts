import { supabase } from "@/integrations/supabase/client";

export type StaleClient = {
  id: string;
  account_name: string;
  stage: string;
  contact_name: string | null;
  email: string | null;
  updated_at: string;
  last_activity_at: string | null;
};

/**
 * Find leads owned by userId that have had NO correspondence activity
 * in the last `hoursThreshold` hours and are NOT in sold or lost stage.
 * Activity sources: synced_emails, audit_log, lead_notes, client_documents.
 */
export async function findStaleClients(
  userId: string,
  hoursThreshold = 48
): Promise<StaleClient[]> {
  const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString();

  // 1. Get active leads (not sold/lost)
  const { data: leads } = await supabase
    .from("leads")
    .select("id, account_name, stage, contact_name, email, updated_at")
    .eq("owner_user_id", userId)
    .in("stage", ["prospect", "quoting", "presenting"])
    .order("updated_at", { ascending: false });

  if (!leads || leads.length === 0) return [];

  // 2. Check which leads have approved policies (sold) — exclude them
  const { data: soldPolicies } = await supabase
    .from("policies")
    .select("lead_id")
    .eq("status", "approved");
  const soldIds = new Set((soldPolicies ?? []).map((p: any) => p.lead_id));

  const activeLeads = leads.filter((l) => !soldIds.has(l.id));
  if (activeLeads.length === 0) return [];

  const leadIds = activeLeads.map((l) => l.id);

  // 3. Get recent activity per lead from multiple sources
  const [emailsRes, auditRes, notesRes, docsRes] = await Promise.all([
    supabase
      .from("synced_emails")
      .select("client_id, received_at")
      .in("client_id", leadIds)
      .gte("received_at", cutoff),
    supabase
      .from("audit_log")
      .select("object_id, created_at")
      .eq("object_type", "lead")
      .in("object_id", leadIds)
      .gte("created_at", cutoff),
    supabase
      .from("lead_notes")
      .select("lead_id, created_at")
      .in("lead_id", leadIds)
      .gte("created_at", cutoff),
    supabase
      .from("client_documents")
      .select("lead_id, created_at")
      .in("lead_id", leadIds)
      .gte("created_at", cutoff),
  ]);

  // Build set of leads with recent activity
  const activeLeadIds = new Set<string>();
  (emailsRes.data ?? []).forEach((e: any) => activeLeadIds.add(e.client_id));
  (auditRes.data ?? []).forEach((a: any) => activeLeadIds.add(a.object_id));
  (notesRes.data ?? []).forEach((n: any) => activeLeadIds.add(n.lead_id));
  (docsRes.data ?? []).forEach((d: any) => activeLeadIds.add(d.lead_id));

  // 4. Filter to only stale leads (no recent activity)
  return activeLeads
    .filter((l) => !activeLeadIds.has(l.id))
    .map((l) => ({
      ...l,
      last_activity_at: l.updated_at,
    }));
}
