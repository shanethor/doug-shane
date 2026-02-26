import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { intake_link_id } = await req.json();
    if (!intake_link_id) {
      return new Response(JSON.stringify({ error: "intake_link_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get the intake link
    const { data: link, error: linkErr } = await supabase
      .from("intake_links")
      .select("*")
      .eq("id", intake_link_id)
      .single();
    if (linkErr || !link) {
      return new Response(JSON.stringify({ error: "Link not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the submission
    const { data: submission, error: subErr } = await supabase
      .from("intake_submissions")
      .select("*")
      .eq("intake_link_id", intake_link_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (subErr || !submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agentId = link.agent_id;
    const businessName = submission.business_name;

    // Mark link as used (service role bypasses RLS)
    await supabase.from("intake_links").update({ is_used: true }).eq("id", link.id);

    // Check if lead already exists
    let leadId = link.lead_id;
    if (!leadId) {
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("owner_user_id", agentId)
        .ilike("account_name", businessName.trim())
        .limit(1)
        .maybeSingle();

      if (existing) {
        leadId = existing.id;
      } else {
        // Create new lead in quoting stage
        const { data: newLead } = await supabase
          .from("leads")
          .insert({
            account_name: businessName.trim(),
            contact_name: submission.customer_name,
            email: submission.customer_email,
            lead_source: "customer_intake",
            owner_user_id: agentId,
            stage: "quoting",
            submission_id: link.submission_id,
          })
          .select("id")
          .single();

        if (newLead) {
          leadId = newLead.id;
          // Audit log
          await supabase.from("audit_log").insert({
            user_id: agentId,
            action: "auto_create",
            object_type: "lead",
            object_id: newLead.id,
            metadata: { source: "customer_intake", account_name: businessName },
          });
        }
      }
    }

    // Create or link business submission
    let submissionId = link.submission_id;
    if (!submissionId) {
      const { data: newSub } = await supabase
        .from("business_submissions")
        .insert({
          user_id: agentId,
          company_name: businessName,
          description: `Customer intake: ${submission.requested_coverage || "General coverage"}. ${submission.additional_notes || ""}`.trim(),
          status: "pending",
          coverage_lines: submission.requested_coverage ? [submission.requested_coverage] : [],
          narrative: `Customer ${submission.customer_name} (${submission.customer_email}) submitted an intake form. Coverage: ${submission.requested_coverage || "Not specified"}. Premium budget: ${submission.requested_premium || "Not specified"}.`,
        })
        .select("id")
        .single();

      if (newSub) {
        submissionId = newSub.id;
        // Update link and lead with submission
        await supabase.from("intake_links").update({ submission_id: newSub.id, lead_id: leadId }).eq("id", link.id);
        if (leadId) {
          await supabase.from("leads").update({ submission_id: newSub.id }).eq("id", leadId);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, lead_id: leadId, submission_id: submissionId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
