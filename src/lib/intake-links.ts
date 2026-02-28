import { supabase } from "@/integrations/supabase/client";
import { ensurePipelineLead } from "@/lib/pipeline-sync";

/**
 * Generate an intake link for a customer.
 * If leadId / submissionId are provided, the intake results will merge with existing data.
 */
export async function generateIntakeLink({
  agentId,
  leadId,
  submissionId,
  customerName,
  customerEmail,
}: {
  agentId: string;
  leadId?: string | null;
  submissionId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
}): Promise<{ url: string; token: string } | null> {
  const { data, error } = await supabase
    .from("intake_links")
    .insert({
      agent_id: agentId,
      lead_id: leadId || null,
      submission_id: submissionId || null,
      customer_name: customerName || null,
      customer_email: customerEmail || null,
    })
    .select("token")
    .single();

  if (error || !data) {
    console.error("Failed to create intake link:", error);
    return null;
  }

  const token = data.token;
  const url = `${window.location.origin}/intake/${token}`;
  return { url, token };
}

/**
 * Process an intake submission: create or update client, lead, and submission records.
 * Called by a polling mechanism or realtime subscription on the agent side.
 */
export async function processIntakeSubmission(intakeSubmission: any, intakeLink: any) {
  const agentId = intakeLink.agent_id;
  const businessName = intakeSubmission.business_name;

  // Check if lead already exists
  let leadId = intakeLink.lead_id;
  
  if (!leadId) {
    // Create new lead via pipeline sync
    leadId = await ensurePipelineLead({
      userId: agentId,
      accountName: businessName,
      contactName: intakeSubmission.customer_name,
      email: intakeSubmission.customer_email,
      submissionId: intakeLink.submission_id,
    });
  }

  return leadId;
}

/**
 * Generate a personal lines intake link.
 * Delivery emails specify who receives the summary email on submission.
 */
export async function generatePersonalIntakeLink({
  agentId,
  deliveryEmails,
  clientEmail,
  ccProducer,
}: {
  agentId: string;
  deliveryEmails: string[];
  clientEmail?: string;
  ccProducer?: boolean;
}): Promise<{ url: string; token: string } | null> {
  const insertPayload = {
    agent_id: agentId,
    delivery_emails: deliveryEmails,
    client_email: clientEmail || null,
    cc_producer: ccProducer ?? false,
  };
  console.log("Inserting personal intake link:", insertPayload);

  const { data, error } = await supabase
    .from("personal_intake_submissions")
    .insert(insertPayload as any)
    .select("token")
    .single();

  console.log("Personal intake insert result:", { data, error });

  if (error || !data) {
    console.error("Failed to create personal intake link:", error);
    throw new Error(error?.message || "Insert returned no data");
  }

  const token = (data as any).token;
  const url = `${window.location.origin}/personal-intake/${token}`;
  return { url, token };
}
