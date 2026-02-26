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

    // Mark link as used
    await supabase.from("intake_links").update({ is_used: true }).eq("id", link.id);

    // Parse structured fields from additional_notes
    const notes = submission.additional_notes || "";
    const parseField = (label: string): string => {
      const re = new RegExp(`^${label}:\\s*(.+)$`, "mi");
      const m = notes.match(re);
      return m ? m[1].trim() : "";
    };

    const ein = parseField("FEIN / EIN");
    const phone = parseField("Phone");
    const businessType = parseField("Business Type");
    const address = parseField("Address");
    const cityStateZip = parseField("City/State/Zip");
    const employeeCount = parseField("Number of Employees");
    const annualRevenue = parseField("Annual Revenue");
    const yearsInBusiness = parseField("Years in Business");
    const freeNotes = parseField("Notes");

    // Parse city/state/zip
    const cszParts = cityStateZip.split(",").map((s: string) => s.trim());
    const city = cszParts[0] || "";
    const state = cszParts[1] || "";
    const zip = cszParts[2] || "";

    // Build a comprehensive narrative for AI extraction
    const narrativeParts = [
      `Customer ${submission.customer_name} (${submission.customer_email}) submitted an intake form for ${businessName}.`,
    ];
    if (ein) narrativeParts.push(`FEIN: ${ein}.`);
    if (phone) narrativeParts.push(`Phone: ${phone}.`);
    if (businessType) narrativeParts.push(`Business type: ${businessType}.`);
    if (address) narrativeParts.push(`Mailing address: ${address}, ${city}, ${state} ${zip}.`);
    else if (city || state || zip) narrativeParts.push(`Location: ${city}, ${state} ${zip}.`);
    if (employeeCount) narrativeParts.push(`Number of employees: ${employeeCount}.`);
    if (annualRevenue) narrativeParts.push(`Annual revenue: ${annualRevenue}.`);
    if (yearsInBusiness) narrativeParts.push(`Years in business: ${yearsInBusiness}.`);
    if (submission.requested_coverage) narrativeParts.push(`Coverage requested: ${submission.requested_coverage}.`);
    if (submission.requested_premium) narrativeParts.push(`Premium budget: ${submission.requested_premium}.`);
    if (freeNotes) narrativeParts.push(`Additional notes: ${freeNotes}`);

    const fullNarrative = narrativeParts.join(" ");

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
        const { data: newLead } = await supabase
          .from("leads")
          .insert({
            account_name: businessName.trim(),
            contact_name: submission.customer_name,
            email: submission.customer_email,
            phone: phone || null,
            business_type: businessType || null,
            state: state || null,
            lead_source: "customer_intake",
            owner_user_id: agentId,
            stage: "quoting",
            submission_id: link.submission_id,
          })
          .select("id")
          .single();

        if (newLead) {
          leadId = newLead.id;
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
          description: `Customer intake: ${submission.requested_coverage || "General coverage"}. ${freeNotes || ""}`.trim(),
          status: "pending",
          coverage_lines: submission.requested_coverage ? [submission.requested_coverage] : [],
          narrative: fullNarrative,
        })
        .select("id")
        .single();

      if (newSub) {
        submissionId = newSub.id;
        await supabase.from("intake_links").update({ submission_id: newSub.id, lead_id: leadId }).eq("id", link.id);
        if (leadId) {
          await supabase.from("leads").update({ submission_id: newSub.id }).eq("id", leadId);
        }
      }
    } else {
      // Update existing submission narrative with all intake data
      await supabase.from("business_submissions").update({ narrative: fullNarrative }).eq("id", submissionId);
    }

    return new Response(
      JSON.stringify({ success: true, lead_id: leadId, submission_id: submissionId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("process-intake error:", err);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
