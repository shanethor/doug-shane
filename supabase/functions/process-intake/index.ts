import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Maps intake coverage line selections to ACORD 125 LOB checkbox keys.
 * This ensures the correct Lines of Business are checked on the base application.
 */
const COVERAGE_TO_LOB_CHECKBOX: Record<string, string> = {
  "General Liability": "lob_commercial_general_liability",
  "Workers Compensation": "lob_workers_compensation",
  "Commercial Auto": "lob_business_auto",
  "Property": "lob_commercial_property",
  "Commercial Property": "lob_commercial_property",
  "Umbrella": "lob_umbrella",
  "Umbrella / Excess": "lob_umbrella",
  "Cyber Liability": "lob_cyber",
  "Professional Liability (E&O)": "lob_professional_liability",
  "Professional Liability": "lob_professional_liability",
  "Business Owners Policy (BOP)": "lob_bop",
  "Other": "lob_other",
};

/**
 * Normalizes a business type string from intake into ACORD-standard entity types.
 */
const normalizeBusinessType = (raw: string): string => {
  const l = (raw || "").toLowerCase();
  if (/llc|limited\s*liability\s*company/i.test(l)) return "LLC";
  if (/corp|inc\b/i.test(l)) return "Corporation";
  if (/partner/i.test(l)) return "Partnership";
  if (/sole\s*prop/i.test(l)) return "Individual";
  if (/non[\s-]?profit|501/i.test(l)) return "Not-for-Profit";
  if (/trust/i.test(l)) return "Trust";
  if (/joint[\s-]?venture/i.test(l)) return "Joint Venture";
  return raw || "";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { intake_link_id, personal_intake_id } = body;

    if (!intake_link_id && !personal_intake_id) {
      return new Response(JSON.stringify({ error: "intake_link_id or personal_intake_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Helper: fetch agent profile defaults (agency name, phone, fax, email, etc.)
    const getAgentDefaults = async (agentUserId: string): Promise<Record<string, string>> => {
      const defaults: Record<string, string> = {};
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, agency_name, agency_id, phone, form_defaults")
          .eq("user_id", agentUserId)
          .maybeSingle();
        if (!profile) return defaults;

        // Resolve agency name from agencies table
        if (profile.agency_id) {
          const { data: agencyData } = await supabase.from("agencies").select("name").eq("id", profile.agency_id).maybeSingle();
          if (agencyData) defaults.agency_name = agencyData.name;
        } else if (profile.agency_name) {
          defaults.agency_name = profile.agency_name;
        }
        if (profile.full_name) defaults.producer_name = profile.full_name;
        if (profile.phone) defaults.agency_phone = profile.phone;

        const fd = (profile.form_defaults || {}) as Record<string, any>;
        for (const [k, v] of Object.entries(fd)) {
          if (v && typeof v === "string" && v.trim() && !k.startsWith("_")) {
            defaults[k] = v;
          }
        }
      } catch (e) {
        console.error("getAgentDefaults error:", e);
      }
      return defaults;
    };

    /**
     * Build the comprehensive ACORD form_data payload from commercial intake data.
     * Uses canonical ACORD field keys that map directly to form field definitions.
     */
    const buildCommercialFormData = (c: any): Record<string, any> => {
      const businessName = (c.business_name || "").trim();
      const contactName = (c.customer_name || "").trim();
      const contactEmail = (c.customer_email || "").trim();
      const phone = c.customer_phone || "";
      const businessType = normalizeBusinessType(c.business_type || "");

      const acordData = c.acord_data || {};

      const formDataPayload: Record<string, any> = {
        // ── Core Applicant (ACORD 125 canonical keys) ──
        applicant_name: businessName,
        insured_name: businessName,       // Alias used by 126/127/130/131/140
        named_insured: businessName,      // Another common alias
        contact_name: contactName,
        contact_name_1: contactName,
        applicant_email: contactEmail,
        contact_email_1: contactEmail,
        applicant_phone: phone,
        business_phone: phone,
        contact_phone_1: phone,
        fein: c.ein || "",
        dba_name: c.dba || "",

        // ── Entity Type ──
        business_type: businessType,

        // ── Address (populate all alias keys) ──
        mailing_address: c.street_address || "",
        premises_address: c.street_address || "",
        city: c.city || "",
        premises_city: c.city || "",
        state: c.state || "",
        premises_state: c.state || "",
        zip: c.zip || "",
        premises_zip: c.zip || "",

        // ── Business Info ──
        years_in_business: c.years_in_business || "",
        annual_revenue: c.annual_revenue || "",
        annual_revenues: c.annual_revenue || "",

        // ── Employee count (multiple form keys) ──
        number_of_employees: c.employee_count || "",

        // ── Prior Carrier / Policy Info ──
        current_carrier: c.current_carrier_name || "",
        carrier: c.current_carrier_name || "",
        prior_carrier_name: c.current_carrier_name || "",
        prior_carrier_1: c.current_carrier_name || "",
        policy_number: c.policy_number || "",
        effective_date: c.policy_effective_date || "",
        proposed_eff_date: c.policy_effective_date || "",
        expiration_date: c.policy_expiration_date || "",
        proposed_exp_date: c.policy_expiration_date || "",

        // ── Owner experience / narrative ──
        ...(c.owner_resume_text ? { management_experience: c.owner_resume_text } : {}),

        // Spread ACORD question answers (keys match field-map from intake questions)
        ...acordData,
      };

      // ── Coverage line → LOB checkbox mapping ──
      const selectedLines = c.selected_coverage_lines || [];
      for (const line of selectedLines) {
        const lobKey = COVERAGE_TO_LOB_CHECKBOX[line];
        if (lobKey) {
          formDataPayload[lobKey] = true;
        }
      }

      // ── Also set LOB checkboxes from lines_in_force (existing policies) ──
      const linesInForce = c.lines_in_force || [];
      for (const line of linesInForce) {
        const lobKey = COVERAGE_TO_LOB_CHECKBOX[line];
        if (lobKey && !formDataPayload[lobKey]) {
          formDataPayload[lobKey] = true;
        }
      }

      // Clean out empty string values to avoid overwriting good data downstream
      for (const [k, v] of Object.entries(formDataPayload)) {
        if (v === "" || v === null || v === undefined) {
          delete formDataPayload[k];
        }
      }

      return formDataPayload;
    };

    if (personal_intake_id) {
      const { data: piRecord, error: piErr } = await supabase
        .from("personal_intake_submissions")
        .select("*")
        .eq("id", personal_intake_id)
        .single();
      if (piErr || !piRecord) {
        return new Response(JSON.stringify({ error: "Personal intake record not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const formData = piRecord.form_data as any;
      const intakeType = formData?.intake_type;

      // ─── Path B-1: Commercial via personal_intake_submissions ───
      if (intakeType === "commercial") {
        const agentId = piRecord.agent_id;
        const c = formData.commercial || {};
        const businessName = (c.business_name || "").trim();
        const contactName = (c.customer_name || "").trim();
        const contactEmail = (c.customer_email || "").trim();
        const phone = c.customer_phone || "";
        const businessType = c.business_type || "";
        const state = c.state || "";
        const ein = c.ein || "";
        const address = c.street_address || "";
        const city = c.city || "";
        const zip = c.zip || "";
        const employeeCount = c.employee_count || "";
        const annualRevenue = c.annual_revenue || "";
        const yearsInBusiness = c.years_in_business || "";
        const requestedCoverage = c.requested_coverage || "";
        const requestedPremium = c.requested_premium || "";
        const freeNotes = c.additional_notes || formData.notes || "";

        const narrativeParts = [
          `Customer ${contactName} (${contactEmail}) submitted a commercial intake form for ${businessName}.`,
        ];
        if (ein) narrativeParts.push(`FEIN: ${ein}.`);
        if (phone) narrativeParts.push(`Phone: ${phone}.`);
        if (businessType) narrativeParts.push(`Business type: ${businessType}.`);
        if (address) narrativeParts.push(`Mailing address: ${address}, ${city}, ${state} ${zip}.`);
        else if (city || state || zip) narrativeParts.push(`Location: ${city}, ${state} ${zip}.`);
        if (employeeCount) narrativeParts.push(`Number of employees: ${employeeCount}.`);
        if (annualRevenue) narrativeParts.push(`Annual revenue: ${annualRevenue}.`);
        if (yearsInBusiness) narrativeParts.push(`Years in business: ${yearsInBusiness}.`);
        if (requestedCoverage) narrativeParts.push(`Coverage requested: ${requestedCoverage}.`);
        if (requestedPremium) narrativeParts.push(`Premium budget: ${requestedPremium}.`);
        if (freeNotes) narrativeParts.push(`Additional notes: ${freeNotes}`);

        const fullNarrative = narrativeParts.join(" ");

        let leadId: string | null = null;
        if (businessName) {
          const { data: existing } = await supabase
            .from("leads")
            .select("id")
            .eq("owner_user_id", agentId)
            .ilike("account_name", businessName)
            .limit(1)
            .maybeSingle();

          if (existing) {
            leadId = existing.id;
          } else {
            const { data: newLead } = await supabase
              .from("leads")
              .insert({
                account_name: businessName,
                contact_name: contactName,
                email: contactEmail,
                phone: phone || null,
                business_type: businessType || null,
                state: state || null,
                lead_source: "customer_intake",
                owner_user_id: agentId,
                stage: "prospect",
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
                metadata: { source: "customer_intake_commercial", account_name: businessName },
              });
            }
          }
        }

        const { data: newSub } = await supabase
          .from("business_submissions")
          .insert({
            user_id: agentId,
            company_name: businessName,
            description: `Customer intake: ${requestedCoverage || c.selected_coverage_lines?.join(", ") || "General coverage"}. ${freeNotes || ""}`.trim(),
            status: "pending",
            coverage_lines: c.selected_coverage_lines?.length > 0 ? c.selected_coverage_lines : (requestedCoverage ? [requestedCoverage] : []),
            narrative: fullNarrative,
            lead_id: leadId,
          })
          .select("id")
          .single();

        if (newSub && leadId) {
          await supabase.from("leads").update({ submission_id: newSub.id }).eq("id", leadId);
        }

        // ─── Auto-prefill ACORD forms from intake data ───
        if (newSub) {
          const formDataPayload = buildCommercialFormData(c);

          // Inject agent profile defaults (agency name, phone, fax, email, license)
          const agentDefaults = await getAgentDefaults(agentId);
          for (const [k, v] of Object.entries(agentDefaults)) {
            if (!formDataPayload[k]) formDataPayload[k] = v;
          }

          // Create insurance_application so workspace prefills automatically
          await supabase.from("insurance_applications").insert({
            user_id: agentId,
            submission_id: newSub.id,
            form_data: formDataPayload,
            status: "draft",
            gaps: null,
          });
        }

        return new Response(
          JSON.stringify({ success: true, lead_id: leadId, submission_id: newSub?.id || null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ─── Path B-2: Personal lines via personal_intake_submissions ───
      const agentId = piRecord.agent_id;
      const applicant = formData?.applicant || {};
      const applicantName = (applicant.name || "").trim();
      const applicantEmail = (applicant.email || "").trim();
      const applicantPhone = (applicant.phone || "").trim();
      const applicantState = (applicant.state || "").trim();
      const sections = formData?.sections || {};

      // Build coverage lines list
      const coverageLines: string[] = [];
      if (sections.auto) coverageLines.push("Auto");
      if (sections.home) coverageLines.push("Homeowners");
      if (sections.renters) coverageLines.push("Renters");
      if (sections.flood) coverageLines.push("Flood");
      if (sections.boat) coverageLines.push("Boat");
      if (sections.umbrella) coverageLines.push("Umbrella");
      if (sections.recreational) coverageLines.push("Recreational");
      if (sections.personal_articles) coverageLines.push("Personal Articles");

      // Build narrative
      const narrativeParts = [
        `Personal lines intake submitted by ${applicantName} (${applicantEmail}).`,
      ];
      if (applicantPhone) narrativeParts.push(`Phone: ${applicantPhone}.`);
      if (applicant.address) narrativeParts.push(`Address: ${applicant.address}, ${applicant.city || ""}, ${applicantState} ${applicant.zip || ""}.`);
      if (coverageLines.length > 0) narrativeParts.push(`Coverage sections: ${coverageLines.join(", ")}.`);
      if (sections.auto) {
        const driverCount = sections.auto.drivers?.length || 0;
        const vehicleCount = sections.auto.vehicles?.length || 0;
        narrativeParts.push(`Auto: ${driverCount} driver(s), ${vehicleCount} vehicle(s).`);
      }
      if (sections.home) {
        narrativeParts.push(`Home: ${sections.home.properties?.length || 0} property/properties.`);
      }
      if (sections.umbrella) {
        narrativeParts.push(`Umbrella: requested limit $${Number(sections.umbrella.requested_limit || 0).toLocaleString()}.`);
      }
      if (formData.notes) narrativeParts.push(`Notes: ${formData.notes}`);

      const fullNarrative = narrativeParts.join(" ");
      const accountName = applicantName || "Personal Lines Client";

      // Find or create lead
      let leadId: string | null = null;
      if (accountName) {
        const { data: existing } = await supabase
          .from("leads")
          .select("id")
          .eq("owner_user_id", agentId)
          .ilike("account_name", accountName)
          .limit(1)
          .maybeSingle();

        if (existing) {
          leadId = existing.id;
        } else {
          const { data: newLead } = await supabase
            .from("leads")
            .insert({
              account_name: accountName,
              contact_name: applicantName,
              email: applicantEmail || null,
              phone: applicantPhone || null,
              state: applicantState || null,
              lead_source: "customer_intake",
              owner_user_id: agentId,
              stage: "prospect",
              line_type: "personal",
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
              metadata: { source: "customer_intake_personal", account_name: accountName },
            });
          }
        }
      }

      // Create business submission with full form_data in the narrative
      const { data: newSub } = await supabase
        .from("business_submissions")
        .insert({
          user_id: agentId,
          company_name: accountName,
          description: `Personal lines intake: ${coverageLines.join(", ") || "General coverage"}.`,
          status: "pending",
          coverage_lines: coverageLines,
          narrative: fullNarrative,
          lead_id: leadId,
          file_urls: { personal_intake_id: piRecord.id, form_data: formData },
        })
        .select("id")
        .single();

      if (newSub && leadId) {
        await supabase.from("leads").update({ submission_id: newSub.id }).eq("id", leadId);
      }

      // ─── Auto-prefill for personal lines ───
      if (newSub) {
        const formDataPayload: Record<string, any> = {
          applicant_name: applicantName,
          insured_name: applicantName,
          named_insured: applicantName,
          applicant_email: applicantEmail,
          applicant_phone: applicantPhone,
          business_phone: applicantPhone,
          mailing_address: applicant.address || "",
          city: applicant.city || "",
          state: applicantState,
          zip: applicant.zip || "",
          premises_address: applicant.address || "",
          premises_city: applicant.city || "",
          premises_state: applicantState,
          premises_zip: applicant.zip || "",
        };
        // Flatten driver/vehicle data for potential ACORD 75 auto prefill
        if (sections.auto?.drivers?.length > 0) {
          formDataPayload.drivers = sections.auto.drivers;
        }
        if (sections.auto?.vehicles?.length > 0) {
          formDataPayload.vehicles = sections.auto.vehicles;
        }
        if (sections.auto?.coverage) {
          Object.entries(sections.auto.coverage).forEach(([k, v]) => {
            if (v) formDataPayload[k] = v;
          });
        }
        if (sections.home?.properties?.length > 0) {
          formDataPayload.properties = sections.home.properties;
        }
        if (sections.umbrella) {
          formDataPayload.umbrella_limit = sections.umbrella.requested_limit;
        }

        // Inject agent profile defaults
        const agentDefaults = await getAgentDefaults(agentId);
        for (const [k, v] of Object.entries(agentDefaults)) {
          if (!formDataPayload[k]) formDataPayload[k] = v;
        }

        await supabase.from("insurance_applications").insert({
          user_id: agentId,
          submission_id: newSub.id,
          form_data: formDataPayload,
          status: "draft",
          gaps: null,
        });
      }

      return new Response(
        JSON.stringify({ success: true, lead_id: leadId, submission_id: newSub?.id || null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Path A: intake_links (original flow) ───
    if (!intake_link_id) {
      return new Response(JSON.stringify({ error: "intake_link_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    await supabase.from("intake_links").update({ is_used: true }).eq("id", link.id);

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

    const cszParts = cityStateZip.split(",").map((s: string) => s.trim());
    const city = cszParts[0] || "";
    const state = cszParts[1] || "";
    const zip = cszParts[2] || "";

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
            stage: "prospect",
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

    // Parse coverage lines from notes
    const requestedLinesRaw = parseField("Requested Coverage Lines");
    const requestedLines = requestedLinesRaw ? requestedLinesRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

    let submissionId = link.submission_id;
    if (!submissionId) {
      const { data: newSub } = await supabase
        .from("business_submissions")
        .insert({
          user_id: agentId,
          company_name: businessName,
          description: `Customer intake: ${submission.requested_coverage || "General coverage"}. ${freeNotes || ""}`.trim(),
          status: "pending",
          coverage_lines: requestedLines.length > 0 ? requestedLines : (submission.requested_coverage ? [submission.requested_coverage] : []),
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

        // Auto-create insurance_application with canonical ACORD keys
        const formDataPayload: Record<string, any> = {
          applicant_name: businessName,
          insured_name: businessName,
          named_insured: businessName,
          contact_name: submission.customer_name,
          contact_name_1: submission.customer_name,
          applicant_email: submission.customer_email,
          contact_email_1: submission.customer_email,
          applicant_phone: phone,
          business_phone: phone,
          fein: ein,
          business_type: normalizeBusinessType(businessType),
          mailing_address: address,
          premises_address: address,
          city: city,
          premises_city: city,
          state: state,
          premises_state: state,
          zip: zip,
          premises_zip: zip,
          years_in_business: yearsInBusiness,
          number_of_employees: employeeCount,
          annual_revenue: annualRevenue,
          annual_revenues: annualRevenue,
        };

        // Set LOB checkboxes from requested lines
        for (const line of requestedLines) {
          const lobKey = COVERAGE_TO_LOB_CHECKBOX[line];
          if (lobKey) formDataPayload[lobKey] = true;
        }

        // Clean empty values
        for (const [k, v] of Object.entries(formDataPayload)) {
          if (v === "" || v === null || v === undefined) delete formDataPayload[k];
        }

        // Parse ACORD underwriting data from notes if present
        const acordSection = notes.match(/--- ACORD Underwriting Data ---\n([\s\S]*?)(?:\n(?:Current Carrier|BOR|Documents|Notes|Additional Notes):|$)/);
        if (acordSection) {
          const acordLines = acordSection[1].trim().split("\n");
          for (const line of acordLines) {
            const colonIdx = line.indexOf(":");
            if (colonIdx > 0) {
              const key = line.slice(0, colonIdx).trim();
              const val = line.slice(colonIdx + 1).trim();
              if (key && val) formDataPayload[key] = val;
            }
          }
        }

        // Inject agent profile defaults
        const agentDefaults = await getAgentDefaults(agentId);
        for (const [k, v] of Object.entries(agentDefaults)) {
          if (!formDataPayload[k]) formDataPayload[k] = v;
        }

        await supabase.from("insurance_applications").insert({
          user_id: agentId,
          submission_id: newSub.id,
          form_data: formDataPayload,
          status: "draft",
          gaps: null,
        });
      }
    } else {
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
