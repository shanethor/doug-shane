import { supabase } from "@/integrations/supabase/client";

/**
 * Creates a lead in the pipeline (quoting stage) when a client is added
 * via Chat or Clients page. Checks for duplicates by account name + owner.
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

  if (existing) return existing.id;

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
