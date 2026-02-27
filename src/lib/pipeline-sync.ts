import { supabase } from "@/integrations/supabase/client";

/**
 * Creates a lead in the pipeline (quoting stage) when a client is added
 * via Chat or Clients page. Checks for duplicates by account name + owner.
 * Links the submission to the lead via business_submissions.lead_id.
 */
export async function ensurePipelineLead({
  userId,
  accountName,
  contactName,
  email,
  phone,
  state,
  businessType,
  submissionId,
}: {
  userId: string;
  accountName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  state?: string | null;
  businessType?: string | null;
  submissionId?: string | null;
}): Promise<string | null> {
  if (!accountName?.trim()) return null;

  // Check if a lead already exists for this account + owner
  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("owner_user_id", userId)
    .ilike("account_name", accountName.trim())
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Link the new submission to the existing lead
    if (submissionId) {
      await supabase
        .from("business_submissions")
        .update({ lead_id: existing.id } as any)
        .eq("id", submissionId);
    }
    return existing.id;
  }

  // Create new lead in quoting stage
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      account_name: accountName.trim(),
      contact_name: contactName || null,
      email: email || null,
      phone: phone || null,
      state: state || null,
      business_type: businessType || null,
      lead_source: "client_submission",
      owner_user_id: userId,
      stage: "quoting" as any,
      submission_id: submissionId || null,
    } as any)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create pipeline lead:", error);
    return null;
  }

  // Link submission to the new lead
  if (submissionId) {
    await supabase
      .from("business_submissions")
      .update({ lead_id: lead.id } as any)
      .eq("id", submissionId);
  }

  // Audit log
  await supabase.from("audit_log").insert({
    user_id: userId,
    action: "auto_create",
    object_type: "lead",
    object_id: lead.id,
    metadata: { source: "client_submission", account_name: accountName },
  });

  return lead.id;
}

/**
 * Find existing leads for a user, optionally filtered by name (fuzzy).
 * Used by chat to detect "add policy to [client]" intent.
 */
export async function findExistingLeads(userId: string, searchName?: string): Promise<{ id: string; account_name: string; stage: string }[]> {
  const query = supabase
    .from("leads")
    .select("id, account_name, stage")
    .eq("owner_user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  const { data } = await query;
  if (!data) return [];

  if (!searchName) return data;

  // Fuzzy match
  const needle = searchName.trim().toLowerCase();
  return data.filter(l => 
    l.account_name.toLowerCase().includes(needle) ||
    needle.includes(l.account_name.toLowerCase().split(" ")[0])
  );
}

/**
 * Get all submissions for a given lead (multi-policy support).
 */
export async function getLeadSubmissions(leadId: string): Promise<{ id: string; company_name: string | null; status: string; created_at: string }[]> {
  const { data } = await (supabase
    .from("business_submissions")
    .select("id, company_name, status, created_at") as any)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  return (data as any[]) || [];
}
